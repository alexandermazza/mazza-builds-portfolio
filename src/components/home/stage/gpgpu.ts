import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  FloatType,
  HalfFloatType,
  RGBAFormat,
  Vector3,
  type IUniform,
  type PerspectiveCamera,
  type Scene,
  type Texture,
  type Vector2,
  type WebGLRenderer,
} from "three";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";

export type Uniforms = Record<string, IUniform>;

/** The hero's pointer: a hovering mouse pushes the logo apart, a tap on touch bursts it. */
export interface Pointer {
  raw: Vector2;
  s: Vector2;
  inside: boolean;
  amt: number;
  tap: number;
}

export interface Ctx {
  renderer: WebGLRenderer;
  root: HTMLElement;
  reduce: boolean;
  small: boolean;
  narrow: () => boolean;
  pointer: Pointer;
  /** the canvas's size in CSS pixels: on phones it's the full screen height, so it holds still when the address bar hides */
  size: { w: number; h: number };
}

export interface StageState {
  heroP: number;
  proj: number;
}

export interface Piece {
  scene: Scene;
  camera: PerspectiveCamera;
  bloom: [strength: number, radius: number, threshold: number];
  resize(): void;
  update(t: number, dt: number, s: StageState): void;
  dispose(): void;
}

export const INK = new Color("#f1f2f3");
export const COOL = new Color("#b9cdf0");
export const AMBER = new Color("#ffc24d");
export const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const easeIO = (x: number) => {
  x = clamp01(x);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
/** Eases `from` toward `to` at `rate` per second, landing in the same place however the time is split into frames. */
export const follow = (from: number, to: number, dt: number, rate: number) => to + (from - to) * Math.exp(-rate * dt);
export const smooth = (x: number) => {
  x = clamp01(x);
  return x * x * (3 - 2 * x);
};

export function frameOffset(ctx: Ctx, cam: PerspectiveCamera, fx: number, fy: number) {
  const { w, h } = ctx.size;
  if (ctx.narrow()) cam.setViewOffset(w, h, 0, h * fy, w, h);
  else cam.setViewOffset(w, h, -w * fx, 0, w, h);
  cam.updateProjectionMatrix();
}

export const floatTex = (data: Float32Array, w: number, h: number) => {
  const t = new DataTexture(data, w, h, RGBAFormat, FloatType);
  t.needsUpdate = true;
  return t;
};

export const LIB = `float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  vec3 tube(vec3 T, float r, float a){ vec3 up = abs(T.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0); vec3 N = normalize(cross(T, up)); return (N * cos(a) + cross(T, N) * sin(a)) * r; }`;
const FLOW = `vec3 flow(vec3 p, float t){ return vec3(sin(p.y * 0.05 + t * 0.7) + sin(p.z * 0.031 - t * 0.4), sin(p.z * 0.043 + t * 0.5) + sin(p.x * 0.027 + t * 0.3), sin(p.x * 0.047 - t * 0.6) + sin(p.y * 0.033 + t * 0.45)); }`;
export const SOFT = `vec2 q = gl_PointCoord - 0.5; float rr = dot(q, q); if (rr > 0.25) discard; float soft = smoothstep(0.25, 0.0, rr);`;

/** One point per simulated particle, each reading its own texel (aRef). */
export function refGeometry(W: number, H: number) {
  const n = W * H, ref = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    ref[i * 2] = ((i % W) + 0.5) / W;
    ref[i * 2 + 1] = (Math.floor(i / W) + 0.5) / H;
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("aRef", new BufferAttribute(ref, 2));
  return g;
}

export interface Sim {
  u: Uniforms;
  step(): void;
  pos(): Texture;
  vel(): Texture;
  dispose(): void;
}

// particles spring toward an analytic "home" and swirl in a divergence-free flow; they start scattered
export function gpgpu(renderer: WebGLRenderer, W: number, H: number, homeGLSL: string, uniforms: Uniforms, scatter: number): Sim {
  const gpu = new GPUComputationRenderer(W, H, renderer);
  if (!renderer.extensions.has("EXT_color_buffer_float")) gpu.setDataType(HalfFloatType);
  const p0 = gpu.createTexture(), v0 = gpu.createTexture(), d = p0.image.data as Float32Array;
  for (let i = 0; i < d.length; i += 4) {
    const r = scatter * (0.4 + 0.6 * Math.cbrt(Math.random())), th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1);
    d[i] = r * Math.sin(ph) * Math.cos(th);
    d[i + 1] = r * Math.cos(ph);
    d[i + 2] = r * Math.sin(ph) * Math.sin(th);
    d[i + 3] = 1;
  }
  const common = `uniform float uTime; uniform float uDt; uniform float uSpring; uniform float uFlow; uniform float uWarp; uniform vec3 uCur; uniform vec3 uCurVel; uniform float uCurA; uniform float uCurR; ${LIB} ${FLOW} ${homeGLSL}`;
  const velVar = gpu.addVariable("tVel", `${common}
    void main(){ vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec3 p = texture2D(tPos, uv).xyz; vec3 v = texture2D(tVel, uv).xyz; vec3 h = home(uv);
      if (uWarp > 0.5 && distance(h, p) > 160.0) { gl_FragColor = vec4(0.0); return; }
      vec3 acc = (h - p) * uSpring + flow(p, uTime) * uFlow;
      // the cursor pushes particles out of its way and drags them a little along its path
      vec3 w = p - uCur; float f = uCurA * exp(-dot(w, w) / (uCurR * uCurR));
      acc += normalize(w + 1e-4) * f * 600.0 * (0.3 + 1.4 * hash(uv + 9.1)) + uCurVel * f * 2.5;  // uneven, so it scatters instead of bending
      v = (v + acc * uDt) * exp(-3.0 * uDt);
      gl_FragColor = vec4(v, 1.0); }`, v0);
  const posVar = gpu.addVariable("tPos", `${common}
    void main(){ vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec3 p = texture2D(tPos, uv).xyz; vec3 v = texture2D(tVel, uv).xyz; vec3 h = home(uv);
      if (uWarp > 0.5 && distance(h, p) > 160.0) p = h; else p += v * uDt;
      gl_FragColor = vec4(p, 1.0); }`, p0);
  gpu.setVariableDependencies(velVar, [posVar, velVar]);
  gpu.setVariableDependencies(posVar, [posVar, velVar]);
  // the cursor force is off (uCurA 0) unless a piece supplies its own cursor uniforms
  const base: Uniforms = {
    uTime: { value: 0 }, uDt: { value: 0.016 }, uSpring: { value: 0 }, uFlow: { value: 2 }, uWarp: { value: 0 },
    uCur: { value: V(1e4, 1e4, 1e4) }, uCurVel: { value: V(0, 0, 0) }, uCurA: { value: 0 }, uCurR: { value: 48 },
  };
  for (const v of [velVar, posVar]) Object.assign(v.material.uniforms, base, uniforms);
  const err = gpu.init();
  if (err) throw new Error(err);
  return {
    u: velVar.material.uniforms,
    step: () => gpu.compute(),
    pos: () => gpu.getCurrentRenderTarget(posVar).texture,
    vel: () => gpu.getCurrentRenderTarget(velVar).texture,
    dispose() {
      gpu.dispose();
      velVar.material.dispose();
      posVar.material.dispose();
    },
  };
}
