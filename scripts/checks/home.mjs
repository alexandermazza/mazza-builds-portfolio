// The homepage: section order, copy, the ticker, the Selected work links, and readable content without WebGL or JavaScript.
import { openPage, assertNoOverflow, expectNoErrors } from "../check-site.mjs";

const SECTIONS = ["hero", "intro", "stats", "ticker", "work", "graph", "foot"];
const TICKER = ["iOS Apps", "AI Agents", "Dashboards", "Web Crawlers", "Trading Bots", "Shopify Apps", "MCP Servers", "Attribution Engines", "GTM Tools"];
const WORK = ["distill", "web-tracker-scanner", "secondround", "daily-roman"].map((s) => `/projects/${s}`);

function check(ok, message) {
  if (!ok) throw new Error(`/: ${message}`);
}

// the hero h1 and the intro text: visible once scrolled to, whatever ran
async function readable(page, label) {
  check(/mazza\s*builds/i.test(await page.locator("h1").first().textContent()), `${label}: h1 does not read Mazza Builds`);
  await page.locator("#intro").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  const opacity = await page.evaluate(() => {
    const seen = (el) => {
      let o = 1;
      for (let n = el; n; n = n.parentElement) o *= +getComputedStyle(n).opacity;
      return o;
    };
    return { h1: seen(document.querySelector("h1")), intro: seen(document.querySelector("#intro p")) };
  });
  check(opacity.h1 > 0.1, `${label}: h1 opacity is ${opacity.h1}`);
  check(opacity.intro > 0.1, `${label}: intro opacity is ${opacity.intro}`);
}

const translateX = (page) =>
  page.locator("#ticker [aria-hidden] > *").first().evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);

async function desktop() {
  // reduced motion stops the drift, so only the drag moves the ticker
  const { page, errors } = await openPage("/", { reducedMotion: "reduce" });

  const ids = await page.evaluate((all) => [...document.querySelectorAll("[id]")].map((el) => el.id).filter((id) => all.includes(id)), SECTIONS);
  // the stats section is left out when neither live source has data (the local default)
  const expected = SECTIONS.filter((id) => id !== "stats" || ids.includes("stats"));
  check(JSON.stringify(ids) === JSON.stringify(expected), `sections are ${JSON.stringify(ids)}`);

  check((await page.locator("#intro").textContent()).includes("Senior GTM Engineer, AI"), 'intro lacks "Senior GTM Engineer, AI"');
  if (ids.includes("stats")) {
    check(/so far/i.test(await page.locator("#stats h2").textContent()), "stats heading missing");
    check((await page.locator("#stats figure").count()) > 0, "stats section has no figure");
  }

  const said = await page.locator("#ticker-list").textContent();
  const at = TICKER.map((w) => said.indexOf(w));
  check(at.every((i, n) => i >= 0 && (n === 0 || i > at[n - 1])), `ticker screen-reader text is "${said}"`);

  const marquee = page.locator("#ticker [aria-hidden]").first();
  await marquee.scrollIntoViewIfNeeded();
  const before = await translateX(page);
  const box = await marquee.boundingBox();
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 700, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + 700 - i * 30, y);
  await page.mouse.up();
  await page.waitForTimeout(300);
  const after = await translateX(page);
  check(after < before - 200, `dragging the ticker 300px left moved it from ${before} to ${after}`);

  const work = await page.locator('#work a[href^="/projects/"]').evaluateAll((els) => els.map((a) => a.getAttribute("href")));
  check(JSON.stringify(work) === JSON.stringify(WORK), `Selected work links are ${JSON.stringify(work)}`);

  // the graph's labels live in a fixed layer that is hidden until the graph is on screen; tabbing must not land on them unseen
  await page.locator("#graph-labels button").first().waitFor({ state: "attached", timeout: 15000 })
    .catch(() => check(false, "the graph labels never mounted"));
  // stop at the footer: tabbing out of the document stops headless Chromium drawing frames, which stalls the reveals
  await page.locator(`#work a[href="${WORK.at(-1)}"]`).focus();
  for (let i = 1; ; i++) {
    await page.keyboard.press("Tab");
    const seen = await page.evaluate(() => {
      const el = document.activeElement;
      let o = 1;
      for (let n = el; n; n = n.parentElement) o *= +getComputedStyle(n).opacity;
      return { o, what: `${el.tagName} "${el.textContent.trim().slice(0, 40)}"`, footer: !!el.closest("footer") };
    });
    check(seen.o > 0.1, `Tab ${i} after Selected work focused ${seen.what} at opacity ${seen.o.toFixed(2)}`);
    if (seen.footer) break;
    check(i < 20, "20 Tabs after Selected work never reached the footer");
  }

  await readable(page, "desktop");
  await assertNoOverflow(page);
  expectNoErrors(errors, "/ (desktop)");
}

async function phone() {
  const { page, errors } = await openPage("/", { phone: true });
  for (const id of ["intro", "ticker", "work", "graph", "foot"]) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await assertNoOverflow(page);
  }
  expectNoErrors(errors, "/ (phone)");
}

// on phones the text sits under its shape: scroll a heading to a point on screen and read which shape is up
async function shapeAt(page, name, at) {
  const heading = page.locator("#work").getByRole("heading", { name, exact: true });
  await heading.evaluate((el, at) => window.scrollBy(0, el.getBoundingClientRect().top - innerHeight * at), at);
  await page.waitForTimeout(300);
  return page.evaluate(() => document.querySelector("main")?.dataset.shape);
}

async function phoneShapes() {
  const { page, errors } = await openPage("/", { phone: true });
  const cases = [
    // a project's shape is up while its text comes in under it
    ["Distill", 0.75, "1"],
    ["AI Web Tracker Scanner", 0.75, "2"],
    ["Daily Roman", 0.75, "4"],
    // the night shift waits until the scanner's text has gone, then lands with the 5 to 9 heading
    ["5 to 9", 0.72, "2"],
    ["5 to 9", 0.55, "3"],
  ];
  for (const [name, at, want] of cases) {
    const got = await shapeAt(page, name, at);
    check(got === want, `on a phone, with "${name}" ${Math.round(at * 100)}% down the screen the stage shows shape ${got}, not ${want}`);
  }
  expectNoErrors(errors, "/ (phone shapes)");
}

async function noWebgl() {
  const { page, errors } = await openPage("/", { webgl: false });
  await readable(page, "without WebGL");
  const shown = await page.locator("canvas").evaluateAll((els) => els.filter((c) => getComputedStyle(c).display !== "none").length);
  check(shown === 0, "a canvas is still shown without WebGL");
  expectNoErrors(errors, "/ (without WebGL)");
}

async function noJs() {
  const { page } = await openPage("/", { js: false });
  await readable(page, "without JavaScript");
  check((await page.locator("#ticker-list").textContent()).includes("GTM Tools"), "ticker list missing without JavaScript");
}

// a failure names the run it came from, since Playwright's own messages don't name the route
async function run(label, fn) {
  try {
    await fn();
  } catch (e) {
    throw new Error(e.message.startsWith("/") ? e.message : `/ (${label}): ${e.message}`);
  }
}

export default async function home() {
  await run("desktop", desktop);
  await run("phone", phone);
  await run("phone shapes", phoneShapes);
  await run("without WebGL", noWebgl);
  await run("without JavaScript", noJs);
}
