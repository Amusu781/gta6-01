// Everything the player sees: the city from above, the HUD, the minimap
// and the menus. Canvas 2D only, no images — every shape is drawn.
import { WORLD_W, WORLD_H, ROAD_W, COLORS } from './config.js';
import { clamp } from './random.js';

export function cameraFor(W, viewW, viewH) {
  const p = W.player;
  return {
    x: clamp(p.x - viewW / 2, 0, WORLD_W - viewW),
    y: clamp(p.y - viewH / 2, 0, WORLD_H - viewH),
  };
}

export function drawGame(ctx, W, input, viewW, viewH) {
  const cam = cameraFor(W, viewW, viewH);
  W.camera = cam;
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 0, viewW, viewH);
  // Mown-grass checker, purely for orientation while driving.
  ctx.fillStyle = COLORS.grassAlt;
  const tile = 300;
  const x0 = Math.floor(cam.x / tile) * tile;
  const y0 = Math.floor(cam.y / tile) * tile;
  for (let x = x0; x < cam.x + viewW + tile; x += tile) {
    for (let y = y0; y < cam.y + viewH + tile; y += tile) {
      if (((x / tile) + (y / tile)) % 2 === 0) ctx.fillRect(x - cam.x, y - cam.y, tile, tile);
    }
  }
  drawWater(ctx, cam, viewW, viewH);
  drawRoads(ctx, W, cam, viewW, viewH);
  drawLandmarks(ctx, W, cam);
  drawBuildings(ctx, W, cam);
  drawMissionMarker(ctx, W, cam);
  for (const car of W.cars) drawCar(ctx, car, cam, false);
  for (const ped of W.peds) drawPed(ctx, ped, cam);
  drawBullets(ctx, W, cam);
  drawParticles(ctx, W, cam);
  drawPlayer(ctx, W, cam);
  for (const cop of W.police) drawCar(ctx, cop, cam, true);
  drawHud(ctx, W, viewW, viewH);
  drawMinimap(ctx, W, viewW, viewH);
  drawOverlays(ctx, W, viewW, viewH);
}

function drawWater(ctx, cam, viewW, viewH) {
  const x = 3440 - cam.x;
  if (x < viewW) {
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(Math.max(0, x), 0, viewW - Math.max(0, x), viewH);
    // Gentle wave lines.
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    for (let y = 60; y < viewH; y += 90) {
      ctx.beginPath();
      ctx.moveTo(Math.max(0, x) + 10, y);
      ctx.lineTo(viewW - 10, y + 14);
      ctx.stroke();
    }
  }
  // The pier walkway.
  const px = 3300 - cam.x;
  const py = 270 - cam.y;
  if (px < viewW && px + 260 > 0 && py < viewH && py + 60 > 0) {
    ctx.fillStyle = COLORS.pierWood;
    ctx.fillRect(px, py, 260, 60);
    ctx.strokeStyle = '#6a4f33';
    for (let i = 0; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(px + i * 43, py);
      ctx.lineTo(px + i * 43, py + 60);
      ctx.stroke();
    }
  }
}

function drawRoads(ctx, W, cam, viewW, viewH) {
  ctx.fillStyle = COLORS.road;
  for (const rx of W.city.vRoads) {
    ctx.fillRect(rx - ROAD_W / 2 - cam.x, -cam.y, ROAD_W, WORLD_H);
  }
  for (const ry of W.city.hRoads) {
    ctx.fillRect(-cam.x, ry - ROAD_W / 2 - cam.y, WORLD_W, ROAD_W);
  }
  // Sidewalk edges.
  ctx.strokeStyle = COLORS.sidewalk;
  ctx.lineWidth = 6;
  for (const rx of W.city.vRoads) {
    ctx.beginPath();
    ctx.moveTo(rx - ROAD_W / 2 - cam.x, -cam.y);
    ctx.lineTo(rx - ROAD_W / 2 - cam.x, WORLD_H - cam.y);
    ctx.moveTo(rx + ROAD_W / 2 - cam.x, -cam.y);
    ctx.lineTo(rx + ROAD_W / 2 - cam.x, WORLD_H - cam.y);
    ctx.stroke();
  }
  for (const ry of W.city.hRoads) {
    ctx.beginPath();
    ctx.moveTo(-cam.x, ry - ROAD_W / 2 - cam.y);
    ctx.lineTo(WORLD_W - cam.x, ry - ROAD_W / 2 - cam.y);
    ctx.moveTo(-cam.x, ry + ROAD_W / 2 - cam.y);
    ctx.lineTo(WORLD_W - cam.x, ry + ROAD_W / 2 - cam.y);
    ctx.stroke();
  }
  // Dashed centre lines.
  ctx.strokeStyle = COLORS.lane;
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 22]);
  for (const rx of W.city.vRoads) {
    ctx.beginPath();
    ctx.moveTo(rx - cam.x, -cam.y);
    ctx.lineTo(rx - cam.x, WORLD_H - cam.y);
    ctx.stroke();
  }
  for (const ry of W.city.hRoads) {
    ctx.beginPath();
    ctx.moveTo(-cam.x, ry - cam.y);
    ctx.lineTo(WORLD_W - cam.x, ry - cam.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawBuildings(ctx, W, cam) {
  for (const b of W.city.buildings) {
    const x = b.x - cam.x;
    const y = b.y - cam.y;
    if (x + b.w < 0 || y + b.h < 0 || x > 1280 || y > 720) continue;
    ctx.fillStyle = COLORS.buildingEdge;
    ctx.fillRect(x - 3, y - 3, b.w + 6, b.h + 6);
    ctx.fillStyle = b.color;
    ctx.fillRect(x, y, b.w, b.h);
    // Roof details: a lighter inner slab and a skylight.
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(x + 8, y + 8, b.w - 16, 14);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x + b.w / 2 - 12, y + b.h / 2 - 9, 24, 18);
    if (b.landmark) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.landmark, x + b.w / 2, y + b.h + 16);
    }
  }
}

function drawLandmarks(ctx, W, cam) {
  // Pulsing rings on the garage pad and the spray shop, so a new player
  // can find the story without reading anything.
  const t = W.time * 2;
  const pulse = 0.5 + 0.5 * Math.sin(t);
  for (const spot of [W.garageSpot, W.spraySpot]) {
    if (!spot) continue;
    ctx.strokeStyle = `rgba(255, 211, 77, ${0.35 + pulse * 0.4})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(spot.x - cam.x, spot.y - cam.y, 46 + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawMissionMarker(ctx, W, cam) {
  const m = W.mission;
  if (!m || !m.target) return;
  const t = m.target;
  const bob = Math.sin(W.time * 4) * 6;
  const x = t.x - cam.x;
  const y = t.y - cam.y - 26 + bob;
  ctx.fillStyle = '#ffd34d';
  ctx.strokeStyle = '#7a5b00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + 18);
  ctx.lineTo(x - 13, y - 6);
  ctx.lineTo(x - 13, y - 22);
  ctx.lineTo(x + 13, y - 22);
  ctx.lineTo(x + 13, y - 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7a5b00';
  ctx.beginPath();
  ctx.arc(x, y - 14, 4, 0, Math.PI * 2);
  ctx.fill();
  // A line from the player toward the marker when it is off screen.
  const sx = t.x - W.player.x;
  const sy = t.y - W.player.y;
  const d = Math.hypot(sx, sy);
  if (d > 520) {
    const a = Math.atan2(sy, sx);
    const ex = 640 + Math.cos(a) * 300;
    const ey = 360 + Math.sin(a) * 200;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(a);
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-10, -10);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(d)}m`, ex, ey + 26);
  }
}

function drawCar(ctx, car, cam, isCop) {
  const x = car.x - cam.x;
  const y = car.y - cam.y;
  if (x < -80 || y < -80 || x > 1360 || y > 800) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-24, -12, 48, 24);
  ctx.fillStyle = car.color;
  ctx.fillRect(-23, -11, 46, 22);
  ctx.fillStyle = isCop ? COLORS.copTrim : 'rgba(255,255,255,0.28)';
  ctx.fillRect(-6, -11, 12, 22);
  ctx.fillStyle = '#1b1e22';
  ctx.fillRect(6, -8, 12, 7);
  ctx.fillRect(6, 1, 12, 7);
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(21, -9, 3, 6);
  ctx.fillRect(21, 3, 3, 6);
  if (isCop) {
    ctx.fillStyle = '#ff5340';
    ctx.beginPath();
    ctx.arc(-4, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (car.kind === 'police' && car.health < 3) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - 20, y - 34, 40, 6);
    ctx.fillStyle = '#ff5340';
    ctx.fillRect(x - 20, y - 34, 40 * (car.health / 3), 6);
  }
}

function drawPed(ctx, ped, cam) {
  const x = ped.x - cam.x;
  const y = ped.y - cam.y;
  if (x < -20 || y < -20 || x > 1300 || y > 740) return;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ped.color;
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2c2f34';
  ctx.beginPath();
  ctx.arc(x + Math.cos(ped.angle) * 4, y + Math.sin(ped.angle) * 4, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(ctx, W, cam) {
  const p = W.player;
  if (p.car) return; // The car drawing already shows the driver.
  const x = p.x - cam.x;
  const y = p.y - cam.y;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + 10, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.angle);
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.playerDark;
  ctx.fillRect(8, -4, 10, 8);
  ctx.restore();
  // Faint aim line toward the mouse when on foot.
  if (W.state === 'playing') {
    const wx = W.aimX;
    const wy = W.aimY;
    if (wx !== undefined) {
      ctx.strokeStyle = 'rgba(255,224,102,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(wx - cam.x, wy - cam.y);
      ctx.stroke();
    }
  }
}

function drawBullets(ctx, W, cam) {
  ctx.fillStyle = COLORS.bullet;
  for (const b of W.bullets) {
    ctx.beginPath();
    ctx.arc(b.x - cam.x, b.y - cam.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles(ctx, W, cam) {
  for (const pt of W.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - cam.x - pt.size / 2, pt.y - cam.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = COLORS.hudBg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
}

function drawHud(ctx, W, viewW) {
  const p = W.player;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  panel(ctx, 12, 12, 250, 74);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`$${W.cash}`, 24, 22);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = W.debt > 0 ? '#ffb3a6' : '#9fe08a';
  ctx.fillText(W.debt > 0 ? `Debt: $${W.debt}` : 'DEBT CLEAR', 24, 48);
  ctx.fillStyle = COLORS.hudText;
  ctx.fillText(`♥ ${Math.max(0, Math.ceil(p.health))}   ◈ ${p.ammo}`, 150, 48);
  // Wanted stars.
  panel(ctx, 12, 94, 150, 34);
  ctx.font = 'bold 20px sans-serif';
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < W.wanted ? COLORS.danger : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', 24 + i * 30, 100);
  }
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '12px sans-serif';
  ctx.fillText(W.wanted > 0 ? 'WANTED' : 'CLEAN', 118, 106);
  // Objective.
  const obj = W.objectiveText || '';
  if (obj) {
    ctx.font = '14px sans-serif';
    const w = Math.min(560, ctx.measureText(obj).width + 24);
    panel(ctx, (viewW - w) / 2, 12, w, 30);
    ctx.fillStyle = COLORS.hudAccent;
    ctx.textAlign = 'center';
    ctx.fillText(obj, viewW / 2, 20);
    ctx.textAlign = 'left';
  }
  // Message banner.
  if (W.message && W.messageTimer > 0) {
    ctx.font = 'bold 15px sans-serif';
    const w = Math.min(620, ctx.measureText(W.message).width + 28);
    panel(ctx, (viewW - w) / 2, 52, w, 30);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(W.message, viewW / 2, 60);
    ctx.textAlign = 'left';
  }
  // Mute hint.
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '12px sans-serif';
  ctx.fillText(W.audio.muted ? 'M — sound off' : 'M — mute · P — pause · R — restart', 12, viewW * 0 + 700 - 20);
}

function drawMinimap(ctx, W, viewW) {
  const mw = 200;
  const mh = 150;
  const x0 = viewW - mw - 12;
  const y0 = 12;
  panel(ctx, x0, y0, mw, mh);
  const sx = mw / WORLD_W;
  const sy = mh / WORLD_H;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, mw, mh);
  ctx.clip();
  ctx.fillStyle = '#3d5a34';
  ctx.fillRect(x0, y0, mw, mh);
  ctx.fillStyle = '#55595f';
  for (const rx of W.city.vRoads) ctx.fillRect(x0 + rx * sx - 2, y0, 4, mh);
  for (const ry of W.city.hRoads) ctx.fillRect(x0, y0 + ry * sy, mw, 4);
  ctx.fillStyle = '#3f7fb8';
  ctx.fillRect(x0 + 3440 * sx, y0, mw - 3440 * sx, mh);
  const m = W.mission;
  if (m && m.target) {
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.arc(x0 + m.target.x * sx, y0 + m.target.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const cop of W.police) {
    ctx.fillStyle = '#ff5340';
    ctx.beginPath();
    ctx.arc(x0 + cop.x * sx, y0 + cop.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const p = W.player;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x0 + p.x * sx, y0 + p.y * sy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ff5a3c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x0 + p.x * sx, y0 + p.y * sy, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawOverlays(ctx, W, viewW, viewH) {
  if (W.state === 'title') {
    ctx.fillStyle = 'rgba(8, 12, 18, 0.72)';
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText('PALMERA BAY', viewW / 2, 150);
    ctx.fillStyle = '#f5f2e8';
    ctx.font = '20px sans-serif';
    ctx.fillText('Rico Vega owes $5,000 to Marla Quinn. Work it off — one job at a time.', viewW / 2, 230);
    ctx.font = '17px sans-serif';
    ctx.fillStyle = '#c9d2dc';
    ctx.fillText('WASD drive & walk · E interact / steal a car · Mouse / Space shoot · P pause · M mute', viewW / 2, 290);
    ctx.fillText('Steal cars, dodge the law, run Marla’s jobs, and clear the debt.', viewW / 2, 320);
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(W.hasSave ? 'ENTER — Continue (save found)     R — New game' : 'ENTER — Start', viewW / 2, 400);
    ctx.fillStyle = '#9fb2c8';
    ctx.font = '14px sans-serif';
    ctx.fillText('An original game. No part of it comes from any other crime game.', viewW / 2, 470);
    ctx.textAlign = 'left';
  } else if (W.state === 'paused') {
    ctx.fillStyle = 'rgba(8, 12, 18, 0.6)';
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f5f2e8';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('PAUSED', viewW / 2, 320);
    ctx.font = '18px sans-serif';
    ctx.fillText('P — resume · R — restart', viewW / 2, 370);
    ctx.textAlign = 'left';
  } else if (W.state === 'busted') {
    ctx.fillStyle = 'rgba(20, 4, 4, 0.72)';
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5340';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText('BUSTED', viewW / 2, 300);
    ctx.fillStyle = '#f5f2e8';
    ctx.font = '20px sans-serif';
    ctx.fillText('The Palmera Bay PD caught up with Rico. $100 lighter, back at the garage.', viewW / 2, 360);
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#ffd34d';
    ctx.fillText('ENTER — Get back out there', viewW / 2, 430);
    ctx.textAlign = 'left';
  }
}
