// Small math and random helpers shared by every system of the game.
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
// Clamp to the unit interval — used for particle fade and any 0..1 blend.
export function clamp01(v) { return clamp(v, 0, 1); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function dist2(ax, ay, bx, by) { const dx = ax - bx; const dy = ay - by; return dx * dx + dy * dy; }
export function dist(ax, ay, bx, by) { return Math.sqrt(dist2(ax, ay, bx, by)); }
export function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
export function turnToward(a, b, maxStep) {
  const d = angleDiff(a, b);
  return a + clamp(d, -maxStep, maxStep);
}

// Deterministic PRNG (mulberry32) so a seed always builds the same city.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
export function range(rng, lo, hi) { return lo + rng() * (hi - lo); }

// Circle vs axis-aligned rectangle: push the circle out, return true on overlap.
export function circleRectResolve(c, r) {
  const nx = clamp(c.x, r.x, r.x + r.w);
  const ny = clamp(c.y, r.y, r.y + r.h);
  const dx = c.x - nx; const dy = c.y - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 >= 16 * 16) return false;
  if (d2 > 0.0001) {
    const d = Math.sqrt(d2);
    const push = 16 - d;
    c.x += (dx / d) * push; c.y += (dy / d) * push;
  } else {
    // Centre inside the rectangle: push out along the smallest axis.
    const left = c.x - r.x; const right = r.x + r.w - c.x;
    const top = c.y - r.y; const bottom = r.y + r.h - c.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) c.x = r.x - 16;
    else if (m === right) c.x = r.x + r.w + 16;
    else if (m === top) c.y = r.y - 16;
    else c.y = r.y + r.h + 16;
  }
  return true;
}
