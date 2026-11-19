// Export: render the cover at a real post size and hand back a PNG.
// The export draws through the same render core as the live preview, at
// full size, on an offscreen canvas — so the PNG is the app, not a copy of
// the preview. Three sizes cover the common posts: square, portrait, wide.

import { renderCover } from './render-core.js';
import { makeBrowserSurface } from './canvas-surface.js';

export const EXPORT_SIZES = [
  { id: 'square', label: 'Square 1080 × 1080', width: 1080, height: 1080 },
  { id: 'portrait', label: 'Portrait 1080 × 1350', width: 1080, height: 1350 },
  { id: 'wide', label: 'Wide 1920 × 1080', width: 1920, height: 1080 },
];

export function getExportSize(id) {
  return EXPORT_SIZES.find((entry) => entry.id === id) || EXPORT_SIZES[0];
}

// Render the current state at the export size and return a PNG blob.
// Waits for the bundled font so the lettering in the file matches the one
// on screen.
export async function exportCoverPng(state, sizeId) {
  const size = getExportSize(sizeId);
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  renderCover(makeBrowserSurface(canvas), state);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('The export did not produce a PNG.'));
    }, 'image/png');
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function exportFilename(state, sizeId) {
  const size = getExportSize(sizeId);
  const slug = (state.caption.text || 'cover')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'cover';
  return `cover-${slug}-${size.width}x${size.height}.png`;
}
