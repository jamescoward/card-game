// Visual juice: floating numbers, shakes, particles and confetti.

export const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

let speed = 1;
export function setSpeed(s: number) {
  speed = s;
}
/** Wait scaled by the animation speed setting. */
export const beat = (ms: number) => wait(ms / speed);

export function floatText(target: Element | null, text: string, kind: 'dmg' | 'heal' | 'info' | 'big') {
  if (!target) return;
  const r = target.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = `float-text float-${kind}`;
  el.textContent = text;
  el.style.left = `${r.left + r.width / 2 + (Math.random() * 16 - 8)}px`;
  el.style.top = `${r.top + r.height / 2}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

export function pulse(el: Element | null, cls: string, ms = 500) {
  if (!el) return;
  el.classList.remove(cls);
  // Force reflow so the animation restarts.
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

export function shake(intensity: 'small' | 'big' = 'small') {
  const root = document.querySelector('.battle');
  pulse(root, intensity === 'big' ? 'shake-big' : 'shake-small', 450);
}

export function burst(target: Element | null, emoji: string, count = 8) {
  if (!target) return;
  const r = target.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.textContent = emoji;
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = 40 + Math.random() * 40;
    p.style.left = `${r.left + r.width / 2}px`;
    p.style.top = `${r.top + r.height / 2}px`;
    p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

export function confetti(count = 80) {
  const colors = ['#ffd23f', '#ff5a36', '#3aa0ff', '#4cc96b', '#b06cff', '#ffffff'];
  for (let i = 0; i < count; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = `${Math.random() * 100}vw`;
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = `${Math.random() * 0.8}s`;
    c.style.animationDuration = `${2 + Math.random() * 1.5}s`;
    c.style.setProperty('--spin', `${Math.random() * 720 - 360}deg`);
    c.style.setProperty('--drift', `${Math.random() * 120 - 60}px`);
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4000);
  }
}

export function banner(text: string, kind: 'you' | 'foe' | 'storm' | 'info' = 'info', ms = 1000) {
  const el = document.createElement('div');
  el.className = `banner banner-${kind}`;
  el.innerHTML = `<span>${text}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms / speed + 400);
}

export function toast(text: string) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}
