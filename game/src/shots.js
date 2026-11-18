// Screenshot scenes: the ?shot=start|drive|wanted|mission&seed=N query the
// test driver uses. Each one poses the same live game — no staged images,
// the world is the real simulation, just arranged for the camera.

import { SPRAY_SHOP } from './config.js';

export function applyShot(world, params) {
  const shot = params.get('shot');
  if (!shot) return false;
  const p = world.player;

  if (shot === 'start') {
    world.screen = 'title';
    world.camera.x = 1500;
    world.camera.y = 1250;
  } else if (shot === 'drive') {
    world.screen = 'playing';
    const car = world.cars.find((c) => c.kind === 'parked');
    p.car = car;
    car.stolen = true;
    p.x = car.x;
    p.y = car.y;
    car.x = 1360;
    car.y = 960;
    car.angle = 0;
    car.speed = 420;
    p.x = car.x;
    p.y = car.y;
    world.camera.x = car.x;
    world.camera.y = car.y;
  } else if (shot === 'wanted') {
    world.screen = 'playing';
    const car = world.cars.find((c) => c.kind === 'parked');
    p.car = car;
    car.stolen = true;
    car.x = 1860;
    car.y = 1560;
    car.angle = Math.PI / 2;
    car.speed = 380;
    p.x = car.x;
    p.y = car.y;
    world.wanted = 2;
    world.wantedQuiet = 0;
    world.camera.x = car.x;
    world.camera.y = car.y;
  } else if (shot === 'mission') {
    world.screen = 'playing';
    const car = world.cars.find((c) => c.kind === 'parked');
    p.car = car;
    car.stolen = true;
    car.x = 2880;
    car.y = 2150;
    car.angle = 0;
    car.speed = 200;
    p.x = car.x;
    p.y = car.y;
    world.missions.stage = 'deliver';
    world.missions.target = { x: SPRAY_SHOP.x, y: SPRAY_SHOP.y, r: SPRAY_SHOP.r, label: SPRAY_SHOP.name };
    world.camera.x = car.x;
    world.camera.y = car.y;
  }
  return true;
}
