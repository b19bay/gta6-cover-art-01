// Photos: loading, per-panel assignment, and crop math.
// Photos never leave the machine: FileReader turns a chosen file into a
// local image, and the two bundled samples are plain files under app/.
// The render core only ever sees a photo handle {width, height, image} and
// a crop {zoom, cx, cy} per panel, so one photo can fill every panel with a
// different focus, or each panel can hold its own photo.

export function makePhoto(id, name, width, height, image) {
  return { id, name, width, height, image };
}

export function defaultPanelCrop() {
  return { zoom: 1, cx: 0.5, cy: 0.5 };
}

// Cover-fit source rectangle: the largest crop of the photo that fills the
// panel at the requested zoom, centred on the focus point (cx, cy in 0..1).
// Zooming in shrinks the source rect; dragging moves the focus point.
export function coverSourceRect(photo, panelW, panelH, crop) {
  const panelRatio = panelW / panelH;
  const photoRatio = photo.width / photo.height;
  let sw;
  let sh;
  if (photoRatio > panelRatio) {
    sh = photo.height;
    sw = sh * panelRatio;
  } else {
    sw = photo.width;
    sh = sw / panelRatio;
  }
  sw /= crop.zoom;
  sh /= crop.zoom;
  const maxX = photo.width - sw;
  const maxY = photo.height - sh;
  const sx = Math.max(0, Math.min(maxX, crop.cx * photo.width - sw / 2));
  const sy = Math.max(0, Math.min(maxY, crop.cy * photo.height - sh / 2));
  return { sx, sy, sw, sh };
}

// Load a user-chosen file into a photo handle. Rejects anything that is not
// an image the browser can decode.
export function loadPhotoFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      reject(new Error('That file is not an image.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        resolve(makePhoto(
          `photo-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          file.name,
          image.naturalWidth,
          image.naturalHeight,
          image,
        ));
      };
      image.onerror = () => reject(new Error('That image could not be decoded.'));
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Load one of the bundled sample photos (free to use, made for this bounty).
export function loadSamplePhoto(name, path) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(makePhoto(`sample-${name}`, name, image.naturalWidth, image.naturalHeight, image));
    };
    image.onerror = () => reject(new Error(`Could not load sample ${name}.`));
    image.src = path;
  });
}

// Point the selected panel at a photo, keeping its crop. Returns a new
// panel-assignments array; the state itself stays immutable here.
export function assignPhoto(assignments, panelIndex, photoId) {
  const next = assignments.slice();
  next[panelIndex] = { ...(next[panelIndex] || defaultPanelCrop()), photoId };
  return next;
}

// Point every panel at one photo, each keeping its own crop focus.
export function fillAllPanels(assignments, panelCount, photoId) {
  const next = [];
  for (let i = 0; i < panelCount; i++) {
    next.push({ ...(assignments[i] || defaultPanelCrop()), photoId });
  }
  return next;
}

export function resizeAssignments(assignments, panelCount) {
  const next = [];
  for (let i = 0; i < panelCount; i++) {
    next.push(assignments[i] || { ...defaultPanelCrop(), photoId: null });
  }
  return next;
}
