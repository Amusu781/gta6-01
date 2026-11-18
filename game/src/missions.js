// Missions: three story jobs for Rico Vega, then repeatable taxi fares.
// A job is { index, stage, timer, target, reward, done[] } and the update
// step moves it forward when the player reaches a target. Rewards pay cash
// and cut the $5,000 debt to Marla Quinn.

import {
  STORY_JOBS, SPRAY_SHOP, PIER_DROP, DOCKS_DROP, GARAGE_DROP,
  FARE_MIN, FARE_MAX, ROADS_V, ROADS_H, BAY_X,
} from './config.js';

export function createMissions(rng) {
  return {
    index: 0, // 0..2 story jobs, then fares forever
    stage: 'steal',
    timer: 0,
    target: { x: SPRAY_SHOP.x, y: SPRAY_SHOP.y, r: SPRAY_SHOP.r, label: SPRAY_SHOP.name },
    reward: STORY_JOBS[0].reward,
    done: [],
    fare: null,
    rng,
  };
}

function roadPoint(rng) {
  const x = rng.pick(ROADS_V);
  const y = rng.pick(ROADS_H);
  return { x, y };
}

export function startJob(missions, index) {
  missions.index = index;
  missions.timer = 0;
  missions.fare = null;
  if (index === 0) {
    missions.stage = 'steal';
    missions.target = { x: SPRAY_SHOP.x, y: SPRAY_SHOP.y, r: SPRAY_SHOP.r, label: SPRAY_SHOP.name };
    missions.reward = STORY_JOBS[0].reward;
  } else if (index === 1) {
    missions.stage = 'pickup';
    missions.target = { x: PIER_DROP.x, y: PIER_DROP.y, r: PIER_DROP.r, label: PIER_DROP.name };
    missions.reward = STORY_JOBS[1].reward;
  } else if (index === 2) {
    missions.stage = 'lose';
    missions.target = null;
    missions.reward = STORY_JOBS[2].reward;
  }
}

export function startFare(missions) {
  const rng = missions.rng;
  const from = roadPoint(rng);
  let to = roadPoint(rng);
  while (Math.hypot(to.x - from.x, to.y - from.y) < 800) to = roadPoint(rng);
  missions.index = 3;
  missions.stage = 'fare-pickup';
  missions.fare = { reward: Math.round(rng.range(FARE_MIN, FARE_MAX)) };
  missions.target = { x: from.x, y: from.y, r: 100, label: 'the fare pickup' };
  missions.reward = missions.fare.reward;
  missions.timer = 0;
}

// Called when a job pays out. Returns the cash earned (0 when nothing did).
export function updateMissions(world, dt) {
  const m = world.missions;
  const p = world.player;
  const at = (t) => t && Math.hypot(p.x - t.x, p.y - t.y) < t.r;

  if (m.stage === 'steal') {
    // Done as soon as the player is driving a stolen car.
    if (p.car && p.car.stolen) {
      m.stage = 'deliver';
      return { event: 'stolen', text: 'Nice wheels. Now bring it to Spray & Go.' };
    }
    return null;
  }

  if (m.stage === 'pickup' && at(m.target)) {
    m.stage = 'deliver';
    m.timer = 90;
    m.target = { x: DOCKS_DROP.x, y: DOCKS_DROP.y, r: DOCKS_DROP.r, label: DOCKS_DROP.name };
    return { event: 'pickup', text: 'Package secured. 90 seconds to the north docks!' };
  }

  if (m.stage === 'deliver') {
    if (m.index === 1) {
      m.timer -= dt;
      if (m.timer <= 0) {
        startJob(m, 1);
        return { event: 'failed', text: 'Too slow — Marla wants that package again.' };
      }
    }
    if (at(m.target)) {
      return completeJob(world);
    }
    return null;
  }

  if (m.stage === 'lose') {
    if (world.wanted === 0) {
      m.stage = 'deliver';
      m.target = { x: GARAGE_DROP.x, y: GARAGE_DROP.y, r: GARAGE_DROP.r, label: GARAGE_DROP.name };
      return { event: 'clear', text: 'Heat is off. Get to the garage.' };
    }
    return null;
  }

  if (m.stage === 'fare-pickup' && at(m.target)) {
    const rng = m.rng;
    let to = roadPoint(rng);
    while (Math.hypot(to.x - m.target.x, to.y - m.target.y) < 800) to = roadPoint(rng);
    m.stage = 'fare-drop';
    m.target = { x: to.x, y: to.y, r: 110, label: 'the drop-off' };
    return { event: 'fare', text: 'Passenger aboard. Drive them to the marker.' };
  }

  if (m.stage === 'fare-drop' && at(m.target)) {
    return completeJob(world);
  }

  return null;
}

function completeJob(world) {
  const m = world.missions;
  const reward = m.reward;
  world.cash += reward;
  world.debt = Math.max(0, world.debt - reward);
  world.player.ammo = 24;
  const jobName = m.index < 3 ? STORY_JOBS[m.index].name : 'Fare';
  m.done.push(jobName);
  world.toast = `+ $${reward} — ${jobName} done. Debt: $${world.debt.toLocaleString()}`;
  world.toastTimer = 4;
  if (m.index < 2) {
    startJob(m, m.index + 1);
  } else if (m.index === 2) {
    startFare(m);
  } else {
    startFare(m);
  }
  return { event: 'complete', reward, job: jobName };
}

export function currentObjective(world) {
  const m = world.missions;
  if (m.stage === 'steal') return 'Steal a parked car (walk up, press E)';
  if (m.stage === 'pickup') return `Pick up the package on ${m.target.label}`;
  if (m.stage === 'deliver' && m.index === 0) return 'Deliver the car to Spray & Go';
  if (m.stage === 'deliver' && m.index === 1) return `Deliver to the north docks — ${Math.ceil(m.timer)}s left`;
  if (m.stage === 'lose') return 'Lose the cops (wanted level to 0)';
  if (m.stage === 'deliver' && m.index === 2) return 'Reach the garage';
  if (m.stage === 'fare-pickup') return 'Pick up the fare at the marker';
  if (m.stage === 'fare-drop') return 'Drop the fare at the marker';
  return STORY_JOBS[Math.min(m.index, 2)].brief;
}

// Where the HUD marker points right now, or null.
export function objectiveTarget(world) {
  const m = world.missions;
  if (m.stage === 'steal') {
    // Nearest parked car the player has not stolen yet.
    let best = null;
    let bestD = Infinity;
    for (const c of world.cars) {
      if (c.kind !== 'parked' || c.stolen) continue;
      const d = Math.hypot(world.player.x - c.x, world.player.y - c.y);
      if (d < bestD) {
        bestD = d;
        best = { x: c.x, y: c.y, r: 80, label: 'a car to steal' };
      }
    }
    return best;
  }
  return m.target;
}
