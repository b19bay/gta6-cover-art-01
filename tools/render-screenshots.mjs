// render-screenshots.mjs — produces the four entry screenshots with the
// app's own render core (app/src/render-cover.js and render-editor.js)
// running on the Node canvas shim. The kit's free sample photos are
// decoded to raw RGB first (see the decode step in the build notes) and
// loaded here as drawable canvases; every pixel of cover art, grading,
// lettering and editor UI in the output comes from the app's code.
// Output: binary PPM files in the scratch dir named by argv[2], which the
// encode step turns into the JPEGs listed in shots.json.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createCanvas, canvasFromRawRGB } from './node-canvas.mjs';
import { renderCover } from '../app/src/render-cover.js';
import { drawEditorScene, drawSizesScene } from '../app/src/render-editor.js';

const scratch = process.argv[2];
if (!scratch) throw new Error('usage: render-screenshots.mjs <scratch-dir>');
mkdirSync(scratch, { recursive: true });

function loadPhoto(name, w, h) {
  const raw = readFileSync(join(scratch, `${name}.rgb`));
  if (raw.length !== w * h * 3) throw new Error(`${name}.rgb has ${raw.length} bytes, expected ${w * h * 3}`);
  return canvasFromRawRGB(raw, w, h);
}

const boulevard = loadPhoto('boulevard', 544, 720);
const pier = loadPhoto('pier', 720, 720);

function state(overrides = {}) {
  return {
    layoutId: 'hero-strip',
    gradeId: 'sunset',
    sizeId: 'wide',
    caption: { text: 'Neon Shore', kicker: 'Vice City Nights', size: 1, placement: 'bottom', outline: true },
    photos: { 0: boulevard, 1: pier, 2: boulevard, 3: pier },
    views: { 0: { zoom: 1, offsetX: 0, offsetY: -0.55 } },
    ...overrides,
  };
}

function save(canvas, name) {
  writeFileSync(join(scratch, name), canvas.toPPM());
  console.log(`${name}: ${canvas.width}x${canvas.height}`);
}

// 1-cover.jpg — the strongest exported cover: wide hero-strip, sunset.
{
  const c = createCanvas(1280, 720);
  renderCover(c.getContext('2d'), state(), 1280, 720);
  save(c, '1-cover.ppm');
}
// 2-editor.jpg — the editor with a photo loaded, panels and controls.
{
  const c = createCanvas(1280, 720);
  const s = state({ previewW: 1080, previewH: 1080 });
  drawEditorScene(c.getContext('2d'), s, 1280, 720, createCanvas);
  save(c, '2-editor.ppm');
}
// 3-sizes.jpg — the same cover in the other post sizes.
{
  const c = createCanvas(1280, 800);
  const s = state({ photos: { 0: pier, 1: boulevard, 2: pier, 3: boulevard } });
  drawSizesScene(c.getContext('2d'), s, 1280, 800, createCanvas);
  save(c, '3-sizes.ppm');
}
// 4-caption.jpg — caption editing showcase: a second exported cover,
// portrait, diagonal split, neon grade, its own headline and kicker.
{
  const c = createCanvas(1024, 1280);
  const s = state({
    layoutId: 'diagonal',
    gradeId: 'neon',
    photos: { 0: pier, 1: boulevard, 2: pier },
    caption: { text: 'Midnight Run', kicker: 'Cover Heist Special', size: 1.15, placement: 'bottom', outline: true },
  });
  renderCover(c.getContext('2d'), s, 1024, 1280);
  save(c, '4-caption.ppm');
}
