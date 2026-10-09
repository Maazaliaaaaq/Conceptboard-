import React, { useRef } from 'react';
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
  Eye,
  Check,
  ZoomIn,
  ZoomOut,
  Workflow,
} from 'lucide-react';
import { ToolType } from '../types/board';

interface CreativeToolbarProps {
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
  onUploadImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadPDF: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showCursorPreview: boolean;
  onToggleCursorPreview: () => void;
  onSimulateStudentCursor?: () => void;
  isSimulatingStudent?: boolean;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onOpenWorkflow?: () => void;
}

const QUICK_COLORS = [
  { name: 'Dark Slate', value: '#0f172a' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Purple', value: '#9333ea' },
  { name: 'Pink', value: '#db2777' },
  { name: 'White', value: '#ffffff' },
];

const STROKE_PRESETS = [
  { label: 'Fine', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Thick', value: 8 },
  { label: 'Bold', value: 16 },
];

const STICKY_PRESETS = [
  { name: 'Yellow', color: '#fef08a' },
  { name: 'Green', color: '#bbf7d0' },
  { name: 'Blue', color: '#bae6fd' },
  { name: 'Pink', color: '#fbcfe8' },
  { name: 'Orange', color: '#fed7aa' },
];

export const CreativeToolbar: React.FC<CreativeToolbarProps> = ({
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
  onUploadImage,
  onUploadPDF,
  showCursorPreview,
  onToggleCursorPreview,
  onSimulateStudentCursor,
  isSimulatingStudent,
  zoom = 1,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onOpenWorkflow,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const isShapeTool = ['rect', 'ellipse', 'line', 'arrow'].includes(activeTool);

  return (
    <aside className="absolute left-4 top-4 z-30 flex flex-col gap-2.5 max-w-[calc(100vw-2rem)] select-none pointer-events-auto">
      {/* Primary Floating Tools Deck */}
      <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-slate-200/90 flex flex-wrap items-center gap-1">
        {/* Selection & Pan */}
        <button
          onClick={() => onSelectTool('select')}
          className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs ${
            activeTool === 'select'
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Select & Move Objects (V)"
        >
          <MousePointer2 className="w-4 h-4" />
          <span className="hidden sm:inline">Select</span>
        </button>

        <button
          onClick={() => onSelectTool('pan')}
          className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs ${
            activeTool === 'pan'
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Hand / Pan Canvas (H)"
        >
          <Hand className="w-4 h-4" />
          <span className="hidden sm:inline">Pan</span>
        </button>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Freehand & Drawing */}
        <button
          onClick={() => onSelectTool('pen')}
          className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs ${
            activeTool === 'pen'
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Pen / Freehand (P)"
        >
          <Pen className="w-4 h-4" />
          <span className="hidden sm:inline">Pen</span>
        </button>

        <button
          onClick={() => onSelectTool('highlighter')}
          className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs ${
            activeTool === 'highlighter'
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Highlighter (Semi-transparent)"
        >
          <Highlighter className="w-4 h-4 text-amber-500" />
          <span className="hidden sm:inline">Highlt</span>
        </button>

        <button
          onClick={() => onSelectTool('eraser')}
          className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs ${
            activeTool === 'eraser'
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Eraser (E)"
        >
          <Eraser className="w-4 h-4 text-rose-500" />
          <span className="hidden sm:inline">Eraser</span>
        </button>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Shapes */}
        <button
          onClick={() => onSelectTool('rect')}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'rect'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Rectangle (R)"
        >
          <Square className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectTool('ellipse')}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'ellipse'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Circle / Ellipse (O)"
        >
          <Circle className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectTool('line')}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'line'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Straight Line (L)"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectTool('arrow')}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'arrow'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Arrow (A)"
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Text & Sticky Notes */}
        <button
          onClick={() => onSelectTool('text')}
          className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs ${
            activeTool === 'text'
              ? 'bg-indigo-600 text-white font-semibold shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          title="Text Box (T)"
        >
          <Type className="w-4 h-4" />
          <span className="hidden sm:inline">Text</span>
        </button>

        <button
          onClick={() => onSelectTool('sticky')}
          className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs ${
            activeTool === 'sticky'
              ? 'bg-amber-400 text-amber-950 font-bold shadow-xs'
              : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
          }`}
          title="Sticky Note (S)"
        >
          <StickyNote className="w-4 h-4 fill-amber-300" />
          <span className="font-semibold">Sticky</span>
        </button>

        {onOpenWorkflow && (
          <button
            onClick={onOpenWorkflow}
            className="p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold border border-indigo-200 cursor-pointer shadow-xs"
            title="Workflow Templates & Flowchart Center"
          >
            <Workflow className="w-4 h-4 text-indigo-600" />
            <span className="font-semibold">Workflow</span>
          </button>
        )}

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Media Upload */}
        <button
          onClick={() => imageInputRef.current?.click()}
          className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs"
          title="Upload / Insert Image"
        >
          <ImageIcon className="w-4 h-4 text-emerald-600" />
          <span className="hidden md:inline">Image</span>
        </button>

        <button
          onClick={() => pdfInputRef.current?.click()}
          className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs"
          title="Upload PDF (Renders all pages)"
        >
          <FileText className="w-4 h-4 text-rose-600" />
          <span className="hidden md:inline">PDF</span>
        </button>

        {/* Hidden inputs */}
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

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Undo / Redo */}
        <button
          disabled={!canUndo}
          onClick={onUndo}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          disabled={!canRedo}
          onClick={onRedo}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        {/* Zoom In & Out Controls */}
        {onZoomIn && onZoomOut && (
          <>
            <div className="w-px h-5 bg-slate-200 mx-0.5" />
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                onClick={onZoomOut}
                className="p-1.5 rounded-lg text-slate-700 hover:bg-white transition flex items-center justify-center"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onResetZoom}
                className="px-1.5 py-0.5 text-[11px] font-mono font-bold text-slate-800 hover:bg-white rounded-md transition"
                title="Reset Zoom to 100%"
              >
                {Math.round((zoom || 1) * 100)}%
              </button>
              <button
                onClick={onZoomIn}
                className="p-1.5 rounded-lg text-slate-700 hover:bg-white transition flex items-center justify-center"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

        {/* Cursor & Collaboration Helpers */}
        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        <button
          onClick={onToggleCursorPreview}
          className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
            showCursorPreview
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
          title="Toggle High-Visibility Cursor Reticle"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="text-[10px] hidden lg:inline">Cursor Reticle</span>
        </button>

        {onSimulateStudentCursor && (
          <button
            onClick={onSimulateStudentCursor}
            className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
              isSimulatingStudent
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Simulate live student cursor moving on board to test collaboration"
          >
            {isSimulatingStudent ? '● Student Active' : '+ Test Student Cursor'}
          </button>
        )}
      </div>

      {/* Secondary Floating Style & Color Palette Strip (Always visible!) */}
      <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl shadow-xl border border-slate-200/90 flex flex-wrap items-center gap-3">
        {/* Color Palette (10 Quick Colors Always Visible) */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Color:</span>
          <div className="flex items-center gap-1">
            {QUICK_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => onSelectColor(c.value)}
                style={{ backgroundColor: c.value }}
                className={`w-5 h-5 rounded-md border transition-transform ${
                  currentColor === c.value
                    ? 'scale-125 ring-2 ring-indigo-600 ring-offset-1 border-white shadow-xs'
                    : 'border-slate-300 hover:scale-110'
                }`}
                title={c.name}
              />
            ))}
            {/* Custom native color input */}
            <label
              className="w-5 h-5 rounded-md border border-slate-300 overflow-hidden cursor-pointer relative flex items-center justify-center hover:border-slate-500"
              title="Custom Color"
            >
              <input
                type="color"
                value={currentColor}
                onChange={(e) => onSelectColor(e.target.value)}
                className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
              />
              <span className="text-[9px] font-bold text-slate-500">+</span>
            </label>
          </div>
        </div>

        <div className="w-px h-4 bg-slate-200" />

        {/* Stroke Width Presets */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Size:</span>
          <div className="flex items-center gap-1">
            {STROKE_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => onChangeStrokeWidth(p.value)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-medium transition-all ${
                  strokeWidth === p.value
                    ? 'bg-slate-900 text-white shadow-2xs font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {p.value}px
              </button>
            ))}
          </div>
        </div>

        {/* Fill Toggle for Shapes */}
        {isShapeTool && (
          <>
            <div className="w-px h-4 bg-slate-200" />
            <button
              onClick={onToggleFillShape}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                fillShape
                  ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {fillShape ? '✓ Shape Filled' : 'Outline Only'}
            </button>
          </>
        )}

        {/* Sticky Note Colors when Sticky tool selected */}
        {activeTool === 'sticky' && (
          <>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Note:</span>
              <div className="flex items-center gap-1">
                {STICKY_PRESETS.map((s) => (
                  <button
                    key={s.color}
                    onClick={() => onSelectStickyColor(s.color)}
                    style={{ backgroundColor: s.color }}
                    className={`w-5 h-5 rounded-md border border-slate-300 transition-transform flex items-center justify-center ${
                      stickyColor === s.color
                        ? 'scale-125 ring-2 ring-slate-800'
                        : 'hover:scale-110'
                    }`}
                    title={`${s.name} Sticky Note`}
                  >
                    {stickyColor === s.color && <Check className="w-3 h-3 text-slate-800" />}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
