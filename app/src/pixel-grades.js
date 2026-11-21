// pixel-grades.js — the four colour grades of Cover Heist.
// Each grade is a pure pixel operation over an ImageData-shaped object
// ({ data, width, height }), so the exact same code grades a cover in the
// browser editor (on the real canvas) and in the Node screenshot renderer
// (on the in-session canvas shim). No DOM, no network, no dependencies.

export const GRADES = [
  { id: 'sunset', name: 'Vice Sunset', blurb: 'Warm gold highlights, teal shadows' },
  { id: 'neon', name: 'Neon Nights', blurb: 'Magenta and cyan night glow' },
  { id: 'golden', name: 'Golden Hour', blurb: 'Soft amber film warmth' },
  { id: 'midnight', name: 'Midnight Teal', blurb: 'Deep teal night, hot highlights' },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

function clamp255(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

// Per-grade channel curves, expressed as small lookup tables built once.
// lift/gamma/gain per channel plus a saturation push and a split-tone mix.
const CURVES = {
  sunset:   { r: [14, 1.06, 1.10], g: [6, 1.02, 1.00], b: [-8, 0.96, 0.92], sat: 1.28, warm: 0.20 },
  neon:     { r: [10, 1.05, 1.06], g: [-4, 0.98, 0.98], b: [16, 1.04, 1.12], sat: 1.38, warm: -0.10 },
  golden:   { r: [12, 1.03, 1.06], g: [8, 1.01, 1.00], b: [-14, 0.94, 0.88], sat: 1.16, warm: 0.30 },
  midnight: { r: [-6, 1.00, 0.98], g: [8, 1.02, 1.04], b: [18, 1.05, 1.10], sat: 1.22, warm: -0.22 },
};

function buildTable(channel, curve) {
  const [lift, gamma, gain] = curve;
  const table = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    const unit = Math.pow(i / 255, 1 / gamma);
    table[i] = clamp255(lift + unit * 255 * gain);
  }
  return table;
}

const tableCache = new Map();
function tablesFor(gradeId) {
  if (!tableCache.has(gradeId)) {
    const c = CURVES[gradeId] || CURVES.sunset;
    tableCache.set(gradeId, {
      r: buildTable('r', c.r), g: buildTable('g', c.g), b: buildTable('b', c.b),
      sat: c.sat, warm: c.warm,
    });
  }
  return tableCache.get(gradeId);
}

// applyGradeToPixels(imageData, gradeId) -> imageData (mutated in place).
// Split toning: shadows lean teal, highlights lean warm (or the reverse for
// the night grades), then the channel curves and a saturation push run.
export function applyGradeToPixels(imageData, gradeId) {
  const t = tablesFor(gradeId);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    const lum = (r * 299 + g * 587 + b * 114) / 1000;
    const shadowMix = (255 - lum) / 255;
    const highMix = lum / 255;
    // Split tone: teal into the shadows, warmth into the highlights.
    r = clamp255(r - 14 * shadowMix * (t.warm < 0 ? 1.6 : 1) + 16 * highMix * Math.max(0, t.warm));
    g = clamp255(g + 10 * shadowMix - 4 * highMix * Math.max(0, t.warm));
    b = clamp255(b + 20 * shadowMix - 18 * highMix * Math.max(0, t.warm) + (t.warm < 0 ? 10 * highMix : 0));
    r = t.r[Math.round(r)]; g = t.g[Math.round(g)]; b = t.b[Math.round(b)];
    const grey = (r * 299 + g * 587 + b * 114) / 1000;
    d[i] = clamp255(grey + (r - grey) * t.sat);
    d[i + 1] = clamp255(grey + (g - grey) * t.sat);
    d[i + 2] = clamp255(grey + (b - grey) * t.sat);
  }
  return imageData;
}

// A translucent wash used over panels before the pixel grade, so even a
// photo the pixel pass barely moves still reads as graded poster art.
export const GRADE_WASH = {
  sunset: ['rgba(255,138,60,0.20)', 'rgba(16,90,110,0.22)'],
  neon: ['rgba(255,46,160,0.18)', 'rgba(20,200,230,0.20)'],
  golden: ['rgba(255,180,70,0.22)', 'rgba(90,50,16,0.16)'],
  midnight: ['rgba(24,200,190,0.16)', 'rgba(10,16,60,0.26)'],
};
