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
import { createGlowComposer } from "@/lib/three/glow";

/* A paper plane and a check mark as one cloud of light, built like the projects page's sun and moon: every
   particle has a spot in each shape. Launching sends the plane up and to the right as a streak of dust that
   settles back as the check. Ported from contact.html. */

export type PlaneSky = { setCharge(fraction: number): void; launch(): void; reset(): void; dispose(): void };

type Pt = [number, number];
type Edge = [Pt, Pt];
// [x, y, z, weight]
type Spot = [number, number, number, number];

const TAU = Math.PI * 2;
const bell = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
// the Ship icon's paper plane on a 24-unit grid, centred and flipped so +y is up: nose top right
const P = ([x, y]: Pt): Pt => [(x - 12) / 10, (12 - y) / 10];
const NOSE = P([22, 2]), TIP = P([15, 22]), FOLD = P([11, 13]), WING = P([2, 9]);
const EDGES: Edge[] = [[NOSE, TIP], [TIP, FOLD], [FOLD, WING], [WING, NOSE], [NOSE, FOLD]];
const lerp2 = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const len = ([a, b]: Edge) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const EL = EDGES.map(len), ELsum = EL.reduce((s, v) => s + v, 0);

function onEdges(edges: Edge[], lens: number[], total: number, jitter: number): Pt {
  let r = Math.random() * total, k = 0;
  while (r > lens[k]) r -= lens[k++];
  const [x, y] = lerp2(edges[k][0], edges[k][1], r / lens[k]);
  return [x + bell() * jitter, y + bell() * jitter];
}
function inTri(a: Pt, b: Pt, c: Pt): Pt {
  let u = Math.random(), v = Math.random();
  if (u + v > 1) { u = 1 - u; v = 1 - v; }
  return [a[0] + (b[0] - a[0]) * u + (c[0] - a[0]) * v, a[1] + (b[1] - a[1]) * u + (c[1] - a[1]) * v];
}
// edges are bright, the two wing faces a faint fill, the far wing a touch deeper so it folds
function planePoint(): Spot {
  if (Math.random() < 0.66) { const [x, y] = onEdges(EDGES, EL, ELsum, 0.016); return [x, y, bell() * 0.03, 1]; }
  if (Math.random() < 0.55) { const [x, y] = inTri(NOSE, TIP, FOLD); return [x, y, -0.06 + bell() * 0.03, 0.2]; }
  const [x, y] = inTri(NOSE, FOLD, WING);
  return [x, y, 0.06 + bell() * 0.03, 0.14];
}
// the check: a ring with the tick inside it, and a little fill in the disc
const CK: Pt[] = [[-0.46, 0.02], [-0.12, -0.32], [0.48, 0.34]];
const CE: Edge[] = [[CK[0], CK[1]], [CK[1], CK[2]]], CL = CE.map(len), CLsum = CL[0] + CL[1];
function checkPoint(): Spot {
  const u = Math.random();
  if (u < 0.42) { const a = Math.random() * TAU, r = 1 + bell() * 0.02; return [r * Math.cos(a), r * Math.sin(a), bell() * 0.03, 1]; }
  if (u < 0.82) { const [x, y] = onEdges(CE, CL, CLsum, 0.03); return [x, y, bell() * 0.03, 1]; }
  const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 0.94;
  return [r * Math.cos(a), r * Math.sin(a), bell() * 0.08, 0.22];
}
// pair the shapes by angle so particles sweep round instead of criss-crossing the middle
const byAngle = (pts: Spot[]) =>
  pts.map((p) => ({ p, a: Math.atan2(p[1], p[0]) + bell() * 0.5 })).sort((x, y) => x.a - y.a).map((o) => o.p);

const VERTEX = `attribute vec3 aB; attribute vec2 aW; attribute vec4 aR; uniform float uMorph, uTime, uSize, uPx, uCharge; varying float vMix, vFly, vW;
  void main(){
    float t = clamp(uMorph * 1.5 - aR.x * 0.5, 0.0, 1.0); t = t * t * (3.0 - 2.0 * t);  // each particle leaves on its own beat
    float fly = sin(3.14159 * t);
    vec3 p = mix(position, aB, t);
    p.xy += vec2(0.7071, 0.7071) * fly * 2.6 * (0.45 + aR.y);  // launched along the nose, as a streak
    p += (aR.yzw - 0.5) * fly * 0.9;                           // breaking up into dust on the way
    float hum = 0.012 + uCharge * 0.01;                         // a faint shimmer that quickens as the note fills in
    p += hum * vec3(sin(uTime * (0.9 + uCharge) + aR.y * 40.0), cos(uTime * 0.7 + aR.z * 40.0), sin(uTime * 0.6 + aR.w * 40.0));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vW = mix(aW.x, aW.y, t);
    gl_PointSize = uSize * uPx * (0.55 + aR.w * 0.9) * (0.7 + vW * 0.5) * (1.0 - fly * 0.35) * (6.0 / -mv.z);
    gl_Position = projectionMatrix * mv; vMix = t; vFly = fly; }`;
const FRAGMENT = `uniform vec3 uCool, uAmber; uniform float uCharge; varying float vMix, vFly, vW;
  void main(){ vec2 q = gl_PointCoord - 0.5; float rr = dot(q, q); if (rr > 0.25) discard;
    vec3 c = mix(mix(uCool, uAmber, uCharge), uAmber, vMix) * (0.35 + vW * 0.65) * (1.0 - vFly * 0.3);
    gl_FragColor = vec4(c * smoothstep(0.25, 0.0, rr) * 0.36, 1.0); }`;

const NOOP: PlaneSky = { setCharge() {}, launch() {}, reset() {}, dispose() {} };

export function mountPlane(canvas: HTMLCanvasElement, box: HTMLElement): PlaneSky {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = matchMedia("(pointer: coarse)").matches || innerWidth < 820;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  } catch {
    box.style.display = "none"; // no WebGL: the note still works, just without the plane
    return NOOP;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 1);

  const N = small ? 12000 : 26000;
  const plane = byAngle(Array.from({ length: N }, planePoint)), tick = byAngle(Array.from({ length: N }, checkPoint));
  const geo = new BufferGeometry(), A = new Float32Array(N * 3), B = new Float32Array(N * 3), W = new Float32Array(N * 2), R4 = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    A.set(plane[i].slice(0, 3), i * 3);
    B.set(tick[i].slice(0, 3), i * 3);
    W.set([plane[i][3], tick[i][3]], i * 2);
    R4.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  }
  geo.setAttribute("position", new BufferAttribute(A, 3));
  geo.setAttribute("aB", new BufferAttribute(B, 3));
  geo.setAttribute("aW", new BufferAttribute(W, 2));
  geo.setAttribute("aR", new BufferAttribute(R4, 4));
  const U = {
    uMorph: { value: 0 }, uTime: { value: 0 }, uSize: { value: 2 }, uPx: { value: renderer.getPixelRatio() }, uCharge: { value: 0 },
    uCool: { value: new Color("#d6dde8") }, uAmber: { value: new Color("#ffc24d") },
  };
  const mat = new ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: AdditiveBlending, vertexShader: VERTEX, fragmentShader: FRAGMENT });
  const scene = new Scene(), camera = new PerspectiveCamera(35, 1, 0.1, 50), grp = new Group();
  camera.position.set(0, 0, 6);
  grp.add(new Points(geo, mat));
  scene.add(grp);
  const composer = createGlowComposer(renderer, scene, camera, { strength: 0.45, radius: 0.18, threshold: 0.34, edgeFade: true });

  // the canvas overhangs its square so the launch streak has room; the shape fills about 70% of the square
  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const ppu = h / (2 * Math.tan(MathUtils.degToRad(17.5)) * 6), side = box.clientWidth;
    grp.scale.setScalar((side * 0.36) / ppu);
    U.uSize.value = Math.max(1.1, side / 230);
    U.uPx.value = renderer.getPixelRatio();
  }
  const resize = new ResizeObserver(layout);
  resize.observe(box);

  // charge follows how much of the note is filled in; launch morphs to the check, reset morphs back
  let charge = 0, chargeGoal = 0, m = 0, from = 0, target = 0, t0 = 0;
  const go = (to: number) => {
    from = m; target = to; t0 = performance.now();
    if (reduce) m = from = target;
  };
  let onScreen = true;
  const seen = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; });
  seen.observe(box);
  const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2), start = performance.now();
  let last = start, raf = 0;
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (document.hidden || !onScreen) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (m !== target) {
      const k = Math.min(1, (now - t0) / 2000);
      m = from + (target - from) * ease(k);
      if (k === 1) m = target;
    }
    charge += (chargeGoal - charge) * Math.min(1, dt * 3);
    const t = reduce ? 0 : (now - start) / 1000;
    U.uMorph.value = m; U.uTime.value = t; U.uCharge.value = charge;
    // a slow bob and sway, so it reads as a shape in space; it tips forward a little when it's ready
    grp.rotation.set(0.16 * Math.sin(t * 0.22) - charge * 0.08 * (1 - m), 0.3 * Math.sin(t * 0.27), 0.05 * Math.sin(t * 0.31));
    grp.position.y = 0.06 * Math.sin(t * 0.6) * grp.scale.x;
    composer.render();
  }
  layout();
  raf = requestAnimationFrame(frame);

  return {
    setCharge(fraction) { chargeGoal = fraction; },
    launch() { go(1); },
    reset() { go(0); },
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
