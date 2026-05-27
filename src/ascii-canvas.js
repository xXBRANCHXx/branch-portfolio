// ================================================================
// ASCII Portrait Rendering Engine
// Renders a portrait image as a living field of characters
// ================================================================

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef@#$%&*';

export class AsciiPortrait {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });

    // Typography / grid
    this.fontSize = 10;
    this.cellW = 6;   // measured at init
    this.cellH = 12;

    // Grid data
    this.cols = 0;
    this.rows = 0;
    this.grid = null;       // [{char, r, g, b, bri}, ...]

    // Image source
    this.imgData = null;
    this.imgW = 0;
    this.imgH = 0;

    // Entrance animation
    this.entranceDuration = 3800; // ms
    this.entranceDone = false;
    this.startTime = 0;

    // Reveal origin (eye area)
    this.eyeCol = 0;
    this.eyeRow = 0;
    this.maxDist = 1;

    // Hover
    this.mouseX = -200;
    this.mouseY = -200;
    this.hoverRadius = 10; // grid cells

    // Ambient cycling
    this.cyclingRows = new Set();

    // State
    this.running = true;
    this.onEntranceDone = null;
  }

  /* ── INIT ────────────────────────────────────────────────────── */
  async init() {
    // Wait for the monospace font to be ready
    await document.fonts.ready;

    // Measure true character width
    this.ctx.font = `${this.fontSize}px 'JetBrains Mono', monospace`;
    const m = this.ctx.measureText('M');
    this.cellW = Math.ceil(m.width) || 6;

    // Load portrait image
    const img = new Image();
    img.src = '/portrait.png';
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => { console.error('Portrait load failed'); rej(); };
    });

    // Extract pixel data via offscreen canvas
    const oc = document.createElement('canvas');
    oc.width  = img.width;
    oc.height = img.height;
    const octx = oc.getContext('2d');
    octx.drawImage(img, 0, 0);
    this.imgData = octx.getImageData(0, 0, img.width, img.height);
    this.imgW = img.width;
    this.imgH = img.height;

    // Build initial grid + size canvas
    this.resize();
    this.bindEvents();

    // Start render loop
    this.startTime = performance.now();
    this._tick();

    // Entrance completion
    setTimeout(() => {
      this.entranceDone = true;
      this._startAmbientCycling();
      if (this.onEntranceDone) this.onEntranceDone();
    }, this.entranceDuration + 700);
  }

  /* ── RESIZE ──────────────────────────────────────────────────── */
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.canvas.width  = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Reset font after transform change
    this.ctx.font = `${this.fontSize}px 'JetBrains Mono', monospace`;
    this.ctx.textBaseline = 'top';

    this.cols = Math.ceil(w / this.cellW);
    this.rows = Math.ceil(h / this.cellH);

    this._buildGrid(w, h);
  }

  /* ── BUILD GRID ──────────────────────────────────────────────── */
  _buildGrid(vw, vh) {
    if (!this.imgData) return;

    // Scale image to fit viewport (cover ~88% width or ~94% height)
    const imgAsp = this.imgW / this.imgH;
    const vAsp   = vw / vh;
    let rw, rh;
    if (imgAsp > vAsp) { rw = vw * 0.88; rh = rw / imgAsp; }
    else               { rh = vh * 0.94; rw = rh * imgAsp; }
    const ox = (vw - rw) / 2;
    const oy = (vh - rh) / 2;

    const total = this.rows * this.cols;
    this.grid = new Array(total);

    const d = this.imgData.data;
    const imgW = this.imgW;
    const imgH = this.imgH;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const px = c * this.cellW;
        const py = r * this.cellH;

        // Map to image coordinates
        const ix = Math.floor(((px - ox) / rw) * imgW);
        const iy = Math.floor(((py - oy) / rh) * imgH);

        let char = ' ', cr = 0, cg = 0, cb = 0, bri = 0;

        if (ix >= 0 && ix < imgW && iy >= 0 && iy < imgH) {
          const idx = (iy * imgW + ix) << 2; // * 4
          cr  = d[idx];
          cg  = d[idx + 1];
          cb  = d[idx + 2];
          bri = (cr * 0.299 + cg * 0.587 + cb * 0.114) / 255;

          if (bri > 0.04) {
            // Stable character via position hash
            const seed = ((c * 7 + r * 13 + (c ^ r) * 5) & 0x7FFFFFFF) % CHARS.length;
            char = CHARS[seed];
          }
        }

        this.grid[r * this.cols + c] = { char, r: cr, g: cg, b: cb, bri };
      }
    }

    // Reveal origin at eye area
    this.eyeCol  = Math.floor(this.cols * 0.50);
    this.eyeRow  = Math.floor(this.rows * 0.37);
    this.maxDist = Math.sqrt(this.cols * this.cols + this.rows * this.rows);
  }

  /* ── EVENTS ──────────────────────────────────────────────────── */
  bindEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.mouseX = -200;
      this.mouseY = -200;
    });

    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => this.resize(), 120);
    });
  }

  /* ── AMBIENT CYCLING ─────────────────────────────────────────── */
  _startAmbientCycling() {
    const cycle = () => {
      if (!this.running) { setTimeout(cycle, 300); return; }

      if (this.cyclingRows.size < 8) {
        const start = Math.floor(Math.random() * this.rows);
        const count = 2 + Math.floor(Math.random() * 3);
        const rows  = [];
        for (let i = 0; i < count; i++) {
          const row = start + i;
          if (row < this.rows) { this.cyclingRows.add(row); rows.push(row); }
        }
        setTimeout(() => rows.forEach(r => this.cyclingRows.delete(r)),
                   140 + Math.random() * 180);
      }

      setTimeout(cycle, 70 + Math.random() * 260);
    };
    cycle();
  }

  /* ── RENDER LOOP ─────────────────────────────────────────────── */
  _tick() {
    if (!this.running) return;
    this._render();
    requestAnimationFrame(() => this._tick());
  }

  pause()  { this.running = false; }
  resume() { if (!this.running) { this.running = true; this._tick(); } }

  /* ── CORE RENDER ─────────────────────────────────────────────── */
  _render() {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const now = performance.now();
    const elapsed = now - this.startTime;

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);
    ctx.font = `${this.fontSize}px 'JetBrains Mono', monospace`;
    ctx.textBaseline = 'top';

    if (!this.grid) return;

    // Entrance progress
    const eT = this.entranceDone ? 1 : Math.min(1, elapsed / this.entranceDuration);
    const revealR = eT * this.maxDist * 0.85;

    // Mouse → grid coords
    const mCol = Math.floor(this.mouseX / this.cellW);
    const mRow = Math.floor(this.mouseY / this.cellH);
    const showHover = this.entranceDone && this.mouseX >= 0;

    const cols  = this.cols;
    const rows  = this.rows;
    const cellW = this.cellW;
    const cellH = this.cellH;
    const eyeC  = this.eyeCol;
    const eyeR  = this.eyeRow;
    const grid  = this.grid;
    const hRad  = this.hoverRadius;

    for (let r = 0; r < rows; r++) {
      const rowBase = r * cols;

      for (let c = 0; c < cols; c++) {
        const cell = grid[rowBase + c];
        const px = c * cellW;
        const py = r * cellH;

        let dChar = cell.char;
        let dr = cell.r, dg = cell.g, db = cell.b;
        let scale = 1;

        // ─── ENTRANCE ───────────────────────────────────────
        if (eT < 1) {
          const dc = c - eyeC;
          const drr = (r - eyeR) * 1.35;
          const dist = Math.sqrt(dc * dc + drr * drr);

          if (dist > revealR) {
            // Chaos zone – random chars EVERYWHERE
            dChar = CHARS[(Math.random() * CHARS.length) | 0];
            const ni  = 0.06 + Math.random() * 0.24;
            const fade = Math.max(0.12, 1 - eT * 0.55);
            dr = 0;
            dg = (175 * ni * fade) | 0;
            db = (35 * ni * fade) | 0;
          } else if (dist > revealR - 7) {
            // Transition edge – flicker
            if (cell.bri > 0.04) {
              if (Math.random() > 0.4) {
                dChar = CHARS[(Math.random() * CHARS.length) | 0];
                dg = Math.min(255, dg + 35);
              }
            } else {
              // Empty cell at transition edge: fading random
              dChar = CHARS[(Math.random() * CHARS.length) | 0];
              const ef = (dist - (revealR - 7)) / 7;
              dr = 0;
              dg = (70 * ef) | 0;
              db = 0;
            }
          } else {
            // Inside reveal radius
            if (cell.bri < 0.04) continue;
          }
        } else {
          // ─── POST-ENTRANCE ──────────────────────────────────
          if (cell.bri < 0.04) {
            // Even after entrance, show hover glow in dark areas
            if (!showHover) continue;
            const hdc = c - mCol;
            const hdr = r - mRow;
            const hd = Math.sqrt(hdc * hdc + hdr * hdr);
            if (hd >= hRad) continue;
            const hi = 1 - hd / hRad;
            if (hi < 0.25) continue;
            dChar = CHARS[(Math.random() * CHARS.length) | 0];
            dr = 0;
            dg = (65 * hi * hi) | 0;
            db = (15 * hi * hi) | 0;
            scale = 1 + hi * 0.4;
          }
        }

        // ─── AMBIENT CYCLING ────────────────────────────────
        if (this.entranceDone && this.cyclingRows.has(r) && cell.bri > 0.04) {
          dChar = CHARS[(Math.random() * CHARS.length) | 0];
        }

        // ─── HOVER EFFECTS (on visible portrait cells) ──────
        if (showHover && cell.bri >= 0.04) {
          const hdc = c - mCol;
          const hdr = r - mRow;
          const hd = Math.sqrt(hdc * hdc + hdr * hdr);
          if (hd < hRad) {
            const hi = 1 - hd / hRad;
            const hiSq = hi * hi;

            // Scramble
            if (Math.random() < hiSq * 0.65) {
              dChar = CHARS[(Math.random() * CHARS.length) | 0];
            }
            // Glow
            dg = Math.min(255, dg + (hiSq * 130) | 0);
            dr = Math.min(255, dr + (hiSq * 15) | 0);
            // Scale warp
            scale = 1 + hiSq * 0.55;
          }
        }

        // ─── SKIP INVISIBLE ─────────────────────────────────
        if (dChar === ' ') continue;
        if (dr === 0 && dg === 0 && db === 0) continue;

        // ─── DRAW ───────────────────────────────────────────
        ctx.fillStyle = `rgb(${dr},${dg},${db})`;

        if (scale > 1.03) {
          ctx.save();
          ctx.translate(px + cellW * 0.5, py + cellH * 0.5);
          ctx.scale(scale, scale);
          ctx.fillText(dChar, -cellW * 0.5, -cellH * 0.5);
          ctx.restore();
        } else {
          ctx.fillText(dChar, px, py);
        }
      }
    }
  }
}
