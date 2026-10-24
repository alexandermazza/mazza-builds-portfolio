// Moving between pages over and over must not pile up WebGL contexts: every scene frees its context when it leaves.
import { openPage } from "../check-site.mjs";

const ROUNDS = 10;
const WEBGL = /WebGL|context lost|Too many active/i;
// headless SwiftShader logs this once per browser for the first WebGL canvas it composites, any canvas at all
// (a bare clear loop does it too), so it says nothing about contexts piling up
const SWIFTSHADER_NOTICE = /GL Driver Message \(OpenGL, Performance, GL_CLOSE_PATH_NV, High\): GPU stall due to ReadPixels/;
const STEPS = [
  ["Projects", "/projects"],
  ["About", "/about"],
  ["Contact", "/contact"],
  ["Mazza Builds", "/"],
];

// counts every WebGL context made and lost; an init script, so it has to be in place before the page loads
function countContexts() {
  const seen = new WeakSet(), get = HTMLCanvasElement.prototype.getContext;
  const gl = (window.__gl = { made: 0, lost: 0 });
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const ctx = get.call(this, type, ...rest);
    if (ctx && /webgl/.test(type) && !seen.has(this)) {
      seen.add(this);
      gl.made++;
      this.addEventListener("webglcontextlost", () => gl.lost++);
    }
    return ctx;
  };
}

export default async function navLoop() {
  const { page } = await openPage("/");
  await page.addInitScript(countContexts);
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => {
    const el = document.querySelector("[data-transition-container]");
    return !!el && Object.keys(el).some((k) => k.startsWith("__reactFiber"));
  });
  const seen = [];
  page.on("console", (m) => {
    if (WEBGL.test(m.text()) && !SWIFTSHADER_NOTICE.test(m.text())) seen.push(`[${m.type()}] ${m.text()} (${new URL(page.url()).pathname})`);
  });

  const bar = page.getByRole("banner").first();
  for (let round = 1; round <= ROUNDS; round++) {
    for (const [name, path] of STEPS) {
      await bar.getByRole("link", { name, exact: true }).click();
      await page.waitForURL((url) => url.pathname === path, { timeout: 10000 }).catch(() => {
        throw new Error(`${path}: round ${round}, clicking "${name}" never arrived`);
      });
      // the page transition is over once its clone of the old page is gone
      await page.waitForFunction(() => document.querySelectorAll("[data-transition-container]").length === 1, null, { timeout: 10000 });
      // give the scenes time to start, so each visit really makes its contexts
      await page.waitForTimeout(1200);
    }
  }

  // Chrome only warns past 16 live contexts, which ten rounds of one scene never reach, so count them too
  const gl = await page.evaluate(() => ({ ...window.__gl, canvases: document.querySelectorAll("canvas").length }));
  if (gl.made === 0) throw new Error("/: no WebGL context was ever made, so the loop proved nothing");
  if (gl.made - gl.lost > gl.canvases) {
    throw new Error(`/: ${gl.made - gl.lost} WebGL contexts still live after ${ROUNDS} rounds (${gl.made} made, ${gl.lost} freed) for ${gl.canvases} canvas(es) on the page`);
  }
  if (seen.length) throw new Error(`/: ${seen.length} WebGL message(s) over ${ROUNDS} rounds\n  ${seen.slice(0, 10).join("\n  ")}`);
}
