// Save and load, through localStorage. One key, one small JSON object:
// cash, debt, missions done, ammo and health. Saving never throws — a
// full or blocked store just means the run is not persisted.
import { SAVE_KEY } from './config.js';

export function saveGame(W) {
  try {
    const data = {
      cash: W.cash,
      debt: W.debt,
      missionsDone: W.missionsDone,
      ammo: W.player.ammo,
      health: W.player.health,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // A blocked store must never break the game.
  }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number' || typeof data.debt !== 'number') return null;
    return {
      cash: data.cash,
      debt: data.debt,
      missionsDone: Array.isArray(data.missionsDone) ? data.missionsDone : [],
      ammo: typeof data.ammo === 'number' ? data.ammo : 24,
      health: typeof data.health === 'number' ? data.health : 100,
    };
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
