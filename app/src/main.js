// Browser wiring for Velvet Tide: photo loading (FileReader, local only), per-panel
// drag and zoom, layout / grade / caption controls, live preview and PNG export.
import { defaultState, renderCover, LAYOUTS, GRADES, layoutPanels } from './render-core.js';
import { runShot } from './shots.js';

const stage = document.getElementById('stage');
const ctx = stage.getContext('2d');
const state = defaultState();
let selectedPanel = 0;

const status = document.getElementById('status');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const panelPick = document.getElementById('panelPick');
const zoomInput = document.getElementById('zoom');

function panelCount() {
  return LAYOUTS.find((l) => l.id === state.layout).panels;
}

function refreshPanelPick() {
  panelPick.innerHTML = '';
  for (let i = 0; i < panelCount(); i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `Panel ${i + 1}`;
    panelPick.appendChild(opt);
  }
  selectedPanel = Math.min(selectedPanel, panelCount() - 1);
  panelPick.value = String(selectedPanel);
  const crop = state.crops[selectedPanel] || {};
  zoomInput.value = String(crop.zoom ?? 1);
}

function redraw() {
  ctx.clearRect(0, 0, stage.width, stage.height);
  renderCover(ctx, state, stage.width, stage.height);
}

function setCrop(patch) {
  state.crops[selectedPanel] = { ...(state.crops[selectedPanel] || {}), ...patch };
}

/** Loads an image file from the person's machine; it is never uploaded anywhere. */
function loadPhotoFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.getElementById('photos').addEventListener('change', async (event) => {
  const files = [...event.target.files];
  for (const file of files) state.photos.push(await loadPhotoFile(file));
  if (state.layout === 'cast-grid' && state.photos.length) state.layout = 'photo-hero';
  buildLayoutButtons();
  refreshPanelPick();
  redraw();
  status.textContent = `${state.photos.length} photo(s) loaded — kept on this machine.`;
});

function buildLayoutButtons() {
  const box = document.getElementById('layouts');
  box.innerHTML = '';
  for (const layout of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = layout.name;
    b.setAttribute('aria-pressed', String(state.layout === layout.id));
    b.addEventListener('click', () => {
      state.layout = layout.id;
      buildLayoutButtons();
      refreshPanelPick();
      redraw();
    });
    box.appendChild(b);
  }
}

function buildGradeButtons() {
  const box = document.getElementById('grades');
  box.innerHTML = '';
  for (const [id, grade] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = grade.name;
    b.setAttribute('aria-pressed', String(state.grade === id));
    b.addEventListener('click', () => {
      state.grade = id;
      buildGradeButtons();
      redraw();
    });
    box.appendChild(b);
  }
}

panelPick.addEventListener('change', () => {
  selectedPanel = Number(panelPick.value);
  const crop = state.crops[selectedPanel] || {};
  zoomInput.value = String(crop.zoom ?? 1);
});
zoomInput.addEventListener('input', () => { setCrop({ zoom: Number(zoomInput.value) }); redraw(); });
captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
document.getElementById('capSize').addEventListener('input', (e) => { state.captionSize = Number(e.target.value); redraw(); });
document.getElementById('capPlace').addEventListener('change', (e) => { state.captionPlace = e.target.value; redraw(); });
document.getElementById('capOutline').addEventListener('change', (e) => { state.captionOutline = e.target.checked; redraw(); });
document.getElementById('capShadow').addEventListener('change', (e) => { state.captionShadow = e.target.checked; redraw(); });

// Drag to reposition the selected panel's photo; the wheel zooms it.
let dragging = null;
stage.addEventListener('pointerdown', (event) => {
  const rect = stage.getBoundingClientRect();
  const nx = (event.clientX - rect.left) / rect.width;
  const ny = (event.clientY - rect.top) / rect.height;
  const panels = layoutPanels(state.layout, stage.height > stage.width);
  const idx = panels.findIndex((p) => nx >= p.x && nx <= p.x + p.w && ny >= p.y * 0.8 && ny <= (p.y + p.h) * 0.8 + 0.2);
  if (idx >= 0) {
    selectedPanel = idx;
    panelPick.value = String(idx);
  }
  dragging = { x: event.clientX, y: event.clientY };
  stage.setPointerCapture(event.pointerId);
});
stage.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const rect = stage.getBoundingClientRect();
  const crop = state.crops[selectedPanel] || {};
  setCrop({
    ox: (crop.ox ?? 0) + (event.clientX - dragging.x) / rect.width,
    oy: (crop.oy ?? 0) + (event.clientY - dragging.y) / rect.height,
  });
  dragging = { x: event.clientX, y: event.clientY };
  redraw();
});
stage.addEventListener('pointerup', () => { dragging = null; });
stage.addEventListener('wheel', (event) => {
  event.preventDefault();
  const crop = state.crops[selectedPanel] || {};
  const zoom = Math.min(3, Math.max(1, (crop.zoom ?? 1) * (event.deltaY < 0 ? 1.06 : 0.94)));
  setCrop({ zoom });
  zoomInput.value = String(zoom);
  redraw();
}, { passive: false });

for (const button of document.querySelectorAll('[data-export]')) {
  button.addEventListener('click', () => {
    const [w, h] = button.dataset.export.split('x').map(Number);
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    renderCover(off.getContext('2d'), state, w, h);
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `velvet-tide-${w}x${h}.png`;
      a.click();
      status.textContent = `Saved velvet-tide-${w}x${h}.png`;
    }, 'image/png');
  });
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), stage, state, redraw);
} else {
  buildLayoutButtons();
  buildGradeButtons();
  refreshPanelPick();
  redraw();
}
