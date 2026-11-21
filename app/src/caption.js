// caption.js — the bold poster lettering of Cover Heist.
// One drawCaption call paints the whole caption block: an optional kicker
// line, the headline wrapped to the cover width in a heavy condensed
// system font stack (no font file is shipped), a sunset gradient fill, a
// thick dark outline and a hard offset shadow — the genre's lettering,
// drawn with plain canvas text so it works identically in the browser
// editor and in the Node screenshot renderer.

export const FONT_STACK = '"Arial Narrow", "Helvetica Neue Condensed", Impact, "Haettenschweiler", "Franklin Gothic Medium", sans-serif';
export const SCRIPT_STACK = '"Segoe Script", "Brush Script MT", "Comic Sans MS", cursive';

export const CAPTION_PLACEMENTS = ['bottom', 'top', 'center'];

export function captionFont(px, script = false) {
  return `900 ${Math.round(px)}px ${script ? SCRIPT_STACK : FONT_STACK}`;
}

// wrapCaption(ctx, text, maxWidth) -> array of lines that fit maxWidth.
export function wrapCaption(ctx, text, maxWidth) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let line = words[0];
  for (let i = 1; i < words.length; i++) {
    const trial = `${line} ${words[i]}`;
    if (ctx.measureText(trial).width <= maxWidth || line.length >= 14) {
      line = trial;
    } else {
      lines.push(line);
      line = words[i];
    }
  }
  lines.push(line);
  return lines.slice(0, 3);
}

function gradientFor(ctx, x, y, h) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#fff7e0');
  g.addColorStop(0.45, '#ffd23e');
  g.addColorStop(0.75, '#ff7a3c');
  g.addColorStop(1, '#ff2e88');
  return g;
}

// drawCaption(ctx, caption, W, H)
// caption: { text, kicker, size (0.6..1.6 scale), placement, outline }
export function drawCaption(ctx, caption, W, H) {
  const text = (caption.text || '').trim();
  if (!text && !(caption.kicker || '').trim()) return;
  const scale = Math.min(1.6, Math.max(0.6, caption.size || 1));
  const margin = W * 0.055;
  const maxWidth = W - margin * 2;
  let px = Math.min(W, H) * 0.115 * scale;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  // Shrink the headline until its longest wrapped line fits the cover.
  for (let tries = 0; tries < 24; tries++) {
    ctx.font = captionFont(px);
    const lines = wrapCaption(ctx, text, maxWidth);
    const widest = Math.max(0, ...lines.map((l) => ctx.measureText(l).width));
    if (widest <= maxWidth || px <= 18) break;
    px *= 0.92;
  }
  ctx.font = captionFont(px);
  const lines = wrapCaption(ctx, text, maxWidth);
  const lineHeight = px * 1.02;
  const kickerPx = px * 0.30;
  const blockH = lines.length * lineHeight + (caption.kicker ? kickerPx * 1.7 : 0);
  let baseline;
  if (caption.placement === 'top') baseline = margin + blockH - lineHeight * 0.22;
  else if (caption.placement === 'center') baseline = H / 2 + blockH / 2 - lineHeight * 0.22;
  else baseline = H - margin - lineHeight * 0.18;
  const cx = W / 2;

  ctx.save();
  if (caption.kicker) {
    const kickerY = baseline - lines.length * lineHeight - kickerPx * 0.55;
    ctx.font = captionFont(kickerPx, true);
    ctx.lineWidth = Math.max(2, kickerPx * 0.16);
    ctx.strokeStyle = 'rgba(20,6,24,0.9)';
    ctx.fillStyle = '#7df9ff';
    ctx.strokeText(caption.kicker, cx, kickerY);
    ctx.fillText(caption.kicker, cx, kickerY);
    ctx.font = captionFont(px);
  }
  lines.forEach((line, i) => {
    const y = baseline - (lines.length - 1 - i) * lineHeight;
    // Hard poster shadow, then outline, then the sunset gradient face.
    ctx.fillStyle = 'rgba(24,4,32,0.85)';
    ctx.fillText(line, cx + px * 0.07, y + px * 0.07);
    if (caption.outline !== false) {
      ctx.lineWidth = Math.max(3, px * 0.16);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1c0b26';
      ctx.strokeText(line, cx, y);
    }
    ctx.fillStyle = gradientFor(ctx, cx, y - px, lineHeight);
    ctx.fillText(line, cx, y);
  });
  ctx.restore();
}
