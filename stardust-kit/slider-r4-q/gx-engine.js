/*! 星尘 · 银河带 · 推理强度滑块运行时 (设计稿 r4)  MIT License · Copyright (c) 2026 Stardust contributors
 *
 * r4：轨道改成「有高度、不通栏」的银河带（P 28px / Q 32px / R 36px，宽度 58–70%）。F = r3 的 18px 通栏，仅用于并排对比。
 *   带的材质（玻璃 / 夜色内壁）、雾气、三层漂移星场 = 纯 CSS（transform，合成器线程，可暂停；静止时也只是慢慢飘）。
 *   点亮段 / 彗尾 / 粒子 / 冲击环 / 星星 = 一个 <canvas>，且画布 = 轨道舞台本身：所有特效都被舞台矩形裁掉，
 *   不会溢出到标题文字、档位标签或弹窗其它区域（修复 r3「极限光晕压住标签」）。
 * 空闲时不跑任何 JS 循环：rAF 只在「档位变化」之后 ~0.4–0.6s 内运行，收尾即停。减少动态：星场静止、瞬时到位。
 */
(() => {
  "use strict";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const LABELS = { 5: ["低", "中", "高", "超高", "极限"] };
  const STAR = new Path2D(
    "M475.4 324.7 Q512.0 265.0 548.6 324.7 L581.3 378.0 Q600.2 408.6 635.2 417.1 L696.0 431.7 Q764.0 448.1 718.6 501.4 L678.0 549.0 Q654.7 576.4 657.5 612.2 L662.3 674.6 Q667.8 744.4 603.1 717.6 L545.3 693.8 Q512.0 680.0 478.7 693.8 L420.9 717.6 Q356.2 744.4 361.7 674.6 L366.5 612.2 Q369.3 576.4 346.0 549.0 L305.4 501.4 Q260.0 448.1 328.0 431.7 L388.8 417.1 Q423.8 408.6 442.7 378.0 Z",
  );
  const CFG = {
    P: { bh: 28, tw: 0.6 },
    Q: { bh: 32, tw: 0.58 },
    R: { bh: 36, tw: 0.7 },
    F: { bh: 18, tw: 1 },
  };

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
      G.syncCss();
    },
    /* 手动时钟下把 CSS 星场 / 雾气动画钉在虚拟时间上，视频逐帧可复现 */
    syncCss() {
      if (!G.manual) return;
      document.getAnimations().forEach((a) => {
        if (a.animationName === undefined) return;
        if (a.playState === "running") a.pause();
        a.currentTime = G.vt;
      });
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

  /* ---------- 冲击阶梯（同 r3）：目标档位越高，一切越猛（升档）；降档统一轻柔 ---------- */
  function ladder(k, up, kFrom) {
    if (up) {
      const e = 0.28 + 0.72 * k;
      return {
        up,
        e,
        omega: 14 + 16 * e,
        zeta: 1 - 0.3 * e,
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
    const e = 0.18 + 0.2 * kFrom;
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
    constructor(host, { layout = "P", n = 5, v = 1, bh, tw, align = "center" } = {}) {
      const c = CFG[layout];
      this.lay = layout;
      this.bh = bh || c.bh;
      this.tw = tw || c.tw;
      this.align = align;
      this.host = host;
      this.n = n;
      this.v = clamp(v, 0, n - 1);
      this.hover = -1;
      this.dragging = false;
      this.follow = false;
      this.perf = { frames: 0, ms: 0, runs: 0, maxMs: 0 };
      this.PX = 0;
      this.PY = 0;
      this.H = this.bh + 12;
      this.PADE = this.bh * 0.6 + 3;
      this.build();
      G.all.add(this);
    }
    /* ---------- DOM ---------- */
    build() {
      const h = this.host,
        L = this.lay;
      h.classList.add("gx");
      h.dataset.l = L;
      h.dataset.align = this.align;
      const title = `<span class="gx-t"><svg class="gx-ico" aria-hidden="true"><use href="#sd-star"/></svg>推理强度</span>`;
      const stage = `<div class="gx-stage" role="slider" tabindex="0" aria-label="推理强度" style="height:${this.H}px;--bh:${this.bh}px;--tw:${this.tw * 100}%;border-radius:${this.H / 2}px">
          <div class="gx-ch"><i class="gx-haze hz1"></i><i class="gx-haze hz2"></i><i class="gx-sf sf1"></i><i class="gx-sf sf2"></i><i class="gx-sf sf3"></i></div><canvas aria-hidden="true"></canvas></div>`;
      let html;
      if (L === "P")
        html = `<div class="gx-h">${title}<i class="gx-sep">·</i><b class="gx-v"></b></div><div class="gx-row" style="height:${this.H}px">${stage}</div>`;
      else if (L === "Q")
        html = `<div class="gx-row" style="height:${this.H}px">${title}${stage}<b class="gx-v"></b></div>`;
      else if (L === "R")
        html = `<div class="gx-h">${title}<b class="gx-v"></b></div><div class="gx-row" style="height:${this.H}px">${stage}</div><div class="gx-lab"></div>`;
      else
        html = `<div class="gx-h">${title}<b class="gx-v"></b></div><div class="gx-row" style="height:${this.H}px"><span class="gx-end gx-el">低</span>${stage}<span class="gx-end gx-er">极限</span></div>`;
      h.innerHTML = html;
      this.stage = h.querySelector(".gx-stage");
      this.cv = h.querySelector("canvas");
      this.ctx = this.cv.getContext("2d");
      this.valEl = h.querySelector(".gx-v");
      this.labRow = h.querySelector(".gx-lab");
      this.bindPointer();
      this.bindKeys();
      this.ro = new ResizeObserver(() => {
        const w = Math.round(this.stage.clientWidth);
        if (w && w !== this.W) this.layout();
      });
      this.ro.observe(this.stage);
      this.layout(true);
    }
    layout() {
      const { PX, PY, H, PADE, n } = this;
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
      this.xs = [...Array(n).keys()].map((i) => this.x0 + (i * (this.x1 - this.x0)) / (n - 1));
      const lab = LABELS[n];
      if (this.labRow) {
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
      } else this.btns = [];
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
      };
      this.makeSpecks();
      this.refreshTheme();
      this.renderText();
      this.draw();
    }
    refreshTheme() {
      const cs = getComputedStyle(this.host),
        g = (n) => cs.getPropertyValue(n).trim(),
        rgb = (n) => g(n).split(",").map(Number);
      if (!g("--gx-ac")) return;
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
    setValue(v) {
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
          y: (i % 2 ? 1 : -1) * this.bh * (0.14 + R() * 0.26),
          len: 16 + R() * (22 + 30 * L.e),
          lag: 4 + R() * 12,
          born: S.t + R() * 0.03,
          life: 0.15 + 0.1 * L.e,
          dir: 1,
        });
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
        const rmax = this.H / 2 + 8 + 12 * L.ring;
        S.rings.push({
          x,
          t0: S.t,
          rx: rmax,
          a: 0.16 + 0.5 * L.ring,
          life: 0.26 + 0.1 * L.ring,
          w: 1.1 + 0.8 * L.ring,
        });
        if (L.ring > 0.95) {
          S.rings.push({ x, t0: S.t + 0.07, rx: this.H / 2 + 6, a: 0.3, life: 0.24, w: 0.9 });
          S.flash = { t0: S.t, life: 0.34, x };
          S.blink = 0;
        }
      }
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
      S.arrivals.forEach((a) => {
        if (!a.done && ((S.x - a.tgt) * a.dir >= -1.6 || Math.abs(S.x - a.tgt) < 1.2)) {
          a.done = true;
          this.arrive(a);
        }
      });
      S.arrivals = S.arrivals.filter((a) => !a.done && S.t - (a.t0 || (a.t0 = S.t)) < 0.6);
      if (Math.abs(S.tx - S.x) < 0.5 && Math.abs(S.vx) < 8) S.arrivals = [];
      if (cur.up && Math.abs(S.vx) > 50 && cur.dens > 0) {
        S.emit += Math.abs(S.vx) * dt * cur.dens;
        while (S.emit >= 1) {
          S.emit -= 1;
          const dir = S.tailDir;
          S.parts.push({
            x: S.x - dir * R() * 4,
            y: this.cy + (R() - 0.5) * (2 + 3 * cur.e) * this.sc,
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
      S.parts = S.parts.filter(
        (p) => p.age < p.life * 0.78 && Math.abs(p.y - this.cy) < this.bh / 2 + 4,
      );
      S.rings = S.rings.filter((r) => S.t - r.t0 < r.life);
      S.streaks = S.streaks.filter((s) => S.t - s.born < s.life);
      if (S.flash && S.t - S.flash.t0 > S.flash.life) S.flash = null;
      if (S.blink >= 0) {
        S.blink += dt;
        if (S.blink > 0.46) S.blink = -1;
      }
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
        S.arrivals.length
      );
    }
    kick() {
      if (G.rm()) {
        const S = this.S;
        S.x = S.tx;
        S.vx = 0;
        this.clearFx();
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
    }
    jump(v) {
      v = clamp(v, 0, this.n - 1);
      this.v = v;
      this.k = v / (this.n - 1);
      this.S.tx = this.S.x = this.xs[v];
      this.S.vx = 0;
      this.S.cur = ladder(this.k, true, 0);
      this.clearFx();
      this.renderText();
      this.draw();
    }

    /* 视觉尺度：18px→1，28px→1.3，36px→1.5（光晕 / 粒子随轨道高度温和放大，不线性爆炸） */
    get sc() {
      return Math.pow(this.bh / 18, 0.6);
    }
    rgba(c, a) {
      return `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
    }
    /* ---------- 绘制：画布 = 舞台，天然裁剪，不会溢出 ---------- */
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
      const cy = this.cy,
        R = this.bh / 2;
      this.xs.forEach((x, i) => {
        const lit = x <= S.x + 1,
          hv = i === this.hover && i !== this.v;
        if (Math.abs(x - S.x) < 4) return;
        // 档位刻度：带内上下缘各一小段，加中间一粒星点
        c.strokeStyle = this.rgba(
          lit ? (th.dark ? th.glow : th.ac) : th.spk,
          lit ? 0.55 : hv ? 0.7 : 0.32,
        );
        c.lineWidth = 1;
        c.lineCap = "round";
        if (this.lay !== "F") {
          const tl = Math.min(4, R * 0.32);
          c.beginPath();
          c.moveTo(x, cy - R + 2.5);
          c.lineTo(x, cy - R + 2.5 + tl);
          c.moveTo(x, cy + R - 2.5);
          c.lineTo(x, cy + R - 2.5 - tl);
          c.stroke();
        }
        c.fillStyle = lit
          ? this.rgba(th.dark ? th.glow : th.ac, 0.85)
          : this.rgba(th.spk, hv ? 0.75 : 0.42);
        c.beginPath();
        c.arc(x, cy, (hv ? 1.9 : 1.2) * Math.pow(this.sc, 0.3), 0, 7);
        c.fill();
      });
      if (this.hover >= 0 && this.hover !== this.v) {
        c.strokeStyle = this.rgba(th.ac, 0.5);
        c.lineWidth = 1;
        c.beginPath();
        c.arc(this.xs[this.hover], cy, Math.max(6.5, this.bh / 2 - 0.5), 0, 7);
        c.stroke();
      }
    }
    drawFx(c, th, S, k) {
      const cy = this.cy,
        cur = S.cur,
        dark = th.dark,
        hh = this.H / 2;
      if (S.tail > 0.5) {
        const dir = S.tailDir,
          L = S.tail,
          e = cur.e * (cur.up ? 1 : 0.6),
          hx = S.x,
          hw = Math.min(hh * 0.5, (1.0 + 2.3 * e) * (cur.up ? 1 : 0.6) * Math.sqrt(this.sc)),
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
      // 冲击波：沿带方向展开的扁椭圆（竖向被舞台高度封顶，不溢出）
      S.rings.forEach((r) => {
        const p = (S.t - r.t0) / r.life;
        if (p < 0 || p > 1) return;
        const e = 1 - Math.pow(1 - p, 3),
          rx = 4 + (r.rx - 4) * e,
          ry = Math.min(rx, hh - 1);
        this.add(c);
        c.strokeStyle = this.rgba(
          th.dark ? th.glow : th.ac,
          r.a * (1 - p) * (1 - p) * (th.dark ? 1.1 : 0.9),
        );
        c.lineWidth = r.w * (1 - p * 0.7);
        c.beginPath();
        c.ellipse(S.x, cy, rx, ry, 0, 0, 7);
        c.stroke();
      });
      if (S.flash) {
        const f = S.flash,
          p = (S.t - f.t0) / f.life,
          bell = Math.sin(Math.PI * Math.min(1, p));
        this.add(c);
        const len = (10 + 12 * bell) * Math.pow(this.sc, 0.6),
          lv = Math.min(len * 0.8, hh - 1);
        c.strokeStyle = this.rgba(th.hi, 0.85 * bell);
        c.lineWidth = 1;
        c.lineCap = "round";
        c.beginPath();
        c.moveTo(S.x - len, cy);
        c.lineTo(S.x + len, cy);
        c.moveTo(S.x, cy - lv);
        c.lineTo(S.x, cy + lv);
        c.stroke();
      }
    }
    drawStar(c, th, S, k) {
      const cy = this.cy,
        cur = S.cur,
        glow = S.glow,
        sz = this.bh * (0.8 + 0.4 * k) * (1 + 0.1 * glow * cur.e);
      this.add(c);
      const hr = Math.min(
          this.H / 2,
          (7 + 7 * k) * this.sc + (6 + 16 * cur.e) * glow * Math.sqrt(this.sc),
        ),
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
        this.setValue(i);
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
        this.setValue(nv);
      });
    }

    /* ---------- 带内部：中央银河带 + 点亮段（星屑由 CSS 三层漂移星场承担；F = r3 保留静态星屑） ---------- */
    makeSpecks() {
      this.speck = [];
      if (this.lay !== "F") return;
      const R = rng(23 + this.n * 3),
        W = this.x1 - this.x0,
        cy = this.cy;
      for (let i = 0; i < Math.round(W * 0.2 * this.sc * 0.85); i++) {
        const u = R(),
          g = (R() + R() + R() - 1.5) * 1.6;
        this.speck.push({
          x: this.x0 - 4 + u * (W + 8),
          y: cy + g * this.bh * 0.15,
          r: 0.35 + R() * 0.55,
          a: 0.16 + R() * 0.36,
        });
      }
    }
    chPath(c, inset = 0) {
      const R = this.bh / 2 - inset;
      c.beginPath();
      c.roundRect(this.PX + inset, this.cy - R, this.W - inset * 2, R * 2, R);
    }
    drawBand(c, th, S, k) {
      const { cy, bh } = this,
        dark = th.dark,
        cl = this.PX,
        W = this.W,
        R = bh / 2;
      const surge = 1 + 1.1 * S.surge,
        fl = S.flash ? Math.sin(Math.PI * clamp((S.t - S.flash.t0) / S.flash.life, 0, 1)) : 0;
      const lc = dark ? th.glow : th.ac,
        xl = Math.max(cl + R, S.x);
      c.save();
      this.chPath(c, 0.5);
      c.clip();
      const hg = c.createLinearGradient(cl, 0, cl + W, 0);
      [0, 0.1, 0.9, 1].forEach((o, i) =>
        hg.addColorStop(o, this.rgba(th.band, i === 1 || i === 2 ? 1 : 0)),
      );
      c.fillStyle = hg;
      c.globalAlpha = 0.1 * (dark ? 1 : 1.15) * (1 + fl * (dark ? 2 : 0.6));
      c.fillRect(cl, cy - bh * 0.3, W, bh * 0.6);
      c.globalAlpha = 0.26 * (dark ? 1 : 1.1) * (1 + fl * (dark ? 1 : 0.4));
      c.fillRect(cl, cy - 0.6, W, 1.2);
      c.globalAlpha = 1;
      this.speck.forEach((p) => {
        c.fillStyle = this.rgba(th.spk, p.a * (dark ? 1 : 0.8) * (1 + fl * (dark ? 1.5 : 0.5)));
        c.beginPath();
        c.arc(p.x, p.y, p.r, 0, 7);
        c.fill();
      });
      if (xl > cl + R + 0.5) {
        const la = (dark ? 0.1 + 0.3 * k : 0.05 + 0.17 * k) * surge;
        const g = c.createLinearGradient(cl, 0, xl, 0);
        g.addColorStop(0, this.rgba(lc, la * 0.15));
        g.addColorStop(0.6, this.rgba(lc, la * 0.75));
        g.addColorStop(1, this.rgba(lc, la));
        this.add(c);
        c.fillStyle = g;
        c.beginPath();
        c.roundRect(cl, cy - R * 0.7, xl - cl, R * 1.4, R * 0.7);
        c.fill();
        const tw = 1.1 + 1.3 * k,
          g2 = c.createLinearGradient(cl, 0, xl, 0);
        g2.addColorStop(0, this.rgba(lc, 0));
        g2.addColorStop(0.3, this.rgba(lc, la * 1.3));
        g2.addColorStop(1, this.rgba(lc, Math.min(1, la * 2)));
        c.fillStyle = g2;
        c.beginPath();
        c.roundRect(cl + R, cy - tw / 2, xl - cl - R, tw, tw / 2);
        c.fill();
        c.globalCompositeOperation = "source-over";
      }
      if (fl > 0) {
        this.add(c);
        c.fillStyle = this.rgba(th.hi, (dark ? 0.1 : 0.07) * fl);
        c.fillRect(cl, cy - R, W, bh);
        c.globalCompositeOperation = "source-over";
      }
      c.restore();
      if (fl > 0) {
        this.add(c);
        c.strokeStyle = this.rgba(dark ? th.glow : th.ac, 0.5 * fl);
        c.lineWidth = 1;
        this.chPath(c, 0.5);
        c.stroke();
        c.globalCompositeOperation = "source-over";
      }
    }
  }

  window.GX = GX;
  window.GXG = G;
  window.GX_LABELS = LABELS;
  window.GX_CFG = CFG;
  window.gxLadder = ladder;
})();
