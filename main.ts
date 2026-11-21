// Velvet Hour — entry program for make.fun (gta6-cover-art-01).
// Copies app/ and screenshots/ from this repository into the output
// directory (MAKEFUN_OUTPUT_DIR, or /output in the grader) and writes the
// dossier with the kit's own library, byte for byte as the scorer rebuilds
// it. Node 22 standard library only; runs as-is with `node main.ts`.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const root = fileURLToPath(new URL(".", import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

// ---- pre-submit validation -------------------------------------------------
// The gate's hard limits, checked before anything is copied or written, so
// a broken entry fails here with a readable reason instead of scoring 0.

const SHOT_MAX_BYTES = 256 * 1024;
const SHOT_LONG_MAX = 1280;
const SHOT_SHORT_MIN = 480;
const APP_MAX_FILES = 993;
const APP_MAX_BYTES = 48 * 1024 * 1024;
const INDEX_MAX_BYTES = 1024 * 1024;

function imageSize(bytes: Uint8Array): { w: number; h: number; kind: string } | null {
  if (bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { w: view.getUint32(16), h: view.getUint32(20), kind: "png" };
  }
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) { i++; continue; }
      const marker = bytes[i + 1];
      const len = (bytes[i + 2] << 8) + bytes[i + 3];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { w: (bytes[i + 7] << 8) + bytes[i + 8], h: (bytes[i + 5] << 8) + bytes[i + 6], kind: "jpeg" };
      }
      if (len < 2) break;
      i += 2 + len;
    }
  }
  return null;
}

function walk(dir: string, base: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = base ? base + "/" + name : name;
    if (statSync(full).isDirectory()) walk(full, rel, out);
    else out.push(rel);
  }
}

function validateEntry(appDir: string, shotsDir: string): void {
  const problems: string[] = [];
  // screenshots: 3 or 4 whole images, each inside the size box
  const shots = readdirSync(shotsDir).filter((n) => !n.startsWith("."));
  if (shots.length < 3 || shots.length > 4) {
    problems.push("screenshots/ holds " + shots.length + " files; the gate wants 3 or 4");
  }
  for (const name of shots) {
    const bytes = readFileSync(join(shotsDir, name));
    if (bytes.length > SHOT_MAX_BYTES) {
      problems.push(name + " is " + bytes.length + " bytes; the limit is " + SHOT_MAX_BYTES);
    }
    const size = imageSize(bytes);
    if (!size) {
      problems.push(name + " is not a whole PNG or JPEG");
    } else {
      const long = Math.max(size.w, size.h);
      const short = Math.min(size.w, size.h);
      if (long > SHOT_LONG_MAX) problems.push(name + " long side " + long + " exceeds " + SHOT_LONG_MAX);
      if (short < SHOT_SHORT_MIN) problems.push(name + " short side " + short + " is under " + SHOT_SHORT_MIN);
    }
  }
  // app/: file count, total bytes, index.html size, no network references
  const files: string[] = [];
  walk(appDir, "", files);
  let total = 0;
  for (const rel of files) {
    const full = join(appDir, rel);
    const bytes = statSync(full).size;
    total += bytes;
    if (rel === "index.html" && bytes > INDEX_MAX_BYTES) {
      problems.push("app/index.html is " + bytes + " bytes; the limit is " + INDEX_MAX_BYTES);
    }
    const ext = extname(rel).toLowerCase();
    if ([".html", ".js", ".mjs", ".css", ".json"].includes(ext)) {
      const text = readFileSync(full, "utf8");
      if (/https?:\/\//.test(text)) {
        problems.push("app/" + rel + " names a network address; the app must work fully offline");
      }
    }
  }
  if (files.length > APP_MAX_FILES) {
    problems.push("app/ holds " + files.length + " files; the limit is " + APP_MAX_FILES);
  }
  if (total > APP_MAX_BYTES) {
    problems.push("app/ totals " + total + " bytes; the limit is " + APP_MAX_BYTES);
  }
  if (problems.length) {
    throw new Error("validateEntry refused this entry:\n - " + problems.join("\n - "));
  }
}

function main(): void {
  const appDir = join(root, "app");
  const shotsDir = join(root, "screenshots");
  if (!existsSync(join(appDir, "index.html"))) {
    throw new Error("app/index.html is missing; nothing to hand in");
  }
  if (!existsSync(shotsDir)) {
    throw new Error("screenshots/ is missing; nothing to hand in");
  }
  validateEntry(appDir, shotsDir);
  mkdirSync(outDir, { recursive: true });
  cpSync(appDir, join(outDir, "app"), { recursive: true });
  cpSync(shotsDir, join(outDir, "screenshots"), { recursive: true });
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  });
  writeFileSync(join(outDir, "dossier.json"), dossier);
  console.log("velvet-hour: dossier written to " + join(outDir, "dossier.json"));
}

main();
