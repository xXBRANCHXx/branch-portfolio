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
const slides = document.querySelectorAll('.slide');
const asciiCanvas = document.getElementById('ascii-canvas');
const webglCanvas = document.getElementById('webgl-canvas');
const heroNameL = document.getElementById('hero-name-left');
const heroNameR = document.getElementById('hero-name-right');
const scrollCta = document.querySelector('.scroll-cta');

// Set stagger indices
heroNameL.querySelectorAll('span').forEach((s, i) => s.style.setProperty('--i', i));
heroNameR.querySelectorAll('span').forEach((s, i) => s.style.setProperty('--i', i));

// ── ENGINES ──────────────────────────────────────────────────────
const portrait = new AsciiPortrait(asciiCanvas);
const webgl = new WebGLTransition(webglCanvas);
webgl.start();

portrait.onEntranceDone = () => {
  heroNameL.style.opacity = '1';
  heroNameR.style.opacity = '1';
  scrollCta.style.opacity = '1';
};

portrait.init().catch(err => console.error('Portrait init failed:', err));

// ── SCROLL JACKING & TRANSITIONS ─────────────────────────────────
let currentSlide = 0;
let isAnimating = false;
let asciiZoom = 0; // 0 to 1

function setSlideActive(index) {
  slides.forEach((s, i) => {
    if (i === index) s.classList.add('slide--active');
    else s.classList.remove('slide--active');
  });
}

function doWebGLTransition(targetIndex, isBackToHero = false) {
  isAnimating = true;
  
  // Transition duration
  const dur = 1200; 
  const startTime = performance.now();
  
  function step(time) {
    const elapsed = time - startTime;
    let t = Math.min(1, elapsed / dur);
    
    // Smoothstep easing
    const ease = t * t * (3 - 2 * t);
    
    // Shader progress goes 0 -> 1 -> 0 (peak in the middle)
    const shaderProg = Math.sin(ease * Math.PI);
    webgl.setTransitionProgress(shaderProg);
    
    // Swap slides at the peak
    if (t >= 0.5 && currentSlide !== targetIndex) {
      currentSlide = targetIndex;
      setSlideActive(currentSlide);
      
      if (isBackToHero) {
        asciiZoom = 0;
        portrait.setZoom(0);
        portrait.opacity = 1;
      }
    }
    
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      isAnimating = false;
      webgl.setTransitionProgress(0);
    }
  }
  
  requestAnimationFrame(step);
}

// Wheel Event Handling
window.addEventListener('wheel', (e) => {
  if (isAnimating) return;
  
  // Prevent tiny trackpad scrolls from triggering rapidly
  if (Math.abs(e.deltaY) < 15) return;

  // ── ON SLIDE 0 (ASCII HERO)
  if (currentSlide === 0) {
    if (e.deltaY > 0) {
      // Zoom In
      asciiZoom += 0.08;
      
      // Fade out text immediately on scroll down
      heroNameL.style.opacity = '0';
      heroNameR.style.opacity = '0';
      scrollCta.style.opacity = '0';

      if (asciiZoom >= 1) {
        asciiZoom = 1;
        portrait.setZoom(1);
        doWebGLTransition(1); // Proceed to About
      } else {
        portrait.setZoom(asciiZoom);
      }
    } else {
      // Zoom Out
      asciiZoom = Math.max(0, asciiZoom - 0.08);
      portrait.setZoom(asciiZoom);
      if (asciiZoom === 0 && portrait.entranceDone) {
        heroNameL.style.opacity = '1';
        heroNameR.style.opacity = '1';
        scrollCta.style.opacity = '1';
      }
    }
    return;
  }
  
  // ── ON INNER SLIDES
  if (e.deltaY > 0) {
    // Next slide
    if (currentSlide < slides.length - 1) {
      doWebGLTransition(currentSlide + 1);
    }
  } else {
    // Previous slide
    if (currentSlide === 1) {
      // Back to Hero
      doWebGLTransition(0, true);
    } else {
      doWebGLTransition(currentSlide - 1);
    }
  }
}, { passive: false });

// Disable native scroll dragging on touch (optional depending on device targets, basic block)
window.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
