#!/usr/bin/env node
/**
 * Preprocesses chicago-map.svg:
 * 1. Strips paths outside the visible viewBox crop (400 300 650 500)
 * 2. Rounds coordinates to 1 decimal (shrinks file dramatically)
 * 3. Splits remaining paths into 3 layers by length for parallax depth
 *
 * Run: node scripts/build-map-layers.js
 */

const fs = require("fs");
const path = require("path");

const INPUT = path.join(__dirname, "../public/chicago-map.svg");
const OUTPUT = path.join(__dirname, "../public/chicago-map-parallax.svg");

const svgText = fs.readFileSync(INPUT, "utf-8");

// Extract paths from #lines group
const linesMatch = svgText.match(/<g id="lines"[^>]*>([\s\S]*?)<\/g>/);
if (!linesMatch) {
  console.error("No #lines group found");
  process.exit(1);
}

const pathRegex = /<path d="([^"]+)"[^/]*\/>/g;
const allPaths = [];
let m;
while ((m = pathRegex.exec(linesMatch[1])) !== null) {
  allPaths.push(m[1]);
}
console.log(`Total paths: ${allPaths.length}`);

// Visible viewBox crop with margin
const MARGIN = 40;
const X_MIN = 400 - MARGIN;
const X_MAX = 1050 + MARGIN;
const Y_MIN = 300 - MARGIN;
const Y_MAX = 800 + MARGIN;
const MIN_LENGTH = 5; // SVG units — skip tiny fragments

function extractCoords(d) {
  const coords = [];
  const re = /-?\d+\.?\d*/g;
  const nums = [];
  let match;
  while ((match = re.exec(d)) !== null) nums.push(parseFloat(match[0]));
  for (let i = 0; i < nums.length - 1; i += 2) {
    coords.push([nums[i], nums[i + 1]]);
  }
  return coords;
}

function isVisible(coords) {
  return coords.some(
    ([x, y]) => x >= X_MIN && x <= X_MAX && y >= Y_MIN && y <= Y_MAX
  );
}

function pathLength(coords) {
  let len = 0;
  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i][0] - coords[i - 1][0];
    const dy = coords[i][1] - coords[i - 1][1];
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

function roundPath(d) {
  return d.replace(/-?\d+\.\d+/g, (n) => parseFloat(n).toFixed(1));
}

// Filter
const kept = [];
for (const d of allPaths) {
  const coords = extractCoords(d);
  if (coords.length < 2) continue;
  if (!isVisible(coords)) continue;
  const len = pathLength(coords);
  if (len < MIN_LENGTH) continue;
  kept.push({ d: roundPath(d), length: len });
}

console.log(`After crop + min-length filter: ${kept.length}`);

// Sort by length ascending
kept.sort((a, b) => a.length - b.length);

// Cap total paths for performance
const MAX_TOTAL = 6000;
const selected =
  kept.length > MAX_TOTAL ? kept.slice(kept.length - MAX_TOTAL) : kept;
selected.sort((a, b) => a.length - b.length);
console.log(`After cap (${MAX_TOTAL} max): ${selected.length}`);

// Split into 3 layers
const n = selected.length;
const t = Math.floor(n / 3);
const layers = [
  selected.slice(0, t), // BG: short residential streets
  selected.slice(t, t * 2), // MID: medium streets
  selected.slice(t * 2), // FG: major roads, longest paths
];

const IDS = ["lines-bg", "lines-mid", "lines-fg"];
const WIDTHS = [0.5, 0.7, 1.0];

let output = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1535 1264">
<style>path{vector-effect:non-scaling-stroke}</style>
<rect id="background" fill="none" x="0" y="0" width="1535" height="1264"/>
`;

for (let i = 0; i < 3; i++) {
  output += `<g id="${IDS[i]}" fill="none" stroke-width="${WIDTHS[i]}" stroke="var(--border,#1b3a5c)">\n`;
  for (const p of layers[i]) {
    output += `<path d="${p.d}"/>\n`;
  }
  output += `</g>\n`;
}
output += `</svg>`;

fs.writeFileSync(OUTPUT, output);

const sizeMB = (Buffer.byteLength(output) / 1024 / 1024).toFixed(2);
console.log(
  `Layers: ${layers[0].length} / ${layers[1].length} / ${layers[2].length}`
);
console.log(`Output: ${sizeMB} MB (was ${(fs.statSync(INPUT).size / 1024 / 1024).toFixed(2)} MB)`);
