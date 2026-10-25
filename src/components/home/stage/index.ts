import { ACESFilmicToneMapping, PerspectiveCamera, Scene, Vector2, WebGLRenderer } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { clamp01, type Ctx, type Piece, type Pointer, type StageState } from "./gpgpu";
import { assembly } from "./logo";
import { particlePiece, workPiece } from "./work";
import { footPiece } from "./foot";

// where the page is; the graph slot has no scene of its own
type Slot = "hero" | "work" | "graph" | "footer";
type SceneKey = Exclude<Slot, "graph">;

/**
 * The homepage's one fixed stage, ported from home.html: the MB logo for the hero, the hammer and project
 * shapes through Selected work, then the contour footer. It steps aside (fades out and stops drawing) while the
 * transit map is on screen. Scrolling picks the scene.
 * Returns a dispose that frees the WebGL context, so leaving the page never leaves one behind.
 */
export function mountHomeStage(canvas: HTMLCanvasElement, root: HTMLElement): () => void {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrow = () => innerWidth < 820;
  const small = matchMedia("(pointer: coarse)").matches || innerWidth < 820;
  const hide = () => {
    canvas.style.display = "none";
    return () => {};
  };
  // asking for the context first means no WebGL is a quiet fallback, not a logged three.js error
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: true, stencil: false, powerPreference: "high-performance" });
  if (!gl) return hide();
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, context: gl, antialias: false, powerPreference: "high-performance" });
  } catch {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return hide();
  }
  // phones draw at 1x: at 1.5x their GPUs fall behind and scrolling stutters, and soft glowing points look the same
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1 : 1.5));
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = ACESFilmicToneMapping;
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(new Scene(), new PerspectiveCamera());
  const bloom = new UnrealBloomPass(new Vector2(256, 256), 0.5, 0.35, 0.9);
  const output = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(output);

  // pointer for the hero's distortion field: a hovering mouse pushes the logo apart, a tap on touch bursts it
  const P: Pointer = { raw: new Vector2(9, 9), s: new Vector2(9, 9), inside: false, amt: 0, tap: -99 };
  const ctx: Ctx = { renderer, root, reduce, small, narrow, pointer: P };
  const MAKE: Record<SceneKey, () => Piece> = {
    hero: () => particlePiece(ctx, assembly(ctx)),
    work: () => workPiece(ctx),
    footer: () => footPiece(ctx),
  };
  const cache: Partial<Record<SceneKey, Piece>> = {}, born: Partial<Record<SceneKey, number>> = {};
  const make = (k: SceneKey) => {
    if (!cache[k]) { cache[k] = MAKE[k](); born[k] = performance.now(); }
    return cache[k]!;
  };
  let slot: Slot = "hero", active: Piece | null = null, activeKey: SceneKey = "hero";
  let pending = 0, raf = 0, warmTimer = 0, dead = false;
  const state: StageState = { heroP: 0, proj: 0 };

  const $ = (id: string) => root.querySelector<HTMLElement>(`#${id}`)!;
  const heroWrap = $("hero-wrap"), intro = $("intro"), graph = $("graph"), foot = $("foot");
  const shapes = [...root.querySelectorAll<HTMLElement>("[data-proj]")];

  const toNdc = (e: PointerEvent, v: Vector2) => v.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  const onMove = (e: PointerEvent) => { if (e.pointerType === "mouse") { toNdc(e, P.raw); P.inside = true; } };
  const onOut = (e: MouseEvent) => { if (!e.relatedTarget) P.inside = false; };
  // a scroll swipe cancels the pointer, so only a real tap reaches pointerup
  const onUp = (e: PointerEvent) => { if (e.pointerType !== "mouse") { toNdc(e, P.raw); P.s.copy(P.raw); P.tap = performance.now() / 1000; } };

  function applyRenderer(p: Piece) {
    renderer.setSize(innerWidth, innerHeight, false);
    composer.setSize(innerWidth, innerHeight);
    bloom.setSize(innerWidth / 2, innerHeight / 2);
    [bloom.strength, bloom.radius, bloom.threshold] = p.bloom;
    p.resize();
  }
  function sync(instant: boolean) {
    clearTimeout(pending);
    // the transit map draws itself, so the stage just fades away under it
    if (slot === "graph") { canvas.setAttribute("data-fade", ""); return; }
    const key = slot, next = make(key);
    if (next === active) { canvas.removeAttribute("data-fade"); return; }
    const go = () => {
      active = next;
      activeKey = key;
      renderPass.scene = next.scene;
      renderPass.camera = next.camera;
      applyRenderer(next);
      canvas.removeAttribute("data-fade");
    };
    if (instant || !active) go();
    else { canvas.setAttribute("data-fade", ""); pending = window.setTimeout(go, 360); }
  }
  function onScroll() {
    const vh = innerHeight, hr = heroWrap.getBoundingClientRect();
    state.heroP = clamp01(-hr.top / Math.max(1, hr.height - vh));
    // on phones the hammer sits above the intro text, so bring it in as soon as the intro starts to show
    const s: Slot = foot.getBoundingClientRect().top < vh * 0.55 ? "footer"
      : graph.getBoundingClientRect().top < vh * 0.5 ? "graph"
      : intro.getBoundingClientRect().top < vh * (narrow() ? 0.85 : 0.5) ? "work" : "hero";
    // which shape: on desktop the block nearest the middle. On phones the text sits under the shape, so a project
    // takes over as its heading comes into the bottom fifth; the short 9 to 5 / 5 to 9 headers wait for mid-screen,
    // or the shift would land while the last project's text is still showing
    let best = 0;
    if (narrow()) shapes.forEach((el) => {
      const at = el.tagName === "ARTICLE" ? 0.8 : 0.6;
      if (el.querySelector("p, h2, h3, h4")!.getBoundingClientRect().top < vh * at) best = +el.dataset.proj!;
    });
    else {
      let bd = 1e9;
      shapes.forEach((el) => { const r = el.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - vh / 2); if (d < bd) { bd = d; best = +el.dataset.proj!; } });
    }
    state.proj = best;
    root.dataset.shape = String(best);
    root.toggleAttribute("data-day", s === "work" && (best === 1 || best === 2));
    if (s !== slot) { slot = s; safe(() => sync(false)); }
  }
  const onResize = () => { if (active) applyRenderer(active); onScroll(); };

  let last = performance.now();
  function frame(ms: number) {
    raf = requestAnimationFrame(frame);
    if (document.hidden || !active || slot === "graph") return;
    const dt = Math.max(0, Math.min(0.04, (ms - last) / 1000));
    last = ms;
    const t = Math.max(0, (ms - born[activeKey]!) / 1000);
    active.update(t, dt, state);
    composer.render();
  }

  function dispose() {
    if (dead) return;
    dead = true;
    cancelAnimationFrame(raf);
    clearTimeout(pending);
    clearTimeout(warmTimer);
    removeEventListener("pointermove", onMove);
    document.removeEventListener("mouseout", onOut);
    removeEventListener("pointerup", onUp);
    removeEventListener("scroll", onScroll);
    removeEventListener("resize", onResize);
    root.removeAttribute("data-day");
    delete root.dataset.shape;
    canvas.removeAttribute("data-fade");
    Object.values(cache).forEach((p) => p.dispose());
    bloom.dispose();
    output.dispose();
    composer.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }
  // a scene that can't be built (no float render targets, say) leaves the page as it is without WebGL
  function safe(fn: () => void) {
    try { fn(); } catch { dispose(); canvas.style.display = "none"; }
  }

  addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("mouseout", onOut);
  addEventListener("pointerup", onUp, { passive: true });
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onResize);
  safe(() => { onScroll(); sync(true); });
  if (dead) return dispose;
  raf = requestAnimationFrame(frame);
  // set up the other scenes in the background, one at a time, so scrolling into them doesn't wait on it
  const warm: SceneKey[] = ["work", "footer"];
  const prewarm = () => {
    const k = warm.shift();
    if (!k || dead) return;
    safe(() => { if (!cache[k]) { const p = make(k); renderer.compile(p.scene, p.camera); } });
    if (!dead) warmTimer = window.setTimeout(prewarm, 700);
  };
  warmTimer = window.setTimeout(prewarm, 1500);
  return dispose;
}
