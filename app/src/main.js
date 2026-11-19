// Bootstrap: build the initial state, wire the editor to the preview, and
// keep the two in step. The preview canvas is one render of the same core
// the exporter uses, so what you see is what the PNG will be.

import { renderCover } from './render-core.js';
import { makeBrowserSurface, previewSizeFor } from './canvas-surface.js';
import { defaultCaption } from './caption.js';
import { resizeAssignments } from './photos.js';
import { panelsFor } from './layouts.js';
import { buildEditor } from './editor.js';
import { exportCoverPng, downloadBlob, exportFilename, getExportSize } from './exporter.js';

const PREVIEW_MAX_SIDE = 880;

function initialState() {
  return {
    layoutId: 'hero-strip',
    gradeId: 'sunset',
    canvasSize: 'square',
    caption: defaultCaption(),
    tagline: '',
    photos: [],
    assignments: [],
    selectedPanel: 0,
  };
}

function main() {
  const root = document.getElementById('app');
  const preview = document.getElementById('preview');
  const state = initialState();

  function render() {
    const size = getExportSize(state.canvasSize);
    const previewSize = previewSizeFor(size.width, size.height, PREVIEW_MAX_SIDE);
    if (preview.width !== previewSize.width || preview.height !== previewSize.height) {
      preview.width = previewSize.width;
      preview.height = previewSize.height;
    }
    renderCover(makeBrowserSurface(preview), state);
  }

  async function exportNow(sizeId) {
    const status = document.getElementById('status');
    if (state.photos.length === 0) {
      if (status) status.textContent = 'Add a photo first — the cover needs one.';
      return;
    }
    if (status) status.textContent = 'Rendering your PNG…';
    try {
      const blob = await exportCoverPng(state, sizeId);
      downloadBlob(blob, exportFilename(state, sizeId));
      if (status) status.textContent = `Exported ${exportFilename(state, sizeId)}.`;
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  }

  function onStateChange() {
    const panelCount = panelsFor(state.layoutId, 100, 100).length;
    state.assignments = resizeAssignments(state.assignments, panelCount);
    render();
    editor.refreshAll();
  }

  const editor = buildEditor(root, {
    state,
    render,
    onStateChange,
    exportNow,
  });

  render();
  editor.refreshAll();
  editor.setStatus('Add a photo to begin — or try a sample.');
}

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => main()).catch(() => main());
} else {
  main();
}
