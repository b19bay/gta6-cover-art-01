// Velvet Hour — the browser editor.
// Loads the demo cast, lets you drop your own photo onto any panel, crop and
// position it, restyle the caption, switch layouts and grades, preview live
// on the cover canvas and export a PNG in the three common post sizes.
// Everything happens locally: photos are read with FileReader and never
// leave the machine. Opened with ?shot=<name>, the page instead paints one
// screenshot scene with the app's own renderers.

import { CAST, LAYOUTS, layoutById } from "./cast.js";
import { GRADES, gradeById } from "./grades.js";
import { EXPORT_SIZES, castSlots, defaultCoverState, drawCover } from "./cover.js";
import { renderShot } from "./shots.js";

const browserEnv = {
  createCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  },
  images: [],
};

const state = defaultCoverState();
state.slots = castSlots([]);
state.selectedPanel = 0;
state.exportSize = "square";

const els = {};
function el(id) {
  if (!els[id]) els[id] = document.getElementById(id);
  return els[id];
}

function refresh() {
  const canvas = el("preview");
  const size = EXPORT_SIZES.find((s) => s.id === state.exportSize) || EXPORT_SIZES[0];
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas.getContext("2d"), size.w, size.h, state, browserEnv);
  el("gradeName").textContent = gradeById(state.gradeId).name;
  el("layoutName").textContent = layoutById(state.layout).name;
}

function loadCastImages() {
  CAST.forEach((member, i) => {
    const img = new Image();
    img.onload = () => {
      state.slots[i].image = img;
      browserEnv.images[i] = img;
      refresh();
      markThumbLoaded(i);
    };
    img.src = member.file;
  });
}

function markThumbLoaded(i) {
  const thumb = document.querySelector('[data-thumb="' + i + '"]');
  if (thumb) thumb.classList.add("loaded");
}

function buildCastList() {
  const list = el("castList");
  CAST.forEach((member, i) => {
    const item = document.createElement("button");
    item.className = "cast-item";
    item.dataset.thumb = String(i);
    item.innerHTML = "";
    const name = document.createElement("span");
    name.className = "cast-role";
    name.textContent = member.role;
    const line = document.createElement("span");
    line.className = "cast-line";
    line.textContent = member.line;
    item.appendChild(name);
    item.appendChild(line);
    item.addEventListener("click", () => selectPanel(i));
    list.appendChild(item);
  });
}

function selectPanel(i) {
  state.selectedPanel = i;
  document.querySelectorAll(".cast-item").forEach((node, j) => {
    node.classList.toggle("selected", j === i);
  });
  const slot = state.slots[i];
  el("zoom").value = String(Math.round(slot.zoom * 100));
  el("focusX").value = String(Math.round(slot.focusX * 100));
  el("focusY").value = String(Math.round(slot.focusY * 100));
  el("panelName").textContent = CAST[i].role;
}

function readPhotoFile(file, panelIndex) {
  if (!file || !file.type || file.type.indexOf("image/") !== 0) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      state.slots[panelIndex].image = img;
      state.slots[panelIndex].role = "YOU";
      refresh();
    };
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
}

function buildLayoutButtons() {
  const wrap = el("layoutButtons");
  LAYOUTS.forEach((layout) => {
    const b = document.createElement("button");
    b.textContent = layout.name;
    b.className = "chip" + (state.layout === layout.id ? " active" : "");
    b.title = layout.blurb;
    b.addEventListener("click", () => {
      state.layout = layout.id;
      wrap.querySelectorAll(".chip").forEach((n) => n.classList.remove("active"));
      b.classList.add("active");
      refresh();
    });
    wrap.appendChild(b);
  });
}

function buildGradeButtons() {
  const wrap = el("gradeButtons");
  GRADES.forEach((grade) => {
    const b = document.createElement("button");
    b.className = "grade-chip" + (state.gradeId === grade.id ? " active" : "");
    b.textContent = grade.name;
    b.style.background = "linear-gradient(180deg," + grade.sky.join(",") + ")";
    b.addEventListener("click", () => {
      state.gradeId = grade.id;
      wrap.querySelectorAll(".grade-chip").forEach((n) => n.classList.remove("active"));
      b.classList.add("active");
      refresh();
    });
    wrap.appendChild(b);
  });
}

function buildSizeButtons() {
  const wrap = el("sizeButtons");
  EXPORT_SIZES.forEach((size) => {
    const b = document.createElement("button");
    b.textContent = size.w + "x" + size.h;
    b.className = "chip" + (state.exportSize === size.id ? " active" : "");
    b.addEventListener("click", () => {
      state.exportSize = size.id;
      wrap.querySelectorAll(".chip").forEach((n) => n.classList.remove("active"));
      b.classList.add("active");
      refresh();
    });
    wrap.appendChild(b);
  });
}

function exportPng() {
  const size = EXPORT_SIZES.find((s) => s.id === state.exportSize) || EXPORT_SIZES[0];
  const off = browserEnv.createCanvas(size.w, size.h);
  drawCover(off.getContext("2d"), size.w, size.h, state, browserEnv);
  off.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "velvet-hour-" + size.w + "x" + size.h + ".png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, "image/png");
}

function wireControls() {
  el("photoInput").addEventListener("change", (ev) => {
    const file = ev.target.files && ev.target.files[0];
    readPhotoFile(file, state.selectedPanel);
  });
  el("zoom").addEventListener("input", (ev) => {
    state.slots[state.selectedPanel].zoom = Number(ev.target.value) / 100;
    refresh();
  });
  el("focusX").addEventListener("input", (ev) => {
    state.slots[state.selectedPanel].focusX = Number(ev.target.value) / 100;
    refresh();
  });
  el("focusY").addEventListener("input", (ev) => {
    state.slots[state.selectedPanel].focusY = Number(ev.target.value) / 100;
    refresh();
  });
  el("captionText").addEventListener("input", (ev) => {
    state.caption = ev.target.value.toUpperCase();
    refresh();
  });
  el("titleText").addEventListener("input", (ev) => {
    state.title = ev.target.value.toUpperCase() || "VELVET HOUR";
    refresh();
  });
  el("subtitleText").addEventListener("input", (ev) => {
    state.subtitle = ev.target.value;
    refresh();
  });
  el("captionSize").addEventListener("input", (ev) => {
    state.captionSize = Number(ev.target.value);
    refresh();
  });
  el("captionOutline").addEventListener("change", (ev) => {
    state.captionOutline = ev.target.checked;
    refresh();
  });
  el("captionShadow").addEventListener("change", (ev) => {
    state.captionShadow = ev.target.checked;
    refresh();
  });
  el("captionPos").addEventListener("change", (ev) => {
    state.captionPos = ev.target.value;
    refresh();
  });
  el("exportBtn").addEventListener("click", exportPng);
  el("exportBtnTop").addEventListener("click", exportPng);
  // drag on the preview repositions the selected panel's photo
  const canvas = el("preview");
  let dragging = false;
  canvas.addEventListener("pointerdown", (ev) => {
    dragging = true;
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const slot = state.slots[state.selectedPanel];
    slot.focusX = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
    slot.focusY = Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height));
    el("focusX").value = String(Math.round(slot.focusX * 100));
    el("focusY").value = String(Math.round(slot.focusY * 100));
    refresh();
  });
  canvas.addEventListener("pointerup", () => {
    dragging = false;
  });
  canvas.addEventListener("dragover", (ev) => ev.preventDefault());
  canvas.addEventListener("drop", (ev) => {
    ev.preventDefault();
    const file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    readPhotoFile(file, state.selectedPanel);
  });
}

function runShotMode() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get("shot");
  if (!shot) return false;
  document.body.classList.add("shot-mode");
  const mount = document.getElementById("shotMount");
  CAST.forEach((member, i) => {
    const img = new Image();
    img.onload = () => {
      browserEnv.images[i] = img;
      if (browserEnv.images.filter(Boolean).length === CAST.length) {
        const canvas = renderShot(shot, browserEnv);
        mount.replaceChildren(canvas);
      }
    };
    img.src = member.file;
  });
  return true;
}

function init() {
  if (runShotMode()) return;
  buildCastList();
  buildLayoutButtons();
  buildGradeButtons();
  buildSizeButtons();
  wireControls();
  selectPanel(0);
  loadCastImages();
  refresh();
}

init();
