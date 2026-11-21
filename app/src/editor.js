// Velvet Hour — canvas drawings of the editor itself, used by the app's
// screenshot scenes. The live editor in the browser is DOM around the same
// cover canvas; these functions paint that editor faithfully on one canvas
// so the app's own renderer produces its screenshots anywhere.

import { CAST, LAYOUTS } from "./cast.js";
import { GRADES } from "./grades.js";
import { EXPORT_SIZES, drawCover, fontBody, fontDisplay } from "./cover.js";

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.arc(x + w - rad, y + rad, rad, -Math.PI / 2, 0);
  ctx.lineTo(x + w, y + h - rad);
  ctx.arc(x + w - rad, y + h - rad, rad, 0, Math.PI / 2);
  ctx.lineTo(x + rad, y + h);
  ctx.arc(x + rad, y + h - rad, rad, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + rad);
  ctx.arc(x + rad, y + rad, rad, Math.PI, Math.PI * 1.5);
  ctx.closePath();
}

function panel(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill;
  rr(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1;
  rr(ctx, x, y, w, h, 10);
  ctx.stroke();
}

function label(ctx, text, x, y, px, color, weight) {
  ctx.save();
  ctx.font = fontBody(weight || 700, px);
  ctx.fillStyle = color || "#f3e9ff";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function button(ctx, x, y, w, h, text, active, accent) {
  ctx.save();
  ctx.fillStyle = active ? accent || "#ff2e88" : "#2a1844";
  rr(ctx, x, y, w, h, 7);
  ctx.fill();
  ctx.font = fontBody(700, Math.min(15, h * 0.44));
  ctx.fillStyle = active ? "#ffffff" : "#cdbcf0";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y + h / 2 + 1, w - 8);
  ctx.restore();
}

function slider(ctx, x, y, w, value, color) {
  ctx.save();
  ctx.fillStyle = "#3a2560";
  rr(ctx, x, y - 3, w, 6, 3);
  ctx.fill();
  ctx.fillStyle = color || "#ffb03a";
  rr(ctx, x, y - 3, w * value, 6, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + w * value, y, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
}

function swatches(ctx, x, y, items, activeId, size, draw) {
  items.forEach((item, i) => {
    const sx = x + i * (size + 10);
    draw(item, sx, y, size);
    if (item.id === activeId) {
      ctx.strokeStyle = "#ffd23e";
      ctx.lineWidth = 3;
      rr(ctx, sx - 2, y - 2, size + 4, size + 4, 8);
      ctx.stroke();
    }
  });
}

// The editor at work: cast thumbnails on the left, the live cover in the
// middle, layout / grade / caption / export controls on the right.
export function drawEditor(ctx, w, h, state, env) {
  ctx.fillStyle = "#150a26";
  ctx.fillRect(0, 0, w, h);
  const headH = Math.round(h * 0.075);
  ctx.fillStyle = "#1e0f38";
  ctx.fillRect(0, 0, w, headH);
  ctx.save();
  ctx.font = fontDisplay(900, headH * 0.44);
  ctx.fillStyle = "#ffd23e";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("VELVET HOUR", 18, headH / 2);
  ctx.font = fontBody(400, headH * 0.3);
  ctx.fillStyle = "#b9a6dd";
  ctx.fillText("cover studio", 24 + ctx.measureText("VELVET HOUR ").width + 120, headH / 2);
  ctx.restore();
  button(ctx, w - 168, headH * 0.18, 150, headH * 0.64, "Export PNG", true);

  const pad = 14;
  const leftW = Math.round(w * 0.155);
  const rightW = Math.round(w * 0.235);
  const midX = pad + leftW + pad;
  const midW = w - midX - rightW - pad * 2;
  const top = headH + pad;
  const bodyH = h - top - pad;

  // left: cast / your photos
  panel(ctx, pad, top, leftW, bodyH, "#1d1136");
  label(ctx, "CAST & PHOTOS", pad + 12, top + 10, 13, "#ffd23e");
  label(ctx, "Drop your own photo onto any panel", pad + 12, top + 30, 10.5, "#a78fd6", 400);
  const thumbH = (bodyH - 92) / CAST.length;
  state.slots.forEach((slot, i) => {
    const ty = top + 52 + i * thumbH;
    ctx.save();
    rr(ctx, pad + 10, ty, leftW - 20, thumbH - 7, 6);
    ctx.clip();
    if (slot.image) ctx.drawImage(slot.image, pad + 10, ty, leftW - 20, thumbH - 7);
    ctx.restore();
    ctx.fillStyle = "rgba(10,2,20,0.72)";
    ctx.fillRect(pad + 10, ty + thumbH - 26, leftW - 20, 19);
    label(ctx, CAST[i].role, pad + 15, ty + thumbH - 24, 10, "#ffe9a8");
    if (i === state.selectedPanel) {
      ctx.strokeStyle = "#ff2e88";
      ctx.lineWidth = 2.5;
      rr(ctx, pad + 9, ty - 1, leftW - 18, thumbH - 5, 7);
      ctx.stroke();
    }
  });
  button(ctx, pad + 10, top + bodyH - 34, leftW - 20, 26, "+ Load photo", false, "#ffb03a");

  // centre: live preview of the real cover
  const preview = env.createCanvas(1080, 1080);
  drawCover(preview.getContext("2d"), 1080, 1080, state, env);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 22;
  ctx.fillStyle = "#000000";
  const pvH = bodyH - 44;
  const pvW = Math.min(midW, pvH);
  const pvX = midX + (midW - pvW) / 2;
  ctx.fillRect(pvX, top, pvW, pvH);
  ctx.restore();
  ctx.drawImage(preview, pvX, top, pvW, pvH);
  label(ctx, "LIVE PREVIEW - drag a panel to reposition its photo", midX, top + pvH + 12, 12, "#a78fd6", 400);

  // right: controls
  const rx = w - rightW - pad;
  panel(ctx, rx, top, rightW, bodyH, "#1d1136");
  let cy = top + 12;
  label(ctx, "LAYOUT", rx + 12, cy, 13, "#ffd23e");
  cy += 22;
  LAYOUTS.forEach((layout, i) => {
    const bx = rx + 12 + (i % 2) * ((rightW - 30) / 2 + 6);
    const by = cy + Math.floor(i / 2) * 34;
    button(ctx, bx, by, (rightW - 30) / 2, 28, layout.name, state.layout === layout.id, "#7b2ff7");
  });
  cy += 78;
  label(ctx, "COLOUR GRADE", rx + 12, cy, 13, "#ffd23e");
  cy += 24;
  swatches(ctx, rx + 12, cy, GRADES, state.gradeId, 40, (grade, sx, sy, size) => {
    const g = ctx.createLinearGradient(sx, sy, sx, sy + size);
    grade.sky.forEach((stop, i) => g.addColorStop(i / (grade.sky.length - 1), stop));
    ctx.fillStyle = g;
    rr(ctx, sx, sy, size, size, 6);
    ctx.fill();
  });
  label(ctx, GRADES.find((g) => g.id === state.gradeId).name, rx + 12, cy + 48, 11.5, "#f3e9ff", 400);
  cy += 76;
  label(ctx, "PANEL CROP", rx + 12, cy, 13, "#ffd23e");
  cy += 24;
  label(ctx, "Zoom", rx + 12, cy, 11, "#a78fd6", 400);
  slider(ctx, rx + 62, cy + 7, rightW - 86, 0.45);
  cy += 24;
  label(ctx, "Focus X", rx + 12, cy, 11, "#a78fd6", 400);
  slider(ctx, rx + 62, cy + 7, rightW - 86, state.slots[state.selectedPanel].focusX);
  cy += 24;
  label(ctx, "Focus Y", rx + 12, cy, 11, "#a78fd6", 400);
  slider(ctx, rx + 62, cy + 7, rightW - 86, state.slots[state.selectedPanel].focusY);
  cy += 36;
  label(ctx, "CAPTION", rx + 12, cy, 13, "#ffd23e");
  cy += 22;
  ctx.fillStyle = "#12081f";
  rr(ctx, rx + 12, cy, rightW - 24, 34, 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  rr(ctx, rx + 12, cy, rightW - 24, 34, 6);
  ctx.stroke();
  label(ctx, state.caption, rx + 20, cy + 10, 12.5, "#ffffff", 400);
  cy += 44;
  label(ctx, "Size", rx + 12, cy, 11, "#a78fd6", 400);
  slider(ctx, rx + 62, cy + 7, rightW - 86, state.captionSize / 90, "#ff2e88");
  cy += 26;
  button(ctx, rx + 12, cy, (rightW - 30) / 2, 26, "Outline", state.captionOutline);
  button(ctx, rx + 18 + (rightW - 30) / 2, cy, (rightW - 30) / 2, 26, "Shadow", state.captionShadow);
  cy += 40;
  label(ctx, "EXPORT SIZE", rx + 12, cy, 13, "#ffd23e");
  cy += 22;
  EXPORT_SIZES.forEach((size, i) => {
    button(ctx, rx + 12 + i * ((rightW - 24) / 3 + 2), cy, (rightW - 30) / 3, 28, size.w + "x" + size.h, i === 0, "#ffb03a");
  });
  cy += 38;
  button(ctx, rx + 12, cy, rightW - 24, 36, "Download PNG", true);
  return { preview: { x: pvX, y: top, w: pvW, h: pvH } };
}

// The same cover in the three post sizes, side by side on a studio backdrop.
export function drawSizes(ctx, w, h, state, env) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#1b0b33");
  grad.addColorStop(1, "#3d0a3a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.font = fontDisplay(900, Math.round(h * 0.045));
  ctx.fillStyle = "#ffd23e";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("ONE COVER - EVERY POST SIZE", w / 2, Math.round(h * 0.035));
  ctx.restore();
  const cells = [
    { size: EXPORT_SIZES[0], x: w * 0.03, y: h * 0.14, cw: w * 0.3 },
    { size: EXPORT_SIZES[1], x: w * 0.355, y: h * 0.14, cw: w * 0.24 },
    { size: EXPORT_SIZES[2], x: w * 0.625, y: h * 0.14, cw: w * 0.345 },
  ];
  for (const cell of cells) {
    const cw = cell.cw;
    const ch = (cw * cell.size.h) / cell.size.w;
    const off = env.createCanvas(cell.size.w, cell.size.h);
    drawCover(off.getContext("2d"), cell.size.w, cell.size.h, state, env);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#000";
    ctx.fillRect(cell.x, cell.y, cw, ch);
    ctx.restore();
    ctx.drawImage(off, cell.x, cell.y, cw, ch);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cell.x, cell.y, cw, ch);
    label(ctx, cell.size.name.toUpperCase(), cell.x, cell.y + ch + 14, 15, "#ffffff");
    label(ctx, cell.size.w + " x " + cell.size.h + " PNG", cell.x, cell.y + ch + 36, 12.5, "#cdbcf0", 400);
  }
}
