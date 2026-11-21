// Velvet Hour — screenshot scenes.
// Each scene is painted by the app's own renderers (cover.js / editor.js) at
// a gate-sized canvas. The browser runs a scene when the page is opened with
// ?shot=<name>; the Node screenshot script drives the very same functions.

import { castSlots, defaultCoverState } from "./cover.js";
import { drawCover } from "./cover.js";
import { drawEditor, drawSizes } from "./editor.js";

export const SHOT_NAMES = ["cover", "editor", "sizes", "caption"];

export function shotState(images, variant) {
  const state = defaultCoverState();
  state.slots = castSlots(images);
  state.selectedPanel = 0;
  if (variant === "caption") {
    state.layout = "hero";
    state.gradeId = "neon";
    state.caption = "SHE OWNS THE HARBOUR NOW";
    state.captionSize = 52;
    state.captionPos = "bottom";
  }
  if (variant === "sizes") {
    state.layout = "grid";
    state.gradeId = "gold";
  }
  return state;
}

// Paint one named scene onto a fresh canvas from env and return the canvas.
export function renderShot(name, env) {
  const images = env.images;
  if (name === "editor") {
    const canvas = env.createCanvas(1280, 900);
    drawEditor(canvas.getContext("2d"), 1280, 900, shotState(images, "editor"), env);
    return canvas;
  }
  if (name === "sizes") {
    const canvas = env.createCanvas(1280, 960);
    drawSizes(canvas.getContext("2d"), 1280, 960, shotState(images, "sizes"), env);
    return canvas;
  }
  if (name === "caption") {
    const canvas = env.createCanvas(1024, 1280);
    drawCover(canvas.getContext("2d"), 1024, 1280, shotState(images, "caption"), env);
    return canvas;
  }
  const canvas = env.createCanvas(1280, 720);
  drawCover(canvas.getContext("2d"), 1280, 720, shotState(images, "cover"), env);
  return canvas;
}
