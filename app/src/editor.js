// Draws the whole editor scene on canvas: header, live cover preview
// (via the same renderCover the export uses), panel outlines and drag
// handles, and the control panel (photo thumbs, layout thumbnails, grade
// swatches, caption box, export chips) as drawn boxes and labels. Pure
// canvas, no DOM — the browser shows this scene on its stage canvas in
// ?shot=editor mode, and the screenshot script draws it the same way.
import { LAYOUTS, layoutRects } from './layouts.js';
import { GRADES, GRADE_NAMES } from './grades.js';
import { renderCover, EXPORT_SIZES } from './render-core.js';
import { CAPTION_FONT } from './caption.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function section(ctx, x, y, label) {
  ctx.fillStyle = '#8f88a3';
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, x, y);
}

/** Draws the editor for `state` onto ctx at W x H. `selected` is the panel index. */
export function renderEditor(ctx, photos, state, W, H, selected = 0) {
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  ctx.fillStyle = '#16121f';
  ctx.fillRect(0, 0, W, H);

  // Header.
  ctx.fillStyle = '#1e1830';
  ctx.fillRect(0, 0, W, 76);
  ctx.fillStyle = grade.accent;
  ctx.font = `36px ${CAPTION_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('COVER HEIST', 36, 40);
  ctx.fillStyle = '#cfc9de';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('GTA-style cover maker  ·  your photo, your caption, three post sizes', 300, 42);

  // Live preview (the real cover, drawn by the shared core).
  const px = 36;
  const py = 100;
  const ps = 640;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, ps, ps);
  ctx.clip();
  ctx.translate(px, py);
  renderCover(ctx, photos, state, ps, ps);
  ctx.restore();
  // Panel outlines + index badges + drag handles on the selected panel.
  const rects = layoutRects(state.layout, ps, ps);
  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 2;
  rects.forEach((r, i) => {
    ctx.strokeRect(px + r.x + 1, py + r.y + 1, r.w - 2, r.h - 2);
    ctx.setLineDash([]);
    ctx.fillStyle = i === selected ? grade.accent : 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(px + r.x + 16, py + r.y + 16, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#16121f';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), px + r.x + 16, py + r.y + 17);
    ctx.setLineDash([8, 6]);
  });
  ctx.restore();
  const sel = rects[selected] ?? rects[0];
  ctx.fillStyle = grade.accent;
  [[sel.x, sel.y], [sel.x + sel.w, sel.y], [sel.x, sel.y + sel.h], [sel.x + sel.w, sel.y + sel.h]]
    .forEach(([hx, hy]) => {
      ctx.fillRect(px + hx - 5, py + hy - 5, 10, 10);
    });
  ctx.fillStyle = '#cfc9de';
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Drag the photo to reposition it  ·  scroll to zoom  ·  click a panel to select it', px, py + ps + 26);

  // Right-hand control panel, drawn.
  const cx = 712;
  const cw = W - cx - 36;
  let y = 100;
  section(ctx, cx, y, '1 · PHOTO');
  y += 12;
  photos.slice(0, 2).forEach((img, i) => {
    const tx = cx + i * 116;
    if (img) {
      const s = Math.max(100 / (img.naturalWidth || img.width), 100 / (img.naturalHeight || img.height));
      const dw = (img.naturalWidth || img.width) * s;
      const dh = (img.naturalHeight || img.height) * s;
      ctx.save();
      ctx.beginPath(); ctx.rect(tx, y, 100, 100); ctx.clip();
      ctx.drawImage(img, tx + (100 - dw) / 2, y + (100 - dh) / 2, dw, dh);
      ctx.restore();
    }
    ctx.strokeStyle = '#4a4360';
    ctx.lineWidth = 2;
    ctx.strokeRect(tx, y, 100, 100);
    ctx.fillStyle = '#cfc9de';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(i === 0 ? 'Photo A (hero)' : 'Photo B (panels)', tx, y + 118);
  });
  y += 148;
  section(ctx, cx, y, '2 · LAYOUT');
  y += 12;
  const miniW = 118;
  const miniH = 76;
  Object.entries(LAYOUTS).forEach(([name, def], i) => {
    const mx = cx + (i % 2) * (miniW + 16);
    const my = y + Math.floor(i / 2) * (miniH + 26);
    ctx.fillStyle = '#241d38';
    roundRect(ctx, mx, my, miniW, miniH, 6);
    ctx.fill();
    def.panels.forEach((p) => {
      ctx.fillStyle = '#7b6bb0';
      const mw = miniW - 12;
      const mh = miniH - 12;
      ctx.beginPath();
      if (p.clip) {
        p.clip.forEach(([px, py], k) => {
          const X = mx + 6 + px * mw;
          const Y = my + 6 + py * mh;
          if (k === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
        });
        ctx.closePath();
      } else {
        ctx.rect(mx + 6 + p.x * mw, my + 6 + p.y * mh, p.w * mw - 2, p.h * mh - 2);
      }
      ctx.fill();
    });
    ctx.strokeStyle = name === state.layout ? grade.accent : '#4a4360';
    ctx.lineWidth = name === state.layout ? 3 : 1.5;
    roundRect(ctx, mx, my, miniW, miniH, 6);
    ctx.stroke();
    ctx.fillStyle = name === state.layout ? '#ffffff' : '#cfc9de';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(def.label, mx, my + miniH + 16);
  });
  y += (miniH + 26) * 2 + 22;
  section(ctx, cx, y, '3 · GRADE');
  y += 12;
  GRADE_NAMES.forEach((name, i) => {
    const g = GRADES[name];
    const gy = y + i * 30;
    const grad = ctx.createLinearGradient(cx, 0, cx + 150, 0);
    g.sky.forEach((c, k) => grad.addColorStop(k / (g.sky.length - 1), c));
    ctx.fillStyle = grad;
    ctx.fillRect(cx, gy, 150, 20);
    ctx.strokeStyle = name === state.grade ? grade.accent : '#4a4360';
    ctx.lineWidth = name === state.grade ? 3 : 1.5;
    ctx.strokeRect(cx, gy, 150, 20);
    ctx.fillStyle = name === state.grade ? '#ffffff' : '#cfc9de';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(g.label, cx + 162, gy + 15);
  });
  y += GRADE_NAMES.length * 30 + 18;
  section(ctx, cx, y, '4 · CAPTION');
  y += 10;
  ctx.fillStyle = '#241d38';
  roundRect(ctx, cx, y, cw, 44, 6);
  ctx.fill();
  ctx.strokeStyle = '#4a4360';
  ctx.lineWidth = 1.5;
  roundRect(ctx, cx, y, cw, 44, 6);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `22px ${CAPTION_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText((state.caption.text || 'YOUR CAPTION').toUpperCase(), cx + 14, y + 23);
  ctx.textBaseline = 'alphabetic';
  y += 64;
  section(ctx, cx, y, '5 · EXPORT PNG');
  y += 12;
  EXPORT_SIZES.forEach((s, i) => {
    const bx = cx + i * 172;
    ctx.fillStyle = i === 0 ? grade.accent : '#2c2547';
    roundRect(ctx, bx, y, 160, 38, 8);
    ctx.fill();
    ctx.fillStyle = i === 0 ? '#16121f' : '#ffffff';
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.label, bx + 80, y + 24);
    ctx.textAlign = 'left';
  });
}
