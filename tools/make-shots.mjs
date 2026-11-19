// Produces screenshots/ from the app's own render core — the same
// renderCover / renderEditor the browser runs — driven in Node with
// node-canvas over the kit's free sample photos. No mockups, no borrowed
// or composited images: every pixel is drawn by app/src/* code.
//
// Run from the repo root:  node tools/make-shots.mjs
// Requires the `canvas` package (dev-only, NOT part of the shipped app):
//   npm install canvas   (in /tmp/canvas-test for this session)
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let canvasPkg;
try {
  canvasPkg = require('canvas');
} catch {
  canvasPkg = require('/tmp/canvas-test/node_modules/canvas');
}
const { createCanvas, loadImage, registerFont } = canvasPkg;

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const appDir = join(root, 'app');
const outDir = join(root, 'screenshots');
mkdirSync(outDir, { recursive: true });

registerFont(join(appDir, 'fonts', 'Anton-Regular.ttf'), { family: 'Anton' });

const { renderCover, defaultState } = await import(pathToFileURL(join(appDir, 'src', 'render-core.js')).href);
const { renderEditor } = await import(pathToFileURL(join(appDir, 'src', 'editor.js')).href);

const pier = await loadImage(join(appDir, 'samples', 'pier.jpg'));
const boulevard = await loadImage(join(appDir, 'samples', 'boulevard.jpg'));

/** Draws a cover of `state` into rect (x, y, w, h) of ctx. */
function coverInto(ctx, photos, state, x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(x, y);
  renderCover(ctx, photos, state, w, h);
  ctx.restore();
}

/** Encodes a canvas as JPEG, stepping quality down until it fits 256 KiB. */
function encodeJpeg(canvas, name) {
  for (const q of [0.88, 0.82, 0.75, 0.68, 0.6]) {
    const buf = canvas.toBuffer('image/jpeg', { quality: q });
    if (buf.length <= 256 * 1024) {
      writeFileSync(join(outDir, name), buf);
      console.log(`${name}: ${canvas.width}x${canvas.height}, ${buf.length} bytes (q=${q})`);
      return buf.length;
    }
  }
  throw new Error(`${name}: still over 256 KiB at q=0.6`);
}

// 1-cover.jpg — the strongest art: landscape export, hero + strip, sunset.
{
  const state = defaultState('hero-strip', 'sunset', 'Sunset Heist');
  state.panels[0].oy = 0.3;
  state.panels[1].oy = 0.5;
  state.panels[2].oy = 0.5;
  const full = createCanvas(1920, 1080);
  renderCover(full.getContext('2d'), [pier, boulevard], state, 1920, 1080);
  const shot = createCanvas(1280, 720);
  shot.getContext('2d').drawImage(full, 0, 0, 1280, 720);
  encodeJpeg(shot, '1-cover.jpg');
}

// 2-editor.jpg — the editor canvas with a photo loaded.
{
  const state = defaultState('hero-strip', 'sunset', 'Sunset Heist');
  const c = createCanvas(1280, 800);
  renderEditor(c.getContext('2d'), [pier, boulevard], state, 1280, 800, 0);
  encodeJpeg(c, '2-editor.jpg');
}

// 3-sizes.jpg — one cover in all three post sizes, drawn by the core.
{
  const c = createCanvas(1280, 800);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#16121f';
  ctx.fillRect(0, 0, 1280, 800);
  ctx.fillStyle = '#ffd166';
  ctx.font = '40px Anton, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ONE COVER · THREE POST SIZES', 36, 62);
  ctx.fillStyle = '#cfc9de';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('The same render core exports every size — pick one, download the PNG.', 36, 92);
  const square = defaultState('hero-strip', 'sunset', 'Sunset Heist');
  const portrait = defaultState('diagonal', 'neon', 'Neon Nights');
  portrait.caption.position = 'top';
  const wide = defaultState('grid', 'gold', 'Gold Hour');
  coverInto(ctx, [pier, boulevard], portrait, 36, 130, 360, 450);
  coverInto(ctx, [pier, boulevard], square, 420, 130, 450, 450);
  coverInto(ctx, [boulevard, pier], wide, 894, 130, 350, 197);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('1080 x 1350', 216, 612);
  ctx.fillText('1080 x 1080', 645, 612);
  ctx.fillText('1920 x 1080', 1069, 362);
  ctx.fillStyle = '#8f88a3';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('portrait post', 216, 638);
  ctx.fillText('square post', 645, 638);
  ctx.fillText('landscape post', 1069, 388);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#cfc9de';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('Diagonal + Neon Nights', 894, 440);
  ctx.fillText('Hero + Sunset · Grid + Gold', 894, 464);
  encodeJpeg(c, '3-sizes.jpg');
}

// 4-caption.jpg — portrait cover, diagonal split, neon grade, caption on top.
{
  const state = defaultState('diagonal', 'neon', 'Neon Nights');
  state.caption.position = 'top';
  const full = createCanvas(1080, 1350);
  renderCover(full.getContext('2d'), [boulevard, pier], state, 1080, 1350);
  const shot = createCanvas(1024, 1280);
  shot.getContext('2d').drawImage(full, 0, 0, 1024, 1280);
  encodeJpeg(shot, '4-caption.jpg');
}
console.log('done');
