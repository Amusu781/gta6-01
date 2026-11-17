// Pedestrians: Palmera Bay locals strolling the sidewalks, crossing at intersections,
// and fleeing when a gun goes off or a car bears down on them.
import { AVENUES, STREETS, WORLD_W, BEACH_Y, PALETTE } from './config.js';
import { clamp, dist, pick, range } from './utils.js';
import { nearestAvenue, nearestStreet, onRoad } from './city.js';

// How fast a panicking pedestrian runs — quicker than a stroll, slower than a car.
const FLEE_SPEED = 150;

export function spawnPedestrians(world, n) {
  for (let i = 0; i < n; i += 1) {
    const vertical = world.rng() < 0.5;
    const x = vertical ? pick(world.rng, AVENUES) + (world.rng() < 0.5 ? -58 : 58) : range(world.rng, 150, WORLD_W - 150);
    const y = vertical ? range(world.rng, 150, BEACH_Y - 150) : pick(world.rng, STREETS) + (world.rng() < 0.5 ? -58 : 58);
    world.peds.push({
      x, y, angle: world.rng() * Math.PI * 2,
      speed: range(world.rng, 40, 70),
      shirt: pick(world.rng, PALETTE.pedShirts),
      skin: pick(world.rng, ['#f2c89b', '#c98d5f', '#8a5a3b', '#e8b88a']),
      state: 'walk', panic: 0, tx: x, ty: y, dead: false, fade: 1,
      bob: world.rng() * 6,
    });
  }
}

function pickStrollTarget(world, ped) {
  // Wander to a nearby sidewalk point; occasionally cross to the next block.
  const a = nearestAvenue(ped.x); const s = nearestStreet(ped.y);
  if (world.rng() < 0.6) {
    ped.tx = a + (world.rng() < 0.5 ? -58 : 58);
    ped.ty = clamp(ped.y + range(world.rng, -260, 260), 120, BEACH_Y - 120);
  } else {
    ped.tx = clamp(ped.x + range(world.rng, -260, 260), 120, WORLD_W - 120);
    ped.ty = s + (world.rng() < 0.5 ? -58 : 58);
  }
}

export function updatePedestrians(world, dt) {
  const px = world.player.x; const py = world.player.y;
  for (const ped of world.peds) {
    if (ped.dead) { ped.fade -= dt * 0.4; continue; }
    if (ped.panic > 0) ped.panic -= dt;
    // Panic: a nearby speeding car, a gunshot, or a police chase.
    const threat = world.player.car ? world.player.car : null;
    let flee = ped.panic > 0;
    if (threat && Math.abs(threat.speed) > 200 && dist(ped.x, ped.y, threat.x, threat.y) < 130) flee = true;
    if (world.gunshotTimer > 0 && dist(ped.x, ped.y, px, py) < 420) flee = true;
    if (flee) {
      const away = Math.atan2(ped.y - py, ped.x - px);
      ped.angle = away;
      const sp = FLEE_SPEED;
      ped.x += Math.cos(away) * sp * dt;
      ped.y += Math.sin(away) * sp * dt;
      ped.bob += dt * 14;
      continue;
    }
    if (dist(ped.x, ped.y, ped.tx, ped.ty) < 24 || world.rng() < dt * 0.02) pickStrollTarget(world, ped);
    const want = Math.atan2(ped.ty - ped.y, ped.tx - ped.x);
    ped.angle = want;
    ped.x += Math.cos(want) * ped.speed * dt;
    ped.y += Math.sin(want) * ped.speed * dt;
    ped.bob += dt * 8;
    ped.x = clamp(ped.x, 60, WORLD_W - 60);
    ped.y = clamp(ped.y, 60, BEACH_Y + 90);
    // Keep peds off the road centre unless they are crossing at an intersection.
    if (onRoad(ped.x, ped.y) && dist(ped.x, ped.y, nearestAvenue(ped.x), nearestStreet(ped.y)) > 90) {
      ped.tx = ped.x; ped.ty = ped.y;
    }
  }
  world.peds = world.peds.filter((p) => !p.dead || p.fade > 0);
  // Top the crowd back up so the streets never feel empty.
  if (world.peds.length < 22 && world.rng() < dt * 0.5) spawnPedestrians(world, 1);
}

// A car ploughing into a pedestrian: they go down, and the law notices.
export function checkPedCarHits(world) {
  for (const car of world.cars) {
    if (Math.abs(car.speed) < 60) continue;
    for (const ped of world.peds) {
      if (ped.dead) continue;
      if (dist(car.x, car.y, ped.x, ped.y) < 26) {
        ped.dead = true; ped.fade = 1;
        world.events.push({ type: 'ped-down', x: ped.x, y: ped.y });
        if (car === world.player.car) addWanted(world, 1, 'You ran someone over.');
      }
    }
  }
}

export function addWanted(world, stars, reason) {
  if (world.wanted >= 5) return;
  world.wanted = Math.min(5, world.wanted + stars);
  world.wantedTimer = 0;
  world.lastCrime = world.time;
  if (reason) world.notice = { text: reason, t: 3 };
}
