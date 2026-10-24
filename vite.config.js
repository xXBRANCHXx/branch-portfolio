import { defineConfig } from 'vite';
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

// Every page is its own HTML entry: the home page, one page per case study, and the 404 page.
const input = { main: `${root}index.html`, notFound: `${root}404.html` };
for (const slug of readdirSync(`${root}work`)) {
  if (existsSync(`${root}work/${slug}/index.html`)) input[`work-${slug}`] = `${root}work/${slug}/index.html`;
}

// Vercel serves 404.html at whatever URL was missing, so its links to scripts, styles and images
// must start from the site root instead of being relative like the other pages.
const absolute404 = {
  name: 'absolute-404-paths',
  enforce: 'post',
  generateBundle(_, bundle) {
    const page = bundle['404.html'];
    if (!page) return;
    page.source = String(page.source)
      .replace(/\b(href|src|poster)="\.?\/?(app|assets)\//g, '$1="/$2/')
      .replace(/url\((['"]?)\.?\/?(app|assets)\//g, 'url($1/$2/')
      .replace(/srcset="([^"]*)"/g, (m, list) => `srcset="${list.replace(/(^|,\s*)\.?\/?(app|assets)\//g, '$1/$2/')}"`);
  },
};

export default defineConfig({
  base: './',
  // Unknown URLs get a 404 in dev and preview, as on Vercel, instead of the home page.
  appType: 'mpa',
  plugins: [absolute404],
  build: {
    assetsDir: 'app',
    // Keep media queries in max-width form and the svh fallbacks for Safari 15.
    cssTarget: ['chrome100', 'edge100', 'firefox100', 'safari15', 'ios15'],
    rollupOptions: {
      input,
      // Code and styles shared by every page go in one "shared" file.
      output: { manualChunks: (id) => (id.includes('/src/modules/') || id.endsWith('/src/style.css') ? 'shared' : undefined) },
    },
  },
});
