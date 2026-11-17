// All sound is synthesized with WebAudio — no audio files, no network.
// The context is created lazily on the first user gesture; screenshot
// staging (no gesture) simply stays silent.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (muted || !ensure()) return;
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol || 0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch {
      // Sound is garnish; a failure here must never break the game.
    }
  }

  function noiseBurst(dur, vol, lowpass) {
    if (muted || !ensure()) return;
    try {
      const t = ctx.currentTime;
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = vol || 0.25;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass || 3000;
      src.connect(filter);
      filter.connect(g);
      g.connect(master);
      src.start(t);
    } catch {
      // ignore
    }
  }

  return {
    unlock,
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (muted) this.engineOff();
      return muted;
    },
    shoot() {
      noiseBurst(0.12, 0.3, 2400);
      blip(220, 0.08, 'square', 0.08, 60);
    },
    pickup() {
      blip(660, 0.1, 'sine', 0.16);
      setTimeout(() => blip(880, 0.14, 'sine', 0.16), 90);
    },
    paid() {
      blip(523, 0.12, 'triangle', 0.18);
      setTimeout(() => blip(659, 0.12, 'triangle', 0.18), 110);
      setTimeout(() => blip(784, 0.22, 'triangle', 0.2), 220);
    },
    busted() {
      blip(392, 0.25, 'sawtooth', 0.14, 196);
      setTimeout(() => blip(311, 0.4, 'sawtooth', 0.14, 155), 240);
    },
    steal() {
      blip(180, 0.16, 'sawtooth', 0.12, 320);
    },
    engineOn() {
      if (muted || !ensure()) return;
      try {
        if (engineOsc) return;
        engineOsc = ctx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.value = 55;
        engineGain = ctx.createGain();
        engineGain.gain.value = 0.0;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        engineOsc.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(master);
        engineOsc.start();
      } catch {
        // ignore
      }
    },
    engine(speedRatio) {
      if (!engineOsc || !engineGain) return;
      try {
        engineOsc.frequency.value = 50 + speedRatio * 130;
        engineGain.gain.value = 0.05 + speedRatio * 0.05;
      } catch {
        // ignore
      }
    },
    engineOff() {
      try {
        if (engineOsc) {
          engineOsc.stop();
          engineOsc = null;
          engineGain = null;
        }
      } catch {
        engineOsc = null;
        engineGain = null;
      }
    },
    sirenOn() {
      if (muted || !ensure() || sirenOsc) return;
      try {
        sirenOsc = ctx.createOscillator();
        sirenOsc.type = 'square';
        sirenOsc.frequency.value = 700;
        sirenGain = ctx.createGain();
        sirenGain.gain.value = 0.035;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(master);
        sirenOsc.start();
        let high = true;
        sirenTimer = setInterval(() => {
          if (!sirenOsc) return;
          high = !high;
          try {
            sirenOsc.frequency.value = high ? 700 : 950;
          } catch {
            // ignore
          }
        }, 420);
      } catch {
        // ignore
      }
    },
    sirenOff() {
      try {
        if (sirenTimer) {
          clearInterval(sirenTimer);
          sirenTimer = null;
        }
        if (sirenOsc) {
          sirenOsc.stop();
          sirenOsc = null;
          sirenGain = null;
        }
      } catch {
        sirenOsc = null;
        sirenGain = null;
      }
    },
  };
}
