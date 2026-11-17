// Palmera Bay — configuration: world size, palette, tuning, locations.
// Everything original: a fictional sun-soaked coastal city, its own names and story.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const WORLD_W = 3600;
export const WORLD_H = 2600;
export const ROAD_W = 92;
export const SAVE_KEY = 'palmera-bay-save-v1';

// Avenues (vertical roads) and streets (horizontal roads) of the city grid.
export const AVENUES = [300, 800, 1300, 1800, 2300, 2800, 3300];
export const STREETS = [300, 700, 1100, 1500, 1900, 2300];
export const BEACH_Y = 2420; // south of here: sand, then the bay itself.

export const PALETTE = {
  grass: '#7fae62',
  grassDark: '#74a258',
  sidewalk: '#d9cdb4',
  road: '#4b4b55',
  roadEdge: '#3a3a44',
  dash: '#e8c84a',
  sand: '#ecd6a0',
  water: '#2aa7c9',
  waterDeep: '#1d86ad',
  park: '#6da34f',
  buildingRoof: ['#e07856', '#e8a34c', '#d95f7a', '#5f8fd9', '#8f6fd0', '#e8d44c', '#6fc2a8', '#c97b4a'],
  buildingEdge: '#00000033',
  carColors: ['#d9382b', '#2b6fd9', '#e8b62a', '#3aa655', '#7a4fd0', '#e8e8e8', '#22242a', '#e8782a', '#2ab5c9', '#c92a7a'],
  pedShirts: ['#f2f2f2', '#ffd23e', '#3ec6ff', '#ff7a59', '#9dff57', '#ff5fa2', '#b388ff', '#ff9f1c'],
};

export const TUNING = {
  walkSpeed: 185,
  runSpeed: 265,
  carAccel: 300,
  carBrake: 520,
  carMaxSpeed: 430,
  carMaxReverse: 150,
  carSteer: 2.6,
  carFriction: 0.55,
  trafficSpeed: 135, // brisk enough that the streets feel alive, slow enough to dodge
  pedSpeed: 55,
  bulletSpeed: 720,
  pistolDamage: 34,
  copDamage: 9, // one police bullet; foot officers and Rico's own pistol share this table
  punchDamage: 26,
  punchRange: 46,
  copShootRange: 430,
  copShootInterval: 1.25,
  vaultHoldSeconds: 6, // how long Rico must hold inside the bank vault (mission 3)
  wantedDecayDelay: 14,
  wantedDecayStep: 8,
  healthRegenDelay: 8,
  healthRegenRate: 6,
  startCash: 120,
  debtTotal: 5000,
  respawnCost: 0.1,
};

// Named places in Palmera Bay. All fictional.
export const PLACES = {
  hideout: { name: 'Rico\u2019s Garage', x: 470, y: 470, r: 70, color: '#3aa655' },
  sprayShop: { name: 'Sunset Spray Shop', x: 3150, y: 2150, r: 80, color: '#e8b62a' },
  docks: { name: 'Marlin Docks', x: 420, y: 2260, r: 80, color: '#2ab5c9' },
  hotel: { name: 'The Coral Hotel', x: 3150, y: 470, r: 80, color: '#c92a7a' },
  bank: { name: 'Palmera Bay Bank', x: 1550, y: 850, r: 90, color: '#e8a34c' },
  clinic: { name: 'Bay Clinic', x: 2050, y: 1250, r: 70, color: '#f2f2f2' },
  park: { name: 'Flamingo Park', x: 1550, y: 1300, r: 150, color: '#6da34f' },
};

export const MISSION_DEFS = [
  {
    id: 'wheels',
    title: 'Mission 1 — Wheels for Hire',
    brief: 'Marla needs a driver with a car. Steal any car and bring it to the Sunset Spray Shop so it can\u2019t be traced.',
    reward: 500,
    startPlace: 'hideout',
    startText: 'Press E at the garage to take the job.',
  },
  {
    id: 'courier',
    title: 'Mission 2 — The Courier',
    brief: 'Pick up the package at the Marlin Docks and deliver it to The Coral Hotel in 150 seconds. A rival tipped off the cops — expect heat halfway there.',
    reward: 1200,
    startPlace: 'hideout',
    startText: 'Press E at the garage to take the job.',
    timeLimit: 150,
  },
  {
    id: 'vault',
    title: 'Mission 3 — The Vault Job',
    brief: 'Hit the Palmera Bay Bank. Hold inside the vault marker for 6 seconds, then lose a 3-star wanted level and get back to the garage.',
    reward: 3000,
    startPlace: 'hideout',
    startText: 'Press E at the garage to take the job.',
  },
];
