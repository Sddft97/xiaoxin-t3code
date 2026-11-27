#!/usr/bin/env node
// Count distinct motion durations and easing curves across a source tree (CSS/SCSS/TS/TSX/JS/JSX/HTML/Vue/Svelte).
// Zero dependencies. Usage:
//   node count-motion.mjs <dir> [--json] [--token-prefix --motion-] [--ignore node_modules,dist]
// Reading the result: fewer distinct values = a more unified language. Aim for "every state change uses a token".
import { readdir, readFile } from "node:fs/promises";
import { join, extname, relative } from "node:path";

const a = process.argv.slice(2);
const dir = a.find((x) => !x.startsWith("--")) || ".";
const opt = (k, d) => {
  const i = a.indexOf("--" + k);
  return i < 0 ? d : a[i + 1] && !a[i + 1].startsWith("--") ? a[i + 1] : true;
};
const tokenPrefix = opt("token-prefix", "--motion-");
const ignore = new Set(
  String(opt("ignore", "node_modules,dist,build,.git,coverage,.next,.turbo")).split(","),
);
const EXT = new Set([
  ".css",
  ".scss",
  ".less",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".html",
  ".vue",
  ".svelte",
]);

const dur = new Map(),
  ease = new Map(),
  tokens = new Map();
let rm = 0,
  files = 0,
  withMotion = 0;
const add = (m, k, f) => {
  const e = m.get(k) || { n: 0, files: new Set() };
  e.n++;
  e.files.add(f);
  m.set(k, e);
};
const ms = (v, u) => Math.round(u === "s" ? parseFloat(v) * 1000 : parseFloat(v));
const KEYWORD = /^(linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end)$/;
const normBezier = (s) => s.replace(/\s+/g, "").replace(/(^|[(,])\./g, "$10.");

// split on commas that are not inside parentheses
const splitTop = (s) => {
  const out = [];
  let d = 0,
    cur = "";
  for (const c of s) {
    if (c === "(") d++;
    if (c === ")") d--;
    if (c === "," && !d) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
};

function scanDeclaration(prop, value, f) {
  const isShort = prop === "transition" || prop === "animation";
  for (const seg of splitTop(value)) {
    const v = seg.trim();
    for (const t of v.matchAll(/var\(\s*(--[\w-]+)/g))
      if (t[1].startsWith(tokenPrefix)) add(tokens, t[1], f);
    const times = [...v.matchAll(/(?<![\w.-])(\d*\.?\d+)(ms|s)(?![\w-])/g)];
    if (prop.endsWith("delay")) continue;
    if (isShort ? times[0] : prop.endsWith("duration") && times[0])
      add(dur, ms(times[0][1], times[0][2]) + "ms", f);
    if (!times[0] && (isShort || prop.endsWith("duration"))) {
      // duration comes from a variable: record its name so token usage is visible
      const vars = [...v.matchAll(/var\(\s*(--[\w-]+)/g)]
        .map((m) => m[1])
        .filter((n) => !/ease|curve|timing|bezier/.test(n));
      if (vars[0]) add(dur, `var(${vars[0]})`, f);
    }
    for (const c of v.matchAll(/cubic-bezier\([^)]*\)|steps\([^)]*\)/g))
      add(ease, normBezier(c[0]), f);
    for (const w of v.split(/\s+/)) if (KEYWORD.test(w)) add(ease, w, f);
    if (prop.endsWith("timing-function") && /^var\(/.test(v)) add(ease, v, f);
  }
}

async function walk(d) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    if (ignore.has(e.name)) continue;
    const p = join(d, e.name);
    if (e.isDirectory()) {
      await walk(p);
      continue;
    }
    if (!EXT.has(extname(e.name)) || e.name.endsWith(".min.js") || e.name.endsWith(".min.css"))
      continue;
    files++;
    const rel = relative(dir, p);
    const src = (await readFile(p, "utf8")).replace(/\/\*[\s\S]*?\*\//g, "");
    const before = dur.size + ease.size;
    // CSS-style declarations (also inside JS template strings / style objects written in kebab-case)
    for (const m of src.matchAll(
      /(?<![\w-])(transition|animation)(-duration|-timing-function)?\s*:\s*([^;}{]+?)\s*(?=[;}]|$)/gm,
    ))
      scanDeclaration(m[1] + (m[2] || ""), m[3], rel);
    // camelCase style objects: transition: 'opacity 200ms ease'
    for (const m of src.matchAll(/\b(transition|animation)\s*:\s*['"`]([^'"`]+)['"`]/g))
      scanDeclaration(m[1], m[2], rel);
    // JS animation libraries / WAAPI: duration: 200, duration: 0.2, easing: '...', ease: [a,b,c,d], el.animate(..., {duration})
    for (const m of src.matchAll(/\bduration\s*:\s*(\d+\.?\d*)/g)) {
      const n = parseFloat(m[1]);
      add(dur, (Number.isInteger(n) && n >= 10 ? n : Math.round(n * 1000)) + "ms", rel + " (js)");
    }
    for (const m of src.matchAll(
      /\b(?:easing|ease|timingFunction)\s*:\s*(?:['"`]([^'"`]+)['"`]|\[([^\]]+)\])/g,
    )) {
      const raw = m[1] || `cubic-bezier(${m[2]})`;
      add(ease, normBezier(raw.replace(/^\s+|\s+$/g, "")), rel + " (js)");
    }
    for (const m of src.matchAll(/cubic-bezier\([^)]*\)/g)) add(ease, normBezier(m[0]), rel);
    if (/prefers-reduced-motion/.test(src)) rm++;
    if (dur.size + ease.size > before) withMotion++;
  }
}
await walk(dir);

const rows = (m) =>
  [...m.entries()]
    .map(([k, v]) => ({ value: k, uses: v.n, files: v.files.size, example: [...v.files][0] }))
    .sort((x, y) => (parseFloat(x.value) || 1e9) - (parseFloat(y.value) || 1e9) || y.uses - x.uses);
const result = {
  scanned: dir,
  files,
  filesWithMotion: withMotion,
  filesMentioningReducedMotion: rm,
  durations: rows(dur),
  curves: rows(ease),
  tokenUses: rows(tokens),
};
result.summary = {
  distinctDurations: dur.size,
  distinctCurves: ease.size,
  tokensInUse: tokens.size,
};

if (opt("json", false)) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}
const AMBIENT = 1500; // ms: above this, a duration is a loop / ambient cycle, not an interaction response
const isAmbient = (x) => (parseFloat(x.value) || 0) > AMBIENT && x.value.endsWith("ms");
const table = (title, r) => {
  console.log(`\n${title} (${r.length} distinct)`);
  for (const x of r)
    console.log(
      `  ${String(x.uses).padStart(4)}×  ${x.value.padEnd(40)} ${String(x.files).padStart(2)} file(s)  e.g. ${x.example}`,
    );
};
console.log(
  `Scanned ${files} files under ${dir}; ${withMotion} contain motion values; ${rm} mention prefers-reduced-motion.`,
);
table(
  "Durations: interaction (≤1500ms) and tokens",
  result.durations.filter((x) => !isAmbient(x)),
);
table("Durations: ambient / loops (>1500ms), judge separately", result.durations.filter(isAmbient));
table("Curves", result.curves);
table(`Token uses (${tokenPrefix}*)`, result.tokenUses);
console.log(
  `\nSummary: ${dur.size} distinct durations, ${ease.size} distinct curves, ${tokens.size} tokens in use.`,
);
console.log(
  "Target: durations ≈ the number of tokens, curves ≤ 3 interactive + linear (progress) + loop easing.",
);
