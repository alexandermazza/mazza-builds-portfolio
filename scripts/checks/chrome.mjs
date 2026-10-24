// Site chrome on every main route: the top bar, the phone menu and the footer.
import { openPage, assertNoOverflow, expectNoErrors } from "../check-site.mjs";

const ROUTES = ["/", "/projects", "/about", "/contact"];
const NAV = ["Projects", "About", "Contact"];
const MENU = [
  ["Home", "/"],
  ["Projects", "/projects"],
  ["About", "/about"],
  ["Contact", "/contact"],
];

// shortcut: the old home and about pages fetch /api/github from the browser, which answers 500 without
// GITHUB_TOKEN (the local default). Their replacements (Tasks 6 and 7) read GitHub on the server; drop this in Task 8.
const pageErrors = (errors) => errors.filter((e) => !(e.kind === "console" && e.url?.endsWith("/api/github")));

function check(ok, route, message) {
  if (!ok) throw new Error(`${message} on ${route}`);
}

// textContent, not innerText: the links are uppercased with CSS
const texts = (locator) => locator.evaluateAll((els) => els.map((el) => el.textContent.trim()));

async function footer(page, route) {
  const foot = page.getByRole("contentinfo").last();
  check((await foot.locator('a[href="mailto:hello@mazzabuilds.com"]').count()) > 0, route, "footer email link not found");
  check((await foot.locator('a[href="/privacy"]').count()) > 0, route, "footer privacy link not found");
}

async function phone(route) {
  const { page, errors } = await openPage(route, { phone: true });
  const bar = page.getByRole("banner").first();
  for (const name of NAV) {
    check(!(await bar.getByRole("link", { name, exact: true }).isVisible()), route, `"${name}" link visible at phone width`);
  }

  const menu = page.getByRole("button", { name: "Menu", exact: true });
  check((await menu.count()) === 1, route, "Menu button not found");
  check((await menu.getAttribute("aria-expanded")) === "false", route, 'Menu button not aria-expanded="false"');

  await menu.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ timeout: 5000 }).catch(() => check(false, route, "menu dialog did not open"));
  check((await menu.getAttribute("aria-expanded")) === "true", route, 'Menu button not aria-expanded="true" when open');
  const got = await dialog
    .getByRole("link")
    .evaluateAll((els) => els.map((el) => [el.textContent.trim(), el.getAttribute("href")]));
  check(JSON.stringify(got) === JSON.stringify(MENU), route, `menu links are ${JSON.stringify(got)}`);

  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => check(false, route, "Escape did not close the menu"));
  check(await menu.evaluate((el) => el === document.activeElement), route, "focus did not return to the Menu button");
  check((await menu.getAttribute("aria-expanded")) === "false", route, 'Menu button not aria-expanded="false" after close');

  await footer(page, route);
  await assertNoOverflow(page);
  expectNoErrors(pageErrors(errors), `${route} (phone)`);
}

async function desktop(route) {
  const { page, errors } = await openPage(route);
  const bar = page.getByRole("banner").first();
  const mark = bar.locator('a[href="/"]');
  check(
    (await mark.count()) === 1 && /^mazza builds$/i.test((await texts(mark))[0]),
    route,
    'header link to "/" reading "Mazza Builds" not found',
  );
  for (const name of NAV) {
    const link = bar.getByRole("link", { name, exact: true });
    check(await link.isVisible(), route, `header link "${name}" not visible at desktop`);
    check((await link.getAttribute("href")) === `/${name.toLowerCase()}`, route, `header link "${name}" has the wrong href`);
  }
  check(!(await page.getByRole("button", { name: "Menu", exact: true }).isVisible()), route, "Menu button visible at desktop");

  await footer(page, route);
  await assertNoOverflow(page);
  expectNoErrors(pageErrors(errors), `${route} (desktop)`);
}

export default async function chrome() {
  for (const route of ROUTES) {
    await phone(route);
    await desktop(route);
  }
}
