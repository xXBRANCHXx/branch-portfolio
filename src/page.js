// Entry for the case study pages and the 404 page.
import { initMenu } from './modules/menu.js';
import { splitChars } from './modules/split.js';
import { initWave } from './modules/wave.js';
import { initReveal } from './modules/reveal.js';
import { initScrollEffects } from './modules/scroll-effects.js';
import { initTour } from './modules/tour.js';
import { initCursor, initMagnetic } from './modules/interactions.js';
import { initTransitions } from './modules/transitions.js';
import { reducedMotion } from './modules/util.js';

const root = document.documentElement;
const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());

initMenu();

const motion = !root.classList.contains('no-motion') && !reducedMotion() && 'IntersectionObserver' in window && 'animate' in Element.prototype;
root.classList.add('js-live');

const fontsReady = (maxWait) => (document.fonts && document.fonts.ready
  ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, maxWait))])
  : Promise.resolve());

try {
  const wave = document.querySelector('.lost-wave');
  if (wave) initWave(wave, { animate: motion });

  if (motion) {
    document.querySelectorAll('[data-split="chars"]').forEach(splitChars);
    initReveal();
    root.classList.add('motion');
    initCursor();
    initMagnetic();
    initFilm();
    // Bring in the header and the cover once the display font is ready.
    fontsReady(600).then(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  } else {
    root.classList.remove('motion');
  }
} catch (err) {
  root.classList.remove('motion');
  console.error(err);
}

const live = root.classList.contains('motion');
initScrollEffects({ motion: live });
initTour({ motion: live });
initTransitions();

// The product film plays (muted) while it is on screen, unless the visitor is saving data.
function initFilm() {
  const video = document.querySelector('.g-video');
  if (!video || (navigator.connection && navigator.connection.saveData)) return;
  let userPaused = false;
  let autoPause = false;
  video.addEventListener('pause', () => { if (autoPause) autoPause = false; else userPaused = true; });
  video.addEventListener('play', () => { userPaused = false; });
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !userPaused) {
      video.preload = 'auto';
      video.play().catch(() => {});
    } else if (!entry.isIntersecting && !video.paused) {
      autoPause = true;
      video.pause();
    }
  }, { threshold: 0.4 }).observe(video);
}
