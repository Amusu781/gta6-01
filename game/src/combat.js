// Combat: Rico's pistol and fists, police bullets, and what happens when
// a bullet or a fist finds its target. Shooting in public raises the heat.
import { TUNING } from './config.js';
import { dist, angleTo } from './utils.js';
import { addWanted } from './pedestrians.js';
import { hitsBuilding } from './city.js';

export function fireBullet(world, x, y, angle, from) {
  world.bullets.push({
    x, y,
    vx: Math.cos(angle) * TUNING.bulletSpeed,
    vy: Math.sin(angle) * TUNING.bulletSpeed,
    // Rico's pistol hits harder than a police sidearm; both draw from TUNING.
    from, damage: from === 'player' ? TUNING.pistolDamage : TUNING.copDamage,
    life: 1.4,
  });
  world.gunshotTimer = 1.2;
  world.events.push({ type: 'shot', x, y });
}

export function updateBullets(world, dt) {
  for (const b of world.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (hitsBuilding(world.city, b.x, b.y, 2)) { b.life = 0; world.events.push({ type: 'spark', x: b.x, y: b.y }); continue; }
    if (b.from === 'player') {
      for (const cop of world.cops) {
        if (!cop.dead && dist(b.x, b.y, cop.x, cop.y) < 20) {
          cop.health -= b.damage; b.life = 0;
          world.events.push({ type: 'hit', x: b.x, y: b.y });
          if (cop.health <= 0) { cop.dead = true; cop.fade = 1; addWanted(world, 1, 'You dropped an officer. The whole force is coming.'); }
          break;
        }
      }
      if (b.life <= 0) continue;
      for (const ped of world.peds) {
        if (!ped.dead && dist(b.x, b.y, ped.x, ped.y) < 16) {
          ped.dead = true; ped.fade = 1; b.life = 0;
          addWanted(world, 1, 'You shot a bystander.');
          break;
        }
      }
    } else if (b.from === 'cop') {
      const p = world.player;
      const px = p.car ? p.car.x : p.x;
      const py = p.car ? p.car.y : p.y;
      if (dist(b.x, b.y, px, py) < 20) {
        b.life = 0;
        hurtPlayer(world, b.damage);
      }
    }
  }
  world.bullets = world.bullets.filter((b) => b.life > 0);
}

export function hurtPlayer(world, dmg) {
  const p = world.player;
  if (p.invuln > 0 || world.screen !== 'play') return;
  p.health -= dmg;
  p.lastHurt = world.time;
  world.shake = Math.max(world.shake, 5);
  if (p.health <= 0) {
    p.health = 0;
    world.events.push({ type: 'wasted' });
  }
}

// A punch: short range, in the direction Rico faces, knocks the target back.
export function punch(world) {
  const p = world.player;
  if (p.car || p.punchTimer > 0) return;
  p.punchTimer = 0.35;
  const fx = p.x + Math.cos(p.angle) * 30;
  const fy = p.y + Math.sin(p.angle) * 30;
  let hit = false;
  for (const cop of world.cops) {
    if (!cop.dead && dist(fx, fy, cop.x, cop.y) < TUNING.punchRange) {
      cop.health -= TUNING.punchDamage;
      cop.x += Math.cos(p.angle) * 26; cop.y += Math.sin(p.angle) * 26;
      hit = true;
      if (cop.health <= 0) { cop.dead = true; cop.fade = 1; addWanted(world, 1, 'You dropped an officer. The whole force is coming.'); }
    }
  }
  for (const ped of world.peds) {
    if (!ped.dead && dist(fx, fy, ped.x, ped.y) < TUNING.punchRange) {
      ped.dead = true; ped.fade = 1; hit = true;
      addWanted(world, 1, 'You knocked someone out cold.');
    }
  }
  if (hit) world.events.push({ type: 'punch', x: fx, y: fy });
  return hit;
}
