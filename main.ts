// Velvet Hour Cover Studio -- the hand-in program (Node 22, standard
// library only). The app itself is app/: plain static files a desktop
// browser opens offline. This program copies app/ and screenshots/ from
// beside this file into the output directory and writes dossier.json
// there with buildDossier from vendor/makefun-app.ts, the kit's library,
// unchanged -- the scorer rebuilds the dossier with its own copy of the
// same library and compares the bytes.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// (MAKEFUN_OUTPUT_DIR stands in for /output outside the grader.)
// Serve the app itself with `node serve.ts`.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Pre-submit validation, in this program rather than left to the gate:
// the entry is refused here, with a readable reason, when the screenshots
// are missing or oversize or app/ has grown past the platform's entry
// cap -- the same limits buildDossier is called with below.
function validateEntry(root) {
  const shotsDir = join(root, 'screenshots');
  const shots = existsSync(shotsDir)
    ? readdirSync(shotsDir).filter((n) => /\.(png|jpe?g)$/i.test(n) && !n.startsWith('.'))
    : [];
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`validateEntry: screenshots/ holds ${shots.length} images, the entry needs 3 or 4`);
  }
  for (const name of shots) {
    const bytes = statSync(join(shotsDir, name)).size;
    if (bytes > 262144) throw new Error(`validateEntry: screenshots/${name} is ${bytes} bytes, over the 256 KiB cap`);
  }
  let entries = 0;
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      entries++;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
    }
  };
  walk(join(root, 'app'));
  if (entries > 993) throw new Error(`validateEntry: app/ holds ${entries} files and directories, over the 993 cap`);
}
validateEntry(here);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's own caps, passed through so this program refuses anything
// the scorer would refuse: the dossier text cap shapes the bytes, the
// rest are limits (4 screenshots of at most 256 KiB; app/ at most 993
// entries and 48 MiB; a path under app/ at most 1000 bytes).
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
