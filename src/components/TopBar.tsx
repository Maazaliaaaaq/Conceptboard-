import React, { useRef, useState } from 'react';
import {
  MousePointer2,
  Hand,
  Pen,
  Highlighter,
  Eraser,
  Square,
  Circle,
  Minus,
  ArrowRight,
  Type,
  StickyNote,
  Image as ImageIcon,
  FileText,
  Undo2,
  Redo2,
  Share2,
  Users,
  Flame,
  Download,
  Upload,
  Trash2,
  ChevronDown,
  Sparkles,
  FileCode,
  ZoomIn,
  ZoomOut,
  Github,
} from 'lucide-react';
import { ToolType, UserPresence } from '../types/board';
import { GithubModal } from './GithubModal';

interface TopBarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  currentColor: string;
  onSelectColor: (color: string) => void;
  strokeWidth: number;
  onChangeStrokeWidth: (width: number) => void;
  fillShape: boolean;
  onToggleFillShape: () => void;
  stickyColor: string;
  onSelectStickyColor: (color: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearBoard: () => void;
  onOpenShare: () => void;
  onOpenFirebase: () => void;
  onOpenUserProfile: () => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadPDF: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadSingleFile: () => void;
  currentUser: { name: string; role: 'teacher' | 'student'; color: string };
  onlineCount: number;
  isFirebaseActive: boolean;
  roomId: string;
  isReadOnly: boolean;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
}

const PALETTE_COLORS = [
  '#0f172a', // dark slate
  '#dc2626', // red
  '#ea580c', // orange
  '#ca8a04', // yellow
  '#16a34a', // green
  '#0284c7', // light blue
  '#4f46e5', // indigo
  '#9333ea', // purple
  '#db2777', // pink
  '#64748b', // slate
  '#ffffff', // white
];

const STICKY_PALETTE = [
  { name: 'Yellow', color: '#fef08a', border: '#fde047' },
  { name: 'Green', color: '#bbf7d0', border: '#86efac' },
  { name: 'Blue', color: '#bae6fd', border: '#7dd3fc' },
  { name: 'Pink', color: '#fbcfe8', border: '#f472b6' },
  { name: 'Orange', color: '#fed7aa', border: '#fdba74' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeTool,
  onSelectTool,
  currentColor,
  onSelectColor,
  strokeWidth,
  onChangeStrokeWidth,
  fillShape,
  onToggleFillShape,
  stickyColor,
  onSelectStickyColor,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearBoard,
  onOpenShare,
  onOpenFirebase,
  onOpenUserProfile,
  onExportPNG,
  onExportJSON,
  onImportJSON,
  onUploadImage,
  onUploadPDF,
  onDownloadSingleFile,
  currentUser,
  onlineCount,
  isFirebaseActive,
  roomId,
  isReadOnly,
  zoom = 1,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}) => {
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showGithubModal, setShowGithubModal] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const isShapeTool = ['rect', 'ellipse', 'line', 'arrow'].includes(activeTool);
  const isPenOrHighlighter = activeTool === 'pen' || activeTool === 'highlighter';

  return (
    <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 md:px-5 flex items-center justify-between gap-2 z-30 select-none shadow-xs">
      {/* Zone 1: Logo Icon & Room Info */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs"
            title="Whiteboard"
          >
            CB
          </div>
        </div>

        {/* Room Badge */}
        <div
          onClick={onOpenShare}
          className="cursor-pointer hover:bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-slate-700 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
          title="Click to copy link or share"
        >
          <span className="text-[10px] text-slate-400 font-sans">Room:</span>
          <span className="font-bold text-indigo-700">{roomId}</span>
        </div>

        {/* File & Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFileMenu(!showFileMenu)}
            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1"
          >
            <span>Board</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showFileMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowFileMenu(false)}
              />
              <div className="absolute left-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 text-xs">
                <button
                  onClick={() => {
                    onExportPNG();
                    setShowFileMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Export as PNG Image</span>
                </button>
                <button
                  onClick={() => {
                    onExportJSON();
                    setShowFileMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Save Board (.json)</span>
                </button>
                <button
                  onClick={() => {
                    jsonInputRef.current?.click();
                    setShowFileMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>Open / Load Board (.json)</span>
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={() => {
                    onDownloadSingleFile();
                    setShowFileMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-amber-50/70 flex items-center gap-2 text-amber-900 font-medium"
                >
                  <FileCode className="w-3.5 h-3.5 text-amber-600" />
                  <div>
                    <span>Download Standalone .html</span>
                    <p className="text-[10px] text-amber-700 font-normal">Single-file zero-install version</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowGithubModal(true);
                    setShowFileMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-800 font-medium"
                >
                  <Github className="w-3.5 h-3.5 text-slate-800" />
                  <div>
                    <span>GitHub / Source Code</span>
                    <p className="text-[10px] text-slate-500 font-normal">Push to repo or view setup</p>
                  </div>
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={() => {
                    onClearBoard();
                    setShowFileMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-rose-600 font-medium flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Entire Board</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Zone 2: Main Tools Strip */}
      <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 overflow-x-auto max-w-xl">
        <button
          onClick={() => onSelectTool('select')}
          className={`p-1.5 rounded-lg text-slate-700 transition-all ${
            activeTool === 'select'
              ? 'bg-white shadow-xs text-indigo-600 font-semibold'
              : 'hover:bg-slate-200/60'
          }`}
          title="Select / Move / Resize (V)"
        >
          <MousePointer2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectTool('pan')}
          className={`p-1.5 rounded-lg text-slate-700 transition-all ${
            activeTool === 'pan'
              ? 'bg-white shadow-xs text-indigo-600 font-semibold'
              : 'hover:bg-slate-200/60'
          }`}
          title="Pan / Hand tool (H / Spacebar)"
        >
          <Hand className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-slate-300 mx-0.5" />

        <button
          onClick={() => onSelectTool('pen')}
          className={`p-1.5 rounded-lg text-slate-700 transition-all ${
            activeTool === 'pen'
              ? 'bg-white shadow-xs text-indigo-600 font-semibold'
              : 'hover:bg-slate-200/60'
          }`}
          title="Pen (P)"
        >
          <Pen className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectTool('highlighter')}
          className={`p-1.5 rounded-lg text-slate-700 transition-all ${
            activeTool === 'highlighter'
              ? 'bg-white shadow-xs text-indigo-600 font-semibold'
              : 'hover:bg-slate-200/60'
          }`}
          title="Highlighter (semi-transparent)"
        >
          <Highlighter className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectTool('eraser')}
          className={`p-1.5 rounded-lg text-slate-700 transition-all ${
            activeTool === 'eraser'
              ? 'bg-white shadow-xs text-indigo-600 font-semibold'
              : 'hover:bg-slate-200/60'
          }`}
          title="Eraser (E)"
        >
          <Eraser className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-slate-300 mx-0.5" />

        <button
          onClick={() => onSelectTool('rect')}
          className={`p-1.5 rounded-lg text-slate-700 transition-all ${
            activeTool === 'rect'
              ? 'bg-white shadow-xs text-indigo-600 font-semibold'
              : 'hover:bg-slate-200/60'
          }`}
          title="Rectangle (R)"
        >
          <Square className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectTool('ellipse')}
          className={`p-1.5 rounded-lg text-slate-700 transition-all ${
            activeTool === 'ellipse'
              ? 'bg-white shadow-xs text-indigo-600 font-semibold'
              : 'hover:bg-slate-200/60'
          }`}
          title="Ellipse / Circle (O)"
        >
          <Circle className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectTool('line')}
          className={`p-1.5 rounded-lg text-slate-700 transition-all ${
            activeTool === 'line'
              ? 'bg-white shadow-xs text-indigo-600 font-semibold'
              : 'hover:bg-slate-200/60'
          }`}
          title="Line (L)"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectTool('arrow')}
          className={`p-1.5 rounded-lg text-slate-700 transition-all ${
            activeTool === 'arrow'
              ? 'bg-white shadow-xs text-indigo-600 font-semibold'
              : 'hover:bg-slate-200/60'
          }`}
          title="Arrow (A)"
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-slate-300 mx-0.5" />

        <button
          onClick={() => onSelectTool('text')}
          className={`p-1.5 rounded-lg text-slate-700 transition-all ${
            activeTool === 'text'
              ? 'bg-white shadow-xs text-indigo-600 font-semibold'
              : 'hover:bg-slate-200/60'
          }`}
          title="Text Box (T)"
        >
          <Type className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectTool('sticky')}
          className={`p-1.5 rounded-lg text-slate-700 transition-all ${
            activeTool === 'sticky'
              ? 'bg-white shadow-xs text-indigo-600 font-semibold'
              : 'hover:bg-slate-200/60'
          }`}
          title="Sticky Note (S)"
        >
          <StickyNote className="w-4 h-4 text-amber-500 fill-amber-300" />
        </button>

        <div className="w-px h-4 bg-slate-300 mx-0.5" />

        {/* Image & PDF upload */}
        <button
          onClick={() => imageInputRef.current?.click()}
          className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-200/60 transition-colors"
          title="Upload or Paste Image (PNG/JPG)"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <button
          onClick={() => pdfInputRef.current?.click()}
          className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-200/60 transition-colors"
          title="Upload PDF (Renders pages on board)"
        >
          <FileText className="w-4 h-4 text-rose-600" />
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onUploadImage}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onUploadPDF}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={onImportJSON}
      />

      {/* Zone 3: Active Tool Modifiers (Color, Stroke Width, Fill, Sticky Color) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Color picker */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors"
            title="Stroke Color"
          >
            <div
              className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs"
              style={{ backgroundColor: currentColor }}
            />
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showColorPicker && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowColorPicker(false)}
              />
              <div className="absolute right-0 mt-1.5 p-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 grid grid-cols-4 gap-1.5 w-36">
                {PALETTE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      onSelectColor(c);
                      setShowColorPicker(false);
                    }}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-md border transition-transform ${
                      currentColor === c
                        ? 'scale-110 ring-2 ring-indigo-500 border-white'
                        : 'border-slate-300 hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sticky Note Palette when sticky tool active */}
        {activeTool === 'sticky' && (
          <div className="flex items-center gap-1 px-1 bg-slate-100 rounded-md p-0.5">
            {STICKY_PALETTE.map((s) => (
              <button
                key={s.name}
                onClick={() => onSelectStickyColor(s.color)}
                style={{ backgroundColor: s.color }}
                className={`w-4 h-4 rounded transition-transform ${
                  stickyColor === s.color
                    ? 'ring-2 ring-slate-800 scale-110'
                    : 'opacity-70 hover:opacity-100'
                }`}
                title={`${s.name} Sticky`}
              />
            ))}
          </div>
        )}

        {/* Stroke width */}
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <span className="text-[10px] text-slate-400">Size:</span>
          <input
            type="range"
            min={1}
            max={24}
            value={strokeWidth}
            onChange={(e) => onChangeStrokeWidth(Number(e.target.value))}
            className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            title={`Stroke width: ${strokeWidth}px`}
          />
          <span className="font-mono text-[10px] w-4 text-slate-600">{strokeWidth}</span>
        </div>

        {/* Fill toggle for shapes */}
        {isShapeTool && (
          <button
            onClick={onToggleFillShape}
            className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
              fillShape
                ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {fillShape ? 'Filled' : 'Outline'}
          </button>
        )}

        {/* Undo & Redo */}
        <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5">
          <button
            disabled={!canUndo}
            onClick={onUndo}
            className="p-1 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={!canRedo}
            onClick={onRedo}
            className="p-1 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom In & Out Controls */}
        {onZoomIn && onZoomOut && (
          <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5">
            <button
              onClick={onZoomOut}
              className="p-1 rounded text-slate-600 hover:bg-slate-100 transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onResetZoom}
              className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              title="Reset Zoom to 100%"
            >
              {Math.round((zoom || 1) * 100)}%
            </button>
            <button
              onClick={onZoomIn}
              className="p-1 rounded text-slate-600 hover:bg-slate-100 transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Zone 4: Right Actions (Firebase status, User profile, Share, Collaborators) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Firebase Config Trigger */}
        <button
          onClick={onOpenFirebase}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-colors ${
            isFirebaseActive
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
          }`}
          title={isFirebaseActive ? 'Connected to Firebase Realtime Database' : 'Click to configure Firebase'}
        >
          <Flame className={`w-3.5 h-3.5 ${isFirebaseActive ? 'text-emerald-600 fill-emerald-500' : 'text-amber-500 fill-amber-400'}`} />
          <span className="hidden xl:inline">{isFirebaseActive ? 'Firebase Live' : 'Setup Firebase'}</span>
        </button>

        {/* Online Count */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg text-slate-700 text-xs font-medium"
          title={`${onlineCount} connected participant(s)`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-mono text-xs">{onlineCount}</span>
        </div>

        {/* User Profile */}
        <button
          onClick={onOpenUserProfile}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
          title="Change name and role"
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: currentUser.color }}
          />
          <span className="max-w-[80px] md:max-w-[120px] truncate">{currentUser.name}</span>
          <span className="text-[10px] text-slate-400">
            ({currentUser.role === 'teacher' ? 'Host' : 'Student'})
          </span>
        </button>

        {/* Share Button */}
        <button
          onClick={onOpenShare}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>
      </div>

      <GithubModal
        isOpen={showGithubModal}
        onClose={() => setShowGithubModal(false)}
      />
    </header>
  );
};
