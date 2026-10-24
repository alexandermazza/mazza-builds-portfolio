// The projects board: the 9 to 5 / 5 to 9 switch, the URL it keeps, Back, reduced motion and no WebGL.
import { openPage, assertNoOverflow, expectNoErrors } from "../check-site.mjs";
import { projectsByHalf } from "../../src/data/projects.ts";

const ROUTE = "/projects";
const order = (half) => projectsByHalf(half).map((p) => `/projects/${p.slug}`);
const DAY = order("day");
const NIGHT = order("night");

function check(ok, message) {
  if (!ok) throw new Error(`${message} on ${ROUTE}`);
}

const tileHrefs = (page) =>
  page.evaluate(() => [...document.querySelectorAll('#list a[href^="/projects/"]')].map((a) => a.getAttribute("href")));

// tiles drop out and rise in over about half a second, so wait for the set to settle
async function expectTiles(page, want, when) {
  await page
    .waitForFunction((want) => {
      const got = [...document.querySelectorAll('#list a[href^="/projects/"]')].map((a) => a.getAttribute("href"));
      return JSON.stringify(got) === JSON.stringify(want);
    }, want, { timeout: 8000 })
    .catch(async () => check(false, `${when}: tiles are ${JSON.stringify(await tileHrefs(page))}`));
}

async function expectBody(page, rgb, when) {
  await page
    .waitForFunction((rgb) => getComputedStyle(document.body).backgroundColor === rgb, rgb, { timeout: 5000 })
    .catch(async () =>
      check(false, `${when}: body background is ${await page.evaluate(() => getComputedStyle(document.body).backgroundColor)}`),
    );
}

async function shift() {
  const { page, errors } = await openPage(ROUTE);
  const day = page.getByRole("button", { name: "9 to 5", exact: true });
  const night = page.getByRole("button", { name: "5 to 9", exact: true });
  check((await day.count()) === 1, 'switch button "9 to 5" not found');
  check((await day.getAttribute("aria-pressed")) === "true", '"9 to 5" is not aria-pressed="true" on load');
  await expectTiles(page, DAY, "on load");
  await expectBody(page, "rgb(11, 29, 51)", "on load");

  await night.click();
  await expectTiles(page, NIGHT, "after 5 to 9");
  await page.waitForURL((url) => url.search === "?shift=night", { timeout: 5000 }).catch(() => check(false, `URL is ${page.url()} after 5 to 9`));
  check((await night.getAttribute("aria-pressed")) === "true", '"5 to 9" is not aria-pressed="true" after the click');
  await expectBody(page, "rgb(0, 0, 0)", "after 5 to 9");

  await page.reload({ waitUntil: "load" });
  await expectTiles(page, NIGHT, "after reload");
  await expectBody(page, "rgb(0, 0, 0)", "after reload");

  await page.locator('#list a[href="/projects/secondround"]').click();
  await page.waitForURL("**/projects/secondround", { timeout: 8000 }).catch(() => check(false, `SecondRound tile went to ${page.url()}`));
  await page.getByRole("heading", { level: 1, name: "SecondRound" }).waitFor({ timeout: 8000 });

  await page.goBack({ waitUntil: "load" });
  await page.waitForURL((url) => url.pathname === ROUTE && url.search === "?shift=night", { timeout: 8000 }).catch(() => check(false, `Back went to ${page.url()}`));
  await expectTiles(page, NIGHT, "after Back");
  expectNoErrors(errors, `${ROUTE} (desktop)`);
}

async function reducedMotion() {
  const { page, errors } = await openPage(ROUTE, { reducedMotion: "reduce" });
  const opacities = await page.evaluate(() =>
    [...document.querySelectorAll('#list a[href^="/projects/"]')].map((a) => getComputedStyle(a).opacity),
  );
  check(opacities.length === DAY.length, `reduced motion shows ${opacities.length} tiles`);
  check(opacities.every((o) => o === "1"), `reduced motion tile opacities are ${opacities.join(", ")}`);
  expectNoErrors(errors, `${ROUTE} (reduced motion)`);
}

async function noWebgl() {
  const { page, errors } = await openPage(ROUTE, { webgl: false });
  await expectTiles(page, DAY, "without WebGL");
  await page.waitForTimeout(500);
  expectNoErrors(errors, `${ROUTE} (no WebGL)`);
}

async function noJs() {
  const { page } = await openPage(ROUTE, { js: false });
  check(JSON.stringify(await tileHrefs(page)) === JSON.stringify(DAY), "without JavaScript the day tiles are missing");
  const { page: nightPage } = await openPage(`${ROUTE}?shift=night`, { js: false });
  check(JSON.stringify(await tileHrefs(nightPage)) === JSON.stringify(NIGHT), "without JavaScript ?shift=night is not the night set");
}

async function phone() {
  // 390 is the phone we design for; 320 is the narrowest still in use
  for (const width of [390, 320]) {
    for (const query of ["", "?shift=night"]) {
      const { page, errors } = await openPage(`${ROUTE}${query}`, { phone: true, viewport: { width, height: 740 } });
      await assertNoOverflow(page);
      expectNoErrors(errors, `${ROUTE}${query} (${width}px)`);
    }
  }
}

export default async function projects() {
  await shift();
  await reducedMotion();
  await noWebgl();
  await noJs();
  await phone();
}
