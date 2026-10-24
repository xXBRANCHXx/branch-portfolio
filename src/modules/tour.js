// The screens tour on a case study: the frames stick while the section scrolls past,
// and each screen slides up over the one before. Captions follow along.
// Where scroll-driven CSS animations exist the slides move on the compositor (case.css);
// otherwise this moves them. Without motion the screens simply scroll sideways.
import { clamp, easeInOutCubic } from './util.js';

const SCROLL_PADDING = 88; // matches html { scroll-padding-top }, which view timelines also respect

export function initTour({ motion }) {
  const tour = document.querySelector('.tour');
  if (!tour) return;
  const n = parseInt(getComputedStyle(tour).getPropertyValue('--n'), 10) || 1;
  const captions = Array.from(tour.querySelectorAll('.tour-captions li'));
  const screens = Array.from(tour.querySelectorAll('.frame-screen'));
  const slideSets = screens.map((s) => Array.from(s.querySelectorAll('.tour-slide')));

  // Hidden screens sit outside their frame, where lazy loading would never fetch them in time.
  // Only frames that are shown count (phones hide the laptop), and turning the phone can show more.
  if ('IntersectionObserver' in window) {
    const eager = () => tour.querySelectorAll('img').forEach((img) => { if (img.getClientRects().length) img.loading = 'eager'; });
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      eager();
      window.addEventListener('resize', eager, { passive: true });
    }, { rootMargin: '1200px 0px' });
    io.observe(tour);
  }

  const setActive = (index) => {
    captions.forEach((li, i) => li.classList.toggle('is-active', i === index));
  };

  if (!motion) {
    // Static layout: captions follow the sideways scroll of the first visible frame.
    screens.forEach((screen) => {
      screen.addEventListener('scroll', () => {
        setActive(clamp(Math.round(screen.scrollLeft / Math.max(1, screen.clientWidth)), 0, n - 1));
      }, { passive: true });
    });
    return;
  }

  // The frames are not scrollable with motion on, so they should not take keyboard focus.
  screens.forEach((s) => s.removeAttribute('tabindex'));
  const css = document.documentElement.classList.contains('css-pan');
  const ranges = slideSets[0].map((_, k) => [(k - 0.32) / n, (k + 0.32) / n]);

  let ticking = false;
  const update = () => {
    ticking = false;
    const rect = tour.getBoundingClientRect();
    const vh = window.innerHeight;
    const span = rect.height - (vh - SCROLL_PADDING);
    const p = clamp((SCROLL_PADDING - rect.top) / Math.max(1, span), 0, 1);
    let active = 0;
    ranges.forEach(([a, b], k) => {
      if (!k) return;
      const t = clamp((p - a) / (b - a), 0, 1);
      if (t >= 0.5) active = k;
      if (!css) {
        const y = (1 - easeInOutCubic(t)) * 101;
        slideSets.forEach((set) => { if (set[k]) set[k].style.translate = `0 ${y.toFixed(2)}%`; });
      }
    });
    setActive(active);
  };
  const request = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();
}
