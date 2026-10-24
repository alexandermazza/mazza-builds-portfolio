// The contact note: inline validation, sending, the thank-you and the failure state.
// Every page here answers /api/contact itself, so a run never sends real email; any request it did not expect fails the run.
import { deepStrictEqual } from "node:assert/strict";
import { openPage, assertNoOverflow, expectNoErrors } from "../check-site.mjs";

const ROUTE = "/contact";
const JORDAN = { name: "Jordan Lee", email: "jordan@example.com", message: "Quick question." };
const NAME_RULE = "Add your name so I know who's writing.";

function check(ok, message) {
  if (!ok) throw new Error(`${message} on ${ROUTE}`);
}

// a mocked failure still logs "Failed to load resource" for /api/contact; nothing else may
const otherErrors = (errors) => errors.filter((e) => !(e.kind === "console" && e.url?.endsWith("/api/contact")));

async function open(options = {}) {
  const { page, errors } = await openPage(ROUTE, options);
  const replies = [];
  const posts = [];
  const unexpected = [];
  await page.route("**/api/contact", (route) => {
    const request = route.request();
    const reply = request.method() === "POST" ? replies.shift() : undefined;
    if (!reply) {
      unexpected.push(`${request.method()} ${request.url()}`);
      return route.fulfill({ status: 500, json: { success: false, error: "unexpected request in a check run" } });
    }
    posts.push({ body: request.postData(), type: request.headers()["content-type"] ?? "" });
    return reply(route);
  });
  // the route only exists once the page has loaded, so make sure nothing reached the endpoint before it did
  const early = await page.evaluate(() =>
    performance.getEntriesByType("resource").filter((e) => e.name.includes("/api/contact")).length,
  );
  check(early === 0, "the page called /api/contact while loading");

  return {
    page,
    errors,
    posts,
    reply: (fn) => replies.push(fn),
    async finish(route = ROUTE, keep = (list) => list) {
      // swiftshader renders every open plane on the CPU, so a finished page must not keep starving the next one
      await page.context().close();
      check(!unexpected.length, `unexpected request(s) to /api/contact: ${unexpected.join(", ")}`);
      check(!replies.length, `${replies.length} expected POST(s) to /api/contact never came`);
      expectNoErrors(keep(errors), route);
    },
  };
}

async function fill(page, { name, email, message }) {
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.fill("#message", message);
}

const doneHeading = (page) => page.getByRole("heading", { name: "It's on its way" });

// the note should be seen fading while it is still shown, not just snap out or in
const fades = (page, when) =>
  page
    .waitForFunction(() => {
      const note = document.getElementById("note");
      return !note.hidden && Number(getComputedStyle(note).opacity) < 0.9;
    }, null, { timeout: 8000, polling: "raf" })
    .catch(() => check(false, `the note never faded ${when}`));

async function emptySubmit() {
  const c = await open();
  check((await c.page.locator("#hint").count()) === 1, "#hint not found");
  await c.page.click("#send");
  await c.page.waitForFunction((text) => document.getElementById("hint")?.textContent === text, NAME_RULE, { timeout: 5000 })
    .catch(async () => check(false, `#hint reads "${await c.page.textContent("#hint")}" after an empty submit`));
  check((await c.page.evaluate(() => document.activeElement?.id)) === "name", "an empty submit did not focus #name");
  check((await c.page.getAttribute("#name", "aria-invalid")) === "true", '#name not aria-invalid="true" after an empty submit');
  await c.finish();
}

async function sendAndWriteAnother() {
  const c = await open();
  c.reply((route) => route.fulfill({ json: { success: true } }));
  // the entrance rise must be over first, or it would pass for the fade
  await c.page.waitForFunction(() => getComputedStyle(document.getElementById("note")).opacity === "1", null, { timeout: 8000 });
  await fill(c.page, JORDAN);
  await c.page.click("#send");
  await fades(c.page, "on send");
  await doneHeading(c.page).waitFor({ timeout: 8000 }).catch(() => check(false, `"It's on its way" did not show after sending`));

  check(c.posts.length === 1 && c.posts[0].type.includes("application/json"), "the note did not POST JSON to /api/contact");
  try {
    deepStrictEqual(JSON.parse(c.posts[0].body), JORDAN);
  } catch {
    check(false, `the note posted ${c.posts[0].body}`);
  }
  const msg = (await c.page.textContent("#done-msg")) ?? "";
  check(msg.includes("Jordan") && msg.includes("jordan@example.com"), `#done-msg reads "${msg}"`);

  await c.page.getByRole("button", { name: "Write another" }).click();
  await fades(c.page, 'back in on "Write another"');
  await c.page.locator("#name").waitFor({ state: "visible", timeout: 5000 }).catch(() => check(false, '"Write another" did not bring the note back'));
  for (const id of ["name", "email"]) {
    const box = await c.page.locator(`#${id}`).boundingBox();
    check(box && box.width > 100, `#${id} is ${box?.width ?? 0}px wide after "Write another"`);
    check((await c.page.inputValue(`#${id}`)) === "", `#${id} not cleared after "Write another"`);
  }
  check((await c.page.evaluate(() => document.activeElement?.id)) === "name", '"Write another" did not focus #name');
  await c.finish();
}

async function nameIsText() {
  const c = await open();
  let dialogs = 0;
  c.page.on("dialog", (d) => {
    dialogs++;
    d.dismiss().catch(() => {});
  });
  c.reply((route) => route.fulfill({ json: { success: true } }));
  await fill(c.page, { ...JORDAN, name: "<img src=x onerror=alert(1)>" });
  await c.page.click("#send");
  await doneHeading(c.page).waitFor({ timeout: 8000 }).catch(() => check(false, `"It's on its way" did not show for an HTML name`));
  check((await c.page.locator("#done-msg img").count()) === 0, "a typed name was parsed as HTML in #done-msg");
  check(((await c.page.textContent("#done-msg")) ?? "").includes("<img"), "#done-msg does not show the typed name as text");
  check(dialogs === 0, "a typed name ran a script");
  await c.finish();
}

async function failure(name, reply) {
  const c = await open();
  c.reply(reply);
  await fill(c.page, JORDAN);
  await c.page.click("#send");
  await c.page.getByText("That didn't go through").waitFor({ timeout: 8000 })
    .catch(() => check(false, `"That didn't go through" did not show when ${name}`));
  check(((await c.page.textContent("#send")) ?? "").trim() === "Try again", `the button does not read "Try again" when ${name}`);
  check(!(await doneHeading(c.page).isVisible()), `the thank-you showed when ${name}`);
  await c.finish(`${ROUTE} (${name})`, otherErrors);
}

async function phone() {
  const c = await open({ phone: true });
  await assertNoOverflow(c.page);
  const skyTop = await c.page.locator("#sky").evaluate((el) => el.parentElement.getBoundingClientRect().top);
  const h1Top = await c.page.locator("h1").evaluate((el) => el.getBoundingClientRect().top);
  check(skyTop < h1Top, "the plane is not above the heading at phone width");
  // the blanks grow with what's typed, so typing must not widen the page either
  await fill(c.page, JORDAN);
  await assertNoOverflow(c.page);
  await c.finish(`${ROUTE} (phone)`);

  const small = await open({ phone: true, viewport: { width: 360, height: 740 } });
  await assertNoOverflow(small.page);
  await fill(small.page, { name: "Maximiliana Featherstonehaugh-Worthington", email: "maximiliana.featherstonehaugh@a-very-long-company-name.example.com", message: "Hi." });
  await assertNoOverflow(small.page);
  await small.finish(`${ROUTE} (360px)`);
}

// the plane's canvas overhangs its square, which runs past the screen edge between phone and wide desktop widths
async function tablet() {
  for (const width of [1024, 1180, 1366]) {
    const c = await open({ viewport: { width, height: 800 } });
    await assertNoOverflow(c.page);
    await c.finish(`${ROUTE} (${width}px)`);
  }
}

async function noWebgl() {
  const c = await open({ webgl: false });
  // the plane module loads after hydration, so give it a moment to find there is no WebGL
  await c.page
    .waitForFunction(() => getComputedStyle(document.getElementById("sky").parentElement).display === "none", null, { timeout: 8000 })
    .catch(() => check(false, "the plane box still shows without WebGL"));
  check(await c.page.locator("#name").isVisible(), "the note is not visible without WebGL");
  await c.finish(`${ROUTE} (no WebGL)`);

  const p = await open({ webgl: false, phone: true });
  await p.page.waitForTimeout(1500);
  await p.finish(`${ROUTE} (no WebGL, phone)`);
}

async function noJs() {
  const c = await open({ js: false });
  await c.page.waitForTimeout(1800); // the entrance rise is CSS, so it still runs
  for (const sel of ["h1", "#note", "#send"]) {
    const opacity = await c.page.locator(sel).evaluate((el) => Number(getComputedStyle(el).opacity));
    check(opacity > 0.1, `${sel} is invisible with JavaScript off`);
  }
  const text = (await c.page.textContent("main")) ?? "";
  for (const copy of ["Have a project in mind", "Hi Alex, my name is", "Or reach out directly"]) {
    check(text.includes(copy), `"${copy}" missing with JavaScript off`);
  }

  // without JavaScript the note is a plain form: it must POST, never put what was typed in the address
  const origin = new URL(c.page.url()).origin;
  c.reply((route) => route.fulfill({ status: 303, headers: { location: `${origin}/contact?status=sent` } }));
  await fill(c.page, JORDAN);
  await Promise.all([c.page.waitForURL("**/contact?status=sent", { timeout: 8000 }), c.page.click("#send")])
    .catch(() => check(false, `submitting with JavaScript off went to ${c.page.url()}`));
  check(c.posts.length === 1 && c.posts[0].type.includes("application/x-www-form-urlencoded"), "the form did not POST to /api/contact with JavaScript off");
  try {
    deepStrictEqual(Object.fromEntries(new URLSearchParams(c.posts[0].body ?? "")), JORDAN);
  } catch {
    check(false, `the form posted ${c.posts[0].body}`);
  }
  check(!/jordan|quick/i.test(c.page.url()), `what was typed ended up in the address: ${c.page.url()}`);
  check(((await c.page.textContent("main")) ?? "").includes("your message is on its way"), "the sent status did not show with JavaScript off");

  // the real endpoint answers a plain form with a redirect; invalid input stops before any email is sent
  const res = await c.page.request.post(`${origin}/api/contact`, { form: { name: "", email: "nope", message: "" }, maxRedirects: 0 });
  check(res.status() === 303 && (res.headers().location ?? "").endsWith("/contact?status=invalid"),
    `/api/contact answered an invalid form with ${res.status()} ${res.headers().location ?? ""}`);
  await c.page.goto(`${origin}/contact?status=failed`);
  check(((await c.page.textContent("main")) ?? "").includes("That didn't go through"), "the failed status did not show with JavaScript off");
  const odd = await c.page.goto(`${origin}/contact?status=constructor`);
  const oddText = (await c.page.textContent("main")) ?? "";
  check(odd?.status() === 200 && oddText.includes("Hi Alex, my name is") && !/your message is on its way|Something was missing|didn.t go through/.test(oddText),
    "an unknown ?status= broke the page or showed a notice");
  await c.finish(`${ROUTE} (no JavaScript)`);
}

export default async function contact() {
  await emptySubmit();
  await sendAndWriteAnother();
  await nameIsText();
  await failure("the endpoint answers success: false", (route) =>
    route.fulfill({ status: 500, json: { success: false, error: "Failed to send email" } }),
  );
  await failure("the request throws", (route) => route.abort());
  await phone();
  await tablet();
  await noWebgl();
  await noJs();
}
