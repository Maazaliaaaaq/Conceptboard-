/**
 * PDF rendering utility using PDF.js CDN
 */

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

export interface RenderedPDFPage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

export async function renderPDFToImages(
  file: File,
  maxPages: number = 10,
  onProgress?: (current: number, total: number) => void
): Promise<RenderedPDFPage[]> {
  if (!window.pdfjsLib) {
    // Wait briefly or dynamically load script if not yet ready
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (!window.pdfjsLib) {
      throw new Error('PDF.js library is not loaded. Please check your internet connection.');
    }
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = Math.min(pdf.numPages, maxPages);
  const results: RenderedPDFPage[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) {
      onProgress(pageNum, numPages);
    }
    const page = await pdf.getPage(pageNum);
    
    // Scale for crisp display without exceeding storage limits
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) continue;
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise;

    // Convert to web-friendly JPEG to reduce payload size over long distances
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    results.push({
      pageNumber: pageNum,
      dataUrl,
      width: viewport.width,
      height: viewport.height,
    });
  }

  return results;
}
