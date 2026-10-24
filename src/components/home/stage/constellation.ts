import type { Group, PerspectiveCamera, Vector3 } from "three";
import type { buildConstellation } from "@/lib/constellation";
import { V, clamp01, floatTex, type Ctx } from "./gpgpu";
import type { PieceCfg } from "./work";
import type { StageItem } from "./index";

// seeded force layout so the constellation keeps the same shape on every visit
function layout(n: number, links: [number, number][]) {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const P = Array.from({ length: n }, () => V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(300)), F = P.map(() => V(0, 0, 0)), d = V(0, 0, 0);
  for (let it = 0; it < 500; it++) {
    F.forEach((f) => f.set(0, 0, 0));
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { d.subVectors(P[i], P[j]); const l = Math.max(d.length(), 5); d.multiplyScalar(4000 / (l * l * l)); F[i].add(d); F[j].sub(d); }
    for (const [a, b] of links) { d.subVectors(P[b], P[a]); const l = Math.max(d.length(), 1); d.multiplyScalar((l - 80) * 0.03 / l); F[a].add(d); F[b].sub(d); }
    P.forEach((p, i) => p.addScaledVector(F[i].addScaledVector(p, -0.002), 0.6));
  }
  const c = P.reduce((a, p) => a.add(p), V(0, 0, 0)).multiplyScalar(1 / n), r = Math.max(...P.map((p) => p.distanceTo(c)));
  return P.map((p) => p.sub(c).multiplyScalar(175 / r));
}

// every project, linked to the tools it shares with others; drag to spin, tap a project to read about it
export function constellation(ctx: Ctx, items: StageItem[], net: ReturnType<typeof buildConstellation>): PieceCfg {
  const { root, reduce, small } = ctx;
  const sec = root.querySelector<HTMLElement>("#graph")!, layer = root.querySelector<HTMLElement>("#graph-labels")!, card = root.querySelector<HTMLElement>("#graph-card")!;
  const field = (name: string) => card.querySelector<HTMLElement>(`[data-card="${name}"]`)!;
  const { hubs } = net, NP = items.length, N = NP + hubs.length;
  const index = new Map(items.map((p, i) => [p.slug, i]));
  const links: [number, number][] = net.links.map(([slug, hub]) => [index.get(slug)!, NP + hubs.indexOf(hub)]);
  const toolsOf = items.map((p) => net.links.filter(([slug]) => slug === p.slug).map(([, hub]) => hub));
  // shortcut: one bit per project in a float, exact up to 24 projects; past that, store the masks in more channels
  const P = layout(N, links), mask = Array.from({ length: N }, (_, n) => (n < NP ? 2 ** n : 0));
  links.forEach(([i, h]) => { mask[h] += 2 ** i; });
  const E = links.length, Wt = Math.max(E, N), data = new Float32Array(Wt * 5 * 4), put = (x: number, y: number, a: number[]) => data.set(a, (y * Wt + x) * 4);
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  links.forEach(([i, h], e) => {
    const a = P[i], b = P[h], d = b.clone().sub(a);
    const m = a.clone().add(b).multiplyScalar(0.5).add(V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).projectOnPlane(d.clone().normalize()).setLength(d.length() * 0.15));
    put(e, 0, [a.x, a.y, a.z, i]); put(e, 1, [b.x, b.y, b.z, h]); put(e, 2, [m.x, m.y, m.z, 0]);
  });
  P.forEach((p, n) => { put(n, 3, [p.x, p.y, p.z, n < NP ? 10 : 6]); put(n, 4, [mask[n], 0, 0, 0]); });
  const tNet = floatTex(data, Wt, 5);
  const U = { tNet: { value: tNet }, uE: { value: E }, uN: { value: N }, uSel: { value: -1 }, uHov: { value: -1 } };

  const els: HTMLElement[] = [
    ...items.map((p, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "node-label " + (p.half === "day" ? "work" : "play");
      b.textContent = p.name;
      b.dataset.i = String(i);
      b.setAttribute("aria-pressed", "false");
      return b;
    }),
    ...hubs.map((h) => { const s = document.createElement("span"); s.className = "hub-label"; s.textContent = h; return s; }),
  ];
  els.forEach((el) => layer.appendChild(el));
  const scr = P.map(() => ({ x: -999, y: -999 })), v = V(0, 0, 0);
  let yaw = 0.4, pitch = 0.2, vyaw = 0, idle = 9, sel = -1, hov = -1;
  let drag: { x: number; y: number; x0: number; y0: number; id: number; label: HTMLElement | null } | null = null;
  const pick = (x: number, y: number) => {
    let best = -1, bd = 32 * 32;
    for (let i = 0; i < NP; i++) { const d = (scr[i].x - x) ** 2 + (scr[i].y - y) ** 2; if (d < bd) { bd = d; best = i; } }
    return best;
  };
  const related = (n: number, i: number) => i >= 0 && (mask[n] & (2 ** i)) > 0;
  function select(i: number) {
    sel = i;
    els.forEach((el, n) => { if (n < NP) el.setAttribute("aria-pressed", String(n === i)); else el.classList.toggle("lit", related(n, i)); });
    card.hidden = i < 0;
    if (i < 0) return;
    const p = items[i];
    field("kind").textContent = p.half === "day" ? "9 to 5" : "5 to 9";
    field("name").textContent = p.name;
    field("line").textContent = p.line;
    field("tools").textContent = "Built with " + toolsOf[i].join(", ");
    field("link").setAttribute("href", `/projects/${p.slug}`);
  }
  const target = (e: Event) => e.target as Element;
  // one handler set for mouse and touch: horizontal drags spin, a still tap selects; vertical swipes stay page scrolls (touch-action: pan-y)
  const down = (e: PointerEvent) => {
    if (target(e).closest("#graph-card")) return;
    drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, id: e.pointerId, label: target(e).closest<HTMLElement>(".node-label") };
    if (e.pointerType === "mouse") { sec.setPointerCapture(e.pointerId); sec.style.cursor = "grabbing"; }
  };
  const move = (e: PointerEvent) => {
    if (drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      yaw += dx * 0.006;
      vyaw = dx * 0.006 * 60;
      idle = 0;
      if (e.pointerType === "mouse") pitch = Math.max(-0.6, Math.min(0.8, pitch + dy * 0.004));
    } else if (e.pointerType === "mouse") {
      const b = target(e).closest<HTMLElement>(".node-label");
      hov = b ? +b.dataset.i! : pick(e.clientX, e.clientY);
      sec.style.cursor = hov >= 0 ? "pointer" : "";
    }
  };
  const end = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (e.type === "pointerup" && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) {
      const hit = drag.label ? +drag.label.dataset.i! : pick(e.clientX, e.clientY);
      select(hit === sel ? -1 : hit);
    }
    drag = null;
    sec.style.cursor = "";
  };
  const leave = (e: PointerEvent) => { if (e.pointerType === "mouse" && !drag) hov = -1; };
  // keyboard: a click with no pointer behind it
  const click = (e: MouseEvent) => { const b = target(e).closest<HTMLElement>(".node-label"); if (b && e.detail === 0) select(+b.dataset.i! === sel ? -1 : +b.dataset.i!); };
  const key = (e: KeyboardEvent) => { if (e.key === "Escape" && sel >= 0) select(-1); };
  sec.addEventListener("pointerdown", down);
  sec.addEventListener("pointermove", move);
  sec.addEventListener("pointerup", end);
  sec.addEventListener("pointercancel", end);
  sec.addEventListener("pointerleave", leave);
  layer.addEventListener("click", click);
  addEventListener("keydown", key);

  return {
    U,
    glsl: `uniform float uFlowT; uniform sampler2D tNet; uniform float uE; uniform float uN; uniform float uSel; uniform float uHov;
      vec4 nf(int x, int y){ return texelFetch(tNet, ivec2(x, y), 0); }
      vec3 qb(vec3 a, vec3 c, vec3 b, float t){ float u = 1.0 - t; return a * u * u + c * 2.0 * u * t + b * t * t; }
      float isNode(vec2 uv){ return step(hash(uv + 11.3), 0.2); }
      int nodeOf(vec2 uv){ return int(floor(hash(uv + 2.2) * uN)); }
      int edgeOf(vec2 uv){ return int(floor(hash(uv + 4.4) * uE)); }
      float sOf(vec2 uv){ return fract(hash(uv + 7.9) + uFlowT * (0.05 + 0.05 * hash(uv + 3.1))); }
      vec3 home(vec2 uv){
        if (isNode(uv) > 0.5) { vec4 c = nf(nodeOf(uv), 3); float r = pow(hash(uv + 4.4), 1.6) * c.w, th = hash(uv + 5.5) * 6.2832 + uTime * (0.3 + hash(uv + 6.6)), ph = acos(2.0 * hash(uv + 7.7) - 1.0);
          return c.xyz + r * vec3(sin(ph) * cos(th), cos(ph), sin(ph) * sin(th)); }
        int e = edgeOf(uv); vec3 A = nf(e, 0).xyz, B = nf(e, 1).xyz, C = nf(e, 2).xyz;
        float s = sOf(uv), t = hash(uv + 5.5) < 0.5 ? s : 1.0 - s; vec3 p = qb(A, C, B, t);
        return p + tube(normalize(qb(A, C, B, t + 0.01) - p + 1e-4), pow(hash(uv + 2.3), 2.0) * 3.0, hash(uv + 6.7) * 6.2832); }
      float bit(float m, float i){ return mod(floor(m / exp2(i)), 2.0); }
      float linkOf(vec2 uv, float i){ if (i < 0.0) return 0.0; return isNode(uv) > 0.5 ? bit(nf(nodeOf(uv), 4).x, i) : 1.0 - step(0.5, abs(nf(edgeOf(uv), 0).w - i)); }
      float fadeOf(vec2 uv){ if (isNode(uv) > 0.5) return 1.0; float s = sOf(uv); return smoothstep(0.0, 0.07, s) * (1.0 - smoothstep(0.93, 1.0, s)); }
      float weightOf(vec2 uv){ float w = isNode(uv) > 0.5 ? 1.3 : 1.0; return uSel < 0.0 ? w : w * mix(0.3, 1.0, linkOf(uv, uSel)); }
      float accentOf(vec2 uv, vec3 p){ return max(linkOf(uv, uSel), 0.6 * linkOf(uv, uHov)); }`,
    warp: true, spring: 8, flow: 1.4, surge: 0, gain: 0.12, accGain: 0.2, pt: 1.4, fog: [600, 1300], bloom: [0.42, 0.3, 0.88], offset: [0.06, -0.04],
    front: [V(0, 0, small ? 1050 : 700), V(0, 0, 0)], deep: [V(0, 0, small ? 1050 : 700), V(0, 0, 0)], shift: 0,
    spin(t: number, g: Group) { g.rotation.set(pitch, yaw, 0); },
    tick(t: number, dt: number) {
      idle += dt;
      // drift slowly when left alone, but hold still while a project is picked so it stays easy to tap
      if (!drag) { vyaw *= Math.exp(-dt * 4); yaw += vyaw * dt + (idle > 4 && sel < 0 && !reduce ? dt * 0.05 : 0); }
      U.uSel.value = sel;
      U.uHov.value = hov;
    },
    // keep each label on its node; labels at the back fade, and unrelated ones dim while a project is picked
    after(camera: PerspectiveCamera, grp: Group) {
      grp.updateMatrixWorld();
      camera.updateMatrixWorld();
      P.forEach((p: Vector3, i) => {
        v.copy(p).applyMatrix4(grp.matrixWorld);
        const z = -v.clone().applyMatrix4(camera.matrixWorldInverse).z;
        v.project(camera);
        const x = (v.x + 1) / 2 * innerWidth, y = (1 - v.y) / 2 * innerHeight;
        scr[i].x = x;
        scr[i].y = y;
        const near = clamp01((camera.position.z + 240 - z) / 440), on = i === sel || i === hov || related(i, sel);
        els[i].style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        els[i].style.opacity = String(sel >= 0 && !on ? 0.22 : 0.35 + 0.65 * near);
      });
    },
    dispose() {
      sec.removeEventListener("pointerdown", down);
      sec.removeEventListener("pointermove", move);
      sec.removeEventListener("pointerup", end);
      sec.removeEventListener("pointercancel", end);
      sec.removeEventListener("pointerleave", leave);
      layer.removeEventListener("click", click);
      removeEventListener("keydown", key);
      els.forEach((el) => el.remove());
      tNet.dispose();
    },
  };
}
