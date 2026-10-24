// Full-screen menu on small screens. Everything outside the header is made inert
// while it is open, so keyboard and screen reader users stay inside the menu.
export function initMenu() {
  const header = document.getElementById('site-header');
  const toggle = header.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  const outside = [document.getElementById('main'), document.querySelector('.site-footer'), document.querySelector('.skip')].filter(Boolean);

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'CLOSE' : 'MENU';
    document.documentElement.style.overflow = open ? 'hidden' : '';
    outside.forEach((el) => { el.inert = open; });
  };

  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });

  const wide = window.matchMedia('(min-width: 721px)');
  const onWide = (m) => { if (m.matches) setOpen(false); };
  if (wide.addEventListener) wide.addEventListener('change', onWide);
  else if (wide.addListener) wide.addListener(onWide);
}
