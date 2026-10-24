// Page-to-page transitions (Chrome, Edge and Safari 18+; others just navigate).
// When a link to a case study is followed, its image gets the shared name "case-cover",
// and the case study's head script gives its cover the same name, so one grows into the other.
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
}
