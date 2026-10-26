import { initMenu } from './modules/menu.js';
import { splitChars } from './modules/split.js';
import { initWave } from './modules/wave.js';
import { runIntro } from './modules/intro.js';
import { initReveal } from './modules/reveal.js';
import { initScrollEffects } from './modules/scroll-effects.js';
import { initCursor, initMagnetic, initCopy, initFilmStrip } from './modules/interactions.js';
import { initTransitions } from './modules/transitions.js';
import { reducedMotion } from './modules/util.js';

const root = document.documentElement;
const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());

initMenu();
initCopy();

const motion = !root.classList.contains('no-motion') && !reducedMotion() && 'IntersectionObserver' in window && 'animate' in Element.prototype;
root.classList.add('js-live', 'has-js');

try {
  const wave = document.querySelector('.values-wave');
  if (wave) initWave(wave, { animate: motion });

  if (motion) {
    document.querySelectorAll('[data-split="chars"]').forEach(splitChars);
    // The hero has its own entrance (see intro.js), so leave it out of the scroll reveals.
    initReveal({ skip: document.querySelector('.hero') });
    root.classList.add('motion');
    initFilmStrip();
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
initTransitions();
