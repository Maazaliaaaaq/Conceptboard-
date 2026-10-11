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
  FileCode,
  ZoomIn,
  ZoomOut,
  Github,
  Layers,
  Copy,
  Check,
  KeyRound,
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
  quotaExceeded?: boolean;
  onOpenTeacherLogin?: () => void;
}

const PRIMARY_SWATCHES = [
  '#0f172a',
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0284c7',
  '#4f46e5',
  '#9333ea',
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
  isReadOnly,
  zoom = 1,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onOpenBoardManager,
  quotaExceeded,
  onOpenTeacherLogin,
}) => {
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showGithubModal, setShowGithubModal] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const isShapeTool = ['rect', 'ellipse', 'line', 'arrow'].includes(activeTool);

  return (
    <header className="bg-white border-b border-slate-200 z-30 select-none shadow-xs shrink-0 w-full">
      {/* Tier 1: Branding, Room Code, Boards Manager, File Menu & User Actions (Fully visible, wrapped) */}
      <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs"
            title="Conceptboard Collab - Interactive Whiteboard"
          >
            CB
          </div>

          <button
            onClick={() => {
              if (currentUser.role === 'teacher') {
                onOpenShare();
              } else {
                navigator.clipboard.writeText(roomId);
              }
            }}
            className="px-2.5 py-1 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 text-slate-700 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title={currentUser.role === 'teacher' ? "Click to copy link or share with students" : "Room code (click to copy)"}
          >
            <span className="text-[10px] text-slate-400 font-sans">Room:</span>
            <span className="font-bold text-indigo-700">{roomId}</span>
            <Copy className="w-3 h-3 text-slate-400" />
          </button>

          {onOpenBoardManager && currentUser.role === 'teacher' && (
            <button
              onClick={onOpenBoardManager}
              className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Manage multiple student boards"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Student Boards</span>
            </button>
          )}

          {currentUser.role === 'teacher' && quotaExceeded && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold animate-pulse shadow-xs" title="Firebase daily free write quota limit reached. Running in seamless local sync mode.">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>⚡ Firebase Limit Reached (Local Mode)</span>
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => setShowFileMenu(!showFileMenu)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer bg-white"
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
                  {currentUser.role === 'teacher' && (
                    <>
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
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isReadOnly && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-semibold">
              View Only
            </span>
          )}

          <div
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 text-xs font-medium"
            title={`${onlineCount} active participant(s)`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono text-xs font-bold">{onlineCount}</span>
          </div>

          <button
            onClick={onOpenUserProfile}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
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

          {currentUser.role !== 'teacher' && onOpenTeacherLogin && (
            <button
              onClick={onOpenTeacherLogin}
              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Teacher Login (ID: admin, Password: 4321)"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              <span>Teacher Login</span>
            </button>
          )}

          {currentUser.role === 'teacher' && (
            <button
              onClick={onOpenShare}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Invite students with room link or code"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          )}
        </div>
      </div>

      {/* Tier 2: ALL Drawing Tools, Colors, Sizes, Shapes, Undo/Redo & Zoom (Fully visible with flex-wrap, no hiding) */}
      <div className="px-3 py-2 flex flex-wrap items-center gap-2.5 bg-white">
        {/* Section 1: Navigation & Drawing Core Tools */}
        <div className="flex items-center gap-0.5 bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            onClick={() => onSelectTool('select')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTool === 'select'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white'
            }`}
            title="Select & Move Objects (V)"
          >
            <MousePointer2 className="w-3.5 h-3.5" />
            <span>Select</span>
          </button>

          <button
            onClick={() => onSelectTool('pan')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTool === 'pan'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white'
            }`}
            title="Pan / Hand tool (H)"
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Pan</span>
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          <button
            onClick={() => onSelectTool('pen')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTool === 'pen'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white'
            }`}
            title="Draw with Pen (P)"
          >
            <Pen className="w-3.5 h-3.5" />
            <span>Pen</span>
          </button>

          <button
            onClick={() => onSelectTool('highlighter')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTool === 'highlighter'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white'
            }`}
            title="Highlighter"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-500" />
            <span>Highlight</span>
          </button>

          <button
            onClick={() => onSelectTool('eraser')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTool === 'eraser'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white'
            }`}
            title="Eraser (E)"
          >
            <Eraser className="w-3.5 h-3.5 text-rose-500" />
            <span>Eraser</span>
          </button>
        </div>

        {/* Section 2: Shapes */}
        <div className="flex items-center gap-0.5 bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            onClick={() => onSelectTool('rect')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              activeTool === 'rect'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white'
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
                : 'text-slate-700 hover:bg-white'
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
                : 'text-slate-700 hover:bg-white'
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
                : 'text-slate-700 hover:bg-white'
            }`}
            title="Arrow (A)"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Section 3: Content (Text, Sticky, Image, PDF) */}
        <div className="flex items-center gap-0.5 bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            onClick={() => onSelectTool('text')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTool === 'text'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white'
            }`}
            title="Text Box (T)"
          >
            <Type className="w-3.5 h-3.5" />
            <span>Text</span>
          </button>

          <button
            onClick={() => onSelectTool('sticky')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeTool === 'sticky'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white'
            }`}
            title="Sticky Note (S)"
          >
            <StickyNote className="w-3.5 h-3.5 text-amber-500 fill-amber-300" />
            <span>Sticky</span>
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          <button
            onClick={() => imageInputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white transition-colors flex items-center gap-1 cursor-pointer"
            title="Upload Image"
          >
            <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>Image</span>
          </button>

          <button
            onClick={() => pdfInputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white transition-colors flex items-center gap-1 cursor-pointer"
            title="Upload PDF"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF</span>
          </button>
        </div>

        {/* Section 4: Color Swatches & Studio */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-2xs">
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
              title={`Color: ${c}`}
            />
          ))}

          <div className="relative pl-1 border-l border-slate-200 ml-0.5">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center cursor-pointer shadow-2xs hover:scale-105"
              style={{ backgroundColor: currentColor }}
              title="More colors"
            >
              <ChevronDown className="w-2.5 h-2.5 text-white mix-blend-difference" />
            </button>

            {showColorPicker && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowColorPicker(false)}
                />
                <div className="absolute right-0 mt-2 p-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 grid grid-cols-4 gap-1.5 w-36">
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

        {/* Section 5: Stroke Width */}
        <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
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
                  : 'text-slate-600 hover:bg-white'
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
            className="w-12 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 ml-0.5"
            title={`Stroke width: ${strokeWidth}px`}
          />
          <span className="font-mono text-[10px] w-3 text-slate-600 text-right">{strokeWidth}</span>
        </div>

        {/* Section 6: Contextual Controls (Shape Fill & Sticky Note Palette) */}
        {isShapeTool && (
          <button
            onClick={onToggleFillShape}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-colors cursor-pointer shadow-2xs ${
              fillShape
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
            }`}
            title="Toggle shape fill style"
          >
            {fillShape ? 'Filled' : 'Outline'}
          </button>
        )}

        {activeTool === 'sticky' && (
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-2xs">
            {STICKY_PALETTE.map((s) => (
              <button
                key={s.name}
                onClick={() => onSelectStickyColor(s.color)}
                style={{ backgroundColor: s.color }}
                className={`w-5 h-5 rounded-md border border-slate-300 transition-transform cursor-pointer flex items-center justify-center ${
                  stickyColor === s.color
                    ? 'ring-2 ring-slate-800 scale-110'
                    : 'opacity-70 hover:opacity-100'
                }`}
                title={`${s.name} Note`}
              >
                {stickyColor === s.color && <Check className="w-3 h-3 text-slate-800" />}
              </button>
            ))}
          </div>
        )}

        {/* Section 7: Undo & Redo */}
        <div className="flex items-center gap-0.5 bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            disabled={!canUndo}
            onClick={onUndo}
            className="p-1 rounded text-slate-700 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={!canRedo}
            onClick={onRedo}
            className="p-1 rounded text-slate-700 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Section 8: Zoom Controls */}
        {onZoomIn && onZoomOut && (
          <div className="flex items-center gap-0.5 bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={onZoomOut}
              className="p-1 rounded text-slate-700 hover:bg-white transition-colors cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onResetZoom}
              className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold text-slate-700 hover:bg-white transition-colors cursor-pointer"
              title="Reset Zoom to 100%"
            >
              {Math.round((zoom || 1) * 100)}%
            </button>
            <button
              onClick={onZoomIn}
              className="p-1 rounded text-slate-700 hover:bg-white transition-colors cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Hidden File Inputs */}
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

      <GithubModal
        isOpen={showGithubModal}
        onClose={() => setShowGithubModal(false)}
      />
    </header>
  );
};
