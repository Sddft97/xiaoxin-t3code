#!/usr/bin/env node
// Acceptance screenshots: language × theme × viewport, full page + named key states. Offline, no server.
//
//   node capture-matrix.mjs --root ./site --mount /sub --entries zh=/,en=/en/ --out shots/after
//        [--themes dark,light] [--viewports desktop,narrow,mobile] [--name home]
//        [--states states.json] [--hide ".nav,.cookie"] [--theme-attr data-theme] [--theme-key theme]
//        [--no-full] [--motion] [--wait 800] [--no-prescroll]
//   node capture-matrix.mjs --url https://example.com --entries en=/ ...      (live site)
//
// File names:  {name}__{lang}__{theme}__{viewport}__{state}.png   e.g. home__zh__dark__desktop__full.png
// states.json: [{"name":"menu-open","steps":[{"click":"#menu"},{"wait":300}],"selector":"#menu-panel"}]
//   `selector` clips to one element; omit it for a viewport screenshot. Steps use the DSL in _pw.mjs.
// Theme switching: sets colorScheme AND html[<theme-attr>]=<theme> (+ localStorage[<theme-key>]) before the page loads.
// Writes manifest.json including a horizontal-overflow check per shot (a common mobile/narrow regression).
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadPlaywright, launch, serveFolder, ORIGIN, args, runSteps } from './_pw.mjs';

const o = args();
const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 } },
  narrow: { viewport: { width: 900, height: 800 } },
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};
const entries = Object.fromEntries(String(o.entries || 'en=/').split(',').map(s => s.split('=')));
const themes = String(o.themes || 'dark,light').split(',');
const vps = String(o.viewports || 'desktop,narrow,mobile').split(',');
const states = o.states ? JSON.parse(readFileSync(o.states, 'utf8')) : [];
const out = o.out || 'shots';
const name = o.name || 'page';
const themeAttr = o['theme-attr'] || 'data-theme';
const hide = o.hide ? `${o.hide}{visibility:hidden!important}` : '';
await mkdir(out, { recursive: true });

const pw = await loadPlaywright();
const browser = await launch(pw);
const manifest = [];
const base = o.url ? o.url.replace(/\/$/, '') : ORIGIN;

for (const [lang, path] of Object.entries(entries)) for (const theme of themes) for (const vp of vps) {
  const ctx = await browser.newContext({ ...VIEWPORTS[vp], colorScheme: theme, ...(o.motion ? {} : { reducedMotion: 'reduce' }) });
  if (!o.url) await serveFolder(ctx, o.root || '.', o.mount || '');
  await ctx.addInitScript(([attr, theme, key]) => {
    try { if (key) localStorage.setItem(key, theme); } catch {}
    const set = () => document.documentElement && document.documentElement.setAttribute(attr, theme);
    set(); document.addEventListener('DOMContentLoaded', set);
  }, [themeAttr, theme, o['theme-key'] || '']);
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + path, { waitUntil: 'load' });
  if (hide) await page.addStyleTag({ content: hide });
  await page.waitForTimeout(Number(o.wait ?? 800));
  if (!o['no-prescroll']) { // trigger lazy "reveal on scroll" content so the full-page shot is not half blank
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } scrollTo(0, 0); });
    await page.waitForTimeout(400);
  }
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const shot = async (state, opts) => {
    const file = `${name}__${lang}__${theme}__${vp}__${state}.png`;
    await page.screenshot({ path: join(out, file), ...opts });
    manifest.push({ file, lang, theme, viewport: vp, state, overflowPx: await overflow(), pageErrors: errors.length });
  };
  if (!o['no-full']) await shot('full', { fullPage: true });
  await shot('fold', { fullPage: false });
  for (const s of states) {
    await page.evaluate(() => scrollTo(0, 0));
    await runSteps(page, s.steps || []);
    if (s.selector) { const el = page.locator(s.selector).first(); await el.scrollIntoViewIfNeeded(); await shot(s.name, { clip: undefined, fullPage: false, ...(await clipOf(el)) }); }
    else await shot(s.name, { fullPage: false });
  }
  await ctx.close();
}
async function clipOf(el) { const b = await el.boundingBox(); return b ? { clip: { x: Math.max(0, b.x), y: Math.max(0, b.y), width: b.width, height: b.height } } : {}; }

await writeFile(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
const bad = manifest.filter(m => m.overflowPx > 1 || m.pageErrors);
console.log(`${manifest.length} screenshots → ${out}`);
for (const m of bad) console.log(`  ! ${m.file}: overflow ${m.overflowPx}px, page errors ${m.pageErrors}`);
console.log(bad.length ? `${bad.length} shot(s) with overflow/errors` : 'no horizontal overflow, no page errors');
await browser.close();
process.exitCode = bad.length ? 1 : 0;
