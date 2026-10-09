import React, { useState } from 'react';
import { X, Copy, Check, Users, Shield, Link2, KeyRound } from 'lucide-react';
import { BoardRoomConfig } from '../types/board';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  config: BoardRoomConfig;
  isTeacher: boolean;
  onUpdatePermission: (mode: 'edit' | 'view_only') => void;
  onToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  roomId,
  config,
  isTeacher,
  onUpdatePermission,
  onToast,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?room=${roomId}`
    : `https://whiteboard.app/?room=${roomId}`;

  const copyToClipboard = async (text: string, type: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
        onToast('Shareable link copied to clipboard!', 'success');
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
        onToast('Room code copied!', 'success');
      }
    } catch {
      onToast('Could not copy automatically. Please copy manually.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Share Whiteboard</h2>
              <p className="text-xs text-slate-500">Invite students and collaborators</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Share Link */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-slate-500" />
              Direct Shareable Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 select-all focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={() => copyToClipboard(shareUrl, 'link')}
                className="px-3.5 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Room Code */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 font-medium">Room Code (Manual Entry)</p>
                <p className="text-lg font-mono font-bold tracking-wider text-slate-900">{roomId}</p>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(roomId, 'code')}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Permissions (Teacher toggle) */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-800">Student Permissions</span>
              </div>
              {isTeacher ? (
                <span className="text-[11px] text-indigo-600 font-medium">Teacher Control</span>
              ) : (
                <span className="text-[11px] text-slate-400">Teacher controls this</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                disabled={!isTeacher}
                onClick={() => onUpdatePermission('edit')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all ${
                  config.permissionMode === 'edit'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                } ${!isTeacher ? 'cursor-not-allowed opacity-80' : ''}`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span>Everyone Can Edit</span>
                  {config.permissionMode === 'edit' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <p className="text-[10px] text-slate-500 font-normal">Students can draw and add notes</p>
              </button>

              <button
                disabled={!isTeacher}
                onClick={() => onUpdatePermission('view_only')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all ${
                  config.permissionMode === 'view_only'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                } ${!isTeacher ? 'cursor-not-allowed opacity-80' : ''}`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span>View Only</span>
                  {config.permissionMode === 'view_only' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <p className="text-[10px] text-slate-500 font-normal">Students watch live teacher board</p>
              </button>
            </div>
          </div>

          {/* Performance note for international teaching */}
          <div className="text-[11px] text-slate-500 leading-relaxed bg-amber-50/60 border border-amber-100 rounded-lg p-2.5">
            🌍 <span className="font-medium text-amber-900">High-speed global routing:</span> Optimized for cross-continental links between Pakistan / Saudi Arabia and UK / Australia with instant local rendering and batched sync.
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
