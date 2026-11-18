// Rendering: the city, the actors, the HUD with its minimap, and the
// title / pause / busted overlays. One canvas, one camera, no libraries.

import {
  WORLD_W, WORLD_H, ROADS_V, ROADS_H, ROAD_W, SIDEWALK_W,
  BAY_X, PIER, SPRAY_SHOP, COLORS,
} from './config.js';
import { currentObjective, objectiveTarget } from './missions.js';

const VIEW_W = 1280;
const VIEW_H = 720;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawWorld(ctx, world) {
  const cam = world.camera;
  const ox = VIEW_W / 2 - cam.x;
  const oy = VIEW_H / 2 - cam.y;
  const shakeX = world.shake > 0 ? (Math.random() - 0.5) * world.shake * 14 : 0;
  const shakeY = world.shake > 0 ? (Math.random() - 0.5) * world.shake * 14 : 0;
  ctx.save();
  ctx.translate(ox + shakeX, oy + shakeY);

  // Ground and blocks.
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(cam.x - VIEW_W / 2 - 20, cam.y - VIEW_H / 2 - 20, VIEW_W + 40, VIEW_H + 40);
  ctx.fillStyle = COLORS.block;
  ctx.fillRect(0, 0, BAY_X, WORLD_H);

  // Bay and pier.
  ctx.fillStyle = COLORS.bay;
  ctx.fillRect(BAY_X, 0, WORLD_W - BAY_X, WORLD_H);
  ctx.fillStyle = COLORS.bayDeep;
  ctx.fillRect(BAY_X, 0, 26, WORLD_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  for (let y = 60; y < WORLD_H; y += 170) {
    const wob = Math.sin(world.time * 0.7 + y * 0.01) * 14;
    ctx.beginPath();
    ctx.moveTo(BAY_X + 60 + wob, y);
    ctx.lineTo(BAY_X + 190 + wob, y);
    ctx.stroke();
  }
  ctx.fillStyle = COLORS.pier;
  ctx.fillRect(PIER.x0, PIER.y0, PIER.x1 - PIER.x0, PIER.y1 - PIER.y0);
  ctx.strokeStyle = COLORS.pierPost;
  ctx.lineWidth = 3;
  for (let x = PIER.x0 + 30; x < PIER.x1; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, PIER.y0);
    ctx.lineTo(x, PIER.y1);
    ctx.stroke();
  }
  ctx.fillStyle = '#5d4a28';
  for (let x = PIER.x0 + 12; x < PIER.x1; x += 48) {
    ctx.fillRect(x, PIER.y0 + 6, 5, PIER.y1 - PIER.y0 - 12);
  }

  drawRoads(ctx, world);
  drawBuildings(ctx, world);
  drawMarker(ctx, world);
  drawCars(ctx, world);
  drawPeds(ctx, world);
  drawPlayer(ctx, world);
  drawBullets(ctx, world);
  drawParticles(ctx, world);
  ctx.restore();

  drawHud(ctx, world);
  if (world.screen === 'title') drawTitle(ctx, world);
  if (world.screen === 'paused') drawPaused(ctx);
  if (world.screen === 'busted') drawBusted(ctx, world);
}

function drawRoads(ctx, world) {
  ctx.fillStyle = COLORS.sidewalk;
  for (const rx of ROADS_V) ctx.fillRect(rx - ROAD_W / 2 - SIDEWALK_W, 0, ROAD_W + SIDEWALK_W * 2, WORLD_H);
  for (const ry of ROADS_H) ctx.fillRect(0, ry - ROAD_W / 2 - SIDEWALK_W, BAY_X, ROAD_W + SIDEWALK_W * 2);
  ctx.fillStyle = COLORS.road;
  for (const rx of ROADS_V) ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, WORLD_H);
  for (const ry of ROADS_H) ctx.fillRect(0, ry - ROAD_W / 2, BAY_X, ROAD_W);
  // Centre dashes.
  ctx.fillStyle = COLORS.roadLine;
  for (const rx of ROADS_V) {
    for (let y = 20; y < WORLD_H; y += 64) ctx.fillRect(rx - 3, y, 6, 32);
  }
  for (const ry of ROADS_H) {
    for (let x = 20; x < BAY_X; x += 64) ctx.fillRect(x, ry - 3, 32, 6);
  }
}

function drawBuildings(ctx, world) {
  for (const b of world.city.buildings) {
    ctx.fillStyle = COLORS.buildingWall;
    ctx.fillRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // Windows.
    ctx.fillStyle = 'rgba(255, 236, 170, 0.5)';
    for (let wx = b.x + 12; wx < b.x + b.w - 14; wx += 26) {
      for (let wy = b.y + 12; wy < b.y + b.h - 14; wy += 26) {
        ctx.fillRect(wx, wy, 10, 12);
      }
    }
    if (b.landmark) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.landmark, b.x + b.w / 2, b.y + b.h / 2 + 7);
      ctx.textAlign = 'left';
    }
  }
  // Spray & Go delivery pad.
  ctx.strokeStyle = COLORS.spray;
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.arc(SPRAY_SHOP.x, SPRAY_SHOP.y, SPRAY_SHOP.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SPRAY & GO', SPRAY_SHOP.x, SPRAY_SHOP.y - SPRAY_SHOP.r - 10);
  ctx.textAlign = 'left';
}

function drawMarker(ctx, world) {
  const t = objectiveTarget(world);
  if (!t || world.screen !== 'playing') return;
  const pulse = 1 + Math.sin(world.time * 4) * 0.12;
  ctx.strokeStyle = COLORS.marker;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.r * pulse, 0, Math.PI * 2);
  ctx.stroke();
  const bob = Math.sin(world.time * 4) * 8;
  ctx.fillStyle = COLORS.marker;
  ctx.beginPath();
  ctx.moveTo(t.x, t.y - t.r - 26 + bob);
  ctx.lineTo(t.x - 12, t.y - t.r - 48 + bob);
  ctx.lineTo(t.x + 12, t.y - t.r - 48 + bob);
  ctx.closePath();
  ctx.fill();
  // Off-screen arrow: point at the objective from the screen edge.
  const cam = world.camera;
  const sx = t.x - (cam.x - VIEW_W / 2);
  const sy = t.y - (cam.y - VIEW_H / 2);
  if (sx < 40 || sx > VIEW_W - 40 || sy < 40 || sy > VIEW_H - 40) {
    const cx = Math.max(60, Math.min(VIEW_W - 60, sx));
    const cy = Math.max(60, Math.min(VIEW_H - 60, sy));
    const a = Math.atan2(sy - cy, sx - cx);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.fillStyle = COLORS.marker;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-10, -11);
    ctx.lineTo(-10, 11);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawCarShape(ctx, c, bodyColor) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(ctx, -c.w / 2 + 3, -c.h / 2 + 4, c.w, c.h, 8);
  ctx.fill();
  ctx.fillStyle = bodyColor;
  rr(ctx, -c.w / 2, -c.h / 2, c.w, c.h, 8);
  ctx.fill();
  ctx.fillStyle = '#20242c';
  rr(ctx, -c.w / 2 + 8, -c.h / 2 + 4, 12, c.h - 8, 3);
  ctx.fill();
  rr(ctx, c.w / 2 - 20, -c.h / 2 + 4, 12, c.h - 8, 3);
  ctx.fill();
  ctx.fillStyle = '#cfe8ff';
  ctx.fillRect(-2, -c.h / 2 + 3, 10, 4);
  ctx.fillRect(-2, c.h / 2 - 7, 10, 4);
  ctx.restore();
}

function drawCars(ctx, world) {
  for (const c of world.cars) {
    if (c.kind === 'police') {
      drawCarShape(ctx, c, COLORS.police);
      // Flashing light bar.
      const on = Math.floor(world.time * 5) % 2 === 0;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);
      ctx.fillStyle = on ? '#ff3b30' : '#3b82ff';
      ctx.fillRect(-6, -c.h / 2 - 2, 12, 5);
      ctx.fillStyle = on ? '#3b82ff' : '#ff3b30';
      ctx.fillRect(-6, c.h / 2 - 3, 12, 5);
      ctx.restore();
      if (c.stun > 0) {
        ctx.fillStyle = '#ffd23f';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✦', c.x, c.y - 26);
        ctx.textAlign = 'left';
      }
    } else {
      drawCarShape(ctx, c, c.color);
    }
  }
}

function drawPeds(ctx, world) {
  for (const ped of world.peds) {
    const bob = Math.sin(ped.walkPhase) * 2;
    ctx.save();
    ctx.translate(ped.x, ped.y + bob);
    ctx.rotate(ped.angle);
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#20242c';
    ctx.beginPath();
    ctx.arc(3, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawPlayer(ctx, world) {
  const p = world.player;
  if (p.car) return; // The car drawing already shows the driver.
  const bob = Math.sin(p.walkPhase) * 2;
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.rotate(p.angle);
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#20242c';
  ctx.fillRect(6, -3, 9, 6);
  ctx.fillStyle = '#e8b13c';
  ctx.fillRect(-10, -8, 6, 16);
  ctx.restore();
  // Low-health ring.
  if (p.health <= 30) {
    ctx.strokeStyle = 'rgba(255,59,48,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 18 + Math.sin(world.time * 6) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawBullets(ctx, world) {
  ctx.fillStyle = '#ffe66d';
  for (const b of world.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles(ctx, world) {
  for (const pt of world.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / 0.35);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, world) {
  const p = world.player;
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, VIEW_W, 52);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`PALMERA BAY`, 14, 32);
  ctx.font = '16px sans-serif';
  ctx.fillText(`Cash $${world.cash.toLocaleString()}`, 190, 31);
  ctx.fillStyle = world.debt > 0 ? '#ff9d9d' : '#9dffb0';
  ctx.fillText(`Debt $${world.debt.toLocaleString()}`, 330, 31);
  ctx.fillStyle = COLORS.hudText;
  ctx.fillText(`Ammo ${p.ammo}`, 480, 31);
  // Health bar.
  ctx.fillStyle = '#3a3f4a';
  ctx.fillRect(580, 16, 120, 18);
  ctx.fillStyle = p.health > 50 ? '#58c472' : p.health > 25 ? '#e8b13c' : '#ff3b30';
  ctx.fillRect(580, 16, 120 * (p.health / 100), 18);
  ctx.fillStyle = COLORS.hudText;
  ctx.fillText(`${Math.ceil(p.health)}`, 706, 31);
  // Wanted stars.
  ctx.font = '22px sans-serif';
  ctx.fillStyle = '#ffd23f';
  let stars = '';
  for (let i = 0; i < world.wanted; i++) stars += '★';
  for (let i = world.wanted; i < 3; i++) stars += '☆';
  ctx.fillText(stars, 770, 33);
  // Objective line.
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText(currentObjective(world), 14, 74);
  if (world.toastTimer > 0) {
    ctx.fillStyle = 'rgba(12,14,18,0.8)';
    const tw = ctx.measureText(world.toast).width + 24;
    ctx.fillRect(VIEW_W / 2 - tw / 2, 84, tw, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.toast, VIEW_W / 2, 104);
    ctx.textAlign = 'left';
  }
  drawMinimap(ctx, world);
}

function drawMinimap(ctx, world) {
  const mw = 190;
  const mh = 142;
  const mx = VIEW_W - mw - 14;
  const my = 62;
  const sx = mw / WORLD_W;
  const sy = mh / WORLD_H;
  ctx.fillStyle = 'rgba(12,14,18,0.78)';
  ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.fillStyle = '#31363f';
  ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle = COLORS.bay;
  ctx.fillRect(mx + BAY_X * sx, my, (WORLD_W - BAY_X) * sx, mh);
  ctx.strokeStyle = '#565d68';
  ctx.lineWidth = 2;
  for (const rx of ROADS_V) {
    ctx.beginPath();
    ctx.moveTo(mx + rx * sx, my);
    ctx.lineTo(mx + rx * sx, my + mh);
    ctx.stroke();
  }
  for (const ry of ROADS_H) {
    ctx.beginPath();
    ctx.moveTo(mx, my + ry * sy);
    ctx.lineTo(mx + mw, my + ry * sy);
    ctx.stroke();
  }
  const t = objectiveTarget(world);
  if (t) {
    ctx.fillStyle = COLORS.marker;
    ctx.beginPath();
    ctx.arc(mx + t.x * sx, my + t.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ff3b30';
  for (const c of world.cars) {
    if (c.kind !== 'police') continue;
    ctx.fillRect(mx + c.x * sx - 2, my + c.y * sy - 2, 4, 4);
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(mx + world.player.x * sx, my + world.player.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(10, 12, 16, 0.62)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('PALMERA BAY', VIEW_W / 2, 240);
  ctx.fillStyle = '#f2f2e9';
  ctx.font = '24px sans-serif';
  ctx.fillText('Rico Vega owes Marla Quinn $5,000. Pay it back — one job at a time.', VIEW_W / 2, 292);
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('Press ENTER to play', VIEW_W / 2, 380);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#c9c9bd';
  ctx.fillText('WASD / Arrows — move & drive      E — steal / enter / exit car', VIEW_W / 2, 440);
  ctx.fillText('Mouse click / Space — shoot      P — pause      M — mute      R — restart', VIEW_W / 2, 472);
  ctx.fillText('Steal cars, lose the cops, run the jobs. The debt does not forget.', VIEW_W / 2, 520);
  ctx.textAlign = 'left';
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(10, 12, 16, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f2f2e9';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText('PAUSED', VIEW_W / 2, 340);
  ctx.font = '20px sans-serif';
  ctx.fillText('Press P to keep driving', VIEW_W / 2, 390);
  ctx.textAlign = 'left';
}

function drawBusted(ctx, world) {
  ctx.fillStyle = 'rgba(16, 8, 10, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff3b30';
  ctx.font = 'bold 76px sans-serif';
  ctx.fillText('BUSTED', VIEW_W / 2, 300);
  ctx.fillStyle = '#f2f2e9';
  ctx.font = '22px sans-serif';
  ctx.fillText('The Palmera Bay police finally caught up with Rico.', VIEW_W / 2, 350);
  ctx.fillText(`Debt still owed: $${world.debt.toLocaleString()} — Marla Quinn is not pleased.`, VIEW_W / 2, 386);
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Press R to try again', VIEW_W / 2, 450);
  ctx.textAlign = 'left';
}
