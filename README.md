[![make.fun — Make GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![make.fun rank](https://make.fun/badge/gta6-cover-art-01/b19bay/gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![make.fun reward](https://make.fun/badge/gta6-cover-art-01/b19bay/gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01)

# Velvet Hour Cover Studio

An offline web app that turns your photos into GTA 6-style cover art: an
8-panel cast mosaic with a pop-out hero, slanted cast role tags, a retro
chrome title over the art, a neon script subtitle, a tagline ribbon, a
review strip, a credits block, a gold seal and a barcode — the full movie
poster treatment, in your own design.

## What it does

- **Cast Mosaic layout** — 8 panels filled from the built-in demo cast
  (eight cinematic portraits made with an image model for this app) or
  from your own photos, one unified Sunset Gold grade across every panel
  so the mosaic reads as a single poster.
- **Any photo** — load a photo into any panel, drag to reposition it,
  scroll or slide to zoom its crop; face-aware default crops.
- **4 layouts** (Cast Mosaic, Hero + Strip, Grid Four, Duet Split) and
  **4 grades** (Sunset Gold, Vice Sunset, Neon Nights, Dusk Teal).
- **Caption editing** — cover title in striped retro chrome, script
  subtitle and tagline ribbon, all editable live.
- **Export PNG in one click** at 1080 × 1080, 1080 × 1350 and
  1920 × 1080. Everything runs locally in the browser; photos never
  leave the machine.

## Run it

```sh
node serve.ts          # serves app/ at http://localhost:8080
```

Open the page, pick a layout and grade, swap in your photos, edit the
caption, export. No build step, no network requests, no uploads.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored make.fun library.

The demo cast portraits in `app/samples/` were generated with an image
model for this app and are free to use with it. All lettering uses system
font stacks — no font files are shipped, and no third-party artwork,
logos or fonts are included.
