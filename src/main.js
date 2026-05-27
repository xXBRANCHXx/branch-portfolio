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
const loader = document.getElementById('loader');

heroNameL.querySelectorAll('span').forEach((s, i) => s.style.setProperty('--i', i));
heroNameR.querySelectorAll('span').forEach((s, i) => s.style.setProperty('--i', i));

// ── ENGINES ──────────────────────────────────────────────────────
const webgl = new WebGLTransition(webglCanvas);
webgl.start();

const portrait = new AsciiPortrait(asciiCanvas);

portrait.onEntranceDone = () => {
  heroNameL.style.opacity = '1';
  heroNameR.style.opacity = '1';
  scrollCta.style.opacity = '1';
};

portrait.init().then(() => {
  loader.style.opacity = '0';
  setTimeout(() => loader.style.visibility = 'hidden', 800);
}).catch(err => console.error('Portrait init failed:', err));


// ── TRIGGER-BASED SCROLL JACKING (NOOMO STYLE) ───────────────────
let currentSlide = 0;
let isAnimating = false;
let asciiZoom = 0;

function setSlideActive(index) {
  slides.forEach((s, i) => {
    if (i === index) s.classList.add('slide--active');
    else s.classList.remove('slide--active');
  });
}

// Ensure first slide is active on load
setSlideActive(0);

function doLiquidTransition(targetIndex, isBackToHero = false) {
  if (isAnimating) return;
  isAnimating = true;
  
  // Transition duration (smooth liquid warp)
  const dur = 1400; 
  const startTime = performance.now();
  
  function step(time) {
    const elapsed = time - startTime;
    let t = Math.min(1, Math.max(0, elapsed / dur));
    
    // Liquid easing (fast start, slow end)
    const ease = 1 - Math.pow(1 - t, 3);
    
    // Shader progress peaks in the middle
    const shaderProg = Math.sin(ease * Math.PI);
    webgl.setTransitionProgress(shaderProg);
    
    // Swap slides near the peak of the liquid warp
    if (t >= 0.5 && currentSlide !== targetIndex) {
      currentSlide = targetIndex;
      setSlideActive(currentSlide);
      
      if (isBackToHero) {
        asciiZoom = 0;
        portrait.setZoom(0);
        
        // Re-show text once we land back
        setTimeout(() => {
          heroNameL.style.opacity = '1';
          heroNameR.style.opacity = '1';
          scrollCta.style.opacity = '1';
        }, 500);
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

window.addEventListener('wheel', (e) => {
  if (isAnimating) return;
  
  // Prevent tiny trackpad scrolls from triggering wildly
  if (Math.abs(e.deltaY) < 15) return;

  // ── ON SLIDE 0 (ASCII HERO)
  if (currentSlide === 0) {
    if (e.deltaY > 0) {
      // Zoom in chunks for a satisfying dive
      asciiZoom += 0.20; 
      
      heroNameL.style.opacity = '0';
      heroNameR.style.opacity = '0';
      scrollCta.style.opacity = '0';

      if (asciiZoom >= 1) {
        asciiZoom = 1;
        portrait.setZoom(1);
        doLiquidTransition(1); // Proceed to About slide
      } else {
        portrait.setZoom(asciiZoom);
      }
    } else {
      asciiZoom = Math.max(0, asciiZoom - 0.20);
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
    if (currentSlide < slides.length - 1) {
      doLiquidTransition(currentSlide + 1);
    }
  } else {
    if (currentSlide === 1) {
      doLiquidTransition(0, true);
    } else {
      doLiquidTransition(currentSlide - 1);
    }
  }
}, { passive: false });

// Prevent mobile scroll drag
window.addEventListener('touchmove', e => { e.preventDefault(); }, { passive: false });
