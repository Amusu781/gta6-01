// All sound is synthesised with WebAudio — no audio files, no network.
// Engine hum, siren, gunshots, punches, pickups, a mission-complete jingle and a
// low-key bass groove that plays while driving. Created on the first user gesture.
export function createAudio() {
  return { ctx: null, master: null, musicGain: null, engineOsc: null, engineGain: null, muted: false, musicTimer: 0, musicStep: 0 };
}

export function ensureAudio(audio) {
  if (audio.ctx) {
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return;
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  audio.ctx = ctx; audio.master = master;
  // Engine: a quiet sawtooth whose pitch follows the car's speed.
  const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 50;
  const eg = ctx.createGain(); eg.gain.value = 0;
  const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 420;
  osc.connect(filt); filt.connect(eg); eg.connect(master);
  osc.start();
  audio.engineOsc = osc; audio.engineGain = eg;
  // Music bus: a soft bass groove, one note every 0.22s.
  const mg = ctx.createGain(); mg.gain.value = 0.16; mg.connect(master);
  audio.musicGain = mg;
}

function tone(audio, freq, dur, type, vol, when = 0, slideTo = null) {
  if (!audio.ctx || audio.muted) return;
  const ctx = audio.ctx; const t = ctx.currentTime + when;
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(audio.master);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(audio, dur, vol, freq = 1200) {
  if (!audio.ctx || audio.muted) return;
  const ctx = audio.ctx;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(audio.master);
  src.start();
}

export const sfx = {
  shoot(audio) { noise(audio, 0.12, 0.5, 2600); tone(audio, 160, 0.08, 'square', 0.18, 0, 60); },
  punch(audio) { noise(audio, 0.08, 0.4, 900); },
  crash(audio) { noise(audio, 0.25, 0.5, 500); tone(audio, 90, 0.2, 'sine', 0.3, 0, 40); },
  pickup(audio) { tone(audio, 660, 0.1, 'sine', 0.25); tone(audio, 990, 0.16, 'sine', 0.25, 0.09); },
  mission(audio) { [523, 659, 784, 1047].forEach((f, i) => tone(audio, f, 0.22, 'triangle', 0.28, i * 0.11)); },
  fail(audio) { [330, 262, 196].forEach((f, i) => tone(audio, f, 0.25, 'triangle', 0.25, i * 0.14)); },
  siren(audio) { tone(audio, 700, 0.4, 'sine', 0.10, 0, 950); tone(audio, 950, 0.4, 'sine', 0.10, 0.4, 700); },
  reload(audio) { tone(audio, 520, 0.06, 'square', 0.14); tone(audio, 390, 0.06, 'square', 0.14, 0.08); },
  click(audio) { tone(audio, 880, 0.05, 'square', 0.12); },
  steal(audio) { tone(audio, 220, 0.12, 'square', 0.15, 0, 440); tone(audio, 440, 0.12, 'square', 0.15, 0.1, 660); },
};

// Called every frame: engine pitch follows speed, the bass groove ticks along.
const BASSLINE = [55, 0, 55, 65.4, 55, 0, 49, 58.3, 55, 0, 55, 65.4, 73.4, 65.4, 58.3, 49];
export function updateAudio(audio, speedNorm, dt) {
  if (!audio.ctx) return;
  if (audio.engineGain) audio.engineGain.gain.value = 0.02 + speedNorm * 0.05;
  if (audio.engineOsc) audio.engineOsc.frequency.value = 48 + speedNorm * 130;
  audio.musicTimer += dt;
  if (audio.musicTimer >= 0.22) {
    audio.musicTimer -= 0.22;
    const note = BASSLINE[audio.musicStep % BASSLINE.length];
    audio.musicStep += 1;
    if (note > 0) tone(audio, note, 0.2, 'triangle', 0.5);
  }
}

export function toggleMute(audio) {
  audio.muted = !audio.muted;
  if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.5;
  return audio.muted;
}
