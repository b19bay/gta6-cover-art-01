// main.js -- the browser editor of Velvet Hour Cover Studio. Wires the
// DOM controls to the pure render core (cover.js): load your own photo
// into any panel, drag to reposition, scroll to zoom, edit the caption,
// switch layout and grade, export a PNG in the three post sizes.

import { CAST, DEFAULT_CAPTION, EXPORT_SIZES, GAME_SUBTITLE, GAME_TAGLINE, GAME_TITLE, GRADES, LAYOUTS } from './cast.js';
import { defaultSlots, mosaicGeometry, renderCover } from './cover.js';
import { runShotScene } from './shots.js';

const g = {
  makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  },
};

const state = {
  title: GAME_TITLE,
  subtitle: GAME_SUBTITLE,
  tagline: GAME_TAGLINE,
  caption: DEFAULT_CAPTION,
  grade: 'gold',
  layout: 'mosaic',
  titleScale: 1,
  slots: defaultSlots(),
  photos: {},
  selectedPanel: 0,
  selectedCast: 'boss',
};

const preview = document.getElementById('preview');
const pctx = preview.getContext('2d');

function redraw() {
  const base = { ...state };
  renderCover(pctx, g, base, preview.width, preview.height);
  // outline the selected panel on the mosaic
  if (state.layout === 'mosaic') {
    const geo = mosaicGeometry(preview.width, preview.height);
    const rect = state.selectedPanel === 0 ? geo.pop : geo.slots[state.selectedPanel];
    if (rect) {
      pctx.save();
      pctx.strokeStyle = '#ffd23e';
      pctx.lineWidth = 3;
      pctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      pctx.restore();
    }
  }
}

function panelRects() {
  if (state.layout !== 'mosaic') return [];
  const geo = mosaicGeometry(preview.width, preview.height);
  return geo.slots.map((r, i) => (i === 0 ? geo.pop : r));
}

function loadCastPhotos() {
  let loaded = 0;
  for (const c of CAST) {
    const img = new Image();
    img.onload = () => { state.photos[c.id] = img; loaded++; if (loaded === CAST.length) redraw(); };
    img.src = c.file;
  }
}

function buildOptionList(el, items, current, render, onPick) {
  el.innerHTML = '';
  for (const item of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = render(item);
    if (item.id === current) b.classList.add('selected');
    b.addEventListener('click', () => onPick(item.id));
    el.appendChild(b);
  }
}

function buildTray() {
  const tray = document.getElementById('cast-tray');
  tray.innerHTML = '';
  for (const c of CAST) {
    const div = document.createElement('div');
    div.className = 'tray-item' + (state.selectedCast === c.id ? ' selected' : '');
    const img = document.createElement('img');
    img.src = c.file;
    img.alt = `${c.name}, ${c.role}`;
    const span = document.createElement('span');
    span.textContent = c.role;
    div.append(img, span);
    div.addEventListener('click', () => {
      state.selectedCast = c.id;
      state.slots[state.selectedPanel].photoKey = c.id;
      buildTray();
      redraw();
    });
    tray.appendChild(div);
  }
}

function refreshControls() {
  buildOptionList(document.getElementById('layout-list'), LAYOUTS, state.layout,
    (l) => `${l.label} — ${l.detail}`,
    (id) => { state.layout = id; refreshControls(); redraw(); });
  buildOptionList(document.getElementById('grade-list'), GRADES, state.grade,
    (gr) => gr.label,
    (id) => { state.grade = id; refreshControls(); redraw(); });
  const slot = state.slots[state.selectedPanel];
  document.getElementById('selected-info').textContent =
    `${slot.role} — panel ${state.selectedPanel + 1} of ${state.slots.length}`;
  document.getElementById('crop-zoom').value = Math.round((slot.crop.zoom || 1) * 100);
}

function exportPng(sizeId) {
  const size = EXPORT_SIZES.find((s) => s.id === sizeId);
  const c = g.makeCanvas(size.w, size.h);
  renderCover(c.getContext('2d'), g, state, size.w, size.h);
  c.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `velvet-hour-cover-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

function wireEditor() {
  document.getElementById('caption-input').addEventListener('input', (e) => {
    state.title = e.target.value.toUpperCase() || GAME_TITLE;
    redraw();
  });
  document.getElementById('subtitle-input').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    redraw();
  });
  document.getElementById('tagline-input').addEventListener('input', (e) => {
    state.tagline = e.target.value.toUpperCase();
    redraw();
  });
  document.getElementById('title-size').addEventListener('input', (e) => {
    state.titleScale = Number(e.target.value) / 100;
    redraw();
  });
  document.getElementById('crop-zoom').addEventListener('input', (e) => {
    state.slots[state.selectedPanel].crop.zoom = Number(e.target.value) / 100;
    redraw();
  });
  document.getElementById('photo-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const key = `user-${Date.now()}`;
      state.photos[key] = img;
      state.slots[state.selectedPanel].photoKey = key;
      redraw();
    };
    img.src = url;
  });
  for (const s of EXPORT_SIZES) {
    document.getElementById(`export-${s.id}`).addEventListener('click', () => exportPng(s.id));
  }
  // panel picking, drag to reposition, wheel to zoom
  let drag = null;
  const toCanvas = (ev) => {
    const r = preview.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left) * (preview.width / r.width),
      y: (ev.clientY - r.top) * (preview.height / r.height),
    };
  };
  preview.addEventListener('pointerdown', (ev) => {
    const p = toCanvas(ev);
    const rects = panelRects();
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      if (r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
        state.selectedPanel = i;
        state.selectedCast = state.slots[i].photoKey;
        drag = { x: p.x, y: p.y, fx: state.slots[i].crop.fx, fy: state.slots[i].crop.fy, rect: r };
        buildTray();
        refreshControls();
        redraw();
        break;
      }
    }
  });
  preview.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const p = toCanvas(ev);
    const slot = state.slots[state.selectedPanel];
    slot.crop.fx = Math.max(0, Math.min(1, drag.fx - (p.x - drag.x) / drag.rect.w * 0.6));
    slot.crop.fy = Math.max(0, Math.min(1, drag.fy - (p.y - drag.y) / drag.rect.h * 0.6));
    redraw();
  });
  window.addEventListener('pointerup', () => { drag = null; });
  preview.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const slot = state.slots[state.selectedPanel];
    slot.crop.zoom = Math.max(1, Math.min(2.4, (slot.crop.zoom || 1) * (ev.deltaY < 0 ? 1.06 : 0.94)));
    refreshControls();
    redraw();
  }, { passive: false });
}

// Screenshot scenes (?shot=cover|editor|sizes|caption) render one scene
// full-page; without a query the full editor starts.
const shot = new URLSearchParams(location.search).get('shot');
loadCastPhotos();
buildTray();
refreshControls();
wireEditor();
if (shot) {
  document.body.classList.add('shot');
  const iv = setInterval(() => {
    if (Object.keys(state.photos).length === CAST.length) {
      clearInterval(iv);
      runShotScene(preview, g, state, shot);
    }
  }, 60);
} else {
  redraw();
}
