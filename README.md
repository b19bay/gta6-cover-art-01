[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/b19bay/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/b19bay/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# gta6-cover-art-01 — Cover Heist

Turn your own photo and a caption into GTA 6-style cover art: multi-panel
poster layouts, a bold condensed caption, a Vice City-style sunset or neon
grade, exported as a PNG in the three post sizes (1080x1080, 1080x1350,
1920x1080). Static files, no build step, no network request: open
`app/index.html` from any static server and it works offline.

## How it works (3 steps)

1. **Drop a photo in** (or try a bundled sample). One photo can fill every
   panel, or load a second photo for the smaller panels. Drag on the preview
   to reposition a panel's photo, scroll to zoom it.
2. **Pick a layout and a grade.** Four layouts (Hero + Strip, Grid 2x2,
   Diagonal Split, Triptych) and four grades (Sunset, Neon Nights, Noir,
   Gold Hour). Type the caption, choose top or bottom placement.
3. **Export.** One click per size: 1080x1080 (square post), 1080x1350
   (portrait post), 1920x1080 (landscape). The PNG downloads straight from
   the canvas.

## Architecture: canvas-first

One pure render core draws everything, with no DOM dependency in the core
itself, so the editor and the cover share the exact same drawing code:

- `app/src/render-core.js` — `renderCover(ctx, state, w, h)`: panels, photo
  cover-fit with per-panel crop/zoom/pan, grade overlays, sun disc, gutters,
  neon frame, caption scrim and lettering.
- `app/src/layouts.js` — the four panel layouts (rects + diagonal clip paths).
- `app/src/grades.js` — the four colour grades (sky stops, tint, accent).
- `app/src/caption.js` — caption wrapping, auto-fit and outlined lettering.
- `app/src/editor.js` — `renderEditor(ctx, state, w, h)`: the whole editor
  scene (header, live preview, panel outlines and handles, layout thumbnails,
  grade swatches, export chips) drawn on canvas by the same core.
- `app/src/main.js` — DOM wiring only: file inputs, buttons, pointer drag /
  wheel on the preview, export via `canvas.toBlob`.
- `app/src/shots.js` — fixed `?shot=` scenes for screenshots.

The screenshots in `screenshots/` are the app's own output: `tools/make-shots.mjs`
runs the same render core in Node (node-canvas) over the kit's free sample
photos — never a mockup, never a borrowed or composited image.

## Fonts and photos

- Caption font: **Anton** (SIL Open Font License 1.1), bundled as a file at
  `app/fonts/Anton-Regular.ttf` with its licence at `app/fonts/OFL.txt`.
  Nothing is hotlinked. No Rockstar logo, wordmark, artwork, character or
  font is used anywhere; the cover design is original.
- Sample photos: the two kit samples under `app/samples/`, made with an
  image model for make.fun and free to use. Your own photos never leave the
  browser (FileReader, local only).

## Run it

```sh
node serve.ts          # serves app/ on http://localhost:8080
```

## Hand in

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/dossier.json
```

`main.ts` copies `app/` + `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library (`vendor/makefun-app.ts`,
unchanged kit copy).

## License

MIT — see `LICENSE`.
