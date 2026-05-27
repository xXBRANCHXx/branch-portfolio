// ================================================================
// ASCII Portrait Engine – Ultra-High-Res & Crisp Vector Zoom
// ================================================================

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef@#$%&*';

export class AsciiPortrait {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });

    // Ultra-High Resolution typography
    this.baseFontSize = 3; 
    this.cellW = 1.9;
    this.cellH = 3.6;

    // Grid
    this.cols = 0;
    this.rows = 0;
    this.grid = null;

    // Image
    this.imgData = null;
    this.imgW = 0;
    this.imgH = 0;

    // Entrance
    this.entranceDuration = 2500; // Faster entrance
    this.entranceDone = false;
    this.startTime = 0;

    // Zoom state
    this.zoomScale = 1;
    this.zoomProgress = 0;
    this.opacity = 1;
    this.eyeCol = 0;
    this.eyeRow = 0;

    // Hover
    this.mouseX = -200;
    this.mouseY = -200;
    this.hoverRadius = 25; // slightly larger radius for tiny pixels

    // Ambient
    this.cyclingRows = new Set();
    this.running = true;
    this.onEntranceDone = null;
  }

  async init() {
    await document.fonts.ready;
    this.ctx.font = `${this.baseFontSize}px 'JetBrains Mono', monospace`;
    const m = this.ctx.measureText('M');
    this.cellW = Math.max(1.5, m.width);

    const img = new Image();
    img.src = '/portrait.png';
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
    });

    const oc = document.createElement('canvas');
    oc.width = img.width;
    oc.height = img.height;
    const octx = oc.getContext('2d');
    octx.drawImage(img, 0, 0);
    this.imgData = octx.getImageData(0, 0, img.width, img.height);
    this.imgW = img.width;
    this.imgH = img.height;

    this.resize();
    this.bindEvents();
    
    this.startTime = performance.now();
    this._tick();

    return new Promise(resolve => {
      setTimeout(() => {
        this.entranceDone = true;
        this._startAmbientCycling();
        if (this.onEntranceDone) this.onEntranceDone();
        resolve();
      }, this.entranceDuration + 200);
    });
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    
    this.dpr = dpr;

    this.cols = Math.ceil(w / this.cellW);
    this.rows = Math.ceil(h / this.cellH);

    this._buildGrid(w, h);
  }

  _buildGrid(vw, vh) {
    if (!this.imgData) return;

    const imgAsp = this.imgW / this.imgH;
    const vAsp = vw / vh;
    let rw, rh;
    if (imgAsp > vAsp) { rw = vw * 0.95; rh = rw / imgAsp; }
    else               { rh = vh * 0.95; rw = rh * imgAsp; }
    const ox = (vw - rw) / 2;
    const oy = (vh - rh) / 2;

    const total = this.rows * this.cols;
    this.grid = new Array(total);

    const d = this.imgData.data;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const px = c * this.cellW;
        const py = r * this.cellH;
        const ix = Math.floor(((px - ox) / rw) * this.imgW);
        const iy = Math.floor(((py - oy) / rh) * this.imgH);

        let char = ' ', cr = 0, cg = 0, cb = 0, bri = 0;

        if (ix >= 0 && ix < this.imgW && iy >= 0 && iy < this.imgH) {
          const idx = (iy * this.imgW + ix) << 2;
          // Gamma Boost: lighten the image so it's not too dark
          cr = Math.min(255, d[idx] * 1.5);
          cg = Math.min(255, d[idx+1] * 1.5);
          cb = Math.min(255, d[idx+2] * 1.5);
          
          bri = (cr*0.299 + cg*0.587 + cb*0.114) / 255;
          if (bri > 0.02) {
            const seed = ((c * 7 + r * 13 + (c ^ r) * 5) & 0x7FFFFFFF) % CHARS.length;
            char = CHARS[seed];
          }
        }
        this.grid[r * this.cols + c] = { char, r: cr, g: cg, b: cb, bri };
      }
    }

    this.eyeCol = Math.floor(this.cols * 0.50);
    this.eyeRow = Math.floor(this.rows * 0.37);
    this.maxDist = Math.sqrt(this.cols*this.cols + this.rows*this.rows);
  }

  bindEvents() {
    this.canvas.addEventListener('mousemove', e => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.mouseX = -200;
      this.mouseY = -200;
    });
    window.addEventListener('resize', () => this.resize());
  }

  _startAmbientCycling() {
    const cycle = () => {
      if (!this.running) { setTimeout(cycle, 300); return; }
      if (this.zoomScale > 2) { setTimeout(cycle, 100); return; } 
      
      if (this.cyclingRows.size < 16) {
        const start = Math.floor(Math.random() * this.rows);
        const count = 2 + Math.floor(Math.random() * 6);
        const rows = [];
        for (let i = 0; i < count; i++) {
          if (start + i < this.rows) {
            this.cyclingRows.add(start + i);
            rows.push(start + i);
          }
        }
        setTimeout(() => rows.forEach(r => this.cyclingRows.delete(r)), 100 + Math.random() * 200);
      }
      setTimeout(cycle, 40 + Math.random() * 200);
    };
    cycle();
  }

  _tick() {
    if (this.running) this._render();
    requestAnimationFrame(() => this._tick());
  }

  setZoom(progress) {
    this.zoomProgress = progress;
    this.zoomScale = 1 + (Math.pow(progress, 3) * 120); 
    this.opacity = Math.max(0, 1 - Math.pow(progress, 2.5));
  }

  _render() {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = this.dpr;
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w * dpr, h * dpr);
    
    if (!this.grid || this.opacity <= 0.01) return;

    const fontSize = this.baseFontSize * this.zoomScale * dpr;
    const cw = this.cellW * this.zoomScale * dpr;
    const ch = this.cellH * this.zoomScale * dpr;
    
    ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;
    ctx.textBaseline = 'top';
    ctx.globalAlpha = this.opacity;

    const eT = this.entranceDone ? 1 : Math.min(1, (performance.now() - this.startTime) / this.entranceDuration);
    const revealR = eT * this.maxDist * 0.85;

    const eyePxX = this.eyeCol * this.cellW;
    const eyePxY = this.eyeRow * this.cellH;
    const centerX = w / 2;
    const centerY = h / 2;

    const mCol = Math.floor(this.mouseX / this.cellW);
    const mRow = Math.floor(this.mouseY / this.cellH);
    const showHover = this.entranceDone && this.zoomScale < 1.5;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r * this.cols + c];
        if (!cell) continue;

        const rawX = c * this.cellW;
        const rawY = r * this.cellH;
        
        const x = ((rawX - eyePxX) * this.zoomScale) + centerX;
        const y = ((rawY - eyePxY) * this.zoomScale) + centerY;
        
        if (x * dpr < -cw*2 || x * dpr > w * dpr + cw || y * dpr < -ch*2 || y * dpr > h * dpr + ch) {
          continue; 
        }

        let dChar = cell.char;
        let dr = cell.r, dg = cell.g, db = cell.b;
        let charScale = 1;

        // Entrance
        if (eT < 1) {
          const dist = Math.sqrt((c - this.eyeCol)**2 + ((r - this.eyeRow)*1.35)**2);
          if (dist > revealR) {
            dChar = CHARS[(Math.random() * CHARS.length) | 0];
            const fade = Math.max(0.12, 1 - eT * 0.55);
            dr=0; dg=Math.floor((15 + Math.random()*150)*fade); db=0;
          } else if (dist > revealR - 10 && cell.bri > 0.02) {
            if (Math.random() > 0.4) {
              dChar = CHARS[(Math.random() * CHARS.length) | 0];
              dg = Math.min(255, dg + 50);
            }
          } else if (cell.bri < 0.02) continue;
        }

        // Ambient Cycle
        if (this.entranceDone && this.cyclingRows.has(r) && cell.bri > 0.02) {
          dChar = CHARS[(Math.random() * CHARS.length) | 0];
        }

        // Hover Effect: Raised without color change
        if (showHover && cell.bri >= 0.02) {
          const hd = Math.sqrt((c - mCol)**2 + (r - mRow)**2);
          if (hd < this.hoverRadius) {
            const hiSq = Math.pow(1 - hd/this.hoverRadius, 2);
            if (Math.random() < hiSq * 0.8) dChar = CHARS[(Math.random() * CHARS.length) | 0];
            // No color modification (dr, dg, db remain unchanged)
            charScale = 1 + hiSq * 1.5; // Scale up to 2.5x
            // Slightly brighter purely by making the canvas alpha artificially higher or drawing multiple times
            // but for performance, just scale is fine.
          }
        }

        if (dChar === ' ') continue;
        if (dr===0 && dg===0 && db===0) continue;

        ctx.fillStyle = `rgb(${dr},${dg},${db})`;
        
        if (charScale > 1.01) {
          ctx.save();
          ctx.translate(x * dpr + cw/2, y * dpr + ch/2);
          ctx.scale(charScale, charScale);
          // Drop shadow for raised effect
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 4;
          ctx.fillText(dChar, -cw/2, -ch/2);
          ctx.restore();
        } else {
          ctx.fillText(dChar, x * dpr, y * dpr);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}
