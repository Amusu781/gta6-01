// Missions and the story thread: Rico Vega owes $5,000 to the fixer Marla Quinn.
// Three jobs pay it off — steal a car for the spray shop, run a courier package
// across town against the clock, then rob the bank and lose the heat.
// Each job starts at the garage (E), pays on completion, and saves the game.
import { PLACES, MISSION_DEFS, TUNING } from './config.js';
import { dist } from './utils.js';
import { addWanted } from './pedestrians.js';

export function missionState(world) {
  const next = MISSION_DEFS.find((m) => !world.missionsDone.includes(m.id));
  return { next, active: world.mission, done: world.missionsDone.length };
}

// Text for the objective banner at the top of the screen.
export function objectiveText(world) {
  const m = world.mission;
  if (!m) {
    const { next } = missionState(world);
    if (!next) return 'Debt cleared. Palmera Bay is yours — free roam.';
    return `${next.title} — go to Rico\u2019s Garage and press E.`;
  }
  if (m.id === 'wheels') {
    if (m.stage === 0) return 'Steal a car — any parked car, or one off the street.';
    return 'Drive it to the Sunset Spray Shop (yellow marker).';
  }
  if (m.id === 'courier') {
    if (m.stage === 0) return 'Pick up the package at the Marlin Docks (cyan marker).';
    return `Deliver to The Coral Hotel — ${Math.max(0, Math.ceil(m.timer))}s left.`;
  }
  if (m.id === 'vault') {
    if (m.stage === 0) return 'Get to the Palmera Bay Bank (orange marker).';
    if (m.stage === 1) return `Hold inside the vault… ${Math.max(0, (TUNING.vaultHoldSeconds - m.hold).toFixed(1))}s`;
    return 'Lose the heat and get back to the garage!';
  }
  return '';
}

export function startMission(world, def) {
  world.mission = { id: def.id, stage: 0, timer: def.timeLimit || 0, hold: 0, tipped: false };
  world.notice = { text: `${def.title} — ${def.brief}`, t: 6 };
  world.events.push({ type: 'mission-start' });
}

export function completeMission(world) {
  const m = world.mission;
  const def = MISSION_DEFS.find((d) => d.id === m.id);
  world.cash += def.reward;
  world.debt = Math.max(0, world.debt - def.reward);
  world.missionsDone.push(def.id);
  world.mission = null;
  world.events.push({ type: 'mission-done' });
  if (world.debt <= 0) {
    world.screen = 'win';
    world.notice = { text: 'Debt cleared!', t: 6 };
  } else {
    world.notice = { text: `Job done: +$${def.reward}. Debt left: $${world.debt.toLocaleString()}.`, t: 5 };
  }
}

export function failMission(world, reason) {
  world.mission = null;
  world.notice = { text: `Job failed: ${reason}`, t: 5 };
  world.events.push({ type: 'mission-fail' });
}

export function updateMissions(world, dt) {
  const m = world.mission;
  if (!m) return;
  const p = world.player;
  const px = p.car ? p.car.x : p.x;
  const py = p.car ? p.car.y : p.y;

  if (m.id === 'wheels') {
    if (m.stage === 0 && p.car) m.stage = 1;
    if (m.stage === 1 && dist(px, py, PLACES.sprayShop.x, PLACES.sprayShop.y) < PLACES.sprayShop.r) {
      completeMission(world);
    }
  } else if (m.id === 'courier') {
    m.timer -= dt;
    if (m.timer <= 0) { failMission(world, 'the package arrived too late.'); return; }
    if (m.stage === 0 && dist(px, py, PLACES.docks.x, PLACES.docks.y) < PLACES.docks.r) {
      m.stage = 1;
      world.notice = { text: 'Package secured. Get it to The Coral Hotel — fast.', t: 4 };
      world.events.push({ type: 'pickup' });
    }
    if (m.stage === 1 && !m.tipped && m.timer < 105) {
      // Halfway through the 150s run (45s in): the rival's tip lands and the heat arrives.
      m.tipped = true;
      addWanted(world, 1, 'A rival tipped off the cops — you\u2019ve got heat!');
    }
    if (m.stage === 1 && dist(px, py, PLACES.hotel.x, PLACES.hotel.y) < PLACES.hotel.r) {
      completeMission(world);
    }
  } else if (m.id === 'vault') {
    if (m.stage === 0 && dist(px, py, PLACES.bank.x, PLACES.bank.y) < PLACES.bank.r) {
      m.stage = 1; m.hold = 0;
      world.notice = { text: 'Inside the bank — hold still in the vault!', t: 4 };
    }
    if (m.stage === 1) {
      if (dist(px, py, PLACES.bank.x, PLACES.bank.y) < PLACES.bank.r) {
        m.hold += dt;
        if (m.hold >= TUNING.vaultHoldSeconds) {
          m.stage = 2;
          world.cash += 800;
          addWanted(world, 3, 'Vault emptied! Three stars — run!');
        }
      } else {
        m.hold = Math.max(0, m.hold - dt * 2);
      }
    }
    if (m.stage === 2 && world.wanted === 0 && dist(px, py, PLACES.hideout.x, PLACES.hideout.y) < PLACES.hideout.r) {
      completeMission(world);
    }
  }
}

// The marker the minimap and the world draw for the current objective.
export function missionMarker(world) {
  const m = world.mission;
  if (!m) {
    const { next } = missionState(world);
    if (!next) return null;
    return { ...PLACES[next.startPlace], label: 'Next job' };
  }
  if (m.id === 'wheels') return m.stage === 0 ? null : { ...PLACES.sprayShop, label: 'Spray Shop' };
  if (m.id === 'courier') return m.stage === 0 ? { ...PLACES.docks, label: 'Pick up' } : { ...PLACES.hotel, label: 'Deliver' };
  if (m.id === 'vault') {
    if (m.stage === 0 || m.stage === 1) return { ...PLACES.bank, label: m.stage === 1 ? 'Hold in the vault' : 'The Bank' };
    return { ...PLACES.hideout, label: 'Lose the heat, get home' };
  }
  return null;
}
