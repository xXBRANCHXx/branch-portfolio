// Page-to-page zoom (Chrome, Edge and Safari 18+; others just navigate).
// Every move between pages zooms: going into a page zooms in, going back (or home) zooms out.
// Opening a case study, the image on the link grows into the case study's cover ("case-cover");
// leaving one, its cover shrinks back into the image on the page you land on. This file names the
// leaving page's image; each page's head script names the arriving page's one (it has to be ready
// before the first frame, before this module runs).
//
// The morph only looks right if the case study's cover is already downloaded when the new page
// first paints. So each case study is warmed before it is clicked: its cover image is fetched
// when the link comes near the screen (or is pointed at), and its page is prefetched, along with
// the case-study stylesheet and script the first time (the home page doesn't use them).
const warmed = new WeakMap();
let assetsWarmed = false;

function prefetch(href) {
  const hint = document.createElement('link');
  hint.rel = 'prefetch';
  hint.href = href;
  document.head.appendChild(hint);
}

// Fetch a case study's page once to find its stylesheets and scripts, and prefetch any this page lacks.
function warmAssets(pageUrl) {
  if (assetsWarmed || !window.fetch) return;
  assetsWarmed = true;
  fetch(pageUrl, { credentials: 'same-origin' })
    .then((res) => (res.ok ? res.text() : ''))
    .then((html) => {
      const have = new Set(Array.from(document.querySelectorAll('link[href], script[src]'), (el) => el.href || el.src));
      const found = html.match(/(?:href|src)="[^"]+\.(?:css|js)"/g) || [];
      found.forEach((attr) => {
        const url = new URL(attr.slice(attr.indexOf('"') + 1, -1), pageUrl).href;
        if (!have.has(url)) prefetch(url);
      });
    })
    .catch(() => {});
}

function warm(link) {
  if (warmed.has(link)) return warmed.get(link);
  const pic = link.querySelector('[data-vt-media] img');
  let cover = null;
  if (pic) {
    cover = new Image();
    cover.decoding = 'async';
    cover.src = pic.src.replace(/cover(-480)?\.webp$/, 'cover.webp');
  }
  prefetch(link.href);
  warmAssets(link.href);
  warmed.set(link, cover);
  return cover;
}

function initWarmUp() {
  const links = document.querySelectorAll('a[data-vt-link]');
  if (!links.length) return;
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        warm(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '100% 0px' });
    links.forEach((link) => io.observe(link));
  }
  links.forEach((link) => {
    const now = () => warm(link);
    link.addEventListener('pointerenter', now, { passive: true });
    link.addEventListener('touchstart', now, { passive: true });
    link.addEventListener('focus', now);
  });

  // A very quick click can still beat the cover download. Then hold the navigation for a moment
  // (at most 0.6 s) until the image is in, so the morph has something to grow into.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest && e.target.closest('a[data-vt-link]');
    if (!link || (link.target && link.target !== '_self')) return;
    const cover = warm(link);
    // Only worth waiting for when the morph can actually play.
    const canMorph = 'onpagereveal' in window && matchMedia('(prefers-reduced-motion: no-preference)').matches;
    if (!cover || cover.complete || !canMorph) return;
    e.preventDefault();
    let gone = false;
    const go = () => {
      if (gone) return;
      gone = true;
      window.location.assign(link.href);
    };
    cover.decode().then(go, go);
    setTimeout(go, 600);
  });
}

function clearNames() {
  document.querySelectorAll('[data-vt-media], [data-vt-cover]').forEach((el) => { el.style.viewTransitionName = ''; });
}

export function initTransitions() {
  // Browsers without the Navigation API don't say where a navigation is going, so remember the link.
  let clicked = null;
  document.addEventListener('click', (e) => {
    clicked = (e.target.closest && e.target.closest('a[data-vt-link]')) || null;
  }, true);
  window.addEventListener('pageshow', () => { clicked = null; });

  window.addEventListener('pageswap', (e) => {
    // Tell the next page where it was opened from (for browsers without navigation.activation).
    try { sessionStorage.setItem('vt-from', window.location.href); } catch (err) { /* storage blocked */ }
    clearNames();
    const vt = e.viewTransition;
    if (!vt) return;
    const to = e.activation && e.activation.entry && e.activation.entry.url;
    const link = to
      ? Array.from(document.querySelectorAll('a[data-vt-link]')).find((a) => a.href === to)
      : clicked;
    // The clicked project's image grows into its cover. Anywhere else, a case study's own cover
    // shrinks back into the image it came from (or zooms out on its own if that isn't on screen).
    const el = (link && link.querySelector('[data-vt-media]')) || document.querySelector('[data-vt-cover]');
    if (!el) return;
    // Only an image that is on screen can move: one scrolled out of view would fly in from far away.
    const r = el.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= window.innerHeight) return;
    el.style.viewTransitionName = 'case-cover';
    const clear = () => { el.style.viewTransitionName = ''; };
    vt.finished.then(clear, clear);
  });
  initWarmUp();
}
