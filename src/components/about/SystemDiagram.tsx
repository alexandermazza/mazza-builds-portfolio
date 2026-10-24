"use client";

import { useEffect, useRef } from "react";
import styles from "./About.module.css";

type Kind = "src" | "tool" | "team";
type Item = [id: string, name: string, note: string];
type Tool = [id: string, name: string, note: string, sources: string[], teams: string[]];

// where data lives -> what I built -> who uses it
const SRC: Item[] = [["hubspot", "HubSpot", "The sales system"], ["gong", "Gong", "Recorded sales calls"], ["web", "The open web", "Company websites"], ["semrush", "Semrush", "Website traffic"], ["notes", "Meeting notes", "Every call, written down"]];
const TEAMS: Item[] = [["lead", "Leadership", "CEO and department heads"], ["sales", "Sales", "Reps and SDRs"], ["am", "Account managers", "Existing customers"], ["mkt", "Marketing", "Campaigns and lists"], ["events", "Events team", "Conferences and dinners"]];
const TOOLS: Tool[] = [
  ["distill", "Distill", "Every number in one place", ["hubspot", "gong", "web"], ["lead", "sales", "am", "mkt"]],
  ["pipeline", "Pipeline Attribution Agent", "Where each deal came from", ["hubspot"], ["lead", "sales"]],
  ["persona", "Persona Automator", "Who every contact is", ["hubspot"], ["sales", "mkt"]],
  ["eventhub", "Event Hub", "What each event did for sales", ["hubspot"], ["events", "lead"]],
  ["attributor", "In-Person Event Attributor", "Why guests showed up", ["hubspot"], ["mkt", "events"]],
  ["scanner", "AI Web Tracker Scanner", "Trackers leaking patient data", ["web"], ["sales"]],
  ["vendor", "Vendor Fingerprint", "Which booking software they use", ["web"], ["sales"]],
  ["enricher", "Semrush Enricher", "Traffic for a whole list", ["semrush", "hubspot"], ["sales"]],
  ["trailmix", "Trailmix", "To-dos from every meeting", ["notes"], ["sales", "am", "mkt"]],
];
const WIRES = TOOLS.flatMap(([t, , , srcs, teams]) => [...srcs.map((s) => ({ a: s, b: t })), ...teams.map((m) => ({ a: t, b: m }))]);

// trace a node: everything upstream and downstream of it lights, the rest steps back
function related(id: string, kind: Kind) {
  const tools = kind === "tool" ? [id] : TOOLS.filter((t) => (kind === "src" ? t[3] : t[4]).includes(id)).map((t) => t[0]);
  const set = new Set([id, ...tools]);
  for (const tid of tools) {
    const t = TOOLS.find((x) => x[0] === tid)!;
    if (kind !== "src") t[3].forEach((x) => set.add(x)); // tracing a tool or a team pulls in the sources behind it
    if (kind !== "team") t[4].forEach((x) => set.add(x)); // tracing a tool or a source pulls in the teams it reaches
  }
  return { set, tools: new Set(tools) };
}

export function SystemDiagram() {
  const netRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const net = netRef.current, svg = svgRef.current;
    if (!net || !svg) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodeEl = (id: string) => net.querySelector<HTMLElement>(`[data-id="${id}"]`)!;
    let paths: { el: SVGPathElement; dot: SVGCircleElement; len: number; off: number; w: (typeof WIRES)[number] }[] = [];
    let focusId: string | null = null;
    const place = (p: (typeof paths)[number], k: number) => {
      const pt = p.el.getPointAtLength(k * p.len);
      p.dot.setAttribute("cx", String(pt.x));
      p.dot.setAttribute("cy", String(pt.y));
    };

    function focus(id: string | null) {
      focusId = id;
      net!.classList.toggle(styles.focus, !!id);
      net!.querySelectorAll(`.${styles.node}`).forEach((n) => n.classList.remove(styles.lit, styles.on));
      paths.forEach((p) => { p.el.classList.remove(styles.lit); p.dot.classList.remove(styles.lit); });
      if (!id) return;
      const { set, tools } = related(id, nodeEl(id).dataset.kind as Kind);
      set.forEach((x) => nodeEl(x).classList.add(styles.lit));
      nodeEl(id).classList.add(styles.on);
      paths.forEach((p) => {
        const on = (tools.has(p.w.b) && set.has(p.w.a)) || (tools.has(p.w.a) && set.has(p.w.b));
        p.el.classList.toggle(styles.lit, on);
        p.dot.classList.toggle(styles.lit, on);
      });
    }

    // curves run from the right edge of one column to the left edge of the next; redrawn whenever the layout changes
    function drawWires() {
      const box = net!.getBoundingClientRect();
      const edge = (el: HTMLElement, side: "l" | "r") => {
        const r = el.getBoundingClientRect();
        return [side === "r" ? r.right - box.left : r.left - box.left, r.top + r.height / 2 - box.top];
      };
      svg!.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
      svg!.innerHTML =
        WIRES.map((w, i) => {
          const [x0, y0] = edge(nodeEl(w.a), "r"), [x1, y1] = edge(nodeEl(w.b), "l"), mx = (x0 + x1) / 2;
          return `<path data-w="${i}" d="M${x0} ${y0} C${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}"/>`;
        }).join("") + WIRES.map((_, i) => `<circle r="2.4" data-w="${i}"/>`).join("");
      paths = WIRES.map((w, i) => {
        const el = svg!.querySelector<SVGPathElement>(`path[data-w="${i}"]`)!;
        return { el, dot: svg!.querySelector<SVGCircleElement>(`circle[data-w="${i}"]`)!, len: el.getTotalLength(), off: Math.random(), w };
      });
      // with motion off the light stays where it is, spread along the wires
      if (reduce) paths.forEach((p) => place(p, p.off));
      if (focusId) focus(focusId);
    }

    const ro = new ResizeObserver(drawWires);
    ro.observe(net);
    let gone = false;
    document.fonts?.ready.then(() => { if (!gone) drawWires(); });

    const nodeOf = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>(`.${styles.node}`);
    const onOver = (e: PointerEvent) => { const n = nodeOf(e); if (n && e.pointerType === "mouse") focus(n.dataset.id!); };
    const onLeave = (e: PointerEvent) => { if (e.pointerType === "mouse") focus(null); };
    const onClick = (e: MouseEvent) => { const n = nodeOf(e); focus(n && focusId !== n.dataset.id ? n.dataset.id! : null); };
    const onFocusIn = (e: FocusEvent) => { const n = nodeOf(e); if (n) focus(n.dataset.id!); };
    const onFocusOut = (e: FocusEvent) => { if (!net.contains(e.relatedTarget as Node | null)) focus(null); };
    net.addEventListener("pointerover", onOver);
    net.addEventListener("pointerleave", onLeave);
    net.addEventListener("click", onClick);
    net.addEventListener("focusin", onFocusIn);
    net.addEventListener("focusout", onFocusOut);

    // light runs along every wire, left to right
    let netOn = true;
    const io = new IntersectionObserver(([e]) => { netOn = e.isIntersecting; });
    io.observe(net);
    let raf = 0;
    function flow(now: number) {
      raf = requestAnimationFrame(flow);
      if (!netOn || document.hidden || reduce) return;
      for (const p of paths) if (p.len) place(p, (now / 2600 + p.off) % 1);
    }
    raf = requestAnimationFrame(flow);

    return () => {
      gone = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      net.removeEventListener("pointerover", onOver);
      net.removeEventListener("pointerleave", onLeave);
      net.removeEventListener("click", onClick);
      net.removeEventListener("focusin", onFocusIn);
      net.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  const column = (title: string, kind: Kind, nodes: (Item | Tool)[], className: string) => (
    <div className={`${styles.col} ${className}`}>
      <h3>{title}</h3>
      {nodes.map(([id, name, note]) => (
        <button key={id} type="button" className={styles.node} data-id={id} data-kind={kind}>
          <b>{name}</b>
          <span>{note}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div ref={netRef} className={styles.net}>
      <svg ref={svgRef} className={styles.wires} aria-hidden="true" />
      {column("Where data lives", "src", SRC, "")}
      {column("What I built", "tool", TOOLS, styles.tools)}
      {column("Who uses it", "team", TEAMS, "")}
    </div>
  );
}
