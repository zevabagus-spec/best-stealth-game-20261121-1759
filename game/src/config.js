// Gilded Shadow — shared tuning constants. One place for every number the
// rest of the game reads, so balancing never means hunting through logic.
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;
export const VIEW_W = COLS * TILE; // 1280
export const VIEW_H = ROWS * TILE; // 720
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 132,
  sprintSpeed: 196,
  sprintNoiseRadius: 150,
  pebbles: 5,
  throwRange: 340,
  catchRadius: 26,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 58,
  chaseSpeed: 96,
  investigateSpeed: 78,
  coneRange: 235,
  coneHalfAngle: (35 * Math.PI) / 180,
  // Detection fills 0..100. Closer + more centred fills faster; shadows slow it.
  fillPerSecond: 62,
  decayPerSecond: 30,
  shadowFactor: 0.4,
  bushHideDistance: 58,
  loseSightSeconds: 3.5,
  lookAroundSeconds: 2.2,
};

export const SCORE = {
  key: 100,
  sunstone: 300,
  win: 500,
  alarmPenalty: 25,
  timeBonusPerSecond: 2,
  timeBonusCap: 600,
};

export const COLORS = {
  floorA: '#342c22',
  floorB: '#383029',
  floorLine: '#241f19',
  wall: '#4a4238',
  wallTop: '#6b5f4e',
  crate: '#7a5c33',
  crateEdge: '#5d4423',
  bush: '#2e5230',
  bushLeaf: '#3f7040',
  shadow: 'rgba(8, 10, 26, 0.55)',
  exit: '#e8b64c',
  sunstone: '#ff5d8f',
  key: '#ffd75e',
  player: '#e8e3d3',
  playerCloak: '#3d6b8e',
  guard: '#c94f43',
  guardDark: '#8e2f27',
  cone: 'rgba(255, 214, 110, 0.25)',
  coneAlert: 'rgba(255, 70, 50, 0.34)',
  coneSuspect: 'rgba(255, 170, 60, 0.25)',
  hudText: '#efe8d6',
  hudDim: '#b8ad93',
};
