// ================================================================
// Main entry – orchestrates portrait, scroll zoom, content reveals
// ================================================================

import { AsciiPortrait } from './ascii-canvas.js';

// ── DOM REFS ──────────────────────────────────────────────────────
const canvas      = document.getElementById('ascii-canvas');
const hero        = document.getElementById('hero');
const overlay     = document.getElementById('overlay');
const scrollSpacer = document.getElementById('scroll-spacer');
const heroNameL   = document.getElementById('hero-name-left');
const heroNameR   = document.getElementById('hero-name-right');
const scrollCta   = document.getElementById('scroll-cta');

// Set stagger indices for name letter animations
heroNameL.querySelectorAll('span').forEach((s, i) => s.style.setProperty('--i', i));
heroNameR.querySelectorAll('span').forEach((s, i) => s.style.setProperty('--i', i));

// ── ASCII PORTRAIT ────────────────────────────────────────────────
const portrait = new AsciiPortrait(canvas);

portrait.onEntranceDone = () => {
  // Fade in name text and scroll CTA
  heroNameL.style.opacity = '1';
  heroNameR.style.opacity = '1';
  scrollCta.style.opacity = '1';
};

portrait.init().catch(err => console.error('Portrait init failed:', err));

// ── SCROLL LOCK DURING ENTRANCE ──────────────────────────────────
document.body.style.overflow = 'hidden';
setTimeout(() => {
  document.body.style.overflow = '';
}, portrait.entranceDuration + 900);

// ── SCROLL-DRIVEN ZOOM + OVERLAY ─────────────────────────────────
function onScroll() {
  const scrollTop = window.scrollY;
  const spacerH   = scrollSpacer.offsetHeight || (window.innerHeight * 3);
  const progress  = Math.min(1, Math.max(0, scrollTop / spacerH));

  // Quadratic ease-in zoom (slow start, accelerates)
  const zoomT = progress * progress;
  const scale = 1 + zoomT * 35;
  hero.style.transform = `scale(${scale})`;

  // Overlay: starts fading in at 30%, fully opaque at ~90%
  const overlayAlpha = Math.max(0, Math.min(1, (progress - 0.30) / 0.60));
  overlay.style.opacity = overlayAlpha;

  // Fade out hero text elements quickly
  if (portrait.entranceDone) {
    const fade = Math.max(0, 1 - progress * 5);
    heroNameL.style.opacity = fade;
    heroNameR.style.opacity = fade;
    scrollCta.style.opacity = fade;
  }

  // Pause canvas when deeply zoomed (performance)
  if (progress > 0.55) {
    if (portrait.running) portrait.pause();
  } else {
    if (!portrait.running) portrait.resume();
  }
}

window.addEventListener('scroll', onScroll, { passive: true });

// ── CONTENT SECTION REVEAL ───────────────────────────────────────
const sections = document.querySelectorAll('.section');

const sectionObs = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  },
  { threshold: 0.06, rootMargin: '0px 0px -40px 0px' }
);

sections.forEach(s => sectionObs.observe(s));

// ── CARD GLITCH MICRO-INTERACTION ────────────────────────────────
document.querySelectorAll('.card').forEach(card => {
  const title = card.querySelector('.card__title');
  if (!title) return;
  const original = title.textContent;

  card.addEventListener('mouseenter', () => {
    let ticks = 0;
    const maxTicks = 4;
    const iv = setInterval(() => {
      if (ticks >= maxTicks) {
        title.textContent = original;
        clearInterval(iv);
        return;
      }
      // Brief character scramble
      title.textContent = original
        .split('')
        .map(ch => (Math.random() < 0.3 ? String.fromCharCode(33 + Math.floor(Math.random() * 93)) : ch))
        .join('');
      ticks++;
    }, 50);
  });

  card.addEventListener('mouseleave', () => {
    title.textContent = original;
  });
});

// ── STAT COUNTER ANIMATION ───────────────────────────────────────
const statObs = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target.querySelector('.stat__number');
      if (!el || el.dataset.animated) return;
      el.dataset.animated = '1';

      const final = el.textContent.trim();
      const num = parseInt(final, 10);
      if (isNaN(num)) return; // skip ∞

      let current = 0;
      const step = Math.max(1, Math.ceil(num / 30));
      const iv = setInterval(() => {
        current += step;
        if (current >= num) {
          el.textContent = final; // preserve "+" suffix etc.
          clearInterval(iv);
        } else {
          el.textContent = current;
        }
      }, 35);
    });
  },
  { threshold: 0.5 }
);

document.querySelectorAll('.stat').forEach(s => statObs.observe(s));
