// main.ts — Cover Heist's hand-in program (Node 22, standard library only).
// The app is this directory's app/ folder: plain static files a desktop
// browser loads offline (app/index.html and its ES modules, no library, no
// network request). This program copies app/ and screenshots/ from beside
// this file to /output and writes /output/dossier.json, the summary the
// judge reads, with the vendored make.fun library in vendor/makefun-app.ts
// (the kit's copy, unchanged).
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the app locally with `node serve.ts`.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Pre-submit validation: refuse to hand in an entry the sealed gate would
// refuse, with the reason named, instead of copying it out and letting the
// dossier build fail (or worse, pass a broken tree along). The limits are
// the gate's own: app/ at most 993 entries and 48 MiB with index.html at
// most 1 MiB, and 3 to 4 screenshots of at most 256 KiB each.
function validateEntry(root: string): void {
  let appEntries = 0;
  let appBytes = 0;
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      const stats = statSync(path);
      appEntries += 1;
      if (stats.isDirectory()) walk(path);
      else appBytes += stats.size;
    }
  };
  walk(join(root, 'app'));
  if (appEntries > 993) throw new Error(`app/ holds ${appEntries} entries, over the 993 gate limit`);
  if (appBytes > 50331648) throw new Error(`app/ holds ${appBytes} bytes, over the 48 MiB gate limit`);
  const indexBytes = statSync(join(root, 'app', 'index.html')).size;
  if (indexBytes > 1048576) throw new Error(`app/index.html is ${indexBytes} bytes, over the 1 MiB gate limit`);
  const shots = readdirSync(join(root, 'screenshots')).filter((n) => !n.startsWith('.'));
  if (shots.length < 3 || shots.length > 4) throw new Error(`screenshots/ holds ${shots.length} images, outside the 3 to 4 gate range`);
  for (const name of shots) {
    const size = statSync(join(root, 'screenshots', name)).size;
    if (size > 262144) throw new Error(`screenshots/${name} is ${size} bytes, over the 256 KiB gate limit`);
  }
}
validateEntry(here);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The dossier is built with the scorer's own caps (reference/gate.json):
// the text cap shapes the bytes; the rest refuse an entry the scorer
// would refuse anyway.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
