// Tiny synthesized sound effects — no audio files needed.

type Sfx =
  | 'click' | 'select' | 'ink' | 'summon' | 'spell' | 'swoosh' | 'hit' | 'bigHit'
  | 'face' | 'death' | 'shield' | 'heal' | 'buff' | 'freeze' | 'bounce' | 'storm'
  | 'turn' | 'win' | 'lose' | 'error' | 'reward';

let ctx: AudioContext | null = null;
let muted = loadMuted();

function loadMuted(): boolean {
  try {
    return localStorage.getItem('inkbrawl.muted') === '1';
  } catch {
    return false;
  }
}

export function isMuted() {
  return muted;
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem('inkbrawl.muted', m ? '1' : '0');
  } catch {
    /* storage unavailable */
  }
}

function ac(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, slideTo?: number, delay = 0) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.2, filterFreq = 1200, delay = 0) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

export function sfx(name: Sfx) {
  switch (name) {
    case 'click': tone(660, 0.05, 'square', 0.05); break;
    case 'select': tone(520, 0.06, 'triangle', 0.1, 780); break;
    case 'ink': tone(300, 0.25, 'sine', 0.2, 900); tone(900, 0.2, 'sine', 0.08, 1400, 0.08); break;
    case 'summon': noise(0.15, 0.25, 400); tone(140, 0.2, 'sine', 0.25, 60); break;
    case 'spell': tone(700, 0.3, 'sawtooth', 0.06, 1800); tone(1050, 0.25, 'sine', 0.08, 2200, 0.05); break;
    case 'swoosh': noise(0.12, 0.12, 3000); break;
    case 'hit': noise(0.08, 0.3, 900); tone(180, 0.1, 'square', 0.08, 90); break;
    case 'bigHit': noise(0.2, 0.4, 700); tone(120, 0.25, 'square', 0.12, 50); break;
    case 'face': noise(0.18, 0.35, 600); tone(90, 0.3, 'sawtooth', 0.12, 45); break;
    case 'death': tone(400, 0.35, 'sawtooth', 0.08, 80); noise(0.25, 0.15, 500, 0.05); break;
    case 'shield': tone(1200, 0.12, 'sine', 0.12, 600); tone(1600, 0.1, 'sine', 0.08, 800, 0.04); break;
    case 'heal': tone(523, 0.15, 'sine', 0.1); tone(784, 0.2, 'sine', 0.1, undefined, 0.08); break;
    case 'buff': tone(440, 0.12, 'triangle', 0.1, 880); tone(660, 0.15, 'triangle', 0.08, 1320, 0.06); break;
    case 'freeze': tone(1800, 0.3, 'sine', 0.06, 900); noise(0.2, 0.08, 6000); break;
    case 'bounce': tone(300, 0.2, 'sine', 0.15, 1200); break;
    case 'storm': noise(0.6, 0.35, 300); tone(60, 0.6, 'sawtooth', 0.1, 40); break;
    case 'turn': tone(392, 0.12, 'triangle', 0.1); tone(587, 0.18, 'triangle', 0.1, undefined, 0.1); break;
    case 'error': tone(160, 0.15, 'square', 0.06); break;
    case 'reward': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.1, undefined, i * 0.07)); break;
    case 'win': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.12, undefined, i * 0.12)); break;
    case 'lose': [392, 349, 311, 262].forEach((f, i) => tone(f, 0.35, 'sawtooth', 0.06, undefined, i * 0.18)); break;
  }
}

export function vibrate(ms: number) {
  if (muted) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}
