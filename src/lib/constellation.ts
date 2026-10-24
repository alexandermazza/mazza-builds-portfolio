import type { Half } from "../data/projects.ts";

// tags that are the same tool under different names; any tool two or more projects share becomes a hub
const TOOL: Record<string, string> = {
  "Next.js": "TypeScript / JS",
  TypeScript: "TypeScript / JS",
  JavaScript: "TypeScript / JS",
  "Claude API": "Claude",
  "Claude Code": "Claude",
  "React Native": "React",
  Remix: "React",
  FastMCP: "MCP",
  LLM: "Other LLMs",
  OpenRouter: "Other LLMs",
  OpenAI: "Other LLMs",
  Gemini: "Other LLMs",
};

export function buildConstellation(items: { slug: string; half: Half; tags: string[] }[]): {
  hubs: string[];
  links: [slug: string, hub: string][];
} {
  const tools = items.map((p) => [...new Set(p.tags.map((t) => TOOL[t] ?? t))]);
  const count = new Map<string, number>();
  for (const t of tools.flat()) count.set(t, (count.get(t) ?? 0) + 1);
  // a stable sort, so equally shared hubs keep first-seen order
  const hubs = [...count.keys()].filter((t) => count.get(t)! > 1).sort((a, b) => count.get(b)! - count.get(a)!);
  const links = items.flatMap((p, i) => tools[i].filter((t) => hubs.includes(t)).map((t): [string, string] => [p.slug, t]));
  return { hubs, links };
}
