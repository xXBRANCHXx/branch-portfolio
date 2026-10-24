// Splits a heading into per-character spans so each letter can rise out of a mask.
// Assistive tech reads a visually hidden copy of the text; the spans are hidden from it.
// (Not aria-label: it isn't allowed on a paragraph, so a split quote would read as empty.)
export function splitChars(el) {
  if (el.dataset.splitDone) return;
  const text = el.textContent.replace(/\s+/g, ' ').trim();
  el.textContent = '';
  const real = document.createElement('span');
  real.className = 'visually-hidden';
  real.textContent = text;
  el.appendChild(real);
  let i = 0;
  text.split(' ').forEach((word, index, words) => {
    const wordEl = document.createElement('span');
    wordEl.className = 'split-chars';
    wordEl.setAttribute('aria-hidden', 'true');
    for (const ch of word) {
      const c = document.createElement('span');
      c.className = 'split-char';
      c.textContent = ch;
      c.style.setProperty('--i', String(i++));
      wordEl.appendChild(c);
    }
    el.appendChild(wordEl);
    if (index < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
  el.dataset.splitDone = '1';
}
