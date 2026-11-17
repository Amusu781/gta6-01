// Palmera Bay — bootstrap and the game loop. Builds the world, steps every system
// in order, drains the event queue into sound and particles, and draws the frame.
// ?shot=start|drive|wanted|mission stages a deterministic screenshot scene instead
// of starting the live game.
import { VIEW_W, VIEW_H, TUNING, MISSION_DEFS, PLACES } from './config.js';
import { mulberry32, clamp } from './utils.js';
import { buildCity } from './city.js';
import { createInput, bindInput, wasPressed, endFrame } from './input.js';
import { createAudio, ensureAudio, updateAudio, toggleMute, sfx } from './audio.js';
import { spawnParked, spawnTraffic, updateTraffic, collideCars } from './vehicles.js';
import { spawnPedestrians, updatePedestrians, checkPedCarHits } from './pedestrians.js';
import { updatePolice, checkBusted } from './police.js';
import { updateBullets } from './combat.js';
import { updateMissions } from './missions.js';
import { createPlayer, updatePlayer, respawn } from './player.js';
import { saveGame, loadGame, clearSave } from './save.js';
import { drawGame, drawTitle, drawPaused, drawOver, drawWin, updateCamera } from './render.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const GAME_VERSION = '1.1.0'; // polish pass: tuning, reload sound, vignette, serve.ts

function createWorld(seed, input) {
  const world = {
    seed,
    version: GAME_VERSION,
    rng: mulberry32(seed),
    time: 0,
    screen: 'title',
    overReason: null,
    cash: TUNING.startCash,
    debt: TUNING.debtTotal,
    missionsDone: [],
    mission: null,
    missionDefs: MISSION_DEFS,
    wanted: 0,
    wantedTimer: 0,
    lastCrime: -999,
    notice: null,
    shake: 0,
    gunshotTimer: 0,
    camera: { x: 0, y: 0 },
    city: null,
    cars: [],
    peds: [],
    cops: [],
    bullets: [],
    particles: [],
    events: [],
    player: null,
    input,
    pressedE: false, pressedF: false, pressedR: false,
    saveTimer: 0,
    audio: null,
  };
  world.reset = function reset() {
    world.rng = mulberry32(seed);
    world.time = 0;
    world.cash = TUNING.startCash;
    world.debt = TUNING.debtTotal;
    world.missionsDone = [];
    world.mission = null;
    world.wanted = 0;
    world.wantedTimer = 0;
    world.lastCrime = -999;
    world.notice = null;
    world.shake = 0;
    world.gunshotTimer = 0;
    world.cars = [];
    world.peds = [];
    world.cops = [];
    world.bullets = [];
    world.particles = [];
    world.events = [];
    world.city = buildCity(seed);
    world.player = createPlayer(PLACES.hideout.x + 40, PLACES.hideout.y + 40);
    world.camera = { x: world.player.x - VIEW_W / 2, y: world.player.y - VIEW_H / 2 };
    spawnParked(world);
    spawnTraffic(world, 12);
    spawnPedestrians(world, 26);
  };
  world.update = function update(dt, autopilot = false) {
    world.time += dt;
    world.gunshotTimer = Math.max(0, world.gunshotTimer - dt);
    if (world.notice) { world.notice.t -= dt; if (world.notice.t <= 0) world.notice = null; }
    if (!autopilot) {
      world.pressedE = wasPressed(input, 'KeyE');
      world.pressedF = wasPressed(input, 'KeyF');
      world.pressedR = wasPressed(input, 'KeyR');
    }
    updatePlayer(world, input, dt);
    updateTraffic(world, dt);
    updatePedestrians(world, dt);
    updatePolice(world, dt);
    updateBullets(world, dt);
    updateMissions(world, dt);
    collideCars(world);
    checkPedCarHits(world);
    updateParticles(world, dt);
    drainEvents(world);
    updateCamera(world);
    // Wasted or busted, on foot or in a car.
    if (world.player.health <= 0 && world.screen === 'play') {
      world.screen = 'over';
      world.overReason = 'wasted';
      sfx.fail(world.audio);
    } else if (checkBusted(world) && world.screen === 'play') {
      world.screen = 'over';
      world.overReason = 'busted';
      sfx.fail(world.audio);
    }
    // Autosave while playing.
    world.saveTimer += dt;
    if (world.saveTimer > 20) { world.saveTimer = 0; saveGame(world); }
    if (!autopilot) endFrame(input);
  };
  world.reset();
  return world;
}

function updateParticles(world, dt) {
  for (const pt of world.particles) {
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vx *= 0.92; pt.vy *= 0.92;
    pt.life -= dt;
  }
  world.particles = world.particles.filter((pt) => pt.life > 0);
}

function burst(world, x, y, color, n, speed) {
  for (let i = 0; i < n; i += 1) {
    const a = world.rng() * Math.PI * 2;
    const s = speed * (0.4 + world.rng() * 0.8);
    world.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + world.rng() * 0.4, max: 0.9, color, size: 2 + world.rng() * 3 });
  }
}

function drainEvents(world) {
  const audio = world.audio;
  for (const ev of world.events) {
    if (ev.type === 'crash') { sfx.crash(audio); burst(world, ev.x ?? world.player.x, ev.y ?? world.player.y, '#ffb84d', 10, 160); world.shake = Math.max(world.shake, 5); }
    else if (ev.type === 'shot') { sfx.shoot(audio); }
    else if (ev.type === 'punch') { sfx.punch(audio); burst(world, ev.x, ev.y, '#ffffff', 6, 120); }
    else if (ev.type === 'ped-down') { burst(world, ev.x, ev.y, '#ff5a4d', 8, 100); }
    else if (ev.type === 'spark') { burst(world, ev.x, ev.y, '#ffe94d', 5, 140); }
    else if (ev.type === 'hit') { burst(world, ev.x, ev.y, '#ff5a4d', 6, 120); }
    else if (ev.type === 'steal') { sfx.steal(audio); }
    else if (ev.type === 'pickup') { sfx.pickup(audio); }
    else if (ev.type === 'mission-start') { sfx.pickup(audio); }
    else if (ev.type === 'mission-done') { sfx.mission(audio); saveGame(world); }
    else if (ev.type === 'mission-fail') { sfx.fail(audio); }
  }
  world.events.length = 0;
}

function applySave(world, data) {
  world.cash = data.cash;
  world.debt = data.debt;
  world.missionsDone = data.missionsDone.slice();
  world.player.x = clamp(data.player.x, 30, 3600 - 30);
  world.player.y = clamp(data.player.y, 30, 2600 - 30);
  world.camera.x = clamp(world.player.x - VIEW_W / 2, 0, 3600 - VIEW_W);
  world.camera.y = clamp(world.player.y - VIEW_H / 2, 0, 2600 - VIEW_H);
  if (data.car) {
    const car = world.cars.find((c) => c.kind === 'parked');
    if (car) {
      car.x = data.car.x; car.y = data.car.y; car.angle = data.car.angle;
      car.color = data.car.color; car.model = data.car.model; car.kind = 'player';
      world.player.car = car;
    }
  }
}

function main() {
  const canvas = document.getElementById('game');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d');
  const input = createInput();
  bindInput(input, canvas);
  const audio = createAudio();
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = Number(params.get('seed') || 7);
  const world = createWorld(seed, input);
  world.audio = audio;

  const saved = loadGame();
  world.hasSave = !!saved;

  let shotMode = null;
  if (shot) {
    shotMode = stageShot(shot, world);
    world.hasSave = false;
  }

  // First gesture unlocks audio (browsers require it).
  const unlock = () => ensureAudio(audio);
  window.addEventListener('keydown', unlock, { once: false });
  window.addEventListener('mousedown', unlock, { once: false });

  let last = performance.now();
  let rafId = 0;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (shotMode) {
      // The staged scene holds still for the screenshot.
      if (shotMode.screen === 'title') drawTitle(ctx, world, false);
      else drawGame(ctx, world, input);
      window.__shotReady = true;
      rafId = requestAnimationFrame(frame);
      return;
    }

    if (world.screen === 'title') {
      // A living city idles behind the title.
      world.update(dt, true);
      drawTitle(ctx, world, world.hasSave);
      if (wasPressed(input, 'Enter')) {
        ensureAudio(audio);
        sfx.click(audio);
        if (world.hasSave && saved) { applySave(world, saved); }
        world.screen = 'play';
      } else if (wasPressed(input, 'KeyN') && world.hasSave) {
        clearSave();
        world.hasSave = false;
        world.reset();
      }
      endFrame(input);
    } else if (world.screen === 'play') {
      if (wasPressed(input, 'KeyP') || wasPressed(input, 'Escape')) {
        world.screen = 'paused';
        saveGame(world);
        endFrame(input);
      } else if (wasPressed(input, 'KeyM')) {
        toggleMute(audio);
        endFrame(input);
      } else {
        world.update(dt);
        const speedNorm = world.player.car ? Math.abs(world.player.car.speed) / 430 : 0;
        updateAudio(audio, speedNorm, dt);
        drawGame(ctx, world, input);
      }
    } else if (world.screen === 'paused') {
      drawGame(ctx, world, input);
      drawPaused(ctx);
      if (wasPressed(input, 'KeyP') || wasPressed(input, 'Escape') || wasPressed(input, 'Enter')) {
        world.screen = 'play';
      }
      endFrame(input);
    } else if (world.screen === 'over') {
      drawGame(ctx, world, input);
      drawOver(ctx, world, world.overReason);
      if (wasPressed(input, 'Enter')) respawn(world, world.overReason);
      endFrame(input);
    } else if (world.screen === 'win') {
      drawGame(ctx, world, input);
      drawWin(ctx, world);
      if (wasPressed(input, 'Enter')) world.screen = 'play';
      endFrame(input);
    }

    rafId = requestAnimationFrame(frame);
  }

  // Test hooks: the harness reads these over CDP, never shown to the player.
  window.__world = world;
  window.__gameState = () => ({
    version: world.version,
    screen: world.screen,
    cash: world.cash,
    debt: world.debt,
    wanted: world.wanted,
    health: world.player.health,
    inCar: !!world.player.car,
    carSpeed: world.player.car ? Math.round(world.player.car.speed) : 0,
    cars: world.cars.length,
    traffic: world.cars.filter((c) => c.kind === 'traffic').length,
    police: world.cars.filter((c) => c.kind === 'police').length + world.cops.length,
    peds: world.peds.length,
    missionsDone: world.missionsDone.slice(),
    mission: world.mission ? world.mission.id + ':' + world.mission.stage : null,
    player: { x: Math.round(world.player.x), y: Math.round(world.player.y) },
    errors: window.__errors || [],
  });
  window.__errors = [];
  window.addEventListener('error', (e) => window.__errors.push(String(e.message)));
  window.addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason)));

  rafId = requestAnimationFrame(frame);
}

main();
