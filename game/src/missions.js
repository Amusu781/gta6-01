// The story: Rico works off a $5,000 debt to Marla Quinn, one job at a
// time. Three story jobs, then repeatable fares. A mission is a small
// state machine: take it at the garage, follow the marker, get paid.
import { GARAGE, SPRAY_SHOP, PIER, CREW_SPOT, INTERACT_RANGE } from './config.js';
import { dist } from './random.js';
import { raiseWanted } from './actors.js';

export const STORY = [
  {
    id: 'wheels',
    title: 'Wheels',
    brief: "Marla needs a clean car. Steal any parked car and bring it to Spray & Go.",
    reward: 500,
  },
  {
    id: 'courier',
    title: 'Courier Run',
    brief: 'A package for the Old Pier. Take it there in 90 seconds — Marla hates late.',
    reward: 700,
    timeLimit: 90,
  },
  {
    id: 'getaway',
    title: 'Getaway',
    brief: 'Pick up the crew at the corner, then lose the heat. Come back clean.',
    reward: 900,
  },
];

function fareTarget(W) {
  // A random road point far from the player, so the fare is a real drive.
  for (let tries = 0; tries < 20; tries++) {
    const x = W.rng.range(300, 3300);
    const y = W.rng.range(300, 2400);
    if (dist(x, y, W.player.x, W.player.y) > 900) return { x, y, label: 'Fare drop-off' };
  }
  return { x: 2100, y: 900, label: 'Fare drop-off' };
}

export function nextMissionDef(W) {
  for (const def of STORY) {
    if (!W.missionsDone.includes(def.id)) return { ...def, story: true };
  }
  return { id: `fare-${W.missionsDone.length}`, title: 'Fare', brief: 'Drive a passenger to the marker. Quick and quiet.', reward: 300 + W.rng.int(0, 3) * 100, story: false };
}

export function takeMission(W) {
  if (W.mission) return false;
  if (dist(W.player.x, W.player.y, GARAGE.x, GARAGE.y) > INTERACT_RANGE + 40) return false;
  const def = nextMissionDef(W);
  const m = {
    id: def.id, title: def.title, reward: def.reward, story: def.story,
    stage: 'go', target: null, timer: def.timeLimit || 0, timeLimit: def.timeLimit || 0,
  };
  if (def.id === 'wheels') {
    m.stage = 'steal';
    m.target = { x: GARAGE.x, y: GARAGE.y, label: 'Steal a parked car' };
  } else if (def.id === 'courier') {
    m.stage = 'pickup';
    m.target = { x: GARAGE.x, y: GARAGE.y, label: 'Pick up the package' };
  } else if (def.id === 'getaway') {
    m.stage = 'pickup';
    m.target = { x: CREW_SPOT.x, y: CREW_SPOT.y, label: 'Pick up the crew' };
  } else {
    m.stage = 'deliver';
    m.target = fareTarget(W);
  }
  W.mission = m;
  W.message = `${def.title}: ${def.brief}`;
  W.messageTimer = 4;
  W.audio.pickup();
  return true;
}

function completeMission(W) {
  const m = W.mission;
  W.cash += m.reward;
  W.debt = Math.max(0, W.debt - m.reward);
  W.missionsDone.push(m.id);
  W.mission = null;
  W.message = `${m.title} done — $${m.reward}. Debt down to $${W.debt}.`;
  W.messageTimer = 4;
  W.audio.paid();
  W.saveGame();
}

function failMission(W, why) {
  W.mission = null;
  W.message = why;
  W.messageTimer = 3.5;
}

export function updateMission(W, dt) {
  const m = W.mission;
  if (!m) return;
  const p = W.player;
  if (m.timeLimit > 0) {
    m.timer -= dt;
    if (m.timer <= 0) {
      failMission(W, `${m.title} failed — too slow. Marla is not pleased.`);
      return;
    }
  }
  if (m.id === 'wheels') {
    if (m.stage === 'steal' && p.car) {
      m.stage = 'deliver';
      m.target = { x: SPRAY_SHOP.x, y: SPRAY_SHOP.y, label: 'Deliver to Spray & Go' };
      W.message = 'Nice wheels. Now get it to Spray & Go.';
      W.messageTimer = 3;
    } else if (m.stage === 'deliver' && p.car && dist(p.x, p.y, SPRAY_SHOP.x, SPRAY_SHOP.y) < 140) {
      completeMission(W);
    }
  } else if (m.id === 'courier') {
    if (m.stage === 'pickup' && dist(p.x, p.y, GARAGE.x, GARAGE.y) < INTERACT_RANGE) {
      m.stage = 'deliver';
      m.target = { x: PIER.x, y: PIER.y, label: 'Deliver to the Old Pier' };
      W.message = 'Package in hand. Ninety seconds. Go.';
      W.messageTimer = 3;
    } else if (m.stage === 'deliver' && dist(p.x, p.y, PIER.x, PIER.y) < 130) {
      completeMission(W);
    }
  } else if (m.id === 'getaway') {
    if (m.stage === 'pickup' && dist(p.x, p.y, CREW_SPOT.x, CREW_SPOT.y) < 130) {
      m.stage = 'lose';
      m.target = null;
      raiseWanted(W, 1);
      W.message = 'Crew aboard — now lose the heat!';
      W.messageTimer = 3;
    } else if (m.stage === 'lose' && W.wanted === 0) {
      completeMission(W);
    }
  } else if (m.stage === 'deliver' && dist(p.x, p.y, m.target.x, m.target.y) < 130) {
    completeMission(W);
  }
}

export function missionObjective(W) {
  const m = W.mission;
  if (!m) {
    const next = nextMissionDef(W);
    return `No job — visit ${GARAGE.label} for "${next.title}" ($${next.reward})`;
  }
  const timer = m.timeLimit > 0 ? ` — ${Math.ceil(m.timer)}s left` : '';
  const where = m.target ? ` → ${m.target.label}` : '';
  return `${m.title}: ${m.stage === 'steal' ? 'steal a parked car' : m.stage === 'pickup' ? 'pick it up' : m.stage === 'lose' ? 'lose the cops' : 'deliver it'}${where}${timer}`;
}
