import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  MathUtils,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from "three";
import type { Half } from "@/data/projects";
import { createGlowComposer } from "@/lib/three/glow";

export type ShiftSkyHandle = { setHalf(half: Half, animate: boolean): void; dispose(): void };
type Vec3 = [number, number, number];

const TAU = Math.PI * 2;
const bell = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

// sun: a ring, twelve rays of two lengths, and a little dust inside (unit radius; rays reach 1.86)
function sunPoint(): Vec3 {
  const u = Math.random();
  if (u < 0.46) {
    const a = Math.random() * TAU, r = 1 + bell() * 0.035;
    return [r * Math.cos(a), r * Math.sin(a), bell() * 0.06];
  }
  if (u < 0.96) {
    const k = Math.floor(Math.random() * 12), a = (k / 12) * TAU + Math.PI / 12, d = 1.3 + Math.random() * (k % 2 ? 0.34 : 0.56), w = bell() * 0.028;
    return [d * Math.cos(a) - w * Math.sin(a), d * Math.sin(a) + w * Math.cos(a), bell() * 0.04];
  }
  const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 0.88;
  return [r * Math.cos(a), r * Math.sin(a), bell() * 0.16];
}

// moon: the full disc with an offset disc bitten out, so the crescent opens to the upper right like the icon
const BITE = [0.46, 0.32], BR = 0.86;
const bitten = (x: number, y: number) => Math.hypot(x - BITE[0], y - BITE[1]) < BR;
function moonPoint(): Vec3 {
  for (;;) {
    const u = Math.random();
    if (u < 0.4) {
      const a = Math.random() * TAU, r = 1 + bell() * 0.03, x = r * Math.cos(a), y = r * Math.sin(a);
      if (!bitten(x, y)) return [x, y, bell() * 0.06];
    } else if (u < 0.62) {
      const a = Math.random() * TAU, r = BR + bell() * 0.03, x = BITE[0] + r * Math.cos(a), y = BITE[1] + r * Math.sin(a);
      if (Math.hypot(x, y) < 1) return [x, y, bell() * 0.06];
    } else {
      const a = Math.random() * TAU, r = Math.sqrt(Math.random()), x = r * Math.cos(a), y = r * Math.sin(a);
      if (!bitten(x, y)) return [x, y, bell() * 0.12];
    }
  }
}

// pair the two shapes by angle (with a little shuffle) so particles sweep round rather than criss-cross the middle
const byAngle = (pts: Vec3[]) =>
  pts.map((p) => ({ p, a: Math.atan2(p[1], p[0]) + bell() * 0.5 })).sort((x, y) => x.a - y.a).map((o) => o.p);

const VERTEX = `attribute vec3 aB; attribute vec4 aR; uniform float uMorph, uTime, uSize, uPx; varying float vMix, vFly;
  vec2 rot(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
  void main(){
    vec3 a = position; a.xy = rot(a.xy, uTime * 0.05);
    float t = clamp(uMorph * 1.5 - aR.x * 0.5, 0.0, 1.0); t = t * t * (3.0 - 2.0 * t);
    float fly = sin(3.14159 * t);
    vec3 p = mix(a, aB, t);
    p += (aR.yzw - 0.5) * fly * 1.5;
    p.xy += rot(p.xy, 1.5708) * fly * 0.4;
    p += 0.014 * vec3(sin(uTime * 0.9 + aR.y * 40.0), cos(uTime * 0.7 + aR.z * 40.0), sin(uTime * 0.6 + aR.w * 40.0));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * uPx * (0.55 + aR.w * 0.9) * (1.0 + fly * 0.7) * (6.0 / -mv.z);
    gl_Position = projectionMatrix * mv; vMix = t; vFly = fly; }`;
const FRAGMENT = `uniform vec3 uSun, uMoon; varying float vMix, vFly;
  void main(){ vec2 q = gl_PointCoord - 0.5; float rr = dot(q, q); if (rr > 0.25) discard;
    vec3 c = mix(uSun, uMoon, vMix) * (0.5 + vFly * 0.5);
    gl_FragColor = vec4(c * smoothstep(0.25, 0.0, rr) * 0.42, 1.0); }`;

/**
 * The sun and the moon as one cloud of light: every particle has a spot in each shape, and on a
 * shift change it drifts out like dust on its own beat and settles into the other one. Drawn on
 * black for a screen-blended canvas, placed top right of `head` (beside the switch on phones).
 */
export function mountShiftSky(canvas: HTMLCanvasElement, head: HTMLElement, initial: Half): ShiftSkyHandle {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = matchMedia("(pointer: coarse)").matches || innerWidth < 820;

  let renderer: WebGLRenderer;
  try {
    // asking for the context first means no WebGL is a quiet no-op, not a three.js console error
    const context = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: true, stencil: false, powerPreference: "high-performance" });
    if (!context) throw new Error("WebGL unavailable");
    renderer = new WebGLRenderer({ canvas, context, antialias: false, powerPreference: "high-performance" });
  } catch {
    canvas.style.display = "none"; // the page works the same without the sky
    return { setHalf() {}, dispose() {} };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1 : 1.5)); // phones at 1x, as on the home stage
  renderer.setClearColor(0x000000, 1);

  const N = small ? 14000 : 30000;
  const sun = byAngle(Array.from({ length: N }, sunPoint)), moon = byAngle(Array.from({ length: N }, moonPoint));
  const geo = new BufferGeometry(), A = new Float32Array(N * 3), B = new Float32Array(N * 3), R4 = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    A.set(sun[i], i * 3);
    B.set(moon[i], i * 3);
    R4.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  }
  geo.setAttribute("position", new BufferAttribute(A, 3));
  geo.setAttribute("aB", new BufferAttribute(B, 3));
  geo.setAttribute("aR", new BufferAttribute(R4, 4));
  const U = {
    uMorph: { value: 0 },
    uTime: { value: 0 },
    uSize: { value: 2 },
    uPx: { value: renderer.getPixelRatio() },
    uSun: { value: new Color("#ffc24d") },
    uMoon: { value: new Color("#bfcbe0") },
  };
  const mat = new ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
  });
  const scene = new Scene(), camera = new PerspectiveCamera(35, 1, 0.1, 50), grp = new Group();
  camera.position.set(0, 0, 6);
  grp.add(new Points(geo, mat));
  scene.add(grp);
  const composer = createGlowComposer(renderer, scene, camera);

  function layout() {
    const w = head.clientWidth, h = head.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const ppu = h / (2 * Math.tan(MathUtils.degToRad(17.5)) * 6), narrow = w < 640; // pixels per world unit at z = 0
    // phones: centred in the open space right of the switch, since the heading fills the top line
    const flip = head.querySelector<HTMLElement>('[role="group"]');
    const gr = parseFloat(getComputedStyle(head).paddingRight) || 16;
    const flipEnd = flip ? flip.offsetLeft + flip.offsetWidth : w / 2, room = w - gr - flipEnd;
    const R = narrow ? Math.max(20, Math.min(40, room / 2 - 8)) : Math.min(h * 0.34, w * 0.15);
    const cx = narrow ? flipEnd + room / 2 : w - gr - R - 24;
    const cy = narrow && flip ? flip.offsetTop + flip.offsetHeight / 2 : R + 56;
    grp.position.set((cx - w / 2) / ppu, (h / 2 - cy) / ppu, 0);
    grp.scale.setScalar(R / 1.86 / ppu);
    U.uSize.value = Math.max(1.1, R / 92);
    U.uPx.value = renderer.getPixelRatio();
  }
  const resize = new ResizeObserver(layout);
  resize.observe(head);

  // going between shapes takes 1.8 s, or no time at all with reduced motion
  let m = initial === "night" ? 1 : 0, from = m, target = m, t0 = 0;
  let onScreen = true;
  const seen = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
  });
  seen.observe(head);
  const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2), start = performance.now();
  let raf = 0;
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (document.hidden || !onScreen || canvas.offsetParent === null) return;
    if (m !== target) {
      const k = Math.min(1, (now - t0) / 1800);
      m = from + (target - from) * ease(k);
      if (k === 1) m = target;
    }
    const t = reduce ? 0 : (now - start) / 1000;
    U.uMorph.value = m;
    U.uTime.value = t;
    grp.rotation.set(0.14 * Math.sin(t * 0.2), 0.22 * Math.sin(t * 0.25), 0); // a slow sway, so it reads as a shape in space
    composer.render();
  }
  layout();
  raf = requestAnimationFrame(frame);

  return {
    setHalf(half, animate) {
      const to = half === "night" ? 1 : 0;
      if (to === target) return;
      from = m;
      target = to;
      t0 = performance.now();
      if (!animate || reduce) m = from = target;
    },
    dispose() {
      cancelAnimationFrame(raf);
      resize.disconnect();
      seen.disconnect();
      geo.dispose();
      mat.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
