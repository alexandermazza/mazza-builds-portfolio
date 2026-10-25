import { test } from "node:test";
import assert from "node:assert/strict";
import { buildConstellation, buildTransit, shortKind } from "./constellation.ts";
import { projects } from "../data/projects.ts";

test('OpenAI, Gemini, OpenRouter and LLM map to "Other LLMs"', () => {
  const { hubs, links } = buildConstellation([
    { slug: "a", half: "day", tags: ["OpenAI", "Gemini"] },
    { slug: "b", half: "night", tags: ["OpenRouter"] },
    { slug: "c", half: "day", tags: ["LLM"] },
  ]);
  assert.deepEqual(hubs, ["Other LLMs"]);
  assert.deepEqual(links, [["a", "Other LLMs"], ["b", "Other LLMs"], ["c", "Other LLMs"]], "one link per project, not per tag");
});

test("a tool used by one project is not a hub", () => {
  const { hubs, links } = buildConstellation([
    { slug: "a", half: "day", tags: ["Python", "Flask", "HubSpot"] },
    { slug: "b", half: "day", tags: ["Python", "HubSpot"] },
    { slug: "c", half: "night", tags: ["Python", "Next.js"] },
  ]);
  assert.deepEqual(hubs, ["Python", "HubSpot"], "hubs run from most shared to least");
  assert.ok(!links.some(([, hub]) => hub === "Flask" || hub === "TypeScript / JS"));
});

test("every project in data has at least one link", () => {
  const { links } = buildConstellation(projects);
  for (const p of projects) {
    assert.ok(links.some(([slug]) => slug === p.slug), `${p.slug} has no link`);
  }
});

const item = (slug: string, tags: string[], kind = "Web app") => ({ slug, name: slug.toUpperCase(), kind, half: "day" as const, tags });

test("each project is a stop on the lines of the tools it uses, in data order", () => {
  const { lines, stops } = buildTransit([item("a", ["Python", "HubSpot"]), item("b", ["Python"]), item("c", ["HubSpot", "Rust"])]);
  assert.deepEqual(lines.map((l) => l.id), ["Python", "HubSpot"]);
  assert.deepEqual(stops.map((s) => [s.slug, s.on]), [["a", ["Python", "HubSpot"]], ["b", ["Python"]], ["c", ["HubSpot"]]]);
});

test("lines three or more projects share show on phones, and a project only on smaller lines still gets one", () => {
  const { lines } = buildTransit([
    item("a", ["Python", "MCP"]), item("b", ["Python", "MCP"]), item("c", ["Python"]),
    item("d", ["Flask"]), item("e", ["Flask"]),
  ]);
  assert.deepEqual(Object.fromEntries(lines.map((l) => [l.id, l.phone])), { Python: true, MCP: false, Flask: true });
});

test("the lines phones show reach every project in data", () => {
  const { lines, stops } = buildTransit(projects);
  const shown = new Set(lines.filter((l) => l.phone).map((l) => l.id));
  for (const s of stops) assert.ok(s.on.some((id) => shown.has(id)), `${s.slug} has no line on phones`);
});

test('shortKind drops the employer and status: "AI agent at Freshpaint, in testing" is "AI agent"', () => {
  assert.equal(shortKind("AI agent at Freshpaint, in testing"), "AI agent");
  assert.equal(shortKind("Internal app at Freshpaint"), "Internal app");
  assert.equal(shortKind("Web app, live"), "Web app, live");
  assert.equal(shortKind("Add-on for Claude Code"), "Add-on for Claude Code");
});

test("known tools keep their colour and name, a new tool gets a spare colour", () => {
  const { lines } = buildTransit([item("a", ["Claude", "Next.js", "OpenAI", "Rust"]), item("b", ["Claude", "Next.js", "Gemini", "Rust"])]);
  const by = Object.fromEntries(lines.map((l) => [l.id, l]));
  assert.equal(by.Claude.color, "#d97757");
  assert.equal(by["TypeScript / JS"].label, "TypeScript");
  assert.equal(by["Other LLMs"].label, "Other AI models");
  assert.equal(by.Rust.label, "Rust");
  assert.match(by.Rust.color, /^#[0-9a-f]{6}$/);
});
