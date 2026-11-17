// The law: the wanted level, police cruisers that chase Rico and ram his car,
// and foot officers who open fire at three stars and up. Heat fades when Rico
// lies low — or vanishes entirely inside the garage.
import { WORLD_W, BEACH_Y, TUNING } from './config.js';
import { clamp, dist, angleTo, turnToward } from './utils.js';
import { roadPointNear, createCar } from './vehicles.js';
import { addWanted } from './pedestrians.js';

export function spawnPoliceCar(world) {
  const p = roadPointNear(world, world.player.x, world.player.y, 500, 900);
  const car = createCar(p.x, p.y, angleTo(p.x, p.y, world.player.x, world.player.y), '#1c2733', 'Interceptor', 'police');
  car.siren = 0;
  world.cars.push(car);
  return car;
}

function spawnFootCop(world) {
  const p = roadPointNear(world, world.player.x, world.player.y, 380, 700);
  world.cops.push({
    x: p.x, y: p.y, angle: angleTo(p.x, p.y, world.player.x, world.player.y),
    speed: 0, health: 100, shootTimer: 1, state: 'chase', dead: false, fade: 1,
  });
}

// How many police the current wanted level calls for.
export function policeQuota(wanted) {
  return wanted <= 0 ? 0 : wanted === 1 ? 1 : wanted === 2 ? 2 : wanted === 3 ? 3 : wanted === 4 ? 4 : 5;
}

export function updatePolice(world, dt) {
  // Wanted decays after lying low: no crime and no police close by.
  if (world.wanted > 0) {
    world.wantedTimer += dt;
    const nearest = nearestPoliceDist(world);
    if (world.time - world.lastCrime > TUNING.wantedDecayDelay && nearest > 500) {
      if (world.wantedTimer > TUNING.wantedDecayDelay + TUNING.wantedDecayStep) {
        world.wanted -= 1;
        world.wantedTimer = TUNING.wantedDecayDelay;
        world.notice = { text: world.wanted > 0 ? 'The heat is cooling off…' : 'You lost them. Clean.', t: 3 };
      }
    } else {
      world.wantedTimer = Math.min(world.wantedTimer, TUNING.wantedDecayDelay);
    }
  }

  const quota = policeQuota(world.wanted);
  const cars = world.cars.filter((c) => c.kind === 'police');
  const cops = world.cops.filter((c) => !c.dead);
  if (world.wanted > 0) {
    while (cars.length + cops.length < quota) {
      if (world.wanted >= 3 && cops.length < 2 && world.rng() < 0.5) { spawnFootCop(world); cops.push(world.cops[world.cops.length - 1]); }
      else { spawnPoliceCar(world); cars.push(world.cars[world.cars.length - 1]); }
      if (cars.length + cops.length >= quota + 2) break;
    }
  } else {
    // No heat: the force stands down and drives off.
    for (const car of cars) car.kind = 'traffic';
    world.cops = [];
  }

  // Police cars hunt: steer at Rico, ram his car, or box him in on foot.
  const target = world.player.car ? world.player.car : world.player;
  for (const car of world.cars) {
    if (car.kind !== 'police') continue;
    car.siren += dt;
    const want = angleTo(car.x, car.y, target.x, target.y);
    car.angle = turnToward(car.angle, want, 3.4 * dt);
    const d = dist(car.x, car.y, target.x, target.y);
    const cruise = d > 260 ? 470 : 380;
    car.speed = clamp(car.speed + (cruise - car.speed) * dt * 1.2, 0, 480);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    car.x = clamp(car.x, 30, WORLD_W - 30);
    car.y = clamp(car.y, 30, BEACH_Y + 120);
    if (d < 46 && world.player.car) {
      // A ram: shove Rico's car and shake the camera.
      world.shake = Math.max(world.shake, 7);
      world.player.car.speed *= 0.86;
      world.events.push({ type: 'crash', strength: 160, x: car.x, y: car.y });
    }
    if (d < 60 && !world.player.car) {
      // A cruiser pulls up beside Rico on foot: the officer gets out.
      if (world.cops.length < 3) spawnFootCop(world);
      car.speed = 0;
    }
  }

  // Foot officers close in and shoot at three stars and up.
  for (const cop of world.cops) {
    if (cop.dead) { cop.fade -= dt * 0.4; continue; }
    const d = dist(cop.x, cop.y, world.player.x, world.player.y);
    const want = angleTo(cop.x, cop.y, world.player.x, world.player.y);
    cop.angle = want;
    if (d > 300) {
      cop.x += Math.cos(want) * 175 * dt;
      cop.y += Math.sin(want) * 175 * dt;
    } else if (d > 180) {
      cop.x += Math.cos(want) * 90 * dt;
      cop.y += Math.sin(want) * 90 * dt;
    }
    cop.shootTimer -= dt;
    if (world.wanted >= 3 && d < TUNING.copShootRange && cop.shootTimer <= 0) {
      cop.shootTimer = TUNING.copShootInterval + world.rng() * 0.5;
      world.bullets.push({
        x: cop.x, y: cop.y,
        vx: Math.cos(want) * 640, vy: Math.sin(want) * 640,
        from: 'cop', damage: TUNING.copDamage, life: 1.1,
      });
      world.events.push({ type: 'shot', x: cop.x, y: cop.y });
    }
  }
  world.cops = world.cops.filter((c) => !c.dead || c.fade > 0);
}

export function nearestPoliceDist(world) {
  let best = Infinity;
  for (const car of world.cars) {
    if (car.kind !== 'police') continue;
    best = Math.min(best, dist(car.x, car.y, world.player.x, world.player.y));
  }
  for (const cop of world.cops) {
    if (cop.dead) continue;
    best = Math.min(best, dist(cop.x, cop.y, world.player.x, world.player.y));
  }
  return best;
}

// Being caught on foot at high heat: busted, not killed.
export function checkBusted(world) {
  if (world.wanted < 2 || world.player.car) return false;
  for (const cop of world.cops) {
    if (!cop.dead && dist(cop.x, cop.y, world.player.x, world.player.y) < 34) return true;
  }
  return false;
}

export { addWanted };
