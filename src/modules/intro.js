// Opening sequence: a counter runs to 100 while a blue square grows in the centre,
// then the square flies onto the portrait (where the hero's blue square sits) and the hero builds in.
// Plays once per browser session; any key, click or scroll skips it.
import { easeOutCubic, safeSession } from './util.js';
import { scramble } from './scramble.js';

const SEEN_KEY = 'bv-intro-seen';

const fontsReady = (maxWait) => (document.fonts && document.fonts.ready
  ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, maxWait))])
  : Promise.resolve());

function revealHero(hero, { fast = false } = {}) {
  hero.classList.add('is-in');
  if (fast) hero.classList.add('square-in');
  document.documentElement.classList.remove('is-intro');
  document.documentElement.classList.add('is-ready');
  hero.querySelectorAll('[data-scramble]').forEach((el, i) => {
    scramble(el, { duration: 800, delay: (fast ? 300 : 750) + i * 90 });
  });
}

export function runIntro() {
  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const photo = hero.querySelector('.hero-photo');

  const skipOverlay = safeSession(SEEN_KEY) || window.scrollY > 40 || location.hash.length > 1;
  if (skipOverlay) {
    // No overlay this time: build the hero in once the display font is ready (or after a short wait).
    root.classList.remove('is-intro');
    fontsReady(500).then(() => requestAnimationFrame(() => revealHero(hero, { fast: true })));
    return;
  }
  safeSession(SEEN_KEY, '1');
  root.classList.add('is-intro');

  const screen = document.createElement('div');
  screen.className = 'intro-screen';
  screen.setAttribute('aria-hidden', 'true');
  const square = document.createElement('div');
  square.className = 'intro-square';
  const count = document.createElement('div');
  count.className = 'intro-count';
  count.textContent = '000';
  const name = document.createElement('div');
  name.className = 'intro-name';
  name.textContent = 'BRANCH VINCENT · PORTFOLIO';
  screen.append(square, count, name);
  document.body.appendChild(screen);
  root.classList.add('intro-live');

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const startSize = Math.min(vw, vh) * 0.16;
  Object.assign(square.style, {
    left: `${(vw - startSize) / 2}px`,
    top: `${(vh - startSize) / 2}px`,
    width: `${startSize}px`,
    height: `${startSize}px`,
  });

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('pointerdown', onPointer);
    window.removeEventListener('wheel', finish);
    window.removeEventListener('touchmove', finish);
    screen.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    screen.remove();
    revealHero(hero, { fast: true });
    hero.classList.add('square-in');
  };
  // A key that skips the intro shouldn't also page the document down, out of sight of the hero.
  const onKey = (e) => {
    if ([' ', 'PageDown', 'ArrowDown', 'End'].includes(e.key)) e.preventDefault();
    finish();
  };
  // The intro screen lets the pointer through, so swallow the click that ends a skip:
  // otherwise it lands on an invisible link or the menu button underneath.
  const onPointer = () => {
    const swallow = (e) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', swallow, true), 1000);
    finish();
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('pointerdown', onPointer);
  window.addEventListener('wheel', finish, { passive: true });
  window.addEventListener('touchmove', finish, { passive: true });

  // Phase 1: square grows in, counter runs to 100.
  square.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
  const countMs = 1000;
  let t0 = 0;
  const tick = (now) => {
    if (finished) return;
    if (!t0) t0 = now;
    const p = Math.min(1, (now - t0) / countMs);
    count.textContent = String(Math.round(easeOutCubic(p) * 100)).padStart(3, '0');
    if (p < 1) requestAnimationFrame(tick);
    else flyToPortrait();
  };

  // Phase 2: the square flies onto the portrait while the screen fades away.
  const flyToPortrait = () => {
    if (finished) return;
    const r = photo.getBoundingClientRect();
    const target = { left: r.left + r.width * 0.535, top: r.top + r.height * 0.167, width: r.width * 0.355, height: r.height * 0.301 };
    const from = square.getBoundingClientRect();
    const duration = 900;
    const easing = 'cubic-bezier(.65,0,.35,1)';
    square.animate([
      { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, opacity: 1 },
      { left: `${target.left}px`, top: `${target.top}px`, width: `${target.width}px`, height: `${target.height}px`, opacity: 1 },
    ], { duration, easing, fill: 'forwards' });
    count.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-30%)' }], { duration: 500, easing: 'ease-in', fill: 'forwards' });
    name.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
    screen.animate([{ backgroundColor: 'rgba(10,10,11,1)' }, { backgroundColor: 'rgba(10,10,11,0)' }], { duration: duration * 0.8, delay: duration * 0.35, easing: 'ease-out', fill: 'forwards' });

    // Start building the hero underneath as the screen clears.
    setTimeout(() => { if (!finished) revealHero(hero); }, duration * 0.45);
    setTimeout(() => {
      if (finished) return;
      finished = true;
      hero.classList.add('square-in');
      // Cross-fade the flat intro square into the real one, which multiplies over the photo.
      screen.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, easing: 'ease-out', fill: 'forwards' }).finished.then(() => screen.remove(), () => screen.remove());
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('wheel', finish);
      window.removeEventListener('touchmove', finish);
    }, duration + 30);
  };

  fontsReady(900).then(() => requestAnimationFrame(tick));
}
