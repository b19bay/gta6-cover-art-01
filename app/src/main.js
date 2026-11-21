// main.js — the browser editor of Cover Heist.
// DOM controls on the left, a live canvas preview on the right. Photos are
// read with FileReader and never leave the machine. All drawing goes
// through the shared render core (render-cover.js), and the ?shot= scenes
// at the bottom reuse the editor scenes so the app can draw its own
// screenshots. No network request is ever made.

import { LAYOUTS, layoutById, panelBounds } from './layouts.js';
import { GRADES } from './pixel-grades.js';
import { POST_SIZES, renderCover, sizeById } from './render-cover.js';
import { drawEditorScene, drawSizesScene } from './render-editor.js';

const state = {
  layoutId: 'hero-strip',
  gradeId: 'sunset',
  sizeId: 'square',
  caption: { text: 'Neon Shore', kicker: 'Vice City Nights', size: 1, placement: 'bottom', outline: true },
  photos: [],              // decoded images, in load order
  assign: [0, 1, 0, 1],    // panel slot -> index into photos
  views: {},               // panel slot -> { zoom, offsetX, offsetY }
  selectedPanel: 0,
};

const els = {
  canvas: document.getElementById('preview'),
  file: document.getElementById('photo-file'),
  caption: document.getElementById('caption-text'),
  kicker: document.getElementById('caption-kicker'),
  size: document.getElementById('caption-size'),
  placement: document.getElementById('caption-placement'),
  layouts: document.getElementById('layout-picker'),
  grades: document.getElementById('grade-picker'),
  sizes: document.getElementById('size-picker'),
  exportBtn: document.getElementById('export-png'),
  status: document.getElementById('status'),
  panelNote: document.getElementById('panel-note'),
};

function renderState() {
  const photos = {};
  layoutById(state.layoutId).panels.forEach((panel) => {
    const img = state.photos[state.assign[panel.slot] ?? 0];
    if (img) photos[panel.slot] = img;
  });
  return {
    layoutId: state.layoutId,
    gradeId: state.gradeId,
    caption: state.caption,
    photos,
    views: state.views,
    sizeId: state.sizeId,
    previewW: sizeById(state.sizeId).w,
    previewH: sizeById(state.sizeId).h,
  };
}

function drawPreview() {
  const size = sizeById(state.sizeId);
  const maxW = 760;
  const scale = Math.min(1, maxW / size.w);
  els.canvas.width = Math.round(size.w * scale);
  els.canvas.height = Math.round(size.h * scale);
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  renderCover(off.getContext('2d'), renderState(), size.w, size.h);
  const ctx = els.canvas.getContext('2d');
  ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
  ctx.drawImage(off, 0, 0, els.canvas.width, els.canvas.height);
}

function markSelected(container, id) {
  container.querySelectorAll('button').forEach((b) => {
    b.classList.toggle('selected', b.dataset.value === id);
  });
}

function buildPickers() {
  for (const layout of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.value = layout.id;
    b.textContent = layout.name;
    b.title = layout.blurb;
    b.addEventListener('click', () => {
      state.layoutId = layout.id;
      markSelected(els.layouts, layout.id);
      drawPreview();
    });
    els.layouts.appendChild(b);
  }
  for (const grade of GRADES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.value = grade.id;
    b.textContent = grade.name;
    b.title = grade.blurb;
    b.addEventListener('click', () => {
      state.gradeId = grade.id;
      markSelected(els.grades, grade.id);
      drawPreview();
    });
    els.grades.appendChild(b);
  }
  for (const size of POST_SIZES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.value = size.id;
    b.textContent = `${size.w} x ${size.h}`;
    b.addEventListener('click', () => {
      state.sizeId = size.id;
      markSelected(els.sizes, size.id);
      drawPreview();
    });
    els.sizes.appendChild(b);
  }
  markSelected(els.layouts, state.layoutId);
  markSelected(els.grades, state.gradeId);
  markSelected(els.sizes, state.sizeId);
}

function loadPhotoFile(file) {
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    const img = new Image();
    img.addEventListener('load', () => {
      state.photos.push(img);
      const idx = state.photos.length - 1;
      // A fresh photo fills the selected panel first, then empty slots.
      state.assign[state.selectedPanel] = idx;
      els.status.textContent = `Photo ${state.photos.length} loaded locally. Click a panel, drag to crop, scroll to zoom.`;
      drawPreview();
    });
    img.src = String(reader.result);
  });
  reader.readAsDataURL(file);
}

function panelAt(x, y, W, H) {
  const layout = layoutById(state.layoutId);
  for (const panel of layout.panels) {
    if (panel.poly) {
      // Point-in-polygon for the diagonal layout.
      let inside = false;
      const pts = panel.poly.map(([px, py]) => [px * W, py * H]);
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) return panel.slot;
    } else {
      const b = panelBounds(panel, W, H);
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return panel.slot;
    }
  }
  return 0;
}

function wireCanvas() {
  let drag = null;
  els.canvas.addEventListener('pointerdown', (ev) => {
    const rect = els.canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (els.canvas.width / rect.width);
    const y = (ev.clientY - rect.top) * (els.canvas.height / rect.height);
    state.selectedPanel = panelAt(x, y, els.canvas.width, els.canvas.height);
    drag = { x: ev.clientX, y: ev.clientY };
    els.canvas.setPointerCapture(ev.pointerId);
    els.panelNote.textContent = `Panel ${state.selectedPanel + 1} selected. Drag to reposition its photo, scroll to zoom, or load a photo to fill it.`;
  });
  els.canvas.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const view = (state.views[state.selectedPanel] ||= { zoom: 1, offsetX: 0, offsetY: 0 });
    view.offsetX = Math.min(1, Math.max(-1, view.offsetX - (ev.clientX - drag.x) / 160));
    view.offsetY = Math.min(1, Math.max(-1, view.offsetY - (ev.clientY - drag.y) / 160));
    drag = { x: ev.clientX, y: ev.clientY };
    drawPreview();
  });
  els.canvas.addEventListener('pointerup', () => { drag = null; });
  els.canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const view = (state.views[state.selectedPanel] ||= { zoom: 1, offsetX: 0, offsetY: 0 });
    view.zoom = Math.min(3, Math.max(1, view.zoom * (ev.deltaY < 0 ? 1.08 : 0.93)));
    drawPreview();
  }, { passive: false });
}

function wireControls() {
  els.file.addEventListener('change', () => {
    for (const file of els.file.files || []) loadPhotoFile(file);
    els.file.value = '';
  });
  const syncCaption = () => {
    state.caption.text = els.caption.value;
    state.caption.kicker = els.kicker.value;
    state.caption.size = Number(els.size.value) || 1;
    state.caption.placement = els.placement.value;
    drawPreview();
  };
  for (const el of [els.caption, els.kicker, els.size, els.placement]) {
    el.addEventListener('input', syncCaption);
    el.addEventListener('change', syncCaption);
  }
  els.exportBtn.addEventListener('click', () => {
    const size = sizeById(state.sizeId);
    const off = document.createElement('canvas');
    off.width = size.w;
    off.height = size.h;
    renderCover(off.getContext('2d'), renderState(), size.w, size.h);
    off.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cover-heist-${size.w}x${size.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      els.status.textContent = `Exported a ${size.w} x ${size.h} PNG.`;
    }, 'image/png');
  });
}

function loadSample(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.src = src;
  });
}

// ?shot=cover|editor|sizes&photo=..&caption=.. — the app draws its own
// screenshots: a full-frame scene on a lone canvas, flagged ready on
// window.__shotReady once the sample photos have decoded.
async function runShotScene(params) {
  document.body.classList.add('shot');
  const kind = params.get('shot') || 'cover';
  const caption = params.get('caption') || state.caption.text;
  state.caption.text = caption;
  const [a, b] = await Promise.all([loadSample('./samples/boulevard.jpg'), loadSample('./samples/pier.jpg')]);
  state.photos = params.get('photo') === 'pier' ? [b, a] : [a, b];
  const canvas = els.canvas;
  const create = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  };
  if (kind === 'editor') {
    canvas.width = 1280; canvas.height = 720;
    state.previewW = 1080; state.previewH = 1080;
    const rs = renderState();
    rs.previewW = 1080; rs.previewH = 1080;
    drawEditorScene(canvas.getContext('2d'), rs, 1280, 720, create);
  } else if (kind === 'sizes') {
    canvas.width = 1280; canvas.height = 800;
    drawSizesScene(canvas.getContext('2d'), renderState(), 1280, 800, create);
  } else {
    const size = sizeById(params.get('size') || 'wide');
    canvas.width = Math.min(1280, size.w);
    canvas.height = Math.round(canvas.width * (size.h / size.w));
    state.layoutId = params.get('layout') || state.layoutId;
    state.gradeId = params.get('grade') || state.gradeId;
    renderCover(canvas.getContext('2d'), renderState(), canvas.width, canvas.height);
  }
  window.__shotReady = true;
}

const params = new URLSearchParams(location.search);
if (params.has('shot')) {
  runShotScene(params);
} else {
  buildPickers();
  wireCanvas();
  wireControls();
  drawPreview();
  Promise.all([loadSample('./samples/boulevard.jpg'), loadSample('./samples/pier.jpg')])
    .then(([a, b]) => {
      state.photos = [a, b];
      els.status.textContent = 'Sample photos loaded. Add your own photo to make it yours.';
      drawPreview();
    })
    .catch(() => { els.status.textContent = 'Add a photo to begin.'; });
}
