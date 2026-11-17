// Rico on foot and behind the wheel: walking, running, stealing cars, driving,
// shooting, punching, and starting jobs at the garage.
import { WORLD_W, WORLD_H, BEACH_Y, TUNING, PLACES } from './config.js';
import { clamp, dist, angleTo, circleRectResolve } from './utils.js';
import { hitsBuilding } from './city.js';
import { nearestCar, drivePlayerCar } from './vehicles.js';
import { addWanted } from './pedestrians.js';
import { fireBullet, punch, hurtPlayer } from './combat.js';
import { missionState, startMission } from './missions.js';
import { saveGame } from './save.js';
import { sfx } from './audio.js';

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, health: 100, ammo: 24, reloadTimer: 0,
    shootTimer: 0, punchTimer: 0, invuln: 0, lastHurt: -99,
    car: null, walkBob: 0, moving: false,
  };
}

// Stepping into a car: parked ones are free to take, traffic ones are a carjacking.
export function tryEnterCar(world) {
  const p = world.player;
  const car = nearestCar(world, p.x, p.y, 64, ['parked', 'traffic']);
  if (!car) return false;
  if (car.kind === 'parked') {
    world.events.push({ type: 'steal' });
    addWanted(world, 1, 'Someone saw you boost that car.');
  } else if (car.kind === 'traffic') {
    world.events.push({ type: 'steal' });
    addWanted(world, 1, 'Carjacking! The driver ran for it.');
    // The driver bails and the car stops.
    car.speed = 0;
    const ped = { x: car.x + 30, y: car.y + 30, angle: 0, speed: 60, shirt: '#ffd23e', skin: '#c98d5f', state: 'walk', panic: 4, tx: car.x + 200, ty: car.y + 200, dead: false, fade: 1, bob: 0 };
    world.peds.push(ped);
  }
  car.kind = 'player';
  p.car = car;
  p.x = car.x; p.y = car.y;
  return true;
}

export function exitCar(world) {
  const p = world.player;
  const car = p.car;
  if (!car) return;
  car.kind = 'parked';
  car.speed = 0;
  // Step out to the side of the car, clear of buildings.
  const side = Math.PI / 2;
  p.x = car.x + Math.cos(car.angle + side) * 34;
  p.y = car.y + Math.sin(car.angle + side) * 34;
  p.x = clamp(p.x, 30, WORLD_W - 30);
  p.y = clamp(p.y, 30, BEACH_Y + 100);
  // Step out facing the way the car points, so Rico is already looking down the road.
  p.angle = car.angle;
  p.car = null;
}

export function updatePlayer(world, input, dt) {
  const p = world.player;
  p.invuln = Math.max(0, p.invuln - dt);
  p.shootTimer = Math.max(0, p.shootTimer - dt);
  p.punchTimer = Math.max(0, p.punchTimer - dt);
  p.reloadTimer = Math.max(0, p.reloadTimer - dt);

  // Health comes back slowly when Rico hasn't been hurt in a while.
  if (world.time - p.lastHurt > TUNING.healthRegenDelay && p.health > 0) {
    p.health = Math.min(100, p.health + TUNING.healthRegenRate * dt);
  }

  if (p.car) {
    drivePlayerCar(world, p.car, input, dt);
    p.x = p.car.x; p.y = p.car.y; p.angle = p.car.angle;
    // Leaving the car.
    if (world.pressedE) exitCar(world);
    return;
  }

  // On foot: WASD moves, Shift runs. Face the mouse when armed, else the walk direction.
  const mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  p.moving = mx !== 0 || my !== 0;
  if (p.moving) {
    const sp = input.run ? TUNING.runSpeed : TUNING.walkSpeed;
    const len = Math.hypot(mx, my);
    p.x += (mx / len) * sp * dt;
    p.y += (my / len) * sp * dt;
    p.walkBob += dt * 10;
    if (!input.mouseDown) p.angle = Math.atan2(my, mx);
  }
  p.x = clamp(p.x, 30, WORLD_W - 30);
  p.y = clamp(p.y, 30, BEACH_Y + 100);
  const hit = hitsBuilding(world.city, p.x, p.y, 14);
  if (hit) circleRectResolve(p, hit);

  // Aim at the mouse.
  const cam = world.camera;
  const wx = cam.x + input.mouseX;
  const wy = cam.y + input.mouseY;
  if (input.mouseDown || p.ammo > 0) p.angle = angleTo(p.x, p.y, wx, wy);

  // E: get in a car, or take a job at the garage.
  if (world.pressedE) {
    const { next } = missionState(world);
    if (!world.mission && next && dist(p.x, p.y, PLACES.hideout.x, PLACES.hideout.y) < PLACES.hideout.r + 30) {
      startMission(world, next);
    } else {
      tryEnterCar(world);
    }
  }
  // F: punch. R: reload. Click: shoot.
  if (world.pressedF) punch(world);
  if (world.pressedR && p.ammo < 24 && p.reloadTimer <= 0) { p.reloadTimer = 1.1; p.ammo = 24; sfx.reload(world.audio); }
  if (input.mouseDown && p.shootTimer <= 0 && p.ammo > 0 && p.reloadTimer <= 0) {
    p.shootTimer = 0.24;
    p.ammo -= 1;
    fireBullet(world, p.x + Math.cos(p.angle) * 22, p.y + Math.sin(p.angle) * 22, p.angle, 'player');
    world.events.push({ type: 'muzzle' });
    if (p.ammo === 0) p.reloadTimer = 1.1;
  }

  // The garage clears the heat when no police are close.
  if (dist(p.x, p.y, PLACES.hideout.x, PLACES.hideout.y) < PLACES.hideout.r) {
    let near = false;
    for (const car of world.cars) if (car.kind === 'police' && dist(car.x, car.y, p.x, p.y) < 500) near = true;
    for (const cop of world.cops) if (!cop.dead && dist(cop.x, cop.y, p.x, p.y) < 500) near = true;
    if (!near && world.wanted > 0) {
      world.wanted = 0;
      world.notice = { text: 'Safe at the garage. The heat is off.', t: 3 };
    }
  }
}

// Wasted or busted: wake up at the clinic, lighter in the pocket.
export function respawn(world, reason) {
  const p = world.player;
  const loss = Math.floor(world.cash * TUNING.respawnCost);
  world.cash = Math.max(0, world.cash - loss);
  p.health = 100;
  p.ammo = 24;
  p.car = null;
  p.x = PLACES.clinic.x; p.y = PLACES.clinic.y;
  p.invuln = 3;
  world.wanted = 0;
  world.mission = null;
  world.cops = [];
  for (const car of world.cars) if (car.kind === 'police') car.kind = 'traffic';
  world.notice = { text: reason === 'busted'
    ? `Busted! The cops took $${loss} in fines.`
    : `Wasted! The clinic patched you up — $${loss} for the trouble.`, t: 5 };
  world.screen = 'play';
  saveGame(world);
}
