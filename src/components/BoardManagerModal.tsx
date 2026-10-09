import React, { useState, useEffect } from 'react';
import { X, Plus, Layers, ArrowRight, Trash2, Edit2, Check, Share2, HelpCircle, Sparkles } from 'lucide-react';

export interface BoardRoomMeta {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  lastUsedAt: number;
  objectCount?: number;
}

interface BoardManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoomId: string;
  onSwitchRoom: (roomId: string) => void;
  onToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  isTeacher: boolean;
}

const STORAGE_SAVED_BOARDS = 'conceptboard_my_boards';

export const BoardManagerModal: React.FC<BoardManagerModalProps> = ({
  isOpen,
  onClose,
  currentRoomId,
  onSwitchRoom,
  onToast,
  isTeacher,
}) => {
  const [boards, setBoards] = useState<BoardRoomMeta[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_SAVED_BOARDS);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: currentRoomId,
        name: `Main Class Board (${currentRoomId})`,
        description: 'Default lecture board for all students',
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
      },
    ];
  });

  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Synchronize current board in boards list
  useEffect(() => {
    setBoards((prev) => {
      const exists = prev.find((b) => b.id === currentRoomId);
      if (!exists) {
        const updated = [
          ...prev,
          {
            id: currentRoomId,
            name: `Board ${currentRoomId}`,
            description: 'Active classroom session',
            createdAt: Date.now(),
            lastUsedAt: Date.now(),
          },
        ];
        try {
          localStorage.setItem(STORAGE_SAVED_BOARDS, JSON.stringify(updated));
        } catch {}
        return updated;
      }
      return prev;
    });
  }, [currentRoomId]);

  if (!isOpen) return null;

  const saveBoards = (next: BoardRoomMeta[]) => {
    setBoards(next);
    try {
      localStorage.setItem(STORAGE_SAVED_BOARDS, JSON.stringify(next));
    } catch {}
  };

  const handleCreateBoard = (e: React.FormEvent) => {
    e.preventDefault();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let newId = '';
    for (let i = 0; i < 6; i++) {
      newId += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const name = newBoardName.trim() || `Student Board ${newId}`;
    const newBoard: BoardRoomMeta = {
      id: newId,
      name,
      description: newBoardDesc.trim() || 'Dedicated individual / group board',
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };

    const next = [...boards, newBoard];
    saveBoards(next);
    setNewBoardName('');
    setNewBoardDesc('');
    setIsCreating(false);
    onToast(`Created "${name}"! Switching now...`, 'success');
    onSwitchRoom(newId);
    onClose();
  };

  const handleDeleteBoard = (id: string, name: string) => {
    if (boards.length <= 1) {
      onToast('You must keep at least one board.', 'error');
      return;
    }
    if (window.confirm(`Delete "${name}" from your board manager?`)) {
      const next = boards.filter((b) => b.id !== id);
      saveBoards(next);
      onToast(`Deleted "${name}"`, 'info');
      if (id === currentRoomId && next.length > 0) {
        onSwitchRoom(next[0].id);
      }
    }
  };

  const handleSaveRename = (id: string) => {
    if (!editingName.trim()) return;
    const next = boards.map((b) => (b.id === id ? { ...b, name: editingName.trim() } : b));
    saveBoards(next);
    setEditingId(null);
    onToast('Board renamed!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Multi-Student Board Manager</h2>
              <p className="text-xs text-slate-500">
                Switch instantly between students or group boards (e.g., Student A, Student B)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 flex-1">
          {/* Quick Explanation Banner */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 text-indigo-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px] space-y-1">
              <p className="font-semibold text-indigo-950">
                How to handle 2–3 students simultaneously:
              </p>
              <p>
                Each student can have their own isolated board room code (or you can create one for &ldquo;Student 1&rdquo;, &ldquo;Student 2&rdquo;, etc.). Simply click &ldquo;Switch to this Board&rdquo; or open each student&rsquo;s link in a separate browser tab to supervise them at once!
              </p>
            </div>
          </div>

          {/* Create new board trigger / form */}
          {!isCreating ? (
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 text-xs">
                Your Classroom Boards ({boards.length})
              </span>
              <button
                onClick={() => setIsCreating(true)}
                className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Student Board</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateBoard} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">Create New Whiteboard Room</span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Board Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    placeholder="e.g. Student Sarah - Math Session"
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Description / Purpose (Optional)
                  </label>
                  <input
                    type="text"
                    value={newBoardDesc}
                    onChange={(e) => setNewBoardDesc(e.target.value)}
                    placeholder="e.g. Algebra Grade 10"
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer shadow-xs"
                >
                  Create & Switch Board
                </button>
              </div>
            </form>
          )}

          {/* Boards List */}
          <div className="space-y-2">
            {boards.map((b) => {
              const isCurrent = b.id === currentRoomId;
              const isEditing = editingId === b.id;

              return (
                <div
                  key={b.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-indigo-50/60 border-indigo-300 shadow-xs ring-1 ring-indigo-200'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isCurrent
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {b.id.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="text-xs bg-white border border-indigo-400 rounded px-2 py-0.5 text-slate-800"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveRename(b.id)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900 text-xs truncate">{b.name}</h4>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-600 text-white uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span className="font-mono bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-indigo-700 font-semibold">
                          Room: {b.id}
                        </span>
                        {b.description && (
                          <span className="truncate max-w-[200px] text-slate-400">
                            · {b.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isEditing && (
                      <button
                        onClick={() => {
                          setEditingId(b.id);
                          setEditingName(b.name);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                        title="Rename board"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => {
                        const url = `${window.location.origin}${window.location.pathname}?room=${b.id}`;
                        navigator.clipboard.writeText(url);
                        onToast(`Copied student link for ${b.name}!`, 'success');
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                      title="Copy student link"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    {isCurrent ? (
                      <span className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-100/70 rounded-lg flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Currently Open
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          onSwitchRoom(b.id);
                          onToast(`Switched to "${b.name}"`, 'success');
                          onClose();
                        }}
                        className="px-3 py-1 text-xs font-semibold bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open Board</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {boards.length > 1 && !isCurrent && (
                      <button
                        onClick={() => handleDeleteBoard(b.id, b.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer ml-1"
                        title="Delete board"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500">
            Tip: You can open multiple boards in different browser tabs or side-by-side windows.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
