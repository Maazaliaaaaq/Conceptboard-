import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { Canvas, CanvasRefHandle } from './components/Canvas';
import { LiveCursors } from './components/LiveCursors';
import { ShareModal } from './components/ShareModal';
import { FirebaseSetupModal } from './components/FirebaseSetupModal';
import { UserModal } from './components/UserModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { CreativeToolbar } from './components/CreativeToolbar';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';
import {
  BoardObject,
  ToolType,
  UserPresence,
  BoardRoomConfig,
  Point,
} from './types/board';
import {
  subscribeToBoardObjects,
  syncBoardObject,
  deleteBoardObject,
  clearBoard,
  updateCursorPresence,
  subscribeToPresence,
  subscribeToRoomConfig,
  setRoomPermissionMode,
  isFirebaseConnected,
  isFirestoreQuotaExceeded,
  subscribeToQuotaExceeded,
} from './services/firebaseService';
import { renderPDFToImages } from './utils/pdfRenderer';
import { getStandaloneHtmlContent } from './utils/singleFileTemplate';

// Generate clean 6-char room ID
function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const DEFAULT_AVATAR_COLORS = [
  '#4f46e5',
  '#059669',
  '#dc2626',
  '#d97706',
  '#2563eb',
  '#7c3aed',
  '#db2777',
];

export default function App() {
  // Room state
  const [roomId, setRoomId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam && roomParam.trim()) {
        return roomParam.trim().toUpperCase();
      }
    }
    return generateRoomId();
  });

  // Current User Profile state
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    role: 'teacher' | 'student';
    color: string;
  }>(() => {
    try {
      const cached = localStorage.getItem('conceptboard_user');
      if (cached) return JSON.parse(cached);
    } catch {}
    const isRoomCreator = !window.location.search.includes('room=');
    return {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: isRoomCreator ? 'Teacher (Host)' : 'Student',
      role: isRoomCreator ? 'teacher' : 'student',
      color:
        DEFAULT_AVATAR_COLORS[
          Math.floor(Math.random() * DEFAULT_AVATAR_COLORS.length)
        ],
    };
  });

  // Tools & Styling
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [currentColor, setCurrentColor] = useState<string>('#0f172a');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [fillShape, setFillShape] = useState<boolean>(false);
  const [stickyColor, setStickyColor] = useState<string>('#fef08a');

  // Board Data
  const [objects, setObjects] = useState<Record<string, BoardObject>>({});
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  // Undo / Redo stacks
  const [undoStack, setUndoStack] = useState<BoardObject[]>([]);
  const [redoStack, setRedoStack] = useState<BoardObject[]>([]);

  // Remote Presence & Room Config
  const [presenceUsers, setPresenceUsers] = useState<Record<string, UserPresence>>({});
  const [roomConfig, setRoomConfig] = useState<BoardRoomConfig>({
    roomId,
    permissionMode: 'edit',
    title: `Classroom ${roomId}`,
    createdAt: Date.now(),
  });

  // Modals
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isFirebaseOpen, setIsFirebaseOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Firestore Quota limit state
  const [quotaExceeded, setQuotaExceeded] = useState(isFirestoreQuotaExceeded());
  const [dismissedQuotaBanner, setDismissedQuotaBanner] = useState(false);

  useEffect(() => {
    const unsub = subscribeToQuotaExceeded((exceeded) => {
      setQuotaExceeded(exceeded);
    });
    return () => unsub();
  }, []);

  // Canvas Pan & Zoom state kept in sync for live cursor projection
  const [canvasPan, setCanvasPan] = useState<Point>({ x: 100, y: 100 });
  const [canvasZoom, setCanvasZoom] = useState<number>(1);
  const canvasRef = useRef<CanvasRefHandle>(null);

  // Zoom actions
  const handleZoomIn = useCallback(() => {
    canvasRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    canvasRef.current?.zoomOut();
  }, []);

  const handleResetZoom = useCallback(() => {
    canvasRef.current?.resetZoom();
  }, []);

  // View change handler with equality check to prevent infinite re-render loops
  const handleViewChange = useCallback((newPan: Point, newZoom: number) => {
    setCanvasPan((prev) => (prev.x === newPan.x && prev.y === newPan.y ? prev : newPan));
    setCanvasZoom((prev) => (prev === newZoom ? prev : newZoom));
  }, []);

  // High-visibility on-screen cursor state
  const [showCursorReticle, setShowCursorReticle] = useState(true);
  const [isSimulatingStudent, setIsSimulatingStudent] = useState(false);

  // Live student cursor simulation effect for demonstration/testing
  useEffect(() => {
    if (!isSimulatingStudent) return;

    let angle = 0;
    const interval = setInterval(() => {
      angle += 0.06;
      const radiusX = 260;
      const radiusY = 160;
      const centerX = 520;
      const centerY = 360;

      const simUser: UserPresence = {
        id: 'sim_student_sarah',
        name: 'Sarah (Student · UK)',
        role: 'student',
        color: '#059669',
        x: Math.round(centerX + Math.cos(angle) * radiusX),
        y: Math.round(centerY + Math.sin(angle * 2) * (radiusY / 2)),
        active: true,
        lastSeen: Date.now(),
      };

      setPresenceUsers((prev) => ({
        ...prev,
        [simUser.id]: simUser,
      }));
    }, 60);

    return () => {
      clearInterval(interval);
      setPresenceUsers((prev) => {
        const next = { ...prev };
        delete next['sim_student_sarah'];
        return next;
      });
    };
  }, [isSimulatingStudent]);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync URL search query param without reload
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.get('room') !== roomId) {
        url.searchParams.set('room', roomId);
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [roomId]);

  // Save current user to localStorage
  useEffect(() => {
    localStorage.setItem('conceptboard_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // Subscribe to Objects from Firebase / Local channel
  useEffect(() => {
    const unsubscribe = subscribeToBoardObjects(roomId, (remoteObjects) => {
      // Filter out any legacy welcome or app template stickies
      const cleaned: Record<string, BoardObject> = {};
      Object.entries(remoteObjects).forEach(([id, obj]) => {
        const isWelcomeOrAppNote =
          id.startsWith('sticky_welcome_') ||
          (obj.text &&
            (obj.text.includes('Welcome to Conceptboard') ||
              obj.text.includes('Low Latency:') ||
              obj.text.includes('Collaboration:') ||
              obj.text.includes('Lecture Materials:')));

        if (!isWelcomeOrAppNote) {
          cleaned[id] = obj;
        }
      });
      setObjects(cleaned);
    });

    return () => unsubscribe();
  }, [roomId]);

  // Subscribe to Live Presence / Remote Cursors
  useEffect(() => {
    const unsubscribe = subscribeToPresence(roomId, currentUser.id, (users) => {
      setPresenceUsers(users);
    });
    return () => unsubscribe();
  }, [roomId, currentUser.id]);

  // Subscribe to Room Config
  useEffect(() => {
    const unsubscribe = subscribeToRoomConfig(roomId, (config) => {
      setRoomConfig(config);
    });
    return () => unsubscribe();
  }, [roomId]);

  // Object lifecycle handlers
  const handleObjectCreated = (obj: BoardObject) => {
    // Add to local state immediately
    setObjects((prev) => ({ ...prev, [obj.id]: obj }));
    setUndoStack((prev) => [...prev, obj]);
    setRedoStack([]);
    // Sync to Firebase / channel
    syncBoardObject(roomId, obj).catch(() => {});
  };

  const handleObjectUpdated = (obj: BoardObject) => {
    setObjects((prev) => ({ ...prev, [obj.id]: obj }));
    syncBoardObject(roomId, obj).catch(() => {});
  };

  const handleObjectDeleted = (id: string) => {
    const target = objects[id];
    if (target) {
      setUndoStack((prev) => [...prev, target]);
    }
    setObjects((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    deleteBoardObject(roomId, id).catch(() => {});
    addToast('Object deleted', 'info');
  };

  // Undo / Redo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    // If exists on board, remove it; if was deleted, restore it
    if (objects[last.id]) {
      setRedoStack((prev) => [...prev, last]);
      deleteBoardObject(roomId, last.id);
      setObjects((prev) => {
        const next = { ...prev };
        delete next[last.id];
        return next;
      });
    } else {
      setRedoStack((prev) => [...prev, last]);
      syncBoardObject(roomId, last);
      setObjects((prev) => ({ ...prev, [last.id]: last }));
    }
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, next]);
    syncBoardObject(roomId, next);
    setObjects((prev) => ({ ...prev, [next.id]: next }));
  };

  // Clear board
  const handleClearBoard = () => {
    if (window.confirm('Are you sure you want to clear all objects on this board?')) {
      clearBoard(roomId);
      setObjects({});
      setUndoStack([]);
      setRedoStack([]);
      setSelectedObjectId(null);
      addToast('Board cleared', 'info');
    }
  };

  // Cursor Move Broadcast (memoized to keep Canvas props stable)
  const handleCursorMove = useCallback(
    (pt: Point) => {
      updateCursorPresence(roomId, {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
        color: currentUser.color,
        x: pt.x,
        y: pt.y,
        active: true,
        lastSeen: Date.now(),
      });
    },
    [roomId, currentUser.id, currentUser.name, currentUser.role, currentUser.color]
  );

  // Export board as PNG
  const handleExportPNG = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `whiteboard-${roomId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    addToast('Whiteboard exported as PNG!', 'success');
  };

  // Export board as JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(objects, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `whiteboard-${roomId}.json`);
    downloadAnchor.click();
    addToast('Board saved as JSON file!', 'success');
  };

  // Import board from JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (typeof imported === 'object') {
          Object.values(imported).forEach((obj: any) => {
            syncBoardObject(roomId, obj);
          });
          setObjects(imported);
          addToast('Board imported successfully!', 'success');
        }
      } catch {
        addToast('Invalid JSON board file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Upload image from file
  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (!src) return;

      const img = new Image();
      img.onload = () => {
        const maxDim = 450;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const newImgObj: BoardObject = {
          id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: 'image',
          x: 200,
          y: 200,
          width: w,
          height: h,
          src,
          fileName: file.name,
          createdAt: Date.now(),
          zIndex: Date.now(),
        };

        handleObjectCreated(newImgObj);
        setSelectedObjectId(newImgObj.id);
        addToast(`Image "${file.name}" uploaded!`, 'success');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Upload PDF using PDF.js CDN
  const handleUploadPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    addToast(`Rendering PDF "${file.name}" pages...`, 'info');
    try {
      const pages = await renderPDFToImages(file, 8);
      pages.forEach((page, idx) => {
        const pageObj: BoardObject = {
          id: `pdf_${Date.now()}_p${page.pageNumber}`,
          type: 'image',
          x: 180 + idx * 340,
          y: 220,
          width: 320,
          height: Math.round(320 * (page.height / page.width)),
          src: page.dataUrl,
          fileName: `${file.name} (p.${page.pageNumber})`,
          pageNumber: page.pageNumber,
          createdAt: Date.now() + idx,
          zIndex: Date.now() + idx,
        };
        handleObjectCreated(pageObj);
      });
      addToast(`Uploaded ${pages.length} pages from PDF!`, 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`PDF render failed: ${err.message || 'Unknown error'}`, 'error');
    }
    e.target.value = '';
  };

  // Download Standalone .html File
  const handleDownloadSingleFile = () => {
    const htmlString = getStandaloneHtmlContent(roomId);
    const blob = new Blob([htmlString], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conceptboard-${roomId}.html`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('Downloaded single-file conceptboard.html! Ready to run offline.', 'success');
  };

  // Permission update
  const handleUpdatePermission = (mode: 'edit' | 'view_only') => {
    setRoomPermissionMode(roomId, mode);
    addToast(
      mode === 'view_only'
        ? 'Switched to View-Only mode (Students cannot edit)'
        : 'Switched to Edit mode (Everyone can draw)',
      'info'
    );
  };

  // Check if student is restricted
  const isReadOnly =
    roomConfig.permissionMode === 'view_only' && currentUser.role === 'student';

  const onlineCount = Object.keys(presenceUsers).length + 1; // remote + self

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-slate-50 text-slate-800">
      {/* Firestore Quota Exceeded Friendly Banner */}
      {quotaExceeded && !dismissedQuotaBanner && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-medium flex items-center justify-between gap-3 shadow-md z-50 shrink-0 border-b border-amber-600">
          <div className="flex items-center gap-2 overflow-hidden text-ellipsis">
            <AlertTriangle className="w-4 h-4 shrink-0 text-slate-950" />
            <span>
              <strong>Firestore Daily Free Write Quota Exceeded:</strong> Switched to local offline & multi-tab collaboration mode. All drawing, sticky notes, tools, and PNG/JSON exports remain fully active. Free quota resets tomorrow.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://console.firebase.google.com/project/gen-lang-client-0670794076/firestore/databases/ai-studio-conceptboardcoll-cdd84032-8dd9-48ec-903e-d280c218114e/data?openUpgradeDialog=true"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1 text-[11px]"
            >
              <span>View Quota / Upgrade</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={() => setDismissedQuotaBanner(true)}
              className="p-1 hover:bg-amber-600 rounded text-slate-950 transition-colors cursor-pointer"
              title="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Toolbar */}
      <TopBar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        currentColor={currentColor}
        onSelectColor={setCurrentColor}
        strokeWidth={strokeWidth}
        onChangeStrokeWidth={setStrokeWidth}
        fillShape={fillShape}
        onToggleFillShape={() => setFillShape(!fillShape)}
        stickyColor={stickyColor}
        onSelectStickyColor={setStickyColor}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClearBoard={handleClearBoard}
        onOpenShare={() => setIsShareOpen(true)}
        onOpenFirebase={() => setIsFirebaseOpen(true)}
        onOpenUserProfile={() => setIsUserModalOpen(true)}
        onExportPNG={handleExportPNG}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        onUploadImage={handleUploadImage}
        onUploadPDF={handleUploadPDF}
        onDownloadSingleFile={handleDownloadSingleFile}
        currentUser={currentUser}
        onlineCount={onlineCount}
        isFirebaseActive={isFirebaseConnected()}
        roomId={roomId}
        isReadOnly={isReadOnly}
        zoom={canvasZoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
      />

      {/* Main Canvas Area */}
      <div className="relative flex-1 w-full h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Always-Visible Floating Creative Tools Deck */}
        <CreativeToolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          currentColor={currentColor}
          onSelectColor={setCurrentColor}
          strokeWidth={strokeWidth}
          onChangeStrokeWidth={setStrokeWidth}
          fillShape={fillShape}
          onToggleFillShape={() => setFillShape(!fillShape)}
          stickyColor={stickyColor}
          onSelectStickyColor={setStickyColor}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onUploadImage={handleUploadImage}
          onUploadPDF={handleUploadPDF}
          showCursorPreview={showCursorReticle}
          onToggleCursorPreview={() => setShowCursorReticle((prev) => !prev)}
          zoom={canvasZoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
          isSimulatingStudent={isSimulatingStudent}
          onSimulateStudentCursor={() => {
            setIsSimulatingStudent((prev) => {
              const next = !prev;
              addToast(
                next
                  ? 'Simulated student (Sarah · UK) joined! Watch their live cursor move.'
                  : 'Simulated student left.',
                'info'
              );
              return next;
            });
          }}
        />

        <Canvas
          ref={canvasRef}
          objects={objects}
          activeTool={activeTool}
          currentColor={currentColor}
          strokeWidth={strokeWidth}
          fillShape={fillShape}
          stickyColor={stickyColor}
          isReadOnly={isReadOnly}
          onObjectCreated={handleObjectCreated}
          onObjectUpdated={handleObjectUpdated}
          onObjectDeleted={handleObjectDeleted}
          onCursorMove={handleCursorMove}
          onToast={addToast}
          selectedObjectId={selectedObjectId}
          onSelectObject={setSelectedObjectId}
          showCursorReticle={showCursorReticle}
          onViewChange={handleViewChange}
        />

        {/* Live Remote Cursors */}
        <LiveCursors
          users={presenceUsers}
          pan={canvasPan}
          zoom={canvasZoom}
        />
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        roomId={roomId}
        config={roomConfig}
        isTeacher={currentUser.role === 'teacher'}
        onUpdatePermission={handleUpdatePermission}
        onToast={addToast}
      />

      {/* Firebase Setup Modal */}
      <FirebaseSetupModal
        isOpen={isFirebaseOpen}
        onClose={() => setIsFirebaseOpen(false)}
        onToast={addToast}
      />

      {/* User Profile Modal */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        name={currentUser.name}
        role={currentUser.role}
        color={currentUser.color}
        onSave={(name, role, color) => {
          setCurrentUser({ ...currentUser, name, role, color });
          addToast('Profile updated!', 'success');
        }}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
