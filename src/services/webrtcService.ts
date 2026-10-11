import Peer, { DataConnection } from 'peerjs';
import { BoardObject, UserPresence, BoardRoomConfig } from '../types/board';

export interface WebRTCMessage {
  type: 'FULL_SYNC' | 'OBJECT_UPDATE' | 'OBJECT_DELETE' | 'CLEAR_BOARD' | 'PRESENCE_UPDATE' | 'CONFIG_UPDATE' | 'PING';
  senderId?: string;
  objects?: Record<string, BoardObject>;
  object?: BoardObject;
  objectId?: string;
  presence?: UserPresence;
  config?: BoardRoomConfig;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'host';

let peerInstance: Peer | null = null;
let activeConnections: Map<string, DataConnection> = new Map();
let currentRoomId = '';
let currentUserId = '';
let isHost = false;
let statusCallback: ((status: ConnectionStatus, peerCount: number) => void) | null = null;
let objectsCallback: ((objects: Record<string, BoardObject>) => void) | null = null;
let singleObjectCallback: ((obj: BoardObject) => void) | null = null;
let deleteObjectCallback: ((id: string) => void) | null = null;
let clearCallback: (() => void) | null = null;
let presenceCallback: ((presence: UserPresence) => void) | null = null;
let configCallback: ((config: BoardRoomConfig) => void) | null = null;
let getCurrentBoardState: (() => Record<string, BoardObject>) | null = null;
let getCurrentRoomConfig: (() => BoardRoomConfig) | null = null;

let reconnectTimeout: any = null;
let pingInterval: any = null;

function sanitizeRoom(room: string): string {
  return room.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function notifyStatus(status: ConnectionStatus) {
  if (statusCallback) {
    statusCallback(status, activeConnections.size);
  }
}

/**
 * Handle incoming WebRTC message on data channel
 */
function handleIncomingMessage(msg: WebRTCMessage, conn: DataConnection) {
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'FULL_SYNC':
      if (msg.objects && objectsCallback) {
        objectsCallback(msg.objects);
      }
      if (msg.config && configCallback) {
        configCallback(msg.config);
      }
      break;

    case 'OBJECT_UPDATE':
      if (msg.object) {
        if (singleObjectCallback) {
          singleObjectCallback(msg.object);
        }
        // If host, relay to other connected students
        if (isHost) {
          relayToOthers(msg, conn.peer);
        }
      }
      break;

    case 'OBJECT_DELETE':
      if (msg.objectId) {
        if (deleteObjectCallback) {
          deleteObjectCallback(msg.objectId);
        }
        if (isHost) {
          relayToOthers(msg, conn.peer);
        }
      }
      break;

    case 'CLEAR_BOARD':
      if (clearCallback) {
        clearCallback();
      }
      if (isHost) {
        relayToOthers(msg, conn.peer);
      }
      break;

    case 'PRESENCE_UPDATE':
      if (msg.presence && presenceCallback) {
        presenceCallback(msg.presence);
        if (isHost) {
          relayToOthers(msg, conn.peer);
        }
      }
      break;

    case 'CONFIG_UPDATE':
      if (msg.config && configCallback) {
        configCallback(msg.config);
        if (isHost) {
          relayToOthers(msg, conn.peer);
        }
      }
      break;

    case 'PING':
      // Keepalive ping, acknowledge
      break;
  }
}

function relayToOthers(msg: WebRTCMessage, senderPeerId: string) {
  activeConnections.forEach((conn, peerId) => {
    if (peerId !== senderPeerId && conn.open) {
      try {
        conn.send(msg);
      } catch (e) {
        console.warn('Relay send failed', e);
      }
    }
  });
}

/**
 * Initialize WebRTC P2P mesh for the room
 */
export function initWebRTC(
  roomId: string,
  userId: string,
  userRole: 'teacher' | 'student',
  getObjects: () => Record<string, BoardObject>,
  getConfig: () => BoardRoomConfig,
  handlers: {
    onStatusChange?: (status: ConnectionStatus, peerCount: number) => void;
    onObjectsUpdate?: (objects: Record<string, BoardObject>) => void;
    onSingleObjectUpdate?: (obj: BoardObject) => void;
    onObjectDelete?: (id: string) => void;
    onClearBoard?: () => void;
    onPresenceUpdate?: (presence: UserPresence) => void;
    onConfigUpdate?: (config: BoardRoomConfig) => void;
  }
) {
  cleanupWebRTC();

  currentRoomId = roomId;
  currentUserId = userId;
  getCurrentBoardState = getObjects;
  getCurrentRoomConfig = getConfig;

  statusCallback = handlers.onStatusChange || null;
  objectsCallback = handlers.onObjectsUpdate || null;
  singleObjectCallback = handlers.onSingleObjectUpdate || null;
  deleteObjectCallback = handlers.onObjectDelete || null;
  clearCallback = handlers.onClearBoard || null;
  presenceCallback = handlers.onPresenceUpdate || null;
  configCallback = handlers.onConfigUpdate || null;

  notifyStatus('connecting');

  const cleanRoom = sanitizeRoom(roomId);
  const hostPeerId = `cb-${cleanRoom}-host`;
  const isTeacherRole = userRole === 'teacher';

  try {
    // If teacher, attempt to claim host peer ID first
    if (isTeacherRole) {
      startAsHost(hostPeerId, cleanRoom);
    } else {
      startAsStudent(cleanRoom, hostPeerId);
    }
  } catch (err) {
    console.warn('WebRTC peer init warning:', err);
    notifyStatus('disconnected');
  }

  // Periodic heartbeat
  if (pingInterval) clearInterval(pingInterval);
  pingInterval = setInterval(() => {
    if (activeConnections.size > 0) {
      broadcastWebRTC({ type: 'PING' });
    }
  }, 10000);
}

function startAsHost(hostPeerId: string, cleanRoom: string) {
  isHost = true;
  peerInstance = new Peer(hostPeerId, {
    debug: 0,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    },
  });

  peerInstance.on('open', () => {
    notifyStatus('host');
  });

  peerInstance.on('connection', (conn) => {
    setupConnection(conn, true);
  });

  peerInstance.on('error', (err: any) => {
    // If host ID is unavailable (e.g. tab refreshed before timeout), join as client peer
    if (err.type === 'unavailable-id') {
      peerInstance?.destroy();
      startAsStudent(cleanRoom, hostPeerId);
      return;
    }
    console.warn('WebRTC Host error:', err);
  });
}

function startAsStudent(cleanRoom: string, hostPeerId: string) {
  isHost = false;
  const studentPeerId = `cb-${cleanRoom}-${Math.random().toString(36).slice(2, 8)}`;
  peerInstance = new Peer(studentPeerId, {
    debug: 0,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    },
  });

  peerInstance.on('open', () => {
    connectToHost(hostPeerId);
  });

  peerInstance.on('connection', (conn) => {
    setupConnection(conn, false);
  });

  peerInstance.on('error', (err: any) => {
    console.warn('WebRTC Student error:', err);
  });
}

function connectToHost(hostPeerId: string) {
  if (!peerInstance || peerInstance.destroyed) return;

  notifyStatus('connecting');
  const conn = peerInstance.connect(hostPeerId, {
    reliable: true,
  });

  setupConnection(conn, false);

  // If host not available yet (e.g. student opened link first), retry every 4s
  conn.on('error', () => {
    scheduleReconnect(hostPeerId);
  });
  conn.on('close', () => {
    scheduleReconnect(hostPeerId);
  });
}

function scheduleReconnect(hostPeerId: string) {
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  reconnectTimeout = setTimeout(() => {
    if (peerInstance && !peerInstance.destroyed && !activeConnections.has(hostPeerId)) {
      connectToHost(hostPeerId);
    }
  }, 4000);
}

function setupConnection(conn: DataConnection, weAreHost: boolean) {
  conn.on('open', () => {
    activeConnections.set(conn.peer, conn);
    notifyStatus(weAreHost ? 'host' : 'connected');

    // If we are host, immediately send the entire current board state to the newly connected student!
    if (weAreHost) {
      try {
        const currentObjects = getCurrentBoardState ? getCurrentBoardState() : {};
        const currentConfig = getCurrentRoomConfig ? getCurrentRoomConfig() : undefined;
        conn.send({
          type: 'FULL_SYNC',
          objects: currentObjects,
          config: currentConfig,
        });
      } catch (err) {
        console.warn('Failed to send initial board sync over WebRTC:', err);
      }
    }
  });

  conn.on('data', (data) => {
    handleIncomingMessage(data as WebRTCMessage, conn);
  });

  conn.on('close', () => {
    activeConnections.delete(conn.peer);
    notifyStatus(weAreHost ? 'host' : (activeConnections.size > 0 ? 'connected' : 'disconnected'));
  });

  conn.on('error', (err) => {
    console.warn('WebRTC connection error:', err);
    activeConnections.delete(conn.peer);
  });
}

/**
 * Broadcast an update to all connected peers
 */
export function broadcastWebRTC(msg: WebRTCMessage) {
  if (activeConnections.size === 0) return;
  activeConnections.forEach((conn) => {
    if (conn.open) {
      try {
        conn.send(msg);
      } catch (e) {
        console.warn('WebRTC broadcast send warning:', e);
      }
    }
  });
}

/**
 * Send object creation/update
 */
export function broadcastObjectUpdate(obj: BoardObject) {
  broadcastWebRTC({
    type: 'OBJECT_UPDATE',
    senderId: currentUserId,
    object: obj,
  });
}

/**
 * Send object deletion
 */
export function broadcastObjectDelete(objectId: string) {
  broadcastWebRTC({
    type: 'OBJECT_DELETE',
    senderId: currentUserId,
    objectId,
  });
}

/**
 * Send board clear
 */
export function broadcastClearBoard() {
  broadcastWebRTC({
    type: 'CLEAR_BOARD',
    senderId: currentUserId,
  });
}

/**
 * Send presence / cursor update
 */
export function broadcastPresence(user: UserPresence) {
  broadcastWebRTC({
    type: 'PRESENCE_UPDATE',
    senderId: currentUserId,
    presence: user,
  });
}

/**
 * Send room permission config update
 */
export function broadcastRoomConfig(config: BoardRoomConfig) {
  broadcastWebRTC({
    type: 'CONFIG_UPDATE',
    senderId: currentUserId,
    config,
  });
}

/**
 * Cleanup WebRTC instances
 */
export function cleanupWebRTC() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  activeConnections.forEach((conn) => {
    try {
      conn.close();
    } catch {}
  });
  activeConnections.clear();

  if (peerInstance) {
    try {
      peerInstance.destroy();
    } catch {}
    peerInstance = null;
  }
  isHost = false;
  notifyStatus('disconnected');
}
