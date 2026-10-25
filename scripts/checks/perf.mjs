// Phones render the pixel-bound 3D scenes at 1x: at 1.5x their GPUs fall behind and scrolling stutters.
// (The about map is bound by its vertices, not its pixels, so it keeps 1.5x.)
import { openPage } from "../check-site.mjs";

const check = (ok, msg) => {
  if (!ok) throw new Error(msg);
};

export default async function perf() {
  for (const route of ["/", "/projects", "/contact"]) {
    const { page } = await openPage(route, { phone: true });
    await page
      .waitForFunction(() => [...document.querySelectorAll("canvas")].some((c) => c.width > 300), null, { timeout: 15000 })
      .catch(() => {});
    const ratios = await page.evaluate(() =>
      [...document.querySelectorAll("canvas")].filter((c) => c.clientWidth > 0).map((c) => +(c.width / c.clientWidth).toFixed(2)),
    );
    check(ratios.length > 0, `${route}: no 3D canvas on a phone`);
    check(ratios.every((r) => r <= 1.01), `${route}: a phone renders the 3D at ${ratios.join(", ")}x, not 1x`);
    await page.context().close();
  }
}
