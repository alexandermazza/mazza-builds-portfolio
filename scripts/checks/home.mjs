// The homepage: section order, copy, the ticker, the Selected work links, and readable content without WebGL or JavaScript.
import { openPage, assertNoOverflow, expectNoErrors } from "../check-site.mjs";
import { projects } from "../../src/data/projects.ts";

const SECTIONS = ["hero", "intro", "stats", "ticker", "work", "graph", "foot"];
const TICKER = ["iOS Apps", "AI Agents", "Dashboards", "Web Crawlers", "Trading Bots", "Shopify Apps", "MCP Servers", "Attribution Engines", "GTM Tools"];
const WORK = ["distill", "path", "secondround", "daily-roman"].map((s) => `/projects/${s}`);

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

  check((await page.locator("#intro").textContent()).includes("GTM Engineer at a healthcare SaaS company"), 'intro lacks "GTM Engineer at a healthcare SaaS company"');
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

  // the films: one each for Distill and Path; with reduced motion they hold on their posters
  const films = page.locator("#work video");
  check((await films.count()) === 2, `Selected work has ${await films.count()} films, not 2`);
  for (const film of await films.all()) {
    await film.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    check(await film.evaluate((v) => v.paused && !!v.poster), "with reduced motion a homepage film plays, or has no poster");
  }

  // the transit map's chips and stops are tab stops; none may be focused while unseen
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
    check(i < 40, "40 Tabs after Selected work never reached the footer");
  }

  await readable(page, "desktop");
  await assertNoOverflow(page);
  expectNoErrors(errors, "/ (desktop)");
  await page.context().close();
}

async function phone() {
  const { page, errors } = await openPage("/", { phone: true });
  // a film plays while it's on screen and stops once it's scrolled away, so phones don't stream films nobody sees
  const film = page.locator("#work article", { has: page.getByRole("heading", { name: "Path", exact: true }) }).locator("video");
  await film.scrollIntoViewIfNeeded();
  const playing = await film.evaluate((v) => new Promise((done) => {
    if (!v.paused) return done(true);
    v.addEventListener("playing", () => done(true), { once: true });
    setTimeout(() => done(!v.paused), 4000);
  }));
  check(playing, "on a phone, Path's film does not play once it is on screen");
  await page.locator("#foot").scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  check(await page.locator("#work video").evaluateAll((vs) => vs.every((v) => v.paused)), "a homepage film keeps playing after it is scrolled away");
  for (const id of ["intro", "ticker", "work", "graph", "foot"]) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await assertNoOverflow(page);
  }
  expectNoErrors(errors, "/ (phone)");
  await page.context().close();
}

const chips = (page) => page.locator("#graph button[aria-pressed]").evaluateAll((els) => els.filter((b) => b.offsetParent !== null).length);

// "How it all connects" as a transit map: a stop per project, a chip per line, follow a line, open a stop
async function transit() {
  const { page, errors } = await openPage("/");
  const stops = await page.locator('#graph a[href^="/projects/"]').evaluateAll((els) => els.map((a) => a.getAttribute("href")));
  check(stops.length === projects.length, `the transit map has ${stops.length} stops, not ${projects.length}`);
  check(projects.every((p) => stops.includes(`/projects/${p.slug}`)), "a project is missing from the transit map");
  check((await chips(page)) === 10, `desktop shows ${await chips(page)} line chips, not 10`);

  // a stop the drawing has not reached yet still shows the moment it takes focus
  await page.locator("#graph h2").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const last = page.locator('#graph a[href^="/projects/"]').last();
  await last.focus();
  const seen = (el) => { let o = 1; for (let n = el; n; n = n.parentElement) o *= +getComputedStyle(n).opacity; return o; };
  await page.waitForFunction((sel) => { const el = [...document.querySelectorAll(sel)].pop(); let o = 1; for (let n = el; n; n = n.parentElement) o *= +getComputedStyle(n).opacity; return o > 0.5; },
    '#graph a[href^="/projects/"]', { timeout: 2000 }).catch(() => {});
  const o = await last.evaluate(seen);
  check(o > 0.5, `a focused stop the drawing had not reached is at opacity ${o.toFixed(2)}`);

  await page.getByRole("button", { name: /^Claude/ }).click();
  check((await page.getByRole("button", { name: /^Claude/ }).getAttribute("aria-pressed")) === "true", "the Claude chip is not pressed after a click");
  const note = (await page.locator("#graph [aria-live]").textContent()) ?? "";
  check(note.includes("Claude runs through 6 projects"), `following Claude says "${note}"`);

  await page.locator('#graph a[href="/projects/distill"]').click();
  await page.waitForURL("**/projects/distill", { timeout: 10000 }).catch(() => check(false, `clicking the Distill stop went to ${page.url()}`));
  await assertNoOverflow(page);
  expectNoErrors(errors, "/ (transit map)");
  await page.context().close();

  const { page: p, errors: pe } = await openPage("/", { phone: true });
  check((await chips(p)) === 8, `a phone shows ${await chips(p)} line chips, not 8`);
  await p.locator("#graph").scrollIntoViewIfNeeded();
  await p.waitForTimeout(500);
  await assertNoOverflow(p);
  expectNoErrors(pe, "/ (transit map, phone)");
  await p.context().close();
}

// a screen tall enough for the whole section must finish the drawing while the heading is still in view under the bar
async function tallTransit() {
  const { page, errors } = await openPage("/", { viewport: { width: 1440, height: 1300 } });
  await page.locator("#graph h2").evaluate((h) => scrollBy(0, h.getBoundingClientRect().top - 110));
  await page.waitForFunction(() => !document.querySelector("#graph [data-wait]"), null, { timeout: 3000 }).catch(() => {});
  const waiting = await page.locator("#graph [data-wait]").count();
  check(waiting === 0, `with its heading 110px down a 1300px screen, ${waiting} stops are still undrawn`);
  expectNoErrors(errors, "/ (transit map, tall screen)");
  await page.context().close();
}

// on phones the text sits under its shape: scroll a heading to a point on screen and read which shape is up
// the stage updates on the scroll event, which waits for a frame; under swiftshader a frame can take a while, so poll
async function shapeAt(page, name, at, want) {
  const heading = page.locator("#work").getByRole("heading", { name, exact: true });
  await heading.evaluate((el, at) => window.scrollBy(0, el.getBoundingClientRect().top - innerHeight * at), at);
  await page.waitForFunction((want) => document.querySelector("main")?.dataset.shape === want, want, { timeout: 4000 }).catch(() => {});
  // then hold a moment, so a shape that only flickers past is not taken for the settled one
  await page.waitForTimeout(250);
  return page.evaluate(() => document.querySelector("main")?.dataset.shape);
}

async function phoneShapes() {
  const { page, errors } = await openPage("/", { phone: true });
  const cases = [
    // a project's shape is up while its text comes in under it
    ["Distill", 0.75, "1"],
    ["Path", 0.75, "2"],
    ["Daily Roman", 0.75, "4"],
    // the night shift waits until Path's text has gone, then lands with the 5 to 9 heading
    ["5 to 9", 0.72, "2"],
    ["5 to 9", 0.55, "3"],
  ];
  for (const [name, at, want] of cases) {
    const got = await shapeAt(page, name, at, want);
    check(got === want, `on a phone, with "${name}" ${Math.round(at * 100)}% down the screen the stage shows shape ${got}, not ${want}`);
  }
  expectNoErrors(errors, "/ (phone shapes)");
  await page.context().close();
}

async function noWebgl() {
  const { page, errors } = await openPage("/", { webgl: false });
  await readable(page, "without WebGL");
  const shown = await page.locator("canvas").evaluateAll((els) => els.filter((c) => getComputedStyle(c).display !== "none").length);
  check(shown === 0, "a canvas is still shown without WebGL");
  // the film blends with the page itself, so the homepage's main must not be a stacking context
  const layers = await page.evaluate(() => ({ blend: getComputedStyle(document.querySelector("#work video")).mixBlendMode, z: getComputedStyle(document.querySelector("main")).zIndex }));
  check(layers.blend === "screen", `a homepage film blends as ${layers.blend}, not screen`);
  check(layers.z === "auto", `the homepage main has z-index ${layers.z}, so its films can't blend with the page`);
  expectNoErrors(errors, "/ (without WebGL)");
  await page.context().close();
}

async function noJs() {
  const { page } = await openPage("/", { js: false });
  await readable(page, "without JavaScript");
  check((await page.locator("#ticker-list").textContent()).includes("GTM Tools"), "ticker list missing without JavaScript");
  const stops = await page.locator('#graph a[href^="/projects/"]').count();
  check(stops === projects.length, `without JavaScript the transit map has ${stops} stops`);
}

// each sub-check closes its pages when it passes: one left open keeps its stage, and any film on screen, running
// beside the next check, and under software WebGL that starves it

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
  await run("transit map", transit);
  await run("transit map, tall screen", tallTransit);
  await run("without WebGL", noWebgl);
  await run("without JavaScript", noJs);
}
