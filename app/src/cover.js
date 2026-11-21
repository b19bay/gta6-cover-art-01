// Velvet Hour — the cover renderer.
// Pure canvas drawing: no DOM lookups in here. The caller passes an env with
// a createCanvas factory, so the same code paints the live editor preview,
// the exported PNGs and the app's own screenshot scenes (in the browser via
// ?shot=..., and in Node via the screenshot script that drives this module).

import { CAST, layoutPanels } from "./cast.js";
import { gradeById, applyGradeToPixels, skyGradient } from "./grades.js";

export const EXPORT_SIZES = [
  { id: "square", name: "Square post", w: 1080, h: 1080 },
  { id: "portrait", name: "Portrait post", w: 1080, h: 1350 },
  { id: "wide", name: "Wide banner", w: 1920, h: 1080 },
];

export function defaultCoverState() {
  return {
    layout: "mosaic",
    gradeId: "sunset",
    title: "VELVET HOUR",
    subtitle: "every tide has a price",
    caption: "ONE CREW. ONE SUMMER. NO WAY BACK.",
    captionSize: 44,
    captionPos: "bottom",
    captionOutline: true,
    captionShadow: true,
    reviewQuote: "THE POSTER OF THE SUMMER",
    volume: "VOL. 1",
  };
}

const DISPLAY_FONT = '"Arial Black", "Liberation Sans", Arial, sans-serif';
const BODY_FONT = '"Helvetica Neue", "Liberation Sans", Arial, sans-serif';
const SCRIPT_FONT = '"Segoe Script", "Brush Script MT", "Liberation Serif", cursive';
const MONO_FONT = '"Courier New", "Liberation Mono", monospace';

export function fontDisplay(weight, px) {
  return weight + " " + px + "px " + DISPLAY_FONT;
}
export function fontBody(weight, px) {
  return weight + " " + px + "px " + BODY_FONT;
}
export function fontScript(px) {
  return "italic " + px + "px " + SCRIPT_FONT;
}
export function fontMono(px) {
  return px + "px " + MONO_FONT;
}

// Crop a source image into a panel rect honouring focus point and zoom.
export function coverSourceRect(imgW, imgH, rectW, rectH, focusX, focusY, zoom) {
  const scale = Math.max(rectW / imgW, rectH / imgH) * (zoom || 1);
  const sw = rectW / scale;
  const sh = rectH / scale;
  const cx = Math.max(0, Math.min(1, focusX === undefined ? 0.5 : focusX));
  const cy = Math.max(0, Math.min(1, focusY === undefined ? 0.4 : focusY));
  let sx = cx * imgW - sw / 2;
  let sy = cy * imgH - sh / 2;
  sx = Math.max(0, Math.min(imgW - sw, sx));
  sy = Math.max(0, Math.min(imgH - sh, sy));
  return { sx, sy, sw, sh };
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arc(x + w - rr, y + rr, rr, -Math.PI / 2, 0);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arc(x + w - rr, y + h - rr, rr, 0, Math.PI / 2);
  ctx.lineTo(x + rr, y + h);
  ctx.arc(x + rr, y + h - rr, rr, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + rr);
  ctx.arc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5);
  ctx.closePath();
}

// Draw one photo panel: the image graded on an offscreen canvas, clipped to
// a rounded rect with a poster-white border.
export function drawPanelPhoto(ctx, env, slot, rect, grade, borderPx) {
  const img = slot.image;
  if (!img) {
    ctx.fillStyle = "#241536";
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 6);
    ctx.fill();
    return;
  }
  const off = env.createCanvas(Math.max(2, Math.round(rect.w)), Math.max(2, Math.round(rect.h)));
  const octx = off.getContext("2d");
  const src = coverSourceRect(img.width, img.height, rect.w, rect.h, slot.focusX, slot.focusY, slot.zoom);
  octx.drawImage(img, src.sx, src.sy, src.sw, src.sh, 0, 0, off.width, off.height);
  const pixels = octx.getImageData(0, 0, off.width, off.height);
  applyGradeToPixels(pixels.data, off.width, off.height, grade, slot.hero ? 0.42 : 0.55);
  octx.putImageData(pixels, 0, 0);
  ctx.save();
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 6);
  ctx.clip();
  ctx.drawImage(off, rect.x, rect.y);
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.lineWidth = borderPx;
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 6);
  ctx.stroke();
}

// A slanted role tag lettered across the lower corner of a panel.
export function drawRoleTag(ctx, role, rect, hero) {
  let px = Math.max(11, Math.min(30, rect.w * (hero ? 0.11 : 0.16)));
  ctx.save();
  ctx.font = fontDisplay(900, px);
  while (ctx.measureText(role).width > rect.w * 0.92 && px > 8) {
    px -= 1;
    ctx.font = fontDisplay(900, px);
  }
  const tw = ctx.measureText(role).width;
  const padX = px * 0.55;
  const tagW = tw + padX * 2;
  const tagH = px * 1.5;
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h - tagH * 0.72;
  ctx.translate(cx, cy);
  ctx.rotate(-0.055);
  ctx.fillStyle = hero ? "#ffd23e" : "rgba(12,4,24,0.82)";
  ctx.fillRect(-tagW / 2, -tagH / 2, tagW, tagH);
  ctx.fillStyle = hero ? "#2b0a2e" : "#ffe9a8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(role, 0, px * 0.04);
  ctx.restore();
}

function drawStar(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// The chrome title: gold-to-magenta gradient fill, dark keyline, hard shadow.
export function drawChromeTitle(ctx, text, cx, topY, px, maxWidth) {
  ctx.save();
  ctx.font = fontDisplay(900, px);
  let size = px;
  while (ctx.measureText(text).width > maxWidth && size > 18) {
    size -= 4;
    ctx.font = fontDisplay(900, size);
  }
  const grad = ctx.createLinearGradient(0, topY, 0, topY + size * 1.25);
  grad.addColorStop(0, "#fff6c9");
  grad.addColorStop(0.32, "#ffd23e");
  grad.addColorStop(0.55, "#ff8a3c");
  grad.addColorStop(0.78, "#ff2e88");
  grad.addColorStop(1, "#b967ff");
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(20,0,30,0.85)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = size * 0.07;
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.strokeStyle = "#2b0a2e";
  ctx.strokeText(text, cx, topY);
  ctx.shadowColor = "rgba(0,0,0,0)";
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = grad;
  ctx.fillText(text, cx, topY);
  // chrome highlight line through the upper third
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "#ffffff";
  const tw = ctx.measureText(text).width;
  ctx.fillRect(cx - tw / 2, topY + size * 0.3, tw, Math.max(2, size * 0.045));
  ctx.restore();
  ctx.restore();
  return size;
}

export function drawScriptLine(ctx, text, cx, y, px, color) {
  ctx.save();
  ctx.font = fontScript(px);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.shadowColor = color;
  ctx.shadowBlur = px * 0.45;
  ctx.fillStyle = "#ffeef7";
  ctx.fillText(text, cx, y);
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.fillText(text, cx, y);
  ctx.restore();
}

// The gold award seal, overlapping the panel wall's lower right corner.
export function drawSeal(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.15, cx, cy, r);
  grad.addColorStop(0, "#fff3b0");
  grad.addColorStop(0.6, "#f5b921");
  grad.addColorStop(1, "#b97a06");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.strokeStyle = "#7a4d02";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(122,77,2,0.75)";
  ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.stroke();
  drawStar(ctx, cx, cy - r * 0.34, r * 0.2, "#7a4d02");
  ctx.fillStyle = "#5c3a02";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = fontDisplay(900, r * 0.3);
  ctx.fillText("BEST CREW", cx, cy + r * 0.08);
  ctx.font = fontDisplay(900, r * 0.34);
  ctx.fillText("2026", cx, cy + r * 0.42);
  ctx.restore();
}

// A deterministic barcode grown from the title's characters.
export function drawBarcode(ctx, x, y, w, h, seedText) {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#111111";
  let seed = 7;
  for (let i = 0; i < seedText.length; i++) seed = (seed * 31 + seedText.charCodeAt(i)) % 9973;
  let bx = x + w * 0.06;
  const innerW = w * 0.88;
  let drawn = 0;
  while (drawn < innerW) {
    seed = (seed * 137 + 71) % 9973;
    const barW = 1 + (seed % 4);
    if (seed % 3 !== 0) ctx.fillRect(bx, y + h * 0.1, barW, h * 0.68);
    bx += barW + 1 + (seed % 3);
    drawn = bx - x;
  }
  ctx.font = fontMono(Math.max(8, h * 0.16));
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("VH 2026 1101", x + w / 2, y + h * 0.96);
  ctx.restore();
}

export function drawReviewStrip(ctx, x, y, quote, scale) {
  ctx.save();
  const r = 11 * scale;
  for (let i = 0; i < 5; i++) drawStar(ctx, x + r + i * r * 2.3, y + r, r, "#ffd23e");
  ctx.font = fontBody(700, 15 * scale);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 4 * scale;
  ctx.fillText('"' + quote + '"', x + r * 12.4, y + r);
  ctx.restore();
}

export function drawCreditsBlock(ctx, cx, y, w, scale) {
  const lines = [
    "VELVET HOUR PICTURES PRESENTS A SUNSET CREW PRODUCTION",
    "THE BOSS  THE DRIVER  THE SIREN  THE FIXER  THE CAPTAIN  THE GHOST  THE LEDGER  THE WHEELMAN",
    "CASTING BY THE TIDE - COSTUMES BY THE BOARDWALK - MUSIC BY THE HARBOUR LIGHTS",
    "NO CREW WAS PAID IN FULL. EVERY TIDE HAS A PRICE.",
  ];
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  lines.forEach((line, i) => {
    ctx.font = fontBody(i === 1 ? 700 : 400, (i === 1 ? 10.5 : 9.5) * scale);
    ctx.fillText(line, cx, y + i * 13 * scale, w);
  });
  ctx.restore();
}

// The full cover. state.slots: [{image, focusX, focusY, zoom, role, hero}]
// in cast order; the layout decides where each slot lands.
export function drawCover(ctx, w, h, state, env) {
  const grade = gradeById(state.gradeId);
  const slots = state.slots;
  // sky and sun
  ctx.fillStyle = skyGradient(ctx, grade, 0, 0, w, h);
  ctx.fillRect(0, 0, w, h);
  const sunR = Math.min(w, h) * 0.16;
  const sunGrad = ctx.createRadialGradient(w * 0.78, h * 0.3, sunR * 0.1, w * 0.78, h * 0.3, sunR);
  sunGrad.addColorStop(0, "rgba(255,236,170,0.95)");
  sunGrad.addColorStop(0.7, "rgba(255,170,80,0.55)");
  sunGrad.addColorStop(1, "rgba(255,120,90,0)");
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(w * 0.78, h * 0.3, sunR, 0, Math.PI * 2);
  ctx.fill();

  const margin = Math.round(w * 0.035);
  const titlePx = Math.round(Math.min(w * 0.105, h * 0.115));
  const titleY = Math.round(h * 0.028);
  const usedTitle = drawChromeTitle(ctx, state.title, w / 2, titleY, titlePx, w - margin * 2);
  const subY = titleY + usedTitle * 1.22;
  drawScriptLine(ctx, state.subtitle, w / 2, subY, Math.round(usedTitle * 0.42), "#ff5ea8");

  // volume marker, top left
  ctx.save();
  ctx.font = fontDisplay(900, Math.max(13, w * 0.02));
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 5;
  ctx.fillText(state.volume, margin, titleY + 2);
  ctx.restore();

  // panel wall
  const wallX = margin;
  const wallY = Math.round(subY + usedTitle * 0.52);
  const wallW = w - margin * 2;
  const wallH = Math.round(h * 0.845) - wallY;
  const rects = layoutPanels(state.layout, wallW, wallH);
  const borderPx = Math.max(2, Math.round(w * 0.0035));
  for (let i = 0; i < rects.length; i++) {
    const slot = slots[i];
    if (!slot) continue;
    const rect = { x: wallX + rects[i].x, y: wallY + rects[i].y, w: rects[i].w, h: rects[i].h };
    drawPanelPhoto(ctx, env, slot, rect, grade, borderPx);
  }
  // role tags
  for (let i = 0; i < rects.length; i++) {
    const slot = slots[i];
    if (!slot) continue;
    const rect = { x: wallX + rects[i].x, y: wallY + rects[i].y, w: rects[i].w, h: rects[i].h };
    drawRoleTag(ctx, slot.role, rect, rects[i].hero);
  }
  // hero pop-out: the hero photo redrawn larger, breaking the wall's top edge
  const heroIndex = rects.findIndex((r) => r.hero);
  if (heroIndex >= 0 && slots[heroIndex] && slots[heroIndex].image) {
    const hr = rects[heroIndex];
    const pop = {
      x: wallX + hr.x - wallW * 0.012,
      y: wallY + hr.y - wallH * 0.05,
      w: hr.w * 1.05,
      h: hr.h * 1.05,
    };
    ctx.save();
    ctx.shadowColor = "rgba(10,0,20,0.8)";
    ctx.shadowBlur = Math.round(w * 0.02);
    ctx.shadowOffsetY = Math.round(h * 0.012);
    ctx.fillStyle = "#160a24";
    roundRectPath(ctx, pop.x, pop.y, pop.w, pop.h, 8);
    ctx.fill();
    ctx.restore();
    drawPanelPhoto(ctx, env, slots[heroIndex], pop, grade, borderPx + 1);
    drawRoleTag(ctx, slots[heroIndex].role, pop, true);
  }

  // seal overlapping the wall's lower right
  const sealR = Math.min(w, h) * 0.075;
  drawSeal(ctx, wallX + wallW - sealR * 0.55, wallY + wallH - sealR * 0.4, sealR);

  // review strip above the caption line, left side
  const scale = Math.max(0.7, w / 1080);
  drawReviewStrip(ctx, margin, Math.round(h * 0.848), state.reviewQuote, scale);

  // caption — the user's own words, lettered poster-style
  const capPx = Math.round(state.captionSize * (w / 1080) * 1.25);
  ctx.save();
  ctx.font = fontDisplay(900, capPx);
  let capY = Math.round(h * 0.905);
  if (state.captionPos === "top") capY = Math.round(h * 0.155);
  if (state.captionPos === "center") capY = Math.round(h * 0.52);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (state.captionShadow) {
    ctx.shadowColor = "rgba(15,0,25,0.9)";
    ctx.shadowBlur = capPx * 0.18;
    ctx.shadowOffsetY = capPx * 0.06;
  }
  if (state.captionOutline) {
    ctx.lineWidth = Math.max(2, capPx * 0.14);
    ctx.strokeStyle = "#1c0526";
    ctx.strokeText(state.caption, w / 2, capY, w - margin * 2);
  }
  const capGrad = ctx.createLinearGradient(0, capY - capPx / 2, 0, capY + capPx / 2);
  capGrad.addColorStop(0, "#ffffff");
  capGrad.addColorStop(1, "#ffd9ec");
  ctx.fillStyle = capGrad;
  ctx.fillText(state.caption, w / 2, capY, w - margin * 2);
  ctx.restore();

  drawCreditsBlock(ctx, w / 2, Math.round(h * 0.932), w - margin * 2, scale);
  drawBarcode(ctx, w - margin - Math.round(w * 0.085), Math.round(h * 0.852), Math.round(w * 0.085), Math.round(h * 0.048), state.title);

  // coming soon band along the very bottom
  const bandH = Math.round(h * 0.032);
  ctx.fillStyle = "#12041f";
  ctx.fillRect(0, h - bandH, w, bandH);
  ctx.save();
  ctx.font = fontDisplay(900, Math.round(bandH * 0.58));
  ctx.fillStyle = "#ffd23e";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("C O M I N G   S O O N", w / 2, h - bandH / 2);
  ctx.restore();
  return { wall: { x: wallX, y: wallY, w: wallW, h: wallH }, titlePx: usedTitle };
}

export function castSlots(images) {
  return CAST.map((member, i) => ({
    image: images[i] || null,
    focusX: 0.5,
    focusY: 0.38,
    zoom: 1,
    role: member.role,
    hero: i === 0,
  }));
}
