import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { BoardObject, Point, ToolType, UserPresence } from '../types/board';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';

export interface CanvasRefHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitToContent: () => void;
}

interface CanvasProps {
  objects: Record<string, BoardObject>;
  activeTool: ToolType;
  currentColor: string;
  strokeWidth: number;
  fillShape: boolean;
  stickyColor: string;
  isReadOnly: boolean;
  onObjectCreated: (obj: BoardObject) => void;
  onObjectUpdated: (obj: BoardObject) => void;
  onObjectDeleted: (id: string) => void;
  onCursorMove: (point: Point) => void;
  onToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  onViewChange?: (pan: Point, zoom: number) => void;
  showCursorReticle?: boolean;
}

export const Canvas = forwardRef<CanvasRefHandle, CanvasProps>(({
  objects,
  activeTool,
  currentColor,
  strokeWidth,
  fillShape,
  stickyColor,
  isReadOnly,
  onObjectCreated,
  onObjectUpdated,
  onObjectDeleted,
  onCursorMove,
  onToast,
  selectedObjectId,
  onSelectObject,
  onViewChange,
  showCursorReticle = true,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan & Zoom state
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 100, y: 100 });
  const [zoom, setZoom] = useState<number>(1);

  // On-screen cursor position
  const [cursorPos, setCursorPos] = useState<Point | null>(null);
  const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);

  // Sync pan and zoom to parent for remote cursor positioning
  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;

  const lastReportedView = useRef<{ x: number; y: number; zoom: number }>({ x: pan.x, y: pan.y, zoom });
  useEffect(() => {
    if (
      lastReportedView.current.x !== pan.x ||
      lastReportedView.current.y !== pan.y ||
      lastReportedView.current.zoom !== zoom
    ) {
      lastReportedView.current = { x: pan.x, y: pan.y, zoom };
      onViewChangeRef.current?.(pan, zoom);
    }
  }, [pan.x, pan.y, zoom]);

  // Helper to get mouse coordinates relative to the canvas bounding rect
  const getCanvasPos = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: clientX, y: clientY };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  // Interaction state
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isDraggingObject, setIsDraggingObject] = useState(false);
  const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null);
  const [objectStartPos, setObjectStartPos] = useState<{ x: number; y: number } | null>(null);

  // Live stroke buffer (drawn only locally until pointer up)
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [shapePreview, setShapePreview] = useState<{ start: Point; current: Point } | null>(null);

  // Editing text / sticky in-place
  const [editingObject, setEditingObject] = useState<{
    id: string;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'text' | 'sticky';
    stickyColor?: string;
  } | null>(null);

  // Convert Screen to World coordinates
  const screenToWorld = useCallback(
    (sx: number, sy: number): Point => {
      return {
        x: sx / zoom - pan.x,
        y: sy / zoom - pan.y,
      };
    },
    [pan, zoom]
  );

  // Convert World to Screen coordinates
  const worldToScreen = useCallback(
    (wx: number, wy: number): Point => {
      return {
        x: (wx + pan.x) * zoom,
        y: (wy + pan.y) * zoom,
      };
    },
    [pan, zoom]
  );

  // Resize canvas to match container resolution and device pixel ratio
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen for spacebar for quick pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !editingObject && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        setIsSpacePressed(true);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObjectId && !editingObject) {
        onObjectDeleted(selectedObjectId);
        onSelectObject(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedObjectId, editingObject, onObjectDeleted, onSelectObject]);

  // Handle clipboard paste (PNG/JPG images)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (editingObject) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (!blob) continue;

          const reader = new FileReader();
          reader.onload = (event) => {
            const src = event.target?.result as string;
            if (!src) return;

            const img = new Image();
            img.onload = () => {
              const canvas = canvasRef.current;
              const rect = canvas ? canvas.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
              const center = screenToWorld(rect.width / 2, rect.height / 2);
              const maxDim = 400;
              let w = img.width;
              let h = img.height;
              if (w > maxDim || h > maxDim) {
                const ratio = Math.min(maxDim / w, maxDim / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
              }

              const newImgObj: BoardObject = {
                id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                type: 'image',
                x: center.x - w / 2,
                y: center.y - h / 2,
                width: w,
                height: h,
                src,
                createdAt: Date.now(),
                zIndex: Date.now(),
              };

              onObjectCreated(newImgObj);
              onSelectObject(newImgObj.id);
              onToast('Image pasted from clipboard!', 'success');
            };
            img.src = src;
          };
          reader.readAsDataURL(blob);
          e.preventDefault();
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [screenToWorld, editingObject, onObjectCreated, onSelectObject, onToast]);

  // Helper to draw grid
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 32 * zoom;
    const startX = (pan.x * zoom) % gridSize;
    const startY = (pan.y * zoom) % gridSize;

    ctx.fillStyle = '#94a3b8';
    const dotRadius = zoom >= 0.7 ? 1.2 : 0.8;

    for (let x = startX; x < width; x += gridSize) {
      for (let y = startY; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  // Helper to draw sticky note
  const drawSticky = (
    ctx: CanvasRenderingContext2D,
    obj: BoardObject,
    isSelected: boolean
  ) => {
    const screen = worldToScreen(obj.x, obj.y);
    const w = (obj.width || 180) * zoom;
    const h = (obj.height || 180) * zoom;
    const bg = obj.stickyColor || '#fef08a';

    ctx.save();
    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 8 * zoom;
    ctx.shadowOffsetY = 4 * zoom;

    // Sticky Body
    ctx.fillStyle = bg;
    ctx.beginPath();
    const radius = 4 * zoom;
    ctx.roundRect(screen.x, screen.y, w, h, radius);
    ctx.fill();

    // Subtle folded corner effect at top right
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    ctx.beginPath();
    ctx.moveTo(screen.x + w - 16 * zoom, screen.y);
    ctx.lineTo(screen.x + w, screen.y + 16 * zoom);
    ctx.lineTo(screen.x + w - 16 * zoom, screen.y + 16 * zoom);
    ctx.closePath();
    ctx.fill();

    // Text rendering inside sticky note
    if (obj.text) {
      ctx.fillStyle = '#1e293b';
      const fontSize = Math.max(10, Math.round(15 * zoom));
      ctx.font = `500 ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
      ctx.textBaseline = 'top';

      const padding = 14 * zoom;
      const maxWidth = w - padding * 2;
      const lineHeight = fontSize * 1.35;
      const words = obj.text.split('\n');

      let currentY = screen.y + padding;

      words.forEach((paragraph) => {
        const tokens = paragraph.split(' ');
        let line = '';
        tokens.forEach((token) => {
          const testLine = line + token + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && line !== '') {
            ctx.fillText(line, screen.x + padding, currentY);
            line = token + ' ';
            currentY += lineHeight;
          } else {
            line = testLine;
          }
        });
        ctx.fillText(line, screen.x + padding, currentY);
        currentY += lineHeight;
      });
    }

    // Selection border
    if (isSelected) {
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2;
      ctx.strokeRect(screen.x - 2, screen.y - 2, w + 4, h + 4);
    }

    ctx.restore();
  };

  // Helper to draw text box
  const drawText = (
    ctx: CanvasRenderingContext2D,
    obj: BoardObject,
    isSelected: boolean
  ) => {
    const screen = worldToScreen(obj.x, obj.y);
    const fontSize = Math.max(10, Math.round((obj.strokeWidth || 18) * 1.2 * zoom));

    ctx.save();
    ctx.fillStyle = obj.color || '#0f172a';
    ctx.font = `600 ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
    ctx.textBaseline = 'top';

    const lines = (obj.text || 'Text').split('\n');
    const lineHeight = fontSize * 1.3;

    lines.forEach((line, i) => {
      ctx.fillText(line, screen.x, screen.y + i * lineHeight);
    });

    if (isSelected) {
      const metrics = ctx.measureText(lines[0] || ' ');
      const w = Math.max(metrics.width, (obj.width || 80) * zoom);
      const h = lines.length * lineHeight;
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(screen.x - 4, screen.y - 4, w + 8, h + 8);
    }
    ctx.restore();
  };

  // Helper to draw image / rendered PDF page
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  const drawImageObject = (
    ctx: CanvasRenderingContext2D,
    obj: BoardObject,
    isSelected: boolean
  ) => {
    if (!obj.src) return;
    const screen = worldToScreen(obj.x, obj.y);
    const w = (obj.width || 200) * zoom;
    const h = (obj.height || 200) * zoom;

    let img = imageCache.current.get(obj.src);
    if (!img) {
      img = new Image();
      img.src = obj.src;
      img.onload = () => {
        // Redraw when loaded
        requestAnimationFrame(() => render());
      };
      imageCache.current.set(obj.src, img);
    }

    ctx.save();
    if (img.complete && img.naturalWidth > 0) {
      // Subtle photo shadow
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 6 * zoom;
      ctx.drawImage(img, screen.x, screen.y, w, h);
    } else {
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(screen.x, screen.y, w, h);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(screen.x, screen.y, w, h);
    }

    if (isSelected) {
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2;
      ctx.strokeRect(screen.x - 2, screen.y - 2, w + 4, h + 4);

      // Draw corner handles
      const handleSize = 6;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#4f46e5';
      const corners = [
        { x: screen.x, y: screen.y },
        { x: screen.x + w, y: screen.y },
        { x: screen.x, y: screen.y + h },
        { x: screen.x + w, y: screen.y + h },
      ];
      corners.forEach((c) => {
        ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
      });
    }
    ctx.restore();
  };

  // Main canvas render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Clear background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Subtle grid
    drawGrid(ctx, width, height);

    // Sort objects by zIndex / createdAt
    const sortedObjects = Object.values(objects).sort(
      (a, b) => (a.zIndex || a.createdAt) - (b.zIndex || b.createdAt)
    );

    // Render committed objects
    sortedObjects.forEach((obj) => {
      const isSelected = obj.id === selectedObjectId;

      if (obj.type === 'sticky') {
        drawSticky(ctx, obj, isSelected);
      } else if (obj.type === 'text') {
        drawText(ctx, obj, isSelected);
      } else if (obj.type === 'image') {
        drawImageObject(ctx, obj, isSelected);
      } else if (obj.type === 'pen' || obj.type === 'highlighter') {
        if (!obj.points || obj.points.length < 2) return;
        ctx.save();
        ctx.beginPath();
        const first = worldToScreen(obj.points[0].x, obj.points[0].y);
        ctx.moveTo(first.x, first.y);

        for (let i = 1; i < obj.points.length; i++) {
          const pt = worldToScreen(obj.points[i].x, obj.points[i].y);
          ctx.lineTo(pt.x, pt.y);
        }

        ctx.strokeStyle = obj.color || '#000';
        ctx.lineWidth = Math.max(1, (obj.strokeWidth || 3) * zoom);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (obj.type === 'highlighter') {
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = Math.max(4, (obj.strokeWidth || 8) * 2.5 * zoom);
        }

        ctx.stroke();

        if (isSelected) {
          ctx.strokeStyle = '#4f46e5';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
        }
        ctx.restore();
      } else if (obj.type === 'rect') {
        const screen = worldToScreen(obj.x, obj.y);
        const w = (obj.width || 100) * zoom;
        const h = (obj.height || 100) * zoom;

        ctx.save();
        ctx.strokeStyle = obj.color || '#000';
        ctx.lineWidth = Math.max(1, (obj.strokeWidth || 2) * zoom);
        if (obj.fill) {
          ctx.fillStyle = obj.fillColor || `${obj.color}22`;
          ctx.fillRect(screen.x, screen.y, w, h);
        }
        ctx.strokeRect(screen.x, screen.y, w, h);

        if (isSelected) {
          ctx.strokeStyle = '#4f46e5';
          ctx.lineWidth = 2;
          ctx.strokeRect(screen.x - 2, screen.y - 2, w + 4, h + 4);
        }
        ctx.restore();
      } else if (obj.type === 'ellipse') {
        const screen = worldToScreen(obj.x, obj.y);
        const w = (obj.width || 100) * zoom;
        const h = (obj.height || 100) * zoom;
        const cx = screen.x + w / 2;
        const cy = screen.y + h / 2;
        const rx = Math.abs(w / 2);
        const ry = Math.abs(h / 2);

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = obj.color || '#000';
        ctx.lineWidth = Math.max(1, (obj.strokeWidth || 2) * zoom);

        if (obj.fill) {
          ctx.fillStyle = obj.fillColor || `${obj.color}22`;
          ctx.fill();
        }
        ctx.stroke();

        if (isSelected) {
          ctx.strokeStyle = '#4f46e5';
          ctx.lineWidth = 2;
          ctx.strokeRect(screen.x - 2, screen.y - 2, w + 4, h + 4);
        }
        ctx.restore();
      } else if (obj.type === 'line' || obj.type === 'arrow') {
        const screenStart = worldToScreen(obj.x, obj.y);
        const screenEnd = worldToScreen(obj.x + (obj.width || 100), obj.y + (obj.height || 100));

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(screenStart.x, screenStart.y);
        ctx.lineTo(screenEnd.x, screenEnd.y);
        ctx.strokeStyle = obj.color || '#000';
        ctx.lineWidth = Math.max(1, (obj.strokeWidth || 2) * zoom);
        ctx.stroke();

        if (obj.type === 'arrow') {
          const angle = Math.atan2(screenEnd.y - screenStart.y, screenEnd.x - screenStart.x);
          const arrowLen = 12 * zoom;
          ctx.beginPath();
          ctx.moveTo(screenEnd.x, screenEnd.y);
          ctx.lineTo(
            screenEnd.x - arrowLen * Math.cos(angle - Math.PI / 6),
            screenEnd.y - arrowLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(screenEnd.x, screenEnd.y);
          ctx.lineTo(
            screenEnd.x - arrowLen * Math.cos(angle + Math.PI / 6),
            screenEnd.y - arrowLen * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }

        if (isSelected) {
          ctx.strokeStyle = '#4f46e5';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
        }
        ctx.restore();
      }
    });

    // Render LIVE local stroke (Lag-free latency optimization)
    if (currentStroke.length >= 2) {
      ctx.save();
      ctx.beginPath();
      const first = worldToScreen(currentStroke[0].x, currentStroke[0].y);
      ctx.moveTo(first.x, first.y);

      for (let i = 1; i < currentStroke.length; i++) {
        const pt = worldToScreen(currentStroke[i].x, currentStroke[i].y);
        ctx.lineTo(pt.x, pt.y);
      }

      ctx.strokeStyle = currentColor;
      ctx.lineWidth = Math.max(1, strokeWidth * zoom);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (activeTool === 'highlighter') {
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = Math.max(4, strokeWidth * 2.5 * zoom);
      }

      ctx.stroke();
      ctx.restore();
    }

    // Render LIVE shape preview
    if (shapePreview) {
      const sStart = worldToScreen(shapePreview.start.x, shapePreview.start.y);
      const sCur = worldToScreen(shapePreview.current.x, shapePreview.current.y);
      const w = sCur.x - sStart.x;
      const h = sCur.y - sStart.y;

      ctx.save();
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = Math.max(1, strokeWidth * zoom);

      if (activeTool === 'rect') {
        if (fillShape) {
          ctx.fillStyle = `${currentColor}22`;
          ctx.fillRect(sStart.x, sStart.y, w, h);
        }
        ctx.strokeRect(sStart.x, sStart.y, w, h);
      } else if (activeTool === 'ellipse') {
        const cx = sStart.x + w / 2;
        const cy = sStart.y + h / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
        if (fillShape) {
          ctx.fillStyle = `${currentColor}22`;
          ctx.fill();
        }
        ctx.stroke();
      } else if (activeTool === 'line' || activeTool === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(sStart.x, sStart.y);
        ctx.lineTo(sCur.x, sCur.y);
        ctx.stroke();
        if (activeTool === 'arrow') {
          const angle = Math.atan2(sCur.y - sStart.y, sCur.x - sStart.x);
          const arrowLen = 12 * zoom;
          ctx.beginPath();
          ctx.moveTo(sCur.x, sCur.y);
          ctx.lineTo(
            sCur.x - arrowLen * Math.cos(angle - Math.PI / 6),
            sCur.y - arrowLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(sCur.x, sCur.y);
          ctx.lineTo(
            sCur.x - arrowLen * Math.cos(angle + Math.PI / 6),
            sCur.y - arrowLen * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    ctx.restore();
  }, [
    objects,
    selectedObjectId,
    pan,
    zoom,
    currentStroke,
    shapePreview,
    currentColor,
    strokeWidth,
    fillShape,
    activeTool,
    worldToScreen,
  ]);

  // Request animation frame on state change
  useEffect(() => {
    let animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [render]);

  // Hit-testing helper
  const findObjectAt = (worldPt: Point): BoardObject | null => {
    const list = Object.values(objects).sort(
      (a, b) => (b.zIndex || b.createdAt) - (a.zIndex || a.createdAt)
    );

    for (const obj of list) {
      if (obj.type === 'sticky') {
        const w = obj.width || 180;
        const h = obj.height || 180;
        if (
          worldPt.x >= obj.x &&
          worldPt.x <= obj.x + w &&
          worldPt.y >= obj.y &&
          worldPt.y <= obj.y + h
        ) {
          return obj;
        }
      } else if (obj.type === 'text') {
        const w = obj.width || 140;
        const h = obj.height || 40;
        if (
          worldPt.x >= obj.x &&
          worldPt.x <= obj.x + w &&
          worldPt.y >= obj.y &&
          worldPt.y <= obj.y + h
        ) {
          return obj;
        }
      } else if (obj.type === 'image') {
        const w = obj.width || 200;
        const h = obj.height || 200;
        if (
          worldPt.x >= obj.x &&
          worldPt.x <= obj.x + w &&
          worldPt.y >= obj.y &&
          worldPt.y <= obj.y + h
        ) {
          return obj;
        }
      } else if (obj.type === 'rect') {
        const minX = Math.min(obj.x, obj.x + (obj.width || 0));
        const maxX = Math.max(obj.x, obj.x + (obj.width || 0));
        const minY = Math.min(obj.y, obj.y + (obj.height || 0));
        const maxY = Math.max(obj.y, obj.y + (obj.height || 0));
        if (
          worldPt.x >= minX - 10 &&
          worldPt.x <= maxX + 10 &&
          worldPt.y >= minY - 10 &&
          worldPt.y <= maxY + 10
        ) {
          return obj;
        }
      } else if (obj.type === 'ellipse') {
        const minX = Math.min(obj.x, obj.x + (obj.width || 0));
        const maxX = Math.max(obj.x, obj.x + (obj.width || 0));
        const minY = Math.min(obj.y, obj.y + (obj.height || 0));
        const maxY = Math.max(obj.y, obj.y + (obj.height || 0));
        if (
          worldPt.x >= minX - 10 &&
          worldPt.x <= maxX + 10 &&
          worldPt.y >= minY - 10 &&
          worldPt.y <= maxY + 10
        ) {
          return obj;
        }
      } else if (obj.type === 'pen' || obj.type === 'highlighter') {
        if (obj.points) {
          for (const p of obj.points) {
            const dist = Math.hypot(p.x - worldPt.x, p.y - worldPt.y);
            if (dist < 15) return obj;
          }
        }
      } else if (obj.type === 'line' || obj.type === 'arrow') {
        const endX = obj.x + (obj.width || 0);
        const endY = obj.y + (obj.height || 0);
        // Distance from point to segment
        const dist = distToSegment(worldPt, { x: obj.x, y: obj.y }, { x: endX, y: endY });
        if (dist < 12) return obj;
      }
    }
    return null;
  };

  const distToSegment = (p: Point, v: Point, w: Point) => {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  };

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const pos = getCanvasPos(e.clientX, e.clientY);
    const worldPt = screenToWorld(pos.x, pos.y);
    setIsPointerDown(true);
    setDragStartPoint({ x: pos.x, y: pos.y });

    // Handle Pan tool or Spacebar
    if (activeTool === 'pan' || isSpacePressed || e.button === 1) {
      return;
    }

    // Check read-only mode for student
    if (isReadOnly && activeTool !== 'select') {
      onToast('View-only mode: The teacher has temporarily paused student drawing.', 'info');
      return;
    }

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      setCurrentStroke([worldPt]);
      return;
    }

    if (activeTool === 'eraser') {
      const hit = findObjectAt(worldPt);
      if (hit) {
        onObjectDeleted(hit.id);
        if (selectedObjectId === hit.id) onSelectObject(null);
      }
      return;
    }

    if (['rect', 'ellipse', 'line', 'arrow'].includes(activeTool)) {
      setShapePreview({ start: worldPt, current: worldPt });
      return;
    }

    if (activeTool === 'sticky') {
      const newSticky: BoardObject = {
        id: `sticky_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'sticky',
        x: worldPt.x - 90,
        y: worldPt.y - 90,
        width: 180,
        height: 180,
        text: 'New note\n(double click to edit)',
        stickyColor: stickyColor || '#fef08a',
        createdAt: Date.now(),
        zIndex: Date.now(),
      };
      onObjectCreated(newSticky);
      onSelectObject(newSticky.id);
      return;
    }

    if (activeTool === 'text') {
      const newText: BoardObject = {
        id: `text_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'text',
        x: worldPt.x,
        y: worldPt.y,
        width: 140,
        height: 36,
        text: 'Type here...',
        color: currentColor,
        strokeWidth: strokeWidth,
        createdAt: Date.now(),
        zIndex: Date.now(),
      };
      onObjectCreated(newText);
      onSelectObject(newText.id);
      // open editor directly
      setEditingObject({
        id: newText.id,
        text: newText.text || '',
        x: newText.x,
        y: newText.y,
        width: 180,
        height: 48,
        type: 'text',
      });
      return;
    }

    if (activeTool === 'select') {
      const hit = findObjectAt(worldPt);
      if (hit) {
        onSelectObject(hit.id);
        setIsDraggingObject(true);
        setObjectStartPos({ x: hit.x, y: hit.y });
      } else {
        onSelectObject(null);
      }
    }
  };

  // Pointer Move (with throttled presence broadcast)
  const lastCursorEmit = useRef<number>(0);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e.clientX, e.clientY);
    setCursorPos({ x: pos.x, y: pos.y });
    setIsHoveringCanvas(true);
    const worldPt = screenToWorld(pos.x, pos.y);

    // Broadcast cursor position every ~40ms to optimize bandwidth
    const now = Date.now();
    if (now - lastCursorEmit.current > 40) {
      lastCursorEmit.current = now;
      onCursorMove(worldPt);
    }

    if (!isPointerDown) return;

    // Pan canvas
    if (activeTool === 'pan' || isSpacePressed || e.buttons === 4) {
      if (dragStartPoint) {
        const dx = (pos.x - dragStartPoint.x) / zoom;
        const dy = (pos.y - dragStartPoint.y) / zoom;
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        setDragStartPoint({ x: pos.x, y: pos.y });
      }
      return;
    }

    // Pen / Highlighter stroke (local buffer only until lifted)
    if (activeTool === 'pen' || activeTool === 'highlighter') {
      setCurrentStroke((prev) => [...prev, worldPt]);
      return;
    }

    // Eraser drag
    if (activeTool === 'eraser') {
      const hit = findObjectAt(worldPt);
      if (hit) {
        onObjectDeleted(hit.id);
        if (selectedObjectId === hit.id) onSelectObject(null);
      }
      return;
    }

    // Shape preview
    if (shapePreview) {
      setShapePreview((prev) => (prev ? { ...prev, current: worldPt } : null));
      return;
    }

    // Move selected object
    if (isDraggingObject && selectedObjectId && dragStartPoint && objectStartPos) {
      const dx = (pos.x - dragStartPoint.x) / zoom;
      const dy = (pos.y - dragStartPoint.y) / zoom;
      const targetObj = objects[selectedObjectId];
      if (targetObj) {
        const updated: BoardObject = {
          ...targetObj,
          x: objectStartPos.x + dx,
          y: objectStartPos.y + dy,
        };
        // Update local object immediately
        onObjectUpdated(updated);
      }
    }
  };

  // Pointer Up (Latency optimization: commits final object to Firebase)
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsPointerDown(false);
    setIsDraggingObject(false);

    // Commit Pen / Highlighter Stroke
    if (
      (activeTool === 'pen' || activeTool === 'highlighter') &&
      currentStroke.length >= 2
    ) {
      const newStrokeObj: BoardObject = {
        id: `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: activeTool,
        x: currentStroke[0].x,
        y: currentStroke[0].y,
        points: currentStroke,
        color: currentColor,
        strokeWidth: strokeWidth,
        createdAt: Date.now(),
        zIndex: Date.now(),
      };
      onObjectCreated(newStrokeObj);
      setCurrentStroke([]);
      return;
    }
    setCurrentStroke([]);

    // Commit Shape
    if (shapePreview) {
      const start = shapePreview.start;
      const end = shapePreview.current;
      const w = end.x - start.x;
      const h = end.y - start.y;

      if (Math.hypot(w, h) > 4) {
        const newShapeObj: BoardObject = {
          id: `shape_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: activeTool,
          x: start.x,
          y: start.y,
          width: w,
          height: h,
          color: currentColor,
          strokeWidth: strokeWidth,
          fill: fillShape,
          ...(fillShape ? { fillColor: `${currentColor}22` } : {}),
          createdAt: Date.now(),
          zIndex: Date.now(),
        };
        onObjectCreated(newShapeObj);
        onSelectObject(newShapeObj.id);
      }
      setShapePreview(null);
    }
  };

  // Double click to edit sticky note or text box
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e.clientX, e.clientY);
    const worldPt = screenToWorld(pos.x, pos.y);
    const hit = findObjectAt(worldPt);

    if (hit && (hit.type === 'sticky' || hit.type === 'text')) {
      setEditingObject({
        id: hit.id,
        text: hit.text || '',
        x: hit.x,
        y: hit.y,
        width: hit.width || 180,
        height: hit.height || 180,
        type: hit.type,
        stickyColor: hit.stickyColor,
      });
    }
  };

  // Zoom with mouse wheel or pinch
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.15), 4.0);

    // Zoom centered around mouse pointer relative to canvas
    const pos = getCanvasPos(e.clientX, e.clientY);
    const mouseX = pos.x;
    const mouseY = pos.y;

    const wx = mouseX / zoom - pan.x;
    const wy = mouseY / zoom - pan.y;

    const newPanX = mouseX / newZoom - wx;
    const newPanY = mouseY / newZoom - wy;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Zoom centered around current viewport center
  const zoomAtCenter = useCallback((factor: number) => {
    const container = containerRef.current;
    const width = container ? container.clientWidth : window.innerWidth;
    const height = container ? container.clientHeight : window.innerHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    setZoom((prevZoom) => {
      const newZoom = Math.min(Math.max(prevZoom * factor, 0.15), 4.0);
      setPan((prevPan) => {
        const wx = centerX / prevZoom - prevPan.x;
        const wy = centerY / prevZoom - prevPan.y;
        return {
          x: centerX / newZoom - wx,
          y: centerY / newZoom - wy,
        };
      });
      return newZoom;
    });
  }, []);

  const handleZoomIn = useCallback(() => zoomAtCenter(1.2), [zoomAtCenter]);
  const handleZoomOut = useCallback(() => zoomAtCenter(1 / 1.2), [zoomAtCenter]);

  // Reset zoom & pan
  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 100, y: 100 });
  }, []);

  // Fit view to all objects
  const handleFitToContent = useCallback(() => {
    const list = Object.values(objects);
    if (list.length === 0) {
      handleResetZoom();
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    list.forEach((obj) => {
      minX = Math.min(minX, obj.x);
      minY = Math.min(minY, obj.y);
      maxX = Math.max(maxX, obj.x + (obj.width || 100));
      maxY = Math.max(maxY, obj.y + (obj.height || 100));
    });

    const contentW = maxX - minX + 200;
    const contentH = maxY - minY + 200;

    const scaleX = window.innerWidth / contentW;
    const scaleY = window.innerHeight / contentH;
    const fitZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.2), 1.5);

    setZoom(fitZoom);
    setPan({
      x: window.innerWidth / 2 / fitZoom - (minX + maxX) / 2,
      y: window.innerHeight / 2 / fitZoom - (minY + maxY) / 2,
    });
  }, [objects, handleResetZoom]);

  // Expose imperative handle for parent controls (TopBar / CreativeToolbar)
  useImperativeHandle(
    ref,
    () => ({
      zoomIn: handleZoomIn,
      zoomOut: handleZoomOut,
      resetZoom: handleResetZoom,
      fitToContent: handleFitToContent,
    }),
    [handleZoomIn, handleZoomOut, handleResetZoom, handleFitToContent]
  );

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingObject) return;
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        handleZoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingObject, handleZoomIn, handleZoomOut, handleResetZoom]);

  // Save in-line edited text
  const handleSaveEditing = () => {
    if (!editingObject) return;
    const target = objects[editingObject.id];
    if (target) {
      const updated: BoardObject = {
        ...target,
        text: editingObject.text,
      };
      onObjectUpdated(updated);
    }
    setEditingObject(null);
  };

  // Cursor style based on active tool
  let cursorClass = 'cursor-default';
  if (isSpacePressed || activeTool === 'pan') {
    cursorClass = isPointerDown ? 'cursor-grabbing' : 'cursor-grab';
  } else if (activeTool === 'pen' || activeTool === 'highlighter') {
    cursorClass = 'cursor-crosshair';
  } else if (activeTool === 'eraser') {
    cursorClass = 'cursor-cell';
  } else if (['rect', 'ellipse', 'line', 'arrow'].includes(activeTool)) {
    cursorClass = 'cursor-crosshair';
  } else if (activeTool === 'text') {
    cursorClass = 'cursor-text';
  } else if (activeTool === 'sticky') {
    cursorClass = 'cursor-copy';
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[calc(100vh-3.5rem)] overflow-hidden select-none ${cursorClass}`}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerEnter={() => setIsHoveringCanvas(true)}
        onPointerLeave={() => {
          setIsHoveringCanvas(false);
          setCursorPos(null);
        }}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        className="block touch-none"
      />

      {/* High-Visibility Live On-Screen Cursor Reticle */}
      {showCursorReticle && isHoveringCanvas && cursorPos && (
        <div
          className="pointer-events-none absolute z-30 transition-transform duration-0 will-change-transform"
          style={{
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {activeTool === 'pen' && (
            <div className="relative flex items-center justify-center">
              {/* Dynamic stroke size ring */}
              <div
                className="rounded-full border-2 shadow-sm"
                style={{
                  width: `${Math.max(12, strokeWidth * zoom)}px`,
                  height: `${Math.max(12, strokeWidth * zoom)}px`,
                  borderColor: currentColor === '#ffffff' ? '#000000' : currentColor,
                  backgroundColor: `${currentColor}30`,
                }}
              />
              {/* Precision center dot */}
              <div
                className="absolute w-1.5 h-1.5 rounded-full ring-1 ring-white"
                style={{ backgroundColor: currentColor === '#ffffff' ? '#000000' : currentColor }}
              />
              <span
                className="absolute left-full ml-2.5 top-0 text-[10px] font-bold px-1.5 py-0.5 rounded shadow text-white whitespace-nowrap"
                style={{ backgroundColor: currentColor === '#ffffff' ? '#0f172a' : currentColor }}
              >
                Pen · {strokeWidth}px
              </span>
            </div>
          )}

          {activeTool === 'highlighter' && (
            <div className="relative flex items-center justify-center">
              <div
                className="rounded-md border-2 border-amber-500 shadow-md"
                style={{
                  width: `${Math.max(26, strokeWidth * 2.5 * zoom)}px`,
                  height: `${Math.max(16, strokeWidth * 1.8 * zoom)}px`,
                  backgroundColor: `${currentColor}40`,
                }}
              />
              <span className="absolute left-full ml-2.5 top-0 text-[10px] font-bold px-1.5 py-0.5 rounded shadow bg-amber-500 text-white whitespace-nowrap">
                Highlighter
              </span>
            </div>
          )}

          {activeTool === 'eraser' && (
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 rounded-lg border-2 border-rose-500 bg-rose-500/25 shadow-lg flex items-center justify-center">
                <span className="text-xs font-bold text-rose-600">✕</span>
              </div>
              <span className="absolute left-full ml-2.5 top-0 text-[10px] font-bold px-1.5 py-0.5 rounded shadow bg-rose-600 text-white whitespace-nowrap">
                Eraser
              </span>
            </div>
          )}

          {['rect', 'ellipse', 'line', 'arrow'].includes(activeTool) && (
            <div className="relative flex items-center justify-center">
              <div className="w-6 h-6 flex items-center justify-center">
                <svg className="w-6 h-6 drop-shadow-md text-slate-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="2" x2="12" y2="22" strokeDasharray="3 3" />
                  <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="3 3" />
                  <circle cx="12" cy="12" r="3" fill={currentColor} />
                </svg>
              </div>
              <span className="absolute left-full ml-2.5 top-0 text-[10px] font-bold px-1.5 py-0.5 rounded shadow bg-slate-900 text-white whitespace-nowrap uppercase">
                {activeTool}
              </span>
            </div>
          )}

          {activeTool === 'sticky' && (
            <div className="relative flex items-center justify-center">
              <div
                className="w-8 h-8 rounded-md border border-slate-400 shadow-xl flex items-center justify-center text-xs font-bold text-slate-800"
                style={{ backgroundColor: stickyColor || '#fef08a' }}
              >
                🗒️
              </div>
              <span className="absolute left-full ml-2.5 top-0 text-[10px] font-bold px-1.5 py-0.5 rounded shadow bg-amber-600 text-white whitespace-nowrap">
                Click to place note
              </span>
            </div>
          )}

          {activeTool === 'text' && (
            <div className="relative flex items-center justify-center">
              <div className="w-5 h-6 border-l-2 border-r-2 border-indigo-600 flex items-center justify-center text-xs font-bold text-indigo-700">
                T
              </div>
              <span className="absolute left-full ml-2.5 top-0 text-[10px] font-bold px-1.5 py-0.5 rounded shadow bg-indigo-600 text-white whitespace-nowrap">
                Click to write text
              </span>
            </div>
          )}

          {activeTool === 'select' && (
            <div className="relative flex items-center justify-center">
              <svg className="w-5 h-5 -rotate-45 drop-shadow-md text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3l7 18 3-7 7-3L3 3z" />
              </svg>
              <span className="absolute left-full ml-2 top-0 text-[10px] font-bold px-1.5 py-0.5 rounded shadow bg-indigo-600 text-white whitespace-nowrap">
                Select
              </span>
            </div>
          )}

          {activeTool === 'pan' && (
            <div className="relative flex items-center justify-center">
              <span className="text-xl drop-shadow-md">✋</span>
              <span className="absolute left-full ml-2 top-0 text-[10px] font-bold px-1.5 py-0.5 rounded shadow bg-slate-800 text-white whitespace-nowrap">
                Pan Hand
              </span>
            </div>
          )}
        </div>
      )}

      {/* Floating In-Place Text Editor Overlay */}
      {editingObject && (
        <div
          className="absolute z-40 bg-white border border-slate-300 rounded-lg shadow-2xl p-2.5 animate-in fade-in"
          style={{
            left: `${worldToScreen(editingObject.x, editingObject.y).x}px`,
            top: `${worldToScreen(editingObject.x, editingObject.y).y}px`,
            width: `${Math.max(220, editingObject.width * zoom)}px`,
            minHeight: '120px',
            backgroundColor: editingObject.stickyColor || '#ffffff',
          }}
        >
          <textarea
            autoFocus
            value={editingObject.text}
            onChange={(e) =>
              setEditingObject({ ...editingObject, text: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleSaveEditing();
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveEditing();
            }}
            placeholder="Type your notes..."
            className="w-full h-24 bg-transparent resize-none focus:outline-none text-xs font-medium text-slate-800 leading-relaxed"
          />
          <div className="flex justify-end gap-1.5 mt-2 pt-1 border-t border-black/10">
            <button
              onClick={() => setEditingObject(null)}
              className="px-2 py-0.5 text-[11px] text-slate-600 hover:bg-black/5 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEditing}
              className="px-2.5 py-0.5 text-[11px] font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
            >
              Done (Ctrl+Enter)
            </button>
          </div>
        </div>
      )}

      {/* Floating Zoom & Canvas Controls (Bottom Right) */}
      <div className="absolute bottom-5 right-5 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-md text-xs select-none">
        <button
          onClick={handleZoomOut}
          className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleResetZoom}
          className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          title="Reset Zoom to 100%"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={handleZoomIn}
          className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-3.5 bg-slate-200 mx-1" />

        <button
          onClick={handleFitToContent}
          className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Fit All Content on Screen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleResetZoom}
          className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Read-Only Banner if student viewing */}
      {isReadOnly && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-500/90 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg backdrop-blur-xs flex items-center gap-2">
          <span>🔒 Viewing Mode: Teacher has paused student editing.</span>
        </div>
      )}
    </div>
  );
});

Canvas.displayName = 'Canvas';
