/*
  Sand fill for the "Email me" / LinkedIn button in the contact section.

  The box is a grid of tiny cells. Hovering a half pours grains out from the cursor; they fan out
  and sink, filling from the bottom up under the cursor. Moving to the other half slides the
  settled sand across in a low wave, front edge first, and it never leaves the rectangle. Leaving
  the box lets the sand fall out of the bottom. The labels use mix-blend-mode: difference, so each
  letter flips from white to black exactly where the sand touches it.

  A pretend cursor plays this on a loop while the button is on screen, until a real pointer takes
  over. With reduced motion the half fills at once and there is no demo. Keyboard focus fills the
  focused half too.
*/
const GRAVITY = 2200;       // px/s², for sand falling out of the box
const FILL_TIME = 0.3;      // seconds to start pouring a whole half
const SWOOSH_TIME = 0.34;   // seconds for one grain to cross to the other half
const SWOOSH_SPREAD = 0.06; // the front of the sand sets off this long before the back
const SWOOSH_SHEAR = 0.08;  // the top sets off this long before the bottom, so it leans like a wave
const SETTLE = 0.35;        // seconds for a landed grain to blend into the fill
const SLOPE = 0.3;          // mound shape: px of height per px away from the cursor
const ROUGH = 4;            // px of unevenness in the sand surface
const FADE = 80;            // px below the box over which falling sand fades out
const SIDE_PAD = 24, BELOW = 100; // room for falling grains, px
const SAND = [242, 241, 238];
const TINTS = [[255, 253, 248], [242, 241, 238], [231, 226, 215], [219, 212, 198]];
const pickTint = () => { const r = Math.random(); return r < 0.3 ? 0 : r < 0.7 ? 1 : r < 0.9 ? 2 : 3; };
const POUR = 0, SWOOSH = 1, CATCH = 2, FALL = 3; // how a grain is moving
const SPAWN = 0, MOVE = 1, RELEASE = 2;          // scheduled jobs

const easeOut = (u) => 1 - (1 - u) ** 3;
const easeInOut = (u) => 0.5 - Math.cos(Math.PI * u) / 2;
const glide = (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
const now = () => performance.now() / 1000;

// The pretend cursor goes into "Email me", across to LinkedIn, back again, then out of the box so
// the sand drains, and repeats. [seconds, x, y] as fractions of the box; y > 1 is below it.
const PATH = [
  [0.0, 0.62, 2.1], [0.6, 0.62, 2.1],
  [1.1, 0.27, 0.62], [2.3, 0.27, 0.62],
  [2.75, 0.73, 0.5], [4.0, 0.73, 0.5],
  [4.45, 0.30, 0.45], [5.6, 0.30, 0.45],
  [6.1, 0.50, 2.2], [7.1, 0.62, 2.1],
];
const LOOP = PATH[PATH.length - 1][0];

function buffer(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  return { cv, cx: cv.getContext('2d'), img: new ImageData(w, h), w, h };
}

export function initSand(duo, { demo = true } = {}) {
  const canvas = duo.querySelector('canvas');
  const ctx = canvas && canvas.getContext('2d');
  if (!ctx || !('ImageData' in window)) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const halves = [...duo.querySelectorAll('[data-half]')];
  const ghost = duo.querySelector('.ghost');

  let dpr = 1, cell = 2, W = 0, H = 0;
  let cols = 0, rows = 0, n = 0, split = 0; // grid; columns < split are the left half
  let fill, landed, reserved;               // per cell: tint + 1, landing time, a grain is on its way
  let box, drops, padC = 0;                 // pixel buffers for the box and for falling sand
  let grains = [], jobs = [], head = 0;
  let active = -1, origin = { x: 0, y: 0 };
  let raf = 0, last = 0;

  duo.classList.add('is-live');

  const colOf = (i) => i % cols, rowOf = (i) => (i / cols) | 0;
  const cx = (i) => (colOf(i) + 0.5) * cell, cy = (i) => (rowOf(i) + 0.5) * cell;
  const sideOf = (i) => (colOf(i) < split ? 0 : 1);
  const range = (s) => (s ? [split, cols] : [0, split]);
  const clampX = (x) => Math.min(W - cell / 2, Math.max(cell / 2, x));
  const clampY = (y) => Math.min(H - cell / 2, Math.max(cell / 2, y));

  function setup() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cell = dpr >= 1.5 ? 1.5 : 2;
    W = duo.clientWidth; H = duo.clientHeight;
    if (!W || !H) return;
    // Both halves get the same number of columns, so sand maps one-to-one when it swooshes.
    cols = 2 * Math.ceil(W / cell / 2); rows = Math.ceil(H / cell); n = cols * rows;
    split = cols / 2;
    duo.style.setProperty('--split', `${split * cell}px`);
    fill = new Uint8Array(n); landed = new Float64Array(n); reserved = new Uint8Array(n);
    padC = Math.ceil(SIDE_PAD / cell);
    box = buffer(cols, rows);
    drops = buffer(cols + padC * 2, rows + Math.ceil(BELOW / cell));
    const cw = drops.w * cell, ch = drops.h * cell;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    canvas.style.width = `${cw}px`; canvas.style.height = `${ch}px`;
    canvas.style.left = `${-padC * cell}px`;
    grains = []; jobs = []; head = 0;
    if (active >= 0) fillInstantly(active);
    draw(now());
  }

  // ---- grains ---------------------------------------------------------------

  function send(g, kind, x, y, to, t, T, lift = 0) {
    Object.assign(g, { kind, sx: x, sy: y, tx: cx(to), ty: cy(to), to, t0: t, T, lift });
    reserved[to] = 1;
    return g;
  }

  const travel = (x, y, to, base) => base + Math.hypot(cx(to) - x, cy(to) - y) / 1600 + Math.random() * 0.06;

  function where(g, t) {
    if (g.kind === FALL) return [g.x, g.y];
    const u = Math.min(1, Math.max(0, (t - g.t0) / g.T));
    let x, y;
    if (g.kind === POUR) {          // fans out sideways, then sinks like poured sand
      x = g.sx + (g.tx - g.sx) * easeOut(u);
      y = g.sy + (g.ty - g.sy) * (g.ty > g.sy ? u * u : easeOut(u));
    } else if (g.kind === SWOOSH) { // slides across in a low wave
      x = g.sx + (g.tx - g.sx) * easeInOut(u);
      y = g.sy + (g.ty - g.sy) * u - g.lift * Math.sin(Math.PI * u);
    } else {                         // CATCH: steered to a new spot mid-air
      x = g.sx + (g.tx - g.sx) * easeOut(u);
      y = g.sy + (g.ty - g.sy) * easeOut(u);
    }
    return [clampX(x), clampY(y)];   // moving sand never leaves the rectangle
  }

  function steer(g, to, t) {
    const [x, y] = where(g, t);
    if (g.kind !== FALL) reserved[g.to] = 0;
    send(g, CATCH, x, y, to, t, travel(x, y, to, 0.12));
  }

  function fall(g, t) {
    if (g.kind === FALL) return;
    const [x, y] = where(g, t), [x0, y0] = where(g, t - 1 / 60);
    reserved[g.to] = 0;
    Object.assign(g, { kind: FALL, x, y, vx: (x - x0) * 18, vy: Math.max(0, (y - y0) * 60) });
  }

  // ---- planning -------------------------------------------------------------

  function cancelJobs() {
    for (let k = head; k < jobs.length; k++) if (jobs[k].kind !== RELEASE) reserved[jobs[k].to] = 0;
    jobs = []; head = 0;
  }

  // Fill half s: sand already in the box swooshes over, anything missing pours from (px, py).
  function pourInto(s, px, py) {
    if (reduceMotion.matches) { fillInstantly(s); draw(now()); return; }
    const t = now();
    cancelJobs();
    const [a, b] = range(s), [oa, ob] = range(1 - s);
    const free = (i) => i >= 0 && !fill[i] && !reserved[i];
    const across = (i) => rowOf(i) * cols + Math.min(b - 1, a + colOf(i) - oa); // same spot, other half
    const leftovers = [];

    // Grains in the air are steered across to the matching spot.
    for (const g of grains) {
      if (g.kind === FALL ? g.y >= H : sideOf(g.to) === s) continue;
      const want = g.kind === FALL ? -1 : across(g.to);
      if (g.kind !== FALL) reserved[g.to] = 0;
      if (free(want)) steer(g, want, t); else leftovers.push({ g });
    }

    // Settled sand slides across as one body, the edge nearest the divider first.
    for (let r = 0; r < rows; r++) {
      for (let c = oa; c < ob; c++) {
        const i = r * cols + c;
        if (!fill[i]) continue;
        const front = (s ? ob - 1 - c : c - oa) / (ob - oa); // 0 at the divider, 1 at the far wall
        const at = t + front * SWOOSH_SPREAD + (r / rows) ** 2 * SWOOSH_SHEAR + Math.random() * 0.008;
        const want = across(i);
        if (free(want)) { reserved[want] = 1; jobs.push({ at, kind: MOVE, from: i, to: want }); }
        else leftovers.push({ from: i, at });
      }
    }

    // Empty spots, lowest and nearest the cursor first.
    const targets = [];
    for (let r = 0; r < rows; r++) {
      for (let c = a; c < b; c++) {
        const i = r * cols + c;
        if (free(i)) targets.push([i, (H - cy(i)) + Math.abs(cx(i) - px) * SLOPE + Math.random() * ROUGH]);
      }
    }
    targets.sort((p, q) => p[1] - q[1]);
    let k = 0;
    for (const l of leftovers) {
      if (k < targets.length) {
        const to = targets[k++][0];
        if (l.g) steer(l.g, to, t);
        else { reserved[to] = 1; jobs.push({ at: l.at, kind: MOVE, from: l.from, to }); }
      } else if (l.g) fall(l.g, t);
      else jobs.push({ at: l.at, kind: RELEASE, from: l.from });
    }

    // Whatever is still empty is poured fresh from the cursor.
    const step = FILL_TIME / ((b - a) * rows);
    for (let q = 0; k < targets.length; q++) {
      const to = targets[k++][0];
      reserved[to] = 1;
      jobs.push({ at: t + q * step, kind: SPAWN, to });
    }
    jobs.sort((p, q) => p.at - q.at);
    kick();
  }

  // Let everything fall out of the bottom, lowest rows first.
  function drain() {
    active = -1;
    if (!n) return;
    if (reduceMotion.matches) { clearAll(); draw(now()); return; }
    const t = now();
    cancelJobs();
    for (const g of grains) fall(g, t);
    for (let i = 0; i < n; i++) {
      if (!fill[i]) continue;
      const fromBottom = (rows - 1 - rowOf(i)) / rows;
      jobs.push({ at: t + fromBottom * 0.22 + Math.random() * 0.03, kind: RELEASE, from: i });
    }
    jobs.sort((p, q) => p.at - q.at);
    kick();
  }

  function clearAll() {
    grains = []; cancelJobs();
    fill.fill(0); reserved.fill(0);
  }

  function fillInstantly(s) {
    clearAll();
    const [a, b] = range(s);
    for (let r = 0; r < rows; r++) {
      for (let c = a; c < b; c++) { fill[r * cols + c] = 2; landed[r * cols + c] = -1e9; }
    }
  }

  // ---- simulation -----------------------------------------------------------

  function runJobs(t) {
    while (head < jobs.length && jobs[head].at <= t) {
      const j = jobs[head++];
      if (j.kind === SPAWN) {
        const x = clampX(origin.x + (Math.random() - 0.5) * 10), y = clampY(origin.y + (Math.random() - 0.5) * 10);
        grains.push(send({ tint: pickTint() }, POUR, x, y, j.to, t, travel(x, y, j.to, 0.12)));
      } else if (j.kind === MOVE) {
        const f = fill[j.from];
        fill[j.from] = 0;
        grains.push(send({ tint: f ? f - 1 : pickTint() }, SWOOSH, cx(j.from), cy(j.from), j.to, t,
          SWOOSH_TIME + Math.random() * 0.012, Math.random() * 2));
      } else if (fill[j.from]) {
        grains.push({ kind: FALL, tint: fill[j.from] - 1, x: cx(j.from), y: cy(j.from),
          vx: (Math.random() - 0.5) * 50, vy: Math.random() * 60 });
        fill[j.from] = 0;
      }
    }
    if (head >= jobs.length) { jobs = []; head = 0; }
  }

  function move(t, dt) {
    let w = 0;
    for (const g of grains) {
      if (g.kind === FALL) {
        g.vy += GRAVITY * dt; g.x += g.vx * dt; g.y += g.vy * dt;
        if (g.y > H + FADE) continue;
      } else if (t - g.t0 >= g.T) {
        reserved[g.to] = 0;
        if (!fill[g.to]) { fill[g.to] = g.tint + 1; landed[g.to] = t; continue; }
        fall(g, t);
      }
      grains[w++] = g;
    }
    grains.length = w;
  }

  function draw(t) {
    if (!n) return false;
    let settling = false;
    const d = box.img.data;
    for (let i = 0, o = 0; i < n; i++, o += 4) {
      const f = fill[i];
      if (!f) { d[o + 3] = 0; continue; }
      const k = Math.min(1, (t - landed[i]) / SETTLE);
      if (k < 1) settling = true;
      const c = TINTS[f - 1];
      d[o] = c[0] + (SAND[0] - c[0]) * k;
      d[o + 1] = c[1] + (SAND[1] - c[1]) * k;
      d[o + 2] = c[2] + (SAND[2] - c[2]) * k;
      d[o + 3] = 255;
    }
    const e = drops.img.data;
    e.fill(0);
    for (const g of grains) {
      const [x, y] = where(g, t), c = TINTS[g.tint];
      if (g.kind === SWOOSH) {        // drawn as a short streak, so the moving sand reads as one body
        const [px] = where(g, t - 1 / 60), row = ((y / cell) | 0) * cols;
        for (let col = (Math.min(px, x) / cell) | 0, end = (Math.max(px, x) / cell) | 0; col <= end; col++) {
          const o = (row + col) * 4;
          d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
        }
      } else if (g.kind !== FALL) {
        const o = (((y / cell) | 0) * cols + ((x / cell) | 0)) * 4;
        d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
      } else {
        const bx = Math.floor(x / cell) + padC, by = Math.floor(y / cell);
        if (bx < 0 || bx >= drops.w || by < 0 || by >= drops.h) continue;
        const o = (by * drops.w + bx) * 4;
        e[o] = c[0]; e[o + 1] = c[1]; e[o + 2] = c[2];
        e[o + 3] = y > H ? 255 * Math.max(0, 1 - (y - H) / FADE) : 255;
      }
    }
    box.cx.putImageData(box.img, 0, 0);
    drops.cx.putImageData(drops.img, 0, 0);

    const ox = padC * cell;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.beginPath(); ctx.rect(ox, 0, W, H); ctx.clip();
    ctx.drawImage(box.cv, ox, 0, cols * cell, rows * cell);
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.rect(ox, 0, W, H + BELOW); ctx.clip();
    ctx.drawImage(drops.cv, 0, 0, drops.w * cell, drops.h * cell);
    ctx.restore();
    return settling;
  }

  function frame() {
    raf = 0;
    const t = now(), dt = Math.min(1 / 30, t - last);
    last = t;
    runJobs(t);
    move(t, dt);
    const settling = draw(t);
    if (grains.length || head < jobs.length || settling) raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (!raf) { last = now(); raf = requestAnimationFrame(frame); }
  }

  // ---- input ----------------------------------------------------------------

  function pointAt(x, y) {
    if (!n) return;
    origin = { x, y };
    const s = x < split * cell ? 0 : 1;
    if (s !== active) { active = s; pourInto(s, x, y); }
  }

  function point(e) {
    const r = duo.getBoundingClientRect();
    pointAt(e.clientX - r.left - duo.clientLeft, e.clientY - r.top - duo.clientTop);
  }

  // A real pointer takes over from the demo; the demo restarts shortly after it leaves.
  let resume = 0, inside = false, onScreen = false;
  duo.addEventListener('pointerenter', (e) => { inside = true; stopDemo(); point(e); });
  duo.addEventListener('pointermove', point);
  duo.addEventListener('pointerdown', point);
  duo.addEventListener('pointerleave', () => {
    inside = false;
    drain();
    clearTimeout(resume);
    resume = setTimeout(startDemo, 1500);
  });
  // Keyboard: focusing a half fills it, as if the pointer were in its middle.
  halves.forEach((half, s) => {
    half.addEventListener('focus', () => { stopDemo(); pointAt((s + 0.5) * (W / 2), H * 0.6); });
    half.addEventListener('blur', () => {
      requestAnimationFrame(() => {
        if (duo.contains(document.activeElement) || inside) return;
        drain();
        clearTimeout(resume);
        resume = setTimeout(startDemo, 1500);
      });
    });
  });

  // ---- demo -----------------------------------------------------------------

  let demoRun = 0;
  const canDemo = () => demo && ghost && onScreen && !inside && !reduceMotion.matches && !duo.contains(document.activeElement);

  function startDemo() {
    if (!canDemo()) return;
    const run = ++demoRun, start = now();
    let wasInside = false;
    ghost.classList.remove('is-off');
    const step = () => {
      if (run !== demoRun) return;
      const t = (now() - start) % LOOP;
      let k = 1;
      while (k < PATH.length - 1 && PATH[k][0] < t) k++;
      const [t0, x0, y0] = PATH[k - 1], [t1, x1, y1] = PATH[k];
      const u = glide(Math.min(1, Math.max(0, (t - t0) / (t1 - t0))));
      const x = (x0 + (x1 - x0) * u) * W, y = (y0 + (y1 - y0) * u) * H;
      ghost.style.transform = `translate(${x}px, ${y}px)`;
      const isInside = x >= 0 && x < W && y >= 0 && y < H;
      if (isInside) pointAt(x, y);
      else if (wasInside) drain();
      wasInside = isInside;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function stopDemo() {
    clearTimeout(resume);
    demoRun++;
    if (ghost) ghost.classList.add('is-off');
  }

  setup();
  if ('ResizeObserver' in window) new ResizeObserver(setup).observe(duo);
  else window.addEventListener('resize', setup);

  // Only run the demo while the button is on screen.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      if (onScreen) startDemo();
      else { stopDemo(); if (!inside) drain(); }
    }).observe(duo);
  }
}
