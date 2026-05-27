import { createIcons, LayoutTemplate, MousePointerClick, Cpu, Gem, TrendingUp, Palette, Mail, MessageCircle, Video } from 'lucide';
import { AsciiPortrait } from './ascii-canvas.js';
import { WebGLTransition } from './webgl-transition.js';

// ── INIT ICONS ───────────────────────────────────────────────────
createIcons({
  icons: {
    LayoutTemplate, MousePointerClick, Cpu, Gem, TrendingUp, Palette, Mail, MessageCircle, Video
  }
});

// ── DOM REFS ─────────────────────────────────────────────────────
const slides = Array.from(document.querySelectorAll('.slide'));
const asciiCanvas = document.getElementById('ascii-canvas');
const webglCanvas = document.getElementById('webgl-canvas');
const heroNameL = document.getElementById('hero-name-left');
const heroNameR = document.getElementById('hero-name-right');
const scrollCta = document.querySelector('.scroll-cta');
const scrollProxy = document.getElementById('scroll-proxy');
const loader = document.getElementById('loader');

// Set stagger indices
heroNameL.querySelectorAll('span').forEach((s, i) => s.style.setProperty('--i', i));
heroNameR.querySelectorAll('span').forEach((s, i) => s.style.setProperty('--i', i));

// ── SET UP SCROLL PROXY HEIGHT ───────────────────────────────────
// 100vh per slide transition
scrollProxy.style.height = `${slides.length * 100}vh`;

// ── ENGINES ──────────────────────────────────────────────────────
const webgl = new WebGLTransition(webglCanvas);
webgl.start();

const portrait = new AsciiPortrait(asciiCanvas);

portrait.onEntranceDone = () => {
  if (window.scrollY < 10) {
    heroNameL.style.opacity = '1';
    heroNameR.style.opacity = '1';
    scrollCta.style.opacity = '1';
  }
};

// Start generation and hide loader when done
portrait.init().then(() => {
  loader.style.opacity = '0';
  setTimeout(() => loader.style.visibility = 'hidden', 800);
}).catch(err => console.error('Portrait init failed:', err));

// ── CONTINUOUS SCROLL SCRUBBING ──────────────────────────────────
let ticking = false;

function updateScroll() {
  const vh = window.innerHeight;
  const scrollY = window.scrollY;
  // Progress in terms of slides (0.0 to 5.0)
  const totalProgress = Math.max(0, scrollY / vh);
  
  const currentIndex = Math.min(slides.length - 1, Math.floor(totalProgress));
  const nextIndex = Math.min(slides.length - 1, currentIndex + 1);
  const fraction = totalProgress % 1;

  // 1. ASCII ZOOM (Slide 0 -> 1)
  if (totalProgress < 1) {
    portrait.setZoom(fraction);
    if (portrait.entranceDone) {
      const textFade = Math.max(0, 1 - fraction * 4);
      heroNameL.style.opacity = textFade;
      heroNameR.style.opacity = textFade;
      scrollCta.style.opacity = textFade;
    }
  } else if (portrait.zoomProgress !== 1) {
    portrait.setZoom(1);
    heroNameL.style.opacity = '0';
    heroNameR.style.opacity = '0';
    scrollCta.style.opacity = '0';
  }

  // 2. WEBGL CHROMATIC WARP 
  // We warp the background continuously between boundaries.
  // Sin wave peaks at 0.5 fraction (mid-transition)
  const shaderProgress = Math.sin(fraction * Math.PI);
  webgl.setTransitionProgress(shaderProgress);

  // 3. HTML SLIDE VISIBILITY (Crossfade & Skew)
  slides.forEach((slide, i) => {
    const inner = slide.querySelector('.slide__inner');
    
    // Exact match
    if (i === currentIndex) {
      slide.style.visibility = 'visible';
      slide.style.opacity = 1 - fraction; // fade out as we scroll down
      slide.style.pointerEvents = fraction < 0.1 ? 'auto' : 'none';
      if (inner) {
        // Subtle skew and scale down as it exits
        inner.style.transform = `scale(${1 - fraction * 0.1}) translateY(${fraction * 100}px) skewY(${fraction * 5}deg)`;
        inner.style.opacity = 1 - fraction;
      }
    } 
    // Next slide incoming
    else if (i === nextIndex && fraction > 0) {
      slide.style.visibility = 'visible';
      slide.style.opacity = fraction; // fade in
      slide.style.pointerEvents = fraction > 0.9 ? 'auto' : 'none';
      if (inner) {
        // Skew and scale up as it enters
        const invFrac = 1 - fraction;
        inner.style.transform = `scale(${1 + invFrac * 0.1}) translateY(${-invFrac * 100}px) skewY(${-invFrac * 5}deg)`;
        inner.style.opacity = fraction;
      }
    } 
    // Hide all others
    else {
      slide.style.visibility = 'hidden';
      slide.style.opacity = 0;
      slide.style.pointerEvents = 'none';
    }
  });

  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(updateScroll);
    ticking = true;
  }
}, { passive: true });

// Initialize initial state
updateScroll();
