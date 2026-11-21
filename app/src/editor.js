// editor.js -- canvas-drawn views of the studio: the editor scene (used
// for the editor screenshot, mirroring the DOM editor in main.js) and the
// three-sizes scene. Both are drawn with the same render core as the app.

import { CAST, EXPORT_SIZES, GRADES, LAYOUTS } from './cast.js';
import { FONT_SCRIPT, FONT_SMALL, FONT_TAG, FONT_TITLE, renderCover } from './cover.js';

function panel(x, px, py, w, h, fill) {
  x.save();
  x.fillStyle = fill;
  x.beginPath();
  x.roundRect(px, py, w, h, 10);
  x.fill();
  x.restore();
}

function label(x, text, px, py, size, color = '#cdbcf0') {
  x.save();
  x.font = FONT_TAG(size);
  x.fillStyle = color;
  x.textAlign = 'left';
  x.fillText(text, px, py);
  x.restore();
}

// The editor as one canvas drawing: control rail, live preview, cast tray.
export function drawEditorScene(x, g, state, W, H) {
  x.fillStyle = '#120d1f';
  x.fillRect(0, 0, W, H);
  // top bar
  x.fillStyle = '#1d1433';
  x.fillRect(0, 0, W, 56);
  x.save();
  x.font = FONT_TITLE(25);
  const grad = x.createLinearGradient(0, 12, 0, 44);
  grad.addColorStop(0, '#ffe259');
  grad.addColorStop(0.6, '#ff7847');
  grad.addColorStop(1, '#e83e8c');
  x.fillStyle = grad;
  x.textAlign = 'left';
  x.fillText('VELVET HOUR', 20, 38);
  x.font = FONT_TAG(17);
  x.fillStyle = '#cdbcf0';
  x.fillText('COVER STUDIO', 232, 38);
  x.restore();
  // export buttons
  const bw = 168;
  EXPORT_SIZES.forEach((s, i) => {
    const bx = W - 20 - bw - i * (bw + 10);
    panel(x, bx, 10, bw, 36, i === 0 ? '#e83e8c' : '#2c1e4d');
    x.save();
    x.font = FONT_TAG(14.5);
    x.fillStyle = '#ffffff';
    x.textAlign = 'center';
    x.fillText(`PNG ${s.w}×${s.h}`, bx + bw / 2, 33);
    x.restore();
  });

  // left control rail
  const railX = 16, railW = 252;
  panel(x, railX, 68, railW, H - 84, '#1a1230');
  let cy = 96;
  label(x, 'LAYOUT', railX + 14, cy, 14, '#ffd23e');
  cy += 10;
  for (const l of LAYOUTS) {
    const sel = l.id === state.layout;
    panel(x, railX + 12, cy, railW - 24, 34, sel ? '#3d2566' : '#241840');
    if (sel) { x.save(); x.strokeStyle = '#ffd23e'; x.lineWidth = 1.6; x.beginPath(); x.roundRect(railX + 12, cy, railW - 24, 34, 8); x.stroke(); x.restore(); }
    label(x, `${l.label} — ${l.detail}`, railX + 22, cy + 22, 13.5, sel ? '#ffffff' : '#b7a8dd');
    cy += 42;
  }
  cy += 6;
  label(x, 'GRADE — ONE FOR THE WHOLE CAST', railX + 14, cy, 14, '#ffd23e');
  cy += 10;
  for (const gr of GRADES) {
    const sel = gr.id === state.grade;
    panel(x, railX + 12, cy, railW - 24, 30, sel ? '#3d2566' : '#241840');
    const sw = { gold: '#ffb347', sunset: '#ff7847', neon: '#ff5da2', dusk: '#2ec4b6' }[gr.id];
    x.save(); x.fillStyle = sw; x.fillRect(railX + 22, cy + 8, 26, 14); x.restore();
    label(x, gr.label, railX + 58, cy + 20, 13.5, sel ? '#ffffff' : '#b7a8dd');
    cy += 37;
  }
  cy += 6;
  label(x, 'CAPTION (COVER TITLE)', railX + 14, cy, 14, '#ffd23e');
  cy += 8;
  panel(x, railX + 12, cy, railW - 24, 36, '#0e0a1c');
  label(x, state.title, railX + 22, cy + 24, 16, '#ffffff');
  cy += 48;
  label(x, 'SUBTITLE (SCRIPT LINE)', railX + 14, cy, 14, '#ffd23e');
  cy += 8;
  panel(x, railX + 12, cy, railW - 24, 36, '#0e0a1c');
  x.save();
  x.font = FONT_SCRIPT(16);
  x.fillStyle = '#ff8fc0';
  x.fillText(state.subtitle, railX + 22, cy + 24);
  x.restore();
  cy += 52;
  label(x, 'Drag a panel to reposition its photo.', railX + 14, cy, 12.5, '#8f7fb8');
  label(x, 'Scroll over a panel to zoom its crop.', railX + 14, cy + 18, 12.5, '#8f7fb8');
  label(x, 'Photos never leave this machine.', railX + 14, cy + 36, 12.5, '#8f7fb8');

  // live preview
  const pvX = railX + railW + 16, pvY = 68;
  const pvW = W - pvX - 16, pvH = H - 84 - 148;
  label(x, 'LIVE PREVIEW — CAST MOSAIC, SUNSET GOLD', pvX + 2, pvY + 16, 14, '#ffd23e');
  const cover = g.makeCanvas(pvW, pvH - 24);
  renderCover(cover.getContext('2d'), g, state, pvW, pvH - 24);
  x.save();
  x.fillStyle = 'rgba(0,0,0,0.45)';
  x.fillRect(pvX + 5, pvY + 29, pvW, pvH - 24);
  x.drawImage(cover, pvX, pvY + 24, pvW, pvH - 24);
  x.strokeStyle = '#4a3673';
  x.lineWidth = 1.5;
  x.strokeRect(pvX, pvY + 24, pvW, pvH - 24);
  x.restore();

  // cast tray
  const trayY = H - 132;
  label(x, 'CAST TRAY — PICK A PORTRAIT, THEN A PANEL. THE DEMO CAST IS FREE TO USE; YOUR OWN PHOTOS WORK TOO.', pvX + 2, trayY + 4, 13, '#ffd23e');
  const tw = (pvW - 7 * 8) / 8;
  CAST.forEach((c, i) => {
    const tx = pvX + i * (tw + 8);
    const img = state.photos[c.id];
    x.save();
    x.beginPath();
    x.roundRect(tx, trayY + 12, tw, 86, 6);
    x.clip();
    if (img) {
      const s = Math.max(tw / img.width, 86 / img.height);
      const sw2 = tw / s, sh2 = 86 / s;
      x.drawImage(img, (img.width - sw2) / 2, img.height * c.focusY - sh2 / 2, sw2, sh2, tx, trayY + 12, tw, 86);
    }
    x.restore();
    if (i === 0) { x.save(); x.strokeStyle = '#ffd23e'; x.lineWidth = 2.4; x.beginPath(); x.roundRect(tx, trayY + 12, tw, 86, 6); x.stroke(); x.restore(); }
    x.save();
    x.font = FONT_TAG(11.5);
    x.fillStyle = i === 0 ? '#ffd23e' : '#b7a8dd';
    x.textAlign = 'center';
    x.fillText(c.role, tx + tw / 2, trayY + 114);
    x.restore();
  });
  x.save();
  x.font = FONT_SMALL(12.5);
  x.fillStyle = '#8f7fb8';
  x.textAlign = 'left';
  x.fillText('Selected panel: THE BOSS (hero)', railX + 14, H - 42);
  x.fillText('Crop focus 50% / 30%, zoom 1.00', railX + 14, H - 26);
  x.restore();
}

// One scene, three post sizes: the same cover rendered square, portrait
// and wide, each labelled with its export size.
export function drawSizesScene(x, g, state, W, H) {
  x.fillStyle = '#17102a';
  x.fillRect(0, 0, W, H);
  x.save();
  x.font = FONT_TAG(19);
  x.fillStyle = '#ffd9a0';
  x.textAlign = 'left';
  x.fillText('ONE COVER — EVERY POST SIZE, ONE CLICK EACH', 24, 36);
  x.restore();
  // Each cell is rendered at its true export size, then scaled to fit --
  // the sizes are the app's real PNG outputs, not mini re-draws.
  const cells = [
    { label: '1080 × 1080', ew: 1080, eh: 1080, w: 372, h: 372, x: 24, y: 52 },
    { label: '1080 × 1350', ew: 1080, eh: 1350, w: 298, h: 372, x: 424, y: 52 },
    { label: '1920 × 1080', ew: 1920, eh: 1080, w: 514, h: 289, x: 742, y: 52 },
  ];
  cells.forEach((cell) => {
    const c = g.makeCanvas(cell.ew, cell.eh);
    renderCover(c.getContext('2d'), g, state, cell.ew, cell.eh);
    x.save();
    x.fillStyle = 'rgba(0,0,0,0.5)';
    x.fillRect(cell.x + 5, cell.y + 7, cell.w, cell.h);
    x.drawImage(c, cell.x, cell.y, cell.w, cell.h);
    x.strokeStyle = '#4a3673';
    x.strokeRect(cell.x, cell.y, cell.w, cell.h);
    x.font = FONT_TAG(16);
    x.fillStyle = '#ffd23e';
    x.textAlign = 'left';
    x.fillText(`EXPORT PNG — ${cell.label}`, cell.x + 2, cell.y + cell.h + 24);
    x.restore();
  });
  x.save();
  x.font = FONT_SCRIPT(23);
  x.fillStyle = '#ff8fc0';
  x.textAlign = 'left';
  x.fillText('the mosaic reflows to every frame —', 742, 420);
  x.fillText('hero, role tags and chrome title included', 742, 452);
  x.font = FONT_TAG(15);
  x.fillStyle = '#cdbcf0';
  x.fillText('SAME CAST, SAME GRADE, THREE PNG FILES.', 742, 492);
  x.fillText('NO RE-CROPPING, NO WATERMARK, NO UPLOAD.', 742, 516);
  x.restore();
}
