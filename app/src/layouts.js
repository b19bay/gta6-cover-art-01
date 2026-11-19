// Panel layouts for the cover composer.
// A layout turns a cover rectangle (W x H) into a list of panels. Each panel
// is either a rectangle {x, y, w, h} or a polygon {points} for diagonal cuts.
// Gutters are part of the design: thick dark seams between panels, the way
// poster collages separate their shots.

export const GUTTER_FRACTION = 0.012;

function gutterFor(width, height) {
  return Math.max(4, Math.round(Math.min(width, height) * GUTTER_FRACTION));
}

function rectPanel(x, y, w, h) {
  return { kind: 'rect', x, y, w, h };
}

function polyPanel(points) {
  return { kind: 'poly', points };
}

function boundsOf(panels) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of panels) {
    const pts = p.kind === 'rect'
      ? [[p.x, p.y], [p.x + p.w, p.y], [p.x + p.w, p.y + p.h], [p.x, p.y + p.h]]
      : p.points;
    for (const [px, py] of pts) {
      x0 = Math.min(x0, px);
      y0 = Math.min(y0, py);
      x1 = Math.max(x1, px);
      y1 = Math.max(y1, py);
    }
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// Hero on top, three equal shots in a strip below it. The classic poster:
// one big moment, then the supporting cast.
export function layoutHeroStrip(width, height) {
  const g = gutterFor(width, height);
  const heroH = Math.round(height * 0.60);
  const stripY = heroH + g;
  const stripH = height - stripY;
  const third = Math.floor((width - 2 * g) / 3);
  return [
    rectPanel(0, 0, width, heroH),
    rectPanel(0, stripY, third, stripH),
    rectPanel(third + g, stripY, third, stripH),
    rectPanel(2 * (third + g), stripY, width - 2 * (third + g), stripH),
  ];
}

// Four equal shots in a 2 x 2 grid. Best when every photo deserves the
// same weight, and the caption sits across the middle seam.
export function layoutGrid(width, height) {
  const g = gutterFor(width, height);
  const halfW = Math.floor((width - g) / 2);
  const halfH = Math.floor((height - g) / 2);
  return [
    rectPanel(0, 0, halfW, halfH),
    rectPanel(halfW + g, 0, width - halfW - g, halfH),
    rectPanel(0, halfH + g, halfW, height - halfH - g),
    rectPanel(halfW + g, halfH + g, width - halfW - g, height - halfH - g),
  ];
}

// Two shots split by one diagonal seam, top-left against bottom-right.
// The seam angle follows the cover: steeper on portrait, shallower on wide.
export function layoutDiagonal(width, height) {
  const drop = Math.round(height * 0.22);
  return [
    polyPanel([[0, 0], [width, 0], [width, height - drop], [0, height - drop - Math.round(height * 0.18)]]),
    polyPanel([[0, height - drop - Math.round(height * 0.18)], [width, height - drop], [width, height], [0, height]]),
  ];
}

// Three vertical slices: one wide lead on the left, two stacked on the right.
export function layoutTriptych(width, height) {
  const g = gutterFor(width, height);
  const leftW = Math.round(width * 0.52);
  const rightX = leftW + g;
  const rightW = width - rightX;
  const halfH = Math.floor((height - g) / 2);
  return [
    rectPanel(0, 0, leftW, height),
    rectPanel(rightX, 0, rightW, halfH),
    rectPanel(rightX, halfH + g, rightW, height - halfH - g),
  ];
}

export const LAYOUTS = [
  { id: 'hero-strip', name: 'Hero + Strip', panels: layoutHeroStrip, count: 4 },
  { id: 'grid', name: 'Four Grid', panels: layoutGrid, count: 4 },
  { id: 'diagonal', name: 'Diagonal Split', panels: layoutDiagonal, count: 2 },
  { id: 'triptych', name: 'Triptych', panels: layoutTriptych, count: 3 },
];

export function getLayout(id) {
  return LAYOUTS.find((entry) => entry.id === id) || LAYOUTS[0];
}

export function panelsFor(layoutId, width, height) {
  return getLayout(layoutId).panels(width, height);
}

// Hit test: which panel, if any, holds the point (x, y) in cover pixels.
export function panelAt(panels, x, y) {
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (p.kind === 'rect') {
      if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) return i;
    } else if (pointInPolygon(x, y, p.points)) {
      return i;
    }
  }
  return -1;
}

export function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const crosses = (yi > y) !== (yj > y)
      && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

export { boundsOf };
