// Velvet Hour — colour grades.
// A grade is a gradient map plus a small set of pixel adjustments. The same
// grade table drives the live editor preview, the PNG exports and the
// in-app screenshot scenes, so what you see is exactly what you share.

export const GRADES = [
  {
    id: "sunset",
    name: "Sunset Melt",
    sky: ["#2b1055", "#7597de", "#ff7e5f", "#feb47b"],
    shadow: [38, 16, 54],
    mid: [196, 92, 84],
    highlight: [255, 196, 120],
    saturation: 1.18,
    contrast: 1.06,
    warmth: 14,
    vignette: 0.32,
  },
  {
    id: "neon",
    name: "Neon Tide",
    sky: ["#0b0033", "#3d0066", "#ff2e88", "#22d3ee"],
    shadow: [10, 4, 44],
    mid: [150, 30, 130],
    highlight: [120, 235, 255],
    saturation: 1.32,
    contrast: 1.1,
    warmth: -6,
    vignette: 0.4,
  },
  {
    id: "gold",
    name: "Golden Hour",
    sky: ["#3a1c00", "#8a4b00", "#e8930c", "#ffd76a"],
    shadow: [46, 24, 4],
    mid: [178, 104, 30],
    highlight: [255, 222, 130],
    saturation: 1.1,
    contrast: 1.04,
    warmth: 26,
    vignette: 0.26,
  },
  {
    id: "noir",
    name: "Midnight Noir",
    sky: ["#05070f", "#101a2e", "#274b63", "#7fb2c9"],
    shadow: [4, 6, 14],
    mid: [70, 96, 120],
    highlight: [205, 228, 240],
    saturation: 0.72,
    contrast: 1.16,
    warmth: -14,
    vignette: 0.52,
  },
];

export function gradeById(id) {
  for (const grade of GRADES) if (grade.id === id) return grade;
  return GRADES[0];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Map one luminance value (0..1) through the grade's shadow/mid/highlight ramp.
export function rampColor(grade, lum) {
  const t = Math.max(0, Math.min(1, lum));
  if (t < 0.5) {
    const k = t * 2;
    return [
      lerp(grade.shadow[0], grade.mid[0], k),
      lerp(grade.shadow[1], grade.mid[1], k),
      lerp(grade.shadow[2], grade.mid[2], k),
    ];
  }
  const k = (t - 0.5) * 2;
  return [
    lerp(grade.mid[0], grade.highlight[0], k),
    lerp(grade.mid[1], grade.highlight[1], k),
    lerp(grade.mid[2], grade.highlight[2], k),
  ];
}

// Apply a grade in place to an RGBA pixel buffer. Pure math, no DOM, so the
// identical pass runs in the browser and in the Node screenshot renderer.
export function applyGradeToPixels(data, width, height, grade, strength) {
  const mix = Math.max(0, Math.min(1, strength === undefined ? 0.55 : strength));
  const sat = grade.saturation;
  const con = grade.contrast;
  const warm = grade.warmth;
  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      // contrast around mid grey
      r = (r - 128) * con + 128;
      g = (g - 128) * con + 128;
      b = (b - 128) * con + 128;
      // saturation around luminance
      const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = grey + (r - grey) * sat;
      g = grey + (g - grey) * sat;
      b = grey + (b - grey) * sat;
      // gradient-map blend
      const ramp = rampColor(grade, lum);
      r = lerp(r, ramp[0], mix * 0.62);
      g = lerp(g, ramp[1], mix * 0.62);
      b = lerp(b, ramp[2], mix * 0.62);
      // warmth shift
      r += warm;
      b -= warm;
      // vignette
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
      const shade = 1 - grade.vignette * dist * dist;
      data[i] = Math.max(0, Math.min(255, r * shade));
      data[i + 1] = Math.max(0, Math.min(255, g * shade));
      data[i + 2] = Math.max(0, Math.min(255, b * shade));
    }
  }
  return data;
}

// A vertical sunset sky built from the grade's stops, used behind the panels.
export function skyGradient(ctx, grade, x, y, width, height) {
  const grad = ctx.createLinearGradient(x, y, x, y + height);
  const stops = grade.sky;
  for (let i = 0; i < stops.length; i++) {
    grad.addColorStop(i / (stops.length - 1), stops[i]);
  }
  return grad;
}
