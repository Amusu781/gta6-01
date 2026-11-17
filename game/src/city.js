// The city itself: a road grid, blocks of buildings, a bay on the east
// edge, and the story landmarks. Pure data + collision; no drawing here.
import { WORLD_W, WORLD_H, ROAD_W, V_ROADS, H_ROADS, COLORS, GARAGE, SPRAY_SHOP, PIER } from './config.js';

export function generateCity(rng) {
  const buildings = [];
  const xs = [0, ...V_ROADS, WORLD_W];
  const ys = [0, ...H_ROADS, WORLD_H];
  const roofColors = COLORS.buildingRoof;
  let roof = 0;
  for (let bi = 0; bi < xs.length - 1; bi++) {
    for (let bj = 0; bj < ys.length - 1; bj++) {
      const bx0 = xs[bi] + ROAD_W / 2 + 24;
      const by0 = ys[bj] + ROAD_W / 2 + 24;
      const bx1 = xs[bi + 1] - ROAD_W / 2 - 24;
      const by1 = ys[bj + 1] - ROAD_W / 2 - 24;
      const bw = bx1 - bx0;
      const bh = by1 - by0;
      if (bw < 140 || bh < 140) continue;
      // The bay eats the easternmost column of blocks.
      if (bx0 > 3300) continue;
      // Landmark blocks stay clear for their own buildings.
      const cx = (bx0 + bx1) / 2;
      const cy = (by0 + by1) / 2;
      if (Math.hypot(cx - GARAGE.x, cy - GARAGE.y) < 320) continue;
      if (Math.hypot(cx - SPRAY_SHOP.x, cy - SPRAY_SHOP.y) < 320) continue;
      if (Math.hypot(cx - PIER.x, cy - PIER.y) < 320) continue;
      const count = rng.chance(0.55) ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const w = rng.range(120, Math.min(260, bw - 20));
        const h = rng.range(110, Math.min(220, bh - 20));
        const x = count === 1 ? cx - w / 2 : bx0 + 10 + (k * (bw - w - 20)) / Math.max(1, count - 1);
        const y = count === 1 ? cy - h / 2 : by0 + 10 + rng.range(0, Math.max(0, bh - h - 20));
        buildings.push({ x, y, w, h, color: roofColors[roof++ % roofColors.length] });
      }
    }
  }
  // Landmark buildings, placed by hand so missions always find them.
  buildings.push({ x: GARAGE.x - 70, y: GARAGE.y - 55, w: 140, h: 110, color: '#c96f4a', landmark: GARAGE.label });
  buildings.push({ x: SPRAY_SHOP.x - 70, y: SPRAY_SHOP.y - 55, w: 140, h: 110, color: '#4a7ec9', landmark: SPRAY_SHOP.label });
  buildings.push({ x: PIER.x - 60, y: PIER.y - 40, w: 120, h: 80, color: '#8a6a45', landmark: PIER.label });
  return { buildings, vRoads: V_ROADS, hRoads: H_ROADS };
}

export function isWater(x, y) {
  // The bay: east of x=3440, except the pier walkway at y 270..330.
  if (x < 3440) return false;
  if (y >= 270 && y <= 330 && x <= 3560) return false;
  return true;
}

export function onRoad(x, y) {
  for (const rx of V_ROADS) if (Math.abs(x - rx) <= ROAD_W / 2) return true;
  for (const ry of H_ROADS) if (Math.abs(y - ry) <= ROAD_W / 2) return true;
  return false;
}

// Push a circle (x, y, r) out of buildings, water and the world edge.
// Returns the corrected position. Axis-separated so sliding along walls
// feels natural instead of sticking.
export function collide(city, x, y, r) {
  let nx = x;
  let ny = y;
  const rects = city.buildings;
  function pushOut(px, py) {
    for (const b of rects) {
      const cx = Math.max(b.x, Math.min(px, b.x + b.w));
      const cy = Math.max(b.y, Math.min(py, b.y + b.h));
      const dx = px - cx;
      const dy = py - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < r * r) {
        if (d2 < 0.001) {
          // Dead centre of a building: shove out along the short side.
          const left = px - b.x;
          const right = b.x + b.w - px;
          const top = py - b.y;
          const bottom = b.y + b.h - py;
          const m = Math.min(left, right, top, bottom);
          if (m === left) return { x: b.x - r, y: py };
          if (m === right) return { x: b.x + b.w + r, y: py };
          if (m === top) return { x: px, y: b.y - r };
          return { x: px, y: b.y + b.h + r };
        }
        const d = Math.sqrt(d2);
        const push = (r - d) / d;
        return { x: px + dx * push, y: py + dy * push };
      }
    }
    return { x: px, y: py };
  }
  // X axis, then Y axis, so the circle slides along walls.
  let p = pushOut(nx, y);
  nx = p.x;
  p = pushOut(nx, ny);
  ny = p.y;
  // Water and the world edge.
  if (isWater(nx, ny)) {
    // Step back toward the last dry spot along the approach direction.
    const ox = x;
    const oy = y;
    if (!isWater(nx, oy)) ny = oy;
    else if (!isWater(ox, ny)) nx = ox;
    else {
      nx = Math.min(nx, 3438);
      ny = y;
    }
  }
  nx = Math.max(r, Math.min(WORLD_W - r, nx));
  ny = Math.max(r, Math.min(WORLD_H - r, ny));
  return { x: nx, y: ny };
}

export function randomRoadPoint(rng) {
  if (rng.chance(0.5)) {
    const rx = rng.pick(V_ROADS);
    return { x: rx + rng.range(-40, 40), y: rng.range(60, WORLD_H - 60) };
  }
  const ry = rng.pick(H_ROADS);
  return { x: rng.range(60, WORLD_W - 60), y: ry + rng.range(-40, 40) };
}

export function nearestRoad(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of V_ROADS) {
    const d = Math.abs(x - rx);
    if (d < bestD) {
      bestD = d;
      best = { axis: 'v', at: rx };
    }
  }
  for (const ry of H_ROADS) {
    const d = Math.abs(y - ry);
    if (d < bestD) {
      bestD = d;
      best = { axis: 'h', at: ry };
    }
  }
  return best;
}
