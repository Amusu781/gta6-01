// Screenshot scenes behind ?shot=start|drive|wanted|mission. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot (drive along the roads toward the objective, keep clear of buildings),
// so the frame is what a short game really looks like and the same seed always
// gives the same frame. The start scene shows the title over a living city.
import { VIEW_W, VIEW_H } from './config.js';
import { nearestAvenue, nearestStreet } from './city.js';
import { addWanted } from './pedestrians.js';
import { startMission } from './missions.js';

const STEP = 1 / 60;

// Grid autopilot: pick the road waypoint that takes the car toward (tx, ty)
// along the avenues and streets, never diagonally across a block. The car stays
// on its current road until it reaches the target's street or avenue, then turns;
// close in, it drives straight at the target (the docks and the garage apron
// are open ground, not blocks).
function waypointFor(world, tx, ty) {
  const car = world.player.car;
  if (!car) return { x: tx, y: ty };
  if (Math.hypot(tx - car.x, ty - car.y) < 260) return { x: tx, y: ty };
  const ax = nearestAvenue(car.x);
  const sy = nearestStreet(car.y);
  const onAve = Math.abs(car.x - ax) < 40;
  const onSt = Math.abs(car.y - sy) < 40;
  if (onAve && Math.abs(ax - tx) < 60) return { x: ax, y: ty };
  if (onSt && Math.abs(sy - ty) < 60) return { x: tx, y: sy };
  if (onAve) return { x: ax, y: nearestStreet(ty) };
  if (onSt) return { x: nearestAvenue(tx), y: sy };
  // Between roads: head for the nearest road centre line.
  const toAve = Math.abs(car.x - ax);
  const toSt = Math.abs(car.y - sy);
  return toAve < toSt ? { x: ax, y: car.y } : { x: car.x, y: sy };
}

function autopilotDrive(world, tx, ty) {
  const p = world.player;
  const car = p.car;
  if (!car) return;
  const wp = waypointFor(world, tx, ty);
  const want = Math.atan2(wp.y - car.y, wp.x - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const input = world.input;
  // Brake into a turn: a 90-degree corner at full speed overshoots the road
  // and wedges the car into the block. Ease off on the straight too.
  const turning = Math.abs(diff) > 0.45;
  input.up = !turning && Math.abs(car.speed) < 260;
  input.down = turning && Math.abs(car.speed) > 90;
  input.left = diff < -0.08; input.right = diff > 0.08;
  input.handbrake = false;
}

function stepWorld(world, dt) {
  world.update(dt, true);
}

function driveFor(world, seconds, tx, ty) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    autopilotDrive(world, tx, ty);
    stepWorld(world, STEP);
  }
}

// Put Rico in the parked car nearest (sx, sy) and drive it straight along its
// avenue toward (avenue, ty): no turns, so the frame catches the car at speed
// on the open road instead of mid-corner.
function stageDriving(world, sx, sy, ty, seconds) {
  let car = null; let best = Infinity;
  for (const c of world.cars) {
    if (c.kind !== 'parked') continue;
    const d = Math.hypot(c.x - sx, c.y - sy);
    if (d < best) { best = d; car = c; }
  }
  if (car) {
    car.kind = 'player';
    world.player.car = car;
    world.player.x = car.x; world.player.y = car.y;
    car.speed = 120;
    if (seconds > 0) {
      // Face the road ahead before driving: a parked car facing the wrong
      // way brakes to a stop and the autopilot never turns it around, so
      // the shot ends wedged at speed 0. Mission staging passes 0 seconds
      // and drives elsewhere afterwards, so it keeps the car's own angle.
      car.angle = ty < car.y ? -Math.PI / 2 : Math.PI / 2;
    }
  }
  driveFor(world, seconds, car ? car.x : sx, ty);
}

export function stageShot(name, world) {
  world.reset();
  world.screen = 'play';
  if (name !== 'start' && name !== 'drive' && name !== 'wanted' && name !== 'mission') {
    // An unknown ?shot= is a typo, not a crash: say so and stage the title.
    console.warn(`Palmera Bay: unknown shot "${name}", staging the title instead.`);
    name = 'start';
  }
  if (name === 'drive') {
    // Four seconds up the avenue at speed: the car is faced north before
    // driving, so the autopilot holds the road instead of braking to a
    // stop against the building corner.
    stageDriving(world, 800, 1900, 300, 4.0);
    return { screen: 'play' };
  }
  if (name === 'wanted') {
    stageDriving(world, 800, 1900, 300, 4.5);
    addWanted(world, 3, '');
    // Let the cruisers close in and the sirens start.
    for (let i = 0; i < 180; i += 1) {
      autopilotDrive(world, 800, 300);
      stepWorld(world, STEP);
    }
    return { screen: 'play' };
  }
  if (name === 'mission') {
    const def = world.missionDefs[1]; // The Courier
    startMission(world, def);
    stageDriving(world, 800, 1500, 300, 0);
    // Drive toward the docks pickup.
    driveFor(world, 9, 420, 2260);
    return { screen: 'play' };
  }
  // start: a living city idling behind the title screen.
  world.screen = 'title';
  for (let i = 0; i < 300; i += 1) stepWorld(world, STEP);
  return { screen: 'title' };
}
