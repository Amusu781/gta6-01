// Saving to localStorage: cash, the debt, which missions are done, where Rico is,
// and which car he owns. Nothing leaves the browser.
import { SAVE_KEY } from './config.js';

export function saveGame(world) {
  try {
    const data = {
      v: 1,
      cash: Math.round(world.cash),
      debt: Math.round(world.debt),
      missionsDone: world.missionsDone.slice(),
      player: { x: world.player.x, y: world.player.y },
      car: world.player.car ? { x: world.player.car.x, y: world.player.car.y, angle: world.player.car.angle, color: world.player.car.color, model: world.player.car.model } : null,
      time: world.time,
      savedAt: Date.now(), // when this save was written; load ignores it, it is for debugging
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
}
