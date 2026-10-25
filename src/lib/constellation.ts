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

// the transit map: each hub is a line, each project a stop. Known tools keep the colour and name the map was
// designed with; a tool added later takes the next spare colour, so new projects need no map work.
const LOOK: Record<string, [label: string, color: string]> = {
  Python: ["Python", "#f2c94c"],
  "TypeScript / JS": ["TypeScript", "#4f8cff"],
  HubSpot: ["HubSpot", "#ff5a5f"],
  Claude: ["Claude", "#d97757"],
  React: ["React", "#61dafb"],
  "Other LLMs": ["Other AI models", "#a78bfa"],
  FastAPI: ["FastAPI", "#34d399"],
  Playwright: ["Playwright", "#9aa3ad"],
  Flask: ["Flask", "#e8e2d4"],
  MCP: ["MCP", "#f472b6"],
};
const SPARE = ["#fb923c", "#22d3ee", "#a3e635", "#e879f9", "#facc15", "#60a5fa"];

export type TransitLine = { id: string; label: string; color: string; count: number; phone: boolean };
export type TransitStop = { slug: string; name: string; kind: string; half: Half; on: string[] };

/** "AI agent at Freshpaint, in testing" becomes "AI agent": the map's stops say what a project is, not where. */
export const shortKind = (kind: string) => kind.split(/ at |, in /)[0];

export function buildTransit(items: { slug: string; name: string; kind: string; half: Half; tags: string[] }[]): {
  lines: TransitLine[];
  stops: TransitStop[];
} {
  const { hubs, links } = buildConstellation(items);
  const stops = items.map(({ slug, name, kind, half }) => ({
    slug, name, half, kind: shortKind(kind), on: links.filter(([s]) => s === slug).map(([, h]) => h),
  }));
  const count = (h: string) => stops.filter((s) => s.on.includes(h)).length;
  // phones have room for the lines three or more projects share, plus any line a project would otherwise lack
  const phone = new Set(hubs.filter((h) => count(h) >= 3));
  for (const s of stops) if (s.on.length && !s.on.some((h) => phone.has(h))) phone.add(s.on[0]);
  let spare = 0;
  const lines = hubs.map((id) => {
    const [label, color] = LOOK[id] ?? [id, SPARE[spare++ % SPARE.length]];
    return { id, label, color, count: count(id), phone: phone.has(id) };
  });
  return { lines, stops };
}
