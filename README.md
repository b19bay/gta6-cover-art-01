[![make.fun — Make GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![make.fun rank](https://make.fun/badge/gta6-cover-art-01/b19bay/gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![make.fun reward](https://make.fun/badge/gta6-cover-art-01/b19bay/gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01)

# Velvet Hour — GTA-Style Cover Art Maker

Velvet Hour turns your photo and a caption into GTA-style cover art: a
multi-panel poster wall with a Vice City sunset grade, chrome lettering and
a neon script subtitle, exported as a PNG ready to post. It runs entirely
offline in a desktop browser from the static files in `app/` — your photos
are read locally with FileReader and never leave your machine.

## The cover

- **Eight-panel cast mosaic.** A photographic demo cast of eight — THE BOSS,
  THE DRIVER, THE SIREN, THE FIXER, THE CAPTAIN, THE GHOST, THE LEDGER and
  THE WHEELMAN — each panel lettered with a slanted role tag and unified by
  one warm sunset grade. The hero panel (THE BOSS) is drawn larger and pops
  out over the top edge of the panel wall.
- **Poster furniture.** A gold-to-magenta chrome title "VELVET HOUR", the
  neon script line "every tide has a price", a five-star review strip,
  "VOL. 1", a gold "BEST CREW 2026" seal, a credits block, a barcode and a
  "COMING SOON" band.
- **Four layouts** — Cast Mosaic, Hero & Crew, Even Grid and Night Strip.
- **Four colour grades** — Sunset Melt, Neon Tide, Golden Hour and Midnight
  Noir — applied as a gradient map with saturation, contrast, warmth and
  vignette over every panel.

## Make it yours

1. Open the app (see below) — the demo cast is already loaded.
2. Click any cast member, then load your own photo into that panel; drag on
   the preview or use the Focus X / Focus Y sliders to position it, and the
   Zoom slider to crop it. One photo can fill a panel, or spread your own
   shots across the whole wall.
3. Edit the title, subtitle and caption; set the caption size, position,
   outline and shadow.
4. Pick a layout and a grade, choose an export size — 1080×1080,
   1080×1350 or 1920×1080 — and download the PNG.

## Run it

```sh
node serve.ts   # serves app/ at http://localhost:8080
```

Any static file server pointed at `app/` works just as well; there is no
build step and the app makes no network requests. Opening the app with
`?shot=cover`, `?shot=editor`, `?shot=sizes` or `?shot=caption` paints one
of the screenshot scenes with the app's own renderers — that is how the
images in `screenshots/` were made (driven under Node by
`tools/render.mjs`, which runs the same render core).

## Handing it in

`node main.ts` copies `app/` and `screenshots/` to the output directory
(`MAKEFUN_OUTPUT_DIR`, or `/output` in the grader) and writes
`dossier.json` with `buildDossier` from `vendor/makefun-app.ts`, the kit's
library, unchanged. Before anything is written, `validateEntry` checks the
screenshots and the app against the gate's limits and refuses with a
readable reason if anything is out of bounds.

## Layout of this repository

- `app/` — the web app: `index.html`, `style.css`, `src/` (cast, grades,
  cover renderer, editor scenes, screenshot scenes, browser wiring) and
  `samples/` (the eight demo cast portraits, generated with an image model
  for this app).
- `screenshots/` — the four screenshots listed in `shots.json`.
- `main.ts` — the entry program. `serve.ts` — a local static server.
- `tools/` — the Node screenshot driver and its canvas platform shim.
- `vendor/makefun-app.ts` — the make.fun dossier library, copied unchanged
  from the competition kit.

Everything here is original work for this bounty: no Rockstar Games logos,
artwork, characters or fonts. Lettering uses system font stacks only, and
the code is MIT licensed (see `LICENSE`).
