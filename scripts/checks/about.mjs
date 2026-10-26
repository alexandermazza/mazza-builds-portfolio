// About page: section order, the sketch, the street map, connections and the live activity figures.
import { openPage, assertNoOverflow, expectNoErrors } from "../check-site.mjs";

const ROUTE = "/about";
const LABELS = ["Spec: Identity", "Spec: Location", "Spec: Systems", "Spec: Activity", "Spec: Process", "Spec: History", "Spec: Connections"];
const H2 = ["Chicago", "The system I run at work", "A loop, not a line", "Build log"];
const LINKS = [
  ["GitHub", /^https:\/\/github\.com\/alexandermazza$/],
  ["LinkedIn", /^https:\/\/www\.linkedin\.com\/in\/alexander-mazza\/?$/],
  ["X", /^https:\/\/(twitter|x)\.com\/mazza_builds$/],
];

function check(ok, message) {
  if (!ok) throw new Error(`${message} on ${ROUTE}`);
}

// what the live loaders have to show, asked of the same server: the usage DB and whether GitHub answers
async function liveData(base) {
  const year = String(new Date().getUTCFullYear());
  const usage = await fetch(`${base}/api/usage`).then((r) => r.json());
  const tokens = usage.data.filter((d) => d.date.startsWith(year)).reduce((sum, d) => sum + d.total_tokens, 0);
  const github = (await fetch(`${base}/api/github`)).ok;
  return { tokens, github };
}

async function desktop(live) {
  const { page, errors } = await openPage(ROUTE, { permissions: ["clipboard-read", "clipboard-write"] });

  check((await page.locator("h1").textContent())?.trim() === "About", 'h1 is not "About"');
  const labels = await page.$$eval("main section[aria-labelledby]", (secs) =>
    secs.map((s) => document.getElementById(s.getAttribute("aria-labelledby"))?.textContent.trim().split(",")[0]),
  );
  const wantLabels = LABELS.filter((l) => l !== "Spec: Activity" || live.tokens > 0 || live.github);
  check(JSON.stringify(labels) === JSON.stringify(wantLabels), `section labels are ${JSON.stringify(labels)}`);
  const h2 = await page.locator("main h2").evaluateAll((els) => els.map((el) => el.textContent.trim()));
  check(JSON.stringify(h2) === JSON.stringify(H2), `h2 headings are ${JSON.stringify(h2)}`);

  const sketch = page.getByAltText(/sketch/i);
  check((await sketch.count()) === 1, "sketch image not found");
  check(!(await sketch.evaluate((el) => !!el.closest("figure")?.querySelector("figcaption"))), "sketch has a caption");
  check((await sketch.evaluate((el) => getComputedStyle(el).opacity)) === "0.85", "sketch is not at 85% opacity");

  // the activity strip shows only what the loaders return, and the build log's token line goes with it
  const text = await page.locator("main").textContent();
  check(text.includes("AI tokens, on") === live.tokens > 0, `token figure ${live.tokens > 0 ? "missing" : "shown with no usage data"}`);
  check(text.includes("GitHub contributions, on") === live.github, `GitHub figure ${live.github ? "missing" : "shown without GitHub data"}`);
  check(/AI tokens in \d{4} alone/.test(text) === live.tokens > 0, "build log token line does not match the usage data");
  if (!live.tokens && !live.github) check(!/40\.2|6,282/.test(text), "mockup figures shown with no live data");

  // before the map: under SwiftShader its frames take a second each, long enough to miss the "Copied" state
  const conn = page.locator('section[aria-labelledby="l-conn"]');
  for (const [name, href] of LINKS) {
    const link = conn.locator("a").filter({ has: page.locator("b", { hasText: new RegExp(`^${name}$`) }) });
    check((await link.count()) === 1, `Connections link "${name}" not found`);
    check(href.test(await link.getAttribute("href")), `Connections link "${name}" has the wrong href`);
  }
  const rows = await conn.locator("li").evaluateAll((lis) => lis.map((li) => !!li.querySelector("svg")));
  check(rows.length === 4 && rows.every(Boolean), "every Connections row needs its platform logo");

  const copy = conn.getByRole("button");
  check((await copy.textContent()) === "Copy", "Copy button not found");
  await copy.click();
  await conn
    .getByRole("button", { name: "Copied", exact: true })
    .waitFor({ timeout: 1500 })
    .catch(async () => check(false, `Copy read "${await copy.textContent()}", not "Copied"`));
  check((await page.evaluate(() => navigator.clipboard.readText())) === "hello@mazzabuilds.com", "Copy did not copy the email");

  const map = page.locator("#map-wrap");
  await map.scrollIntoViewIfNeeded();
  await map
    .locator("canvas")
    .waitFor({ state: "attached", timeout: 20000 })
    .catch(() => check(false, "no canvas in the map after scrolling to it"));
  const heart = map.locator("[data-heart]");
  await heart.waitFor({ state: "attached", timeout: 10000 }).catch(() => check(false, "map heart not found"));
  const box = await map.boundingBox();
  const spot = async (dx) => {
    await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2, { steps: 4 });
    await page.waitForTimeout(400);
    return heart.evaluate((el) => `${el.style.left},${el.style.top}`);
  };
  const a = await spot(-200);
  const b = await spot(200);
  check(/^\d[\d.]*px,\d[\d.]*px$/.test(a), `heart is not placed (${a})`);
  check(a === b, `heart moved with the cursor (${a} then ${b}): the camera must stay fixed`);

  await assertNoOverflow(page);
  expectNoErrors(errors, `${ROUTE} (desktop)`);
  // a map left on screen keeps the shared SwiftShader GPU busy and starves the next run
  await page.context().close();
}

async function phone() {
  const { page, errors } = await openPage(ROUTE, { phone: true });
  await page.locator("#map-wrap").scrollIntoViewIfNeeded();
  await page.locator("#map-wrap canvas").waitFor({ state: "attached", timeout: 20000 }).catch(() => check(false, "no map canvas at phone width"));
  // a phone looks east of downtown, so Lake Shore Drive, Navy Pier and the lake are in view, with River North's heart still on the map
  await page.waitForTimeout(1500);
  const seen = await page.locator("#map-wrap").evaluate((wrap) => {
    const box = wrap.getBoundingClientRect();
    const at = (el) => {
      const r = el.getBoundingClientRect(), x = r.left + r.width / 2 - box.left;
      return { inside: x > 0 && x < box.width, opacity: +getComputedStyle(el).opacity };
    };
    const names = [...wrap.querySelectorAll("[data-labels] span:not([data-heart])")];
    const named = Object.fromEntries(names.map((s) => [s.textContent, at(s)]));
    // a name showing over the "Tap the map" hint along the bottom
    const hint = wrap.querySelector("[data-hint]").getBoundingClientRect();
    const overHint = names.filter((s) => {
      const r = s.getBoundingClientRect();
      return +getComputedStyle(s).opacity > 0.05 && r.bottom > hint.top && r.top < hint.bottom && r.right > hint.left && r.left < hint.right;
    }).map((s) => s.textContent);
    return { pier: named["Navy Pier"], heart: at(wrap.querySelector("[data-heart]")), overHint };
  });
  for (const [name, s] of [["Navy Pier", seen.pier], ["the heart", seen.heart]])
    check(s && s.inside && s.opacity > 0.5, `on a phone ${name} is not in view on the map (${JSON.stringify(s)})`);
  check(seen.overHint.length === 0, `on a phone ${seen.overHint.join(", ")} shows over the map's hint`);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  await assertNoOverflow(page);
  expectNoErrors(errors, `${ROUTE} (phone)`);
  await page.context().close();
}

// without WebGL the map steps aside quietly and the rest of the sheet still reads
async function noWebgl() {
  const { page, errors } = await openPage(ROUTE, { webgl: false });
  await page.locator("#map-wrap").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.getElementById("map-wrap")?.hidden, null, { timeout: 20000 }).catch(() => check(false, "map not hidden without WebGL"));
  check(await page.getByRole("heading", { name: "Build log" }).isVisible(), "Build log not visible without WebGL");
  expectNoErrors(errors, `${ROUTE} (no WebGL)`);
}

export default async function about({ base }) {
  const live = await liveData(base);
  await desktop(live);
  await phone();
  await noWebgl();
}
