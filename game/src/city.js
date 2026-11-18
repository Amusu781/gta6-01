// The city of Palmera Bay: a road grid, a bay with a pier, buildings packed
// into the blocks between roads, parked cars along the kerbs, and the
// collision helpers the actors use. Generation is seeded, so one seed always
// rebuilds the same city.

import {
  WORLD_W, WORLD_H, ROADS_V, ROADS_H, ROAD_W, SIDEWALK_W,
  BAY_X, PIER, SPRAY_SHOP, PARKED_COUNT, COLORS,
} from './config.js';
import { makeRng } from './random.js';

export function buildCity(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const parkedSpots = [];

  // Buildings fill each block between roads, skipping the bay and the
  // spray-shop lot. A block is the land strictly between two neighbouring
  // roads (road edge + sidewalk), so no building ever sits on a road.
  const vBounds = [[0, ROADS_V[0] - ROAD_W / 2 - SIDEWALK_W]];
  for (let i = 0; i < ROADS_V.length - 1; i++) {
    vBounds.push([ROADS_V[i] + ROAD_W / 2 + SIDEWALK_W, ROADS_V[i + 1] - ROAD_W / 2 - SIDEWALK_W]);
  }
  vBounds.push([ROADS_V[ROADS_V.length - 1] + ROAD_W / 2 + SIDEWALK_W, BAY_X - 40]);
  const hBounds = [[0, ROADS_H[0] - ROAD_W / 2 - SIDEWALK_W]];
  for (let i = 0; i < ROADS_H.length - 1; i++) {
    hBounds.push([ROADS_H[i] + ROAD_W / 2 + SIDEWALK_W, ROADS_H[i + 1] - ROAD_W / 2 - SIDEWALK_W]);
  }
  hBounds.push([ROADS_H[ROADS_H.length - 1] + ROAD_W / 2 + SIDEWALK_W, WORLD_H]);

  for (const [bx0, bx1] of vBounds) {
    for (const [by0, by1] of hBounds) {
      const x0 = bx0;
      const x1 = Math.min(bx1, BAY_X - 40);
      const y0 = by0;
      const y1 = by1;
      const w = x1 - x0;
      const h = y1 - y0;
      if (w < 90 || h < 90) continue;
      // One or two buildings per block, inset from the sidewalk.
      const count = rng.chance(0.45) ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const bw = rng.range(70, Math.max(80, w / count - 30));
        const bh = rng.range(60, Math.max(70, h - 50));
        const bx = x0 + 14 + (count === 2 ? k * (w / 2) + rng.range(0, 20) : rng.range(0, Math.max(1, w - bw - 28)));
        const by = y0 + 14 + rng.range(0, Math.max(1, h - bh - 28));
        // Keep the spray-shop lot and the pier approach clear.
        if (Math.hypot(bx + bw / 2 - SPRAY_SHOP.x, by + bh / 2 - SPRAY_SHOP.y) < 220) continue;
        if (bx + bw > PIER.x0 - 20 && by < PIER.y1 + 40 && by + bh > PIER.y0 - 40) continue;
        buildings.push({
          x: bx, y: by, w: bw, h: bh,
          roof: rng.pick(COLORS.buildingRoof),
        });
      }
    }
  }

  // The spray shop: a wide low building just west of its delivery lot.
  buildings.push({
    x: SPRAY_SHOP.x - 190, y: SPRAY_SHOP.y - 70, w: 150, h: 110,
    roof: COLORS.spray, landmark: 'Spray & Go',
  });

  // Parked cars along kerbs: pick a road, a side, and a spot on it.
  const models = ['Palm Runner', 'Bay Cruiser', 'Dune Buggy', 'Harbor Van', 'Sunset Coupe', 'Pier Pickup'];
  let guard = 0;
  while (parkedSpots.length < PARKED_COUNT && guard++ < 400) {
    const vertical = rng.chance(0.5);
    let x;
    let y;
    let angle;
    if (vertical) {
      const road = rng.pick(ROADS_V);
      x = road + (rng.chance(0.5) ? 1 : -1) * (ROAD_W / 2 + 12);
      y = rng.range(120, WORLD_H - 120);
      angle = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
    } else {
      const road = rng.pick(ROADS_H);
      y = road + (rng.chance(0.5) ? 1 : -1) * (ROAD_W / 2 + 12);
      x = rng.range(120, BAY_X - 200);
      angle = rng.chance(0.5) ? 0 : Math.PI;
    }
    if (x > BAY_X - 60 || y < 60 || y > WORLD_H - 60) continue;
    if (parkedSpots.some((p) => Math.hypot(p.x - x, p.y - y) < 130)) continue;
    if (buildings.some((b) => x > b.x - 40 && x < b.x + b.w + 40 && y > b.y - 40 && y < b.y + b.h + 40)) continue;
    parkedSpots.push({ x, y, angle, model: rng.pick(models) });
  }
  // One parked car is always near the spawn point, so the first steal is a
  // short walk — but just outside the 70px enter radius of (470, 470), which
  // the test driver uses as a staging point before it teleports the player
  // beside this car and presses E to steal it. It sits on the kerb at the
  // east edge of the first road, nose pointing south along the road, so
  // holding W after the steal actually drives instead of nosing a building.
  parkedSpots[0] = { x: 430, y: 600, angle: Math.PI / 2, model: 'Palm Runner' };

  return { buildings, parkedSpots, rng };
}

export function onRoad(x, y) {
  for (const rx of ROADS_V) if (Math.abs(x - rx) <= ROAD_W / 2) return true;
  for (const ry of ROADS_H) if (Math.abs(y - ry) <= ROAD_W / 2) return true;
  return false;
}

export function onSidewalk(x, y) {
  for (const rx of ROADS_V) {
    const d = Math.abs(x - rx);
    if (d > ROAD_W / 2 && d <= ROAD_W / 2 + SIDEWALK_W) return true;
  }
  for (const ry of ROADS_H) {
    const d = Math.abs(y - ry);
    if (d > ROAD_W / 2 && d <= ROAD_W / 2 + SIDEWALK_W) return true;
  }
  return false;
}

export function inWater(x, y) {
  if (x < BAY_X) return false;
  // The pier deck is walkable/drivable.
  if (x >= PIER.x0 && x <= PIER.x1 && y >= PIER.y0 && y <= PIER.y1) return false;
  return true;
}

export function blockedByBuilding(buildings, x, y, r) {
  for (const b of buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

// Move a circle (x, y, radius r) by (dx, dy), sliding along buildings and
// never entering the water. Returns the new position.
export function moveCircle(buildings, x, y, dx, dy, r) {
  let nx = x + dx;
  let ny = y + dy;
  nx = Math.max(r, Math.min(WORLD_W - r, nx));
  ny = Math.max(r, Math.min(WORLD_H - r, ny));
  if (inWater(nx, ny)) {
    // Try each axis alone; the pier lets the player cross onto the deck.
    if (!inWater(nx, y)) ny = y;
    else if (!inWater(x, ny)) nx = x;
    else {
      nx = x;
      ny = y;
    }
  }
  const hit = blockedByBuilding(buildings, nx, ny, r);
  if (hit) {
    // Slide: try the x move alone, then the y move alone.
    if (!blockedByBuilding(buildings, nx, y, r) && !inWater(nx, y)) {
      ny = y;
    } else if (!blockedByBuilding(buildings, x, ny, r) && !inWater(x, ny)) {
      nx = x;
    } else {
      nx = x;
      ny = y;
    }
  }
  return { x: nx, y: ny };
}

export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of ROADS_V) {
    for (const ry of ROADS_H) {
      const d = Math.hypot(x - rx, y - ry);
      if (d < bestD) {
        bestD = d;
        best = { x: rx, y: ry };
      }
    }
  }
  return best;
}
