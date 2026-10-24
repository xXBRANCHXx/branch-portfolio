// Scroll-linked motion, all driven from one requestAnimationFrame pass per scroll:
// progress bar, header state, hero parallax, the panning value words and photo strip, the approach panel
// opening up, a slow zoom on the contact photo, and gentle parallax on anything marked data-speed.
// Every piece is optional, so the case study and 404 pages use the same code.
import { clamp, lerp, enterProgress, passProgress } from './util.js';

export function initScrollEffects({ motion }) {
  const root = document.documentElement;
  const header = document.getElementById('site-header');
  const progress = document.querySelector('.progress');
  const hero = document.querySelector('.hero');
  const heroLayer = hero && hero.querySelector('[data-parallax]');
  const heroSquare = hero && hero.querySelector('.blue-square');
  const heroName = hero && hero.querySelector('.hero-name');
  const drifters = Array.from(document.querySelectorAll('[data-speed]'));
  const valuesSection = document.querySelector('.values');
  const valuesWords = valuesSection && valuesSection.querySelector('.values-words');
  const strip = document.querySelector('.strip');
  const film = strip && strip.querySelector('.film');
  const paper = document.querySelector('[data-clip]');
  const contactImg = document.querySelector('.contact-bg img');
  const contact = document.querySelector('.contact');

  // The value words sit on one long line that pans sideways with the scroll.
  // Measure how far it overflows its box; re-measure when fonts or the window change its size.
  // The photo strip does the same in the opposite direction.
  // Where the browser supports scroll-driven CSS animations, the pans run off the main thread
  // (see .pan in style.css) and this only feeds them the distances, so they stay locked to the scroll.
  const cssPan = motion && !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
  if (cssPan) root.classList.add('css-pan');
  const pan = { max: 0, extra: 0, film: 0 };
  const measurePan = () => {
    if (valuesWords) {
      const cs = getComputedStyle(valuesSection);
      const box = valuesSection.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      pan.max = Math.max(0, valuesWords.scrollWidth - box);
      pan.extra = box * 0.05;
      if (cssPan) {
        valuesWords.style.setProperty('--pan-from', `${pan.extra.toFixed(1)}px`);
        valuesWords.style.setProperty('--pan-to', `${(-(pan.max + pan.extra)).toFixed(1)}px`);
      }
    }
    if (film) {
      pan.film = Math.max(0, film.scrollWidth - film.parentElement.clientWidth);
      if (cssPan) {
        film.style.setProperty('--pan-from', `${(-pan.film).toFixed(1)}px`);
        film.style.setProperty('--pan-to', '0px');
      }
    }
  };
  if (motion) {
    measurePan();
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => { measurePan(); request(); });
      [valuesWords, film].filter(Boolean).forEach((el) => ro.observe(el));
    }
  }

  let lastY = window.scrollY;
  let ticking = false;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = Math.max(1, root.scrollHeight - vh);

    // Header: solid after the top, hides while scrolling down, returns when scrolling up.
    header.classList.toggle('is-scrolled', y > 40);
    const menuOpen = header.classList.contains('menu-open');
    const focusInside = header.contains(document.activeElement);
    if (!menuOpen && !focusInside && motion) {
      if (y > lastY + 4 && y > 400) header.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 400) header.classList.remove('is-hidden');
    } else {
      header.classList.remove('is-hidden');
    }
    lastY = y;

    if (progress) progress.style.setProperty('--progress', (y / max).toFixed(4));
    if (!motion) return;

    // Hero depth: photo drifts slower than the page, the square and name move at their own pace.
    if (hero && y < vh * 1.2) {
      const f = parseFloat(heroLayer.dataset.parallax) || 0.12;
      heroLayer.style.transform = `translate3d(0, ${(y * f).toFixed(1)}px, 0)`;
      heroSquare.style.transform = `translate3d(${pointer.x.toFixed(1)}px, ${(y * 0.1 + pointer.y).toFixed(1)}px, 0)`;
      heroName.style.transform = `translate3d(0, ${(-y * 0.08).toFixed(1)}px, 0)`;
    }

    // Value words pan from right to left as the band passes through the screen.
    if (valuesWords && !cssPan) {
      const p = passProgress(valuesSection.getBoundingClientRect(), vh);
      const t = clamp((p + 0.6) / 1.0, 0, 1);
      const x = lerp(pan.extra, -(pan.max + pan.extra), t);
      valuesWords.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
    }

    // Photo strip slides left to right while the section passes through the screen.
    if (film && !cssPan) {
      const p = passProgress(strip.getBoundingClientRect(), vh);
      const t = clamp((p + 0.6) / 1.0, 0, 1);
      film.style.transform = `translate3d(${(-pan.film * (1 - t)).toFixed(1)}px, 0, 0)`;
    }

    // Approach panel opens from an inset rectangle to full size.
    if (paper) {
      const e = enterProgress(paper.getBoundingClientRect(), vh, 0.45);
      paper.style.setProperty('--clip', `${((1 - e) * 7).toFixed(2)}%`);
    }

    // Images that drift slower than the page, inside a box that clips them.
    drifters.forEach((el) => {
      const box = el.parentElement.getBoundingClientRect();
      if (box.bottom < -100 || box.top > vh + 100) return;
      const p = passProgress(box, vh);
      el.style.transform = `translate3d(0, ${(p * (parseFloat(el.dataset.speed) || 0.05) * 100).toFixed(2)}%, 0)`;
    });

    // Contact photo settles from a slight zoom.
    if (contact && contactImg) {
      const e = enterProgress(contact.getBoundingClientRect(), vh, 0.2);
      contactImg.style.setProperty('--zoom', (1.18 - 0.18 * e).toFixed(4));
    }
  };

  const request = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  document.addEventListener('focusin', request);

  // The hero's blue square leans gently toward the pointer.
  if (hero && motion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let raf = 0;
    const ease = () => {
      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;
      update();
      if (Math.abs(pointer.tx - pointer.x) > 0.1 || Math.abs(pointer.ty - pointer.y) > 0.1) raf = requestAnimationFrame(ease);
      else raf = 0;
    };
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      pointer.tx = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5) * 28;
      pointer.ty = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5) * 20;
      if (!raf) raf = requestAnimationFrame(ease);
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
      pointer.tx = 0;
      pointer.ty = 0;
      if (!raf) raf = requestAnimationFrame(ease);
    });
  }

  update();
}
