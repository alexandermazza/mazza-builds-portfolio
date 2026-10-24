import { test } from "node:test";
import assert from "node:assert/strict";
import { buildConstellation } from "./constellation.ts";
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
