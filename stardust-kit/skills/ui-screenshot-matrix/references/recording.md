# Scroll recording

`record-scroll.mjs` records a short top-to-bottom scroll through Playwright `recordVideo`.

- **Smoothness:** the scroll runs inside the page's own `requestAnimationFrame` with ease-in-out. Playwright's own wheel
  events produce choppy video. The scroll target is re-read every frame so lazy content that grows the page does not end early.
- **Timing:** 900 ms settle before scrolling (intro animations finish), `--ms` for the scroll (default 11000, use 8000-12000),
  1000 ms linger at the end.
- **Viewport:** `--viewport desktop|narrow|mobile`; one file per viewport and theme (`--theme dark|light`).
- **Stills:** `--stills 6` takes six evenly spaced screenshots in a second pass (so the video stays clean).
- **Formats:** `.webm` always. `--mp4` re-encodes with ffmpeg (H.264, yuv420p, faststart) when ffmpeg is installed.
- **What to watch for in the video:** layout jumps while scrolling, elements popping in late, sticky/parallax stutter,
  images loading after layout (CLS), double scrollbars, scroll-linked animation that lags behind the scroll position.

## Frame strips (for motion review)

Combine with the motion-audit skill: inject `slowmo.js`, trigger the state, screenshot every ~100 ms in a loop, tile the
frames with `compare-sheet`-style HTML (one row per state). Say honestly if the strips show something that disappears at
full speed.

## Social/X-ready exports

If a demo video is for X: export a 16:9 (1280x720 or 1920x1080) and a 4:5 (1080x1350) H.264 yuv420p mp4, 30 fps, under
140 s and 512 MB:

```sh
ffmpeg -i in.webm -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \
  -r 30 -c:v libx264 -pix_fmt yuv420p -movflags +faststart out-16x9.mp4
```
(Pad, do not stretch; same uniform-scale rule.)
