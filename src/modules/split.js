// Splits a heading into per-character spans so each letter can rise out of a mask.
// The heading keeps its text for assistive tech through aria-label; the spans are hidden from it.
export function splitChars(el) {
  if (el.dataset.splitDone) return;
  const text = el.textContent.replace(/\s+/g, ' ').trim();
  el.setAttribute('aria-label', text);
  el.textContent = '';
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
