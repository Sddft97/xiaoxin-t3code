const FRAME_MS = 1000 / 8;

function randomFromSeed(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function sprite(
  size: number,
  paint: (context: OffscreenCanvasRenderingContext2D, size: number) => void,
) {
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext("2d");
  if (context) paint(context as unknown as OffscreenCanvasRenderingContext2D, size);
  return canvas;
}

function glow(size: number, center: string, edge: string, middle?: string) {
  return sprite(size, (ctx, width) => {
    const radius = width / 2;
    const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    gradient.addColorStop(0, center);
    if (middle) gradient.addColorStop(0.35, middle);
    gradient.addColorStop(1, edge);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, width);
  });
}

function sparkle() {
  return sprite(16, (ctx, width) => {
    const half = width / 2;
    ctx.translate(half, half);
    const ray = ctx.createLinearGradient(-half, 0, half, 0);
    ray.addColorStop(0, "rgba(255,255,255,0)");
    ray.addColorStop(0.5, "rgba(214,208,255,.95)");
    ray.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = ray;
    ctx.fillRect(-half, -0.5, width, 1);
    ctx.rotate(Math.PI / 2);
    ctx.fillRect(-half, -0.5, width, 1);
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 2.2);
    core.addColorStop(0, "white");
    core.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = core;
    ctx.fillRect(-3, -3, 6, 6);
  });
}

export function mountStardustParticles(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const sprites = {
    dust: glow(48, "rgba(140,130,240,.14)", "transparent"),
    spark: sparkle(),
    dot: glow(8, "white", "rgba(235,232,255,0)", "rgba(235,232,255,.85)"),
  };
  const random = randomFromSeed(7);
  const particles = Array.from({ length: 48 }, (_, index) => {
    const kind: keyof typeof sprites = index < 2 ? "dust" : index < 8 ? "spark" : "dot";
    const x = random();
    const y = random();
    const phase = random() * 6.283;
    const speed = 0.35 + random() * 0.7;
    const [size, sizeSpread, alpha, alphaSpread, drift, rise, riseSpread] =
      kind === "dot"
        ? [1.8, 2.6, 0.28, 0.42, 7, 2, 6]
        : kind === "spark"
          ? [10, 6, 0.42, 0.38, 4, 1.5, 3]
          : [70, 70, 0.55, 0.4, 3, 1, 2];
    return {
      kind,
      x,
      y,
      phase,
      speed,
      size: size + random() * sizeSpread,
      alpha: alpha + random() * alphaSpread,
      vx: (random() - 0.5) * drift,
      vy: -(rise + random() * riseSpread),
    };
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  let blocked = true;
  let hasArea = false;
  let focused = document.hasFocus();
  let elapsed = 0;
  let last = 0;

  function paint(dt: number) {
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    const transcriptHalfWidth = Math.min(0.4, 380 / width);
    for (const p of particles) {
      p.x += (p.vx * dt) / width;
      p.y += (p.vy * dt) / height;
      if (p.x < -0.05) p.x = 1.05;
      if (p.x > 1.05) p.x = -0.05;
      if (p.y < -0.05) p.y = 1.05;
      const twinkle = p.kind === "dust" ? 1 : 0.62 + 0.38 * Math.sin(elapsed * p.speed + p.phase);
      const attenuation = Math.abs(p.x - 0.5) < transcriptHalfWidth ? 0.28 : 1;
      ctx.globalAlpha = p.alpha * twinkle * attenuation;
      const offset = p.size / 2;
      ctx.drawImage(sprites[p.kind], p.x * width - offset, p.y * height - offset, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function tick() {
    const now = performance.now();
    const dt = Math.min(0.2, (now - last) / 1000);
    last = now;
    elapsed += dt;
    paint(dt);
    timer = setTimeout(tick, FRAME_MS);
  }

  function sync() {
    const awake = hasArea && !blocked && focused && !document.hidden;
    const motion = awake ? "running" : "paused";
    if (canvas.dataset.motion !== motion) canvas.dataset.motion = motion;
    if (awake && timer === undefined) {
      last = performance.now();
      timer = setTimeout(tick, FRAME_MS);
    } else if (!awake && timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  }
  const onFocus = () => {
    focused = true;
    sync();
  };
  const onBlur = () => {
    focused = false;
    sync();
  };
  // oxlint-disable-next-line t3code/no-raw-resize-observer -- The observer updates only canvas dimensions and animation state.
  const resize = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const { width, height } = entry.contentRect;
    hasArea = width > 0 && height > 0;
    if (hasArea) {
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));
      paint(0);
    }
    sync();
  });
  resize.observe(canvas);
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("focus", onFocus);
  window.addEventListener("blur", onBlur);

  return {
    setPaused(value: boolean) {
      blocked = value;
      sync();
    },
    destroy() {
      clearTimeout(timer);
      resize.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    },
  };
}
