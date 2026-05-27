import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float time;
uniform float progress;
uniform vec3 color1;
uniform vec3 color2;
varying vec2 vUv;

// Classic liquid noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = vUv;
  
  // Noomo-style liquid plane warping
  // Progress determines the amplitude of the liquid displacement
  float dist = snoise(uv * 3.0 + time * 0.2) * 0.5;
  
  // Create a wave effect across the Y axis driven by progress
  float wave = sin(uv.y * 10.0 + time) * 0.05 * progress;
  
  // Warp UVs
  vec2 warpedUv = uv + vec2(dist * progress, dist * progress + wave);

  // Background ambient gradient transition
  vec3 col = mix(color1, color2, warpedUv.y + dist * 0.2);
  
  // Highlight edge on liquid tears
  float edge = smoothstep(0.4, 0.5, dist) * progress * 0.2;
  col += vec3(edge);

  // Deep dark base
  col *= 0.12; 

  gl_FragColor = vec4(col, 1.0);
}
`;

export class WebGLTransition {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    this.uniforms = {
      time: { value: 0 },
      progress: { value: 0 },
      color1: { value: new THREE.Color('#050505') }, // Black
      color2: { value: new THREE.Color('#101814') }  // Deep premium green/grey
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      depthWrite: false,
      depthTest: false
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);

    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    this.clock = new THREE.Clock();
    this.running = false;
  }

  resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  start() {
    this.running = true;
    this.render();
  }

  setTransitionProgress(p) {
    this.uniforms.progress.value = p;
  }

  render() {
    if (!this.running) return;
    this.uniforms.time.value = this.clock.getElapsedTime();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.render());
  }
}
