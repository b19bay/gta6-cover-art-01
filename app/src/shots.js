// Fixed scenes for screenshots: ?shot=cover shows the cover alone,
// ?shot=editor shows the editor canvas. The query picks the sample photos,
// the caption, the layout and the grade. main.js applies the scene and
// sets window.__shotReady once painted.
import { defaultState } from './render-core.js';

export const SHOT_SCENES = {
  cover: {
    mode: 'cover',
    layout: 'hero-strip',
    grade: 'sunset',
    caption: 'Sunset Heist',
    photos: ['pier', 'boulevard'],
    size: [1080, 1080],
  },
  editor: {
    mode: 'editor',
    layout: 'hero-strip',
    grade: 'sunset',
    caption: 'Sunset Heist',
    photos: ['pier', 'boulevard'],
    size: [1280, 800],
  },
  sizes: {
    mode: 'sizes',
    layout: 'grid',
    grade: 'neon',
    caption: 'Neon Nights',
    photos: ['boulevard', 'pier'],
    size: [1280, 800],
  },
  portrait: {
    mode: 'cover',
    layout: 'diagonal',
    grade: 'neon',
    caption: 'Neon Nights',
    photos: ['boulevard', 'pier'],
    size: [1080, 1350],
  },
};

/** Builds the state for a shot scene, honouring query overrides. */
export function shotScene(shot, query) {
  const scene = SHOT_SCENES[shot] ?? SHOT_SCENES.cover;
  const state = defaultState(
    query.get('layout') ?? scene.layout,
    query.get('grade') ?? scene.grade,
    query.get('caption') ?? scene.caption,
  );
  state.caption.position = query.get('position') ?? 'bottom';
  return {
    mode: scene.mode,
    state,
    photos: (query.get('photos') ?? scene.photos.join(',')).split(','),
    size: scene.size,
  };
}
