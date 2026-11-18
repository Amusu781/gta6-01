// Palmera Bay — entry point. Boots the canvas, runs the loop, owns the
// screen state machine (title / playing / paused / busted), and exposes the
// hooks the test driver uses: window.__world, window.__gameState() and
// window.__shotReady.

import { WORLD_W, WORLD_H, START_AMMO } from './config.js';
import { createWorld, updateWorld } from './actors.js';
import { updateMissions, currentObjective } from './missions.js';
import { drawWorld } from './render.js';
import { applyShot } from './shots.js';
import {
  initInput, moveVector, pressed, keyDown, consumeClick, mousePos,
  mouseHeld, endFrameInput,
} from './input.js';
import {
  unlockAudio, toggleMute, engineHum, siren, sfxCash, sfxBusted, sfxPickup,
} from './audio.js';
import { loadSave, writeSave } from './save.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed')) || 7;

const save = loadSave();
const world = createWorld(seed, save);
initInput(canvas);
const shotMode = applyShot(world, params);

// Test-driver hooks: the live world, a JSON snapshot, and a ready flag.
window.__world = world;
window.__gameState = () => ({
  screen: world.screen,
  cash: Math.round(world.cash),
  debt: Math.round(world.debt),
  health: Math.round(world.player.health),
  ammo: world.player.ammo,
  wanted: world.wanted,
  objective: currentObjective(world),
  missionsDone: world.missions.done.slice(),
  inCar: !!world.player.car,
  x: Math.round(world.player.x),
  y: Math.round(world.player.y),
  speed: Math.round(world.player.speed || 0),
  police: world.cars.filter((c) => c.kind === 'police').length,
  cars: world.cars.length,
  peds: world.peds.length,
});
window.__shotReady = false;

let last = performance.now();
let frames = 0;
let lastSave = 0;

function screenToWorld(sx, sy) {
  return {
    x: sx - 640 + world.camera.x,
    y: sy - 360 + world.camera.y,
  };
}

function resetRun() {
  const fresh = loadSave();
  const again = createWorld(seed, fresh);
  // Keep the same object identity the driver holds: copy fields over.
  for (const k of Object.keys(world)) delete world[k];
  Object.assign(world, again);
  world.screen = 'playing';
}

function frame(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;
  frames++;

  const mv = moveVector();
  const mouse = mousePos();
  const aim = screenToWorld(mouse.x, mouse.y);
  const shootPressed = consumeClick() || pressed('Space');
  const enterPressed = pressed('KeyE');
  const input = {
    move: mv,
    aimX: aim.x,
    aimY: aim.y,
    shootPressed,
    enterPressed,
  };

  // Global keys.
  if (pressed('KeyM')) toggleMute();
  if (pressed('Enter') || pressed('NumpadEnter')) {
    unlockAudio();
    if (world.screen === 'title') world.screen = 'playing';
  }
  if (world.screen === 'title' && mouseHeld()) {
    unlockAudio();
    world.screen = 'playing';
  }
  if (pressed('KeyP') && (world.screen === 'playing' || world.screen === 'paused')) {
    world.screen = world.screen === 'playing' ? 'paused' : 'playing';
  }
  if (pressed('KeyR') && world.screen === 'busted') {
    resetRun();
  }

  if (world.screen === 'playing') {
    const before = { cash: world.cash, missions: world.missions.done.length };
    updateWorld(world, dt, input);
    const ev = updateMissions(world, dt);
    if (ev && (ev.event === 'complete' || ev.event === 'pickup' || ev.event === 'stolen')) {
      if (ev.event === 'complete') sfxCash();
      if (ev.event === 'pickup') sfxPickup();
      writeSave(world);
    }
    if (world.cash !== before.cash) writeSave(world);
    // A car under the player at rest re-arms nothing; keep the engine hum
    // and the siren in step with the world.
    engineHum(world.player.car ? Math.abs(world.player.car.speed) / 540 : 0, !!world.player.car);
    const nearPolice = world.cars.some(
      (c) => c.kind === 'police' && Math.hypot(c.x - world.player.x, c.y - world.player.y) < 700,
    );
    siren(world.wanted > 0 && nearPolice);
    // Periodic save so a crash still keeps the run.
    if (world.time - lastSave > 15) {
      lastSave = world.time;
      writeSave(world);
    }
    if (world.screen === 'busted') {
      sfxBusted();
      writeSave(world);
    }
  } else {
    engineHum(0, false);
    siren(false);
  }

  // In shot mode the scene poses itself; the driver waits on this flag.
  if (shotMode && frames >= 45 && !window.__shotReady) {
    window.__shotReady = true;
  } else if (!shotMode && frames === 5) {
    window.__shotReady = true;
  }

  drawWorld(ctx, world);
  endFrameInput();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
