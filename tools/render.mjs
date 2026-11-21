// Velvet Hour — screenshot driver.
// Drives the app's own render core (app/src/shots.js, the same scenes the
// browser paints for ?shot=<name>) under Node with the local canvas shim,
// and writes the four screenshots as gate-sized JPEGs.

import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, decodeJpeg, encodeJpeg } from "./canvas-shim.mjs";
import { CAST } from "../app/src/cast.js";
import { renderShot } from "../app/src/shots.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAX_BYTES = 256 * 1024;

const images = CAST.map((member) => {
  const path = join(root, "app", member.file);
  if (!existsSync(path)) throw new Error("missing sample " + path);
  return decodeJpeg(path);
});

const env = { createCanvas, images };

const shots = [
  ["cover", "1-cover.jpg"],
  ["editor", "2-editor.jpg"],
  ["sizes", "3-sizes.jpg"],
  ["caption", "4-caption.jpg"],
];

for (const [name, file] of shots) {
  const started = Date.now();
  const canvas = renderShot(name, env);
  const out = join(root, "screenshots", file);
  let quality = 86;
  encodeJpeg(canvas, out, quality);
  while (statSync(out).size > MAX_BYTES && quality > 40) {
    quality -= 8;
    encodeJpeg(canvas, out, quality);
  }
  const bytes = statSync(out).size;
  if (bytes > MAX_BYTES) throw new Error(file + " still too large at quality " + quality + ": " + bytes);
  console.log(file, canvas.width + "x" + canvas.height, bytes + " bytes", "q" + quality, Date.now() - started + "ms");
}
console.log("screenshots done");
