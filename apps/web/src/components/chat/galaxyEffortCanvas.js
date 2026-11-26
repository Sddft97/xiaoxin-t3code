// Adapted from the approved Stardust r5 galaxy band, MIT (c) 2026 Stardust contributors.
import { STARDUST_STAR_PATH } from "../sidebar/StardustMark";

const STAR = typeof Path2D === "undefined" ? null : new Path2D(STARDUST_STAR_PATH);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const BH = 32,
  PX = 6,
  PY = 2; // 带高 32 · 宽 58% · 画布横向余量 6px · 纵向余量 2px（+ 舞台自带 6px = 8px）

const CURVE = {
  sr: [0.35, 1, 2.6, 4.6, 6.8], // 星场 CSS playbackRate（1 = 远/中/近/细/密 3.5/7/12/18/26 px/s）
  ar: [0.5, 1, 1.8, 2.5, 3.6], // 星云 / 极光 CSS playbackRate
  warp: {
    n: [0, 0, 0, 12, 26],
    spd: [0, 0, 0, 195, 540],
    len: [0, 0, 0, 0.44, 0.73],
    a: [0, 0, 0, 0.36, 0.48],
  },
};
const interp = (arr, f) => {
  const i = clamp(Math.floor(f), 0, 3),
    t = clamp(f - i, 0, 1);
  return lerp(arr[i], arr[Math.min(4, i + 1)], t);
};

/* canvas 调色盘（线性插值；dk = 「带已变深」，用加色混合 + 白色星星） */
const PAL = {
  dark: [
    { g: [110, 120, 255], c: [200, 205, 255], dk: 1 },
    { g: [125, 115, 255], c: [220, 214, 255], dk: 1 },
    { g: [150, 110, 255], c: [235, 225, 255], dk: 1 },
    { g: [195, 120, 255], c: [246, 236, 255], dk: 1 },
    { g: [232, 160, 255], c: [255, 252, 255], dk: 1 },
  ],
  light: [
    { g: [91, 75, 224], c: [150, 138, 255], dk: 0 },
    { g: [91, 75, 224], c: [150, 138, 255], dk: 0 },
    { g: [205, 190, 255], c: [248, 242, 255], dk: 1 },
    { g: [225, 165, 255], c: [252, 242, 255], dk: 1 },
    { g: [255, 195, 255], c: [255, 252, 255], dk: 1 },
  ],
};
const TINTS = [
  [
    [120, 150, 255],
    [190, 120, 255],
    [235, 225, 255],
  ],
  [
    [255, 255, 255],
    [225, 175, 255],
    [165, 195, 255],
  ],
]; // 星轨（超高 / 极限）颜色
/* 到达爆发（按目标档；全部 ≤ 0.7s） */
const BURST = {
  1: {
    e: 0.25,
    waves: 1,
    span: 0.55,
    wa: 0.36,
    wlife: 0.26,
    flash: 0.11,
    fdec: 0.12,
    parts: 10,
    pv: 70,
    psz: 1.0,
    shake: 0,
    boost: 0,
    nova: 0.2,
  },
  2: {
    e: 0.5,
    waves: 1,
    span: 1.0,
    wa: 0.6,
    wlife: 0.3,
    flash: 0.22,
    fdec: 0.14,
    parts: 22,
    pv: 110,
    psz: 1.2,
    shake: 0,
    boost: 0,
    nova: 0.45,
  },
  3: {
    e: 0.78,
    waves: 2,
    span: 1.0,
    wa: 0.64,
    wlife: 0.34,
    flash: 0.28,
    fdec: 0.17,
    parts: 28,
    pv: 135,
    psz: 1.25,
    shake: 0.35,
    boost: 0.85,
    nova: 0.55,
  },
  4: {
    e: 1.0,
    waves: 2,
    span: 1.05,
    wa: 0.72,
    wlife: 0.4,
    flash: 0.46,
    fdec: 0.17,
    parts: 38,
    pv: 175,
    psz: 1.4,
    shake: 0.65,
    boost: 1.9,
    nova: 0.74,
  },
};
const DOWN = {
  e: 0.14,
  waves: 1,
  span: 0.4,
  wa: 0.2,
  wlife: 0.22,
  flash: 0,
  fdec: 0.1,
  parts: 4,
  pv: 45,
  psz: 0.8,
  shake: 0,
  boost: 0,
  nova: 0,
};

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FULL_MOTION_MS = 3000;
const DRIFT_INTERVAL_MS = 280;
const DRIFT_SPEED = 0.12;

export class GalaxyEffortCanvas {
  constructor(host, level, appearance) {
    this.host = host;
    this.stage = host.querySelector(".gx-stage");
    this.chEl = host.querySelector(".gx-ch");
    this.cv = host.querySelector("canvas");
    this.ctx = this.cv.getContext("2d");
    if (!this.ctx) throw new Error("Galaxy slider requires Canvas 2D");
    this.bh = BH;
    this.PX = PX;
    this.PY = PY;
    this.H = BH + 12;
    this.PADE = BH * 0.6 + 3;
    this.v = level;
    this.dark = appearance === "dark";
    this.vis = true;
    this.fullMotionUntil = performance.now() + FULL_MOTION_MS;
    this.motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.rate = { star: CURVE.sr[level], aur: CURVE.ar[level] };
    this.appliedRate = { star: -1, aur: -1 };
    // oxlint-disable-next-line t3code/no-raw-resize-observer -- Canvas layout updates synchronously without React state.
    this.ro = new ResizeObserver(() => {
      if (this.stage.clientWidth && this.stage.clientWidth !== this.W) this.layout();
    });
    this.ro.observe(this.stage);
    this.io = new IntersectionObserver(([entry]) => {
      this.vis = entry.isIntersecting;
      this.sync();
    });
    this.io.observe(host);
    document.addEventListener("visibilitychange", this.sync);
    this.motion.addEventListener("change", this.sync);
    this.layout();
    this.sync();
  }

  sync = () => {
    const visible = this.vis && !document.hidden;
    this.syncCssMotion();
    if (this.motion.matches) this.jump(this.v);
    if (!visible || this.motion.matches) {
      this.cancelFrame();
    } else {
      this.kick();
    }
  };

  cancelFrame() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.driftTimer);
    this.raf = this.driftTimer = undefined;
  }

  syncCssMotion() {
    this.host.classList.toggle(
      "gx-paused",
      !this.vis || document.hidden || this.v < 3 || this.drifting,
    );
  }

  wake() {
    if (this.v < 3 || this.motion.matches) return;
    this.fullMotionUntil = performance.now() + FULL_MOTION_MS;
    if (!this.drifting) return;
    this.drifting = false;
    this.cancelFrame();
    this.sync();
  }

  destroy() {
    this.cancelFrame();
    this.ro.disconnect();
    this.io.disconnect();
    document.removeEventListener("visibilitychange", this.sync);
    this.motion.removeEventListener("change", this.sync);
  }

  layout() {
    const { PX, PY, H, PADE } = this;
    this.W = Math.round(this.stage.clientWidth) || 200;
    const W = this.W,
      dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    this.dpr = dpr;
    this.CW = W + PX * 2;
    this.CH = H + PY * 2;
    this.cv.width = Math.round(this.CW * dpr);
    this.cv.height = Math.round(this.CH * dpr);
    this.cv.style.cssText = `width:${this.CW}px;height:${this.CH}px;left:${-PX}px;top:${-PY}px`;
    this.x0 = PX + PADE;
    this.x1 = PX + W - PADE;
    this.cy = PY + H / 2;
    const clipRadius = this.bh / 2 - 0.5;
    this.bandClip = new Path2D();
    this.bandClip.roundRect(PX + 0.5, this.cy - clipRadius, W - 1, clipRadius * 2, clipRadius);
    this.xs = [0, 1, 2, 3, 4].map((i) => this.x0 + (i * (this.x1 - this.x0)) / 4);
    this.k = this.v / 4;
    this.S = {
      x: this.xs[this.v],
      vx: 0,
      tx: this.xs[this.v],
      tail: 0,
      tailDir: 1,
      t: 0,
      lvf: this.v,
      parts: [],
      waves: [],
      arrivals: [],
      flash: null,
      glow: 0,
      surge: 0,
      shake: 0,
      boost: 0,
      nova: null,
      cur: ladder(this.k, true, 0),
      emit: 0,
      warp: [],
    };
    this._R = rng(7 + this.v);
    const R = this._R;
    for (let i = 0; i < CURVE.warp.n[4]; i++) this.S.warp.push(this.newWarp(true, R));
    this.prepareSprites();
    this.draw();
    this.applyRates();
  }
  newWarp(init, R) {
    const W = this.W;
    return {
      dir: R() < 0.8 ? -1 : 1,
      r: init ? R() * W * 0.85 : 1 + R() * 5,
      yo: (R() * 2 - 1) * (this.bh / 2 - 5) * (0.4 + 0.6 * R()),
      v: 0.55 + R() * 0.9,
      l: 0.55 + R() * 0.9,
      tint: (R() * 3) | 0,
      w: 0.75 + R() * 0.7,
    };
  }

  prepareSprites() {
    if (this.spr) return;
    const mk = (w, h, fn) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      fn(c.getContext("2d"), w, h);
      return c;
    };
    // 星轨：左头 / 右头两种，每个 tint × 2 方向；中心亮、边缘淡
    const sets = (this.spr = { streak: [], core: null });
    [0, 1].forEach((lv) => {
      sets.streak[lv] = TINTS[lv].map((tn) =>
        [0, 1].map((dir) =>
          mk(96, 8, (c, w, h) => {
            const g = c.createLinearGradient(dir ? 0 : w, 0, dir ? w : 0, 0);
            g.addColorStop(0, this.rgba(tn, 0));
            g.addColorStop(0.48, this.rgba(tn, 0.26));
            g.addColorStop(0.82, this.rgba(tn, 0.74));
            g.addColorStop(1, this.rgba(tn, 0));
            c.fillStyle = g;
            c.fillRect(0, 0, w, h);
            c.globalCompositeOperation = "destination-in";
            const fade = c.createLinearGradient(0, 0, 0, h);
            fade.addColorStop(0, "transparent");
            fade.addColorStop(0.5, "black");
            fade.addColorStop(1, "transparent");
            c.fillStyle = fade;
            c.fillRect(0, 0, w, h);
          }),
        ),
      );
    });
    sets.core = mk(128, 128, (c, w, h) => {
      const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, "rgba(255,250,255,1)");
      g.addColorStop(0.22, "rgba(240,215,255,.7)");
      g.addColorStop(0.55, "rgba(200,150,255,.26)");
      g.addColorStop(1, "rgba(180,120,255,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    });
    sets.comet = mk(64, 6, (c, w, _h) => {
      const g = c.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.85, "rgba(255,255,255,.55)");
      g.addColorStop(1, "rgba(255,255,255,1)");
      c.fillStyle = g;
      c.fillRect(0, 1.5, w, 3);
    });
  }
  pal(f) {
    const P = PAL[this.dark ? "dark" : "light"],
      i = clamp(Math.floor(f), 0, 3),
      t = clamp(f - i, 0, 1),
      a = P[i],
      b = P[Math.min(4, i + 1)];
    const m = (x, y) => [lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)];
    return { g: m(a.g, b.g), c: m(a.c, b.c), dk: lerp(a.dk, b.dk, t) };
  }

  setValue(v) {
    v = clamp(v, 0, 4);
    if (v === this.v) return;
    const prev = this.v,
      S = this.S,
      up = v > prev;
    this.v = v;
    this.k = v / 4;
    if (this.motion.matches) {
      this.jump(v);
      return;
    }
    this.wake();
    const L = ladder(this.k, up, prev / 4);
    S.cur = L;
    S.glow = 1;
    S.surge = L.e;
    S.arrivals.push({ tgt: this.xs[v], dir: up ? 1 : -1, L, v, up, t0: null });
    S.tx = this.xs[v];
    if (v < 3 && this.drifting) {
      this.drifting = false;
      this.cancelFrame();
    }
    this.sync();
  }
  clearFx() {
    const S = this.S;
    S.parts = [];
    S.waves = [];
    S.arrivals = [];
    S.flash = null;
    S.nova = null;
    S.glow = S.surge = S.shake = S.boost = 0;
    S.tail = 0;
    this.applyShake(0, 0);
  }
  arrive(a) {
    const S = this.S,
      R = this._R,
      B = a.up ? BURST[a.v] : DOWN;
    S.lastArrive = S.t;
    const x = S.x,
      cy = this.cy,
      cap = this.v >= 4 ? 150 : 110;
    for (let i = 0; i < B.parts; i++) {
      const ang = R() * Math.PI * 2,
        sp = B.pv * (0.35 + R() * 1.05);
      S.parts.push({
        x: x + (R() - 0.5) * 2,
        y: cy + (R() - 0.5) * 3,
        vx: Math.cos(ang) * sp * 1.25,
        vy: Math.sin(ang) * sp * 0.55,
        life: 0.16 + R() * (0.14 + 0.1 * B.e),
        age: 0,
        r: (0.5 + R() * 0.7) * B.psz,
        a: a.up ? 1 : 0.55,
      });
    }
    if (S.parts.length > cap) S.parts.splice(0, S.parts.length - cap);
    for (let i = 0; i < B.waves; i++)
      S.waves.push({
        x,
        t0: S.t + i * 0.075,
        life: B.wlife + i * 0.03,
        a: B.wa * (1 - i * 0.22),
        span: B.span,
        e: B.e,
        w: 1.2 + 1.8 * B.e,
      });
    if (B.flash > 0) S.flash = { t0: S.t, amp: B.flash, dec: B.fdec };
    if (B.nova > 0) S.nova = { t0: S.t, k: B.nova, life: 0.36 };
    S.shake = Math.max(S.shake, B.shake);
    S.boost = Math.max(S.boost, B.boost);
  }

  step(dt) {
    const S = this.S,
      cur = S.cur,
      R = this._R,
      n = Math.max(1, Math.ceil(dt / (1 / 240))),
      h = dt / n;
    const w = this.dragging && this.follow ? 36 : cur.omega,
      z = this.dragging && this.follow ? 1 : cur.zeta;
    for (let i = 0; i < n; i++) {
      const a = w * w * (S.tx - S.x) - 2 * z * w * S.vx;
      S.vx += a * h;
      S.x += S.vx * h;
    }
    S.t += dt;
    if (Math.abs(S.vx) > 8) S.tailDir = Math.sign(S.vx);
    const lInst = Math.min(cur.lmax, Math.abs(S.vx) * cur.tauTail) * cur.tailMul;
    S.tail = Math.max(lInst, S.tail * Math.exp(-dt / (0.02 + cur.decay * 0.26)));
    if (S.tail < 3) S.tail = 0;
    S.glow *= Math.exp(-dt / (0.07 + 0.07 * cur.e));
    if (S.glow < 0.04) S.glow = 0;
    S.surge *= Math.exp(-dt / (0.1 + 0.06 * cur.e));
    if (S.surge < 0.05) S.surge = 0;
    S.arrivals.forEach((a) => {
      if (a.t0 === null) a.t0 = S.t;
      if (!a.done && ((S.x - a.tgt) * a.dir >= -1.6 || Math.abs(S.x - a.tgt) < 1.2)) {
        a.done = true;
        this.arrive(a);
      }
    });
    S.arrivals = S.arrivals.filter((a) => !a.done && S.t - a.t0 < 0.6);
    if (Math.abs(S.tx - S.x) < 0.5 && Math.abs(S.vx) < 8) S.arrivals = [];
    if (cur.up && Math.abs(S.vx) > 50 && cur.dens > 0) {
      S.emit += Math.abs(S.vx) * dt * cur.dens;
      while (S.emit >= 1) {
        S.emit -= 1;
        const dir = S.tailDir;
        S.parts.push({
          x: S.x - dir * R() * 4,
          y: this.cy + (R() - 0.5) * (2 + 3 * cur.e),
          vx: -dir * (24 + R() * 80 * cur.e),
          vy: (R() - 0.5) * (36 + 70 * cur.e),
          life: 0.14 + R() * 0.12 + 0.06 * cur.e,
          age: 0,
          r: 0.45 + R() * (0.6 + 0.5 * cur.e),
          a: 0.85,
        });
      }
    } else S.emit = 0;
    const dmp = Math.exp(-dt * 4.2);
    S.parts.forEach((p) => {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= dmp;
      p.vy *= dmp;
    });
    S.parts = S.parts.filter((p) => p.age < p.life && Math.abs(p.y - this.cy) < this.bh / 2 + 2);
    S.waves = S.waves.filter((r) => S.t - r.t0 < r.life);
    if (S.flash && S.t - S.flash.t0 > 0.65) S.flash = null;
    if (S.nova && S.t - S.nova.t0 > S.nova.life) S.nova = null;
    // 平滑「连续档位」lvf：颜色 / 星轨 / 光晕都跟着它走，换档不跳变
    const df = this.v - S.lvf;
    S.lvf = Math.abs(df) < 0.004 ? this.v : S.lvf + df * (1 - Math.exp(-dt / 0.2));
    // CSS 动画速率（星场 / 极光）平滑到目标档
    const kk = 1 - Math.exp(-dt / 0.22),
      tr = { star: CURVE.sr[this.v], aur: CURVE.ar[this.v] };
    ["star", "aur"].forEach((q) => {
      const d = tr[q] - this.rate[q];
      this.rate[q] = Math.abs(d) < tr[q] * 0.01 ? tr[q] : this.rate[q] + d * kk;
    });
    // 曲速线
    const wp = this.warpP(S.lvf);
    if (wp.n > 0) {
      const boost = 1 + S.boost,
        Wd = this.W;
      for (let i = 0; i < S.warp.length; i++) {
        const p = S.warp[i];
        p.r += wp.spd * p.v * (1 + p.r / 100) * boost * dt;
        if (p.r > Wd * 0.9 || Math.abs(p.yo * (1 + p.r / (Wd * 0.8))) > this.bh / 2 - 1.5) {
          const q = this.newWarp(false, R);
          Object.assign(p, q);
        }
      }
    }
    S.boost *= Math.exp(-dt / 0.3);
    if (S.boost < 0.03) S.boost = 0;
    // 带「充能」震动：1–2px，≤ 0.2s
    S.shake *= Math.exp(-dt / 0.05);
    if (S.shake < 0.05) S.shake = 0;
    if (S.shake > 0)
      this.applyShake(Math.sin(S.t * 230) * S.shake, Math.cos(S.t * 170) * S.shake * 0.45);
    else if (this._sk) this.applyShake(0, 0);
  }
  applyShake(x, y) {
    const tf = x || y ? `translate(${x.toFixed(2)}px,${y.toFixed(2)}px)` : "";
    this.chEl.style.transform = tf;
    this.cv.style.transform = tf;
    this._sk = !!tf;
  }
  warpP(f) {
    return {
      n: Math.round(interp(CURVE.warp.n, f)),
      spd: interp(CURVE.warp.spd, f),
      len: interp(CURVE.warp.len, f),
      a: interp(CURVE.warp.a, f),
    };
  }
  active() {
    const S = this.S;
    return (
      Math.abs(S.tx - S.x) > 0.25 ||
      Math.abs(S.vx) > 8 ||
      S.parts.length ||
      S.waves.length ||
      S.flash ||
      S.nova ||
      S.glow ||
      S.surge ||
      S.tail ||
      S.arrivals.length ||
      S.shake ||
      S.boost ||
      Math.abs(S.lvf - this.v) > 0.004 ||
      this.rate.star !== CURVE.sr[this.v] ||
      this.rate.aur !== CURVE.ar[this.v]
    );
  }
  needLoop() {
    return this.v >= 3 || this.active();
  }
  kick() {
    if (this.raf !== undefined || this.driftTimer !== undefined || !this.needLoop()) return;
    this.last = performance.now();
    this.queueFrame();
  }
  queueFrame() {
    if (this.drifting) {
      this.driftTimer = setTimeout(() => {
        this.driftTimer = undefined;
        this.raf = requestAnimationFrame(this.frame);
      }, DRIFT_INTERVAL_MS);
    } else {
      this.raf = requestAnimationFrame(this.frame);
    }
  }
  frame = (now) => {
    this.raf = undefined;
    if (!this.vis || document.hidden || this.motion.matches) return;
    const elapsed = now - this.last;
    const dt = this.drifting
      ? clamp(elapsed * DRIFT_SPEED, 0, DRIFT_INTERVAL_MS * DRIFT_SPEED) / 1000
      : clamp(elapsed / 1000, 0, 0.05);
    this.last = now;
    this.step(dt);
    this.applyRates();
    if (this.drifting) {
      for (const [animation] of this.anims) {
        if (typeof animation.currentTime === "number") {
          animation.currentTime += dt * 1000 * animation.playbackRate;
        }
      }
    }
    this.draw();
    if (this.v >= 3 && !this.drifting && now >= this.fullMotionUntil) {
      this.drifting = true;
      this.syncCssMotion();
    }
    if (this.needLoop()) {
      this.queueFrame();
    } else {
      this.jump(this.v);
    }
  };
  applyRates() {
    if (!this.anims) {
      this.anims = [];
      this.chEl
        .querySelectorAll("[data-an]")
        .forEach((el) => el.getAnimations().forEach((a) => this.anims.push([a, el.dataset.an])));
    }
    ["star", "aur"].forEach((q) => {
      const r = this.rate[q];
      if (Math.abs(r - this.appliedRate[q]) > 0.003) {
        this.appliedRate[q] = r;
        this.anims.forEach(([a, c]) => {
          if (c === q) a.updatePlaybackRate(r);
        });
      }
    });
  }
  jump(v) {
    v = clamp(v, 0, 4);
    this.v = v;
    this.k = v / 4;
    const S = this.S;
    S.tx = S.x = this.xs[v];
    S.vx = 0;
    S.lvf = v;
    S.cur = ladder(this.k, true, 0);
    this.rate.star = CURVE.sr[v];
    this.rate.aur = CURVE.ar[v];
    this.clearFx();
    this.draw();
    this.applyRates();
  }

  rgba(c, a) {
    return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  }
  draw() {
    const c = this.ctx,
      S = this.S;
    if (!S || !this.spr) return;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.CW, this.CH);
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 1;
    const P = this.pal(S.lvf);
    P.add = this.dark || P.dk > 0.5 ? "lighter" : "source-over";
    this._P = P;
    this.drawBand(c, S, P);
    this.drawStops(c, S, P);
    this.drawFx(c, S, P);
    this.drawStar(c, S, P);
  }
  breath(S) {
    return 0.5 + 0.5 * Math.sin((S.t * 2 * Math.PI) / 1.7 - 1.2);
  }
  flashEnv(S) {
    const f = S.flash;
    if (!f) return 0;
    const t = S.t - f.t0,
      at = 0.03;
    return f.amp * (t < at ? t / at : Math.exp(-(t - at) / f.dec));
  }
  drawBand(c, S, P) {
    const { cy, bh } = this,
      R = bh / 2,
      cl = this.PX,
      W = this.W,
      f = S.lvf,
      k = f / 4,
      g = P.g,
      cc = P.c,
      add = P.add;
    const wa3 = clamp(f - 2, 0, 1),
      wa4 = clamp(f - 3, 0, 1),
      br = this.breath(S),
      fl = this.flashEnv(S),
      surge = 1 + 1.1 * S.surge;
    c.save();
    c.clip(this.bandClip);
    // 1 · 极限：呼吸脉动的白紫热核星云（canvas 预渲染精灵 + 一次 drawImage）
    if (wa3 > 0.01) {
      c.globalCompositeOperation = add;
      c.globalAlpha = (0.09 + 0.15 * br) * wa3 + (0.13 + 0.17 * br) * wa4;
      c.drawImage(this.spr.core, S.x - W * 0.46, cy - bh * 1.15, W * 0.92, bh * 2.3);
      c.globalAlpha = 1;
      c.fillStyle = this.rgba(g, (0.04 + 0.055 * br) * wa4);
      c.fillRect(cl, cy - R, W, bh);
    }
    // 2 · 点亮段（能量）：随档位变粗 / 变亮
    const xl = Math.max(cl + R, S.x);
    if (xl > cl + R + 0.5) {
      const hf = 0.42 + 0.5 * k,
        la = (this.dark || P.dk > 0.5 ? 0.16 + 0.5 * k : 0.1 + 0.22 * k) * surge;
      c.globalCompositeOperation = add;
      const gr = c.createLinearGradient(cl, 0, xl, 0);
      gr.addColorStop(0, this.rgba(g, la * 0.12));
      gr.addColorStop(0.6, this.rgba(g, la * 0.72));
      gr.addColorStop(1, this.rgba(g, la));
      c.fillStyle = gr;
      c.beginPath();
      c.roundRect(cl, cy - R * hf, xl - cl, R * 2 * hf, R * hf);
      c.fill();
      const tw = 1.1 + 1.6 * k,
        lineSoftness = 1 - 0.36 * wa3 - 0.16 * wa4,
        g2 = c.createLinearGradient(cl, 0, xl, 0);
      g2.addColorStop(0, this.rgba(cc, 0));
      g2.addColorStop(0.3, this.rgba(cc, la * 1.2 * lineSoftness));
      g2.addColorStop(1, this.rgba(cc, Math.min(1, la * 2.2) * lineSoftness));
      c.fillStyle = g2;
      c.beginPath();
      c.roundRect(cl + R, cy - tw / 2, xl - cl - R, tw, tw / 2);
      c.fill();
      // 彗星式能量脉冲沿电流跑（超高 2 颗 / 极限 4 颗）
      const np = Math.round(2 * wa3 + 2 * wa4),
        span = xl - cl - R;
      for (let i = 0; i < np && span > 20; i++) {
        const ph = (S.t * (0.55 + 0.5 * wa4) + i / np) % 1,
          px = cl + R + ph * span,
          len = 18 + 10 * wa4;
        c.globalAlpha = Math.sin(Math.PI * ph) * (0.35 + 0.19 * wa4);
        c.drawImage(this.spr.comet, px - len, cy - 3 * (1 + wa4 * 0.4), len, 6 * (1 + wa4 * 0.4));
      }
      c.globalAlpha = 1;
    }
    // 3 · 星轨（超高）→ 曲速线（极限）：从拇指向外喷射，掠过星星
    const wp = this.warpP(f);
    if (wp.n > 0) {
      c.globalCompositeOperation = add;
      const boost = 1 + S.boost * 0.5,
        Wd = W,
        sp = this.spr.streak[f > 3.5 ? 1 : 0],
        hh = bh / 2;
      for (let i = 0; i < wp.n && i < S.warp.length; i++) {
        const p = S.warp[i],
          r = p.r,
          y = cy + p.yo * (1 + r / (Wd * 0.8));
        if (Math.abs(y - cy) > hh) continue;
        const len = clamp((4 + r * 0.42 * wp.len + wp.spd * 0.018 * p.v * boost) * p.l, 3, r + 5),
          a = wp.a * sstep(0, 14, r) * (1 - Math.pow(r / (Wd * 0.9), 2.2)) * (0.55 + 0.45 * p.v);
        if (a < 0.02) continue;
        const x = S.x + p.dir * r,
          left = p.dir > 0 ? x - len : x;
        if (left >= cl + W || left + len <= cl) continue;
        const th = (1.2 + 0.9 * wa4) * p.w;
        const im = sp[p.tint][p.dir > 0 ? 1 : 0];
        c.globalAlpha = Math.min(1, a);
        c.drawImage(im, left, y - th / 2, len, th);
      }
      c.globalAlpha = 1;
    }
    // 4 · 拇指热核（极限）
    if (wa3 > 0.01) {
      c.globalCompositeOperation = add;
      c.globalAlpha = Math.min(1, (0.3 + 0.12 * br) * wa3 + (0.35 + 0.25 * br) * wa4);
      const rr = 24 + 14 * wa4 + 6 * br * wa4;
      c.drawImage(this.spr.core, S.x - rr, cy - rr * 0.72, rr * 2, rr * 1.44);
      c.globalAlpha = 1;
    }
    // 5 · 高档的亮光集中在星星附近，整条带只留一层薄光。
    if (fl > 0.005) {
      c.globalCompositeOperation = P.add === "lighter" ? "lighter" : "source-over";
      c.fillStyle = this.rgba(cc, fl * (1 - 0.8 * wa3) * (this.dark || P.dk > 0.5 ? 1 : 0.8));
      c.fillRect(cl, cy - R, W, bh);
      c.globalAlpha = Math.min(1, fl * 0.9);
      const width = W * (1 - 0.24 * wa3);
      c.drawImage(this.spr.core, S.x - width * 0.5, cy - bh * 1.2, width, bh * 2.4);
      c.globalAlpha = 1;
    }
    c.restore();
    c.globalCompositeOperation = "source-over";
    if (fl > 0.02) {
      c.globalCompositeOperation = P.add;
      c.strokeStyle = this.rgba(cc, (0.7 * fl + 0.1) * (1 - 0.55 * wa3));
      c.lineWidth = 1.2;
      c.stroke(this.bandClip);
      c.globalCompositeOperation = "source-over";
    }
  }
  drawStops(c, S, P) {
    const cy = this.cy,
      R = this.bh / 2,
      lightish = P.dk <= 0.5,
      tick = lightish ? [78, 76, 120] : [235, 228, 255];
    this.xs.forEach((x) => {
      const lit = x <= S.x + 1;
      if (Math.abs(x - S.x) < 4) return;
      c.strokeStyle = this.rgba(lit ? P.c : tick, lit ? 0.55 : lightish ? 0.32 : 0.26);
      c.lineWidth = 1;
      c.lineCap = "round";
      const tl = Math.min(4, R * 0.32);
      c.beginPath();
      c.moveTo(x, cy - R + 2.5);
      c.lineTo(x, cy - R + 2.5 + tl);
      c.moveTo(x, cy + R - 2.5);
      c.lineTo(x, cy + R - 2.5 - tl);
      c.stroke();
      c.fillStyle = lit ? this.rgba(lightish ? P.g : P.c, 0.85) : this.rgba(tick, 0.4);
      c.beginPath();
      c.arc(x, cy, 1.2, 0, 7);
      c.fill();
    });
  }
  drawFx(c, S, P) {
    const cy = this.cy,
      cur = S.cur,
      hh = this.bh / 2,
      add = P.add,
      g = P.g,
      cc = P.c,
      dk = this.dark || P.dk > 0.5;
    // 拇指彗尾
    if (S.tail > 0.5) {
      const dir = S.tailDir,
        L = S.tail,
        e = cur.e * (cur.up ? 1 : 0.6),
        hx = S.x,
        soft = cur.up ? sstep(0.64, 1, e) : 0,
        hw = Math.min(hh * 0.6, (1.0 + 2.6 * e) * (cur.up ? 1 - 0.24 * soft : 0.6)),
        a0 = (0.3 + 0.58 * e) * (cur.up ? 1 - 0.42 * soft : 0.5) * (dk ? 1 : 0.7);
      c.globalCompositeOperation = add;
      const gr = c.createLinearGradient(hx, 0, hx - dir * L, 0);
      gr.addColorStop(0, this.rgba(g, a0));
      gr.addColorStop(0.35, this.rgba(g, a0 * 0.42));
      gr.addColorStop(1, this.rgba(g, 0));
      c.fillStyle = gr;
      c.beginPath();
      c.moveTo(hx, cy - hw * 2.1);
      c.quadraticCurveTo(hx - dir * L * 0.5, cy - hw * 0.9, hx - dir * L, cy);
      c.quadraticCurveTo(hx - dir * L * 0.5, cy + hw * 0.9, hx, cy + hw * 2.1);
      c.closePath();
      c.fill();
      const g2 = c.createLinearGradient(hx, 0, hx - dir * L * 0.72, 0);
      g2.addColorStop(0, this.rgba(cc, a0 * (1.1 - 0.45 * soft)));
      g2.addColorStop(1, this.rgba(cc, 0));
      c.fillStyle = g2;
      c.beginPath();
      c.moveTo(hx, cy - hw * 0.75);
      c.lineTo(hx - dir * L * 0.72, cy);
      c.lineTo(hx, cy + hw * 0.75);
      c.closePath();
      c.fill();
    }
    // 带内：粒子 + 冲击波，被裁在带里
    c.save();
    c.clip(this.bandClip);
    c.globalCompositeOperation = add;
    S.parts.forEach((p) => {
      const q = 1 - p.age / p.life;
      c.fillStyle = this.rgba(dk ? cc : g, p.a * q * q * (dk ? 0.95 : 1));
      c.beginPath();
      c.arc(p.x, p.y, p.r * (0.6 + 0.5 * q), 0, 7);
      c.fill();
    });
    const far = Math.max(S.x - this.PX, this.PX + this.W - S.x);
    S.waves.forEach((r) => {
      const p = (S.t - r.t0) / r.life;
      if (p < 0 || p > 1) return;
      const e = 1 - Math.pow(1 - p, 2.2),
        rx = 9 + (far * r.span + 4) * e,
        soft = sstep(0.5, 1, r.e),
        al = (1 - p) * (1 - p) * r.a;
      c.strokeStyle = this.rgba(dk ? g : [255, 255, 255], al * 0.45);
      c.lineWidth = (r.w + 5) * (1 - p * 0.5);
      c.beginPath();
      c.ellipse(S.x, cy, rx, hh * 1.5, 0, 0, 7);
      c.stroke(); // 宽而柔的外环
      c.strokeStyle = this.rgba(dk ? cc : [255, 255, 255], al * (1.3 - 0.65 * soft));
      c.lineWidth = r.w * (1 - p * 0.6);
      c.beginPath();
      c.ellipse(S.x, cy, rx, hh * 1.5, 0, 0, 7);
      c.stroke();
    }); // 亮芯
    c.restore();
    // 星芒（到达瞬间的十字光）
    if (S.nova) {
      c.save();
      c.clip(this.bandClip);
      const n = S.nova,
        p = (S.t - n.t0) / n.life,
        bell = Math.sin(Math.PI * Math.min(1, p));
      c.globalCompositeOperation = add;
      const len = (10 + 20 * n.k) * (0.5 + 0.5 * bell),
        lv = Math.min(len * 0.6, hh + 3);
      c.strokeStyle = this.rgba(dk ? [255, 255, 255] : cc, 0.9 * bell);
      c.lineWidth = 1 + 0.6 * n.k;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(S.x - len, cy);
      c.lineTo(S.x + len, cy);
      c.moveTo(S.x, cy - lv);
      c.lineTo(S.x, cy + lv);
      c.stroke();
      c.restore();
    }
    c.globalCompositeOperation = "source-over";
  }
  drawStar(c, S, P) {
    const cy = this.cy,
      cur = S.cur,
      glow = S.glow,
      f = S.lvf,
      k = f / 4,
      br = this.breath(S),
      wa4 = clamp(f - 3, 0, 1),
      dkStar = this.dark || P.dk > 0.5;
    const sz = this.bh * (0.82 + 0.38 * k) * (1 + 0.1 * glow * cur.e + 0.04 * br * wa4);
    c.globalCompositeOperation = P.add;
    const base = interp([0.18, 0.28, 0.42, 0.6, 0.85], f),
      rad = interp([7, 9.5, 12.5, 16, 20], f) + (4 + 14 * cur.e) * glow,
      hr = Math.min(this.H / 2 + 2, rad),
      ha = base + 0.5 * glow * cur.e * (cur.up ? 1 : 0.4);
    const hg = c.createRadialGradient(S.x, cy, 0, S.x, cy, hr);
    hg.addColorStop(0, this.rgba(dkStar ? P.c : P.g, dkStar ? ha : ha * 0.55));
    hg.addColorStop(1, this.rgba(P.g, 0));
    c.fillStyle = hg;
    c.beginPath();
    c.arc(S.x, cy, hr, 0, 7);
    c.fill();
    c.globalCompositeOperation = "source-over";
    if (f > 3) {
      const dr = this.bh * 0.62,
        dg = c.createRadialGradient(S.x, cy, dr * 0.25, S.x, cy, dr);
      dg.addColorStop(0, `rgba(60,16,150,${0.55 * wa4})`);
      dg.addColorStop(1, "rgba(60,16,150,0)");
      c.fillStyle = dg;
      c.beginPath();
      c.arc(S.x, cy, dr, 0, 7);
      c.fill();
    }
    c.save();
    c.translate(S.x, cy);
    const s = sz / 504;
    c.scale(s, s);
    c.translate(-512, -505);
    const gr = c.createLinearGradient(330, 265, 700, 745);
    if (dkStar) {
      gr.addColorStop(0, "#ffffff");
      gr.addColorStop(0.55, "#ece6ff");
      gr.addColorStop(1, f > 3 ? "#c9b6ff" : "#b3a6ff");
    } else {
      gr.addColorStop(0, "#d9d3ff");
      gr.addColorStop(0.55, "#a094ff");
      gr.addColorStop(1, "#6a5af0");
    }
    c.fillStyle = gr;
    c.fill(STAR);
    if (!dkStar) {
      c.lineWidth = 0.9 / s;
      c.strokeStyle = "rgba(70,55,200,.6)";
      c.stroke(STAR);
    } else if (f > 3) {
      c.lineWidth = 1.1 / s;
      c.strokeStyle = `rgba(104,56,226,${0.7 * wa4})`;
      c.stroke(STAR);
    }
    if (this.v === 4) {
      c.fillStyle = dkStar ? "#2f2fc8" : "#1d2a9c";
      [-44, 44].forEach((dx) => {
        c.beginPath();
        c.roundRect(512 + dx - 17, 505 + 3 - 37 - 8, 34, 74, 17);
        c.fill();
      });
    }
    c.restore();
  }
}

/* 位移物理（同 r4）：目标档越高，弹簧越硬 / 尾巴越长；降档统一轻柔 */
function ladder(k, up, kFrom) {
  if (up) {
    const e = 0.28 + 0.72 * k;
    const soft = sstep(0.64, 1, e);
    return {
      up,
      e,
      omega: 14 + 16 * e,
      zeta: 1 - 0.3 * e,
      tauTail: 0.06 + 0.1 * e,
      lmax: 24 + 96 * e,
      tailMul: 1 - 0.24 * soft,
      dens: (0.01 + 0.05 * e) * (1 - 0.38 * soft),
      decay: 0.12 + 0.12 * e,
    };
  }
  return {
    up,
    e: 0.18 + 0.2 * kFrom,
    omega: 21,
    zeta: 1,
    tauTail: 0.07,
    lmax: 40,
    tailMul: 0.4,
    dens: 0,
    decay: 0.1,
  };
}
