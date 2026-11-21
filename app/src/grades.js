// grades.js -- the unified colour grades. One grade is applied to every
// panel of a cover so a mosaic of different photos reads as one poster.
// Pure pixel maths: works on any ImageData-like { data, width, height }.

const GRADE_PARAMS = {
  // Sunset Gold: the house grade -- warm, rich, gentle contrast.
  gold: { sat: 1.27, con: 1.07, mul: [1.07, 1.00, 0.86], shadow: [0.10, 0.03, -0.05], high: [-0.01, 0.01, 0.03], duo: 0.0 },
  // Vice Sunset: hotter orange-teal duotone lean.
  sunset: { sat: 1.34, con: 1.10, mul: [1.10, 0.97, 0.80], shadow: [0.13, 0.02, -0.08], high: [-0.04, 0.03, 0.08], duo: 0.16 },
  // Neon Nights: magenta shadows, teal highlights, punchy saturation.
  neon: { sat: 1.42, con: 1.13, mul: [1.04, 0.96, 1.06], shadow: [0.10, -0.04, 0.10], high: [-0.06, 0.06, 0.09], duo: 0.08 },
  // Dusk Teal: cooler, moodier, warm skin kept by the highlight tint.
  dusk: { sat: 1.12, con: 1.15, mul: [0.96, 1.02, 1.10], shadow: [-0.03, 0.04, 0.09], high: [0.05, 0.02, -0.02], duo: 0.05 },
};

export function gradeParams(gradeId) {
  return GRADE_PARAMS[gradeId] || GRADE_PARAMS.gold;
}

// Apply a grade in place to an ImageData-like object.
export function applyGradeToPixels(imageData, gradeId) {
  const p = gradeParams(gradeId);
  const d = imageData.data;
  const [rm, gm, bm] = p.mul;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // saturation around luminance
    r = lum + (r - lum) * p.sat;
    g = lum + (g - lum) * p.sat;
    b = lum + (b - lum) * p.sat;
    // contrast around mid grey
    r = (r - 0.5) * p.con + 0.5;
    g = (g - 0.5) * p.con + 0.5;
    b = (b - 0.5) * p.con + 0.5;
    // channel balance
    r *= rm; g *= gm; b *= bm;
    // shadow / highlight tints (split tone)
    const sw = (1 - lum) * (1 - lum);
    const hw = lum * lum;
    r += p.shadow[0] * sw + p.high[0] * hw;
    g += p.shadow[1] * sw + p.high[1] * hw;
    b += p.shadow[2] * sw + p.high[2] * hw;
    // optional duotone lean: warm shadows, teal highlights
    if (p.duo > 0) {
      r = duotoneMix(r, lum, p.duo, 1.00, 0.12);
      g = duotoneMix(g, lum, p.duo, 0.47, 0.62);
      b = duotoneMix(b, lum, p.duo, 0.16, 0.72);
    }
    d[i] = Math.max(0, Math.min(255, Math.round(r * 255)));
    d[i + 1] = Math.max(0, Math.min(255, Math.round(g * 255)));
    d[i + 2] = Math.max(0, Math.min(255, Math.round(b * 255)));
  }
  return imageData;
}

// Blend a channel toward a two-tone ramp (shadowTone at black, highTone at
// white) by k, keeping the pixel's own luminance as the ramp position.
function duotoneMix(channel, lum, k, shadowTone, highTone) {
  const target = shadowTone * (1 - lum) + highTone * lum;
  return channel * (1 - k) + target * k;
}
