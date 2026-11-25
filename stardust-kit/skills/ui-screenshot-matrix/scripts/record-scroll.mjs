#!/usr/bin/env node
// Record a short top-to-bottom scroll video (Playwright recordVideo) and optional key-frame stills.
//
//   node record-scroll.mjs --root ./site --mount /sub --entry /index.html --out video/home-desktop
//        [--viewport desktop|narrow|mobile] [--ms 11000] [--stills 6] [--mp4] [--theme dark] [--theme-attr data-theme]
//        [--url https://...]
// Writes <out>.webm (+ <out>.mp4 when --mp4 and ffmpeg exist) and <out>-still-1..N.png. The scroll runs inside the
// page's own rAF loop with ease-in-out so the video is smooth; the page height is re-read each frame (lazy content grows).
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname, basename, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadPlaywright, launch, serveFolder, ORIGIN, args, smoothScroll } from './_pw.mjs';

const o = args();
const VP = {
  desktop: { viewport: { width: 1440, height: 900 } },
  narrow: { viewport: { width: 900, height: 800 } },
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
}[o.viewport || 'desktop'];
const outBase = o.out || 'video/scroll';
const tmp = join(dirname(outBase), '_tmp-' + basename(outBase));
await mkdir(dirname(outBase), { recursive: true });
const pw = await loadPlaywright();
const browser = await launch(pw);
const theme = o.theme, attr = o['theme-attr'] || 'data-theme';
const base = o.url ? o.url.replace(/\/$/, '') : ORIGIN, entry = o.entry || '/';
const mk = async extra => {
  const ctx = await browser.newContext({ ...VP, ...extra, ...(theme ? { colorScheme: theme } : {}) });
  if (!o.url) await serveFolder(ctx, o.root || '.', o.mount || '');
  if (theme) await ctx.addInitScript(([a, t]) => { const s = () => document.documentElement && document.documentElement.setAttribute(a, t); s(); document.addEventListener('DOMContentLoaded', s); }, [attr, theme]);
  return ctx;
};

// 1) video pass
const size = { width: VP.viewport.width, height: VP.viewport.height };
let ctx = await mk({ recordVideo: { dir: tmp, size } });
let page = await ctx.newPage();
await page.goto(base + entry, { waitUntil: 'load' });
await page.waitForTimeout(900);                               // intro animations finish before the scroll starts
await smoothScroll(page, 'bottom', Number(o.ms || 11000));
await page.waitForTimeout(1000);                              // linger on the end state
const video = page.video();
await ctx.close();
await rename(await video.path(), outBase + '.webm');
await rm(tmp, { recursive: true, force: true });
console.log('video →', outBase + '.webm');
if (o.mp4) {
  try { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', outBase + '.webm', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outBase + '.mp4']); console.log('mp4   →', outBase + '.mp4'); }
  catch { console.log('ffmpeg not available: skipped mp4'); }
}

// 2) stills pass (separate context so the video stays clean)
const n = Number(o.stills || 0);
if (n) {
  ctx = await mk({}); page = await ctx.newPage();
  await page.goto(base + entry, { waitUntil: 'load' }); await page.waitForTimeout(900);
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (let i = 0; i < n; i++) {
    await smoothScroll(page, Math.round(max * i / Math.max(1, n - 1)), 900);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${outBase}-still-${i + 1}.png` });
  }
  await ctx.close();
  console.log(`${n} stills → ${outBase}-still-*.png`);
}
await browser.close();
