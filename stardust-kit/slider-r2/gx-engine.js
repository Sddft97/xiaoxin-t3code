/*! 星尘 · 银河划星 · 推理强度滑块运行时 (设计稿)  MIT License · Copyright (c) 2026 Stardust contributors
 *
 * 一个 <canvas>（无 SVG / 无 filter / 无离屏画布），空闲时不跑任何循环：
 *   rAF 只在「档位变化」之后的 ~200–450ms 内运行，动效收尾即停；
 *   静止态只重画一次。带一个纯 CSS（合成器线程）的极慢流光，可随时关闭。
 * 三个变体共用同一套物理 + 冲击阶梯，只替换「银河带」的画法：
 *   A 细光带 + 彗尾   B 星尘带（星过尘分）   C 光带 + 背景视差
 */
(() => {
  "use strict";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const LABELS = {
    5: ["低", "中", "高", "超高", "极限"],
    4: ["低", "中", "高", "极限"],
    3: ["低", "中", "高"],
  };
  const STAR = new Path2D(
    "M475.4 324.7 Q512.0 265.0 548.6 324.7 L581.3 378.0 Q600.2 408.6 635.2 417.1 L696.0 431.7 Q764.0 448.1 718.6 501.4 L678.0 549.0 Q654.7 576.4 657.5 612.2 L662.3 674.6 Q667.8 744.4 603.1 717.6 L545.3 693.8 Q512.0 680.0 478.7 693.8 L420.9 717.6 Q356.2 744.4 361.7 674.6 L366.5 612.2 Q369.3 576.4 346.0 549.0 L305.4 501.4 Q260.0 448.1 328.0 431.7 L388.8 417.1 Q423.8 408.6 442.7 378.0 Z",
  );

  /* ---------- 全局时钟：真实 rAF，或「手动」虚拟时钟（截图 / 视频逐帧确定性渲染） ---------- */
  const G = {
    manual: false,
    vt: 0,
    scale: 1,
    pending: [],
    all: new Set(),
    now() {
      return G.manual ? G.vt : performance.now();
    },
    raf(fn) {
      if (G.manual) G.pending.push(fn);
      else requestAnimationFrame(fn);
    },
    advance(ms) {
      const step = 1000 / 60;
      let rem = ms;
      while (rem > 1e-6) {
        const d = Math.min(step, rem);
        rem -= d;
        G.vt += d;
        const p = G.pending;
        G.pending = [];
        p.forEach((f) => f(G.vt));
      }
    },
    rm: () =>
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.classList.contains("rm"),
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

  /* ---------- 冲击阶梯：目标档位越高，一切越猛（升档）；降档统一轻柔 ---------- */
  function ladder(k, up, kFrom) {
    if (up) {
      const e = 0.28 + 0.72 * k; // 0.28 … 1.00
      return {
        up,
        e,
        omega: 14 + 16 * e,
        zeta: 1 - 0.3 * e, // 越高越快、越有一点点过冲
        tauTail: 0.06 + 0.1 * e,
        lmax: 24 + 96 * e,
        tailMul: 1,
        dens: 0.01 + 0.05 * e,
        burst: Math.round(2 + 13 * e),
        streaks: e >= 0.45 ? Math.floor(e * 4.4) : 0,
        ring: clamp((k - 0.6) / 0.4, 0, 1),
        decay: 0.12 + 0.12 * e,
      };
    }
    const e = 0.18 + 0.2 * kFrom; // 降档：0.18 … 0.38，永远比同档升档轻
    return {
      up,
      e,
      omega: 21,
      zeta: 1,
      tauTail: 0.07,
      lmax: 40,
      tailMul: 0.4,
      dens: 0,
      burst: 2,
      streaks: 0,
      ring: 0,
      decay: 0.1,
    };
  }

  class GX {
    constructor(host, { variant = "A", n = 5, v = 1, labels = "ends" } = {}) {
      this.host = host;
      this.variant = variant;
      this.n = n;
      this.v = clamp(v, 0, n - 1);
      this.labelsMode = labels;
      this.hover = -1;
      this.dragging = false;
      this.follow = false;
      this.perf = { frames: 0, ms: 0, runs: 0, maxMs: 0 };
      this.PX = 14;
      this.PY = 12;
      this.H = 26;
      this.PADE = 9;
      this.build();
      G.all.add(this);
    }
    /* ---------- DOM ---------- */
    build() {
      const h = this.host;
      h.classList.add("gx");
      h.dataset.variant = this.variant;
      h.innerHTML = `<div class="gx-h"><span class="gx-t"><svg class="gx-ico" aria-hidden="true"><use href="#sd-star"/></svg>推理强度</span><b class="gx-v"></b></div>
      <div class="gx-row"><span class="gx-end gx-el"></span>
        <div class="gx-stage" role="slider" tabindex="0" aria-label="推理强度" style="height:${this.H}px">
          <div class="gx-clip"><i class="gx-shim"></i></div><canvas aria-hidden="true"></canvas></div>
        <span class="gx-end gx-er"></span></div>
      <div class="gx-lab"></div>`;
      this.stage = h.querySelector(".gx-stage");
      this.cv = h.querySelector("canvas");
      this.ctx = this.cv.getContext("2d");
      this.valEl = h.querySelector(".gx-v");
      this.labRow = h.querySelector(".gx-lab");
      h.classList.toggle("all-labels", this.labelsMode === "all");
      this.bindPointer();
      this.bindKeys();
      this.ro = new ResizeObserver(() => {
        const w = Math.round(this.stage.clientWidth);
        if (w && w !== this.W) this.layout();
      });
      this.ro.observe(this.stage);
      this.layout(true);
    }
    setN(n) {
      this.v = Math.round((this.v / (this.n - 1)) * (n - 1));
      this.n = n;
      this.layout(true);
    }
    setLabelsMode(m) {
      this.labelsMode = m;
      this.host.classList.toggle("all-labels", m === "all");
    }
    layout(first) {
      const { PX, PY, H, PADE, n } = this;
      this.W = Math.round(this.stage.clientWidth) || 300;
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
      this.xs = [...Array(n).keys()].map((i) => this.x0 + (i * (this.x1 - this.x0)) / (n - 1));
      const lab = LABELS[n];
      this.host.querySelector(".gx-el").textContent = lab[0];
      this.host.querySelector(".gx-er").textContent = lab[n - 1];
      this.labRow.innerHTML = "";
      this.btns = lab.map((t, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.tabIndex = -1;
        b.textContent = t;
        b.style.left = this.stage.offsetLeft - this.labRow.offsetLeft + this.xs[i] - PX + "px";
        b.addEventListener("click", () => this.setValue(i, { user: true }));
        this.labRow.appendChild(b);
        return b;
      });
      this.stage.setAttribute("aria-valuemin", 0);
      this.stage.setAttribute("aria-valuemax", n - 1);
      this.k = this.v / (n - 1);
      this.S = {
        x: this.xs[this.v],
        vx: 0,
        tx: this.xs[this.v],
        tail: 0,
        tailDir: 1,
        t: 0,
        parts: [],
        streaks: [],
        rings: [],
        arrivals: [],
        flash: null,
        glow: 0,
        surge: 0,
        blink: -1,
        cur: ladder(this.k, true, 0),
        emit: 0,
        _x: null,
      };
      this.makeVariant();
      this.refreshTheme();
      this.renderText();
      this.draw();
    }
    refreshTheme() {
      const cs = getComputedStyle(this.host),
        g = (n) => cs.getPropertyValue(n).trim(),
        rgb = (n) => g(n).split(",").map(Number);
      if (!g("--gx-ac")) return; // 尚未挂进带主题类的 DOM
      this.th = {
        dark: g("--gx-dark") === "1",
        ac: rgb("--gx-ac"),
        glow: rgb("--gx-glow"),
        band: rgb("--gx-band"),
        spk: rgb("--gx-spk"),
        core: rgb("--gx-core"),
        hi: rgb(g("--gx-dark") === "1" ? "--gx-core" : "--gx-ac"),
        sa: g("--gx-sa"),
        sb: g("--gx-sb"),
        sc: g("--gx-sc"),
        edge: g("--gx-edge"),
        eye: g("--gx-eye"),
      };
      this.draw();
    }
    renderText() {
      const lab = LABELS[this.n][this.v];
      if (this.valEl.textContent !== lab) {
        this.valEl.textContent = lab;
        if (!G.rm() && this.valEl.animate)
          this.valEl.animate(
            [
              { opacity: 0.3, transform: "translateY(1px)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 160, easing: "ease-out" },
          );
      }
      this.stage.setAttribute("aria-valuenow", this.v);
      this.stage.setAttribute("aria-valuetext", lab);
      this.btns.forEach((b, i) => {
        b.classList.toggle("on", i === this.v);
        b.setAttribute("aria-pressed", i === this.v);
      });
    }

    /* ---------- 值变更 → 冲击事件 ---------- */
    setValue(v, { drag = false } = {}) {
      v = clamp(v, 0, this.n - 1);
      if (v === this.v) return;
      const prev = this.v,
        S = this.S,
        up = v > prev,
        kPrev = prev / (this.n - 1);
      this.v = v;
      this.k = v / (this.n - 1);
      this.renderText();
      if (G.rm()) {
        S.x = S.tx = this.xs[v];
        S.vx = 0;
        this.clearFx();
        this.variantReset && this.variantReset();
        this.draw();
        return;
      }
      const L = ladder(this.k, up, kPrev);
      S.cur = L;
      this.fire(L, v, up);
      if (!this.dragging || !this.follow) S.tx = this.xs[v];
      this.kick();
    }
    clearFx() {
      const S = this.S;
      S.parts = [];
      S.streaks = [];
      S.rings = [];
      S.arrivals = [];
      S.flash = null;
      S.glow = S.surge = 0;
      S.tail = 0;
      S.blink = -1;
    }
    fire(L, v, up) {
      const S = this.S,
        R = this._R || (this._R = rng(7 + this.n));
      S.glow = 1;
      S.surge = L.e;
      S.arrivals.push({
        tgt: this.xs[v],
        dir: up ? 1 : -1,
        L,
        v,
        k: v / (this.n - 1),
        done: false,
      });
      for (let i = 0; i < L.streaks; i++)
        S.streaks.push({
          y: (i % 2 ? 1 : -1) * (3 + R() * 6.5),
          len: 16 + R() * (22 + 30 * L.e),
          lag: 4 + R() * 12,
          born: S.t + R() * 0.03,
          life: 0.15 + 0.1 * L.e,
          dir: 1,
        });
      this.variantFire && this.variantFire(L, up);
    }
    arrive(a) {
      const S = this.S,
        L = a.L,
        R = this._R,
        x = S.x,
        cy = this.cy;
      for (let i = 0; i < L.burst; i++) {
        const ang = R() * Math.PI * 2,
          sp = (28 + R() * 96) * (0.45 + L.e);
        S.parts.push({
          x,
          y: cy + (R() - 0.5) * 3,
          vx: Math.cos(ang) * sp * (L.up ? 1.15 : 0.6),
          vy: Math.sin(ang) * sp * 0.62,
          life: (0.14 + R() * 0.14 + 0.07 * L.e) * (L.up ? 1 : 0.8),
          age: 0,
          r: 0.45 + R() * (0.55 + 0.4 * L.e),
          a: L.up ? 1 : 0.55,
        });
      }
      if (S.parts.length > 90) S.parts.splice(0, S.parts.length - 90);
      if (L.up && L.ring > 0.04) {
        S.rings.push({
          x,
          t0: S.t,
          r1: 8 + 14 * L.ring,
          a: 0.16 + 0.5 * L.ring,
          life: 0.26 + 0.1 * L.ring,
          w: 1.1 + 0.8 * L.ring,
        });
        if (L.ring > 0.95) {
          S.rings.push({ x, t0: S.t + 0.07, r1: 14, a: 0.3, life: 0.24, w: 0.9 });
          S.flash = {
            t0: S.t,
            life: 0.34,
            x,
            pts: Array.from({ length: 9 }, () => ({ u: R(), d: R() * 0.12, y: (R() - 0.5) * 7 })),
          };
          S.blink = 0;
        }
      }
      this.variantArrive && this.variantArrive(a);
    }

    /* ---------- 物理 + 特效推进 ---------- */
    step(dt) {
      const S = this.S,
        cur = S.cur,
        R = this._R || (this._R = rng(7 + this.n));
      const n = Math.max(1, Math.ceil(dt / (1 / 240))),
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
      // 到达判定：穿过/抵达目标档位
      S.arrivals.forEach((a) => {
        if (!a.done && ((S.x - a.tgt) * a.dir >= -1.6 || Math.abs(S.x - a.tgt) < 1.2)) {
          a.done = true;
          this.arrive(a);
        }
      });
      S.arrivals = S.arrivals.filter((a) => !a.done && S.t - (a.t0 || (a.t0 = S.t)) < 0.6);
      if (Math.abs(S.tx - S.x) < 0.5 && Math.abs(S.vx) < 8) S.arrivals = []; // 星已停稳：未触发的「到站」事件作废
      // 沿途星尘
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
      S.parts.forEach((p) => {
        p.age += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const d = Math.exp(-dt * 4.2);
        p.vx *= d;
        p.vy *= d;
      });
      S.parts = S.parts.filter((p) => p.age < p.life * 0.78);
      S.rings = S.rings.filter((r) => S.t - r.t0 < r.life);
      S.streaks = S.streaks.filter((s) => S.t - s.born < s.life);
      if (S.flash && S.t - S.flash.t0 > S.flash.life) S.flash = null;
      if (S.blink >= 0) {
        S.blink += dt;
        if (S.blink > 0.46) S.blink = -1;
      }
      this.variantStep && this.variantStep(dt);
    }
    active() {
      const S = this.S;
      return (
        Math.abs(S.tx - S.x) > 0.25 ||
        Math.abs(S.vx) > 8 ||
        S.parts.length ||
        S.streaks.length ||
        S.rings.length ||
        S.flash ||
        S.glow ||
        S.surge ||
        S.tail ||
        S.blink >= 0 ||
        S.arrivals.length ||
        (this.variantActive && this.variantActive())
      );
    }
    kick() {
      if (G.rm()) {
        const S = this.S;
        S.x = S.tx;
        S.vx = 0;
        this.clearFx();
        this.variantReset && this.variantReset();
        this.draw();
        return;
      }
      if (this.running) return;
      this.running = true;
      this.last = G.now();
      this.perf.runs++;
      G.raf(this.frame);
    }
    frame = (ts) => {
      const t0 = performance.now();
      const dt = Math.min(0.05, Math.max(0, (ts - this.last) / 1000)) * G.scale;
      this.last = ts;
      this.step(dt);
      if (this.active()) {
        this.draw();
        this.afterFrame(t0);
        G.raf(this.frame);
      } else {
        const S = this.S;
        S.x = S.tx;
        S.vx = 0;
        this.running = false;
        this.variantReset && this.variantReset();
        this.draw();
        this.afterFrame(t0);
      }
    };
    afterFrame(t0) {
      const d = performance.now() - t0;
      this.perf.frames++;
      this.perf.ms += d;
      if (d > this.perf.maxMs) this.perf.maxMs = d;
    }
    simulate(ms) {
      const h = 1 / 120;
      let rem = ms / 1000;
      while (rem > 1e-9) {
        const d = Math.min(h, rem);
        rem -= d;
        this.step(d);
      }
      this.draw();
    } // 不经时钟，直接推进（联系表用）
    settle() {
      this.simulate(1600);
      const S = this.S;
      S.x = S.tx;
      S.vx = 0;
      this.clearFx();
      this.variantReset && this.variantReset();
      this.draw();
    }
    jump(v) {
      v = clamp(v, 0, this.n - 1);
      this.v = v;
      this.k = v / (this.n - 1);
      this.S.tx = this.S.x = this.xs[v];
      this.S.vx = 0;
      this.S.cur = ladder(this.k, true, 0);
      this.clearFx();
      this.makeVariant();
      this.renderText();
      this.draw();
    }
    sig() {
      const S = this.S;
      return JSON.stringify({
        v: this.v,
        x: +S.x.toFixed(2),
        tx: +S.tx.toFixed(2),
        run: !!this.running,
      });
    }

    /* ---------- 绘制 ---------- */
    rgba(c, a) {
      return `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
    }
    draw() {
      const c = this.ctx,
        th = this.th,
        S = this.S,
        k = this.k;
      if (!th) return;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.clearRect(0, 0, this.CW, this.CH);
      c.globalCompositeOperation = "source-over";
      this.drawBand(c, th, S, k);
      this.drawStops(c, th, S, k);
      this.drawFx(c, th, S, k);
      this.drawStar(c, th, S, k);
    }
    add(c) {
      c.globalCompositeOperation = this.th.dark ? "lighter" : "source-over";
    }
    drawStops(c, th, S, k) {
      const cy = this.cy;
      this.xs.forEach((x, i) => {
        const lit = x <= S.x + 1,
          hv = i === this.hover && i !== this.v;
        if (Math.abs(x - S.x) < 4) return;
        c.fillStyle = lit
          ? this.rgba(th.dark ? th.glow : th.ac, 0.85)
          : this.rgba(th.spk, hv ? 0.75 : 0.38);
        c.beginPath();
        c.arc(x, cy, hv ? 1.9 : 1.15, 0, 7);
        c.fill();
      });
      if (this.hover >= 0 && this.hover !== this.v) {
        c.strokeStyle = this.rgba(th.ac, 0.5);
        c.lineWidth = 1;
        c.beginPath();
        c.arc(this.xs[this.hover], cy, 6.5, 0, 7);
        c.stroke();
      }
    }
    drawFx(c, th, S, k) {
      const cy = this.cy,
        cur = S.cur,
        dark = th.dark;
      // —— 彗尾 ——
      if (S.tail > 0.5) {
        const dir = S.tailDir,
          L = S.tail,
          e = cur.e * (cur.up ? 1 : 0.6),
          hx = S.x,
          hw = (1.0 + 2.3 * e) * (cur.up ? 1 : 0.6),
          a0 = (0.3 + 0.58 * e) * (cur.up ? 1 : 0.5) * (dark ? 1 : 0.7);
        this.add(c);
        const g = c.createLinearGradient(hx, 0, hx - dir * L, 0);
        g.addColorStop(0, this.rgba(th.glow, a0));
        g.addColorStop(0.35, this.rgba(th.glow, a0 * 0.42));
        g.addColorStop(1, this.rgba(th.glow, 0));
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(hx, cy - hw * 2.1);
        c.quadraticCurveTo(hx - dir * L * 0.5, cy - hw * 0.9, hx - dir * L, cy);
        c.quadraticCurveTo(hx - dir * L * 0.5, cy + hw * 0.9, hx, cy + hw * 2.1);
        c.closePath();
        c.fill();
        const g2 = c.createLinearGradient(hx, 0, hx - dir * L * 0.72, 0);
        g2.addColorStop(0, this.rgba(th.core, a0 * 1.1));
        g2.addColorStop(1, this.rgba(th.core, 0));
        c.fillStyle = g2;
        c.beginPath();
        c.moveTo(hx, cy - hw * 0.75);
        c.lineTo(hx - dir * L * 0.72, cy);
        c.lineTo(hx, cy + hw * 0.75);
        c.closePath();
        c.fill();
      }
      // —— 嗖：速度线 ——
      if (S.streaks.length) {
        this.add(c);
        c.lineCap = "round";
        S.streaks.forEach((s) => {
          const p = (S.t - s.born) / s.life;
          if (p < 0) return;
          const al = (1 - p) * (1 - p) * (0.25 + 0.5 * cur.e),
            dir = S.tailDir || 1,
            hx = S.x - dir * s.lag;
          const g = c.createLinearGradient(hx, 0, hx - dir * s.len, 0);
          g.addColorStop(0, this.rgba(th.core, al));
          g.addColorStop(1, this.rgba(th.glow, 0));
          c.strokeStyle = g;
          c.lineWidth = 0.8;
          c.beginPath();
          c.moveTo(hx, cy + s.y);
          c.lineTo(hx - dir * s.len * (0.55 + 0.45 * Math.min(1, p * 3)), cy + s.y);
          c.stroke();
        });
      }
      // —— 星尘粒子 ——
      if (S.parts.length) {
        this.add(c);
        S.parts.forEach((p) => {
          const q = 1 - p.age / p.life;
          c.fillStyle = this.rgba(dark ? th.core : th.glow, p.a * q * q * (dark ? 0.85 : 1));
          c.beginPath();
          c.arc(p.x, p.y, p.r * (0.6 + 0.4 * q), 0, 7);
          c.fill();
        });
      }
      // —— 冲击波环 / 光芒 ——
      S.rings.forEach((r) => {
        const p = (S.t - r.t0) / r.life;
        if (p < 0 || p > 1) return;
        const e = 1 - Math.pow(1 - p, 3);
        this.add(c);
        c.strokeStyle = this.rgba(
          th.dark ? th.glow : th.ac,
          r.a * (1 - p) * (1 - p) * (th.dark ? 1.1 : 0.9),
        );
        c.lineWidth = r.w * (1 - p * 0.7);
        c.beginPath();
        c.arc(S.x, cy, 4 + (r.r1 - 4) * e, 0, 7);
        c.stroke();
      });
      if (S.flash) {
        const f = S.flash,
          p = (S.t - f.t0) / f.life,
          bell = Math.sin(Math.PI * Math.min(1, p));
        this.add(c);
        // 星芒（十字）
        const len = 10 + 12 * bell;
        c.strokeStyle = this.rgba(th.hi, 0.85 * bell);
        c.lineWidth = 1;
        c.lineCap = "round";
        c.beginPath();
        c.moveTo(S.x - len, cy);
        c.lineTo(S.x + len, cy);
        c.moveTo(S.x, cy - len * 0.8);
        c.lineTo(S.x, cy + len * 0.8);
        c.stroke();
        if (this.variant !== "B")
          f.pts.slice(0, 5).forEach((q) => {
            const pp = clamp((p - q.d) / 0.6, 0, 1),
              b = Math.sin(Math.PI * pp);
            if (b <= 0) return;
            const px = lerp(this.x0, this.x1, q.u),
              l = 1.5 + 2 * b;
            c.strokeStyle = this.rgba(th.hi, 0.7 * b);
            c.lineWidth = 0.8;
            c.beginPath();
            c.moveTo(px - l, cy + q.y * 0.35);
            c.lineTo(px + l, cy + q.y * 0.35);
            c.moveTo(px, cy + q.y * 0.35 - l);
            c.lineTo(px, cy + q.y * 0.35 + l);
            c.stroke();
          });
      }
    }
    drawStar(c, th, S, k) {
      const cy = this.cy,
        cur = S.cur,
        glow = S.glow,
        sz = (11 + 5 * k) * (1 + 0.12 * glow * cur.e);
      this.add(c);
      const hr = 7 + 7 * k + (6 + 16 * cur.e) * glow,
        ha = 0.16 + 0.26 * k + 0.5 * glow * cur.e * (cur.up ? 1 : 0.4);
      const hg = c.createRadialGradient(S.x, cy, 0, S.x, cy, hr);
      hg.addColorStop(0, this.rgba(th.glow, th.dark ? ha : ha * 0.5));
      hg.addColorStop(1, this.rgba(th.glow, 0));
      c.fillStyle = hg;
      c.beginPath();
      c.arc(S.x, cy, hr, 0, 7);
      c.fill();
      c.globalCompositeOperation = "source-over";
      c.save();
      c.translate(S.x, cy);
      const s = sz / 504;
      c.scale(s, s);
      c.translate(-512, -505);
      const g = c.createLinearGradient(330, 265, 700, 745);
      g.addColorStop(0, th.sa);
      g.addColorStop(0.55, th.sb);
      g.addColorStop(1, th.sc);
      c.fillStyle = g;
      c.fill(STAR);
      if (th.edge !== "none") {
        c.lineWidth = 0.9 / s;
        c.strokeStyle = th.edge;
        c.stroke(STAR);
      }
      if (this.v === this.n - 1 && this.n > 1) {
        // 极限：吉祥物的两只小竖眼（到达时眨一下）
        let sy = 1;
        if (S.blink >= 0) {
          const b = S.blink / 0.46;
          sy = 1 - 0.88 * Math.sin(Math.PI * clamp((b - 0.28) / 0.44, 0, 1));
        }
        c.fillStyle = th.eye;
        [-44, 44].forEach((dx) => {
          const hh = 74 * sy;
          c.beginPath();
          c.roundRect(512 + dx - 17, 505 + 3 - hh / 2 - 8, 34, hh, 17);
          c.fill();
        });
      }
      c.restore();
    }

    /* ---------- 指针 / 键盘 ---------- */
    idxAt(cx) {
      return clamp(
        Math.round(((cx - this.x0) / (this.x1 - this.x0)) * (this.n - 1)),
        0,
        this.n - 1,
      );
    }
    bindPointer() {
      const st = this.stage;
      let startX = 0;
      const cxOf = (e) => e.clientX - st.getBoundingClientRect().left + this.PX;
      const move = (e) => {
        const cx = cxOf(e);
        if (!this.follow && Math.abs(cx - startX) > 4) this.follow = true;
        if (this.follow) {
          this.S.tx = clamp(cx, this.x0, this.x1);
          this.kick();
        }
        const i = this.idxAt(cx);
        this.setValue(i, { drag: true });
        if (!this.follow) this.S.tx = this.xs[this.v];
      };
      st.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        st.setPointerCapture(e.pointerId);
        this.dragging = true;
        this.follow = false;
        startX = cxOf(e);
        st.classList.add("drag");
        this.setHover(-1);
        move(e);
      });
      st.addEventListener("pointermove", (e) => {
        if (this.dragging) move(e);
        else this.setHover(this.idxAt(cxOf(e)));
      });
      const up = () => {
        if (!this.dragging) return;
        this.dragging = false;
        this.follow = false;
        st.classList.remove("drag");
        this.S.tx = this.xs[this.v];
        this.kick();
      };
      st.addEventListener("pointerup", up);
      st.addEventListener("pointercancel", up);
      st.addEventListener("pointerleave", () => {
        if (!this.dragging) this.setHover(-1);
      });
    }
    setHover(i) {
      if (this.hover === i) return;
      this.hover = i;
      if (!this.running) this.draw();
    }
    bindKeys() {
      this.stage.addEventListener("keydown", (e) => {
        const k = e.key;
        let nv = null;
        if (k === "ArrowRight" || k === "ArrowUp") nv = this.v + 1;
        else if (k === "ArrowLeft" || k === "ArrowDown") nv = this.v - 1;
        else if (k === "Home") nv = 0;
        else if (k === "End") nv = this.n - 1;
        if (nv == null) return;
        e.preventDefault();
        this.setValue(nv, { user: true });
      });
    }

    /* =====================================================================
     变体：只负责「银河带」本体与它对冲击的反应
     ===================================================================== */
    makeVariant() {
      const R = rng(23 + this.n * 3),
        W = this.x1 - this.x0,
        cy = this.cy;
      this.speck = [];
      this.dust = [];
      this.bg = [];
      if (this.variant === "A" || this.variant === "C") {
        for (let i = 0; i < Math.round(W * 0.22); i++) {
          const u = R(),
            g = (R() + R() + R() - 1.5) * 2.2;
          this.speck.push({
            x: this.x0 - 6 + u * (W + 12),
            y: cy + g * 3.0,
            r: 0.35 + R() * 0.5,
            a: 0.14 + R() * 0.34,
            ph: R() * 6.28,
          });
        }
      }
      if (this.variant === "B") {
        const N = Math.round(W * 0.62);
        for (let i = 0; i < N; i++) {
          const u = R(),
            g = (R() + R() + R() - 1.5) * 2.0;
          this.dust.push({
            bx: this.x0 - 4 + u * (W + 8),
            by: g * 3.1,
            r: 0.38 + R() * 0.62,
            a: 0.16 + R() * 0.4,
            dy: 0,
            vy: 0,
            ig: 0,
            sg: R() < 0.5 ? -1 : 1,
            tw: R(),
          });
        }
        this.dust.sort((a, b) => a.bx - b.bx);
        this.variantReset();
        this.dust.forEach((d) => {
          d.dy = d.tdy;
          d.vy = 0;
          d.ig = 0;
        });
      }
      if (this.variant === "C") {
        const lay = [
          { n: Math.round(W * 0.06), f: 0.05, r: 0.5, a: 0.32, w: 12 },
          { n: Math.round(W * 0.045), f: 0.12, r: 0.7, a: 0.42, w: 14 },
          { n: Math.round(W * 0.03), f: 0.24, r: 0.95, a: 0.55, w: 17 },
        ];
        this.bg = lay.map((l, li) => {
          const arr = [];
          const span = W + 60;
          for (let i = 0; i < l.n; i++)
            arr.push({
              u: ((i + R() * 0.9) / l.n) * span,
              y: cy - H2(this) + R() * (H2(this) * 2),
              r: l.r * (0.8 + R() * 0.5),
              a: l.a * (0.6 + R() * 0.6),
            });
          return { ...l, arr, span, off: 0, voff: 0 };
        });
        function H2(s) {
          return s.H / 2 + 1;
        }
        this.variantReset();
      }
    }
    variantReset() {
      const S = this.S,
        v = this;
      if (this.variant === "B") {
        this.dust.forEach((d) => {
          d.tdy = this.dustRest(d, S.tx);
        });
        if (!this.running)
          this.dust.forEach((d) => {
            d.dy = d.tdy;
            d.vy = 0;
            d.ig = 0;
          });
      }
      if (this.variant === "C") {
        this.bg.forEach((l) => {
          l.target = -(S.tx - this.x0) * l.f;
          if (!this.running) {
            l.off = l.target;
            l.voff = 0;
          }
        });
      }
    }
    dustRest(d, sx) {
      const dx = d.bx - sx,
        w = Math.exp(-(dx * dx) / (2 * 8 * 8));
      return d.sg * 3.6 * w * 1;
    }
    variantFire(L, up) {
      if (this.variant === "B") {
        const S = this.S;
        this.dust.forEach((d) => {
          d.tdy = this.dustRest(d, this.xs[this.v]);
        });
      }
      if (this.variant === "C") {
        this.bg.forEach((l) => {
          l.target = -(this.xs[this.v] - this.x0) * l.f;
        });
      }
    }
    variantArrive(a) {
      const L = a.L,
        S = this.S;
      if (this.variant === "C" && L.up)
        this.bg.forEach((l, i) => {
          l.voff -= (60 + 260 * L.e) * (i + 1) * 0.35;
        }); // 到站一记「顿挫」
      if (this.variant === "B" && L.ring >= 0.95)
        this.dust.forEach((d) => {
          if (d.tw < 0.3) d.ig = Math.max(d.ig, 0.3 + 0.35 * d.tw * 3);
        }); // 星带整体闪烁
    }
    variantStep(dt) {
      const S = this.S,
        cur = S.cur;
      if (this.variant === "B") {
        const R2 = cur.up ? 12 + 22 * cur.e : 12,
          pw = cur.up ? 14 + 70 * cur.e : 6,
          decayIg = 1 / (0.05 + 0.06 * cur.e);
        this.dust.forEach((d) => {
          const dx = d.bx - S.x,
            adx = Math.abs(dx);
          if (adx < R2 * 2.4 && Math.abs(S.vx) > 20) {
            const w = Math.exp(-(dx * dx) / (R2 * R2)),
              spd = Math.min(1, Math.abs(S.vx) / 520);
            d.ig = Math.max(d.ig, w * (cur.up ? 0.45 + 0.55 * cur.e : 0.3) * (0.25 + 0.75 * spd));
            d.vy +=
              d.sg * pw * w * spd * dt * 60 * (1 + (d.tw - 0.5) * 0.6) * (this.dragging ? 0.6 : 1);
          }
          d.tdy = this.dustRest(d, S.tx === undefined ? S.x : S.x);
          const kk = 240,
            cc = 22;
          d.vy += (kk * (d.tdy - d.dy) - cc * d.vy) * dt;
          d.dy += d.vy * dt;
          d.ig *= Math.exp(-dt * decayIg);
          if (d.ig < 0.06) d.ig = 0;
        });
      }
      if (this.variant === "C") {
        this.bg.forEach((l, i) => {
          l.target = -(S.x - this.x0) * l.f;
          const w = 14 + i * 4.5,
            z = 0.85;
          const a = w * w * (l.target - l.off) - 2 * z * w * l.voff;
          l.voff += a * dt;
          l.off += l.voff * dt;
        });
      }
    }
    variantActive() {
      if (this.variant === "B")
        return this.dust.some(
          (d) => d.ig > 0 || Math.abs(d.vy) > 1.5 || Math.abs(d.dy - d.tdy) > 0.2,
        );
      if (this.variant === "C")
        return this.bg.some((l) => Math.abs(l.voff) > 3 || Math.abs(l.target - l.off) > 0.5);
      return false;
    }
    drawBand(c, th, S, k) {
      const { x0, x1, cy } = this,
        dark = th.dark,
        V = this.variant;
      const surge = 1 + 1.1 * S.surge,
        fl = S.flash ? Math.sin(Math.PI * clamp((S.t - S.flash.t0) / S.flash.life, 0, 1)) : 0;
      const bandA = th.dark ? 1 : 1.25;
      // —— 银河带基底（A/C：柔和光带；B：只留极淡雾气） ——
      const hz = V === "B" ? 0.5 : 1;
      const rr = (x, y, w, h, a) => {
        c.fillStyle = this.rgba(th.band, a);
        c.beginPath();
        c.roundRect(x, y, w, h, h / 2);
        c.fill();
      };
      const hg = c.createLinearGradient(x0 - 10, 0, x1 + 10, 0);
      hg.addColorStop(0, this.rgba(th.band, 0));
      hg.addColorStop(0.12, this.rgba(th.band, 1));
      hg.addColorStop(0.88, this.rgba(th.band, 1));
      hg.addColorStop(1, this.rgba(th.band, 0));
      // 带宽随档位略增：低 6px → 高 9px
      const bh = 6 + 3 * k + 3 * fl;
      c.save();
      c.globalAlpha = (V === "B" ? 0.05 : 0.065) * bandA * (1 + fl * (dark ? 2 : 0.6));
      c.fillStyle = hg;
      c.beginPath();
      c.roundRect(x0 - 10, cy - bh, x1 - x0 + 20, bh * 2, bh);
      c.fill();
      c.restore();
      c.save();
      c.globalAlpha = (V === "B" ? 0.06 : 0.11) * bandA * hz * (1 + fl * (dark ? 2 : 0.5));
      c.fillStyle = hg;
      c.beginPath();
      c.roundRect(x0 - 4, cy - bh * 0.45, x1 - x0 + 8, bh * 0.9, bh * 0.45);
      c.fill();
      c.restore();
      if (V !== "B") {
        c.save();
        c.globalAlpha = 0.26 * bandA * (1 + fl * (dark ? 1 : 0.4));
        c.fillStyle = hg;
        c.fillRect(x0 - 10, cy - 0.6, x1 - x0 + 20, 1.2);
        c.restore();
      }
      // —— C：背景视差星 ——
      if (V === "C") {
        this.add(c);
        this.bg.forEach((l, li) => {
          const sp = Math.abs(S.vx),
            stretch = Math.min(13, sp * (li + 1) * 0.0055 * (0.6 + S.cur.e)) * (S.cur.up ? 1 : 0.4);
          l.arr.forEach((s) => {
            let px = this.x0 - 30 + ((((s.u + l.off) % l.span) + l.span) % l.span);
            if (px < x0 - 4 || px > x1 + 4) return;
            const edge = clamp(Math.min(px - (x0 - 4), x1 + 4 - px) / 18, 0, 1),
              al = s.a * edge * (dark ? 0.85 : 0.7);
            c.fillStyle = this.rgba(th.spk, al);
            c.strokeStyle = c.fillStyle;
            if (stretch > 1.2) {
              c.lineWidth = s.r * 1.4;
              c.lineCap = "round";
              c.beginPath();
              c.moveTo(px, s.y);
              c.lineTo(px - Math.sign(S.vx || 1) * stretch, s.y);
              c.stroke();
            } else {
              c.beginPath();
              c.arc(px, s.y, s.r, 0, 7);
              c.fill();
            }
          });
        });
        c.globalCompositeOperation = "source-over";
      }
      // —— A/C：带内细星屑（缓慢静态） ——
      if (V !== "B") {
        this.speck.forEach((p) => {
          c.fillStyle = this.rgba(th.spk, p.a * (dark ? 1 : 0.8) * (1 + fl * (dark ? 1.5 : 0.5)));
          c.beginPath();
          c.arc(p.x, p.y, p.r, 0, 7);
          c.fill();
        });
      }
      // —— B：星尘带 ——
      if (V === "B") this.drawDust(c, th, S, k, fl);
      // —— 已走过的「点亮」段 ——
      const xl = Math.max(x0, S.x);
      if (xl > x0 + 0.5) {
        const la = (0.13 + 0.36 * k) * surge * (dark ? 1 : 0.9),
          tw = 1.2 + 1.3 * k;
        const lc = dark ? th.glow : th.ac;
        const g = c.createLinearGradient(x0, 0, xl, 0);
        g.addColorStop(0, this.rgba(lc, 0));
        g.addColorStop(0.25, this.rgba(lc, la * 0.55));
        g.addColorStop(1, this.rgba(lc, la));
        if (V === "B") {
          c.save();
          c.globalAlpha = 0.5;
        }
        this.add(c);
        c.fillStyle = g;
        c.beginPath();
        c.roundRect(x0, cy - tw / 2, xl - x0, tw, tw / 2);
        c.fill();
        c.globalAlpha = 1;
        if (V === "B") c.restore();
        c.globalCompositeOperation = "source-over";
        if (V !== "B") {
          c.save();
          c.globalAlpha = 0.32;
          c.fillStyle = g;
          c.beginPath();
          c.roundRect(x0, cy - tw * 1.6, xl - x0, tw * 3.2, tw * 1.6);
          c.fill();
          c.restore();
          c.globalAlpha = 1;
        }
      }
    }
    drawDust(c, th, S, k, fl) {
      const dark = th.dark,
        cy = this.cy,
        lc = dark ? th.glow : th.ac,
        xl = S.x;
      this.add(c);
      this.dust.forEach((d) => {
        const y = cy + d.by + d.dy,
          lit = d.bx <= xl + 2;
        let a = d.a * (dark ? 1 : 0.85),
          col = th.spk;
        if (lit) {
          col = lc;
          a = Math.min(1, d.a * (0.55 + 1.1 * k) + 0.12 + 0.16 * k);
        }
        a = a * (1 + 1.0 * S.surge * (lit ? 1 : 0.3)) + d.ig * 0.7 * (0.5 + 0.5 * k);
        const r = d.r * (1 + d.ig * 0.45);
        if (d.ig > 0.05) {
          c.fillStyle = this.rgba(
            d.ig > 0.55 ? th.hi : th.glow,
            Math.min(1, d.ig * (dark ? 0.8 : 0.7)),
          );
          c.beginPath();
          c.arc(d.bx, y, r + 0.25 * d.ig, 0, 7);
          c.fill();
        }
        c.fillStyle = this.rgba(col, a);
        c.beginPath();
        c.arc(d.bx, y, r, 0, 7);
        c.fill();
      });
      c.globalCompositeOperation = "source-over";
    }
  }

  window.GX = GX;
  window.GXG = G;
  window.GX_LABELS = LABELS;
  window.gxLadder = ladder;
})();
