// cast.js -- the demo cast, layouts and grades of Velvet Hour Cover Studio.
// The eight demo portraits were made with an image model for this app; a
// person's own photos can replace any of them in the editor.

export const GAME_TITLE = 'VELVET HOUR';
export const GAME_SUBTITLE = 'every tide has a price';
export const GAME_TAGLINE = 'EVERY CREW WANTS A CUT OF THE DUSK';
export const REVIEW_QUOTE = '"THE WILDEST RIDE ON THE COAST"';
export const REVIEW_SOURCE = 'HARBORLIGHT GAZETTE';
export const DEFAULT_CAPTION = 'My crew. My coast. My rules.';

export const CAST = [
  { id: 'boss', name: 'MARCO VALE', role: 'THE BOSS', file: 'samples/boss.jpg', focusY: 0.30 },
  { id: 'driver', name: 'NINA SOLANO', role: 'THE DRIVER', file: 'samples/driver.jpg', focusY: 0.30 },
  { id: 'siren', name: 'VIVIAN CROSS', role: 'THE SIREN', file: 'samples/siren.jpg', focusY: 0.30 },
  { id: 'fixer', name: 'DARIO KENT', role: 'THE FIXER', file: 'samples/fixer.jpg', focusY: 0.30 },
  { id: 'captain', name: 'TOMAS REYES', role: 'THE CAPTAIN', file: 'samples/captain.jpg', focusY: 0.32 },
  { id: 'ghost', name: 'JULES PARK', role: 'THE GHOST', file: 'samples/ghost.jpg', focusY: 0.30 },
  { id: 'ledger', name: 'ADA WHITMORE', role: 'THE LEDGER', file: 'samples/ledger.jpg', focusY: 0.30 },
  { id: 'wheelman', name: 'RICO SALDANA', role: 'THE WHEELMAN', file: 'samples/wheelman.jpg', focusY: 0.30 },
];

export const LAYOUTS = [
  { id: 'mosaic', label: 'Cast Mosaic', detail: '8 panels, pop-out hero' },
  { id: 'hero-strip', label: 'Hero + Strip', detail: '1 hero, 3 below' },
  { id: 'grid', label: 'Grid Four', detail: '2 x 2 panels' },
  { id: 'duet', label: 'Duet Split', detail: '2 panels, diagonal' },
];

export const GRADES = [
  { id: 'gold', label: 'Sunset Gold' },
  { id: 'sunset', label: 'Vice Sunset' },
  { id: 'neon', label: 'Neon Nights' },
  { id: 'dusk', label: 'Dusk Teal' },
];

export const EXPORT_SIZES = [
  { id: 'square', label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  { id: 'wide', label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
];

export const CREDITS_LINES = [
  'PALMFROST PICTURES PRESENTS A VELVET HOUR PRODUCTION',
  'MARCO VALE  NINA SOLANO  VIVIAN CROSS  DARIO KENT  TOMAS REYES  JULES PARK  ADA WHITMORE  RICO SALDANA',
  'MUSIC BY THE NIGHT TIDES   COSTUMES SALT & SATIN   EDITED ON THE BOARDWALK   NO SHORTCUTS WERE TAKEN',
];
