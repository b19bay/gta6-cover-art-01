[![Competition](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/b19bay/gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/b19bay/gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01)

# Velvet Tide — Cast-Grid Cover Studio

An offline cover-art maker in the GTA poster tradition: drop in your own
photos, or start from the illustrated cast, and export a poster-grade cover
as a PNG. Everything runs locally in the browser — photos are read with
FileReader on your own machine and never leave it.

## What it does

- **Cast Grid hero layout** — 7 distinct illustrated panels, each with its
  own role tag (THE SIREN, THE SMUGGLER, THE DIVER, THE DEALER, THE GHOST,
  THE MAYOR, THE ROOKIE), a pop-out hero who breaks the frame, a retro
  chrome title over the art, and full poster furniture: tagline, credits
  block, review-quote strip, round seal, barcode and a COMING SOON strip.
- **Photo layouts** — Photo Hero, Photo Grid and Split Duo fill panels from
  your photos with face-aware cover crops; drag to reposition and zoom
  every panel independently, or fill several panels from one photo.
- **Caption editor** — headline text, size, placement (top / centre / foot),
  outline and drop shadow, plus a script subtitle line.
- **4 colour grades** — Sunset, Neon, Golden Hour and Midnight, drawn as
  layered Vice City sunset and neon recipes over photos and art alike.
- **3 export sizes** — PNG at 1080 x 1080, 1080 x 1350 and 1920 x 1080 in
  a couple of clicks.

## How it is built

Canvas-first: one dependency-free render core (`app/src/render-core.js`)
draws both the exported covers and the editor preview, and illustrates the
cast panels itself (`app/src/cast-art.js`) — painted-look characters with
varied silhouettes, palettes, props and backdrops, no artwork taken from
any game. Lettering uses a system font stack only (heavy condensed sans)
with layered canvas chrome effects; no font files are shipped and no
network request is ever made.

## Run it

```sh
node serve.ts        # serves app/ at http://localhost:8080
node main.ts         # hands the entry in: app/ + screenshots/ + dossier.json
```

MIT licensed — see `LICENSE`.
