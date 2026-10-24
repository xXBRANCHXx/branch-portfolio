// Numbers that count up from zero when they come into view.
// The real number stays in a visually hidden copy for screen readers.
import { easeOutCubic } from './util.js';

export function prepareCount(el) {
  if (el._shown) return;
  const target = parseInt(el.dataset.count, 10);
  if (!Number.isFinite(target)) return;
  const real = document.createElement('span');
  real.className = 'visually-hidden';
  real.textContent = el.textContent.trim();
  const shown = document.createElement('span');
  shown.setAttribute('aria-hidden', 'true');
  shown.textContent = '0';
  el.textContent = '';
  el.append(real, shown);
  el._shown = shown;
}

export function countUp(el, { duration = 1400 } = {}) {
  const shown = el._shown;
  const target = parseInt(el.dataset.count, 10);
  if (!shown || !Number.isFinite(target)) return;
  let start = 0;
  const frame = (now) => {
    if (!start) start = now;
    const p = Math.min(1, (now - start) / duration);
    shown.textContent = String(Math.round(easeOutCubic(p) * target));
    if (p < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
