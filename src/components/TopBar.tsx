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
  Download,
  Upload,
  Trash2,
  ChevronDown,
  Sparkles,
  FileCode,
  ZoomIn,
  ZoomOut,
  Github,
  Layers,
  Eye,
} from 'lucide-react';
import { ToolType } from '../types/board';
import { GithubModal } from './GithubModal';

export interface TopBarProps {
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
  onOpenUserProfile: () => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadPDF: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadSingleFile: () => void;
  currentUser: { name: string; role: 'teacher' | 'student'; color: string };
  onlineCount: number;
  roomId: string;
  isReadOnly: boolean;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onOpenBoardManager?: () => void;
  showCursorReticle?: boolean;
  onToggleCursorReticle?: () => void;
  // Optional background parameters
  onOpenFirebase?: () => void;
  isFirebaseActive?: boolean;
  webRtcStatus?: 'disconnected' | 'connecting' | 'connected' | 'host';
  peerCount?: number;
}

const PRIMARY_SWATCHES = [
  '#0f172a', // dark slate
  '#dc2626', // red
  '#ea580c', // orange
  '#ca8a04', // yellow
  '#16a34a', // green
  '#0284c7', // light blue
  '#4f46e5', // indigo
  '#9333ea', // purple
];

const ALL_PALETTE_COLORS = [
  '#0f172a',
  '#334155',
  '#64748b',
  '#ffffff',
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0284c7',
  '#4f46e5',
  '#9333ea',
  '#db2777',
];

const STICKY_PALETTE = [
  { name: 'Yellow', color: '#fef08a' },
  { name: 'Green', color: '#bbf7d0' },
  { name: 'Blue', color: '#bae6fd' },
  { name: 'Pink', color: '#fbcfe8' },
  { name: 'Orange', color: '#fed7aa' },
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
  onOpenUserProfile,
  onExportPNG,
  onExportJSON,
  onImportJSON,
  onUploadImage,
  onUploadPDF,
  onDownloadSingleFile,
  currentUser,
  onlineCount,
  roomId,
  zoom = 1,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onOpenBoardManager,
  showCursorReticle = true,
  onToggleCursorReticle,
}) => {
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showGithubModal, setShowGithubModal] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const isShapeTool = ['rect', 'ellipse', 'line', 'arrow'].includes(activeTool);

  return (
    <header className="bg-white border-b border-slate-200 z-30 select-none shadow-xs shrink-0">
      {/* Tier 1: App Header, Room Info, Boards Switcher, File Menu, & Collaboration Actions */}
      <div className="h-12 px-3 md:px-4 flex items-center justify-between gap-2.5 border-b border-slate-100">
        {/* Left: Branding, Room Code, Boards, File Menu */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs"
            title="Conceptboard Collab"
          >
            CB
          </div>

          {/* Room Badge */}
          <button
            onClick={onOpenShare}
            className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-700 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Click to copy link or share with students"
          >
            <span className="text-[10px] text-slate-400 font-sans font-normal">Room:</span>
            <span className="font-bold text-indigo-700">{roomId}</span>
          </button>

          {/* Multi-Student Boards Switcher Button */}
          {onOpenBoardManager && (
            <button
              onClick={onOpenBoardManager}
              className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Handle 2–3 students on different boards (switch or open side-by-side)"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Student Boards</span>
            </button>
          )}

          {/* File & Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFileMenu(!showFileMenu)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>File & Export</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showFileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowFileMenu(false)}
                />
                <div className="absolute left-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 text-xs">
                  <button
                    onClick={() => {
                      onExportPNG();
                      setShowFileMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Export as PNG Image</span>
                  </button>
                  <button
                    onClick={() => {
                      onExportJSON();
                      setShowFileMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Save Board (.json)</span>
                  </button>
                  <button
                    onClick={() => {
                      jsonInputRef.current?.click();
                      setShowFileMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium cursor-pointer"
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
                    className="w-full text-left px-3.5 py-2 hover:bg-amber-50/70 flex items-center gap-2 text-amber-900 font-medium cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-amber-600" />
                    <div>
                      <span>Download Standalone .html</span>
                      <p className="text-[10px] text-amber-700 font-normal">Runs 100% offline in browser</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowGithubModal(true);
                      setShowFileMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-800 font-medium cursor-pointer"
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
                    className="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-rose-600 font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Entire Board</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Reticle toggle, Online Count, User Profile, Share */}
        <div className="flex items-center gap-2 shrink-0">
          {/* On-Screen Reticle Preview Toggle */}
          {onToggleCursorReticle && (
            <button
              onClick={onToggleCursorReticle}
              className={`px-2 py-1 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 text-xs ${
                showCursorReticle
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
              title={showCursorReticle ? 'Pointer reticle active' : 'Pointer reticle hidden'}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="text-[11px]">Reticle</span>
            </button>
          )}

          {/* Online Count */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 text-xs font-medium"
            title={`${onlineCount} connected participant(s)`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono text-xs font-bold">{onlineCount}</span>
          </div>

          {/* User Profile */}
          <button
            onClick={onOpenUserProfile}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
            title="Change name and role"
          >
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: currentUser.color }}
            />
            <span className="max-w-[100px] truncate">{currentUser.name}</span>
            <span className="text-[10px] text-slate-400">
              ({currentUser.role === 'teacher' ? 'Host' : 'Student'})
            </span>
          </button>

          {/* Share Button */}
          <button
            onClick={onOpenShare}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Invite students with room link or code"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Tier 2: ALL Drawing Tools, Quick Colors, Sizes, Shapes, Undo/Redo & Zoom Controls */}
      <div className="min-h-11 px-3 md:px-4 py-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 bg-slate-50/70">
        {/* Group 1: All 13 Core Tools */}
        <div className="flex items-center gap-0.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs shrink-0">
          {/* Select & Pan */}
          <button
            onClick={() => onSelectTool('select')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTool === 'select'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Select & Move Objects (V)"
          >
            <MousePointer2 className="w-3.5 h-3.5" />
            <span>Select</span>
          </button>

          <button
            onClick={() => onSelectTool('pan')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTool === 'pan'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Pan / Hand tool (H / Spacebar)"
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Pan</span>
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          {/* Drawing: Pen, Highlighter, Eraser */}
          <button
            onClick={() => onSelectTool('pen')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTool === 'pen'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Draw with Pen (P)"
          >
            <Pen className="w-3.5 h-3.5" />
            <span>Pen</span>
          </button>

          <button
            onClick={() => onSelectTool('highlighter')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTool === 'highlighter'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Highlighter (semi-transparent)"
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>Highlight</span>
          </button>

          <button
            onClick={() => onSelectTool('eraser')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTool === 'eraser'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Eraser (E)"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Eraser</span>
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          {/* Shapes: Rect, Circle, Line, Arrow */}
          <button
            onClick={() => onSelectTool('rect')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              activeTool === 'rect'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Rectangle (R)"
          >
            <Square className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onSelectTool('ellipse')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              activeTool === 'ellipse'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Circle / Ellipse (O)"
          >
            <Circle className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onSelectTool('line')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              activeTool === 'line'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Line (L)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onSelectTool('arrow')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              activeTool === 'arrow'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Arrow (A)"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          {/* Text & Sticky */}
          <button
            onClick={() => onSelectTool('text')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTool === 'text'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Text Box (T)"
          >
            <Type className="w-3.5 h-3.5" />
            <span>Text</span>
          </button>

          <button
            onClick={() => onSelectTool('sticky')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTool === 'sticky'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Sticky Note (S)"
          >
            <StickyNote className="w-3.5 h-3.5 text-amber-500 fill-amber-300" />
            <span>Sticky</span>
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          {/* Media: Image & PDF Upload */}
          <button
            onClick={() => imageInputRef.current?.click()}
            className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
            title="Upload or Paste Image (PNG/JPG)"
          >
            <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>Image</span>
          </button>

          <button
            onClick={() => pdfInputRef.current?.click()}
            className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
            title="Upload PDF (Renders lecture slides/pages directly on board)"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF</span>
          </button>
        </div>

        {/* Group 2: Quick Colors, Sizes, Modifiers, Undo/Redo & Zoom */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Color Swatches (8 core colors directly clickable) */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            {PRIMARY_SWATCHES.map((c) => (
              <button
                key={c}
                onClick={() => onSelectColor(c)}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                  currentColor === c
                    ? 'ring-2 ring-indigo-500 scale-110 border-white'
                    : 'border-slate-300 hover:scale-105'
                }`}
                title={`Select color: ${c}`}
              />
            ))}

            {/* Custom Color Dropdown Trigger */}
            <div className="relative pl-1 border-l border-slate-200 ml-0.5">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center cursor-pointer shadow-2xs hover:scale-105"
                style={{ backgroundColor: currentColor }}
                title="All Palette Colors"
              >
                <ChevronDown className="w-2.5 h-2.5 text-white mix-blend-difference" />
              </button>

              {showColorPicker && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowColorPicker(false)}
                  />
                  <div className="absolute right-0 mt-2 p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 grid grid-cols-4 gap-1.5 w-40">
                    {ALL_PALETTE_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          onSelectColor(c);
                          setShowColorPicker(false);
                        }}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-md border transition-transform cursor-pointer ${
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
          </div>

          {/* Stroke Width Selector (Presets S, M, L, XL + range) */}
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400">Size:</span>
            {[
              { label: 'S', val: 2 },
              { label: 'M', val: 4 },
              { label: 'L', val: 8 },
              { label: 'XL', val: 14 },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => onChangeStrokeWidth(p.val)}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                  strokeWidth === p.val
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title={`${p.label} (${p.val}px)`}
              >
                {p.label}
              </button>
            ))}
            <input
              type="range"
              min={1}
              max={28}
              value={strokeWidth}
              onChange={(e) => onChangeStrokeWidth(Number(e.target.value))}
              className="w-14 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 ml-1"
              title={`Stroke width: ${strokeWidth}px`}
            />
            <span className="font-mono text-[10px] w-3 text-slate-600 text-right">{strokeWidth}</span>
          </div>

          {/* Shape Fill Toggle (shown when shape tool is active) */}
          {isShapeTool && (
            <button
              onClick={onToggleFillShape}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-colors cursor-pointer shadow-2xs ${
                fillShape
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Toggle shape fill style"
            >
              {fillShape ? 'Filled Shape' : 'Outline Only'}
            </button>
          )}

          {/* Sticky Colors (shown when sticky note tool is active) */}
          {activeTool === 'sticky' && (
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              {STICKY_PALETTE.map((s) => (
                <button
                  key={s.name}
                  onClick={() => onSelectStickyColor(s.color)}
                  style={{ backgroundColor: s.color }}
                  className={`w-5 h-5 rounded-md transition-transform cursor-pointer ${
                    stickyColor === s.color
                      ? 'ring-2 ring-slate-800 scale-110'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  title={`${s.name} Note`}
                />
              ))}
            </div>
          )}

          {/* Undo & Redo */}
          <div className="flex items-center gap-0.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              disabled={!canUndo}
              onClick={onUndo}
              className="p-1 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              disabled={!canRedo}
              onClick={onRedo}
              className="p-1 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom Controls */}
          {onZoomIn && onZoomOut && (
            <div className="flex items-center gap-0.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                onClick={onZoomOut}
                className="p-1 rounded text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onResetZoom}
                className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Reset Zoom to 100%"
              >
                {Math.round((zoom || 1) * 100)}%
              </button>
              <button
                onClick={onZoomIn}
                className="p-1 rounded text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden File Inputs for Image, PDF, and JSON */}
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

      {/* GitHub Setup Modal */}
      <GithubModal
        isOpen={showGithubModal}
        onClose={() => setShowGithubModal(false)}
      />
    </header>
  );
};
