#!/usr/bin/env node
// Before/after comparison sheets from two folders of screenshots with the same file names (see capture-matrix.mjs).
//
//   node compare-sheet.mjs --before shots/before --after shots/after --out shots/compare
//        [--layout side|stack] [--width 720] [--only desktop,mobile] [--label-before before --label-after after]
// One PNG per matching file: labelled panels, both scaled by the SAME factor (uniform; widths match), with the file name
// as the title. Reports files that exist on only one side. Open them in review, or attach to a PR.
import { readdirSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadPlaywright, launch, args } from "./_pw.mjs";

const o = args();
const [B, A] = [o.before, o.after];
if (!B || !A) {
  console.error("usage: --before DIR --after DIR [--out DIR]");
  process.exit(2);
}
const out = o.out || "compare";
mkdirSync(out, { recursive: true });
const layout = o.layout || "side",
  W = Number(o.width || 720);
const only = o.only ? String(o.only).split(",") : null;
const list = (d) =>
  new Set(
    readdirSync(d).filter(
      (f) => f.endsWith(".png") && (!only || only.some((k) => f.includes(`__${k}__`))),
    ),
  );
const lb = list(B),
  la = list(A);
const both = [...lb].filter((f) => la.has(f)).sort();
for (const f of lb) if (!la.has(f)) console.log("only in before:", f);
for (const f of la) if (!lb.has(f)) console.log("only in after :", f);

const pw = await loadPlaywright();
const browser = await launch(pw);
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
const uri = (p) => "data:image/png;base64," + readFileSync(p).toString("base64");
for (const f of both) {
  const dir = layout === "stack" ? "column" : "row";
  const panel = (t, p) =>
    `<figure style="margin:0"><figcaption style="font:600 13px system-ui;color:#ddd;margin:0 0 6px">${t}</figcaption><img src="${uri(p)}" style="width:${W}px;display:block;box-shadow:0 0 0 1px #fff3"></figure>`;
  await page.setContent(
    `<body style="margin:0;padding:16px;background:#1b1b1f"><div style="font:600 15px system-ui;color:#fff;margin-bottom:12px">${f}</div><div style="display:flex;flex-direction:${dir};gap:18px;align-items:flex-start">${panel(o["label-before"] || "before", join(B, f))}${panel(o["label-after"] || "after", join(A, f))}</div></body>`,
  );
  await page.waitForTimeout(150);
  await page.setViewportSize({ width: layout === "stack" ? W + 32 : W * 2 + 18 + 32, height: 400 });
  await page.screenshot({ path: join(out, f), fullPage: true });
}
console.log(`${both.length} comparison sheets → ${out}`);
await browser.close();
