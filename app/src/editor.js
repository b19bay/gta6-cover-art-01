// Editor: the DOM controls around the preview canvas, and the pointer
// gestures on the canvas itself. The state lives in one object in main.js;
// this file only wires controls to it and re-renders on every change, so
// the preview is always the current cover, never a stale picture.
//
// Gestures on the preview: click a panel to select it, drag to move the
// selected panel's photo inside its frame, scroll to zoom it in and out.

import { LAYOUTS, panelsFor, panelAt } from './layouts.js';
import { GRADES } from './grades.js';
import { EXPORT_SIZES } from './exporter.js';
import { loadPhotoFile, loadSamplePhoto, fillAllPanels } from './photos.js';

export function buildEditor(root, api) {
  const { state, render, onStateChange } = api;
  const preview = root.querySelector('#preview');
  const panelList = root.querySelector('#panel-list');
  const photoTray = root.querySelector('#photo-tray');
  const statusLine = root.querySelector('#status');

  function setStatus(message) {
    if (statusLine) statusLine.textContent = message;
  }

  function refreshPanelList() {
    const panels = panelsFor(state.layoutId, 100, 100);
    panelList.innerHTML = '';
    panels.forEach((_panel, index) => {
      const row = document.createElement('div');
      row.className = 'panel-row' + (index === state.selectedPanel ? ' selected' : '');
      const assignment = state.assignments[index] || {};
      const photo = state.photos.find((item) => item.id === assignment.photoId);
      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'panel-name';
      label.textContent = `Panel ${index + 1}${photo ? ` — ${photo.name}` : ' — empty'}`;
      label.addEventListener('click', () => {
        state.selectedPanel = index;
        onStateChange();
      });
      const zoom = document.createElement('input');
      zoom.type = 'range';
      zoom.min = '1';
      zoom.max = '3';
      zoom.step = '0.05';
      zoom.value = String(assignment.zoom || 1);
      zoom.setAttribute('aria-label', `Zoom panel ${index + 1}`);
      zoom.addEventListener('input', () => {
        state.assignments[index] = { ...assignment, zoom: Number(zoom.value) };
        onStateChange();
      });
      row.append(label, zoom);
      panelList.appendChild(row);
    });
  }

  function refreshPhotoTray() {
    photoTray.innerHTML = '';
    if (state.photos.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'hint';
      empty.textContent = 'No photos yet. Add your own, or try a sample below.';
      photoTray.appendChild(empty);
    }
    state.photos.forEach((photo) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'photo-chip';
      chip.textContent = photo.name;
      chip.title = 'Click: use in the selected panel. Shift-click: fill every panel.';
      chip.addEventListener('click', (event) => {
        if (event.shiftKey) {
          const panels = panelsFor(state.layoutId, 100, 100);
          state.assignments = fillAllPanels(state.assignments, panels.length, photo.id);
          setStatus(`Filled every panel with ${photo.name}.`);
        } else {
          state.assignments[state.selectedPanel] = {
            ...(state.assignments[state.selectedPanel] || { zoom: 1, cx: 0.5, cy: 0.5 }),
            photoId: photo.id,
          };
          setStatus(`Panel ${state.selectedPanel + 1} now shows ${photo.name}.`);
        }
        onStateChange();
      });
      photoTray.appendChild(chip);
    });
  }

  function refreshLayoutButtons() {
    root.querySelectorAll('[data-layout]').forEach((button) => {
      button.classList.toggle('active', button.dataset.layout === state.layoutId);
    });
  }

  function refreshGradeButtons() {
    root.querySelectorAll('[data-grade]').forEach((button) => {
      button.classList.toggle('active', button.dataset.grade === state.gradeId);
    });
  }

  function refreshExportButtons() {
    root.querySelectorAll('[data-export]').forEach((button) => {
      button.disabled = state.photos.length === 0;
    });
  }

  function refreshAll() {
    refreshPanelList();
    refreshPhotoTray();
    refreshLayoutButtons();
    refreshGradeButtons();
    refreshExportButtons();
  }

  // Layout and grade pickers.
  root.querySelectorAll('[data-layout]').forEach((button) => {
    button.addEventListener('click', () => {
      state.layoutId = button.dataset.layout;
      state.selectedPanel = 0;
      onStateChange();
    });
  });
  root.querySelectorAll('[data-grade]').forEach((button) => {
    button.addEventListener('click', () => {
      state.gradeId = button.dataset.grade;
      onStateChange();
    });
  });

  // Photo intake: file picker, drag-and-drop onto the preview, samples.
  const fileInput = root.querySelector('#photo-input');
  async function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    let added = 0;
    for (const file of files) {
      try {
        const photo = await loadPhotoFile(file);
        state.photos.push(photo);
        added++;
      } catch (error) {
        setStatus(error.message);
      }
    }
    if (added > 0) {
      const panels = panelsFor(state.layoutId, 100, 100);
      const last = state.photos[state.photos.length - 1];
      if (state.photos.length === added) {
        state.assignments = fillAllPanels(state.assignments, panels.length, last.id);
      }
      setStatus(`Added ${added} photo${added === 1 ? '' : 's'}. Click a panel, then a photo, to place it.`);
      onStateChange();
    }
  }
  fileInput.addEventListener('change', () => {
    addFiles(fileInput.files);
    fileInput.value = '';
  });
  root.querySelector('#add-photos').addEventListener('click', () => fileInput.click());
  preview.addEventListener('dragover', (event) => event.preventDefault());
  preview.addEventListener('drop', (event) => {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  });
  root.querySelectorAll('[data-sample]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        const photo = await loadSamplePhoto(button.dataset.sample, `samples/${button.dataset.sample}.jpg`);
        if (!state.photos.some((item) => item.id === photo.id)) state.photos.push(photo);
        const panels = panelsFor(state.layoutId, 100, 100);
        state.assignments = fillAllPanels(state.assignments, panels.length, photo.id);
        setStatus(`Sample ${photo.name} loaded into every panel.`);
        onStateChange();
      } catch (error) {
        setStatus(error.message);
      }
    });
  });

  // Caption controls.
  const captionInput = root.querySelector('#caption-text');
  captionInput.addEventListener('input', () => {
    state.caption.text = captionInput.value;
    onStateChange();
  });
  const sizeInput = root.querySelector('#caption-size');
  sizeInput.addEventListener('input', () => {
    state.caption.size = Number(sizeInput.value) / 100;
    onStateChange();
  });
  root.querySelector('#caption-placement').addEventListener('change', (event) => {
    state.caption.placement = event.target.value;
    onStateChange();
  });
  root.querySelector('#caption-outline').addEventListener('change', (event) => {
    state.caption.outline = event.target.checked;
    onStateChange();
  });
  root.querySelector('#caption-shadow').addEventListener('change', (event) => {
    state.caption.shadow = event.target.checked;
    onStateChange();
  });
  const taglineInput = root.querySelector('#tagline-text');
  taglineInput.addEventListener('input', () => {
    state.tagline = taglineInput.value;
    onStateChange();
  });

  // Export buttons.
  root.querySelectorAll('[data-export]').forEach((button) => {
    button.addEventListener('click', () => api.exportNow(button.dataset.export));
  });
  root.querySelector('#canvas-size').addEventListener('change', (event) => {
    state.canvasSize = event.target.value;
    onStateChange();
  });

  // Pointer gestures on the preview canvas.
  let drag = null;
  function coverPoint(event) {
    const rect = preview.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (preview.width / rect.width),
      y: (event.clientY - rect.top) * (preview.height / rect.height),
    };
  }
  preview.addEventListener('pointerdown', (event) => {
    const point = coverPoint(event);
    const panels = panelsFor(state.layoutId, preview.width, preview.height);
    const hit = panelAt(panels, point.x, point.y);
    if (hit === -1) return;
    state.selectedPanel = hit;
    const assignment = state.assignments[hit] || { zoom: 1, cx: 0.5, cy: 0.5 };
    drag = { panel: hit, startX: point.x, startY: point.y, cx: assignment.cx, cy: assignment.cy };
    preview.setPointerCapture(event.pointerId);
    onStateChange();
  });
  preview.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const point = coverPoint(event);
    const panels = panelsFor(state.layoutId, preview.width, preview.height);
    const panel = panels[drag.panel];
    const box = panel.kind === 'rect'
      ? { x: panel.x, y: panel.y, w: panel.w, h: panel.h }
      : { x: 0, y: 0, w: preview.width, h: preview.height };
    const assignment = state.assignments[drag.panel] || { zoom: 1, cx: 0.5, cy: 0.5 };
    const nextCx = drag.cx - (point.x - drag.startX) / box.w / (assignment.zoom || 1);
    const nextCy = drag.cy - (point.y - drag.startY) / box.h / (assignment.zoom || 1);
    state.assignments[drag.panel] = {
      ...assignment,
      cx: Math.max(0, Math.min(1, nextCx)),
      cy: Math.max(0, Math.min(1, nextCy)),
    };
    render();
  });
  preview.addEventListener('pointerup', () => { drag = null; });
  preview.addEventListener('wheel', (event) => {
    event.preventDefault();
    const assignment = state.assignments[state.selectedPanel] || { zoom: 1, cx: 0.5, cy: 0.5 };
    const next = Math.max(1, Math.min(3, (assignment.zoom || 1) * (event.deltaY < 0 ? 1.1 : 0.9)));
    state.assignments[state.selectedPanel] = { ...assignment, zoom: next };
    onStateChange();
  }, { passive: false });

  return { refreshAll, setStatus };
}

export { LAYOUTS, GRADES, EXPORT_SIZES };
