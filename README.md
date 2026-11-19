[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/b19bay/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/b19bay/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Cover Heist — GTA-style cover art maker

Turn your photo into multi-panel poster cover art: pick a layout, pick a colour grade, write the title, export the PNG. Runs entirely offline from static files — your photos never leave your machine.

## What it does

- **Any photo**: add your own photos (file picker or drag-and-drop onto the preview), or try the two bundled samples. Click a panel to select it, click a photo to place it there, Shift-click to fill every panel with it. One photo can fill all panels with a different crop in each, or each panel can hold its own photo.
- **Crop and position each panel**: drag a photo inside its panel to move it, scroll to zoom (1×–3×), or use the per-panel zoom slider.
- **4 panel layouts**: Hero + Strip, Four Grid, Diagonal Split, Triptych.
- **4 colour grades**: Vice Sunset, Neon Nights, Palm Noir, Golden Hour — per-pixel colour transforms plus a light overlay, with a painted sun on the hero panel for the sunset grades.
- **Caption editor**: title text, size, position (bottom / centre / top), bold outline, drop shadow, optional tagline. The lettering is Anton (SIL Open Font License, bundled under `app/fonts/`) with a gradient fill.
- **3 export sizes**: Square 1080 × 1080, Portrait 1080 × 1350, Wide 1920 × 1080 — real PNGs rendered at full size from the same core as the live preview.
- **Live preview**: every change re-renders the cover at once. What you see is what the PNG will be.

## How it is built (canvas-first)

One pure-JS render core with no DOM dependency — `app/src/render-core.js` (`renderCover(surface, state)`) — draws the whole cover through a small surface interface. The browser hands it a canvas surface (`app/src/canvas-surface.js`); the screenshot renderer hands it a pixel surface. Layouts (`layouts.js`), grades (`grades.js`), caption lettering (`caption.js`) and crop math (`photos.js`) are separate modules with one job each. The editor (`editor.js`, `main.js`) is DOM controls around the preview canvas, and the exporter (`exporter.js`) renders the same core at full size into an offscreen canvas and downloads the PNG.

Because the core has no DOM dependency, the screenshots are the app's own output: a small Node script (`entries/gta6-cover-art-01-tools/make-shots.mjs`, outside this repo) drives the same core on a software surface, using the kit's free sample photos, and saves the real exported PNGs (also kept beside that script as proof of export). The editor screenshot is the app's own canvas drawing of its editor state — the live preview rendered by the core, plus the control chrome drawn with the same surface. No screenshot was edited, composited from other sources, or borrowed. The only image decoding, glyph rasterization and JPEG encoding the script needs are done by `imgtool.py`, the way a browser provides those same platform services.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request. `main.ts` hands the entry in (copies `app/` + `screenshots/` to `/output` and writes `dossier.json`).

## Originality

Cover Heist is an original design. It uses no Rockstar Games logo, wordmark, official artwork, character or font. The title font is Anton (Copyright 2020 The Anton Project Authors, SIL Open Font License, `app/fonts/OFL.txt`). The sample photos under `app/samples/` were made for this bounty with an image model and are free to use; they show no real person photographed without agreement.

## Verification (19 Nov 2026, in-session)

- `main.ts` run 3×: `dossier.json` byte-identical each time, sha256 `367f858bab464e2305c319b1b4a0b5b011b92a61bec1e2daf2ca3bde777665e5`, 862,185 bytes (cap 1.5 MiB).
- `node --check` passes on all 9 app sources (1,420 lines) and on the screenshot tooling.
- Zero network references in `app/`: the only `http` strings anywhere are the two URLs inside the verbatim OFL license text in `app/fonts/OFL.txt`, not loadable references.
- `app/`: 15 files, 343,409 bytes (caps: 993 files, 48 MiB); `index.html` 5,045 bytes (cap 1 MiB).
- Screenshots (all within the 256 KiB / 1280px limits): `1-cover.jpg` 1280×720, 139,281 B; `2-editor.jpg` 1280×800, 156,559 B; `3-sizes.jpg` 1280×800, 142,063 B; `4-caption.jpg` 1024×1280, 169,214 B.
- Real export PNGs produced by the core and verified as valid PNGs: wide 1920×1080, portrait 1080×1350.
- Served locally with `node serve.ts`: `index.html`, `src/main.js` and the bundled font all return 200.
