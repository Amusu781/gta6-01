// Actors: the player, pedestrians, traffic and police, and the systems that
// move them — driving, stealing, shooting, the wanted level, collisions.

import {
  WORLD_W, WORLD_H, ROADS_V, ROADS_H, ROAD_W, PLAYER_SPAWN, FOOT_SPEED,
  CAR_TOP_SPEED, CAR_ACCEL, CAR_BRAKE, CAR_TURN, START_AMMO, MAX_HEALTH,
  WANTED_MAX, WANTED_DECAY_SECONDS, POLICE_RAM_DAMAGE, PED_COUNT,
  TRAFFIC_COUNT, COLORS, BAY_X,
} from './config.js';
import { makeRng } from './random.js';
import { buildCity, onRoad, inWater, moveCircle, nearestRoadPoint } from './city.js';
import { createMissions, startJob, startFare } from './missions.js';
import { sfxShot } from './audio.js';

const CAR_MODELS = ['Palm Runner', 'Bay Cruiser', 'Dune Buggy', 'Harbor Van', 'Sunset Coupe', 'Pier Pickup'];

export function createWorld(seed, save) {
  const rng = makeRng(seed);
  const city = buildCity(seed);
  const world = {
    seed,
    time: 0,
    screen: 'title',
    paused: false,
    cash: save.cash,
    debt: save.debt,
    saveBest: save.best || 0,
    wanted: 0,
    wantedQuiet: 0,
    toast: '',
    toastTimer: 0,
    shake: 0,
    city,
    rng,
    player: {
      x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y, angle: -Math.PI / 2,
      speed: 0, car: null, ammo: START_AMMO, health: MAX_HEALTH,
      walkPhase: 0, hurtCooldown: 0,
    },
    cars: [],
    peds: [],
    bullets: [],
    particles: [],
    missions: createMissions(rng),
    camera: { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y },
  };
  world.missions.done = save.missionsDone.slice();
  // Story progress survives a save: resume at the first unfinished job.
  const doneCount = world.missions.done.length;
  if (doneCount >= 3) {
    startFare(world.missions);
  } else if (doneCount > 0) {
    startJob(world.missions, doneCount);
  }

  // Parked cars from the city's kerb spots.
  for (const spot of city.parkedSpots) {
    world.cars.push({
      kind: 'parked', model: spot.model, color: rng.pick(COLORS.traffic),
      x: spot.x, y: spot.y, angle: spot.angle, speed: 0,
      stolen: false, w: 44, h: 22,
    });
  }
  // Traffic: cars cruising the road grid on waypoint loops.
  for (let i = 0; i < TRAFFIC_COUNT; i++) {
    const road = rng.pick(ROADS_V);
    const cross = rng.pick(ROADS_H);
    world.cars.push({
      kind: 'traffic', model: rng.pick(CAR_MODELS), color: rng.pick(COLORS.traffic),
      x: road, y: rng.range(100, WORLD_H - 100), angle: rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2,
      speed: rng.range(120, 170), w: 44, h: 22,
      route: makeRoute(rng), routeI: 0, wait: 0,
    });
  }
  // Pedestrians strolling the sidewalks.
  for (let i = 0; i < PED_COUNT; i++) {
    const road = rng.pick(ROADS_V);
    const cross = rng.pick(ROADS_H);
    world.peds.push({
      x: road + (rng.chance(0.5) ? 1 : -1) * (ROAD_W / 2 + 14),
      y: rng.range(100, WORLD_H - 100),
      angle: rng.range(0, Math.PI * 2),
      speed: rng.range(28, 55),
      color: rng.pick(COLORS.ped),
      flee: 0, walkPhase: rng.range(0, 6),
    });
  }
  return world;
}

function makeRoute(rng) {
  // A loop of intersections: down one road, across, back up another.
  const a = rng.pick(ROADS_V);
  let b = rng.pick(ROADS_V);
  while (b === a) b = rng.pick(ROADS_V);
  const top = rng.pick(ROADS_H);
  const bot = rng.pick(ROADS_H.slice().reverse());
  const y1 = Math.min(top, bot);
  const y2 = Math.max(top, bot);
  return [
    { x: a, y: y1 }, { x: a, y: y2 }, { x: b, y: y2 }, { x: b, y: y1 },
  ];
}

export function addWanted(world, n) {
  const before = world.wanted;
  world.wanted = Math.min(WANTED_MAX, world.wanted + n);
  world.wantedQuiet = 0;
  if (world.wanted > before) {
    world.toast = world.wanted >= 3 ? 'WANTED — three stars! Lose them!' : 'The cops are onto you!';
    world.toastTimer = 3;
  }
}

function spawnPolice(world) {
  const want = world.wanted;
  const have = world.cars.filter((c) => c.kind === 'police').length;
  for (let i = have; i < want; i++) {
    const p = world.player;
    const angle = world.rng.range(0, Math.PI * 2);
    const spot = nearestRoadPoint(
      p.x + Math.cos(angle) * 650,
      p.y + Math.sin(angle) * 650,
    );
    world.cars.push({
      kind: 'police', model: 'Interceptor', color: COLORS.police,
      x: spot.x, y: spot.y, angle: 0, speed: 0,
      w: 46, h: 23, ramCooldown: 0, leaving: false,
    });
  }
}

function nearestParkedCar(world, maxD) {
  const p = world.player;
  let best = null;
  let bestD = maxD;
  for (const c of world.cars) {
    if (c.kind !== 'parked') continue;
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

// One simulation step. `input` is { move, aimX, aimY, shoot, enter, ... }.
export function updateWorld(world, dt, input) {
  world.time += dt;
  const p = world.player;
  if (p.hurtCooldown > 0) p.hurtCooldown -= dt;
  if (world.toastTimer > 0) world.toastTimer -= dt;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 3);

  // Wanted decay: 25 quiet seconds drops one star.
  if (world.wanted > 0) {
    world.wantedQuiet += dt;
    if (world.wantedQuiet >= WANTED_DECAY_SECONDS) {
      world.wanted -= 1;
      world.wantedQuiet = 0;
      world.toast = world.wanted === 0 ? 'You lost them. Breathe.' : 'Heat is cooling off.';
      world.toastTimer = 3;
    }
  }
  spawnPolice(world);

  // --- Player ---
  if (p.car) {
    updateDriving(world, dt, input);
  } else {
    const mv = input.move;
    const dx = mv.x * FOOT_SPEED * dt;
    const dy = mv.y * FOOT_SPEED * dt;
    if (dx !== 0 || dy !== 0) {
      p.angle = Math.atan2(dy, dx);
      p.walkPhase += dt * 9;
    }
    const pos = moveCircle(world.city.buildings, p.x, p.y, dx, dy, 13);
    p.x = pos.x;
    p.y = pos.y;
    p.speed = Math.hypot(dx, dy) / Math.max(dt, 0.001);
  }

  // Enter / exit a car.
  if (input.enterPressed) {
    if (p.car) {
      const car = p.car;
      p.car = null;
      p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
      p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
      p.angle = car.angle;
    } else {
      const car = nearestParkedCar(world, 70);
      if (car) {
        p.car = car;
        if (!car.stolen) {
          car.stolen = true;
          addWanted(world, 1);
        }
        p.x = car.x;
        p.y = car.y;
      }
    }
  }

  // Shooting (on foot only; the car's horn is the mouse click while driving).
  if (input.shootPressed && !p.car && p.ammo > 0) {
    const a = Math.atan2(input.aimY - p.y, input.aimX - p.x);
    world.bullets.push({
      x: p.x + Math.cos(a) * 18, y: p.y + Math.sin(a) * 18,
      vx: Math.cos(a) * 950, vy: Math.sin(a) * 950, life: 0.8,
    });
    p.ammo -= 1;
    p.angle = a;
    world.shake = 0.25;
    sfxShot();
    addWanted(world, 1);
    // Nearby pedestrians scatter.
    for (const ped of world.peds) {
      if (Math.hypot(ped.x - p.x, ped.y - p.y) < 320) ped.flee = 3;
    }
  }

  updateBullets(world, dt);
  updateTraffic(world, dt);
  updatePolice(world, dt);
  updatePeds(world, dt);
  updateParticles(world, dt);

  // Camera follows the player, clamped to the world.
  const tx = Math.max(640, Math.min(WORLD_W - 640, p.x));
  const ty = Math.max(360, Math.min(WORLD_H - 360, p.y));
  world.camera.x += (tx - world.camera.x) * Math.min(1, dt * 5);
  world.camera.y += (ty - world.camera.y) * Math.min(1, dt * 5);

  // Busted?
  if (p.health <= 0 && world.screen === 'playing') {
    world.screen = 'busted';
  }
}

function updateDriving(world, dt, input) {
  const p = world.player;
  const car = p.car;
  const mv = input.move;
  const forward = -mv.y; // W is forward
  const steer = mv.x;
  if (forward > 0) car.speed = Math.min(CAR_TOP_SPEED, car.speed + CAR_ACCEL * dt);
  else if (forward < 0) car.speed = Math.max(-140, car.speed - CAR_BRAKE * dt);
  else car.speed *= Math.max(0, 1 - dt * 1.4);
  if (Math.abs(car.speed) > 8) {
    car.angle += steer * CAR_TURN * dt * (car.speed / CAR_TOP_SPEED) * (car.speed < 0 ? -1 : 1);
  }
  const dx = Math.cos(car.angle) * car.speed * dt;
  const dy = Math.sin(car.angle) * car.speed * dt;
  const pos = moveCircle(world.city.buildings, car.x, car.y, dx, dy, 20);
  // Hitting a wall hard scrubs speed — but only when the wall actually
  // stopped a real move. (A bare `pos.x === car.x && dx !== 0` test fires on
  // the ~1e-16 x-drift of driving due south and kills all acceleration.)
  const movedX = pos.x - car.x;
  const movedY = pos.y - car.y;
  if ((Math.abs(dx) > 0.01 && Math.abs(movedX) < Math.abs(dx) * 0.5)
    || (Math.abs(dy) > 0.01 && Math.abs(movedY) < Math.abs(dy) * 0.5)) {
    car.speed *= 0.4;
  }
  car.x = pos.x;
  car.y = pos.y;
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  p.speed = Math.abs(car.speed);
}

function updateBullets(world, dt) {
  const p = world.player;
  for (let i = world.bullets.length - 1; i >= 0; i--) {
    const b = world.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || inWater(b.x, b.y);
    // Hit a police car: it spins out for a while.
    for (const c of world.cars) {
      if (c.kind !== 'police') continue;
      if (Math.abs(b.x - c.x) < 26 && Math.abs(b.y - c.y) < 16) {
        c.speed *= -0.4;
        c.stun = 1.2;
        dead = true;
        spawnSparks(world, b.x, b.y);
        break;
      }
    }
    // Hit a building: sparks.
    if (!dead && world.city.buildings.some((bb) => b.x > bb.x && b.x < bb.x + bb.w && b.y > bb.y && b.y < bb.y + bb.h)) {
      dead = true;
      spawnSparks(world, b.x, b.y);
    }
    if (dead) world.bullets.splice(i, 1);
  }
}

function spawnSparks(world, x, y) {
  for (let i = 0; i < 8; i++) {
    const a = world.rng.range(0, Math.PI * 2);
    world.particles.push({
      x, y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160,
      life: 0.35, color: '#ffd23f',
    });
  }
}

function updateTraffic(world, dt) {
  for (const c of world.cars) {
    if (c.kind !== 'traffic') continue;
    const target = c.route[c.routeI];
    const dx = target.x - c.x;
    const dy = target.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d < 30) {
      c.routeI = (c.routeI + 1) % c.route.length;
      continue;
    }
    const want = Math.atan2(dy, dx);
    let diff = want - c.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    c.angle += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
    c.x += Math.cos(c.angle) * c.speed * dt;
    c.y += Math.sin(c.angle) * c.speed * dt;
    // Keep traffic on the roads: if it drifted off, nudge it back.
    if (!onRoad(c.x, c.y) && world.rng.chance(dt * 0.5)) {
      const near = nearestRoadPoint(c.x, c.y);
      c.x += (near.x - c.x) * dt * 0.5;
      c.y += (near.y - c.y) * dt * 0.5;
    }
  }
}

function updatePolice(world, dt) {
  const p = world.player;
  for (let i = world.cars.length - 1; i >= 0; i--) {
    const c = world.cars[i];
    if (c.kind !== 'police') continue;
    if (c.ramCooldown > 0) c.ramCooldown -= dt;
    if (c.stun > 0) {
      c.stun -= dt;
      c.speed *= Math.max(0, 1 - dt * 2);
      c.x += Math.cos(c.angle) * c.speed * dt;
      c.y += Math.sin(c.angle) * c.speed * dt;
      continue;
    }
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (world.wanted === 0 || d > 1100) {
      // No heat, or too far: drive off and despawn.
      c.leaving = true;
      if (d > 1100) {
        world.cars.splice(i, 1);
        continue;
      }
    }
    const want = Math.atan2(p.y - c.y, p.x - c.x);
    let diff = want - c.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const top = p.car ? 500 : 330;
    c.speed = Math.min(top, c.speed + 420 * dt);
    c.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const pos = moveCircle(world.city.buildings, c.x, c.y, Math.cos(c.angle) * c.speed * dt, Math.sin(c.angle) * c.speed * dt, 20);
    c.x = pos.x;
    c.y = pos.y;
    // Ram the player.
    if (d < 44 && c.ramCooldown <= 0 && p.hurtCooldown <= 0) {
      p.health = Math.max(0, p.health - POLICE_RAM_DAMAGE);
      p.hurtCooldown = 1;
      c.ramCooldown = 1;
      c.speed *= -0.3;
      world.shake = 0.6;
      world.toast = `Ouch — the cops rammed you. Health ${p.health}.`;
      world.toastTimer = 2;
    }
  }
}

function updatePeds(world, dt) {
  const p = world.player;
  for (const ped of world.peds) {
    if (ped.flee > 0) {
      ped.flee -= dt;
      const a = Math.atan2(ped.y - p.y, ped.x - p.x);
      const pos = moveCircle(world.city.buildings, ped.x, ped.y, Math.cos(a) * 190 * dt, Math.sin(a) * 190 * dt, 10);
      ped.x = pos.x;
      ped.y = pos.y;
      ped.angle = a;
      ped.walkPhase += dt * 12;
      continue;
    }
    // Stroll: mostly along the road, sometimes turning at a corner.
    if (world.rng.chance(dt * 0.12)) {
      ped.angle = Math.round(world.rng.range(0, 3)) * Math.PI / 2;
    }
    const pos = moveCircle(
      world.city.buildings, ped.x, ped.y,
      Math.cos(ped.angle) * ped.speed * dt, Math.sin(ped.angle) * ped.speed * dt, 10,
    );
    // A wall means turn around.
    if (pos.x === ped.x && pos.y === ped.y) ped.angle += Math.PI / 2;
    ped.x = pos.x;
    ped.y = pos.y;
    ped.walkPhase += dt * 7;
    // Keep pedestrians out of the water and roughly near the roads.
    if (inWater(ped.x, ped.y) || (!onRoad(ped.x, ped.y) && world.rng.chance(dt * 0.02))) {
      const near = nearestRoadPoint(ped.x, ped.y);
      ped.x = near.x + world.rng.range(-160, 160);
      ped.y = near.y + world.rng.range(-160, 160);
    }
  }
}

function updateParticles(world, dt) {
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const pt = world.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) world.particles.splice(i, 1);
  }
}
