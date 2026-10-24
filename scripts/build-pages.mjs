// Writes the case study pages (work/<slug>/index.html) and the 404 page from src/content/work.js.
// Run with `npm run pages`; `npm run build` runs it first. The generated HTML is committed so the
// pages also build with a plain `vite build`.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projects, site } from '../src/content/work.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad = (n) => String(n).padStart(2, '0');
const pct = (n) => `${Math.round(n * 1000) / 10}%`;

const icons = {
  whatsapp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 20.5l1.4-4.2A8.4 8.4 0 1 1 8 19.3z"/><path d="M9 9.5c.3 2 2.2 4.2 4.6 4.9l1.2-1.1 1.7.9-.4 1.6c-3.6.2-7.6-3.6-7.5-7.3l1.6-.4.8 1.7z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6.1 7-11.5a7 7 0 1 0-14 0C5 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6"/></svg>',
};

// P is the path back to the site root: '../../' from a case study, '/' from the 404 page
// (which Vercel serves at whatever URL was missing, so it needs absolute paths).
function head({ P, title, description, canonical, extra = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="Branch Vincent">
<meta name="theme-color" content="#0a0a0b">
<meta name="color-scheme" content="dark">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${canonical ? `<meta property="og:url" content="${canonical}">\n` : ''}<meta property="og:image" content="${site.url}assets/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Branch Vincent · Websites, built with intent.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${site.url}assets/og-image.jpg">
${canonical ? `<link rel="canonical" href="${canonical}">\n` : ''}<link rel="icon" href="${P}assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="${P}assets/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="${P}assets/apple-touch-icon.png">
<!-- fonts:start (self-hosted Lexend and Six Caps, latin subset) -->
<link rel="preload" as="font" href="${P}assets/fonts/sixcaps-latin.woff2" type="font/woff2" crossorigin>
<link rel="preload" as="font" href="${P}assets/fonts/lexend-latin.woff2" type="font/woff2" crossorigin>
<style>
  @font-face { font-family: 'Lexend'; font-style: normal; font-weight: 300 600; font-display: swap; src: url(${P}assets/fonts/lexend-latin.woff2) format('woff2'); }
  @font-face { font-family: 'Six Caps'; font-style: normal; font-weight: 400; font-display: block; src: url(${P}assets/fonts/sixcaps-latin.woff2) format('woff2'); }
</style>
<!-- fonts:end -->
<!-- The next case study loads ahead of the click, so the cover morph plays on the first visit too (Chrome and Edge). -->
<script type="speculationrules">
  {"prerender": [{"where": {"selector_matches": "a[data-vt-link]"}, "eagerness": "moderate"}],
   "prefetch": [{"where": {"selector_matches": "a[data-vt-link]"}, "eagerness": "eager"}]}
</script>
${extra}<script>
  // Set the animation classes before first paint so the page never flashes unstyled.
  // If the main script has not started within 4s, drop them and keep the page static.
  (function () {
    var d = document.documentElement;
    d.classList.add('has-js');
    setTimeout(function () {
      if (!d.classList.contains('js-live')) { d.classList.remove('has-js', 'motion'); d.classList.add('no-motion'); }
    }, 4000);
    try {
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window && 'animate' in Element.prototype) d.classList.add('motion');
    } catch (e) {}
    // Page-to-page transition: the image of the link that was clicked grows into this page's cover.
    addEventListener('pagereveal', function (e) {
      var el = e.viewTransition && document.querySelector('[data-vt-cover]');
      if (!el) return;
      el.style.viewTransitionName = 'case-cover';
      d.classList.add('vt-in');
      var clear = function () { el.style.viewTransitionName = ''; };
      e.viewTransition.finished.then(clear, clear);
    });
  })();
</script>
<link rel="stylesheet" href="${P}src/style.css">
<link rel="stylesheet" href="${P}src/case.css">
</head>`;
}

function header(P, { here = '', talk = '#contact' } = {}) {
  return `<a class="skip" href="#main">Skip to content</a>
<div class="progress" aria-hidden="true"></div>

<header class="site-header" id="site-header">
  <a class="wordmark" href="${P}" aria-label="Branch Vincent, home">BRANCH VINCENT</a>
  <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">MENU</button>
  <nav class="site-nav" id="site-nav" aria-label="Main">
    <ul class="nav-links">
      <li><a href="${P}#work" style="--i: 0"${here === 'work' ? ' aria-current="true"' : ''}>Work</a></li>
      <li><a href="${P}#approach" style="--i: 1">Approach</a></li>
      <li><a href="${P}#about" style="--i: 2">About</a></li>
      <li><a class="pill" href="${talk}" style="--i: 3">Let<span class="apos">’</span>s talk</a></li>
    </ul>
  </nav>
</header>`;
}

function contact() {
  return `  <section class="case-contact" id="contact" aria-labelledby="contact-title">
    <h2 class="display" id="contact-title" data-split="chars">HAVE A PROJECT?</h2>
    <p class="case-contact-lede reveal">Tell me what you’re building. I’ll tell you how I’d approach it.</p>
    <a class="contact-email" href="mailto:${site.email}" data-magnetic>${site.email}</a>
    <ul class="contact-meta">
      <li><a href="${site.whatsapp.href}" target="_blank" rel="noopener">
        ${icons.whatsapp}
        WhatsApp ${esc(site.whatsapp.label)}<span class="visually-hidden"> (opens in a new tab)</span></a></li>
      <li><a href="${site.instagram.href}" target="_blank" rel="noopener">
        ${icons.instagram}
        Instagram ${esc(site.instagram.label)}<span class="visually-hidden"> (opens in a new tab)</span></a></li>
      <li><span>
        ${icons.pin}
        Yogyakarta, Indonesia</span></li>
    </ul>
  </section>`;
}

function footer(P) {
  return `<footer class="site-footer">
  <span>© <span id="year">2026</span> Branch Vincent</span>
  <a href="${P}">Websites, built with intent.</a>
  <a href="#top">Back to top <span aria-hidden="true">↑</span></a>
</footer>`;
}

const img = (P, p, file, { w, h, alt = '', lazy = true, cls = '', extra = '' }) =>
  `<img${cls ? ` class="${cls}"` : ''} src="${P}assets/work/${p.slug}/${file}.webp" alt="${esc(alt)}" width="${w}" height="${h}"${lazy ? ' loading="lazy"' : ''} decoding="async"${extra}>`;

function tour(P, p) {
  const n = p.tour.slides.length;
  // Each new screen slides in over its own stretch of the scroll; the gaps between are rests.
  const range = (k) => `--a: ${pct((k - 0.32) / n)}; --b: ${pct((k + 0.32) / n)}`;
  const slides = (kind, w, h, suffix) => p.tour.slides.map((_, i) => img(P, p, `screen-${kind}${i + 1}`, {
    w, h, alt: p.tour.alt[i] + suffix, cls: 'tour-slide', extra: i ? ` style="${range(i)}"` : '',
  })).join('\n          ');
  const browser = p.tour.desktop ? `
      <div class="frame frame-browser">
        <div class="frame-bar" aria-hidden="true"><span class="frame-dots"><i></i><i></i><i></i></span><span class="frame-url">${esc(p.domain)}</span></div>
        <div class="frame-screen" role="group" aria-label="${esc(p.domain)} on a laptop, ${n} screens" tabindex="0">
          ${slides('d', 1440, 900, '')}
        </div>
      </div>` : '';
  const phone = `
      <div class="frame frame-phone">
        <div class="frame-screen" role="group" aria-label="${esc(p.tour.desktop ? `${p.domain} on a phone` : p.tour.label)}, ${n} screens" tabindex="0">
          ${slides('m', 780, 1688, p.tour.desktop ? ', on a phone' : '')}
        </div>
      </div>`;
  return `  <section class="tour${p.tour.desktop ? '' : ' tour-phone'}" aria-labelledby="tour-title" style="--n: ${n}">
    <div class="tour-sticky">
      <div class="tour-head">
        <h2 class="label" id="tour-title" data-scramble>${esc(p.tour.label || 'On screen')}</h2>
        <ol class="tour-captions" aria-hidden="true">
          ${p.tour.slides.map((s, i) => `<li${i ? '' : ' class="is-active"'}><span>${pad(i + 1)}</span>${esc(s)}</li>`).join('\n          ')}
        </ol>
      </div>
      <div class="tour-stage">${browser}${phone}
      </div>
    </div>
  </section>`;
}

function gallery(P, p) {
  const items = p.gallery.map((g) => {
    if (g.type === 'video') {
      return `<figure class="g-item g-${g.size} wipe">
        <video class="g-video" src="${P}assets/work/${p.slug}/${g.file}.mp4" poster="${P}assets/work/${p.slug}/${g.poster}.webp" width="${g.w}" height="${g.h}" muted loop playsinline controls preload="none" aria-label="${esc(g.label)}"></video>
      </figure>`;
    }
    if (g.type === 'logos') {
      return `<ul class="g-item g-${g.size} g-logos" aria-label="Products">
        ${g.items.map((l, i) => `<li class="reveal" style="--d: ${i * 100}ms">${img(P, p, l.file, { w: l.w, h: l.h, alt: l.alt })}</li>`).join('\n        ')}
      </ul>`;
    }
    return `<figure class="g-item g-${g.size} wipe">
        ${img(P, p, g.file, { w: g.w, h: g.h, alt: g.alt })}
      </figure>`;
  });
  return `  <section class="case-gallery container" aria-label="Gallery">
    <div class="gallery-grid">
      ${items.join('\n      ')}
    </div>
    <p class="gallery-caption reveal">${esc(p.galleryCaption)}</p>
  </section>`;
}

function casePage(p, i) {
  const P = '../../';
  const total = pad(projects.length);
  const next = projects[(i + 1) % projects.length];
  const q = p.quote;
  return `${head({
    P,
    title: `${p.name} case study · Branch Vincent`,
    description: p.lede,
    canonical: `${site.url}work/${p.slug}/`,
    extra: '<link rel="expect" href="#case-cover" blocking="render">\n',
  })}
<body class="page-case">
${header(P, { here: 'work' })}

<main id="main">
  <article class="case" aria-labelledby="case-title">
  <section class="case-hero" id="top">
    <div class="case-hero-text">
      <p class="case-kicker label"><a class="back" href="${P}#work"><span aria-hidden="true">←</span> All work</a><span>Case study ${pad(i + 1)} / ${total}</span></p>
      <h1 class="case-title display" id="case-title" data-split="chars">${esc(p.name.toUpperCase())}</h1>
      <p class="case-lede reveal" style="--d: 200ms">${esc(p.lede)}</p>
      <dl class="case-meta reveal" style="--d: 320ms">
        <div><dt>Role</dt><dd>${esc(p.role)}</dd></div>
        <div><dt>Scope</dt><dd>${p.scope.map(esc).join(' · ')}</dd></div>
        <div><dt>Year</dt><dd>${esc(p.year)}</dd></div>
        <div><dt>Live site</dt><dd><a class="visit" href="${p.url}" target="_blank" rel="noopener" data-magnetic>${esc(p.domain)} ${icons.out}<span class="visually-hidden"> (opens in a new tab)</span></a></dd></div>
      </dl>
    </div>
    <figure class="case-cover" id="case-cover">
      <div class="case-cover-media" data-vt-cover>
        <div class="case-cover-inner" data-speed="0.04">
          ${img(P, p, 'cover', { w: p.cover.w, h: p.cover.h, alt: p.cover.alt, lazy: false, extra: ' fetchpriority="high"' })}
          <div class="blue-square" style="left: ${p.square.left}%; top: ${p.square.top}%; width: ${p.square.width}%; height: ${p.square.height}%" aria-hidden="true"></div>
        </div>
      </div>
    </figure>
  </section>

  <section class="case-section container" aria-labelledby="brief-title">
    <h2 class="label case-side" id="brief-title" data-scramble>The brief</h2>
    <div class="case-body">
      ${p.brief.map((t, k) => `<p class="${k ? 'case-text' : 'case-big'} reveal">${esc(t)}</p>`).join('\n      ')}
    </div>
  </section>

${p.tour ? tour(P, p) : ''}

  <section class="case-section container case-built" aria-labelledby="built-title">
    <h2 class="display case-side" id="built-title" data-split="chars">WHAT I BUILT</h2>
    <ol class="built-list">
      ${p.built.map((b, k) => `<li class="reveal" style="--d: ${(k % 2) * 120}ms"><span class="built-num" aria-hidden="true">${pad(k + 1)}</span><div><h3>${esc(b.title)}</h3><p>${esc(b.text)}</p></div></li>`).join('\n      ')}
    </ol>
  </section>

  <section class="case-quote" aria-label="In the site’s words">
    <figure class="container">
      <blockquote>
        <p class="display" data-split="chars"${q.original ? ' lang="id"' : ''}>${esc((q.original || q.text).toUpperCase())}</p>
      </blockquote>
      <figcaption class="reveal">${q.original ? `<span class="quote-gloss">“${esc(q.text)}”</span>` : ''}<span class="label">${esc(q.source)}</span></figcaption>
    </figure>
  </section>

${p.stats ? `  <section class="case-stats container" aria-labelledby="stats-title">
    <h2 class="visually-hidden" id="stats-title">By the numbers</h2>
    <ul class="stats">
      ${p.stats.map((s, k) => `<li class="reveal" style="--d: ${k * 90}ms"><span class="stat-value display" data-count="${s.value}">${s.value}</span><span class="stat-label">${esc(s.label)}</span></li>`).join('\n      ')}
    </ul>
  </section>
` : ''}
${gallery(P, p)}

  <section class="case-section container case-stack" aria-labelledby="stack-title">
    <h2 class="label case-side" id="stack-title" data-scramble>Built with</h2>
    <ul class="skills reveal">
      ${p.stack.map((s) => `<li>${esc(s)}</li>`).join('\n      ')}
    </ul>
  </section>
  </article>

  <nav class="next" aria-label="Next case study">
    <a class="next-link" href="../${next.slug}/" data-cursor="NEXT" data-vt-link>
      <span class="next-label label">Next project · ${pad(projects.indexOf(next) + 1)}</span>
      <span class="next-name display">${esc(next.name.toUpperCase())} ${icons.next}</span>
      <span class="next-domain">${esc(next.domain)}</span>
      <span class="next-media" aria-hidden="true" data-vt-media>${img(P, next, 'cover-480', { w: next.cover.w, h: next.cover.h })}</span>
    </a>
  </nav>

${contact()}
</main>

${footer(P)}

<script type="module" src="${P}src/page.js"></script>
</body>
</html>
`;
}

function notFound() {
  const P = '/';
  return `${head({
    P,
    title: 'Page not found · Branch Vincent',
    description: 'This page doesn’t exist. The work is still here.',
  })}
<body class="page-lost">
${header(P, { talk: `${P}#contact` })}

<main id="main">
  <section class="lost" aria-labelledby="lost-title" id="top">
    <div class="values-wave lost-wave" aria-hidden="true"></div>
    <div class="lost-inner">
      <p class="label" data-scramble>Error 404</p>
      <h1 class="lost-title display" id="lost-title" aria-label="404, page not found"><span aria-hidden="true">4</span><span class="lost-zero" aria-hidden="true">0<span class="blue-square"></span></span><span aria-hidden="true">4</span></h1>
      <p class="lost-lede reveal">This page doesn’t exist, or it moved. The work is still here.</p>
      <ul class="lost-links reveal" style="--d: 120ms">
        <li><a class="pill-link pill-solid" href="${P}">Back to home</a></li>
        ${projects.map((p) => `<li><a class="pill-link" href="${P}work/${p.slug}/">${esc(p.name)}</a></li>`).join('\n        ')}
      </ul>
    </div>
  </section>
</main>

${footer(P)}

<script type="module" src="${P}src/page.js"></script>
</body>
</html>
`;
}

// Remove pages for projects that were renamed or dropped from work.js, so they stop deploying.
// The home rows are written by hand, so stop first if one still links to a slug that's gone.
const slugs = new Set(projects.map((p) => p.slug));
mkdirSync(join(root, 'work'), { recursive: true });
for (const [, slug] of readFileSync(join(root, 'index.html'), 'utf8').matchAll(/href="work\/([^/"]+)\//g)) {
  if (!slugs.has(slug)) throw new Error(`index.html links to work/${slug}/, which is not a project in src/content/work.js`);
}
for (const entry of readdirSync(join(root, 'work'), { withFileTypes: true })) {
  if (entry.isDirectory() && !slugs.has(entry.name)) rmSync(join(root, 'work', entry.name), { recursive: true });
}

projects.forEach((p, i) => {
  const dir = join(root, 'work', p.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), casePage(p, i));
});
writeFileSync(join(root, '404.html'), notFound());
console.log(`Wrote ${projects.length} case studies and 404.html`);
