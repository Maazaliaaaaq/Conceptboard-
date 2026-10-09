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
  if (Array.isArray(data)) {
    return data
      .map((item) => cleanFirestoreData(item))
      .filter((item) => item !== undefined);
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        cleaned[key] = cleanFirestoreData(val);
      }
    }
    return cleaned;
  }
  return data;
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

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

  if (firestoreDb) {
    const objectsCol = collection(firestoreDb, 'boards', roomId, 'objects');
    const unsubscribe = onSnapshot(
      objectsCol,
      (snapshot) => {
        const result: Record<string, BoardObject> = {};
        snapshot.forEach((d) => {
          result[d.id] = d.data() as BoardObject;
        });
        onObjectsUpdate(result);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, collectionPath);
        } catch (e) {
          console.warn('Firestore subscription fallback:', e);
        }
      }
    );

    return () => unsubscribe();
  }

  // Local fallback
  const storageKey = `conceptboard_cache_${roomId}`;
  const loadLocal = () => {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
      onObjectsUpdate(data);
    } catch {
      onObjectsUpdate({});
    }
  };
  loadLocal();

  const channel = getChannel(roomId);
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'OBJECTS_UPDATE') {
      onObjectsUpdate(event.data.objects);
    }
  };
  channel?.addEventListener('message', handleMessage);

  return () => {
    channel?.removeEventListener('message', handleMessage);
  };
}

export async function syncBoardObject(roomId: string, obj: BoardObject): Promise<void> {
  const docPath = `boards/${roomId}/objects/${obj.id}`;

  if (firestoreDb) {
    try {
      const objDoc = doc(firestoreDb, 'boards', roomId, 'objects', obj.id);
      const cleanData = cleanFirestoreData(obj);
      await setDoc(objDoc, cleanData);
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  }

  // Local fallback
  const storageKey = `conceptboard_cache_${roomId}`;
  try {
    const current = JSON.parse(localStorage.getItem(storageKey) || '{}');
    current[obj.id] = obj;
    localStorage.setItem(storageKey, JSON.stringify(current));
    const channel = getChannel(roomId);
    channel?.postMessage({ type: 'OBJECTS_UPDATE', objects: current });
  } catch (e) {
    console.error('Local save error', e);
  }
}

export async function deleteBoardObject(roomId: string, objectId: string): Promise<void> {
  const docPath = `boards/${roomId}/objects/${objectId}`;

  if (firestoreDb) {
    try {
      const objDoc = doc(firestoreDb, 'boards', roomId, 'objects', objectId);
      await deleteDoc(objDoc);
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  }

  const storageKey = `conceptboard_cache_${roomId}`;
  try {
    const current = JSON.parse(localStorage.getItem(storageKey) || '{}');
    delete current[objectId];
    localStorage.setItem(storageKey, JSON.stringify(current));
    const channel = getChannel(roomId);
    channel?.postMessage({ type: 'OBJECTS_UPDATE', objects: current });
  } catch (e) {
    console.error('Local delete error', e);
  }
}

export async function clearBoard(roomId: string): Promise<void> {
  if (firestoreDb) {
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
      console.warn('Clear board firestore error:', error);
    }
  }

  const storageKey = `conceptboard_cache_${roomId}`;
  localStorage.setItem(storageKey, JSON.stringify({}));
  const channel = getChannel(roomId);
  channel?.postMessage({ type: 'OBJECTS_UPDATE', objects: {} });
}

/**
 * Live Presence & Cursor Synchronization
 */
export function updateCursorPresence(roomId: string, user: UserPresence): void {
  if (firestoreDb) {
    try {
      const userDoc = doc(firestoreDb, 'boards', roomId, 'presence', user.id);
      const cleanUser = cleanFirestoreData({
        ...user,
        lastSeen: Date.now(),
      });
      setDoc(userDoc, cleanUser);
      return;
    } catch {
      // Ignore background presence failures
    }
  }

  const channel = getChannel(roomId);
  channel?.postMessage({
    type: 'PRESENCE_UPDATE',
    user: { ...user, lastSeen: Date.now() },
  });
}

export function subscribeToPresence(
  roomId: string,
  currentUserId: string,
  onPresenceUpdate: (users: Record<string, UserPresence>) => void
): () => void {
  const presenceColPath = `boards/${roomId}/presence`;

  if (firestoreDb) {
    const presenceCol = collection(firestoreDb, 'boards', roomId, 'presence');
    const unsubscribe = onSnapshot(
      presenceCol,
      (snapshot) => {
        const activeUsers: Record<string, UserPresence> = {};
        const now = Date.now();
        snapshot.forEach((d) => {
          const u = d.data() as UserPresence;
          if (u.id !== currentUserId && now - (u.lastSeen || 0) < 45000) {
            activeUsers[u.id] = u;
          }
        });
        onPresenceUpdate(activeUsers);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, presenceColPath);
        } catch {
          // ignore
        }
      }
    );

    return () => unsubscribe();
  }

  const presenceCache: Record<string, UserPresence> = {};
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

  return () => {
    channel?.removeEventListener('message', handleMessage);
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

  if (firestoreDb) {
    const roomDoc = doc(firestoreDb, 'boards', roomId);
    const unsubscribe = onSnapshot(
      roomDoc,
      (snapshot) => {
        if (snapshot.exists()) {
          onConfigUpdate(snapshot.data() as BoardRoomConfig);
        } else {
          onConfigUpdate(defaultConfig);
        }
      },
      () => {
        onConfigUpdate(defaultConfig);
      }
    );

    return () => unsubscribe();
  }

  onConfigUpdate(defaultConfig);
  return () => {};
}

export async function setRoomPermissionMode(
  roomId: string,
  mode: 'edit' | 'view_only'
): Promise<void> {
  if (firestoreDb) {
    try {
      const roomDoc = doc(firestoreDb, 'boards', roomId);
      await setDoc(roomDoc, { permissionMode: mode }, { merge: true });
      return;
    } catch (e) {
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
