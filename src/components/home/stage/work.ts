import {
  AdditiveBlending,
  Group,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  type Vector3,
} from "three";
import {
  AMBER, COOL, INK, LIB, SOFT, V, easeIO, floatTex, frameOffset, gpgpu, refGeometry, smooth,
  type Ctx, type Piece, type Uniforms,
} from "./gpgpu";

/**
 * A particle piece (the hero logo, the constellation) supplies GLSL for home(uv) plus fadeOf / weightOf / accentOf,
 * its uniforms, two camera framings (top of page, end of the hero scroll) and hooks for its signals and interaction.
 */
export interface PieceCfg {
  U: Uniforms;
  glsl: string;
  white?: number;
  warp: boolean;
  spring: number;
  flow: number;
  surge: number;
  gain: number;
  accGain: number;
  pt: number;
  fog: [number, number];
  bloom: [number, number, number];
  offset?: [number, number];
  front: [Vector3, Vector3];
  deep: [Vector3, Vector3];
  shift?: number;
  frame?(camera: PerspectiveCamera, grp: Group): void;
  spin(t: number, g: Group): void;
  tick(t: number, dt: number, a: number): void;
  after?(camera: PerspectiveCamera, grp: Group): void;
  dispose?(): void;
}

export function particlePiece(ctx: Ctx, cfg: PieceCfg): Piece {
  const { renderer, reduce, small } = ctx;
  const off = cfg.offset ?? [0.16, 0.18];
  const scene = new Scene(), camera = new PerspectiveCamera(38, 1, 0.5, 4000);
  const W = small ? 256 : 448, H = small ? 192 : 320;
  const U: Uniforms = Object.assign({ uFlowT: { value: 0 }, uRes: { value: new Vector2(W, H) } }, cfg.U);
  const sim = gpgpu(renderer, W, H, cfg.glsl, U, 700);
  sim.u.uFlow.value = cfg.flow;
  const grp = new Group();
  grp.position.x = cfg.shift ?? 30;
  scene.add(grp);
  const ru: Uniforms = Object.assign({}, U, {
    uTime: sim.u.uTime, tPos: { value: null }, tVel: { value: null }, uPx: { value: 1 }, uPt: { value: cfg.pt }, uGain: { value: cfg.gain }, uAccGain: { value: cfg.accGain },
    uFog: { value: new Vector2(...cfg.fog) }, uInk: { value: INK }, uCool: { value: COOL }, uAmber: { value: AMBER }, uIn: { value: 0 }, uWhite: { value: cfg.white ?? 0 },
  });
  const mat = new ShaderMaterial({
    uniforms: ru, transparent: true, depthWrite: false, blending: AdditiveBlending,
    vertexShader: `uniform sampler2D tPos, tVel; uniform float uPx; uniform float uPt; attribute vec2 aRef;
      varying float vA; varying float vAcc; varying float vSpd; varying float vZ;
      uniform float uTime; ${LIB} ${cfg.glsl}
      void main(){ vec3 p = texture2D(tPos, aRef).xyz; vec3 v = texture2D(tVel, aRef).xyz;
        vSpd = length(v); vA = fadeOf(aRef) * weightOf(aRef); vAcc = accentOf(aRef, p);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); vZ = -mv.z;
      #ifdef SIZE_OF
        float sz = mix(sizeOf(aRef), 1.0, smoothstep(15.0, 60.0, vSpd));  // swollen only at rest, so a dissolve or a push stays fine
      #else
        float sz = 1.0;
      #endif
        gl_PointSize = min(sz * uPt * (1.0 + min(vSpd / 70.0, 1.0)) * uPx * (520.0 / vZ), 7.0 * uPx); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uInk, uCool, uAmber; uniform float uGain; uniform float uAccGain; uniform float uIn; uniform vec2 uFog; uniform float uWhite;
      varying float vA; varying float vAcc; varying float vSpd; varying float vZ;
      void main(){ ${SOFT}
        float acc = clamp(vAcc, 0.0, 1.0);
        vec3 c = mix(uCool * 0.6, uInk, clamp(max(vSpd / 110.0, uWhite), 0.0, 1.0)); c = mix(c, uAmber * 1.6, acc);
        float depth = (1.0 - smoothstep(uFog.x, uFog.y, vZ) * 0.75) * smoothstep(12.0, 70.0, vZ);
        gl_FragColor = vec4(c * (uGain + acc * uAccGain) * vA * depth * uIn * soft, 1.0); }`,
  });
  const geo = refGeometry(W, H);
  const obj = new Points(geo, mat);
  obj.frustumCulled = false;
  grp.add(obj);
  let flowT = 0, nextPulse = 4.5, lastPulse = -99;
  const look = V(0, 0, 0);
  return {
    scene, camera, bloom: cfg.bloom,
    resize() {
      camera.aspect = ctx.size.w / ctx.size.h;
      camera.fov = ctx.narrow() ? 54 : 38;
      if (cfg.frame) cfg.frame(camera, grp);
      else frameOffset(ctx, camera, off[0], off[1]);
      ru.uPx.value = renderer.getPixelRatio();
    },
    update(t, dt, s) {
      // entrance: the scattered cloud is pulled into shape over the first few seconds
      sim.u.uSpring.value = reduce ? cfg.spring : cfg.spring * smooth((t - 0.2) / 2.8);
      sim.u.uWarp.value = cfg.warp && t > 6 ? 1 : 0;
      ru.uIn.value = reduce ? 1 : smooth(t / 1.2);
      // a slow pulse every few seconds; each piece decides what the pulse lights up
      if (!reduce && t > nextPulse) { lastPulse = t; nextPulse = t + 5.5 + Math.random() * 2; }
      const a = reduce ? 99 : t - lastPulse, surge = a > 50 || a < 0 ? 0 : a < 0.4 ? a / 0.4 : Math.exp(-(a - 0.4) * 1.2);
      flowT += dt * (1 + surge * cfg.surge);
      U.uFlowT.value = flowT;
      cfg.tick(t, dt, a);
      sim.u.uTime.value = t;
      sim.u.uDt.value = dt;
      sim.step();
      ru.tPos.value = sim.pos();
      ru.tVel.value = sim.vel();
      cfg.spin(t, grp);
      // scroll: move from the opening framing to the piece's close-up
      const k = easeIO(s.heroP);
      camera.position.lerpVectors(cfg.front[0], cfg.deep[0], k);
      camera.position.x += Math.sin(t * 0.07) * 10;
      camera.position.y += Math.cos(t * 0.05) * 6;
      camera.lookAt(look.lerpVectors(cfg.front[1], cfg.deep[1], k));
      cfg.after?.(camera, grp);
    },
    dispose() {
      sim.dispose();
      geo.dispose();
      mat.dispose();
      cfg.dispose?.();
    },
  };
}

type P3 = [number, number, number];
interface Bundle { pts: P3[]; rad?: number; acc?: number; lit?: number; rain?: number }
// wide: an extra scale on desktop only, for a shape that crowds the copy there
interface ShapeDef { tilt: number; sway: number; yaw: number; size?: number; wide?: number; bundles: Bundle[] }
type Key = "den" | "rad" | "acc" | "rain";
type Shape = { pts: Float32Array; tilt: number; sway: number; yaw: number; size: number; wide: number } & Record<Key, Float32Array>;

/* INTRO + SELECTED WORK: one filament shape per section. 14 bundles per shape. Each bundle is a closed curve of
   M control points (an open stroke is traced there and back), stored in a float texture and blended point by
   point when the shape changes. Shape 0 is the hammer beside the intro; 1 to 4 are the projects. */
export function workPiece(ctx: Ctx): Piece {
  const { renderer, reduce, small } = ctx;
  const scene = new Scene(), camera = new PerspectiveCamera(38, 1, 0.5, 4000);
  const W = small ? 256 : 512, H = small ? 192 : 320, B = 14, M = 160, TAU = Math.PI * 2;
  const ring = (n: number, f: (a: number) => P3): P3[] => Array.from({ length: n }, (_, i) => f(i / n * TAU));
  const arc = <T,>(n: number, a0: number, a1: number, f: (a: number) => T): T[] => Array.from({ length: n + 1 }, (_, i) => f(a0 + (a1 - a0) * i / n));
  const seg = (a: P3, b: P3, n = 16): P3[] => Array.from({ length: n + 1 }, (_, i) => a.map((v, c) => v + (b[c] - v) * i / n) as P3);
  const back = (pts: P3[]) => pts.concat(pts.slice(1, -1).reverse());
  const move = (pts: P3[], dx: number, dy: number, dz = 0): P3[] => pts.map(([x, y, z]) => [x + dx, y + dy, z + dz]);
  const rrect = (w: number, h: number, r: number) => {
    const p: P3[] = [], hw = w / 2 - r, hh = h / 2 - r;
    [[hw, hh], [-hw, hh], [-hw, -hh], [hw, -hh]].forEach(([cx, cy], q) => {
      for (let i = 0; i <= 8; i++) { const a = (q + i / 8) * Math.PI / 2; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a), 0]); }
    });
    return p;
  };
  function resample(pts: P3[]) {
    const n = pts.length, cum = [0];
    for (let i = 1; i <= n; i++) { const a = pts[i - 1], b = pts[i % n]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])); }
    const L = cum[n], out = new Float32Array(M * 3);
    let j = 0;
    for (let m = 0; m < M; m++) {
      const d = m / M * L;
      while (cum[j + 1] < d) j++;
      const f = (d - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]), a = pts[j], b = pts[(j + 1) % n];
      for (let c = 0; c < 3; c++) out[m * 3 + c] = a[c] + (b[c] - a[c]) * f;
    }
    return { pts: out, len: L };
  }

  // Mazza (Italian, a sledgehammer): the claw hammer from the MB mark, small enough to sit beside the intro
  const hammer = (): ShapeDef => {
    const q = (a: number[], c: number[], b: number[], n = 24) =>
      Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [0, 1].map((k) => a[k] * u * u + c[k] * 2 * u * t + b[k] * t * t); });
    const side = [[-66, 40], [-66, 64], [-30, 64], [-20, 60], [-12, 64], ...q([14, 64], [56, 66], [76, 36]), ...q([70, 32], [46, 48], [14, 44]), [12, 40], [-12, 40], [-20, 44], [-30, 40]];
    const ex = (pts: number[][], z: number): P3[] => pts.map(([x, y]) => [x, y, z]);
    const xz = (rx: number, rz: number, y: number) => ring(90, (th) => [rx * Math.cos(th), y, rz * Math.sin(th)]);
    const yz = (x: number, r: number) => ring(90, (th) => [x, 52 + r * Math.cos(th), r * Math.sin(th)]);
    const c = Math.cos(-0.32), s = Math.sin(-0.32);
    const lean = (pts: P3[]): P3[] => pts.map(([x, y, z]) => { const yy = y + 28; return [x * c - yy * s - 4, x * s + yy * c, z]; });
    return { tilt: 0.1, sway: 0.45, yaw: 0.35, size: 0.62, bundles: ([
      { rad: 0.6, pts: ex(side, 8) }, { rad: 0.6, pts: ex(side, -8) },
      { rad: 0.55, pts: move(rrect(16, 162, 7), 0, -41, 5) }, { rad: 0.55, pts: move(rrect(16, 162, 7), 0, -41, -5) },
      { rad: 0.45, pts: xz(8.6, 6.2, -60) }, { rad: 0.45, pts: xz(8.6, 6.2, -118) },
      { rad: 0.35, lit: 0.7, pts: back(Array.from({ length: 181 }, (_, i): P3 => { const th = i / 180 * 12 * Math.PI; return [8.8 * Math.cos(th), -62 - i / 180 * 54, 6.4 * Math.sin(th)]; })) },
      { rad: 0.5, pts: yz(-66, 12) }, { rad: 0.5, pts: yz(-30, 12) }, { rad: 0.45, acc: 0.7, pts: yz(-67, 7) },
      { rad: 0.4, pts: back(seg([-66, 52, 12], [-30, 52, 12])) }, { rad: 0.4, pts: back(seg([-66, 52, -12], [-30, 52, -12])) },
      { rad: 0.5, pts: xz(11, 9, 40) },
      { rad: 0.4, lit: 0.8, pts: back(q([16, 56], [50, 58], [72, 35]).map(([x, y]): P3 => [x, y, 0])) },
    ] as Bundle[]).map((b) => ({ ...b, pts: lean(b.pts) })) };
  };
  // Distill: messy rings settle into a clean funnel that lights one bulb
  const bulb = (): number[][] => [...arc(80, -0.28 * Math.PI, 1.28 * Math.PI, (th) => [24 * Math.cos(th), -50 + 24 * Math.sin(th)]), [-10.5, -80], [10.5, -80]];
  const distill = (): ShapeDef => ({ tilt: 0.32, sway: 0.5, yaw: 0, bundles: [
    ...Array.from({ length: 10 }, (_, i): Bundle => {
      const u = i / 9, R = 10 + 84 * Math.pow(1 - u, 1.7), y = 96 - i * 10.5, w = Math.pow(1 - u, 1.4);
      return { rad: 0.85, pts: ring(160, (th) => { const r = R * (1 + w * (0.14 * Math.sin(3 * th + i * 1.3) + 0.08 * Math.sin(5 * th + i * 2.1))); return [r * Math.cos(th), y + w * 11 * Math.sin(2 * th + i), r * Math.sin(th)]; }) };
    }),
    ...[0, Math.PI / 2].map((al): Bundle => ({ rad: 0.55, acc: 0.6, pts: bulb().map(([x, y]): P3 => [x * Math.cos(al), y, x * Math.sin(al)]) })),
    { rad: 0.45, acc: 0.4, lit: 0.8, pts: back(Array.from({ length: 141 }, (_, i): P3 => { const th = i / 140 * 7 * Math.PI; return [10.5 * Math.cos(th), -81 - i / 140 * 17, 10.5 * Math.sin(th)]; })) },
    { rad: 0.35, acc: 0.9, lit: 1.5, pts: back([[-5, -79, 0], [-6, -56, 0], ...Array.from({ length: 39 }, (_, i): P3 => [-6 + (i + 1) * 0.3, -56 + 3 * Math.sin((i + 1) / 40 * 6 * Math.PI), 0]), [6, -56, 0], [5, -79, 0]]) },
  ] });
  // SecondRound: a fanned hand of resumes, one per job; the front one is written out
  const fan = (pts: P3[], ang: number, dz: number): P3[] => pts.map(([x, y, z]) => { const c = Math.cos(ang), s = Math.sin(ang), py = y + 130; return [x * c - py * s + 34, x * s + py * c - 130, z + dz]; });
  const secondRound = (): ShapeDef => ({ tilt: 0.06, sway: 0.3, yaw: -0.2, bundles: [
    ...[0.36, 0.22, 0.09].map((a, j): Bundle => ({ rad: 0.6, pts: fan(rrect(128, 172, 8), a, -54 + j * 18) })),
    { rad: 0.65, pts: fan(rrect(128, 172, 8), -0.04, 0) },
    { rad: 0.4, acc: 0.65, lit: 0.8, pts: fan(move(rrect(64, 9, 4), -20, 66), -0.04, 1) },
    ...[[50, 8], [30, 48], [19, 40], [8, 22], [-14, 48], [-25, 32], [-36, 44], [-58, 36], [-69, 14]].map(([y, x1]): Bundle => ({ rad: 0.32, lit: 0.55, pts: fan(back(seg([-52, y, 0], [x1, y, 0])), -0.04, 1) })),
  ] });
  // Daily Roman: the Colosseum, tiers of arches with the outer wall broken low at the front
  const colosseum = (): ShapeDef => {
    const A = 132, Bz = 92, b0 = 0.9 * Math.PI, b1 = 2.1 * Math.PI;
    const ell = (a: number, b: number, y: number) => ring(200, (th) => [a * Math.cos(th), y, b * Math.sin(th)]);
    const ellBack = (y: number) => back(arc(140, b0, b1, (th): P3 => [A * Math.cos(th), y, Bz * Math.sin(th)]));
    const arches = (yb: number, h: number, n: number, p: number, part?: boolean) => {
      const f = (th: number): P3 => [A * Math.cos(th), yb + h * Math.pow(Math.abs(Math.sin(n * th / 2)), p), Bz * Math.sin(th)];
      return part ? back(arc(600, b0, b1, f)) : ring(900, f);
    };
    return { tilt: 0.46, sway: 0.5, yaw: 0, bundles: [
      { rad: 0.6, pts: ell(A, Bz, -62) }, { rad: 0.6, pts: ell(A, Bz, -26) }, { rad: 0.6, pts: ell(A, Bz, 10) }, { rad: 0.6, pts: ellBack(44) }, { rad: 0.6, pts: ellBack(64) },
      { rad: 0.5, pts: arches(-62, 30, 16, 0.35) }, { rad: 0.5, pts: arches(-26, 30, 16, 0.35) }, { rad: 0.5, pts: arches(10, 28, 16, 0.35, true) }, { rad: 0.45, pts: arches(46, 14, 32, 0.15, true) },
      { rad: 0.6, pts: ell(116, 78, 4) }, { rad: 0.6, pts: ell(100, 64, -20) }, { rad: 0.6, pts: ell(86, 52, -42) },
      { rad: 0.6, acc: 0.55, pts: ell(72, 40, -60) }, { rad: 0.5, pts: ell(44, 16, -60) },
    ] };
  };
  // Path: a trail switchbacks up a hill of contour rings, touchpoints standing along it as waypoints, to the amber
  // flag where the meeting gets booked. A touchpoint is drawn like the film's icons: ring, diamond or square
  const glyph = (kind: "ring" | "diamond" | "square", [x, y, z]: P3, r: number): P3[] =>
    kind === "ring" ? ring(64, (th): P3 => [x + r * Math.cos(th), y + r * Math.sin(th), z])
      : kind === "diamond" ? [[x, y + r * 1.2, z], [x + r * 1.2, y, z], [x, y - r * 1.2, z], [x - r * 1.2, y, z]]
      : move(rrect(r * 1.8, r * 1.8, 2), x, y, z);
  const trail = (): ShapeDef => {
    const rx = (u: number) => 18 + 108 * Math.pow(1 - u, 1.4), y = (u: number) => -84 + 118 * u, k = 0.62, top = y(1);
    const contour = (u: number) => ring(200, (th): P3 => [rx(u) * Math.cos(th), y(u), k * rx(u) * Math.sin(th)]);
    const on = (u: number, lift = 0): P3 => {
      const r = rx(u) * 1.03, a = Math.PI / 2 + 0.75 * Math.sin(u * 5.5 * Math.PI);
      return [r * Math.cos(a), y(u) + 1.5 + lift, k * r * Math.sin(a)];
    };
    const path: P3[] = [...Array.from({ length: 241 }, (_, i) => on(0.02 + 0.98 * i / 240)), [0, top + 1.5, 0]];
    const cloth = (inset: number): P3[] => {
      const w = 36 - inset * 2, x0 = inset * 0.6, wave = (x: number) => 3.5 * Math.sin(x / 36 * Math.PI * 1.6);
      const edge = (yy: number, rev: boolean) => Array.from({ length: 21 }, (_, i): P3 => { const x = x0 + w * (rev ? 1 - i / 20 : i / 20); return [x, yy - x * 0.08 + wave(x) * 0.4, wave(x)]; });
      return [...edge(top + 54 - inset, false), ...edge(top + 32 + inset, true)];
    };
    return { tilt: 0.28, sway: 0.35, yaw: -0.15, wide: 0.95, bundles: [
      { rad: 0.55, lit: 0.8, pts: contour(0) },
      ...[0.25, 0.5, 0.75].map((u): Bundle => ({ rad: 0.5, lit: 0.85, pts: contour(u) })),
      { rad: 0.45, acc: 0.3, pts: contour(1) },
      { rad: 0.35, lit: 0.75, pts: back(path) },
      { rad: 0.28, acc: 0.3, rain: 1, pts: back(path) },
      ...([[0.091, "ring", 0.1], [0.273, "diamond", 0.25], [0.455, "square", 0.45], [0.636, "ring", 0.65]] as const).map(([u, kind, acc]): Bundle => ({ rad: 0.4, lit: 2, acc, pts: glyph(kind, on(u, 12), 8) })),
      { rad: 0.4, lit: 0.8, pts: back(seg([0, top, 0], [0, top + 56, 0], 20)) },
      { rad: 0.45, acc: 1, lit: 1.4, pts: cloth(0) },
      { rad: 0.4, acc: 1, lit: 1.2, pts: cloth(5) },
    ] };
  };

  const keys: Key[] = ["den", "rad", "acc", "rain"];
  const T: Shape[] = [hammer(), distill(), trail(), secondRound(), colosseum()].map((S) => {
    console.assert(S.bundles.length === B, "shape needs 14 bundles", S.bundles.length);
    const rs = S.bundles.map((b) => resample(b.pts)), mean = rs.reduce((a, r) => a + r.len, 0) / B, pts = new Float32Array(M * B * 3);
    rs.forEach((r, b) => pts.set(r.pts, b * M * 3));
    return {
      pts, tilt: S.tilt, sway: S.sway, yaw: S.yaw, size: S.size ?? 1, wide: S.wide ?? 1,
      den: Float32Array.from(rs, (r, b) => r.len / mean * (S.bundles[b].lit ?? 1)),
      rad: Float32Array.from(S.bundles, (b) => b.rad ?? 1),
      acc: Float32Array.from(S.bundles, (b) => b.acc ?? 0),
      rain: Float32Array.from(S.bundles, (b) => b.rain ?? 0),
    };
  });
  const copy = (S: Shape): Shape => ({ pts: S.pts.slice(), tilt: S.tilt, sway: S.sway, yaw: S.yaw, size: S.size, wide: S.wide, den: S.den.slice(), rad: S.rad.slice(), acc: S.acc.slice(), rain: S.rain.slice() });
  const now = copy(T[0]);
  const ctl = new Float32Array(M * B * 4), tCtl = floatTex(ctl, M, B);
  const write = () => {
    for (let i = 0; i < M * B; i++) { ctl[i * 4] = now.pts[i * 3]; ctl[i * 4 + 1] = now.pts[i * 3 + 1]; ctl[i * 4 + 2] = now.pts[i * 3 + 2]; }
    tCtl.needsUpdate = true;
  };
  write();

  const S_GLSL = `uniform float uRain[14];
    float sOf(vec2 uv, int b){ float slow = fract(hash(uv) + uTime * 0.006 * (0.6 + hash(uv + 8.9) * 0.8));
      float rain = fract(hash(uv) + uTime * 0.5 * (0.7 + hash(uv + 8.9) * 0.6)) * 0.5;
      return mix(slow, rain, uRain[b]); }`;
  const home = `${S_GLSL} uniform sampler2D tCtl; uniform float uRad[14];
    vec3 cp(int b, int i){ return texelFetch(tCtl, ivec2((i + ${M}) % ${M}, b), 0).xyz; }
    vec3 curve(int b, float s){ float x = fract(s) * ${M}.0; int i = int(x); float f = x - float(i);
      vec3 p0 = cp(b, i - 1), p1 = cp(b, i), p2 = cp(b, i + 1), p3 = cp(b, i + 2);
      return 0.5 * (2.0 * p1 + (p2 - p0) * f + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * f * f + (3.0 * p1 - p0 - 3.0 * p2 + p3) * f * f * f); }
    vec3 home(vec2 uv){ int b = int(min(13.0, floor(uv.y * 14.0))); float s = sOf(uv, b);
      vec3 c0 = curve(b, s), c1 = curve(b, s + 0.002);
      float rad = pow(hash(uv + 2.3), 2.0) * (2.0 + hash(uv + 4.1) * 5.0) * uRad[b];
      return c0 + tube(normalize(c1 - c0 + 1e-4), rad, hash(uv + 6.7) * 6.2832 + s * 37.7); }`;
  const U: Uniforms = { tCtl: { value: tCtl }, uRad: { value: now.rad }, uRain: { value: now.rain }, uDen: { value: now.den }, uAcc: { value: now.acc } };
  const sim = gpgpu(renderer, W, H, home, U, 500);
  sim.u.uFlow.value = 3;
  const grp = new Group();
  grp.position.x = 30;
  scene.add(grp);
  const ru: Uniforms = Object.assign({}, U, { uTime: sim.u.uTime, tPos: { value: null }, tVel: { value: null }, uPx: { value: 1 }, uLit: { value: 1 }, uInk: { value: INK }, uCool: { value: COOL }, uAmber: { value: AMBER } });
  const geo = refGeometry(W, H);
  const mat = new ShaderMaterial({
    uniforms: ru, transparent: true, depthWrite: false, blending: AdditiveBlending,
    vertexShader: `uniform sampler2D tPos, tVel; uniform float uPx; uniform float uDen[14]; uniform float uAcc[14]; attribute vec2 aRef;
      varying float vSpd; varying float vZ; varying float vB; varying float vDen; varying float vAcc; varying float vRain; varying float vFade;
      uniform float uTime; ${LIB} ${S_GLSL}
      void main(){ vec3 p = texture2D(tPos, aRef).xyz; vSpd = length(texture2D(tVel, aRef).xyz); int b = int(min(13.0, floor(aRef.y * 14.0))); vB = float(b);
        vDen = clamp(uDen[b], 0.05, 1.8); vAcc = uAcc[b]; vRain = uRain[b];
        float s = sOf(aRef, b); vFade = mix(1.0, smoothstep(0.0, 0.05, s) * (1.0 - smoothstep(0.43, 0.5, s)), vRain);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); vZ = -mv.z; gl_PointSize = (1.3 + min(vSpd / 60.0, 0.7) * (1.0 - vRain)) * uPx * (300.0 / vZ); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uInk, uCool, uAmber; uniform float uLit; varying float vSpd; varying float vZ; varying float vB; varying float vDen; varying float vAcc; varying float vRain; varying float vFade;
      void main(){ ${SOFT} vec3 c = mix(uCool, uInk, fract(vB * 0.37)); float wake = smoothstep(22.0, 95.0, vSpd) * (1.0 - vRain);
        c = mix(mix(c * 0.62, uAmber * 0.85, vAcc), uAmber, wake * 0.7); float fog = 1.0 - smoothstep(320.0, 900.0, vZ) * 0.85;
        gl_FragColor = vec4(c * soft * 0.5 * fog * vDen * vFade * uLit, 1.0); }`,
  });
  const pts = new Points(geo, mat);
  pts.frustumCulled = false;
  grp.add(pts);
  let cur = 0, from = copy(now), mk = 1, fit = 0.78;
  return {
    scene, camera, bloom: [0.55, 0.35, 0.9],
    resize() {
      camera.aspect = ctx.size.w / ctx.size.h;
      camera.fov = ctx.narrow() ? 56 : 38;
      frameOffset(ctx, camera, 0.2, 0.2);
      ru.uPx.value = renderer.getPixelRatio();
      fit = 0.78 * Math.min(1, camera.aspect / (ctx.narrow() ? 0.55 : 1.45)); // narrower windows leave less room for the shape
    },
    update(t, dt, s) {
      if (s.proj !== cur) { cur = s.proj; from = copy(now); mk = 0; }
      if (mk < 1) {
        mk = Math.min(1, mk + dt / 1.9);
        const k = easeIO(mk), to = T[cur], L = (a: number, b: number) => a + (b - a) * k;
        for (let i = 0; i < now.pts.length; i++) now.pts[i] = L(from.pts[i], to.pts[i]);
        keys.forEach((n) => { for (let b = 0; b < B; b++) now[n][b] = L(from[n][b], to[n][b]); });
        now.tilt = L(from.tilt, to.tilt); now.sway = L(from.sway, to.sway); now.yaw = L(from.yaw, to.yaw); now.size = L(from.size, to.size); now.wide = L(from.wide, to.wide);
        write();
      }
      sim.u.uSpring.value = reduce ? 9 : 9 * smooth((t - 0.1) / 2.0);
      sim.u.uWarp.value = 0;
      sim.u.uTime.value = t;
      sim.u.uDt.value = dt;
      sim.step();
      ru.tPos.value = sim.pos();
      ru.tVel.value = sim.vel();
      const scale = now.size * (ctx.narrow() ? 1 : now.wide);
      grp.scale.setScalar(fit * scale);
      ru.uLit.value = scale * scale; // a smaller shape packs the same particles tighter, so dim it by its area
      grp.rotation.x = now.tilt + Math.sin(t * 0.04) * 0.05;
      grp.rotation.y = now.yaw + Math.sin(t * 0.22) * now.sway;
      camera.position.set(Math.sin(t * 0.05) * 20, 20 + Math.cos(t * 0.04) * 10, 360);
      camera.lookAt(30, 0, 0);
    },
    dispose() {
      sim.dispose();
      geo.dispose();
      mat.dispose();
      tCtl.dispose();
    },
  };
}
