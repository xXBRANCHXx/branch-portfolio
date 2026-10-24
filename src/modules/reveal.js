// Reveals elements as they scroll into view: fades, image wipes, split headings, scrambled labels
// and counting numbers. Anything already on screen reveals at once.
import { scramble } from './scramble.js';
import { prepareCount, countUp } from './count.js';

// Images "zip" in: the cover over each image is cut into rows that slide off to alternate sides,
// one after another from the top, like the teeth of a zipper coming apart.
function addZip(el) {
  const rows = Math.min(14, Math.max(6, Math.round(el.offsetHeight / 44)));
  const zip = document.createElement('span');
  zip.className = 'zip';
  zip.setAttribute('aria-hidden', 'true');
  for (let k = 0; k < rows; k += 1) {
    const row = document.createElement('i');
    row.style.setProperty('--k', k);
    zip.appendChild(row);
  }
  el.appendChild(zip);
  el.classList.add('has-zip');
}

export function initReveal({ skip = null } = {}) {
  document.querySelectorAll('[data-count]').forEach(prepareCount);
  document.querySelectorAll('.wipe').forEach(addZip);
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
