// Screenshot driver (Node, run in-session by the maker): drives the app's own render
// core through the software canvas backend and writes the four screenshots from
// shots.json. Sample photos are decoded to raw pixels with ffmpeg (the browser uses
// an Image element for the same job); finished frames are encoded to JPEG the same
// way and shrunk until each fits the gate: at most 256 KiB, long side at most 1280,
// short side at least 480.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultState, renderCover, renderEditor, renderSizesSheet } from './app/src/render-core.js';
import { createSoftCanvas, loadSystemFonts } from './app/src/soft-canvas.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), 'velvet-tide-shots-'));
const fonts = loadSystemFonts();

function decodeSample(name) {
  const src = join(here, 'app', 'samples', name);
  const probe = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src], { encoding: 'utf8' });
  const [width, height] = probe.trim().split(',').map(Number);
  const rawPath = join(scratch, `${name}.rgba`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgba', rawPath]);
  const data = readFileSync(rawPath);
  return { width, height, naturalWidth: width, naturalHeight: height, data: new Uint8ClampedArray(data) };
}

function encodeJpeg(canvas, name, targetW, targetH) {
  // Downscale by box sampling when the render is larger than the shot.
  let { width, height, data } = canvas;
  if (width !== targetW || height !== targetH) {
    const out = new Uint8ClampedArray(targetW * targetH * 4);
    const fx = width / targetW, fy = height / targetH;
    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const sx = Math.min(width - 1, Math.floor((x + 0.5) * fx));
        const sy = Math.min(height - 1, Math.floor((y + 0.5) * fy));
        const si = (sy * width + sx) * 4, di = (y * targetW + x) * 4;
        out[di] = data[si]; out[di + 1] = data[si + 1]; out[di + 2] = data[si + 2]; out[di + 3] = 255;
      }
    }
    width = targetW; height = targetH; data = out;
  }
  const rawPath = join(scratch, 'frame.rgba');
  writeFileSync(rawPath, Buffer.from(data.buffer, data.byteOffset, data.byteLength));
  const outPath = join(here, 'screenshots', name);
  for (const quality of [88, 82, 76, 70, 62]) {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${width}x${height}`, '-i', rawPath, '-q:v', String(Math.round(31 - (quality / 100) * 29)), outPath]);
    const size = readFileSync(outPath).length;
    if (size <= 262144) return { path: outPath, bytes: size, width, height, quality };
  }
  throw new Error(`${name} still over 256 KiB at the lowest quality`);
}

const photos = [decodeSample('boulevard.jpg'), decodeSample('pier.jpg')];
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
const results = [];
for (const shot of shots) {
  const query = new URLSearchParams(shot.query.replace(/^\?/, ''));
  const state = defaultState();
  state.layout = query.get('layout') || state.layout;
  state.grade = query.get('grade') || state.grade;
  if (query.get('caption')) state.caption = query.get('caption').toUpperCase();
  state.photos = photos;
  const kind = query.get('shot');
  if (kind === 'editor') {
    // Detail crops on the repeated samples, so the grid shows four distinct panels.
    state.crops = { 2: { zoom: 1.9, fx: 0.1, fy: 0.8 }, 3: { zoom: 1.9, fx: 0.85, fy: 0.25 } };
  }
  let canvas;
  if (kind === 'editor') {
    canvas = createSoftCanvas(1280, 800, fonts);
    renderEditor(canvas.ctx, state, 1280, 800);
    results.push(encodeJpeg(canvas, shot.name, shot.w, shot.h));
  } else if (kind === 'sizes') {
    canvas = createSoftCanvas(1280, 720, fonts);
    renderSizesSheet(canvas.ctx, state, 1280, 720);
    results.push(encodeJpeg(canvas, shot.name, shot.w, shot.h));
  } else if (shot.w >= shot.h) {
    canvas = createSoftCanvas(1920, 1080, fonts);
    renderCover(canvas.ctx, state, 1920, 1080);
    results.push(encodeJpeg(canvas, shot.name, shot.w, shot.h));
  } else {
    canvas = createSoftCanvas(1080, 1350, fonts);
    renderCover(canvas.ctx, state, 1080, 1350);
    results.push(encodeJpeg(canvas, shot.name, shot.w, shot.h));
  }
  const r = results[results.length - 1];
  console.log(`${shot.name}: ${r.width}x${r.height}, ${r.bytes} bytes, q${r.quality}`);
}
