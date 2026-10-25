import {
  Box3,
  EdgesGeometry,
  ExtrudeGeometry,
  MathUtils,
  Matrix4,
  Path,
  Plane,
  Raycaster,
  Shape,
  Vector2,
  type BufferGeometry,
  type Group,
  type PerspectiveCamera,
  type Vector3,
} from "three";
import { V, clamp01, easeIO, floatTex, frameOffset, type Ctx } from "./gpgpu";
import type { PieceCfg } from "./work";

type P2 = [number, number];
type P3 = [number, number, number];

// the MB mark rebuilt as real solids, redrawn by eye from public/logo.png: the claw hammer stands in the
// middle (its handle doubles as the M's right stem) and the M and B swing back from it on either side,
// hinged at the handle. `spread` is how far each letter turns away from facing you. Returns the edges,
// plus FILL_N points scattered over the letters' faces so they read as solid blocks, not outlines.
const logoSpread = Math.PI / 8, FILL_N = 256 * 256; // 22.5 degrees each, so the letters sit 45 degrees apart
function logoEdges(spread: number) {
  const raw: [Vector3, Vector3][] = [], tris: { t: Vector3[]; w: number }[] = [], H = Math.PI / 2, S = 1.45;
  const shape = (pts: P2[], holes: P2[][] = []) => {
    const s = new Shape(pts.map(([x, y]) => new Vector2(x, y)));
    holes.forEach((h) => s.holes.push(new Path(h.map(([x, y]) => new Vector2(x, y)))));
    return s;
  };
  const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n = 10): P2[] =>
    Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  const quad = (a: P2, c: P2, b: P2, n = 20): P2[] =>
    Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [0, 1].map((k) => a[k] * u * u + c[k] * 2 * u * t + b[k] * t * t) as P2; });
  const ring = (n: number, f: (a: number) => P3): P3[] => Array.from({ length: n }, (_, i) => f(i / n * Math.PI * 2));
  const ext = (s: Shape, depth: number) => new ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 1 });
  const add = (geo: BufferGeometry, m: Matrix4) => {
    const e = new EdgesGeometry(geo, 25), p = e.attributes.position;
    for (let i = 0; i < p.count; i += 2) raw.push([V(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(m), V(p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)).applyMatrix4(m)]);
    // faces to fill, weighted by area: the front at full density, the side walls at under a third (like the logo's
    // lighter sides), the back left empty so it doesn't glow through
    const g = geo.attributes.position;
    console.assert(!geo.index, "expected a non-indexed extrusion");
    for (let i = 0; i < g.count; i += 3) {
      const t = [0, 1, 2].map((k) => V(g.getX(i + k), g.getY(i + k), g.getZ(i + k))), n = t[1].clone().sub(t[0]).cross(t[2].clone().sub(t[0]));
      const area = n.length() / 2;
      n.normalize();
      if (n.z > -0.5 && area > 0) tris.push({ t: t.map((q) => q.applyMatrix4(m)), w: area * (n.z > 0.5 ? 1 : 0.3) });
    }
    geo.dispose();
    e.dispose();
  };
  // a hand-drawn hammer outline, cut into even ~9-unit pieces so its curves get the same density as the letters
  const poly = (pts: P3[], closed: boolean) => {
    const P = closed ? [...pts, pts[0]] : pts, cum = [0];
    for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1], P[i][2] - P[i - 1][2]));
    const L = cum[cum.length - 1] * S, n = Math.max(1, Math.round(L / 9)), out: Vector3[] = [];
    let j = 0;
    for (let m = 0; m <= n; m++) {
      const d = m / n * cum[cum.length - 1];
      while (j < P.length - 2 && cum[j + 1] < d) j++;
      const f = (d - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]);
      const [x, y, z] = [0, 1, 2].map((c) => (P[j][c] + (P[j + 1][c] - P[j][c]) * f) * S);
      out.push(V(x, y, z));
    }
    for (let m = 0; m < n; m++) raw.push([out[m].clone(), out[m + 1].clone()]); // own copies: centring below moves each point once
  };
  // the hammer: the intro's claw hammer with the grip wrap left off, standing upright on the hinge line
  const side: P2[] = [[-66, 40], [-66, 64], [-30, 64], [-20, 60], [-12, 64], ...quad([14, 64], [56, 66], [76, 36]), ...quad([70, 32], [46, 48], [14, 44]), [12, 40], [-12, 40], [-20, 44], [-30, 40]];
  const handle = (z: number) => {
    const p: P3[] = [], r = 7, hw = 8 - r, hh = 81 - r;
    ([[hw, hh], [-hw, hh], [-hw, -hh], [hw, -hh]] as P2[]).forEach(([cx, cy], q) => {
      for (let i = 0; i <= 8; i++) { const a = (q + i / 8) * H; p.push([cx + r * Math.cos(a), cy - 41 + r * Math.sin(a), z]); }
    });
    return p;
  };
  const xz = (rx: number, rz: number, y: number) => ring(90, (th) => [rx * Math.cos(th), y, rz * Math.sin(th)]);
  const yz = (x: number, r: number) => ring(90, (th) => [x, 52 + r * Math.cos(th), r * Math.sin(th)]);
  [8, -8].forEach((z) => poly(side.map(([x, y]) => [x, y, z]), true));
  [5, -5].forEach((z) => poly(handle(z), true));
  [yz(-66, 12), yz(-30, 12), yz(-67, 7), xz(11, 9, 40), xz(8.6, 6.2, -118)].forEach((r) => poly(r, true));
  [12, -12].forEach((z) => poly([[-66, 52, z], [-30, 52, z]], false));
  poly(quad([16, 56], [50, 58], [72, 35]).map(([x, y]) => [x, y, 0]), false);
  // the letters, 200 tall, extruded back from a front face at z = 0, then swung back around the handle
  const hinge = (dir: number, x: number) => new Matrix4().makeRotationY(dir * spread).multiply(new Matrix4().makeTranslation(x, -170, -34));
  add(ext(shape([[0, 0], [0, 200], [48, 200], [95, 110], [142, 200], [152, 200], [152, 130], [106, 40], [84, 40], [44, 118], [44, 0]]), 34), hinge(-1, -168));
  add(ext(shape([[0, 0], [0, 200], [90, 200], ...arc(90, 153, 47, H, -H).slice(1), [98, 106], ...arc(98, 53, 53, H, -H).slice(1)],
    [[[42, 124], [42, 170], [88, 170], ...arc(88, 147, 23, H, -H).slice(1)], [[42, 30], [42, 80], [95, 80], ...arc(95, 55, 25, H, -H).slice(1)]]), 34), hinge(1, 16));
  // random points on those faces, picked by area so the fill is even
  const cdf: number[] = [];
  tris.reduce((s, f) => (cdf.push(s + f.w), s + f.w), 0);
  const fills = Array.from({ length: FILL_N }, () => {
    const r = Math.random() * cdf[cdf.length - 1];
    let a = 0, b = cdf.length - 1;
    while (a < b) { const mid = (a + b) >> 1; if (cdf[mid] < r) a = mid + 1; else b = mid; }
    const [A, B, C] = tris[a].t;
    let u = Math.random(), v = Math.random();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    return A.clone().add(B.clone().sub(A).multiplyScalar(u)).add(C.clone().sub(A).multiplyScalar(v));
  });
  // centre it; the fill sits inside the edges' box, so the edges alone set the centre
  const box = new Box3();
  raw.forEach(([a, b]) => box.expandByPoint(a).expandByPoint(b));
  const c = box.getCenter(V(0, 0, 0));
  raw.forEach((s) => s.forEach((p) => p.sub(c).multiplyScalar(0.92)));
  fills.forEach((p) => p.sub(c).multiplyScalar(0.92));
  // bright knots only where the outline turns sharply or lines branch, so curves don't look beaded
  const key = (p: Vector3) => p.toArray().map((v) => Math.round(v * 2)).join(), ends = new Map<string, { p: Vector3; dirs: Vector3[] }>();
  raw.forEach(([a, b]) => {
    for (const [p, q] of [[a, b], [b, a]]) {
      const kk = key(p);
      if (!ends.has(kk)) ends.set(kk, { p, dirs: [] });
      ends.get(kk)!.dirs.push(q.clone().sub(p).normalize());
    }
  });
  const knots = [...ends.values()].filter(({ dirs }) => dirs.length !== 2 || dirs[0].dot(dirs[1]) > -0.8).map((n) => n.p);
  // split long lines into short pieces so particles spread by length, not by line count
  const segs: [Vector3, Vector3][] = [];
  raw.forEach(([a, b]) => {
    const n = Math.max(1, Math.ceil(a.distanceTo(b) / 10 - 1e-6));
    for (let i = 0; i < n; i++) segs.push([a.clone().lerp(b, i / n), a.clone().lerp(b, (i + 1) / n)]);
  });
  return { segs, knots, fills };
}

// the logo builds itself from drifting dust, bottom to top, then dissolves and rebuilds on a loop
export function assembly(ctx: Ctx): PieceCfg {
  const P = ctx.pointer;
  // write the logo's pieces into textures, each tagged with its height so the build runs bottom to top
  const { segs, knots, fills } = logoEdges(logoSpread), E = segs.length, K = knots.length, Wt = Math.max(E, K);
  const data = new Float32Array(Wt * 4 * 4), fdata = new Float32Array(FILL_N * 4);
  const all = [...knots, ...segs.flat()], ys = all.map((p) => p.y);
  const lo = ys.reduce((a, b) => Math.min(a, b)), hi = ys.reduce((a, b) => Math.max(a, b));
  const rank = (y: number) => 0.93 * (y - lo) / (hi - lo) + (Math.random() - 0.5) * 0.04;
  segs.forEach(([A, B], e) => { data.set([A.x, A.y, A.z, rank((A.y + B.y) / 2)], e * 4); data.set([B.x, B.y, B.z, 0], (Wt + e) * 4); });
  knots.forEach((v, n) => data.set([v.x, v.y, v.z, rank(v.y)], (3 * Wt + n) * 4));
  fills.forEach((v, n) => fdata.set([v.x, v.y, v.z, rank(v.y)], n * 4));
  const size = { r: all.reduce((m, p) => Math.max(m, Math.hypot(p.x, p.z)), 0), h: ys.reduce((m, y) => Math.max(m, Math.abs(y)), 0) };
  const tGeo = floatTex(data, Wt, 4), tFill = floatTex(fdata, 256, FILL_N / 256);
  const U = {
    tGeo: { value: tGeo }, tFill: { value: tFill }, uE: { value: E }, uV: { value: K }, uBuild: { value: 0 }, uDis: { value: -1 }, uActive: { value: 0 },
    uCur: { value: V(1e4, 1e4, 1e4) }, uCurVel: { value: V(0, 0, 0) }, uCurA: { value: 0 }, uCurR: { value: 48 },
  };
  // the cursor as a point on a plane through the logo, facing the camera, in the logo's own (swaying) space
  const ray = new Raycaster(), plane = new Plane(), hit = V(0, 0, 0), prev = V(0, 0, 0), vel = V(0, 0, 0), dir = V(0, 0, 0);
  let stepDt = 0.016;
  const cfg: PieceCfg = {
    U, white: 0.8,
    after(camera: PerspectiveCamera, grp: Group) {
      ray.setFromCamera(P.s, camera);
      grp.getWorldPosition(hit);
      plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(dir), hit);
      if (ray.ray.intersectPlane(plane, hit)) { prev.copy(U.uCur.value); grp.updateMatrixWorld(); U.uCur.value.copy(grp.worldToLocal(hit)); }
      // only a hovering mouse drags particles along; a tap bursts straight out
      if (P.amt > 0.01) vel.subVectors(U.uCur.value, prev).divideScalar(Math.max(stepDt, 1e-3)).clampLength(0, 600);
      else vel.set(0, 0, 0);
      U.uCurVel.value.lerp(vel, Math.min(1, stepDt * 8));
      const burst = Math.max(0, 1 - (performance.now() / 1000 - P.tap) / 0.35);
      U.uCurA.value = ctx.reduce ? 0 : Math.max(P.amt, burst * 2.6);
      U.uCurR.value = 48 * (1 + 0.5 * burst);
    },
    glsl: `uniform sampler2D tGeo; uniform sampler2D tFill; uniform float uE; uniform float uV; uniform float uBuild; uniform float uDis; uniform float uActive; uniform vec2 uRes;
      float isKnot(vec2 uv){ return step(hash(uv + 11.3), 0.12); }
      float isFill(vec2 uv){ return (1.0 - isKnot(uv)) * step(hash(uv + 13.7), 0.6); }
      vec4 knot(vec2 uv){ return texelFetch(tGeo, ivec2(int(floor(hash(uv + 2.2) * uV)), 3), 0); }
      // by particle index, not by hash: with hundreds of short pieces the hash leaves visible gaps
      int edgeOf(vec2 uv){ return int(mod(floor(uv.x * uRes.x) + floor(uv.y * uRes.y) * uRes.x, uE)); }
      vec4 fillPt(vec2 uv){ int i = int(mod(floor(uv.x * uRes.x) + floor(uv.y * uRes.y) * uRes.x, 65536.0)); return texelFetch(tFill, ivec2(i % 256, i / 256), 0); }
      float rankOf(vec2 uv){ return isKnot(uv) > 0.5 ? knot(uv).w : isFill(uv) > 0.5 ? fillPt(uv).w : texelFetch(tGeo, ivec2(edgeOf(uv), 0), 0).w; }
      float builtOf(vec2 uv){ float r = rankOf(uv); return smoothstep(0.0, 1.0, (uBuild - r) / 0.07) * (1.0 - smoothstep(0.0, 1.0, (uDis - r) / 0.07)); }
      vec3 dust(vec2 uv){ float th = hash(uv + 5.1) * 6.2832 + uTime * 0.03, ph = acos(2.0 * hash(uv + 6.1) - 1.0), r = 330.0 + 260.0 * hash(uv + 7.1);
        return r * vec3(sin(ph) * cos(th), cos(ph) * 0.7, sin(ph) * sin(th)); }
      vec3 home(vec2 uv){ vec3 q;
        if (isKnot(uv) > 0.5) { float r = pow(hash(uv + 4.4), 1.5) * 6.0, th = hash(uv + 5.5) * 6.2832 + uTime * 0.5, ph = acos(2.0 * hash(uv + 7.7) - 1.0);
          q = knot(uv).xyz + r * vec3(sin(ph) * cos(th), cos(ph), sin(ph) * sin(th)); }
        else if (isFill(uv) > 0.5) { float th = hash(uv + 5.5) * 6.2832 + uTime * 0.2, ph = acos(2.0 * hash(uv + 7.7) - 1.0);
          q = fillPt(uv).xyz + 1.5 * hash(uv + 4.4) * vec3(sin(ph) * cos(th), cos(ph), sin(ph) * sin(th)); }
        else { int e = edgeOf(uv); vec3 A = texelFetch(tGeo, ivec2(e, 0), 0).xyz, B = texelFetch(tGeo, ivec2(e, 1), 0).xyz;
          float f = clamp(hash(uv + 5.5) + 0.015 * sin(uTime * 0.4 + hash(uv + 8.8) * 30.0), 0.0, 1.0);
          q = mix(A, B, f) + tube(normalize(B - A), pow(hash(uv + 2.3), 2.0) * 2.4, hash(uv + 6.7) * 6.2832); }
        return mix(dust(uv), q, builtOf(uv)); }
      float fadeOf(vec2 uv){ return mix(0.3, 1.0, builtOf(uv)); }
      // the fill takes particles from the edges, so the edges get a boost to stay as crisp as before
      float weightOf(vec2 uv){ return isKnot(uv) > 0.5 ? 1.25 : isFill(uv) > 0.5 ? 0.85 : 1.6; }
      // fill dots swell as they land so they overlap into a soft sheet; as dust they stay fine
      #define SIZE_OF
      float sizeOf(vec2 uv){ return 1.0 + 2.1 * isFill(uv) * builtOf(uv); }
      float accentOf(vec2 uv, vec3 p){ float r = rankOf(uv); return uActive * (exp(-pow((uBuild - r - 0.07) / 0.05, 2.0)) + exp(-pow((uDis - r - 0.07) / 0.05, 2.0))); }`,
    warp: false, spring: 8, flow: 1.4, surge: 0, gain: 0.18, accGain: 0.7, pt: 1.5, fog: [550, 1200], bloom: [0.4, 0.3, 0.88],
    front: [V(0, 20, 640), V(0, 0, 0)], deep: [V(60, 50, 230), V(0, 30, 0)],
    // desktop: sit right of the headline. Phones: centre in the space between the top bar and the
    // headline, pulled back until the margins are even on every side
    frame(camera, grp) {
      if (!ctx.narrow()) {
        grp.position.x = 30;
        frameOffset(ctx, camera, 0.16, 0.18);
        cfg.front[0].set(0, 20, 640);
        cfg.deep[0].set(60, 50, 230);
        return;
      }
      const { w, h } = ctx.size;
      const top = document.querySelector<HTMLElement>("header")?.offsetHeight ?? 0;
      const bottom = ctx.root.querySelector<HTMLElement>("#hero h1")?.offsetTop ?? h;
      const pad = 24, tan = Math.tan(MathUtils.degToRad(camera.fov / 2)), room = Math.max(40, (bottom - top) / 2 - pad);
      const d = Math.max(size.r * (h / 2) / (tan * (w / 2 - pad)), (size.h + 20) * (h / 2) / (tan * room));
      grp.position.x = 0;
      camera.setViewOffset(w, h, 0, h / 2 - (top + bottom) / 2, w, h);
      camera.updateProjectionMatrix();
      cfg.front[0].set(0, 0, d);
      cfg.deep[0].set(30, 20, d * 0.4);
    },
    // sway gently either side of facing you, so both letters always read
    spin(t, g) { g.rotation.y = Math.sin(t * 0.13) * 0.2; g.rotation.x = 0.18 + Math.sin(t * 0.09) * 0.04; },
    tick(t, dt) {
      // build once on load; then every 15 s the whole dome dissolves bottom to top and rebuilds bottom up
      const T0 = 0.8, T1 = 6;
      let b = 1.08, d = -1;
      if (!ctx.reduce && t < T1) b = 1.08 * easeIO((t - T0) / (T1 - T0));
      else if (!ctx.reduce) {
        const c = (t - T1) % 15;
        if (c >= 6 && c < 9.5) d = -0.1 + 1.18 * easeIO((c - 6) / 3.5);
        else if (c >= 9.5) b = 1.08 * easeIO((c - 10) / 5);
      }
      // the reset jumps (dome gone, fronts rewound) are not motion, so they don't light the glow
      const step = Math.abs(b - U.uBuild.value) + Math.abs(d - U.uDis.value), act = step > 0.5 ? U.uActive.value : clamp01(step / Math.max(dt, 1e-3) / 0.12);
      U.uActive.value += (act - U.uActive.value) * Math.min(1, dt * 4);
      U.uBuild.value = b;
      U.uDis.value = d;
      // inertia: the smoothed pointer chases the real one, and the field fades in and out with it
      stepDt = dt;
      P.s.lerp(P.raw, Math.min(1, dt * 6));
      P.amt += ((P.inside ? 1 : 0) - P.amt) * Math.min(1, dt * 3);
    },
    dispose() { tGeo.dispose(); tFill.dispose(); },
  };
  return cfg;
}
