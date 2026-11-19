// A working gta6-cover-art-01 entry (Node 22, standard library only): the app is this directory's app/ folder, plain
// static files a desktop browser loads offline (app/index.html and its ES modules, no library and no network
// request), and the program hands it in. It copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun library. Only the plumbing, not the
// cover art the bounty asks for: Cover Snap, a plain one-photo square cover with a sunset tint and a bold caption,
// exported as a 1080 x 1080 PNG. Its two sample photos (app/samples/) were made for make.fun with an image model and
// are free to use. Build your own GTA-style cover maker in its place, put your 3 or 4 PNG or JPEG screenshots in
// screenshots/ (the first by name is the cover) and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Pre-submit gate validation (authored): refuse to build an entry the scorer would refuse, before any copy.
// Caps mirror the scorer's reference/gate.json and the buildDossier call below.
const gateErrors = [];
const appDir = join(here, 'app');
const shotsDir = join(here, 'screenshots');
if (!existsSync(join(appDir, 'index.html'))) gateErrors.push('app/index.html is missing');
let appEntries = 0;
let appBytes = 0;
const walkApp = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    appEntries += 1;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walkApp(p);
    else if (entry.isFile()) appBytes += statSync(p).size;
  }
};
if (existsSync(appDir)) walkApp(appDir);
else gateErrors.push('app/ is missing');
if (appEntries > 993) gateErrors.push(`app/ holds ${appEntries} files+dirs, over the 993 cap`);
if (appBytes > 50331648) gateErrors.push(`app/ totals ${appBytes} bytes, over the 48 MiB cap`);
let shotCount = 0;
if (existsSync(shotsDir)) {
  for (const entry of readdirSync(shotsDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    shotCount += 1;
    const size = statSync(join(shotsDir, entry.name)).size;
    if (size > 262144) gateErrors.push(`screenshots/${entry.name} is ${size} bytes, over the 256 KiB cap`);
  }
}
if (shotCount < 3 || shotCount > 4) gateErrors.push(`screenshots/ holds ${shotCount} files, need 3-4`);
if (gateErrors.length > 0) {
  console.error('GATE FAILED: refusing to build an invalid entry:');
  for (const e of gateErrors) console.error(`  - ${e}`);
  process.exit(1);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
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
