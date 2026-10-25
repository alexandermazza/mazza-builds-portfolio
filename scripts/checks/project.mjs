// Every project story page: its copy, the closed Under the hood section, the next link, and the 404.
import { openPage, assertNoOverflow, expectNoErrors } from "../check-site.mjs";
import { projects, nextProject } from "../../src/data/projects.ts";

function check(ok, route, message) {
  if (!ok) throw new Error(`${message} on ${route}`);
}

async function story(page, p) {
  const route = `/projects/${p.slug}`;
  const got = await page.evaluate(() => {
    const details = document.querySelector("main details");
    return {
      h1: document.querySelector("main h1")?.textContent.trim(),
      text: document.querySelector("main")?.textContent ?? "",
      details: details ? { open: details.open, text: details.textContent } : null,
      next: [...document.querySelectorAll('main a[href^="/projects/"]')].map((a) => a.getAttribute("href")),
    };
  });
  check(got.h1 === p.name, route, `h1 is ${JSON.stringify(got.h1)}`);
  for (const key of ["line", "what", "why", "impact"]) check(got.text.includes(p[key]), route, `${key} not found`);
  check(got.details !== null, route, "details not found");
  check(!got.details.open, route, "details is open");
  check(got.details.text.includes(p.build), route, "build not found in details");
  check(!got.text.includes("↗"), route, 'a link uses the "↗" character, which phones draw as an emoji');
  const want = `/projects/${nextProject(p.slug).slug}`;
  check(got.next.length === 1 && got.next[0] === want, route, `next links are ${JSON.stringify(got.next)}, want ${want}`);
}

export default async function project({ base }) {
  // desktop, the 390px phone we design for, and 320px, the narrowest still in use
  for (const width of [0, 390, 320]) {
    let opened;
    for (const p of projects) {
      const route = `/projects/${p.slug}`;
      if (opened) await opened.page.goto(new URL(route, base).href, { waitUntil: "load" });
      else opened = await openPage(route, width ? { phone: true, viewport: { width, height: 740 } } : {});
      await story(opened.page, p);
      if (width) await assertNoOverflow(opened.page);
      expectNoErrors(opened.errors, `${route}${width ? ` (${width}px)` : ""}`);
    }
  }

  const res = await fetch(new URL("/projects/not-a-project", base));
  check(res.status === 404, "/projects/not-a-project", `status is ${res.status}`);
}
