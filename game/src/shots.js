// Deterministic screenshot staging: ?shot=start|drive|wanted|mission&seed=N
// puts the game in a fixed scene so the dossier's cover images are
// reproducible. Every staged scene runs the real game — nothing is faked.
import { GARAGE, SPRAY_SHOP } from './config.js';
import { stealCar } from './actors.js';

export function stageShot(W, shot) {
  const p = W.player;
  if (shot === 'start') {
    W.state = 'title';
    p.x = 470;
    p.y = 560;
    W.__shotReady = true;
    return;
  }
  W.state = 'playing';
  const parked = W.cars.find((c) => c.kind === 'parked');
  function putInCar(x, y, angle) {
    if (!parked) return;
    parked.kind = 'player';
    parked.driver = 'player';
    parked.x = x;
    parked.y = y;
    parked.angle = angle;
    parked.speed = 0;
    p.car = parked;
    p.onFoot = false;
    p.x = x;
    p.y = y;
    p.angle = angle;
  }
  if (shot === 'drive') {
    putInCar(1500, 900, 0);
    if (p.car) p.car.speed = 260;
    // A little traffic around the player for life.
    const t1 = W.cars.find((c) => c.kind === 'traffic');
    if (t1) {
      t1.x = 1500;
      t1.y = 900;
      t1.axis = 'h';
      t1.dir = 1;
      t1.angle = 0;
      t1.speed = 170;
    }
    const t2 = W.cars.find((c) => c.kind === 'traffic' && c !== t1);
    if (t2) {
      t2.x = 1350;
      t2.y = 900;
      t2.axis = 'h';
      t2.dir = 1;
      t2.angle = 0;
      t2.speed = 150;
    }
  } else if (shot === 'wanted') {
    putInCar(1500, 1500, Math.PI / 2);
    if (p.car) p.car.speed = 300;
    W.wanted = 2;
    W.audio.sirenOn();
    // Two police cars closing in from behind and ahead.
    W.police.length = 0;
    const cops = W.cars.filter((c) => c.kind === 'police');
    for (const c of cops) W.cars.splice(W.cars.indexOf(c), 1);
    const spots = [
      { x: 1500, y: 1150 },
      { x: 1500, y: 1900 },
    ];
    for (const s of spots) {
      const cop = {
        id: 9000 + W.police.length, kind: 'police', model: 'Interceptor',
        color: '#22262b', x: s.x, y: s.y, angle: s.y < 1500 ? Math.PI / 2 : -Math.PI / 2,
        speed: 320, health: 3, driver: null, target: null, stuck: 0, ramTimer: 0, w: 46, h: 22,
      };
      W.cars.push(cop);
      W.police.push(cop);
    }
  } else if (shot === 'mission') {
    putInCar(2700, 1950, -Math.PI / 2);
    if (p.car) p.car.speed = 240;
    W.mission = {
      id: 'wheels', title: 'Wheels', reward: 500, story: true,
      stage: 'deliver', target: { x: SPRAY_SHOP.x, y: SPRAY_SHOP.y, label: 'Deliver to Spray & Go' },
      timer: 0, timeLimit: 0,
    };
    W.message = 'Wheels: deliver the car to Spray & Go.';
    W.messageTimer = 5;
    const t1 = W.cars.find((c) => c.kind === 'traffic');
    if (t1) {
      t1.x = 2900;
      t1.y = 2100;
      t1.axis = 'h';
      t1.dir = -1;
      t1.angle = Math.PI;
      t1.speed = 160;
    }
  }
  W.__shotReady = true;
}
