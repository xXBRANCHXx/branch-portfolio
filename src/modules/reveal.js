// Reveals elements as they scroll into view: fades, image wipes, split headings, scrambled labels
// and counting numbers. Anything already on screen reveals at once.
import { scramble } from './scramble.js';
import { prepareCount, countUp } from './count.js';

export function initReveal({ skip = null } = {}) {
  document.querySelectorAll('[data-count]').forEach(prepareCount);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('is-in');
      if (el.hasAttribute('data-scramble')) scramble(el);
      if (el.hasAttribute('data-count')) countUp(el);
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  document.querySelectorAll('.reveal, .wipe, [data-split="chars"], [data-scramble], [data-count]').forEach((el) => {
    if (!skip || !skip.contains(el)) io.observe(el);
  });
}
