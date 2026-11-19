// Caption lettering: word-wrap to at most two lines, auto-fit to the
// cover width, and draw in the bundled Anton face with a heavy outline and
// a drop shadow. Pure canvas, no DOM.
export const CAPTION_FONT = 'Anton, "Arial Narrow", sans-serif';

/** Splits `text` into at most two balanced lines (upper-cased). */
export function wrapCaption(text) {
  const words = text.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  if (words.length === 1) return [words[0]];
  // Balance two lines by character count.
  let best = null;
  for (let i = 1; i < words.length; i += 1) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const diff = Math.abs(a.length - b.length);
    if (!best || diff < best.diff) best = { lines: [a, b], diff };
  }
  return best.lines;
}

/**
 * Draws the caption centred in a band at the top or bottom of a W x H
 * cover. `position` is 'top' or 'bottom'. Returns the lines drawn.
 */
export function drawCaption(ctx, text, W, H, accent, position = 'bottom') {
  const clean = text.trim().toUpperCase();
  if (!clean) return [];
  const zoneH = H * 0.3;
  const y0 = position === 'top' ? 0 : H - zoneH;
  // Scrim so the letters read over any photo.
  const scrim = ctx.createLinearGradient(0, y0, 0, y0 + zoneH);
  if (position === 'top') {
    scrim.addColorStop(0, 'rgba(0, 0, 0, 0.62)');
    scrim.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else {
    scrim.addColorStop(0, 'rgba(0, 0, 0, 0)');
    scrim.addColorStop(1, 'rgba(0, 0, 0, 0.62)');
  }
  ctx.fillStyle = scrim;
  ctx.fillRect(0, y0, W, zoneH);

  // One line when it fits, two balanced lines when it does not; then grow
  // the type to fill the width (capped), and shrink it back if it overflows.
  let size = H * 0.135;
  const setFont = () => { ctx.font = `${size}px ${CAPTION_FONT}`; };
  setFont();
  let lines = [clean];
  if (ctx.measureText(clean).width > W * 0.9) lines = wrapCaption(clean);
  const widest = () => Math.max(...lines.map((l) => ctx.measureText(l).width));
  while (widest() < W * 0.88 && size < H * 0.22) {
    size += 4;
    setFont();
  }
  while (widest() > W * 0.9 && size > 18) {
    size -= 3;
    setFont();
  }
  try { ctx.letterSpacing = `${Math.max(1, size * 0.02)}px`; } catch { /* older canvas */ }
  setFont();
  const lineH = size * 1.04;
  const blockH = lineH * lines.length;
  // Anchor the block: bottom captions sit H*0.05 above the foot, top
  // captions H*0.045 below the head. baseY is the first line's centre.
  const firstLineCentre = position === 'top'
    ? y0 + H * 0.045 + blockH / 2 - ((lines.length - 1) * lineH) / 2
    : y0 + zoneH - H * 0.05 - blockH / 2 - ((lines.length - 1) * lineH) / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = size * 0.14;
  ctx.shadowOffsetY = size * 0.04;
  lines.forEach((line, i) => {
    const y = firstLineCentre + i * lineH;
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = Math.max(4, size * 0.14);
    ctx.strokeText(line, W / 2, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, W / 2, y);
  });
  ctx.shadowColor = 'rgba(0, 0, 0, 0)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  // Accent rule just outside the text block (below it on top captions,
  // above it on bottom captions).
  const ruleW = W * 0.16;
  const ruleY = position === 'top'
    ? firstLineCentre + blockH / 2 + size * 0.18
    : firstLineCentre - lineH / 2 - size * 0.3;
  ctx.fillStyle = accent;
  ctx.fillRect((W - ruleW) / 2, ruleY, ruleW, Math.max(3, H * 0.006));
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  return lines;
}
