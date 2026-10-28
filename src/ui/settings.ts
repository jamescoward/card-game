import { setSpeed } from './fx';

const KEY = 'inkbrawl.speed';

function load(): number {
  try {
    return localStorage.getItem(KEY) === 'fast' ? 2 : 1;
  } catch {
    return 1;
  }
}

let speed = load();
setSpeed(speed);

export function getSpeed() {
  return speed;
}

export function toggleSpeed() {
  speed = speed > 1 ? 1 : 2;
  setSpeed(speed);
  try {
    localStorage.setItem(KEY, speed > 1 ? 'fast' : 'normal');
  } catch {
    /* storage unavailable */
  }
}
