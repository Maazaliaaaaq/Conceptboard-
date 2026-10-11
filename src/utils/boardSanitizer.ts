import { BoardObject } from '../types/board';

/**
 * Defensive sanitizer to ensure board objects are valid and never cause runtime crashes or white pages.
 */
export function sanitizeBoardObject(obj: any): BoardObject | null {
  if (!obj || typeof obj !== 'object') return null;
  if (!obj.id || typeof obj.id !== 'string') return null;
  if (!obj.type || typeof obj.type !== 'string') return null;

  return {
    id: obj.id,
    type: obj.type,
    x: Number.isFinite(obj.x) ? obj.x : 0,
    y: Number.isFinite(obj.y) ? obj.y : 0,
    width: Number.isFinite(obj.width) ? obj.width : undefined,
    height: Number.isFinite(obj.height) ? obj.height : undefined,
    color: typeof obj.color === 'string' ? obj.color : '#0f172a',
    strokeWidth: Number.isFinite(obj.strokeWidth) ? obj.strokeWidth : 3,
    fill: Boolean(obj.fill),
    fillColor: typeof obj.fillColor === 'string' ? obj.fillColor : undefined,
    points: Array.isArray(obj.points)
      ? obj.points.filter((p: any) => p && Number.isFinite(p.x) && Number.isFinite(p.y))
      : undefined,
    text: typeof obj.text === 'string' ? obj.text : '',
    stickyColor: typeof obj.stickyColor === 'string' ? obj.stickyColor : '#fef08a',
    src: typeof obj.src === 'string' ? obj.src : undefined,
    fileName: typeof obj.fileName === 'string' ? obj.fileName : undefined,
    pageNumber: Number.isFinite(obj.pageNumber) ? obj.pageNumber : undefined,
    createdAt: Number.isFinite(obj.createdAt) ? obj.createdAt : Date.now(),
    zIndex: Number.isFinite(obj.zIndex) ? obj.zIndex : Date.now(),
  };
}

export function sanitizeObjectsRecord(input: any): Record<string, BoardObject> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const cleaned: Record<string, BoardObject> = {};
  for (const [id, raw] of Object.entries(input)) {
    const valid = sanitizeBoardObject(raw);
    if (valid) {
      cleaned[id] = valid;
    }
  }
  return cleaned;
}
