// Everything the player sees: the city from above, Rico and the traffic, the police
// lights, the HUD with its minimap and wanted stars, and the menu screens.
import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, AVENUES, STREETS, ROAD_W, BEACH_Y, PALETTE, PLACES, TUNING } from './config.js';
import { clamp, clamp01, dist } from './utils.js';
import { objectiveText, missionMarker, missionState } from './missions.js';

const MINIMAP_W = 210;
const MINIMAP_H = 152;

export function updateCamera(world) {
  const p = world.player;
  const tx = clamp(p.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
  const ty = clamp(p.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);
  world.camera.x += (tx - world.camera.x) * 0.12;
  world.camera.y += (ty - world.camera.y) * 0.12;
  world.shake = Math.max(0, world.shake - 0.6);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawGround(ctx, world) {
  const cam = world.camera;
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Mown stripes on the grass, for texture.
  ctx.fillStyle = PALETTE.grassDark;
  const stripe = 120;
  const startY = Math.floor(cam.y / stripe) * stripe;
  for (let y = startY; y < cam.y + VIEW_H; y += stripe * 2) {
    ctx.fillRect(0, y - cam.y, VIEW_W, stripe);
  }
  // Flamingo Park.
  ctx.fillStyle = PALETTE.park;
  ctx.fillRect(PLACES.park.x - 250 - cam.x, PLACES.park.y - 200 - cam.y, 500, 400);
  ctx.fillStyle = '#5da8d9';
  ctx.beginPath(); ctx.ellipse(PLACES.park.x + 90 - cam.x, PLACES.park.y + 60 - cam.y, 70, 44, 0, 0, Math.PI * 2); ctx.fill();
  // Beach and the bay.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, BEACH_Y - cam.y, VIEW_W, WORLD_H - BEACH_Y);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(0, BEACH_Y + 90 - cam.y, VIEW_W, WORLD_H - BEACH_Y);
  ctx.fillStyle = PALETTE.waterDeep;
  for (let x = 0; x < VIEW_W; x += 90) {
    const wy = BEACH_Y + 110 - cam.y + Math.sin((x + cam.x) * 0.01 + world.time * 1.5) * 6;
    ctx.fillRect(x, wy, 46, 3);
  }
}

function drawRoads(ctx, world) {
  const cam = world.camera;
  ctx.fillStyle = PALETTE.sidewalk;
  for (const a of AVENUES) ctx.fillRect(a - ROAD_W / 2 - 14 - cam.x, -cam.y, ROAD_W + 28, WORLD_H);
  for (const s of STREETS) ctx.fillRect(-cam.x, s - ROAD_W / 2 - 14 - cam.y, WORLD_W, ROAD_W + 28);
  ctx.fillStyle = PALETTE.road;
  for (const a of AVENUES) ctx.fillRect(a - ROAD_W / 2 - cam.x, -cam.y, ROAD_W, BEACH_Y + 92);
  for (const s of STREETS) ctx.fillRect(-cam.x, s - ROAD_W / 2 - cam.y, WORLD_W, ROAD_W);
  // Centre dashes.
  ctx.fillStyle = PALETTE.dash;
  for (const a of AVENUES) {
    for (let y = Math.floor(cam.y / 48) * 48; y < cam.y + VIEW_H && y < BEACH_Y; y += 48) {
      ctx.fillRect(a - 2 - cam.x, y - cam.y, 4, 24);
    }
  }
  for (const s of STREETS) {
    for (let x = Math.floor(cam.x / 48) * 48; x < cam.x + VIEW_W; x += 48) {
      ctx.fillRect(x - cam.x, s - 2 - cam.y, 24, 4);
    }
  }
}

function drawBuildings(ctx, world) {
  const cam = world.camera;
  for (const b of world.city.buildings) {
    const x = b.x - cam.x; const y = b.y - cam.y;
    if (x > VIEW_W + 40 || y > VIEW_H + 40 || x + b.w < -40 || y + b.h < -40) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 6, y + 8, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(x, y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x + 6, y + 6, b.w - 12, b.h - 12);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    const cols = Math.max(2, Math.floor(b.w / 42));
    const rows = Math.max(2, Math.floor(b.h / 38));
    for (let c = 0; c < cols; c += 1) {
      for (let r = 0; r < rows; r += 1) {
        ctx.fillRect(x + 12 + c * ((b.w - 24) / cols), y + 12 + r * ((b.h - 24) / rows), 14, 10);
      }
    }
  }
  // Named places get a labelled pad so the city reads at a glance.
  for (const [key, place] of Object.entries(PLACES)) {
    if (key === 'park') continue;
    const x = place.x - cam.x; const y = place.y - cam.y;
    if (x < -160 || y < -160 || x > VIEW_W + 160 || y > VIEW_H + 160) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.arc(x, y, place.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = place.color;
    ctx.beginPath(); ctx.arc(x, y, place.r - 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(place.name, x, y + 4);
  }
}

function drawPalms(ctx, world) {
  const cam = world.camera;
  const palm = (x, y, s) => {
    const sx = x - cam.x; const sy = y - cam.y;
    if (sx < -40 || sy < -40 || sx > VIEW_W + 40 || sy > VIEW_H + 40) return;
    ctx.strokeStyle = '#8a6b42'; ctx.lineWidth = 4 * s;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 4 * s, sy - 14 * s); ctx.stroke();
    ctx.fillStyle = '#3f8f3a';
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.ellipse(sx + 4 * s + Math.cos(a) * 12 * s, sy - 16 * s + Math.sin(a) * 8 * s, 12 * s, 5 * s, a, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  for (const t of world.city.palms) palm(t.x, t.y, t.s);
  for (const t of world.city.parkTrees) palm(t.x, t.y, t.s);
}

function drawCar(ctx, world, car) {
  const cam = world.camera;
  const x = car.x - cam.x; const y = car.y - cam.y;
  if (x < -60 || y < -60 || x > VIEW_W + 60 || y > VIEW_H + 60) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-22, -9, 46, 24);
  ctx.fillStyle = car.color;
  roundRect(ctx, -24, -11, 48, 22, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(4, -9, 10, 18); // windshield
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-8, -9, 10, 18); // roof
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(21, -9, 3, 4); ctx.fillRect(21, 5, 3, 4); // headlights
  ctx.fillStyle = '#ff3b30';
  ctx.fillRect(-24, -9, 3, 4); ctx.fillRect(-24, 5, 3, 4); // tail lights
  if (car.kind === 'police') {
    const on = Math.floor(world.time * 6) % 2 === 0;
    ctx.fillStyle = on ? '#ff2d2d' : '#2d6bff';
    ctx.fillRect(-4, -11, 8, 4);
    ctx.fillStyle = on ? '#2d6bff' : '#ff2d2d';
    ctx.fillRect(-4, 7, 8, 4);
  }
  ctx.restore();
  if (car === world.player.car) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawPed(ctx, world, ped) {
  const cam = world.camera;
  const x = ped.x - cam.x; const y = ped.y - cam.y;
  if (x < -30 || y < -30 || x > VIEW_W + 30 || y > VIEW_H + 30) return;
  ctx.globalAlpha = ped.dead ? Math.max(0, ped.fade) : 1;
  const bob = ped.dead ? 0 : Math.sin(ped.bob) * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(x, y + 8, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  if (ped.dead) {
    ctx.fillStyle = ped.shirt;
    ctx.beginPath(); ctx.ellipse(x, y + 4, 12, 7, 0.5, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = ped.shirt;
    ctx.beginPath(); ctx.arc(x, y + bob * 0.4, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ped.skin;
    ctx.beginPath(); ctx.arc(x + Math.cos(ped.angle) * 3, y - 10 + bob * 0.4, 6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCop(ctx, world, cop) {
  const cam = world.camera;
  const x = cop.x - cam.x; const y = cop.y - cam.y;
  if (x < -30 || y < -30 || x > VIEW_W + 30 || y > VIEW_H + 30) return;
  ctx.globalAlpha = cop.dead ? Math.max(0, cop.fade) : 1;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(x, y + 8, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1c2733';
  ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath(); ctx.arc(x + Math.cos(cop.angle) * 3, y - 10, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1c2733';
  ctx.beginPath(); ctx.arc(x + Math.cos(cop.angle) * 3, y - 11, 6.5, Math.PI, Math.PI * 2); ctx.fill(); // cap
  ctx.globalAlpha = 1;
}

function drawPlayer(ctx, world) {
  const p = world.player;
  if (p.car) return;
  const cam = world.camera;
  const x = p.x - cam.x; const y = p.y - cam.y;
  const bob = p.moving ? Math.sin(p.walkBob) * 2 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y + 9, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0e7a6d'; // Rico's teal jacket
  ctx.beginPath(); ctx.arc(x, y + bob * 0.4, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a2118'; // dark hair
  ctx.beginPath(); ctx.arc(x + Math.cos(p.angle) * 3, y - 11 + bob * 0.4, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath(); ctx.arc(x + Math.cos(p.angle) * 5, y - 9 + bob * 0.4, 5, 0, Math.PI * 2); ctx.fill();
  // Pistol in hand when aiming.
  ctx.strokeStyle = '#22242a'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(p.angle) * 10, y + Math.sin(p.angle) * 10);
  ctx.lineTo(x + Math.cos(p.angle) * 20, y + Math.sin(p.angle) * 20);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.stroke();
}

function drawBulletsAndParticles(ctx, world) {
  const cam = world.camera;
  ctx.fillStyle = '#ffe94d';
  for (const b of world.bullets) {
    ctx.fillRect(b.x - cam.x - 2, b.y - cam.y - 2, 5, 5);
  }
  for (const pt of world.particles) {
    ctx.globalAlpha = clamp01(pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x - cam.x, pt.y - cam.y, pt.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawMarker(ctx, world) {
  const marker = missionMarker(world);
  if (!marker) return;
  const cam = world.camera;
  const x = marker.x - cam.x; const y = marker.y - cam.y;
  const pulse = 1 + Math.sin(world.time * 4) * 0.12;
  ctx.strokeStyle = marker.color;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(x, y, marker.r * pulse, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = marker.color + '22';
  ctx.beginPath(); ctx.arc(x, y, marker.r * pulse, 0, Math.PI * 2); ctx.fill();
  // A beam so the marker is visible from across the city.
  ctx.fillStyle = marker.color + '44';
  ctx.fillRect(x - 5, y - 260, 10, 260);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(marker.label, x, y - marker.r - 12);
  // Off-screen direction arrow at the screen edge.
  if (x < 0 || x > VIEW_W || y < 0 || y > VIEW_H) {
    const cx = clamp(x, 60, VIEW_W - 60); const cy = clamp(y, 60, VIEW_H - 60);
    const a = Math.atan2(y - VIEW_H / 2, x - VIEW_W / 2);
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(a);
    ctx.fillStyle = marker.color;
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -12); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

function drawMinimap(ctx, world) {
  const x0 = VIEW_W - MINIMAP_W - 14; const y0 = 64;
  const sx = MINIMAP_W / WORLD_W; const sy = MINIMAP_H / WORLD_H;
  ctx.fillStyle = 'rgba(10,14,20,0.78)';
  ctx.fillRect(x0 - 4, y0 - 4, MINIMAP_W + 8, MINIMAP_H + 8);
  ctx.fillStyle = '#5d7a4a';
  ctx.fillRect(x0, y0, MINIMAP_W, MINIMAP_H);
  ctx.fillStyle = '#2aa7c9';
  ctx.fillRect(x0, y0 + BEACH_Y * sy, MINIMAP_W, MINIMAP_H - BEACH_Y * sy);
  ctx.fillStyle = '#4b4b55';
  for (const a of AVENUES) ctx.fillRect(x0 + a * sx - 1, y0, 2, MINIMAP_H);
  for (const s of STREETS) ctx.fillRect(x0, y0 + s * sy - 1, MINIMAP_W, 2);
  const marker = missionMarker(world);
  if (marker) {
    ctx.fillStyle = marker.color;
    ctx.beginPath(); ctx.arc(x0 + marker.x * sx, y0 + marker.y * sy, 5 + Math.sin(world.time * 4) * 1.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#3aa655';
  ctx.fillRect(x0 + PLACES.hideout.x * sx - 2, y0 + PLACES.hideout.y * sy - 2, 4, 4);
  for (const car of world.cars) {
    if (car.kind !== 'police') continue;
    ctx.fillStyle = '#ff2d2d';
    ctx.beginPath(); ctx.arc(x0 + car.x * sx, y0 + car.y * sy, 3, 0, Math.PI * 2); ctx.fill();
  }
  for (const cop of world.cops) {
    if (cop.dead) continue;
    ctx.fillStyle = '#ff2d2d';
    ctx.fillRect(x0 + cop.x * sx - 2, y0 + cop.y * sy - 2, 4, 4);
  }
  // Rico, always centred in the player's attention.
  const px = x0 + world.player.x * sx; const py = y0 + world.player.y * sy;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0e7a6d';
  ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1;
  ctx.strokeRect(x0 - 4, y0 - 4, MINIMAP_W + 8, MINIMAP_H + 8);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PALMERA BAY', x0, y0 + MINIMAP_H + 16);
}

function drawHUD(ctx, world, input) {
  const p = world.player;
  // Cash and debt, top left.
  ctx.fillStyle = 'rgba(10,14,20,0.72)';
  ctx.fillRect(12, 12, 250, 62);
  ctx.fillStyle = '#7dff9a';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`$${Math.round(world.cash).toLocaleString()}`, 24, 40);
  ctx.fillStyle = world.debt > 0 ? '#ffb84d' : '#7dff9a';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(world.debt > 0 ? `Debt to Marla: $${Math.round(world.debt).toLocaleString()}` : 'DEBT CLEARED', 24, 62);
  // Wanted stars, top right.
  ctx.fillStyle = 'rgba(10,14,20,0.72)';
  ctx.fillRect(VIEW_W - 262, 12, 250, 40);
  ctx.font = '28px system-ui, sans-serif';
  ctx.textAlign = 'right';
  let stars = '';
  for (let i = 0; i < 5; i += 1) stars += i < world.wanted ? '★' : '☆';
  ctx.fillStyle = world.wanted > 0 ? '#ffd23e' : 'rgba(255,255,255,0.55)';
  ctx.fillText(stars, VIEW_W - 24, 42);
  drawMinimap(ctx, world);
  // Objective banner, top centre.
  const obj = objectiveText(world);
  ctx.font = 'bold 15px system-ui, sans-serif';
  const ow = ctx.measureText(obj).width + 28;
  ctx.fillStyle = 'rgba(10,14,20,0.72)';
  ctx.fillRect((VIEW_W - ow) / 2, 12, ow, 34);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(obj, VIEW_W / 2, 34);
  // Health and ammo, bottom left.
  ctx.fillStyle = 'rgba(10,14,20,0.72)';
  ctx.fillRect(12, VIEW_H - 58, 250, 46);
  ctx.fillStyle = '#ff5a4d';
  ctx.fillRect(24, VIEW_H - 44, 150 * (p.health / 100), 12);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
  ctx.strokeRect(24, VIEW_H - 44, 150, 12);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`HP ${Math.ceil(p.health)}`, 182, VIEW_H - 33);
  ctx.fillText(p.reloadTimer > 0 ? 'Reloading…' : `Ammo ${p.ammo}/24`, 24, VIEW_H - 18);
  // Speed, bottom right, when driving.
  if (p.car) {
    const mph = Math.round(Math.abs(p.car.speed) * 0.16);
    ctx.fillStyle = 'rgba(10,14,20,0.72)';
    ctx.fillRect(VIEW_W - 132, VIEW_H - 58, 120, 46);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${mph}`, VIEW_W - 72, VIEW_H - 28);
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(p.car.model, VIEW_W - 72, VIEW_H - 16);
  }
  // Notice line, above the bottom bar.
  if (world.notice && world.notice.t > 0) {
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = '#ffe9a8';
    ctx.textAlign = 'center';
    ctx.fillText(world.notice.text, VIEW_W / 2, VIEW_H - 74);
  }
  // Controls hint, bottom centre.
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.textAlign = 'center';
  ctx.fillText(p.car ? 'W/S drive · A/D steer · Space handbrake · E get out · P pause · M mute'
    : 'WASD move · Shift run · E enter car / take job · Click shoot · F punch · R reload · P pause', VIEW_W / 2, VIEW_H - 8);
  // Crosshair.
  if (!p.car) {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    const mx = input.mouseX; const my = input.mouseY;
    ctx.beginPath(); ctx.arc(mx, my, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mx - 13, my); ctx.lineTo(mx - 5, my);
    ctx.moveTo(mx + 5, my); ctx.lineTo(mx + 13, my);
    ctx.moveTo(mx, my - 13); ctx.lineTo(mx, my - 5);
    ctx.moveTo(mx, my + 5); ctx.lineTo(mx, my + 13);
    ctx.stroke();
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8,12,20,0.86)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#e8b62a'; ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

export function drawTitle(ctx, world, hasSave) {
  drawWorld(ctx, world);
  ctx.fillStyle = 'rgba(8,12,24,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.fillText('PALMERA BAY', VIEW_W / 2, 190);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('An open-world crime story', VIEW_W / 2, 232);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = '#d8e6ff';
  ctx.fillText('Rico Vega owes the fixer Marla Quinn $5,000. Three jobs. One city. No way out but through.', VIEW_W / 2, 268);
  ctx.fillText('Steal cars. Outrun the law. Pay the debt — or die trying.', VIEW_W / 2, 292);
  panel(ctx, VIEW_W / 2 - 330, 330, 660, hasSave ? 210 : 176);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('WASD move · Shift run · E enter car / take job · Click shoot · F punch · R reload', VIEW_W / 2, 366);
  ctx.fillText('In a car: W/S drive · A/D steer · Space handbrake · E get out', VIEW_W / 2, 392);
  ctx.fillText('P pause · M mute · progress saves automatically', VIEW_W / 2, 418);
  ctx.fillStyle = '#7dff9a';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(hasSave ? 'ENTER — Continue your story' : 'ENTER — New game', VIEW_W / 2, 462);
  if (hasSave) ctx.fillText('N — New game (erases the save)', VIEW_W / 2, 494);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('An original game. Palmera Bay, Rico Vega and Marla Quinn are fictional.', VIEW_W / 2, 590);
  ctx.fillText('Made for make.fun\u2019s Make GTA 6 bounty.', VIEW_W / 2, 612);
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(8,12,24,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px system-ui, sans-serif';
  ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 10);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('P or Esc to resume · progress is saved', VIEW_W / 2, VIEW_H / 2 + 30);
}

export function drawOver(ctx, world, reason) {
  ctx.fillStyle = 'rgba(20,4,6,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = reason === 'busted' ? '#6fb7ff' : '#ff5a4d';
  ctx.font = 'bold 72px system-ui, sans-serif';
  ctx.fillText(reason === 'busted' ? 'BUSTED' : 'WASTED', VIEW_W / 2, 300);
  ctx.fillStyle = '#fff';
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillText(reason === 'busted'
    ? 'The Palmera Bay PD caught up with you. The clinic bill stings, but the debt still stands.'
    : 'You wake up at the Bay Clinic, patched up and poorer. The debt still stands.', VIEW_W / 2, 350);
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('ENTER — back on the streets', VIEW_W / 2, 410);
}

export function drawWin(ctx, world) {
  ctx.fillStyle = 'rgba(6,18,10,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7dff9a';
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.fillText('DEBT CLEARED', VIEW_W / 2, 280);
  ctx.fillStyle = '#fff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Three jobs. Zero dollars owed. Marla Quinn shakes your hand and walks away.', VIEW_W / 2, 330);
  ctx.fillText(`Rico keeps $${Math.round(world.cash).toLocaleString()} — and the whole of Palmera Bay to enjoy it in.`, VIEW_W / 2, 362);
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('ENTER — keep playing in free roam', VIEW_W / 2, 420);
}

export function drawWorld(ctx, world) {
  drawGround(ctx, world);
  drawRoads(ctx, world);
  drawBuildings(ctx, world);
  drawPalms(ctx, world);
  drawMarker(ctx, world);
  for (const car of world.cars) drawCar(ctx, world, car);
  for (const ped of world.peds) drawPed(ctx, world, ped);
  for (const cop of world.cops) drawCop(ctx, world, cop);
  drawPlayer(ctx, world);
  drawBulletsAndParticles(ctx, world);
}

export function drawGame(ctx, world, input) {
  drawWorld(ctx, world);
  drawHUD(ctx, world, input);
  // A faint vignette pulls the eye to the middle of the frame and keeps the
  // HUD readable against bright sand and water at the screen edges.
  const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}
