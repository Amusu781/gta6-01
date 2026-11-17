// Palmera Bay itself: the road grid, the blocks and buildings inside it, the beach
// and the bay to the south, Flamingo Park, palms, and the parking spots along the roads.
// Generation is seeded, so the same seed always builds the same city.
import { AVENUES, STREETS, WORLD_W, WORLD_H, BEACH_Y, PALETTE } from './config.js';
import { mulberry32, pick, range } from './utils.js';

export function nearestAvenue(x) {
  let best = AVENUES[0];
  for (const a of AVENUES) if (Math.abs(a - x) < Math.abs(best - x)) best = a;
  return best;
}
export function nearestStreet(y) {
  let best = STREETS[0];
  for (const s of STREETS) if (Math.abs(s - y) < Math.abs(best - s)) best = s;
  return best;
}
// Is this point on a road (within the asphalt, plus a small margin)?
export function onRoad(x, y) {
  for (const a of AVENUES) if (Math.abs(x - a) < 46 + 6) return true;
  for (const s of STREETS) if (Math.abs(y - s) < 46 + 6) return true;
  return false;
}
// Snap a point to the centre line of the nearest road, for spawning cars on the asphalt.
export function snapToRoad(x, y) {
  const a = nearestAvenue(x); const s = nearestStreet(y);
  if (Math.abs(x - a) < Math.abs(y - s)) return { x: a, y, vertical: true };
  return { x, y: s, vertical: false };
}

export function buildCity(seed) {
  const rng = mulberry32(seed);
  const buildings = [];
  const palms = [];
  const parkTrees = [];
  const parking = [];

  // One or two buildings per block, kept clear of the named places and the park.
  const keepOut = [
    { x: 380, y: 380, w: 220, h: 220 }, // hideout block
    { x: 1450, y: 750, w: 260, h: 260 }, // bank block
    { x: 3050, y: 370, w: 220, h: 220 }, // hotel block
    { x: 3050, y: 2050, w: 220, h: 220 }, // spray shop block
    { x: 1300, y: 1100, w: 500, h: 400 }, // Flamingo Park
    { x: 1950, y: 1150, w: 220, h: 220 }, // clinic block
    { x: 320, y: 2160, w: 220, h: 220 }, // docks block
  ];
  const overlapsKeepOut = (x, y, w, h) => keepOut.some((k) => x < k.x + k.w && x + w > k.x && y < k.y + k.h && y + h > k.y);

  for (let ai = 0; ai < AVENUES.length - 1; ai += 1) {
    for (let si = 0; si < STREETS.length - 1; si += 1) {
      const bx0 = AVENUES[ai] + 52; const by0 = STREETS[si] + 52;
      const bx1 = AVENUES[ai + 1] - 52; const by1 = STREETS[si + 1] - 52;
      if (by1 > BEACH_Y - 60) continue;
      const count = rng() < 0.55 ? 2 : 1;
      for (let n = 0; n < count; n += 1) {
        const w = range(rng, 110, 190); const h = range(rng, 90, 160);
        const x = range(rng, bx0, Math.max(bx0 + 1, bx1 - w));
        const y = range(rng, by0, Math.max(by0 + 1, by1 - h));
        if (overlapsKeepOut(x, y, w, h)) continue;
        const roof = pick(rng, PALETTE.buildingRoof);
        buildings.push({ x, y, w, h, roof, windows: Math.floor(rng() * 4) + 2 });
      }
    }
  }

  // Palms along the beachfront and dotted through the park — a few more in
  // the park so Flamingo Park reads as green from the minimap, not bare grass.
  for (let x = 120; x < WORLD_W - 100; x += range(rng, 90, 170)) {
    palms.push({ x, y: BEACH_Y - 30 - rng() * 40, s: range(rng, 0.8, 1.25) });
  }
  for (let i = 0; i < 28; i += 1) {
    parkTrees.push({ x: range(rng, 1330, 1770), y: range(rng, 1130, 1470), s: range(rng, 0.9, 1.4) });
  }
  for (let i = 0; i < 40; i += 1) {
    const a = pick(rng, AVENUES); const s = pick(rng, STREETS);
    const vertical = rng() < 0.5;
    palms.push({
      x: vertical ? a + (rng() < 0.5 ? -58 : 58) : range(rng, 150, WORLD_W - 150),
      y: vertical ? range(rng, 150, BEACH_Y - 150) : s + (rng() < 0.5 ? -58 : 58),
      s: range(rng, 0.7, 1.1),
    });
  }

  // Parking bays along the roads, for parked (stealable) cars: on the asphalt,
  // a car's width inside the road edge (buildings start 52px out from a centre line).
  for (let i = 0; i < 46; i += 1) {
    const vertical = rng() < 0.5;
    if (vertical) {
      parking.push({ x: pick(rng, AVENUES) + (rng() < 0.5 ? -30 : 30), y: range(rng, 200, BEACH_Y - 200), angle: rng() < 0.5 ? -Math.PI / 2 : Math.PI / 2 });
    } else {
      parking.push({ x: range(rng, 200, WORLD_W - 200), y: pick(rng, STREETS) + (rng() < 0.5 ? -30 : 30), angle: rng() < 0.5 ? 0 : Math.PI });
    }
  }

  return { buildings, palms, parkTrees, parking };
}

// True when a circle of radius r at (x, y) overlaps any building.
export function hitsBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}
