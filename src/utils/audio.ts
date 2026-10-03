/**
 * Tiny Web Audio synth for interface sounds. No samples, no network.
 * Sound is never required to understand the game — every cue has a visual twin.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function audio(): AudioContext | null {
  if (muted) return null;
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setMuted(value: boolean) {
  muted = value;
}

interface ToneOpts {
  freq: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  at?: number;
  slideTo?: number;
  attack?: number;
}

function tone({ freq, dur, type = 'sine', gain = 0.08, at = 0, slideTo, attack = 0.008 }: ToneOpts) {
  const c = audio();
  if (!c || !master) return;
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur: number, gain = 0.05, at = 0, highpass = 1200) {
  const c = audio();
  if (!c || !master) return;
  const t0 = c.currentTime + at;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = highpass;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(master);
  src.start(t0);
}

export const sfx = {
  click: () => tone({ freq: 880, dur: 0.05, type: 'triangle', gain: 0.03 }),
  select: () => tone({ freq: 660, dur: 0.07, type: 'triangle', gain: 0.035 }),
  wire: () => tone({ freq: 520, dur: 0.09, type: 'sine', gain: 0.05, slideTo: 780 }),
  probe: () => {
    tone({ freq: 300, dur: 0.35, type: 'sine', gain: 0.05, slideTo: 600 });
    tone({ freq: 900, dur: 0.12, type: 'triangle', gain: 0.02, at: 0.28 });
  },
  measure: (v: 0 | 1) => tone({ freq: v ? 740 : 494, dur: 0.22, type: 'triangle', gain: 0.06 }),
  zap: () => {
    noiseBurst(0.22, 0.06, 0, 2000);
    tone({ freq: 160, dur: 0.25, type: 'sawtooth', gain: 0.03, slideTo: 60 });
  },
  phaseZap: () => {
    tone({ freq: 420, dur: 0.4, type: 'sine', gain: 0.05, slideTo: 210 });
    tone({ freq: 430, dur: 0.4, type: 'sine', gain: 0.04, slideTo: 215, at: 0.02 });
  },
  fix: () => {
    tone({ freq: 523, dur: 0.12, type: 'triangle', gain: 0.05 });
    tone({ freq: 784, dur: 0.18, type: 'triangle', gain: 0.05, at: 0.08 });
  },
  lens: () => tone({ freq: 600, dur: 0.2, type: 'sine', gain: 0.04, slideTo: 900 }),
  success: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.3, type: 'triangle', gain: 0.05, at: i * 0.08 }));
  },
  fail: () => {
    tone({ freq: 220, dur: 0.35, type: 'square', gain: 0.025, slideTo: 140 });
  },
  collapse: () => {
    noiseBurst(0.5, 0.05, 0, 400);
    tone({ freq: 440, dur: 0.6, type: 'sawtooth', gain: 0.025, slideTo: 80 });
  },
  transmit: () => tone({ freq: 400, dur: 0.6, type: 'sine', gain: 0.04, slideTo: 1200 }),
  concept: () => {
    tone({ freq: 880, dur: 0.18, type: 'sine', gain: 0.04 });
    tone({ freq: 1320, dur: 0.3, type: 'sine', gain: 0.03, at: 0.1 });
  },
  rank: () => {
    [392, 523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.4, type: 'triangle', gain: 0.045, at: i * 0.1 }));
  },
  tick: () => tone({ freq: 1200, dur: 0.03, type: 'square', gain: 0.012 }),
};
