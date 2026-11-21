// shots.js -- renders a single named scene onto the page canvas for the
// ?shot= URLs in shots.json: cover, editor, sizes, caption. The same
// scenes are what the maker's screenshot script draws with the software
// surface, so a screenshot is always the app's own drawing.

import { drawEditorScene, drawSizesScene } from './editor.js';
import { renderCover } from './cover.js';

export function sceneSize(shot) {
  if (shot === 'caption') return { w: 1024, h: 1280 };
  return { w: 1280, h: 720 };
}

export function renderScene(x, g, state, shot, W, H) {
  if (shot === 'editor') {
    drawEditorScene(x, g, state, W, H);
  } else if (shot === 'sizes') {
    drawSizesScene(x, g, state, W, H);
  } else if (shot === 'caption') {
    const alt = {
      ...state,
      grade: 'neon',
      subtitle: 'the city keeps the receipts',
      tagline: 'SAME CREW. BRIGHTER SINS.',
    };
    renderCover(x, g, alt, W, H);
  } else {
    renderCover(x, g, state, W, H);
  }
}

export function runShotScene(canvas, g, state, shot) {
  const { w, h } = sceneSize(shot);
  canvas.width = w;
  canvas.height = h;
  renderScene(canvas.getContext('2d'), g, state, shot, w, h);
}
