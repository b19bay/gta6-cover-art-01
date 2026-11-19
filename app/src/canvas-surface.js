// Browser surface: adapts a real 2D canvas context to the interface the
// render core expects. All the drawing decisions live in render-core.js;
// this file only translates them into canvas calls, plus the one thing only
// a browser can do: rasterize text with the bundled font.

import { CAPTION_FONT } from './caption.js';
import { applyGradeToPixels } from './grades.js';
import { pointInPolygon } from './layouts.js';

function parseColor(color) {
  if (Array.isArray(color)) {
    const [r, g, b, a] = color;
    return `rgba(${r},${g},${b},${a})`;
  }
  return color;
}

function gradientFor(ctx, spec, x, y, w, h) {
  const grad = spec.vertical
    ? ctx.createLinearGradient(x, y, x, y + h)
    : ctx.createLinearGradient(x, y, x + w, y);
  for (const [offset, color] of spec.stops) {
    grad.addColorStop(offset, parseColor(color));
  }
  return grad;
}

class BrowserSurface {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
  }

  createLayer(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    return new BrowserSurface(canvas);
  }

  drawLayer(layer, x, y, panel) {
    const ctx = this.ctx;
    ctx.save();
    if (panel && panel.kind === 'poly') {
      ctx.beginPath();
      panel.points.forEach(([px, py], i) => {
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.clip();
    }
    ctx.drawImage(layer.canvas, Math.round(x), Math.round(y));
    ctx.restore();
  }

  fillRect(x, y, w, h, color) {
    this.ctx.fillStyle = parseColor(color);
    this.ctx.fillRect(x, y, w, h);
  }

  fillRectGradient(x, y, w, h, spec) {
    this.ctx.fillStyle = gradientFor(this.ctx, spec, x, y, w, h);
    this.ctx.fillRect(x, y, w, h);
  }

  fillCircle(x, y, r, color) {
    const ctx = this.ctx;
    ctx.fillStyle = parseColor(color);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  drawImageCover(image, x, y, w, h, srcRect) {
    this.ctx.drawImage(
      image,
      srcRect.sx, srcRect.sy, srcRect.sw, srcRect.sh,
      x, y, w, h,
    );
  }

  applyGrade(pixelFn) {
    const ctx = this.ctx;
    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    applyGradeToPixels(imageData.data, pixelFn);
    ctx.putImageData(imageData, 0, 0);
  }

  rasterizeText(text, px) {
    const font = `${px}px ${CAPTION_FONT}, sans-serif`;
    const measure = document.createElement('canvas').getContext('2d');
    measure.font = font;
    const metrics = measure.measureText(text);
    const width = Math.max(1, Math.ceil(metrics.width));
    const height = Math.max(1, Math.ceil(px * 1.25));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.font = font;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 0, Math.round(px * 0.95));
    const imageData = ctx.getImageData(0, 0, width, height);
    return { width, height, data: imageData.data, canvas };
  }

  // Paint an alpha mask with a colour or a vertical gradient. The mask's
  // own canvas is re-tinted through an offscreen pass, then stamped down.
  drawMask(mask, x, y, fill) {
    const ctx = this.ctx;
    const tinted = document.createElement('canvas');
    tinted.width = mask.width;
    tinted.height = mask.height;
    const tctx = tinted.getContext('2d');
    tctx.drawImage(mask.canvas, 0, 0);
    tctx.globalCompositeOperation = 'source-in';
    if (fill.kind === 'gradient') {
      tctx.fillStyle = gradientFor(tctx, fill, 0, 0, mask.width, mask.height);
    } else {
      tctx.fillStyle = parseColor(fill.color);
    }
    tctx.fillRect(0, 0, mask.width, mask.height);
    ctx.drawImage(tinted, Math.round(x), Math.round(y));
  }
}

export function makeBrowserSurface(canvas) {
  return new BrowserSurface(canvas);
}

// The preview canvas the editor shows: sized to the cover's aspect ratio,
// capped so the live preview stays fast.
export function previewSizeFor(coverWidth, coverHeight, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(coverWidth, coverHeight));
  return {
    width: Math.max(2, Math.round(coverWidth * scale)),
    height: Math.max(2, Math.round(coverHeight * scale)),
  };
}

export { pointInPolygon };
