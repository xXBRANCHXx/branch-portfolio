import { defineConfig } from 'vite';

// Relative base so the built site works at a domain root or under a sub-path.
// Bundled CSS/JS go to _app/ so they never mix with the images in public/assets/.
export default defineConfig({
  base: './',
  build: {
    assetsDir: '_app',
  },
});
