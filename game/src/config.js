// Palmera Bay — shared constants for the open-world crime game.
// Everything here is plain data: no imports, no side effects.

export const WORLD_W = 3600;
export const WORLD_H = 2700;

export const SAVE_KEY = 'palmera-bay-save-v1';

// Roads: vertical centerlines (x) and horizontal centerlines (y), width in px.
export const ROADS_V = [360, 860, 1360, 1860, 2360, 2860];
export const ROADS_H = [360, 960, 1560, 2160];
export const ROAD_W = 140;
export const SIDEWALK_W = 34;

// The bay: open water along the whole east edge of the map.
export const BAY_X = 3300;
export const PIER = { x0: 3300, x1: 3560, y0: 1200, y1: 1380 };

// Landmarks.
export const SPRAY_SHOP = { x: 3150, y: 2150, r: 130, name: 'Spray & Go' };
export const PIER_DROP = { x: 3450, y: 1290, r: 90, name: 'the pier' };
export const DOCKS_DROP = { x: 360, y: 180, r: 110, name: 'the north docks' };
export const GARAGE_DROP = { x: 860, y: 360, r: 110, name: 'the garage' };

// Player.
export const PLAYER_SPAWN = { x: 360, y: 470 };
export const FOOT_SPEED = 230;
export const CAR_TOP_SPEED = 540;
export const CAR_ACCEL = 620;
export const CAR_BRAKE = 900;
export const CAR_TURN = 2.6;
export const START_AMMO = 24;
export const START_CASH = 120;
export const START_DEBT = 5000;
export const MAX_HEALTH = 100;

// Wanted level.
export const WANTED_MAX = 3;
export const WANTED_DECAY_SECONDS = 25;
export const POLICE_RAM_DAMAGE = 8;

// World population.
export const PED_COUNT = 14;
export const TRAFFIC_COUNT = 8;
export const PARKED_COUNT = 10;

// Story jobs: name, reward, and the short objective text shown on the HUD.
export const STORY_JOBS = [
  { name: 'Wheels', reward: 500, brief: 'Steal a car and bring it to Spray & Go' },
  { name: 'Courier Run', reward: 700, brief: 'Grab the package on the pier, deliver it to the north docks in 90s' },
  { name: 'Getaway', reward: 900, brief: 'Lose the heat, then reach the garage' },
];

export const FARE_MIN = 120;
export const FARE_MAX = 250;

// Palette.
export const COLORS = {
  ground: '#23262e',
  block: '#31363f',
  sidewalk: '#565d68',
  road: '#20242c',
  roadLine: '#c9a227',
  bay: '#175d75',
  bayDeep: '#0f4457',
  pier: '#8a6d3b',
  pierPost: '#6b5430',
  buildingRoof: ['#7a5c4e', '#5e6b7a', '#6b5e7a', '#4e6b5e', '#7a6b4e', '#54455e'],
  buildingWall: '#3d424d',
  spray: '#c94f4f',
  player: '#e8b13c',
  playerCar: '#d8d8d8',
  police: '#2f6fd0',
  policeLight: '#ff3b30',
  traffic: ['#b8442c', '#2c7a4b', '#c9a227', '#4a6b8a', '#8a4a6b'],
  ped: ['#e07a5f', '#81b29a', '#f2cc8f', '#a78bfa', '#f4a261'],
  hudBg: 'rgba(12, 14, 18, 0.72)',
  hudText: '#f2f2e9',
  marker: '#ffd23f',
};
