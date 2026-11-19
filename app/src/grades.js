// Colour grades for the cover composer.
// A grade is a per-pixel colour transform plus an optional light overlay
// drawn over the panel after the photo. All four are original looks built
// for this app: a Vice City sunset, a neon night, a high-contrast noir and
// a warm golden hour. Nothing here samples another game's palette.

function clampByte(value) {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

function applyCurve(value, lift, gain) {
  return clampByte((value / 255) * gain * 255 + lift);
}

// Warm the photo: lift the reds, hold the greens, pull the blues down, and
// push the saturation up a touch so sunsets burn.
export function gradeSunsetPixel(r, g, b) {
  const warmR = clampByte(r * 1.14 + 12);
  const warmG = clampByte(g * 1.03 + 4);
  const warmB = clampByte(b * 0.86);
  const mean = (warmR + warmG + warmB) / 3;
  return [
    clampByte(mean + (warmR - mean) * 1.12),
    clampByte(mean + (warmG - mean) * 1.12),
    clampByte(mean + (warmB - mean) * 1.12),
  ];
}

// Neon night: shadows go magenta-blue, highlights go cyan, saturation up.
// The look of a boulevard after dark, lit by signs.
export function gradeNeonPixel(r, g, b) {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const t = lum / 255;
  const shadowTint = 1 - t;
  let nr = r * 1.05 + shadowTint * 26;
  let ng = g * 0.98 + t * 10;
  let nb = b * 1.12 + shadowTint * 34;
  const mean = (nr + ng + nb) / 3;
  nr = mean + (nr - mean) * 1.28;
  ng = mean + (ng - mean) * 1.28;
  nb = mean + (nb - mean) * 1.28;
  return [clampByte(nr), clampByte(ng), clampByte(nb)];
}

// Palm noir: pull most of the colour out, raise the contrast, cool shadows.
// A stark black-and-white-with-teeth poster.
export function gradeNoirPixel(r, g, b) {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const grey = clampByte(((lum - 128) * 1.28) + 128);
  const t = lum / 255;
  return [
    clampByte(grey + (1 - t) * 6),
    clampByte(grey + (1 - t) * 12),
    clampByte(grey + (1 - t) * 16),
  ];
}

// Golden hour: honey light, gentle contrast, warm highlights.
export function gradeGoldenPixel(r, g, b) {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const t = lum / 255;
  let nr = r * 1.10 + t * 14;
  let ng = g * 1.02 + t * 6;
  let nb = b * 0.90;
  const mean = (nr + ng + nb) / 3;
  nr = mean + (nr - mean) * 1.14;
  ng = mean + (ng - mean) * 1.14;
  nb = mean + (nb - mean) * 1.14;
  return [clampByte(nr), clampByte(ng), clampByte(nb)];
}

export const GRADES = [
  {
    id: 'sunset',
    name: 'Vice Sunset',
    pixel: gradeSunsetPixel,
    overlay: { from: [255, 94, 20, 0.16], to: [255, 45, 120, 0.10], vertical: true },
    captionGradient: [[255, 255, 255], [255, 211, 25]],
  },
  {
    id: 'neon',
    name: 'Neon Nights',
    pixel: gradeNeonPixel,
    overlay: { from: [0, 229, 255, 0.10], to: [255, 0, 153, 0.14], vertical: false },
    captionGradient: [[255, 255, 255], [0, 229, 255]],
  },
  {
    id: 'noir',
    name: 'Palm Noir',
    pixel: gradeNoirPixel,
    overlay: null,
    captionGradient: [[255, 255, 255], [214, 214, 214]],
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    pixel: gradeGoldenPixel,
    overlay: { from: [255, 183, 20, 0.14], to: [255, 120, 0, 0.08], vertical: true },
    captionGradient: [[255, 244, 200], [255, 183, 20]],
  },
];

export function getGrade(id) {
  return GRADES.find((entry) => entry.id === id) || GRADES[0];
}

// Apply one grade's pixel transform to a whole RGBA buffer, in place.
export function applyGradeToPixels(data, pixelFn) {
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = pixelFn(data[i], data[i + 1], data[i + 2]);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

export { applyCurve, clampByte };
