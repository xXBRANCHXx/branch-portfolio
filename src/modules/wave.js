// Live version of the binary-wave graphic: a ribbon of 0s and 1s that rises to the right
// and ripples slowly. Glyphs near the pointer are pushed aside, brighten and flip.
import { clamp, lerp } from './util.js';

const COLS = 44;
const ROWS = 15;

export function initWave(container, { animate = true } = {}) {
  const img = container.querySelector('img');
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  container.appendChild(canvas);
  if (img) img.hidden = true;

  const bits = Array.from({ length: COLS * ROWS }, () => (Math.random() < 0.5 ? '0' : '1'));
  const heat = new Float32Array(COLS * ROWS);
  let width = 0;
  let height = 0;
  let dpr = 1;
  let running = false;
  let visible = false;
  let raf = 0;
  const pointer = { x: -9999, y: -9999, active: false };

  const resize = () => {
    const rect = container.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    // The canvas is absolutely positioned over its box (see CSS), so sizing it never feeds back into the box size.
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    draw(performance.now());
  };

  // Centre line of the ribbon and its slope, for u in [0, 1].
  const centre = (u, t) => {
    const rise = u * u * (3 - 2 * u); // smoothstep
    const x = width * (0.04 + 0.92 * u);
    const y = height * (0.86 - 0.72 * rise) + Math.sin(u * 7 + t * 0.9) * height * 0.035;
    return { x, y };
  };

  function draw(now) {
    const t = now / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!width || !height) return;
    const radius = Math.max(70, width * 0.12);
    // Set the font once per frame and scale each glyph with the transform: changing ctx.font
    // and building a new colour string for every one of the 660 glyphs is the expensive part.
    ctx.font = '500 20px ui-monospace, Menlo, Consolas, monospace';

    for (let c = 0; c < COLS; c++) {
      const u = c / (COLS - 1);
      const p = centre(u, t);
      const q = centre(Math.min(1, u + 0.01), t);
      const slope = Math.atan2(q.y - p.y, q.x - p.x);
      const band = height * lerp(0.42, 0.12, u); // ribbon gets narrower as it rises
      const size = lerp(22, 9, u) * (width / 820);

      for (let r = 0; r < ROWS; r++) {
        const v = r / (ROWS - 1);
        const idx = r * COLS + c;
        let x = p.x - Math.sin(slope) * (v - 0.5) * band * 0.35 + (v - 0.5) * width * 0.04 * (1 - u);
        let y = p.y + (v - 0.5) * band + Math.sin(v * 5 + t * 1.3 + u * 5) * height * 0.012;

        let glow = 0;
        if (pointer.active) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const d = Math.hypot(dx, dy);
          if (d < radius) {
            const f = 1 - d / radius;
            const push = f * f * 26;
            x += (dx / (d || 1)) * push;
            y += (dy / (d || 1)) * push;
            glow = f;
            if (f > 0.6 && Math.random() < 0.04) bits[idx] = bits[idx] === '0' ? '1' : '0';
          }
        }
        heat[idx] = Math.max(glow, heat[idx] * 0.94);

        const edge = 1 - Math.abs(v - 0.5) * 2; // brighter in the middle of the ribbon
        const alpha = clamp((0.18 + 0.7 * edge) * (0.55 + 0.45 * (1 - u)) + heat[idx] * 0.8, 0, 1);
        const s = size * (0.8 + 0.4 * v) * (1 + heat[idx] * 0.35);

        const k = (dpr * s) / 20;
        ctx.setTransform(k, 0, 0, k, x * dpr, y * dpr);
        ctx.rotate(slope + 0.35);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = heat[idx] > 0.05 ? '#8fa9ff' : '#f2f1ee';
        ctx.fillText(bits[idx], 0, 0);
      }
    }
  }

  const loop = (now) => {
    draw(now);
    if (running) raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (!animate || running || !visible || document.hidden) return;
    running = true;
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  new ResizeObserver(resize).observe(container);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
    else stop();
  }).observe(container);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  if (animate) {
    // The canvas sits under the text, so listen on the whole section.
    const section = container.closest('section') || container;
    section.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    }, { passive: true });
    section.addEventListener('pointerleave', () => { pointer.active = false; });
  }

  resize();
}
