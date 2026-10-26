import * as THREE from "three";

// public/about/city.json: streets delta-encoded in tenths of a unit, x east and z south, River North at the origin
interface City {
  streets: number[][];
  major: number[];
  labels: [name: string, x: number, z: number][];
}

const HEART = '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.4 2.9 4.5 6.6 4.5c2.2 0 3.6 1.2 4.4 2.5.8-1.3 2.2-2.5 4.4-2.5 3.7 0 5.7 3.9 4.2 7.2C19.5 16.4 12 21 12 21z"/></svg>';

/**
 * Ported from about.html: Chicago's streets on a tilted plane; the ones near the cursor rise into glowing ridges.
 * The camera is fixed. Adds its canvas and label layer to `wrap` and removes them on dispose.
 */
export function mountStreetMap(wrap: HTMLElement, data: unknown): () => void {
  const city = data as City;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  let renderer: THREE.WebGLRenderer;
  try {
    // probe first: three.js logs a console error when it cannot create the context itself
    const context = canvas.getContext("webgl2", { antialias: true, alpha: true });
    if (!context) throw new Error("no WebGL2");
    renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, alpha: true });
  } catch {
    wrap.hidden = true;
    return () => {};
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  const labelsEl = document.createElement("div");
  labelsEl.dataset.labels = "";
  labelsEl.setAttribute("aria-hidden", "true");
  wrap.prepend(canvas, labelsEl);

  const CENTER = new THREE.Vector2(-60, 40); // between River North and the West Loop, so downtown sits in the middle
  // a phone is too narrow for both, so it looks east instead: River North on the left, Lake Shore Drive, Navy Pier and the lake
  const EAST = new THREE.Vector2(110, 40);
  const REACH = 520; // the plan has faded out completely this far from the centre, so streets beyond it are left out
  const near = (x: number, z: number) => Math.hypot(x / 10 - CENTER.x, z / 10 - CENTER.y) < REACH;
  const segs: number[] = [];
  city.streets.forEach((p, i) => {
    let x = 0, z = 0, px = 0, pz = 0;
    for (let k = 0; k < p.length; k += 2) {
      x += p[k];
      z += p[k + 1];
      if (k && (near(px, pz) || near(x, z))) segs.push(px / 10, pz / 10, x / 10, z / 10, city.major[i]);
      px = x;
      pz = z;
    }
  });
  const n = segs.length / 5, pos = new Float32Array(n * 6), maj = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const s = i * 5;
    pos.set([segs[s], 0, segs[s + 1], segs[s + 2], 0, segs[s + 3]], i * 6);
    maj[i * 2] = maj[i * 2 + 1] = segs[s + 4];
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aMajor", new THREE.BufferAttribute(maj, 1));
  const U = {
    uCur: { value: new THREE.Vector2(0, 0) }, uAmt: { value: 0 }, uLift: { value: 0 }, uR: { value: 52 }, uCenter: { value: CENTER },
    uFade: { value: new THREE.Vector2(330, REACH) }, uBase: { value: new THREE.Color("#4f86c6") }, uInk: { value: new THREE.Color("#f0f6fb") },
  };
  // two copies: the flat street plan, and the same streets lifted into a ridge around the cursor
  const make = (lifted: boolean) => new THREE.LineSegments(geo, new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: lifted ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: `attribute float aMajor; uniform vec2 uCur, uCenter; uniform float uAmt, uLift, uR; varying float vH, vMajor, vEdge; varying vec2 vW;
      void main(){ vec3 p = position; float d = distance(p.xz, uCur); float h = uAmt * exp(-d * d / (uR * uR));
        ${lifted ? "p.y += h * uLift * (0.8 + 0.4 * aMajor);" : ""}
        vH = h; vMajor = aMajor; vW = p.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform vec3 uBase, uInk; uniform vec2 uCenter, uFade; varying float vH, vMajor; varying vec2 vW;
      void main(){ float fade = 1.0 - smoothstep(uFade.x, uFade.y, distance(vW, uCenter));  // the plan dissolves at its edges instead of being cut off
        ${lifted
          ? "if (vH < 0.02) discard; vec3 c = mix(uBase, uInk, smoothstep(0.1, 0.8, vH)); gl_FragColor = vec4(c * (0.4 + 0.9 * vH) * (0.75 + 0.5 * vMajor), fade);"
          : "float a = (0.34 + 0.4 * vMajor) * (1.0 - 0.75 * vH); gl_FragColor = vec4(uBase, a * fade);"} }`,
  }));
  const scene = new THREE.Scene(), flat = make(false), lift = make(true);
  flat.frustumCulled = lift.frustumCulled = false;
  scene.add(flat, lift);
  const camera = new THREE.PerspectiveCamera(36, 1, 1, 4000), target = new THREE.Vector3(), base = new THREE.Vector3();

  // neighbourhood names in white, a red heart on River North (no label: the heart says it)
  const labels: { el: HTMLElement; v: THREE.Vector3; heart?: boolean }[] = city.labels.filter((l) => l[0] !== "River North").map(([name, x, z]) => {
    const el = document.createElement("span");
    el.textContent = name;
    if (name === "The Loop" || name === "Lake Michigan") el.dataset.big = "";
    labelsEl.appendChild(el);
    return { el, v: new THREE.Vector3(x / 10, 0, z / 10) };
  });
  const heart = document.createElement("span");
  heart.dataset.heart = "";
  heart.innerHTML = HEART;
  labelsEl.appendChild(heart);
  labels.push({ el: heart, v: new THREE.Vector3(0, 0, 0), heart: true });

  let W = 1, H = 1;
  function resize() {
    W = wrap.clientWidth;
    H = wrap.clientHeight;
    renderer.setSize(W, H, false);
    const narrow = W < 700;
    camera.aspect = W / H;
    camera.fov = narrow ? 50 : 36;
    camera.updateProjectionMatrix();
    // tilted back about 50 degrees, close enough that downtown fills the frame
    const c = narrow ? EAST : CENTER;
    U.uCenter.value = c; // the plan and the names fade out from the middle of the view
    target.set(c.x, 0, c.y);
    base.set(c.x, narrow ? 470 : 430, c.y + (narrow ? 420 : 380));
    U.uFade.value.set(narrow ? 250 : 330, narrow ? 420 : REACH);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(wrap);
  resize();

  // the cursor on the ground plane; with no mouse, the ridge wanders around downtown and a tap sends it there
  const ray = new THREE.Raycaster(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(), ndc = new THREE.Vector2();
  const goal = new THREE.Vector2(0, 0);
  let inside = false, lastTouch = -1e9;
  const aim = (e: PointerEvent) => {
    const r = wrap.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / W) * 2 - 1, -((e.clientY - r.top) / H) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(ground, hit)) goal.set(hit.x, hit.z);
  };
  const onMove = (e: PointerEvent) => { if (e.pointerType === "mouse") { inside = true; aim(e); } };
  const onLeave = () => { inside = false; };
  const onUp = (e: PointerEvent) => { if (e.pointerType !== "mouse") { aim(e); lastTouch = performance.now(); } };
  wrap.addEventListener("pointermove", onMove);
  wrap.addEventListener("pointerleave", onLeave);
  wrap.addEventListener("pointerup", onUp);
  const hint = wrap.querySelector<HTMLElement>("[data-hint]");
  if (coarse && hint) hint.textContent = "Tap the map and the streets rise where you touch.";

  let onScreen = false;
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }, { threshold: 0.05 });
  io.observe(wrap);
  let amt = 0, last = performance.now(), raf = 0;
  const t0 = last, tmp = new THREE.Vector3();
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (!onScreen || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000), t = (now - t0) / 1000;
    last = now;
    const touched = now - lastTouch < 6000;
    if (!inside && !touched && !reduce) goal.set(-40 + 70 * Math.sin(t * 0.21), 30 + 60 * Math.sin(t * 0.13 + 1.3)); // idle: drift around downtown
    U.uCur.value.lerp(goal, Math.min(1, dt * (inside ? 7 : 2.5)));
    amt += ((inside || touched || !coarse ? 1 : 0.85) - amt) * Math.min(1, dt * 3);
    U.uAmt.value = reduce ? 0.8 : amt;
    U.uLift.value = 34;
    camera.position.copy(base);
    camera.lookAt(target);
    renderer.render(scene, camera);
    const [f0, f1] = [U.uFade.value.x * 0.75, U.uFade.value.y * 0.75];
    for (const L of labels) {
      tmp.copy(L.v).project(camera);
      const sx = ((tmp.x + 1) / 2) * W, sy = ((1 - tmp.y) / 2) * H;
      const d = Math.hypot(L.v.x - U.uCenter.value.x, L.v.z - U.uCenter.value.y), vis = 1 - Math.min(1, Math.max(0, (d - f0) / (f1 - f0)));
      L.el.style.left = `${sx}px`;
      L.el.style.top = `${sy}px`;
      // names near an edge hide; along the bottom they clear the hint
      L.el.style.opacity = L.heart ? "1" : String(vis * (sx < 30 || sx > W - 30 || sy < 20 || sy > H - 52 ? 0 : 1));
    }
  }
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    wrap.removeEventListener("pointermove", onMove);
    wrap.removeEventListener("pointerleave", onLeave);
    wrap.removeEventListener("pointerup", onUp);
    geo.dispose();
    flat.material.dispose();
    lift.material.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    labelsEl.remove();
  };
}
