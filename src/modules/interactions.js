// Pointer-driven details: a "View" cursor over the work rows, a magnetic email link,
// and the endless film strip.
import { finePointer } from './util.js';

export function initCursor() {
  if (!finePointer()) return;
  const rows = document.querySelectorAll('.project');
  if (!rows.length) return;
  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.textContent = 'VIEW ↗';
  document.body.appendChild(cursor);

  const state = { x: -200, y: -200, tx: -200, ty: -200, s: 0, ts: 0 };
  let raf = 0;
  const step = () => {
    state.x += (state.tx - state.x) * 0.18;
    state.y += (state.ty - state.y) * 0.18;
    state.s += (state.ts - state.s) * 0.16;
    cursor.style.setProperty('--x', `${state.x.toFixed(1)}px`);
    cursor.style.setProperty('--y', `${state.y.toFixed(1)}px`);
    cursor.style.setProperty('--s', state.s.toFixed(3));
    const moving = Math.abs(state.tx - state.x) > 0.2 || Math.abs(state.ty - state.y) > 0.2 || Math.abs(state.ts - state.s) > 0.002;
    raf = moving ? requestAnimationFrame(step) : 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(step); };

  window.addEventListener('pointermove', (e) => {
    state.tx = e.clientX;
    state.ty = e.clientY;
    if (state.s < 0.01 && state.ts === 0) { state.x = e.clientX; state.y = e.clientY; }
    kick();
  }, { passive: true });
  rows.forEach((row) => {
    row.addEventListener('pointerenter', () => { state.ts = 1; kick(); });
    row.addEventListener('pointerleave', () => { state.ts = 0; kick(); });
  });
  window.addEventListener('scroll', () => {
    // Hide the cursor if the row scrolls out from under it.
    const el = document.elementFromPoint(state.tx, state.ty);
    if (!el || !el.closest('.project')) { state.ts = 0; kick(); }
  }, { passive: true });
}

export function initMagnetic() {
  if (!finePointer()) return;
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const strength = 0.25;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transition = 'transform .2s ease-out';
      el.style.transform = `translate(${(dx * strength).toFixed(1)}px, ${(dy * strength * 1.6).toFixed(1)}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = 'transform .8s cubic-bezier(.16,1,.3,1)';
      el.style.transform = '';
    });
  });
}

export function initMarquee() {
  const film = document.querySelector('.film');
  if (!film) return;
  const items = [...film.children];
  items.forEach((li) => {
    const copy = li.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.querySelectorAll('img').forEach((img) => { img.alt = ''; img.loading = 'eager'; });
    film.appendChild(copy);
  });
  const setDuration = () => {
    const half = film.scrollWidth / 2;
    film.style.setProperty('--marquee-duration', `${Math.max(20, half / 45).toFixed(1)}s`);
  };
  film.classList.add('is-marquee');
  setDuration();
  new ResizeObserver(setDuration).observe(film);
}
