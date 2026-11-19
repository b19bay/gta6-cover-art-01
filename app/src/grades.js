// The four colour grades. A grade is sky gradient stops (drawn over the
// photo with an overlay blend), a deep bottom tint, the caption accent and
// whether the hero panel gets a sun disc. No Rockstar artwork is involved:
// these are original colour treatments.
export const GRADES = {
  sunset: {
    label: 'Sunset',
    sky: ['#ff9a3d', '#ff5e62', '#c22e7a'],
    deep: 'rgba(90, 10, 70, 0.42)',
    accent: '#ffd166',
    sun: true,
  },
  neon: {
    label: 'Neon Nights',
    sky: ['#00ffe7', '#7b2ff7', '#ff2fb3'],
    deep: 'rgba(8, 8, 44, 0.45)',
    accent: '#00ffe7',
    sun: false,
  },
  noir: {
    label: 'Noir',
    sky: ['#8a8a8a', '#3a3a3a', '#0d0d0d'],
    deep: 'rgba(0, 0, 0, 0.5)',
    accent: '#f2f2f2',
    sun: false,
  },
  gold: {
    label: 'Gold Hour',
    sky: ['#ffe08a', '#ff9a3d', '#b3541e'],
    deep: 'rgba(90, 40, 5, 0.4)',
    accent: '#fff3c4',
    sun: true,
  },
};

export const GRADE_NAMES = Object.keys(GRADES);

/** Paints a grade over rectangle (x, y, w, h) of the context. */
export function applyGrade(ctx, grade, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  grade.sky.forEach((c, i) => g.addColorStop(i / (grade.sky.length - 1), c));
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  const v = ctx.createLinearGradient(x, y + h * 0.5, x, y + h);
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, grade.deep);
  ctx.fillStyle = v;
  ctx.fillRect(x, y, w, h);
}

/** Draws the grade's sun disc inside the hero panel rectangle. */
export function drawSun(ctx, grade, x, y, w, h) {
  if (!grade.sun) return;
  const r = Math.min(w, h) * 0.13;
  const cx = x + w * 0.8;
  const cy = y + h * 0.22;
  const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  g.addColorStop(0, 'rgba(255, 246, 200, 0.98)');
  g.addColorStop(0.55, 'rgba(255, 190, 90, 0.9)');
  g.addColorStop(1, 'rgba(255, 120, 60, 0)');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
