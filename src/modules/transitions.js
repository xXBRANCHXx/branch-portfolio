// Page-to-page transitions (Chrome, Edge and Safari 18+; others just navigate).
// When a link to a case study is followed, its image gets the shared name "case-cover",
// and the case study's head script gives its cover the same name, so one grows into the other.
//
// The morph only looks right if the case study's cover is already downloaded when the new page
// first paints. So each case study is warmed before it is clicked: its cover image is fetched
// when the link comes near the screen (or is pointed at), and its page is prefetched. Chrome and
// Edge also prerender the page on hover or touch (see the speculation rules in each page's head).
const warmed = new WeakMap();

function warm(link) {
  if (warmed.has(link)) return warmed.get(link);
  const pic = link.querySelector('[data-vt-media] img');
  let cover = null;
  if (pic) {
    cover = new Image();
    cover.decoding = 'async';
    cover.src = pic.src.replace(/cover(-480)?\.webp$/, 'cover.webp');
  }
  const hint = document.createElement('link');
  hint.rel = 'prefetch';
  hint.href = link.href;
  document.head.appendChild(hint);
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

export function initTransitions() {
  window.addEventListener('pageswap', (e) => {
    const url = e.viewTransition && e.activation && e.activation.entry && e.activation.entry.url;
    if (!url) return;
    const link = Array.from(document.querySelectorAll('a[data-vt-link]')).find((a) => a.href === url);
    const media = link && link.querySelector('[data-vt-media]');
    if (!media) return;
    media.style.viewTransitionName = 'case-cover';
    const clear = () => { media.style.viewTransitionName = ''; };
    e.viewTransition.finished.then(clear, clear);
  });
  initWarmUp();
}
