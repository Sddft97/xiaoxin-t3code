// A fixed, jittered distribution keeps the sky stable across pointer changes,
// popup reopen and resizing. Depth controls both drift and point size.
function noise(i: number, salt: number) {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
}
const stars = Array.from({ length: 94 }, (_, i) => ({
  x: (i + noise(i, 1)) / 94,
  y: 0.07 + 0.86 * noise(i, 2),
  depth: i % 3,
  phase: noise(i, 3) * Math.PI * 2,
  rank: noise(i, 4),
  radius: 0.36 + 0.27 * (i % 3) + 0.26 * noise(i, 5),
}));

export function drawEffortSky(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ratio: number,
  inset: number,
  time: number,
  light: boolean,
) {
  ctx.clearRect(0, 0, width, height);
  const center = inset + (width - 2 * inset) * ratio;
  const fill = Math.min(width, Math.max(height, center + Math.max(0, (ratio - 0.75) * 4 * inset)));
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, fill, height, height / 2);
  ctx.clip();
  // Two translucent veils fold along different wavelengths in the same sky.
  for (let j = 0; j < 2; j++) {
    const y = (x: number) =>
      height *
      (0.43 +
        j * 0.16 +
        0.18 * Math.sin(x / 43 + time * 0.46 + j * 2.1) +
        0.11 * Math.sin(x / 22 - time * 0.31));
    ctx.beginPath();
    ctx.moveTo(-4, y(-4));
    for (let x = 0; x <= fill + 6; x += 5) ctx.lineTo(x, y(x));
    for (let x = fill + 6; x >= -5; x -= 5)
      ctx.lineTo(x, y(x) + 4.5 + 2.8 * Math.sin(x / 33 + j + time * 0.4));
    ctx.closePath();
    const veil = ctx.createLinearGradient(0, 0, width, 0);
    const rgb = light ? (j ? "243,224,255" : "255,247,255") : j ? "255,200,252" : "173,211,255";
    veil.addColorStop(0, `rgba(${rgb},0.02)`);
    veil.addColorStop(
      0.48 + 0.2 * Math.sin(time * 0.4 + j * 2),
      `rgba(${rgb},${0.15 + ratio * 0.12})`,
    );
    veil.addColorStop(1, `rgba(${rgb},0.03)`);
    ctx.shadowBlur = 2.5;
    ctx.shadowColor = `rgba(${rgb},0.25)`;
    ctx.fillStyle = veil;
    ctx.fill();
  }
  ctx.restore();

  for (const star of stars) {
    const x = ((star.x * width + time * (1.4 + 1.9 * star.depth)) % (width + 2)) - 1;
    const y = star.y * height + Math.sin(time * 0.28 + star.phase) * (0.6 + star.depth * 0.27);
    // Follow the rounded cap at each edge of the fill.
    const cap = height / 2 - Math.sqrt(Math.max(0, (height / 2) ** 2 - (y - height / 2) ** 2));
    const lit = x > cap && x < fill - cap;
    const intensity = Math.max(0, Math.min(1, (0.48 + ratio * 0.6 - star.rank) * 8));
    const gleam = 0.5 + 0.5 * Math.sin(time * (1.2 + star.rank) + star.phase);
    const near = Math.max(0, 1 - Math.abs(x - center) / 24);
    ctx.globalAlpha = lit
      ? (0.13 + 0.74 * intensity + near * 0.12) * (0.68 + gleam * 0.32)
      : (0.15 + 0.23 * intensity + near * 0.12) * (0.69 + gleam * 0.31);
    const ink = light ? (star.depth === 2 ? "#fffbff" : "#754fa9") : "#fff0ff";
    ctx.fillStyle = lit ? ink : light ? "#776a99" : "#a2b7e1";
    ctx.beginPath();
    ctx.arc(x, y, star.radius, 0, Math.PI * 2);
    ctx.fill();
    if (lit && star.depth === 2 && star.phase > 4.8 && gleam > 0.68) {
      const arm = 1 + (2.6 * (gleam - 0.68)) / 0.32;
      ctx.globalAlpha *= (gleam - 0.68) / 0.32;
      ctx.beginPath();
      ctx.moveTo(x, y - arm);
      ctx.quadraticCurveTo(x + 0.3, y - 0.3, x + arm * 0.85, y);
      ctx.quadraticCurveTo(x + 0.3, y + 0.3, x, y + arm);
      ctx.quadraticCurveTo(x - 0.3, y + 0.3, x - arm * 0.85, y);
      ctx.quadraticCurveTo(x - 0.3, y - 0.3, x, y - arm);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
