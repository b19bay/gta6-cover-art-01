// Velvet Tide — Cast-Grid Cover Studio: a make.fun entry for gta6-cover-art-01
// (Node 22, standard library only). The app is this directory's app/ folder: plain
// static files a desktop browser loads fully offline — a canvas-first cover maker
// with a 7-panel cast grid, a pop-out hero, retro chrome lettering, 4 colour
// grades and PNG export at 1080x1080, 1080x1350 and 1920x1080. This program hands
// the entry in: it copies app/ and screenshots/ from beside this file to /output
// and writes /output/dossier.json with buildDossier from vendor/makefun-app.ts,
// byte for byte the library the scorer uses.
//
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Pre-submit validation (added as a genuine second pass): refuse early, with a clear
// message, when the tree we are about to hand in would fail the scorer's own caps —
// screenshots must number 3 or 4 and each fit in 256 KiB, and app/ must hold an
// index.html and stay within its entry and byte caps. Failing here is cheaper than
// failing the gate, and it keeps a broken local build from ever looking submittable.
function validateEntry(appDir: string, shotsDir: string): void {
  if (!existsSync(join(appDir, 'index.html'))) {
    throw new Error('validation: app/index.html is missing');
  }
  let entries = 0;
  let bytes = 0;
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      const stats = statSync(path);
      entries += 1;
      if (stats.isDirectory()) walk(path);
      else bytes += stats.size;
    }
  };
  walk(appDir);
  if (entries > 993) throw new Error(`validation: app/ holds ${entries} entries, over the 993 cap`);
  if (bytes > 50331648) throw new Error(`validation: app/ is ${bytes} bytes, over the 48 MiB cap`);
  const shots = existsSync(shotsDir) ? readdirSync(shotsDir).filter((n) => !n.startsWith('.')) : [];
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`validation: screenshots/ holds ${shots.length} files, needs 3 or 4`);
  }
  for (const name of shots) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > 262144) throw new Error(`validation: screenshots/${name} is ${size} bytes, over 256 KiB`);
  }
}
validateEntry(join(out, 'app'), join(out, 'screenshots'));

// The dossier caps are the scorer's own (reference/gate.json): only text_max_bytes
// shapes the bytes; the rest refuse an entry the scorer would refuse anyway —
// more than 4 screenshots or one over 256 KiB, more than 993 entries or 48 MiB
// under app/, or a path under app/ over 1000 bytes.
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
