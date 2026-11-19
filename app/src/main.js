// Wires the page to the render core: photo uploads (FileReader, local
// only), caption/layout/grade controls, drag-to-pan and scroll-to-zoom on
// the preview, and PNG export in the three post sizes. A `?shot=` query
// sets up a fixed scene instead (see shots.js).
import { renderCover, defaultState, EXPORT_SIZES } from './render-core.js';
import { renderEditor } from './editor.js';
import { LAYOUTS, layoutRects, hitPanel } from './layouts.js';
import { GRADES } from './grades.js';
import { shotScene } from './shots.js';

const stage = document.getElementById('stage');
const ctx = stage.getContext('2d');
const status = document.getElementById('status');
const captionInput = document.getElementById('caption');

let photos = [null, null];
let state = defaultState('hero-strip', 'sunset', 'Sunset Heist');
let selected = 0;
let shotMode = null;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  if (shotMode === 'editor') {
    stage.width = 1280;
    stage.height = 800;
    renderEditor(ctx, photos, state, 1280, 800, selected);
  } else {
    stage.width = 720;
    stage.height = 720;
    renderCover(ctx, photos, state, 720, 720);
  }
}

function setStatus(msg) { status.textContent = msg; }

async function setPhoto(slot, fileOrUrl) {
  const img = typeof fileOrUrl === 'string'
    ? await loadImage(fileOrUrl)
    : await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => loadImage(r.result).then(resolve, reject);
      r.onerror = reject;
      r.readAsDataURL(fileOrUrl);
    });
  photos[slot] = img;
  redraw();
}

function refreshButtons() {
  document.querySelectorAll('[data-layout]').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
    b.setAttribute('aria-pressed', String(b.dataset.layout === state.layout));
  });
  document.querySelectorAll('[data-grade]').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
    b.setAttribute('aria-pressed', String(b.dataset.grade === state.grade));
  });
  document.querySelectorAll('[data-position]').forEach((b) => {
    b.classList.toggle('active', b.dataset.position === state.caption.position);
  });
}

function applyLayout(name) {
  const keep = state.panels;
  const position = state.caption.position;
  state = defaultState(name, state.grade, state.caption.text);
  state.caption.position = position;
  state.panels.forEach((p, i) => {
    const old = keep[i] ?? keep[0] ?? p;
    p.photo = old.photo;
  });
  selected = 0;
  refreshButtons();
  redraw();
}

document.getElementById('photo-a').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (f) setPhoto(0, f).then(() => setStatus('Photo A loaded.'));
});
document.getElementById('photo-b').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (f) setPhoto(1, f).then(() => setStatus('Photo B loaded.'));
});
document.getElementById('sample-a').addEventListener('click', () => {
  setPhoto(0, 'samples/pier.jpg').then(() => setStatus('Sample photo A loaded.'));
});
document.getElementById('sample-b').addEventListener('click', () => {
  setPhoto(1, 'samples/boulevard.jpg').then(() => setStatus('Sample photo B loaded.'));
});
captionInput.addEventListener('input', () => {
  state.caption.text = captionInput.value;
  redraw();
});
document.querySelectorAll('[data-layout]').forEach((b) => {
  b.addEventListener('click', () => applyLayout(b.dataset.layout));
});
document.querySelectorAll('[data-grade]').forEach((b) => {
  b.addEventListener('click', () => {
    state.grade = b.dataset.grade;
    refreshButtons();
    redraw();
  });
});
document.querySelectorAll('[data-position]').forEach((b) => {
  b.addEventListener('click', () => {
    state.caption.position = b.dataset.position;
    refreshButtons();
    redraw();
  });
});
document.querySelectorAll('[data-export]').forEach((b) => {
  b.addEventListener('click', () => {
    const size = EXPORT_SIZES[Number(b.dataset.export)];
    const off = document.createElement('canvas');
    off.width = size.w;
    off.height = size.h;
    renderCover(off.getContext('2d'), photos, state, size.w, size.h);
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cover-${size.w}x${size.h}.png`;
      a.click();
      setStatus(`Saved cover-${size.w}x${size.h}.png`);
    }, 'image/png');
  });
});

// Drag to pan the selected panel's photo, scroll to zoom, click to select.
let dragging = null;
stage.addEventListener('pointerdown', (e) => {
  const r = stage.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * stage.width;
  const y = ((e.clientY - r.top) / r.height) * stage.height;
  const hit = shotMode === 'editor' ? -1 : hitPanel(state.layout, stage.width, stage.height, x, y);
  if (hit >= 0) {
    selected = hit;
    dragging = { x, y };
    stage.setPointerCapture(e.pointerId);
    redraw();
  }
});
stage.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const r = stage.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * stage.width;
  const y = ((e.clientY - r.top) / r.height) * stage.height;
  const panel = state.panels[selected];
  const rect = layoutRects(state.layout, stage.width, stage.height)[selected];
  if (panel && rect) {
    panel.ox += (x - dragging.x) / rect.w;
    panel.oy += (y - dragging.y) / rect.h;
  }
  dragging = { x, y };
  redraw();
});
stage.addEventListener('pointerup', () => { dragging = null; });
stage.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[selected];
  if (!panel) return;
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
  redraw();
}, { passive: false });

// Shot mode for screenshots, else load the samples as a starting point.
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  const scene = shotScene(shot, params);
  shotMode = scene.mode;
  if (shotMode === 'cover') document.body.classList.add('shot-cover');
  state = scene.state;
  captionInput.value = state.caption.text;
  refreshButtons();
  Promise.all(scene.photos.map((name) => loadImage(`samples/${name}.jpg`)))
    .then((imgs) => { photos = imgs; redraw(); })
    .then(() => requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; })));
} else {
  refreshButtons();
  Promise.all([loadImage('samples/pier.jpg'), loadImage('samples/boulevard.jpg')])
    .then((imgs) => { photos = imgs; redraw(); });
  if (document.fonts?.ready) document.fonts.ready.then(redraw);
}
redraw();
