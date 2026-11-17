// Cars: the player's ride, parked cars to steal, traffic that follows the road grid,
// and the police cruisers that chase Rico. One physics model for all of them.
import { AVENUES, STREETS, WORLD_W, WORLD_H, BEACH_Y, TUNING, PALETTE } from './config.js';
import { clamp, dist, pick, range, turnToward, circleRectResolve } from './utils.js';
import { hitsBuilding, nearestAvenue, nearestStreet } from './city.js';

export const CAR_MODELS = ['Sunbeam', 'Coyote', 'Marlin GT', 'Palm Runner', 'Bay Cruiser', 'Flamingo'];
export const CAR_LEN = 46;
export const CAR_WID = 22;

export function createCar(x, y, angle, color, model, kind) {
  return { x, y, angle, speed: 0, color, model, kind, w: CAR_LEN, h: CAR_WID, id: Math.random().toString(36).slice(2, 9) };
}

export function spawnParked(world) {
  const rng = world.rng;
  let placed = 0;
  // Sixteen stealable cars keeps a car within a short walk of the garage,
  // so mission 1 never strands Rico on foot hunting for a ride.
  for (const spot of world.city.parking) {
    if (placed >= 16) break;
    if (rng() < 0.45) continue;
    if (hitsBuilding(world.city, spot.x, spot.y, 24)) continue;
    world.cars.push(createCar(spot.x, spot.y, spot.angle, pick(rng, PALETTE.carColors), pick(rng, CAR_MODELS), 'parked'));
    placed += 1;
  }
}

// Traffic cars drive from intersection to intersection on the road grid.
function randomNeighbour(world, ax, ay, fromAx, fromAy) {
  const options = [];
  const aves = AVENUES; const sts = STREETS;
  const ai = aves.indexOf(ax); const si = sts.indexOf(ay);
  if (ai > 0) options.push([aves[ai - 1], ay]);
  if (ai < aves.length - 1) options.push([aves[ai + 1], ay]);
  if (si > 0) options.push([ax, sts[si - 1]]);
  if (si < sts.length - 1) options.push([ax, sts[si + 1]]);
  const filtered = options.filter(([x, y]) => !(x === fromAx && y === fromAy));
  return pick(world.rng, filtered.length ? filtered : options);
}

export function spawnTraffic(world, n) {
  for (let i = 0; i < n; i += 1) {
    const ax = pick(world.rng, AVENUES);
    const ay = pick(world.rng, STREETS);
    const [tx, ty] = randomNeighbour(world, ax, ay, ax, ay);
    const car = createCar(ax, ay, Math.atan2(ty - ay, tx - ax), pick(world.rng, PALETTE.carColors), pick(world.rng, CAR_MODELS), 'traffic');
    car.node = [ax, ay]; car.target = [tx, ty];
    car.cruise = range(world.rng, TUNING.trafficSpeed * 0.75, TUNING.trafficSpeed * 1.15);
    world.cars.push(car);
  }
}

function driveTrafficCar(world, car, dt) {
  const [tx, ty] = car.target;
  const want = Math.atan2(ty - car.y, tx - car.x);
  car.angle = turnToward(car.angle, want, 3.2 * dt);
  car.speed = clamp(car.speed + (car.cruise - car.speed) * dt * 1.5, 0, car.cruise * 1.4);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  if (dist(car.x, car.y, tx, ty) < 26) {
    const [px, py] = car.node;
    car.node = [tx, ty];
    car.target = randomNeighbour(world, tx, ty, px, py);
  }
  // Slow for a car directly ahead on the same road.
  for (const other of world.cars) {
    if (other === car || other.kind === 'parked') continue;
    const dx = other.x - car.x; const dy = other.y - car.y;
    const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
    const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
    if (ahead > 0 && ahead < 70 && side < 26) { car.speed = Math.min(car.speed, other.speed * 0.9); break; }
  }
}

export function updateTraffic(world, dt) {
  for (const car of world.cars) {
    if (car.kind === 'traffic') driveTrafficCar(world, car, dt);
  }
}

// The player's driving: W/S accelerate and brake, A/D steer (stronger at speed),
// Space handbrakes. Collisions with buildings and other cars slow the car down.
export function drivePlayerCar(world, car, input, dt) {
  const accel = input.up ? TUNING.carAccel : 0;
  const brake = input.down ? TUNING.carBrake : 0;
  if (accel) car.speed += accel * dt;
  if (brake) car.speed -= (car.speed > 0 ? brake : TUNING.carAccel * 0.6) * dt;
  if (input.handbrake) car.speed -= car.speed * 3.2 * dt;
  car.speed -= car.speed * TUNING.carFriction * dt;
  car.speed = clamp(car.speed, -TUNING.carMaxReverse, TUNING.carMaxSpeed);
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  if (steer !== 0 && Math.abs(car.speed) > 8) {
    car.angle += steer * TUNING.carSteer * dt * (car.speed / TUNING.carMaxSpeed + 0.35) * Math.sign(car.speed);
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = clamp(car.x, 30, WORLD_W - 30);
  car.y = clamp(car.y, 30, BEACH_Y + 120);
  const hit = hitsBuilding(world.city, car.x, car.y, 18);
  if (hit) {
    circleRectResolve(car, hit);
    if (Math.abs(car.speed) > 120) world.events.push({ type: 'crash', strength: Math.abs(car.speed) });
    car.speed *= 0.35;
  }
  return car;
}

// Simple circle-based car-vs-car bumps: push apart, and only trade speed when
// the cars are actually closing on each other — otherwise a gentle shove every
// frame would grind both cars to a halt.
export function collideCars(world) {
  const cars = world.cars;
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i]; const b = cars[j];
      const d = dist(a.x, a.y, b.x, b.y);
      if (d < 40 && d > 0.01) {
        const push = (40 - d) / 2;
        const nx = (b.x - a.x) / d; const ny = (b.y - a.y) / d;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
        // Closing speed along the line between the cars.
        const avx = Math.cos(a.angle) * a.speed; const avy = Math.sin(a.angle) * a.speed;
        const bvx = Math.cos(b.angle) * b.speed; const bvy = Math.sin(b.angle) * b.speed;
        const closing = (bvx - avx) * nx + (bvy - avy) * ny;
        if (closing < -30) {
          const avg = (a.speed + b.speed) / 2;
          a.speed = avg; b.speed = avg;
          world.events.push({ type: 'crash', strength: Math.abs(closing), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        }
      }
    }
  }
}

export function nearestCar(world, x, y, maxDist, kinds) {
  let best = null; let bestD = maxDist;
  for (const car of world.cars) {
    if (kinds && !kinds.includes(car.kind)) continue;
    const d = dist(x, y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

// A point on the road grid near (x, y), for spawning police out of sight.
export function roadPointNear(world, x, y, minDist, maxDist) {
  for (let tries = 0; tries < 24; tries += 1) {
    const a = nearestAvenue(x + range(world.rng, -maxDist, maxDist));
    const s = nearestStreet(y + range(world.rng, -maxDist, maxDist));
    const px = world.rng() < 0.5 ? a : x + range(world.rng, -maxDist, maxDist);
    const py = world.rng() < 0.5 ? s : y + range(world.rng, -maxDist, maxDist);
    const d = dist(x, y, px, py);
    if (d > minDist && d < maxDist) return { x: clamp(px, 60, WORLD_W - 60), y: clamp(py, 60, BEACH_Y - 60) };
  }
  return { x: nearestAvenue(x + 500), y: nearestStreet(y) };
}
