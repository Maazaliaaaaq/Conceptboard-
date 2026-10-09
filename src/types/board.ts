export type ToolType =
  | 'select'
  | 'pan'
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'text'
  | 'sticky'
  | 'image'
  | 'pdf';

export interface Point {
  x: number;
  y: number;
}

export interface BoardObject {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: Point[];
  color?: string;
  strokeWidth?: number;
  fill?: boolean;
  fillColor?: string;
  text?: string;
  stickyColor?: string;
  src?: string; // for images and PDF pages
  fileName?: string;
  pageNumber?: number;
  createdBy?: string;
  createdAt: number;
  zIndex: number;
}

export interface UserPresence {
  id: string;
  name: string;
  role: 'teacher' | 'student';
  color: string;
  x: number;
  y: number;
  active: boolean;
  lastSeen: number;
}

export interface BoardRoomConfig {
  roomId: string;
  permissionMode: 'edit' | 'view_only';
  teacherId?: string;
  title: string;
  createdAt: number;
}

export interface FirebaseCredentials {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}
