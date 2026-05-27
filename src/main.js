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


// ── TRIGGER-BASED SCROLL JACKING WITH VELOCITY ZOOM ─────────────
let currentSlide = 0;
let isAnimating = false;
let targetAsciiZoom = 0;
let currentAsciiZoom = 0;

function zoomLerpLoop() {
  if (currentSlide === 0 && !isAnimating) {
    if (Math.abs(targetAsciiZoom - currentAsciiZoom) > 0.001) {
      currentAsciiZoom += (targetAsciiZoom - currentAsciiZoom) * 0.08; // Lerp factor
      
      if (currentAsciiZoom >= 0.98) {
        currentAsciiZoom = 1;
        targetAsciiZoom = 1;
        portrait.setZoom(1);
        doLiquidTransition(1); // Proceed to About slide
      } else {
        portrait.setZoom(currentAsciiZoom);
        
        // Handle text fade based on zoom depth
        if (currentAsciiZoom > 0.05) {
          heroNameL.style.opacity = '0';
          heroNameR.style.opacity = '0';
          scrollCta.style.opacity = '0';
        } else if (portrait.entranceDone) {
          heroNameL.style.opacity = '1';
          heroNameR.style.opacity = '1';
          scrollCta.style.opacity = '1';
        }
      }
    }
  }
  requestAnimationFrame(zoomLerpLoop);
}
zoomLerpLoop();

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
  
  const dur = 1400; 
  const startTime = performance.now();
  
  function step(time) {
    const elapsed = time - startTime;
    let t = Math.min(1, Math.max(0, elapsed / dur));
    
    const ease = 1 - Math.pow(1 - t, 3);
    const shaderProg = Math.sin(ease * Math.PI);
    webgl.setTransitionProgress(shaderProg);
    
    if (t >= 0.5 && currentSlide !== targetIndex) {
      currentSlide = targetIndex;
      setSlideActive(currentSlide);
      
      if (isBackToHero) {
        targetAsciiZoom = 0;
        currentAsciiZoom = 0;
        portrait.setZoom(0);
        
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
  if (Math.abs(e.deltaY) < 15) return;

  // ── ON SLIDE 0 (ASCII HERO)
  if (currentSlide === 0) {
    if (e.deltaY > 0) {
      // Add velocity/momentum downwards
      targetAsciiZoom = Math.min(1.05, targetAsciiZoom + 0.15); 
    } else {
      // Add velocity/momentum upwards
      targetAsciiZoom = Math.max(0, targetAsciiZoom - 0.15);
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
