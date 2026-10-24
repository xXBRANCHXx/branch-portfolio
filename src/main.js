import { initMenu } from './modules/menu.js';
import { splitChars } from './modules/split.js';
import { scramble } from './modules/scramble.js';
import { initWave } from './modules/wave.js';
import { runIntro } from './modules/intro.js';
import { initScrollEffects } from './modules/scroll-effects.js';
import { initCursor, initMagnetic, initMarquee } from './modules/interactions.js';
import { reducedMotion } from './modules/util.js';

const root = document.documentElement;
const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());

initMenu();

const motion = !reducedMotion() && 'IntersectionObserver' in window && 'animate' in Element.prototype;
root.classList.add('js-live');

try {
  const wave = document.querySelector('.values-wave');
  if (wave) initWave(wave, { animate: motion });

  if (motion) {
    document.querySelectorAll('[data-split="chars"]').forEach(splitChars);

    // Reveal things as they scroll into view. Anything already on screen reveals at once.
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('is-in');
        if (el.hasAttribute('data-scramble')) scramble(el);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    const hero = document.querySelector('.hero');
    document.querySelectorAll('.reveal, .wipe, [data-split="chars"], [data-scramble]').forEach((el) => {
      if (!hero.contains(el)) io.observe(el);
    });

    root.classList.add('motion');
    initMarquee();
    initCursor();
    initMagnetic();
    runIntro();
  } else {
    root.classList.remove('motion', 'is-intro');
  }
} catch (err) {
  // If anything goes wrong, fall back to the static page rather than leaving content hidden.
  root.classList.remove('motion', 'is-intro', 'intro-live');
  document.querySelectorAll('.intro-screen').forEach((el) => el.remove());
  console.error(err);
}

initScrollEffects({ motion: root.classList.contains('motion') });
