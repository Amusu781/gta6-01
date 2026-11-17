// The living city: the player, pedestrians, traffic, police and bullets.
// Every actor is a plain object; every update takes the world and dt.
import {
  WORLD_W, WORLD_H, PLAYER_FOOT_SPEED, CAR_TOP_SPEED, CAR_ACCEL, CAR_BRAKE,
  CAR_TURN, BULLET_SPEED, BULLET_RANGE, BULLET_DAMAGE, COP_HEALTH, RAM_DAMAGE,
  RAM_COOLDOWN, MAX_WANTED, WANTED_DECAY_SECONDS, CAR_MODELS, COLORS, INTERACT_RANGE,
} from './config.js';
import { clamp, dist, angleTo, angleDelta } from './random.js';
import { collide, onRoad, randomRoadPoint, nearestRoad } from './city.js';

let carId = 0;

export function makeCar(kind, x, y, angle, model, color) {
  return {
    id: ++carId, kind, model, color,
    x, y, angle, speed: 0, health: kind === 'police' ? COP_HEALTH : 1,
    driver: null, target: null, stuck: 0, ramTimer: 0, w: 46, h: 22,
  };
}

export function createPlayer(spawn) {
  return {
    x: spawn.x, y: spawn.y, angle: -Math.PI / 2, speed: 0,
    health: 100, ammo: 24, car: null, onFoot: true,
    ramTimer: 0, shootTimer: 0, r: 14,
  };
}

export function createPeds(city, rng, n) {
  const peds = [];
  for (let i = 0; i < n; i++) {
    const p = randomRoadPoint(rng);
    // Nudge off the asphalt onto the sidewalk.
    const road = nearestRoad(p.x, p.y);
    if (road.axis === 'v') p.x += p.x < road.at ? -78 : 78;
    else p.y += p.y < road.at ? -78 : 78;
    peds.push({
      x: clamp(p.x, 30, WORLD_W - 30), y: clamp(p.y, 30, WORLD_H - 30),
      angle: rng.range(0, Math.PI * 2), speed: rng.range(28, 55),
      color: rng.pick(COLORS.ped), state: 'walk',
      tx: 0, ty: 0, wait: rng.range(0, 2),
    });
    const ped = peds[peds.length - 1];
    const t = randomRoadPoint(rng);
    ped.tx = t.x;
    ped.ty = t.y;
  }
  return peds;
}

export function createParkedCars(city, rng) {
  const cars = [];
  const spots = [
    { x: 560, y: 330 }, { x: 840, y: 330 }, { x: 1440, y: 330 },
    { x: 2040, y: 930 }, { x: 2640, y: 330 }, { x: 840, y: 1530 },
    { x: 3240, y: 930 }, { x: 1440, y: 2130 }, { x: 2640, y: 1530 },
    { x: 540, y: 2130 },
  ];
  for (let i = 0; i < spots.length; i++) {
    const m = CAR_MODELS[i % CAR_MODELS.length];
    const c = makeCar('parked', spots[i].x, spots[i].y, rng.chance(0.5) ? 0 : Math.PI / 2, m.model, m.color);
    cars.push(c);
  }
  return cars;
}

export function createTraffic(city, rng, n) {
  const cars = [];
  for (let i = 0; i < n; i++) {
    const p = randomRoadPoint(rng);
    const road = nearestRoad(p.x, p.y);
    const m = CAR_MODELS[rng.int(0, CAR_MODELS.length - 1)];
    const c = makeCar('traffic', p.x, p.y, 0, m.model, m.color);
    c.axis = road.axis;
    c.dir = rng.chance(0.5) ? 1 : -1;
    c.angle = road.axis === 'v' ? (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (c.dir > 0 ? 0 : Math.PI);
    c.cruise = rng.range(120, 185);
    c.speed = c.cruise;
    cars.push(c);
  }
  return cars;
}

function driveCar(W, car, throttle, steer, dt) {
  const accel = throttle > 0 ? CAR_ACCEL : throttle < 0 ? -CAR_BRAKE : 0;
  car.speed = clamp(car.speed + accel * dt, -120, CAR_TOP_SPEED);
  if (throttle === 0) {
    car.speed -= car.speed * 1.4 * dt;
    if (Math.abs(car.speed) < 4) car.speed = 0;
  }
  const turning = car.speed !== 0 ? steer * CAR_TURN * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 120) : 0;
  car.angle += turning;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const fixed = collide(W.city, nx, ny, 20);
  if (Math.abs(fixed.x - nx) > 0.5 || Math.abs(fixed.y - ny) > 0.5) car.speed *= 0.55;
  car.x = fixed.x;
  car.y = fixed.y;
}

export function updatePlayer(W, dt, input) {
  const p = W.player;
  p.ramTimer = Math.max(0, p.ramTimer - dt);
  p.shootTimer = Math.max(0, p.shootTimer - dt);
  if (p.car) {
    // Driving: W/S throttle, A/D steer.
    const throttle = (input.up ? 1 : 0) - (input.down ? 1 : 0);
    const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    driveCar(W, p.car, throttle, steer, dt);
    p.x = p.car.x;
    p.y = p.car.y;
    p.angle = p.car.angle;
    p.speed = p.car.speed;
    W.audio.engine(Math.abs(p.car.speed) / CAR_TOP_SPEED);
  } else {
    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (mx || my) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      p.angle = Math.atan2(my, mx);
      p.speed = PLAYER_FOOT_SPEED;
      const fixed = collide(W.city, p.x + mx * p.speed * dt, p.y + my * p.speed * dt, p.r);
      p.x = fixed.x;
      p.y = fixed.y;
    } else {
      p.speed = 0;
    }
    W.audio.engineOff();
  }
}

export function fireBullet(W, aimAngle) {
  const p = W.player;
  if (p.car || p.ammo <= 0 || p.shootTimer > 0) return false;
  p.ammo -= 1;
  p.shootTimer = 0.22;
  const bx = p.x + Math.cos(aimAngle) * 20;
  const by = p.y + Math.sin(aimAngle) * 20;
  W.bullets.push({
    x: bx, y: by,
    vx: Math.cos(aimAngle) * BULLET_SPEED,
    vy: Math.sin(aimAngle) * BULLET_SPEED,
    life: BULLET_RANGE / BULLET_SPEED,
  });
  W.audio.shoot();
  return true;
}

export function updateBullets(W, dt) {
  const kept = [];
  for (const b of W.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || b.x < 0 || b.y < 0 || b.x > WORLD_W || b.y > WORLD_H;
    if (!dead) {
      for (const bld of W.city.buildings) {
        if (b.x >= bld.x && b.x <= bld.x + bld.w && b.y >= bld.y && b.y <= bld.y + bld.h) {
          dead = true;
          spark(W, b.x, b.y, '#c9c9c9', 4);
          break;
        }
      }
    }
    if (!dead) {
      for (const cop of W.police) {
        if (dist(b.x, b.y, cop.x, cop.y) < 26) {
          dead = true;
          cop.health -= BULLET_DAMAGE;
          spark(W, b.x, b.y, '#ffd34d', 8);
          if (cop.health <= 0) wreckCop(W, cop);
          break;
        }
      }
    }
    if (!dead) kept.push(b);
  }
  W.bullets = kept;
}

export function spark(W, x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = W.rng.range(0, Math.PI * 2);
    const s = W.rng.range(40, 180);
    W.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35, max: 0.35, color, size: 3 });
  }
}

function wreckCop(W, cop) {
  spark(W, cop.x, cop.y, '#ff5340', 22);
  spark(W, cop.x, cop.y, '#22262b', 14);
  W.cars = W.cars.filter((c) => c !== cop);
  W.police = W.police.filter((c) => c !== cop);
  W.message = 'Cop car wrecked!';
  W.messageTimer = 2.5;
}

export function updatePeds(W, dt) {
  const p = W.player;
  for (const ped of W.peds) {
    const threat = dist(ped.x, ped.y, p.x, p.y) < 220 && W.bullets.length > 0;
    let nearCop = false;
    for (const cop of W.police) if (dist(ped.x, ped.y, cop.x, cop.y) < 200) { nearCop = true; break; }
    if (threat || nearCop) ped.state = 'flee';
    else if (ped.state === 'flee' && !threat && !nearCop) ped.state = 'walk';
    const speed = ped.state === 'flee' ? ped.speed * 2.4 : ped.speed;
    let tx = ped.tx;
    let ty = ped.ty;
    if (ped.state === 'flee') {
      tx = ped.x + (ped.x - p.x);
      ty = ped.y + (ped.y - p.y);
    }
    const d = dist(ped.x, ped.y, tx, ty);
    if (d < 24) {
      if (ped.state === 'walk') {
        ped.wait -= dt;
        if (ped.wait <= 0) {
          const t = randomRoadPoint(W.rng);
          ped.tx = t.x;
          ped.ty = t.y;
          ped.wait = W.rng.range(0.5, 3);
        }
      } else {
        ped.state = 'walk';
      }
    } else {
      const a = angleTo(ped.x, ped.y, tx, ty);
      ped.angle = a;
      const fixed = collide(W.city, ped.x + Math.cos(a) * speed * dt, ped.y + Math.sin(a) * speed * dt, 10);
      ped.x = fixed.x;
      ped.y = fixed.y;
    }
  }
}

export function updateTraffic(W, dt) {
  for (const car of W.cars) {
    if (car.kind !== 'traffic') continue;
    // Slow for the car ahead on the same road.
    let slow = false;
    for (const other of W.cars) {
      if (other === car || other.kind === 'parked') continue;
      const ahead = car.axis === 'v'
        ? Math.abs(other.x - car.x) < 60 && (other.y - car.y) * car.dir > 0 && (other.y - car.y) * car.dir < 110
        : Math.abs(other.y - car.y) < 60 && (other.x - car.x) * car.dir > 0 && (other.x - car.x) * car.dir < 110;
      if (ahead) { slow = true; break; }
    }
    const target = slow ? 0 : car.cruise;
    car.speed += clamp(target - car.speed, -260 * dt, 160 * dt);
    let nx = car.x;
    let ny = car.y;
    if (car.axis === 'v') ny += car.dir * car.speed * dt;
    else nx += car.dir * car.speed * dt;
    // Wrap at the world edge, and maybe turn at an intersection.
    if (car.axis === 'v' && (ny < 40 || ny > WORLD_H - 40)) {
      ny = car.dir > 0 ? 40 : WORLD_H - 40;
      nx = car.x;
    }
    if (car.axis === 'h' && (nx < 40 || nx > WORLD_W - 40)) {
      nx = car.dir > 0 ? 40 : WORLD_W - 40;
    }
    const fixed = collide(W.city, nx, ny, 18);
    car.x = fixed.x;
    car.y = fixed.y;
    // At an intersection, sometimes turn onto the cross road.
    const road = nearestRoad(car.x, car.y);
    const onCross = car.axis === 'v' ? Math.abs(car.y - road.at) < 8 : Math.abs(car.x - road.at) < 8;
    if (onCross && road.axis !== car.axis && W.rng.chance(0.02)) {
      car.axis = road.axis;
      car.dir = W.rng.chance(0.5) ? 1 : -1;
      car.angle = car.axis === 'v' ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
    }
  }
}

export function syncPolice(W, dt) {
  const want = Math.min(W.wanted, MAX_WANTED);
  while (W.police.length < want) {
    const a = W.rng.range(0, Math.PI * 2);
    const r = W.rng.range(520, 700);
    let x = clamp(W.player.x + Math.cos(a) * r, 60, WORLD_W - 60);
    let y = clamp(W.player.y + Math.sin(a) * r, 60, WORLD_H - 60);
    const spot = randomRoadPoint(W.rng);
    x = spot.x;
    y = spot.y;
    const cop = makeCar('police', x, y, 0, 'Interceptor', '#22262b');
    cop.health = COP_HEALTH;
    W.cars.push(cop);
    W.police.push(cop);
  }
  while (W.police.length > want) {
    const cop = W.police.pop();
    W.cars = W.cars.filter((c) => c !== cop);
  }
}

export function updatePolice(W, dt) {
  const p = W.player;
  for (const cop of W.police) {
    cop.ramTimer = Math.max(0, cop.ramTimer - dt);
    const targetAngle = angleTo(cop.x, cop.y, p.x, p.y);
    const turn = clamp(angleDelta(cop.angle, targetAngle), -2.4 * dt, 2.4 * dt);
    cop.angle += turn;
    const wantSpeed = 300 + W.wanted * 45;
    cop.speed = clamp(cop.speed + 260 * dt, 0, wantSpeed);
    const nx = cop.x + Math.cos(cop.angle) * cop.speed * dt;
    const ny = cop.y + Math.sin(cop.angle) * cop.speed * dt;
    const fixed = collide(W.city, nx, ny, 20);
    if (Math.abs(fixed.x - nx) > 0.5 || Math.abs(fixed.y - ny) > 0.5) cop.speed *= 0.6;
    cop.x = fixed.x;
    cop.y = fixed.y;
    // Ram the player when close.
    const d = dist(cop.x, cop.y, p.x, p.y);
    if (d < 52 && cop.ramTimer <= 0 && p.ramTimer <= 0) {
      cop.ramTimer = RAM_COOLDOWN;
      p.ramTimer = RAM_COOLDOWN;
      p.health -= RAM_DAMAGE;
      spark(W, p.x, p.y, '#ff5340', 10);
      W.audio.shoot();
      if (p.health <= 0) {
        p.health = 0;
        W.state = 'busted';
        W.audio.busted();
        W.audio.engineOff();
        W.audio.sirenOff();
      }
    }
  }
}

export function nearestParkedCar(W) {
  const p = W.player;
  let best = null;
  let bestD = INTERACT_RANGE;
  for (const car of W.cars) {
    if (car.kind !== 'parked') continue;
    const d = dist(p.x, p.y, car.x, car.y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

export function stealCar(W, car) {
  car.kind = 'player';
  car.driver = 'player';
  W.player.car = car;
  W.player.onFoot = false;
  W.player.x = car.x;
  W.player.y = car.y;
  raiseWanted(W, 1);
  W.audio.steal();
  W.message = `Stole the ${car.model} — the law is coming!`;
  W.messageTimer = 3;
}

export function exitCar(W) {
  const p = W.player;
  if (!p.car) return;
  const car = p.car;
  car.driver = null;
  p.car = null;
  p.onFoot = true;
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 40;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 40;
  const fixed = collide(W.city, p.x, p.y, p.r);
  p.x = fixed.x;
  p.y = fixed.y;
  W.audio.engineOff();
}

export function raiseWanted(W, n) {
  W.wanted = Math.min(MAX_WANTED, W.wanted + n);
  W.crimeTimer = 0;
  if (W.wanted > 0) W.audio.sirenOn();
  else W.audio.sirenOff();
}

export function updateWanted(W, dt) {
  if (W.wanted <= 0) return;
  let nearCop = false;
  for (const cop of W.police) {
    if (dist(cop.x, cop.y, W.player.x, W.player.y) < 420) {
      nearCop = true;
      break;
    }
  }
  if (!nearCop) {
    W.crimeTimer += dt;
    if (W.crimeTimer >= WANTED_DECAY_SECONDS) {
      W.wanted -= 1;
      W.crimeTimer = 0;
      W.message = 'You lost them — heat is down.';
      W.messageTimer = 2.5;
      if (W.wanted <= 0) W.audio.sirenOff();
    }
  } else {
    W.crimeTimer = 0;
  }
}

export function updateParticles(W, dt) {
  const kept = [];
  for (const pt of W.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life > 0) kept.push(pt);
  }
  W.particles = kept;
}
