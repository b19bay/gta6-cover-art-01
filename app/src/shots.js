// Fixed scenes for screenshots: ?shot=cover renders one exported cover full-frame,
// ?shot=editor draws the editor with a sample photo loaded, ?shot=sizes draws the
// three post sizes on one sheet. window.__shotReady is set once the scene is painted.
import { renderCover, renderEditor, renderSizesSheet } from './render-core.js';

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function runShot(shot, query, stage, state, redraw) {
  document.body.classList.add('shot');
  state.layout = query.get('layout') || state.layout;
  state.grade = query.get('grade') || state.grade;
  if (query.get('caption')) state.caption = query.get('caption').toUpperCase();
  const photos = [];
  for (const name of ['boulevard', 'pier']) photos.push(await loadImage(`samples/${name}.jpg`));
  state.photos = photos;
  if (shot === 'editor' && state.layout === 'photo-grid') {
    state.crops = { 2: { zoom: 1.9, fx: 0.1, fy: 0.8 }, 3: { zoom: 1.9, fx: 0.85, fy: 0.25 } };
  }
  const ctx = stage.getContext('2d');
  if (shot === 'editor') {
    stage.width = 1280;
    stage.height = 800;
    renderEditor(ctx, state, stage.width, stage.height);
  } else if (shot === 'sizes') {
    stage.width = 1280;
    stage.height = 720;
    renderSizesSheet(ctx, state, stage.width, stage.height);
  } else {
    stage.width = 1920;
    stage.height = 1080;
    redraw();
    void renderCover;
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
