// Palmera Bay — entry point. Builds the world, runs the loop, owns the
// state machine (title / playing / paused / busted) and the debug hooks
// the screenshot driver reads: window.__world, window.__gameState,
// window.__shotReady.
import {
  WORLD_W, WORLD_H, START_CASH, START_DEBT, START_HEALTH, START_AMMO,
  PLAYER_SPAWN, GARAGE, SAVE_KEY,
} from './config.js';
import { makeRng } from './random.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { generateCity } from './city.js';
import {
  createPlayer, createPeds, createParkedCars, createTraffic,
  updatePlayer, fireBullet, updateBullets, updatePeds, updateTraffic,
  syncPolice, updatePolice, nearestParkedCar, stealCar, exitCar,
  updateWanted, updateParticles,
} from './actors.js';
import { takeMission, updateMission, missionObjective } from './missions.js';
import { drawGame } from './render.js';
import { stageShot } from './shots.js';
import { saveGame, loadSave, clearSave } from './save.js';

const params = new URLSearchParams(window.location.search);
const SHOT = params.get('shot');
const SEED = parseInt(params.get('seed') || '7', 10) || 7;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();
const saved = loadSave();

function createWorld(seed) {
  const rng = makeRng(seed);
  const city = generateCity(rng);
  const player = createPlayer(PLAYER_SPAWN);
  const cars = [
    ...createParkedCars(city, rng),
    ...createTraffic(city, rng, 8),
  ];
  const W = {
    seed, rng, city, audio, input,
    player,
    cars,
    peds: createPeds(city, rng, 14),
    police: [],
    bullets: [],
    particles: [],
    mission: null,
    missionsDone: [],
    cash: START_CASH,
    debt: START_DEBT,
    wanted: 0,
    crimeTimer: 0,
    state: 'title',
    message: '',
    messageTimer: 0,
    time: 0,
    saveTimer: 0,
    hasSave: !!saved,
    pendingSave: saved,
    garageSpot: GARAGE,
    spraySpot: { x: 3150, y: 2150 },
    camera: { x: 0, y: 0 },
    aimX: 0,
    aimY: 0,
    objectiveText: '',
  };
  W.saveGame = () => saveGame(W);
  return W;
}

let W = createWorld(SEED);
window.__world = W;

function applySave() {
  const s = W.pendingSave;
  if (!s) return;
  W.cash = s.cash;
  W.debt = s.debt;
  W.missionsDone = [...s.missionsDone];
  W.player.ammo = s.ammo;
  W.player.health = s.health;
  W.message = `Welcome back, Rico. Debt: $${W.debt}.`;
  W.messageTimer = 3.5;
}

function resetWorld(seed) {
  const keepSave = W.pendingSave;
  W = createWorld(seed);
  W.pendingSave = keepSave;
  W.hasSave = !!keepSave;
  window.__world = W;
  window.__shotReady = false;
}

function startGame(useSave) {
  audio.unlock();
  if (useSave) applySave();
  W.state = 'playing';
  W.message = useSave
    ? ''
    : "Marla wants her $5,000. Visit the garage — press E — and take a job.";
  W.messageTimer = useSave ? 0 : 5;
}

function respawnAfterBust() {
  const p = W.player;
  W.cash = Math.max(0, W.cash - 100);
  W.debt = W.debt;
  p.health = START_HEALTH;
  p.ammo = START_AMMO;
  p.x = PLAYER_SPAWN.x;
  p.y = PLAYER_SPAWN.y;
  if (p.car) {
    p.car.driver = null;
    p.car = null;
    p.onFoot = true;
  }
  W.wanted = 0;
  W.police.length = 0;
  W.cars = W.cars.filter((c) => c.kind !== 'police');
  W.audio.sirenOff();
  W.audio.engineOff();
  W.state = 'playing';
  W.message = 'Back on the street. The debt is still $' + W.debt + '.';
  W.messageTimer = 3.5;
  W.saveGame();
}

function interact() {
  const p = W.player;
  if (p.car) {
    exitCar(W);
    return;
  }
  if (takeMission(W)) return;
  const car = nearestParkedCar(W);
  if (car) stealCar(W, car);
}

function update(dt) {
  W.time += dt;
  if (W.messageTimer > 0) W.messageTimer -= dt;
  if (W.messageTimer <= 0) W.message = '';
  // Global keys.
  if (input.consume('KeyM')) {
    const muted = audio.toggleMute();
    W.message = muted ? 'Sound off.' : 'Sound on.';
    W.messageTimer = 1.5;
  }
  if (W.state === 'title') {
    if (input.consume('Enter')) startGame(!!W.hasSave);
    if (input.consume('KeyR')) {
      clearSave();
      resetWorld(SEED);
      startGame(false);
    }
    input.endFrame();
    return;
  }
  if (W.state === 'busted') {
    if (input.consume('Enter')) respawnAfterBust();
    input.endFrame();
    return;
  }
  if (input.consume('KeyP')) {
    W.state = W.state === 'paused' ? 'playing' : 'paused';
    if (W.state === 'paused') {
      audio.engineOff();
    }
    input.endFrame();
    return;
  }
  if (W.state === 'paused') {
    if (input.consume('KeyR')) {
      resetWorld((Date.now() % 100000) + 1);
      startGame(false);
    }
    input.endFrame();
    return;
  }
  if (input.consume('KeyR')) {
    resetWorld((Date.now() % 100000) + 1);
    startGame(false);
    input.endFrame();
    return;
  }
  // Playing.
  audio.unlock();
  if (input.consume('KeyE')) interact();
  // Aim: mouse position in world coordinates.
  W.aimX = W.camera.x + input.mouseX;
  W.aimY = W.camera.y + input.mouseY;
  if (input.consume('Space') || input.consume('Mouse0')) {
    if (!W.player.car && W.player.ammo > 0) {
      const aim = Math.atan2(W.aimY - W.player.y, W.aimX - W.player.x);
      fireBullet(W, aim);
    }
  }
  updatePlayer(W, dt, input);
  updatePeds(W, dt);
  updateTraffic(W, dt);
  syncPolice(W, dt);
  updatePolice(W, dt);
  updateBullets(W, dt);
  updateMission(W, dt);
  updateWanted(W, dt);
  updateParticles(W, dt);
  W.objectiveText = missionObjective(W);
  W.saveTimer += dt;
  if (W.saveTimer >= 10) {
    W.saveTimer = 0;
    W.saveGame();
  }
  input.endFrame();
}

let last = performance.now();
let firstFrameDone = false;
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(dt);
  drawGame(ctx, W, input, canvas.width, canvas.height);
  if (SHOT && !firstFrameDone) {
    firstFrameDone = true;
    window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}

window.__gameState = function gameState() {
  const p = W.player;
  return {
    state: W.state,
    cash: W.cash,
    debt: W.debt,
    wanted: W.wanted,
    health: Math.round(p.health),
    ammo: p.ammo,
    missionsDone: [...W.missionsDone],
    mission: W.mission ? { id: W.mission.id, stage: W.mission.stage } : null,
    inCar: !!p.car,
    x: Math.round(p.x),
    y: Math.round(p.y),
    cars: W.cars.length,
    police: W.police.length,
    peds: W.peds.length,
  };
};

if (SHOT) {
  stageShot(W, SHOT);
} else {
  window.__shotReady = false;
}
requestAnimationFrame(frame);
