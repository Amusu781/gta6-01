// Palmera Bay — tuning and world constants. All numbers live here so the
// rest of the game reads like a design, not a spreadsheet.
export const WORLD_W = 3600;
export const WORLD_H = 2700;
export const ROAD_W = 120;
// Road centrelines. The city is a grid; blocks between roads hold buildings.
export const V_ROADS = [300, 900, 1500, 2100, 2700, 3300];
export const H_ROADS = [300, 900, 1500, 2100];
export const START_CASH = 120;
export const START_DEBT = 5000;
export const START_HEALTH = 100;
export const START_AMMO = 24;
export const MAX_AMMO = 24;
export const MAX_WANTED = 3;
export const PLAYER_FOOT_SPEED = 210;
export const CAR_TOP_SPEED = 430;
export const CAR_ACCEL = 320;
export const CAR_BRAKE = 520;
export const CAR_TURN = 2.6;
export const BULLET_SPEED = 760;
export const BULLET_RANGE = 520;
export const BULLET_DAMAGE = 1;
export const COP_HEALTH = 3;
export const RAM_DAMAGE = 8;
export const RAM_COOLDOWN = 0.8;
export const WANTED_DECAY_SECONDS = 25;
export const INTERACT_RANGE = 110;
export const SAVE_KEY = 'palmera-bay-save-v1';
// Places the story uses. The driver teleports the player near the garage
// (470, 470) and delivers to the spray shop (3150, 2150); keep both exact.
export const GARAGE = { x: 470, y: 470, label: "Marla's Garage" };
export const SPRAY_SHOP = { x: 3150, y: 2150, label: 'Spray & Go' };
export const PIER = { x: 3300, y: 300, label: 'Old Pier' };
export const CREW_SPOT = { x: 900, y: 2100, label: 'Crew corner' };
export const PLAYER_SPAWN = { x: 470, y: 560 };
// Palette.
export const COLORS = {
  grass: '#6f9e57',
  grassAlt: '#679452',
  road: '#33373d',
  roadEdge: '#4a4f57',
  lane: '#d8c95a',
  sidewalk: '#9aa0a8',
  buildingRoof: ['#c96f4a', '#4a7ec9', '#c9a44a', '#7a4ac9', '#4ac9a0', '#c94a6b'],
  buildingEdge: '#2c2f34',
  water: '#3f7fb8',
  pierWood: '#8a6a45',
  player: '#ff5a3c',
  playerDark: '#c23a22',
  ped: ['#f2d16b', '#6bc9f2', '#f28bb0', '#9bf26b', '#f2a35e'],
  copBody: '#22262b',
  copTrim: '#f2f2f2',
  bullet: '#ffe066',
  minimapBg: 'rgba(12, 16, 22, 0.82)',
  hudBg: 'rgba(12, 16, 22, 0.72)',
  hudText: '#f5f2e8',
  hudAccent: '#ffd34d',
  danger: '#ff5340',
};
export const CAR_MODELS = [
  { model: 'Palm Runner', color: '#d94f3d' },
  { model: 'Bay Cruiser', color: '#3d7fd9' },
  { model: 'Sunset GT', color: '#e0a13c' },
  { model: 'Harbor Van', color: '#7a8894' },
  { model: 'Coral Coupe', color: '#c94f8a' },
];
