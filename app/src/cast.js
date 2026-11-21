// Velvet Hour — the demo cast and the cover layouts.
// Eight photographic portraits, one warm sunset grade across all of them,
// each with a role tag that is lettered onto its panel on the cover.

export const CAST = [
  { id: "boss", role: "THE BOSS", file: "samples/boss.jpg", line: "Runs the Velvet Hour. Every tide answers to her." },
  { id: "driver", role: "THE DRIVER", file: "samples/driver.jpg", line: "Never late. Never caught. Never explains." },
  { id: "siren", role: "THE SIREN", file: "samples/siren.jpg", line: "Her voice closes deals the crew cannot." },
  { id: "fixer", role: "THE FIXER", file: "samples/fixer.jpg", line: "One phone call and the problem was never there." },
  { id: "captain", role: "THE CAPTAIN", file: "samples/captain.jpg", line: "Knows every channel, reef and patrol hour." },
  { id: "ghost", role: "THE GHOST", file: "samples/ghost.jpg", line: "No record, no photo, no forwarding address." },
  { id: "ledger", role: "THE LEDGER", file: "samples/ledger.jpg", line: "Counts the money twice and the favours forever." },
  { id: "wheelman", role: "THE WHEELMAN", file: "samples/wheelman.jpg", line: "Builds the getaway car and drives it too." },
];

export const LAYOUTS = [
  { id: "mosaic", name: "Cast Mosaic", blurb: "Hero panel plus seven, the classic poster wall" },
  { id: "hero", name: "Hero & Crew", blurb: "One huge face, the crew in a film strip below" },
  { id: "grid", name: "Even Grid", blurb: "Eight equal panels, two rows of four" },
  { id: "strip", name: "Night Strip", blurb: "Tall side hero with a column of six and a wide base" },
];

export function layoutById(id) {
  for (const layout of LAYOUTS) if (layout.id === id) return layout;
  return LAYOUTS[0];
}

// Panel rectangles for a layout inside a frame of w x h. The first panel is
// always the hero. Rects are fractions resolved against the frame, with a
// gutter between panels; the hero of the mosaic breaks the frame's top edge
// (the pop-out is drawn by the cover renderer on top of these rects).
export function layoutPanels(layoutId, w, h, gutter) {
  const g = gutter === undefined ? Math.max(6, Math.round(w * 0.008)) : gutter;
  const panels = [];
  const push = (x, y, pw, ph, hero) => panels.push({ x, y, w: pw, h: ph, hero: !!hero });
  if (layoutId === "hero") {
    const heroH = h * 0.68;
    push(0, 0, w, heroH, true);
    const cols = 7;
    const cellW = (w - g * (cols - 1)) / cols;
    for (let i = 0; i < cols; i++) push(i * (cellW + g), heroH + g, cellW, h - heroH - g, false);
    return panels;
  }
  if (layoutId === "grid") {
    const cols = 4;
    const rows = 2;
    const cellW = (w - g * (cols - 1)) / cols;
    const cellH = (h - g * (rows - 1)) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        push(c * (cellW + g), r * (cellH + g), cellW, cellH, r === 0 && c === 0);
      }
    }
    return panels;
  }
  if (layoutId === "strip") {
    const heroW = w * 0.42;
    push(0, 0, heroW, h, true);
    const colX = heroW + g;
    const colW = w - colX;
    const rows = 3;
    const cellH = (h - g * (rows - 1)) / rows;
    for (let i = 0; i < 3; i++) push(colX, i * (cellH + g), colW, cellH, false);
    const baseY = 0; // remaining four fill a 2x2 under the hero's shoulder line
    const halfW = (colW - g) / 2;
    for (let i = 0; i < 4; i++) {
      const cx = colX + (i % 2) * (halfW + g);
      const cy = baseY + (rows * (cellH + g)) + Math.floor(i / 2) * (cellH + g);
      if (cy + cellH <= h + 1) push(cx, cy, halfW, cellH, false);
    }
    while (panels.length > 8) panels.pop();
    // If the 2x2 did not fit, fall back to a simple column fill.
    if (panels.length < 8) {
      panels.length = 1;
      const rowsAll = 7;
      const ch = (h - g * (rowsAll - 1)) / rowsAll;
      for (let i = 0; i < rowsAll; i++) push(colX, i * (ch + g), colW, ch, false);
    }
    return panels;
  }
  // mosaic (default): hero takes the left 46% and full height; the other
  // seven fill a 3-over-4 arrangement on the right.
  const heroW = w * 0.46;
  push(0, 0, heroW, h, true);
  const rx = heroW + g;
  const rw = w - rx;
  const topH = h * 0.52;
  const topW = (rw - g * 2) / 3;
  for (let i = 0; i < 3; i++) push(rx + i * (topW + g), 0, topW, topH, false);
  const botY = topH + g;
  const botH = h - botY;
  const botW = (rw - g * 3) / 4;
  for (let i = 0; i < 4; i++) push(rx + i * (botW + g), botY, botW, botH, false);
  return panels;
}

// Default per-panel framing: focus point (0..1) and zoom for each cast slot.
export function defaultPanelState() {
  return CAST.map(() => ({ focusX: 0.5, focusY: 0.38, zoom: 1 }));
}
