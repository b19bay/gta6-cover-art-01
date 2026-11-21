[![Competition](https://make.fun/badge/gta6-cover-art-01.svg?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)](https://make.fun/c/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/b19bay/gta6-cover-art-01/rank.svg?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)](https://make.fun/c/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/b19bay/gta6-cover-art-01/reward.svg?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)](https://make.fun/c/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Cover Heist — 4 layouts, 4 grades, 3 export sizes: turn any photo + caption into GTA-style cover art

Cover Heist is an offline web app that turns a person's own photo and a
caption into GTA-style cover art: the multi-panel poster look, bold caption
lettering, and a Vice City sunset or neon colour grade, in an original
design with no third-party logos, artwork or fonts.

## What it does

- **4 multi-panel layouts** — Hero + Strip, Poster Grid, Diagonal Split and
  Spotlight — drawn by one pure-JS canvas render core (`app/src/render-cover.js`)
  shared by the browser editor and the screenshot renderer.
- **Any photo** — load photos from your own machine with FileReader (they are
  never uploaded), fill several panels with one photo or several, click a
  panel to select it, drag to crop and position, scroll to zoom.
- **4 colour grades** — Vice Sunset, Neon Nights, Golden Hour and Midnight
  Teal — applied as canvas pixel operations plus a per-panel wash
  (`app/src/pixel-grades.js`).
- **Caption editor** — headline and kicker text, size slider, top / center /
  bottom placement, and poster lettering with a sunset gradient fill, thick
  outline and hard shadow (`app/src/caption.js`). Lettering uses a system
  font stack only; no font file is shipped.
- **3 export sizes** — PNG export at 1080 x 1080, 1080 x 1350 and
  1920 x 1080 via `canvas.toBlob`, in a few steps from photo to post.
- **Live preview editor** — the cover re-renders on every change; the editor
  and sizes scenes (`app/src/render-editor.js`) are drawn by the app itself.

## Run it

Serve `app/` with any static file server and open it in a desktop browser:

```
node serve.ts
```

then visit the local address it prints. Or hand the entry in the make.fun
way, which copies `app/` and `screenshots/` to the output directory and
writes the dossier the judge reads:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

The two sample photos under `app/samples/` ship with the app so it works
the moment it opens; replace them with your own photos to make your cover.

## License

MIT — see `LICENSE`.
