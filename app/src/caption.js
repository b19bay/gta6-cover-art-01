// Caption model and lettering for the cover composer.
// The caption is drawn from a glyph mask the surface rasterizes (the bundled
// Anton font in the browser, the same file in the shot renderer), then the
// core paints that mask three times: a soft offset shadow, a thick outline,
// and the gradient fill. Keeping the painting in the core means the lettering
// looks identical in the live preview, the export and the screenshots.

export const CAPTION_FONT = 'Anton';

export function defaultCaption() {
  return {
    text: 'SUNSET HEIST',
    size: 0.16,
    placement: 'bottom',
    uppercase: true,
    outline: true,
    shadow: true,
  };
}

export function displayText(caption) {
  const raw = (caption.text || '').trim();
  const shown = raw === '' ? 'YOUR TITLE' : raw;
  return caption.uppercase ? shown.toUpperCase() : shown;
}

// Where the caption box sits, in cover pixels. Bottom overlaps the lowest
// panels, top sits under the top edge, centre floats over the middle seam.
export function captionBox(caption, width, height) {
  const margin = Math.round(width * 0.045);
  const boxHeight = Math.round(height * caption.size * 1.9);
  let y;
  if (caption.placement === 'top') {
    y = Math.round(height * 0.05);
  } else if (caption.placement === 'center') {
    y = Math.round((height - boxHeight) / 2);
  } else {
    y = height - boxHeight - Math.round(height * 0.045);
  }
  return { x: margin, y, w: width - margin * 2, h: boxHeight };
}

// Shrink the type until the rasterized line fits the box width, then centre
// it. Returns the mask and the size that fit, so the caller never guesses.
export function fitCaptionMask(surface, caption, box, grade) {
  const text = displayText(caption);
  let px = Math.round(box.h * 0.78);
  const minPx = Math.max(12, Math.round(box.h * 0.22));
  let mask = surface.rasterizeText(text, px);
  while (mask.width > box.w && px > minPx) {
    px = Math.round(px * 0.88);
    mask = surface.rasterizeText(text, px);
  }
  return { mask, px };
}

function rgbaString([r, g, b, a]) {
  return `rgba(${r},${g},${b},${a})`;
}

// Paint one caption line: shadow, outline, gradient fill. The outline is
// the mask stamped at eight neighbour offsets; the fill is the grade's
// caption gradient running top to bottom through the mask.
export function drawCaption(surface, caption, box, grade) {
  const text = displayText(caption);
  if (!text) return;
  const { mask, px } = fitCaptionMask(surface, caption, box, grade);
  const dx = Math.round(box.x + (box.w - mask.width) / 2);
  const dy = Math.round(box.y + (box.h - mask.height) / 2);
  const outlinePx = Math.max(2, Math.round(px * 0.055));
  const shadowDx = Math.round(px * 0.045);
  const shadowDy = Math.round(px * 0.06);

  if (caption.shadow) {
    surface.drawMask(mask, dx + shadowDx, dy + shadowDy, {
      kind: 'color',
      color: [0, 0, 0, 0.55],
    });
  }
  if (caption.outline) {
    const outlineFill = { kind: 'color', color: [10, 8, 16, 1] };
    for (let ox = -outlinePx; ox <= outlinePx; ox += Math.max(1, Math.round(outlinePx / 2))) {
      for (let oy = -outlinePx; oy <= outlinePx; oy += Math.max(1, Math.round(outlinePx / 2))) {
        if (ox === 0 && oy === 0) continue;
        if (Math.abs(ox) + Math.abs(oy) > outlinePx * 1.6) continue;
        surface.drawMask(mask, dx + ox, dy + oy, outlineFill);
      }
    }
  }
  const [top, bottom] = grade.captionGradient;
  surface.drawMask(mask, dx, dy, {
    kind: 'gradient',
    vertical: true,
    stops: [
      [0, [...top, 1]],
      [1, [...bottom, 1]],
    ],
  });
}

// A small sub-caption strip under the main title, for a tagline or a date.
export function drawTagline(surface, tagline, width, height) {
  if (!tagline || !tagline.trim()) return;
  const px = Math.max(14, Math.round(height * 0.028));
  const mask = surface.rasterizeText(tagline.toUpperCase(), px);
  const dx = Math.round((width - mask.width) / 2);
  const dy = Math.round(height * 0.028);
  surface.drawMask(mask, dx, dy, { kind: 'color', color: [255, 255, 255, 0.92] });
}

export { rgbaString };
