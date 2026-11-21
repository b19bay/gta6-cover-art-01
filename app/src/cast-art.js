// Cast art: seven original characters, illustrated in code by the render core itself.
// Each member is a painted-look figure built from layered shapes — a varied silhouette,
// palette, prop and backdrop per panel — so the cast grid never repeats a photo or a face.

/** Deterministic pseudo-random generator so every render of a panel is identical. */
export function seededRandom(seed) {
  let state = (seed * 2654435761) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** The seven cast members of Velvet Tide. Roles, looks and props are original to this entry. */
export const CAST = [
  { id: 'siren', role: 'THE SIREN', scene: 'stage', skin: '#8a5a3b', shade: '#6e452b', hair: '#17121c', hairStyle: 'long', outfit: '#c2185b', outfit2: '#7b0f3a', prop: 'microphone', bg: ['#3b1054', '#12081f'], accent: '#ff5da2' },
  { id: 'smuggler', role: 'THE SMUGGLER', scene: 'dock', skin: '#c98d5f', shade: '#a06c42', hair: '#241a12', hairStyle: 'cap', outfit: '#5b6634', outfit2: '#39421f', prop: 'duffel', bg: ['#f2a65a', '#7a2e4d'], accent: '#ffd166' },
  { id: 'diver', role: 'THE DIVER', scene: 'reef', skin: '#6e452b', shade: '#54331e', hair: '#0f0d0c', hairStyle: 'curly', outfit: '#0e7c86', outfit2: '#084e55', prop: 'mask', bg: ['#0b3d5c', '#062238'], accent: '#39d0d8' },
  { id: 'dealer', role: 'THE DEALER', scene: 'casino', skin: '#e8b48f', shade: '#c78e63', hair: '#a52a1d', hairStyle: 'slick', outfit: '#1c1c22', outfit2: '#000000', prop: 'cards', bg: ['#0d3b2e', '#051a13'], accent: '#e9c46a' },
  { id: 'ghost', role: 'THE GHOST', scene: 'rooftop', skin: '#d9a066', shade: '#b57e49', hair: '#cfd2d6', hairStyle: 'buzz', outfit: '#4a4f57', outfit2: '#2c2f34', prop: 'camera', bg: ['#40295e', '#191028'], accent: '#9ad1ff' },
  { id: 'mayor', role: 'THE MAYOR', scene: 'hall', skin: '#54331e', shade: '#3f2513', hair: '#3a3a3a', hairStyle: 'temples', outfit: '#1d2a4a', outfit2: '#101a30', prop: 'chain', bg: ['#8a6d1f', '#3d2c08'], accent: '#ffe08a' },
  { id: 'rookie', role: 'THE ROOKIE', scene: 'boardwalk', skin: '#f0c297', shade: '#d19f6d', hair: '#d9a441', hairStyle: 'messy', outfit: '#e4572e', outfit2: '#a83c1d', prop: 'skateboard', bg: ['#2e6f8e', '#17394d'], accent: '#ffb703' },
];

/** Traces a rounded rectangle path (does not fill or stroke). */
export function traceRoundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

export function fillEllipse(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function fillPoly(ctx, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

/** Paints one backdrop scene inside the given rect (the caller clips if it needs to). */
export function drawBackdrop(ctx, member, x, y, w, h) {
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, member.bg[0]);
  grad.addColorStop(1, member.bg[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  const cx = x + w / 2;
  if (member.scene === 'stage') {
    ctx.save();
    ctx.globalAlpha = 0.28;
    fillPoly(ctx, [[x, y], [cx - w * 0.08, y + h], [cx + w * 0.08, y + h]], '#ffd7f2');
    fillPoly(ctx, [[x + w, y], [cx - w * 0.05, y + h], [cx + w * 0.22, y + h]], '#9ad1ff');
    ctx.globalAlpha = 1;
    const rand = seededRandom(11);
    for (let i = 0; i < 26; i++) fillEllipse(ctx, x + rand() * w, y + rand() * h * 0.5, 2.2, 2.2, '#ffe9a8');
    ctx.restore();
  } else if (member.scene === 'dock') {
    fillEllipse(ctx, x + w * 0.78, y + h * 0.3, w * 0.13, w * 0.13, '#ffe3a3');
    ctx.fillStyle = 'rgba(20,40,60,0.55)';
    ctx.fillRect(x, y + h * 0.62, w, h * 0.38);
    ctx.fillStyle = 'rgba(10,16,26,0.8)';
    for (let i = 0; i < 4; i++) ctx.fillRect(x + w * (0.08 + i * 0.24), y + h * 0.5, w * 0.035, h * 0.3);
    ctx.fillRect(x, y + h * 0.6, w, h * 0.03);
  } else if (member.scene === 'reef') {
    const rand = seededRandom(23);
    ctx.save();
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 18; i++) fillEllipse(ctx, x + rand() * w, y + rand() * h, 3 + rand() * 5, 3 + rand() * 5, '#bdf3ff');
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 3; i++) fillPoly(ctx, [[x, y + h * (0.7 + i * 0.1)], [x + w * 0.4, y + h * (0.62 + i * 0.1)], [x + w, y + h * (0.74 + i * 0.1)], [x + w, y + h], [x, y + h]], '#0e7c86');
    ctx.restore();
  } else if (member.scene === 'casino') {
    ctx.save();
    ctx.globalAlpha = 0.3;
    const rand = seededRandom(37);
    for (let i = 0; i < 22; i++) {
      const dx = x + rand() * w, dy = y + rand() * h * 0.7, s = 5 + rand() * 6;
      fillPoly(ctx, [[dx, dy - s], [dx + s, dy], [dx, dy + s], [dx - s, dy]], '#e9c46a');
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(233,196,106,0.65)';
    ctx.lineWidth = Math.max(2, w * 0.012);
    ctx.beginPath();
    ctx.ellipse(cx, y + h * 0.98, w * 0.62, h * 0.72, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  } else if (member.scene === 'rooftop') {
    fillEllipse(ctx, x + w * 0.2, y + h * 0.18, w * 0.07, w * 0.07, '#f4f1de');
    ctx.fillStyle = 'rgba(8,8,18,0.85)';
    const heights = [0.42, 0.58, 0.36, 0.66, 0.48, 0.55];
    heights.forEach((hh, i) => ctx.fillRect(x + w * (i / 6), y + h * (1 - hh), w / 6 - 2, h * hh));
    ctx.fillStyle = '#ffd166';
    const rand = seededRandom(41);
    for (let i = 0; i < 16; i++) ctx.fillRect(x + rand() * w, y + h * (0.45 + rand() * 0.4), 3, 4);
  } else if (member.scene === 'hall') {
    ctx.fillStyle = 'rgba(255,232,160,0.35)';
    for (let i = 0; i < 4; i++) ctx.fillRect(x + w * (0.08 + i * 0.26), y + h * 0.06, w * 0.09, h * 0.8);
    ctx.fillStyle = 'rgba(40,26,4,0.55)';
    ctx.fillRect(x, y + h * 0.86, w, h * 0.14);
    fillEllipse(ctx, cx, y + h * 0.2, w * 0.16, w * 0.16, 'rgba(255,240,190,0.5)');
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = Math.max(2, w * 0.01);
    ctx.beginPath();
    ctx.ellipse(x + w * 0.82, y + h * 0.34, w * 0.3, w * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(10,20,30,0.5)';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(x, y + h * (0.66 + i * 0.07));
      ctx.lineTo(x + w, y + h * (0.6 + i * 0.07));
      ctx.stroke();
    }
  }
}

function drawHairBack(ctx, member, cx, headY, u) {
  if (member.hairStyle !== 'long') return;
  fillPoly(ctx, [
    [cx - 15 * u, headY - 14 * u], [cx + 15 * u, headY - 14 * u],
    [cx + 19 * u, headY + 34 * u], [cx + 10 * u, headY + 40 * u],
    [cx + 6 * u, headY + 12 * u], [cx - 6 * u, headY + 12 * u],
    [cx - 10 * u, headY + 40 * u], [cx - 19 * u, headY + 34 * u],
  ], member.hair);
}

function drawHairTop(ctx, member, cx, headY, u) {
  if (member.hairStyle === 'long' || member.hairStyle === 'slick') {
    ctx.fillStyle = member.hair;
    ctx.beginPath();
    ctx.ellipse(cx, headY - 4 * u, 13.5 * u, 12 * u, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = member.skin;
    ctx.beginPath();
    ctx.ellipse(cx, headY + 1 * u, 12.4 * u, 10.8 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = member.hair;
    ctx.fillRect(cx - 13.5 * u, headY - 6 * u, 27 * u, 3.2 * u);
  } else if (member.hairStyle === 'curly') {
    const rand = seededRandom(53);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      fillEllipse(ctx, cx + Math.cos(a) * 10 * u, headY - 6 * u + Math.sin(a) * 8 * u, (4.6 + rand() * 2) * u, (4.6 + rand() * 2) * u, member.hair);
    }
  } else if (member.hairStyle === 'cap') {
    ctx.fillStyle = '#20303c';
    ctx.beginPath();
    ctx.ellipse(cx, headY - 5 * u, 13.5 * u, 11 * u, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    fillEllipse(ctx, cx + 13 * u, headY - 4 * u, 8 * u, 2.4 * u, '#20303c');
    ctx.fillStyle = member.accent;
    ctx.fillRect(cx - 13.5 * u, headY - 6.4 * u, 27 * u, 2 * u);
  } else if (member.hairStyle === 'buzz') {
    ctx.fillStyle = member.hair;
    ctx.beginPath();
    ctx.ellipse(cx, headY - 4 * u, 13 * u, 11.4 * u, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = member.skin;
    ctx.beginPath();
    ctx.ellipse(cx, headY - 1 * u, 12.6 * u, 10.6 * u, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  } else if (member.hairStyle === 'temples') {
    ctx.fillStyle = '#8f8f8f';
    ctx.beginPath();
    ctx.ellipse(cx, headY - 4 * u, 13.4 * u, 11.8 * u, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = member.hair;
    ctx.beginPath();
    ctx.ellipse(cx, headY - 6.5 * u, 11 * u, 9.4 * u, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  } else if (member.hairStyle === 'messy') {
    fillPoly(ctx, [
      [cx - 13 * u, headY - 2 * u], [cx - 12 * u, headY - 15 * u], [cx - 6 * u, headY - 9 * u],
      [cx - 3 * u, headY - 17 * u], [cx + 2 * u, headY - 10 * u], [cx + 6 * u, headY - 16 * u],
      [cx + 10 * u, headY - 9 * u], [cx + 13 * u, headY - 13 * u], [cx + 13 * u, headY - 2 * u],
    ], member.hair);
  }
}

function drawProp(ctx, member, cx, baseY, u) {
  const handY = baseY - 34 * u;
  if (member.prop === 'microphone') {
    ctx.strokeStyle = '#14141c';
    ctx.lineWidth = 3.4 * u;
    ctx.beginPath();
    ctx.moveTo(cx + 16 * u, handY + 12 * u);
    ctx.lineTo(cx + 24 * u, handY - 8 * u);
    ctx.stroke();
    fillEllipse(ctx, cx + 25 * u, handY - 11 * u, 5.4 * u, 6.4 * u, '#2c2c38');
    ctx.strokeStyle = member.accent;
    ctx.lineWidth = 1.6 * u;
    ctx.beginPath();
    ctx.ellipse(cx + 25 * u, handY - 11 * u, 5.4 * u, 6.4 * u, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (member.prop === 'duffel') {
    traceRoundRect(ctx, cx - 34 * u, baseY - 16 * u, 30 * u, 15 * u, 5 * u);
    ctx.fillStyle = '#31435c';
    ctx.fill();
    ctx.strokeStyle = '#10161f';
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    ctx.moveTo(cx - 28 * u, baseY - 16 * u);
    ctx.quadraticCurveTo(cx - 19 * u, baseY - 24 * u, cx - 10 * u, baseY - 16 * u);
    ctx.stroke();
    ctx.fillStyle = member.accent;
    ctx.fillRect(cx - 34 * u, baseY - 10 * u, 30 * u, 3 * u);
  } else if (member.prop === 'mask') {
    traceRoundRect(ctx, cx - 12 * u, baseY - 96 * u, 24 * u, 7 * u, 3 * u);
    ctx.fillStyle = '#123c46';
    ctx.fill();
    ctx.fillStyle = '#9ad1ff';
    ctx.fillRect(cx - 10 * u, baseY - 95 * u, 9 * u, 5 * u);
    ctx.fillRect(cx + 1 * u, baseY - 95 * u, 9 * u, 5 * u);
    ctx.strokeStyle = '#123c46';
    ctx.lineWidth = 2.4 * u;
    ctx.beginPath();
    ctx.moveTo(cx + 13 * u, baseY - 96 * u);
    ctx.lineTo(cx + 13 * u, baseY - 78 * u);
    ctx.stroke();
  } else if (member.prop === 'cards') {
    ctx.save();
    ctx.translate(cx + 18 * u, handY);
    ctx.rotate(-0.28);
    ctx.fillStyle = '#f7f3e8';
    ctx.fillRect(-6 * u, -8 * u, 11 * u, 15 * u);
    ctx.rotate(0.5);
    ctx.fillRect(-4 * u, -8 * u, 11 * u, 15 * u);
    ctx.fillStyle = '#c2185b';
    ctx.fillRect(-1.6 * u, -4 * u, 3.4 * u, 3.4 * u);
    ctx.restore();
  } else if (member.prop === 'camera') {
    ctx.strokeStyle = '#15151b';
    ctx.lineWidth = 1.8 * u;
    ctx.beginPath();
    ctx.moveTo(cx - 6 * u, handY - 4 * u);
    ctx.lineTo(cx - 14 * u, baseY - 78 * u);
    ctx.moveTo(cx + 6 * u, handY - 4 * u);
    ctx.lineTo(cx + 14 * u, baseY - 78 * u);
    ctx.stroke();
    traceRoundRect(ctx, cx - 9 * u, handY - 4 * u, 18 * u, 12 * u, 2 * u);
    ctx.fillStyle = '#15151b';
    ctx.fill();
    fillEllipse(ctx, cx, handY + 2 * u, 4.4 * u, 4.4 * u, '#3d5a80');
    fillEllipse(ctx, cx, handY + 2 * u, 2 * u, 2 * u, '#9ad1ff');
  } else if (member.prop === 'chain') {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.15 + (i / 6) * 0.7);
      fillEllipse(ctx, cx + Math.cos(a) * 11 * u, baseY - 62 * u + Math.sin(a) * 7 * u, 1.9 * u, 1.9 * u, '#e9c46a');
    }
    fillEllipse(ctx, cx, baseY - 53 * u, 3 * u, 3.8 * u, '#e9c46a');
  } else if (member.prop === 'skateboard') {
    ctx.save();
    ctx.translate(cx - 24 * u, baseY - 30 * u);
    ctx.rotate(0.5);
    traceRoundRect(ctx, -3 * u, -16 * u, 6.4 * u, 30 * u, 3 * u);
    ctx.fillStyle = '#17394d';
    ctx.fill();
    ctx.fillStyle = member.accent;
    ctx.fillRect(-3 * u, -3 * u, 6.4 * u, 3 * u);
    ctx.restore();
  }
}

/**
 * Draws one cast figure. Centre x = cx, ground line = baseY, u = one hundredth of
 * the figure height. The hero wears sunglasses; everyone else gets eyes and brows.
 */
export function drawFigure(ctx, member, cx, baseY, u, isHero) {
  const headY = baseY - 82 * u;
  drawHairBack(ctx, member, cx, headY, u);
  fillPoly(ctx, [
    [cx - 21 * u, baseY], [cx - 17 * u, baseY - 38 * u], [cx - 7 * u, baseY - 46 * u],
    [cx + 7 * u, baseY - 46 * u], [cx + 17 * u, baseY - 38 * u], [cx + 21 * u, baseY],
  ], member.outfit);
  fillPoly(ctx, [[cx + 4 * u, baseY], [cx + 17 * u, baseY - 38 * u], [cx + 21 * u, baseY]], member.outfit2);
  fillPoly(ctx, [[cx - 7 * u, baseY - 46 * u], [cx + 7 * u, baseY - 46 * u], [cx, baseY - 34 * u]], member.skin);
  ctx.fillStyle = member.shade;
  ctx.fillRect(cx - 4.4 * u, baseY - 56 * u, 8.8 * u, 11 * u);
  fillEllipse(ctx, cx, headY, 13 * u, 15.5 * u, member.skin);
  ctx.save();
  ctx.globalAlpha = 0.35;
  fillEllipse(ctx, cx + 6 * u, headY + 3 * u, 7 * u, 11 * u, member.shade);
  ctx.restore();
  drawHairTop(ctx, member, cx, headY, u);
  if (isHero) {
    traceRoundRect(ctx, cx - 11.4 * u, headY - 3.4 * u, 10.4 * u, 6 * u, 2.6 * u);
    ctx.fillStyle = '#101018';
    ctx.fill();
    traceRoundRect(ctx, cx + 1 * u, headY - 3.4 * u, 10.4 * u, 6 * u, 2.6 * u);
    ctx.fill();
    ctx.fillStyle = '#101018';
    ctx.fillRect(cx - 1.4 * u, headY - 2 * u, 2.8 * u, 1.6 * u);
  } else {
    fillEllipse(ctx, cx - 5.4 * u, headY - 1 * u, 1.7 * u, 2.3 * u, '#181008');
    fillEllipse(ctx, cx + 5.4 * u, headY - 1 * u, 1.7 * u, 2.3 * u, '#181008');
    ctx.strokeStyle = 'rgba(20,10,4,0.75)';
    ctx.lineWidth = 1.3 * u;
    ctx.beginPath();
    ctx.moveTo(cx - 8.4 * u, headY - 5.4 * u);
    ctx.lineTo(cx - 2.6 * u, headY - 5 * u);
    ctx.moveTo(cx + 2.6 * u, headY - 5 * u);
    ctx.lineTo(cx + 8.4 * u, headY - 5.4 * u);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(20,10,4,0.5)';
  ctx.lineWidth = 1.2 * u;
  ctx.beginPath();
  ctx.moveTo(cx + 0.8 * u, headY + 1 * u);
  ctx.lineTo(cx - 0.6 * u, headY + 6.4 * u);
  ctx.stroke();
  ctx.strokeStyle = '#7a3320';
  ctx.lineWidth = 1.7 * u;
  ctx.beginPath();
  ctx.moveTo(cx - 3.6 * u, headY + 10.4 * u);
  ctx.quadraticCurveTo(cx, headY + 12.2 * u, cx + 3.6 * u, headY + 10.4 * u);
  ctx.stroke();
  ctx.strokeStyle = member.accent;
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 2.2 * u;
  ctx.beginPath();
  ctx.moveTo(cx + 16.6 * u, baseY - 37 * u);
  ctx.lineTo(cx + 20.4 * u, baseY - 2 * u);
  ctx.stroke();
  ctx.restore();
  drawProp(ctx, member, cx, baseY, u);
}

/** Painted-look finish: seeded brush streaks and a soft vignette over a panel. */
export function paintFinish(ctx, x, y, w, h, seed) {
  const rand = seededRandom(seed);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let i = 0; i < 12; i++) {
    ctx.save();
    ctx.globalAlpha = 0.05 + rand() * 0.05;
    const sx = x + rand() * w, sy = y + rand() * h;
    fillPoly(ctx, [[sx, sy], [sx + w * 0.24, sy - h * 0.05], [sx + w * 0.24, sy + h * 0.015], [sx, sy + h * 0.06]], rand() > 0.5 ? '#ffffff' : '#000000');
    ctx.restore();
  }
  const vig = ctx.createLinearGradient(0, y, 0, y + h);
  vig.addColorStop(0, 'rgba(0,0,0,0.16)');
  vig.addColorStop(0.4, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}
