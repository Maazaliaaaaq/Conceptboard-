import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { BoardObject, UserPresence, BoardRoomConfig, FirebaseCredentials } from '../types/board';
import defaultAppletConfig from '../../firebase-applet-config.json';

const STORAGE_KEY_CREDS = 'conceptboard_firebase_config';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  if (isQuotaError(error)) {
    notifyQuotaExceeded();
    console.warn('Firestore write/read quota reached. Operating in offline/local BroadcastChannel mode.');
    return;
  }
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Strips all undefined fields to prevent Firestore setDoc() errors
 */
function cleanFirestoreData(data: any): any {
  if (data === null || data === undefined) return null;
  try {
    const serialized = JSON.stringify(data, (_key, value) => {
      if (value === undefined) return undefined;
      return value;
    });
    if (!serialized) return null;
    return JSON.parse(serialized);
  } catch {
    return data;
  }
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let quotaExceededState = false;
const quotaListeners = new Set<(exceeded: boolean) => void>();

export function isQuotaError(error: unknown): boolean {
  if (!error) return false;
  const str = error instanceof Error ? error.message : String(error);
  return (
    str.includes('resource-exhausted') ||
    str.includes('Quota limit exceeded') ||
    str.includes('Quota exceeded') ||
    str.includes('quota metric') ||
    str.includes('Free daily write units') ||
    str.includes('Free daily read units')
  );
}

export function isFirestoreQuotaExceeded(): boolean {
  return quotaExceededState;
}

export function subscribeToQuotaExceeded(callback: (exceeded: boolean) => void): () => void {
  quotaListeners.add(callback);
  callback(quotaExceededState);
  return () => {
    quotaListeners.delete(callback);
  };
}

export function notifyQuotaExceeded() {
  if (!quotaExceededState) {
    quotaExceededState = true;
    quotaListeners.forEach((cb) => {
      try {
        cb(true);
      } catch {}
    });
  }
}

// Multi-tab BroadcastChannel fallback for instant offline/local fallback
const channels: Map<string, BroadcastChannel> = new Map();

function getChannel(roomId: string): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null;
  if (!channels.has(roomId)) {
    channels.set(roomId, new BroadcastChannel(`conceptboard_${roomId}`));
  }
  return channels.get(roomId)!;
}

export function getStoredFirebaseCredentials(): FirebaseCredentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CREDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.apiKey) return parsed;
    }
  } catch (err) {
    console.error('Failed to parse stored Firebase credentials', err);
  }

  // Fallback to auto-provisioned applet config
  if (defaultAppletConfig && defaultAppletConfig.apiKey && defaultAppletConfig.projectId) {
    return {
      apiKey: defaultAppletConfig.apiKey,
      authDomain: defaultAppletConfig.authDomain,
      databaseURL: `https://${defaultAppletConfig.projectId}-default-rtdb.firebaseio.com`,
      projectId: defaultAppletConfig.projectId,
    };
  }

  return null;
}

export function saveFirebaseCredentials(creds: FirebaseCredentials | null) {
  if (!creds) {
    localStorage.removeItem(STORAGE_KEY_CREDS);
    return;
  }
  localStorage.setItem(STORAGE_KEY_CREDS, JSON.stringify(creds));
  initFirebase(creds);
}

export function initFirebase(creds?: FirebaseCredentials | null): boolean {
  try {
    const config = creds || getStoredFirebaseCredentials() || defaultAppletConfig;
    if (!config || !config.apiKey || !config.projectId) {
      return false;
    }

    if (getApps().length > 0) {
      firebaseApp = getApps()[0];
    } else {
      firebaseApp = initializeApp(config);
    }

    // Connect to Firestore using the provisioned database ID
    const databaseId = (defaultAppletConfig as any).firestoreDatabaseId || '(default)';
    firestoreDb = getFirestore(firebaseApp, databaseId);

    // Test connection as required by skill
    testConnection();

    return true;
  } catch (err) {
    console.warn('Firebase init warning:', err);
    return false;
  }
}

async function testConnection() {
  if (!firestoreDb) return;
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
  } catch (error) {
    if (isQuotaError(error)) {
      notifyQuotaExceeded();
      return;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase offline or checking connection');
    }
  }
}

// Auto-initialize on import
initFirebase();

export function isFirebaseConnected(): boolean {
  return !!firestoreDb;
}

/**
 * Realtime synchronization for Whiteboard Objects
 */
export function subscribeToBoardObjects(
  roomId: string,
  onObjectsUpdate: (objects: Record<string, BoardObject>) => void
): () => void {
  const collectionPath = `boards/${roomId}/objects`;
  const storageKey = `conceptboard_cache_${roomId}`;

  // 1. Immediately load local cache so the board is NEVER blank or empty
  const loadLocal = () => {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (data && typeof data === 'object') {
        onObjectsUpdate(data);
      }
    } catch {
      onObjectsUpdate({});
    }
  };
  loadLocal();

  // 2. Always listen to BroadcastChannel for zero-latency multi-tab sync
  const channel = getChannel(roomId);
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'OBJECTS_UPDATE' && event.data.objects) {
      onObjectsUpdate(event.data.objects);
    }
  };
  channel?.addEventListener('message', handleMessage);

  // 3. If Firestore is active and not quota exhausted, listen to Firestore updates
  let unsubscribeFirestore: (() => void) | null = null;
  if (firestoreDb && !quotaExceededState) {
    try {
      const objectsCol = collection(firestoreDb, 'boards', roomId, 'objects');
      unsubscribeFirestore = onSnapshot(
        objectsCol,
        (snapshot) => {
          const result: Record<string, BoardObject> = {};
          snapshot.forEach((d) => {
            result[d.id] = d.data() as BoardObject;
          });
          // Cache locally
          try {
            localStorage.setItem(storageKey, JSON.stringify(result));
          } catch {}
          onObjectsUpdate(result);
        },
        (error) => {
          if (isQuotaError(error)) {
            notifyQuotaExceeded();
            loadLocal();
            return;
          }
          try {
            handleFirestoreError(error, OperationType.GET, collectionPath);
          } catch (e) {
            console.warn('Firestore subscription fallback:', e);
          }
          loadLocal();
        }
      );
    } catch (err) {
      if (isQuotaError(err)) {
        notifyQuotaExceeded();
      }
    }
  }

  return () => {
    channel?.removeEventListener('message', handleMessage);
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
  };
}

export async function syncBoardObject(roomId: string, obj: BoardObject): Promise<void> {
  const docPath = `boards/${roomId}/objects/${obj.id}`;

  // Always update local cache and broadcast channel first for zero-latency UI
  const storageKey = `conceptboard_cache_${roomId}`;
  try {
    const current = JSON.parse(localStorage.getItem(storageKey) || '{}');
    current[obj.id] = obj;
    localStorage.setItem(storageKey, JSON.stringify(current));
    const channel = getChannel(roomId);
    channel?.postMessage({ type: 'OBJECTS_UPDATE', objects: current });
  } catch (e) {
    console.warn('Local cache save warning', e);
  }

  // Skip Firestore writes if quota limit was reached
  if (firestoreDb && !quotaExceededState) {
    try {
      const objDoc = doc(firestoreDb, 'boards', roomId, 'objects', obj.id);
      const cleanData = cleanFirestoreData(obj);
      await setDoc(objDoc, cleanData);
      return;
    } catch (error) {
      if (isQuotaError(error)) {
        notifyQuotaExceeded();
        return;
      }
      try {
        handleFirestoreError(error, OperationType.WRITE, docPath);
      } catch (err) {
        console.warn('Firestore sync failed, retained in local storage:', err);
      }
    }
  }
}

export async function deleteBoardObject(roomId: string, objectId: string): Promise<void> {
  const docPath = `boards/${roomId}/objects/${objectId}`;

  const storageKey = `conceptboard_cache_${roomId}`;
  try {
    const current = JSON.parse(localStorage.getItem(storageKey) || '{}');
    delete current[objectId];
    localStorage.setItem(storageKey, JSON.stringify(current));
    const channel = getChannel(roomId);
    channel?.postMessage({ type: 'OBJECTS_UPDATE', objects: current });
  } catch (e) {
    console.warn('Local cache delete warning', e);
  }

  if (firestoreDb && !quotaExceededState) {
    try {
      const objDoc = doc(firestoreDb, 'boards', roomId, 'objects', objectId);
      await deleteDoc(objDoc);
      return;
    } catch (error) {
      if (isQuotaError(error)) {
        notifyQuotaExceeded();
        return;
      }
      try {
        handleFirestoreError(error, OperationType.DELETE, docPath);
      } catch (err) {
        console.warn('Firestore delete failed:', err);
      }
    }
  }
}

export async function clearBoard(roomId: string): Promise<void> {
  const storageKey = `conceptboard_cache_${roomId}`;
  try {
    localStorage.setItem(storageKey, JSON.stringify({}));
  } catch {}
  const channel = getChannel(roomId);
  channel?.postMessage({ type: 'OBJECTS_UPDATE', objects: {} });

  if (firestoreDb && !quotaExceededState) {
    try {
      const objectsCol = collection(firestoreDb, 'boards', roomId, 'objects');
      const snap = await getDocs(objectsCol);
      const batch = writeBatch(firestoreDb);
      snap.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
      return;
    } catch (error) {
      if (isQuotaError(error)) {
        notifyQuotaExceeded();
        return;
      }
      console.warn('Clear board firestore error:', error);
    }
  }
}

/**
 * Live Presence & Cursor Synchronization
 */
let lastFirestorePresenceTime = 0;

export function updateCursorPresence(roomId: string, user: UserPresence): void {
  // Always broadcast locally to other browser tabs with zero latency and zero write cost
  const channel = getChannel(roomId);
  channel?.postMessage({
    type: 'PRESENCE_UPDATE',
    user: { ...user, lastSeen: Date.now() },
  });

  // Only send occasional heartbeat to Firestore (at most once every 15s) to avoid consuming write quotas
  const now = Date.now();
  if (firestoreDb && !quotaExceededState && now - lastFirestorePresenceTime > 15000) {
    lastFirestorePresenceTime = now;
    try {
      const userDoc = doc(firestoreDb, 'boards', roomId, 'presence', user.id);
      const cleanUser = cleanFirestoreData({
        ...user,
        lastSeen: now,
      });
      setDoc(userDoc, cleanUser).catch((err) => {
        if (isQuotaError(err)) {
          notifyQuotaExceeded();
        }
      });
    } catch {
      // Ignore background presence failures
    }
  }
}

export function subscribeToPresence(
  roomId: string,
  currentUserId: string,
  onPresenceUpdate: (users: Record<string, UserPresence>) => void
): () => void {
  const presenceColPath = `boards/${roomId}/presence`;
  const presenceCache: Record<string, UserPresence> = {};

  // Always listen to BroadcastChannel for local/multi-tab cursors
  const channel = getChannel(roomId);
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'PRESENCE_UPDATE' && event.data.user) {
      const u = event.data.user as UserPresence;
      if (u.id !== currentUserId) {
        presenceCache[u.id] = u;
        onPresenceUpdate({ ...presenceCache });
      }
    }
  };
  channel?.addEventListener('message', handleMessage);

  let unsubscribeFirestore: (() => void) | null = null;
  if (firestoreDb && !quotaExceededState) {
    try {
      const presenceCol = collection(firestoreDb, 'boards', roomId, 'presence');
      unsubscribeFirestore = onSnapshot(
        presenceCol,
        (snapshot) => {
          const now = Date.now();
          snapshot.forEach((d) => {
            const u = d.data() as UserPresence;
            if (u.id !== currentUserId && now - (u.lastSeen || 0) < 45000) {
              presenceCache[u.id] = u;
            }
          });
          onPresenceUpdate({ ...presenceCache });
        },
        (error) => {
          if (isQuotaError(error)) {
            notifyQuotaExceeded();
            return;
          }
          try {
            handleFirestoreError(error, OperationType.GET, presenceColPath);
          } catch {
            // ignore
          }
        }
      );
    } catch (err) {
      if (isQuotaError(err)) {
        notifyQuotaExceeded();
      }
    }
  }

  return () => {
    channel?.removeEventListener('message', handleMessage);
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
  };
}

/**
 * Room Permissions and Configuration
 */
export function subscribeToRoomConfig(
  roomId: string,
  onConfigUpdate: (config: BoardRoomConfig) => void
): () => void {
  const defaultConfig: BoardRoomConfig = {
    roomId,
    permissionMode: 'edit',
    title: `Classroom Board ${roomId}`,
    createdAt: Date.now(),
  };

  const storageKey = `conceptboard_config_${roomId}`;
  try {
    const cached = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (cached && cached.roomId) {
      onConfigUpdate(cached);
    } else {
      onConfigUpdate(defaultConfig);
    }
  } catch {
    onConfigUpdate(defaultConfig);
  }

  const channel = getChannel(roomId);
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'CONFIG_UPDATE' && event.data.config) {
      onConfigUpdate(event.data.config);
    }
  };
  channel?.addEventListener('message', handleMessage);

  let unsubscribeFirestore: (() => void) | null = null;
  if (firestoreDb && !quotaExceededState) {
    try {
      const roomDoc = doc(firestoreDb, 'boards', roomId);
      unsubscribeFirestore = onSnapshot(
        roomDoc,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as BoardRoomConfig;
            try {
              localStorage.setItem(storageKey, JSON.stringify(data));
            } catch {}
            onConfigUpdate(data);
          } else {
            onConfigUpdate(defaultConfig);
          }
        },
        (error) => {
          if (isQuotaError(error)) {
            notifyQuotaExceeded();
          }
        }
      );
    } catch (err) {
      if (isQuotaError(err)) {
        notifyQuotaExceeded();
      }
    }
  }

  return () => {
    channel?.removeEventListener('message', handleMessage);
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
  };
}

export async function setRoomPermissionMode(
  roomId: string,
  mode: 'edit' | 'view_only'
): Promise<void> {
  if (firestoreDb && !quotaExceededState) {
    try {
      const roomDoc = doc(firestoreDb, 'boards', roomId);
      await setDoc(roomDoc, { permissionMode: mode }, { merge: true });
      return;
    } catch (e) {
      if (isQuotaError(e)) {
        notifyQuotaExceeded();
      }
      console.warn('Set room permission mode failed', e);
    }
  }

  const storageKey = `conceptboard_config_${roomId}`;
  try {
    const current = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const updated = { ...current, roomId, permissionMode: mode };
    localStorage.setItem(storageKey, JSON.stringify(updated));
    const channel = getChannel(roomId);
    channel?.postMessage({ type: 'CONFIG_UPDATE', config: updated });
  } catch {}
}
