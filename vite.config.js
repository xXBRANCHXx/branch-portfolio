import { defineConfig } from 'vite';

// Relative paths so the built site works from any folder or host (Vercel, GitHub Pages, a zip).
// cssTarget keeps media queries in the older max-width form so iOS 15 and other pre-16.4 Safari versions get the mobile layout.
export default defineConfig({
  base: './',
  build: {
    assetsDir: 'app',
    cssTarget: ['chrome100', 'edge100', 'firefox100', 'safari15', 'ios15'],
  },
});
