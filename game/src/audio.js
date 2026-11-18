// Synthesised sound effects with the Web Audio API. No audio files, no network.
// The context is created lazily on the first user gesture; until then every
// call is a silent no-op, which also keeps headless screenshot runs quiet.

let ctx = null;
let master = null;
let muted = false;
let engineOsc = null;
let engineGain = null;
let sirenTimer = null;

export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

export function isMuted() {
  return muted;
}

function blip(freq, dur, type, vol, slideTo) {
  if (!ctx || !master || muted) return;
  try {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    // Audio is decoration; never let it break the game.
  }
}

export function sfxShot() {
  if (!ctx || !master || muted) return;
  try {
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1800;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t);
  } catch {
    // ignore
  }
}

export function sfxCash() {
  blip(880, 0.09, 'sine', 0.22);
  setTimeout(() => blip(1318, 0.14, 'sine', 0.22), 90);
}

export function sfxBusted() {
  blip(220, 0.5, 'sawtooth', 0.25, 55);
}

export function sfxPickup() {
  blip(660, 0.08, 'triangle', 0.2, 990);
}

// Engine hum whose pitch follows the car's speed; call every frame.
export function engineHum(speedNorm, inCar) {
  if (!ctx || !master || muted) return;
  try {
    if (!inCar || speedNorm < 0.02) {
      if (engineOsc) {
        engineOsc.stop();
        engineOsc = null;
        engineGain = null;
      }
      return;
    }
    if (!engineOsc) {
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineGain = ctx.createGain();
      engineGain.gain.value = 0.05;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900;
      engineOsc.connect(f);
      f.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
    }
    engineOsc.frequency.setTargetAtTime(55 + speedNorm * 140, ctx.currentTime, 0.08);
    engineGain.gain.setTargetAtTime(0.03 + speedNorm * 0.05, ctx.currentTime, 0.1);
  } catch {
    // ignore
  }
}

// Two-tone police siren while any police car is close; call every frame.
export function siren(active) {
  if (!ctx || !master || muted) {
    if (sirenTimer) {
      clearInterval(sirenTimer);
      sirenTimer = null;
    }
    return;
  }
  if (active && !sirenTimer) {
    let high = false;
    sirenTimer = setInterval(() => {
      high = !high;
      blip(high ? 950 : 700, 0.32, 'triangle', 0.05);
    }, 340);
  } else if (!active && sirenTimer) {
    clearInterval(sirenTimer);
    sirenTimer = null;
  }
}
