// "Decoding" text effect: characters flicker through binary digits before settling.
// The real text stays available to screen readers in a visually hidden copy.
const GLYPHS = '0101010110<>/_#';

export function prepareScramble(el) {
  if (el.dataset.scrambleReady) return;
  const text = el.textContent.trim();
  el.dataset.text = text;
  const rect = el.getBoundingClientRect();
  if (getComputedStyle(el).display !== 'block') el.style.minWidth = `${Math.ceil(rect.width)}px`;
  el.textContent = '';
  const real = document.createElement('span');
  real.className = 'visually-hidden';
  real.textContent = text;
  const shown = document.createElement('span');
  shown.setAttribute('aria-hidden', 'true');
  shown.textContent = text;
  el.append(real, shown);
  el._shown = shown;
  el.dataset.scrambleReady = '1';
}

export function scramble(el, { duration = 900, delay = 0 } = {}) {
  prepareScramble(el);
  const text = el.dataset.text;
  const shown = el._shown;
  const order = Array.from(text, (_, i) => i / text.length * 0.6 + Math.random() * 0.4);
  let start = null;

  const frame = (now) => {
    if (start === null) start = now + delay;
    const p = Math.max(0, (now - start) / duration);
    let out = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === ' ' || ch === '·' || p >= order[i]) out += ch;
      else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    shown.textContent = out;
    if (p < 1) requestAnimationFrame(frame);
    else shown.textContent = text;
  };
  requestAnimationFrame(frame);
}
