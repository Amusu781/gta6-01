// Save / load through localStorage. One key, one small JSON object:
// { cash, debt, missionsDone, best } — everything the next session needs.

import { SAVE_KEY, START_CASH, START_DEBT } from './config.js';

export function freshSave() {
  return { cash: START_CASH, debt: START_DEBT, missionsDone: [], best: 0 };
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return freshSave();
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return freshSave();
    return {
      cash: typeof parsed.cash === 'number' ? parsed.cash : START_CASH,
      debt: typeof parsed.debt === 'number' ? parsed.debt : START_DEBT,
      missionsDone: Array.isArray(parsed.missionsDone) ? parsed.missionsDone : [],
      best: typeof parsed.best === 'number' ? parsed.best : 0,
    };
  } catch {
    return freshSave();
  }
}

export function writeSave(world) {
  try {
    const data = {
      cash: Math.round(world.cash),
      debt: Math.round(world.debt),
      missionsDone: world.missions.done.slice(),
      best: Math.max(world.saveBest || 0, world.cash),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
