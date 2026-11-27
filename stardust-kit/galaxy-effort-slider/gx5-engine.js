/*! 星尘 · 银河带 · 推理强度滑块运行时 (设计稿 r5「功率曲线」)  MIT License · Copyright (c) 2026 Stardust contributors
 *
 * r5：沿用 r4 Q（32px 单行银河带）的布局与弹簧物理，但「带的背景」随档位剧烈升级：
 *   · 星场：5 层 CSS 平铺星场（transform，合成器线程）。每升一档：更多层可见、整体 playbackRate 更快；
 *           超高 起由 canvas 画「星轨」，极限 变成从星星向外喷射的曲速线。
 *   · 星云：色温 冷靛蓝 → 靛紫 → 紫 → 品红蓝 → 白紫热核。颜色 / 层透明度都是 @property 自定义属性，档位切换时 CSS transition 平滑过渡。
 *   · 能量：低 = 只有安静的内发光；中/高 = 流动的极光电流（CSS）；超高 = 边缘流光 + 彗星；极限 = 呼吸脉动 + 热核 + 到达时 1–2px 带震。
 *   · 到达爆发（逐档加大，全部 ≤ 0.7s）：冲击波扫过整条带 / 光闪填满带 / 星粒子从拇指迸出；极限 = 先白闪再曲速加速。
 *   · 画布 = 轨道舞台 + 6px 横向 / 8px 纵向余量（仅给可选光晕）。所有特效被带的圆角矩形裁住；光晕只在带外 ≤ 6–8px 内。
 * 性能：低–高 档静止时没有任何 JS 循环（只剩 CSS 慢漂）；rAF 只在 超高 / 极限 的持续动画与换档后约 1s 内运行；
 *       弹窗不可见（IntersectionObserver）或页面隐藏（visibilitychange）时暂停。减少动态：全部静止，仍保留颜色 / 密度的档位差异。
 */
(() => {
  "use strict";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const LABELS = ["低", "中", "高", "超高", "极限"];
  const STAR = new Path2D(
    "M475.4 324.7 Q512.0 265.0 548.6 324.7 L581.3 378.0 Q600.2 408.6 635.2 417.1 L696.0 431.7 Q764.0 448.1 718.6 501.4 L678.0 549.0 Q654.7 576.4 657.5 612.2 L662.3 674.6 Q667.8 744.4 603.1 717.6 L545.3 693.8 Q512.0 680.0 478.7 693.8 L420.9 717.6 Q356.2 744.4 361.7 674.6 L366.5 612.2 Q369.3 576.4 346.0 549.0 L305.4 501.4 Q260.0 448.1 328.0 431.7 L388.8 417.1 Q423.8 408.6 442.7 378.0 Z",
  );
  const BH = 32,
    TW = 0.58,
    PX = 6,
    PY = 2; // 带高 32 · 宽 58% · 画布横向余量 6px · 纵向余量 2px（+ 舞台自带 6px = 8px）

  /* ============ 功率曲线（唯一数据源：CSS 变量、canvas、README 表格都由它而来） ============ */
  const CURVE = {
    sr: [0.35, 1, 2.6, 5.5, 10], // 星场 CSS playbackRate（1 = 远/中/近/细/密 3.5/7/12/18/26 px/s）
    ar: [0.5, 1, 1.8, 3, 5], // 星云 / 极光 CSS playbackRate
    warp: {
      n: [0, 0, 0, 16, 46],
      spd: [0, 0, 0, 230, 860],
      len: [0, 0, 0, 0.5, 1.15],
      a: [0, 0, 0, 0.52, 0.95],
    },
  };
  const interp = (arr, f) => {
    const i = clamp(Math.floor(f), 0, 3),
      t = clamp(f - i, 0, 1);
    return lerp(arr[i], arr[Math.min(4, i + 1)], t);
  };

  /* 每档 · CSS 变量：b1-3 = 带底渐变；n1/n2 = 星云团；sfc = 星色；o1-o5 = 5 层星场透明度（密度）；au1/au2/auo = 极光；ig = 内发光；ro/rc = 边缘流光 */
  const T = {
    dark: [
      {
        b1: "#05050b",
        b2: "#0b0b1d",
        b3: "#11122c",
        n1: "rgba(70,84,200,.16)",
        n2: "rgba(60,70,160,.10)",
        sfc: "rgb(200,205,255)",
        o: [0.3, 0.55, 0, 0, 0],
        au1: "rgba(90,100,230,0)",
        au2: "rgba(80,100,200,0)",
        auo: 0,
        ig: "rgba(80,90,220,.20)",
        ro: 0,
        rc: "rgb(200,205,255)",
      },
      {
        b1: "#070716",
        b2: "#15133a",
        b3: "#1d1b52",
        n1: "rgba(100,100,240,.28)",
        n2: "rgba(70,110,230,.20)",
        sfc: "rgb(215,215,255)",
        o: [0.6, 0.7, 0.55, 0, 0],
        au1: "rgba(110,110,255,.40)",
        au2: "rgba(80,130,255,.28)",
        auo: 0.4,
        ig: "rgba(110,100,255,.32)",
        ro: 0,
        rc: "rgb(215,215,255)",
      },
      {
        b1: "#0b0620",
        b2: "#241072",
        b3: "#35208f",
        n1: "rgba(150,100,255,.44)",
        n2: "rgba(90,130,255,.34)",
        sfc: "rgb(235,228,255)",
        o: [0.8, 0.85, 0.8, 0.6, 0],
        au1: "rgba(175,120,255,.62)",
        au2: "rgba(90,150,255,.50)",
        auo: 0.75,
        ig: "rgba(150,110,255,.50)",
        ro: 0.15,
        rc: "rgb(220,205,255)",
      },
      {
        b1: "#12062e",
        b2: "#3b1496",
        b3: "#5b23bb",
        n1: "rgba(205,100,255,.55)",
        n2: "rgba(90,150,255,.46)",
        sfc: "rgb(245,238,255)",
        o: [0.9, 0.9, 0.9, 0.8, 0.7],
        au1: "rgba(225,110,255,.72)",
        au2: "rgba(100,170,255,.60)",
        auo: 0.95,
        ig: "rgba(190,120,255,.64)",
        ro: 0.85,
        rc: "rgb(238,220,255)",
      },
      {
        b1: "#240a54",
        b2: "#6c27d4",
        b3: "#a550f2",
        n1: "rgba(255,190,255,.66)",
        n2: "rgba(150,170,255,.56)",
        sfc: "rgb(255,255,255)",
        o: [0.5, 0.5, 0.5, 0.5, 0.4],
        au1: "rgba(255,185,255,.80)",
        au2: "rgba(190,205,255,.70)",
        auo: 1,
        ig: "rgba(240,200,255,.80)",
        ro: 1,
        rc: "rgb(255,255,255)",
      },
    ],
    light: [
      // 亮色：带不再是「浅灰玻璃」，而是随档位变深 / 变饱和的宝石
      {
        b1: "#cfd3ee",
        b2: "#dcdff3",
        b3: "#e8eaf8",
        n1: "rgba(120,130,230,.30)",
        n2: "rgba(130,140,210,.20)",
        sfc: "rgb(76,72,140)",
        o: [0.3, 0.55, 0, 0, 0],
        au1: "rgba(110,110,230,0)",
        au2: "rgba(110,120,220,0)",
        auo: 0,
        ig: "rgba(110,110,210,.34)",
        ro: 0,
        rc: "rgb(255,255,255)",
      },
      {
        b1: "#b4baf0",
        b2: "#c6c5f6",
        b3: "#d6d1fa",
        n1: "rgba(110,110,240,.42)",
        n2: "rgba(100,130,235,.30)",
        sfc: "rgb(62,52,170)",
        o: [0.6, 0.7, 0.55, 0, 0],
        au1: "rgba(100,100,240,.42)",
        au2: "rgba(90,140,240,.30)",
        auo: 0.4,
        ig: "rgba(100,90,240,.40)",
        ro: 0,
        rc: "rgb(255,255,255)",
      },
      {
        b1: "#6c63e4",
        b2: "#8a76f2",
        b3: "#a58ef8",
        n1: "rgba(190,150,255,.50)",
        n2: "rgba(110,150,255,.40)",
        sfc: "rgb(255,255,255)",
        o: [0.8, 0.85, 0.8, 0.6, 0],
        au1: "rgba(235,205,255,.62)",
        au2: "rgba(150,200,255,.52)",
        auo: 0.75,
        ig: "rgba(235,225,255,.50)",
        ro: 0.2,
        rc: "rgb(255,255,255)",
      },
      {
        b1: "#341ba8",
        b2: "#5a2ed6",
        b3: "#7a47ee",
        n1: "rgba(235,130,255,.55)",
        n2: "rgba(110,160,255,.48)",
        sfc: "rgb(255,255,255)",
        o: [0.9, 0.9, 0.9, 0.8, 0.7],
        au1: "rgba(245,140,255,.72)",
        au2: "rgba(120,190,255,.62)",
        auo: 0.95,
        ig: "rgba(225,170,255,.62)",
        ro: 0.85,
        rc: "rgb(255,240,255)",
      },
      {
        b1: "#2a0f8c",
        b2: "#6a2ad8",
        b3: "#b45cf2",
        n1: "rgba(255,200,255,.68)",
        n2: "rgba(160,180,255,.58)",
        sfc: "rgb(255,255,255)",
        o: [0.5, 0.5, 0.5, 0.5, 0.4],
        au1: "rgba(255,190,255,.82)",
        au2: "rgba(200,210,255,.72)",
        auo: 1,
        ig: "rgba(255,215,255,.80)",
        ro: 1,
        rc: "rgb(255,255,255)",
      },
    ],
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
      wa: 0.85,
      wlife: 0.34,
      flash: 0.4,
      fdec: 0.17,
      parts: 40,
      pv: 165,
      psz: 1.4,
      shake: 0.9,
      boost: 1.5,
      nova: 0.75,
    },
    4: {
      e: 1.0,
      waves: 3,
      span: 1.2,
      wa: 1.0,
      wlife: 0.4,
      flash: 0.88,
      fdec: 0.16,
      parts: 72,
      pv: 240,
      psz: 1.7,
      shake: 1.7,
      boost: 4.2,
      nova: 1,
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

  /* ============ 全局时钟：真实 rAF，或「手动」虚拟时钟（截图 / 视频逐帧确定性渲染） ============ */
  const G = {
    manual: false,
    vt: 0,
    scale: 1,
    flush: false,
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
        G.syncCss(d / 1000);
      }
    },
    /* 手动时钟：CSS 动画 / transition 全部钉在虚拟时间上（动画按 playbackRate 积分），视频逐帧可复现 */
    syncCss(dt) {
      if (!G.manual) return;
      document.getAnimations().forEach((a) => {
        if (a.playState === "running") a.pause();
        if (a.__ph === undefined) a.__ph = 0;
        let rate = 1;
        if (a.animationName) {
          const el = a.effect && a.effect.target,
            host = el && el.closest && el.closest(".gx"),
            g = host && host.__gx;
          if (g)
            rate = a.animationName.startsWith("gx-sf")
              ? g.rate.star
              : a.animationName === "gx-rim"
                ? 1
                : g.rate.aur;
        }
        a.__ph += dt * 1000 * rate;
        a.currentTime = a.__ph;
      });
    },
    rm: () =>
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.classList.contains("rm"),
    stats() {
      const o = [];
      G.all.forEach((g) =>
        o.push({
          lv: LABELS[g.v],
          dark: g.dark,
          running: g.running,
          frames: g.perf.frames,
          avg: g.perf.frames ? g.perf.ms / g.perf.frames : 0,
          max: g.perf.max,
        }),
      );
      return o;
    },
  };
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) G.all.forEach((g) => g.kick());
  });

  function rng(seed) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ============ 注入样式：每档 CSS 变量 + 5 层星场 tile（程序生成，种子固定） ============ */
  (function injectStyle() {
    let css = "";
    ["dark", "light"].forEach((th) =>
      T[th].forEach((L, i) => {
        css +=
          `.th-${th} .gx[data-lv="${i}"]{--b1:${L.b1};--b2:${L.b2};--b3:${L.b3};--n1:${L.n1};--n2:${L.n2};--sfc:${L.sfc};--au1:${L.au1};--au2:${L.au2};--auo:${L.auo};--ig:${L.ig};--ro:${L.ro};--rc:${L.rc};` +
          L.o.map((o, j) => `--o${j + 1}:${o}`).join(";") +
          "}\n";
      }),
    );
    // 星场 tile：[宽 T px, 星数, 半径 min, max, 种子, 基础速度对应的周期 s]
    const SF = [
      [97, 6, 0.38, 0.6, 11, 27.7],
      [131, 5, 0.5, 0.75, 23, 18.7],
      [173, 4, 0.75, 1.05, 37, 14.4],
      [71, 7, 0.35, 0.55, 41, 3.95],
      [113, 8, 0.4, 0.62, 53, 4.35],
    ];
    SF.forEach(([Tw, n, r0, r1, seed, dur], i) => {
      const R = rng(seed),
        g = [];
      for (let j = 0; j < n; j++) {
        const x = (((j + 0.2 + R() * 0.6) / n) * 100).toFixed(1),
          y = (14 + R() * 72).toFixed(1),
          r = r0 + R() * (r1 - r0),
          a = Math.round(55 + R() * 45);
        const col = `color-mix(in srgb,var(--sfc) ${a}%,transparent)`;
        g.push(
          `radial-gradient(circle at ${x}% ${y}%,${col} 0,${col} ${r.toFixed(2)}px,transparent ${(r * 2.3).toFixed(2)}px)`,
        );
      }
      css += `.gx-sf.sf${i + 1}{width:calc(100% + ${Tw}px);background:${g.join(",")};background-size:${Tw}px 100%;background-repeat:repeat-x;opacity:var(--o${i + 1});animation:gx-sf${i + 1} ${dur}s linear ${-seed % 9}s infinite}\n@keyframes gx-sf${i + 1}{to{transform:translateX(-${Tw}px)}}\n`;
    });
    const el = document.createElement("style");
    el.id = "gx5-gen";
    el.textContent = css;
    document.head.appendChild(el);
  })();

  class GX {
    constructor(host, { v = 0, halo = false } = {}) {
      this.host = host;
      this.bh = BH;
      this.tw = TW;
      this.n = 5;
      this.v = clamp(v, 0, 4);
      this.halo = halo;
      this.PX = PX;
      this.PY = PY;
      this.H = BH + 12;
      this.PADE = BH * 0.6 + 3;
      this.hover = -1;
      this.dragging = false;
      this.follow = false;
      this.vis = true;
      this.dark = !!host.closest(".th-dark");
      this.perf = { frames: 0, ms: 0, max: 0, bf: 0, bms: 0, bmax: 0 };
      this.rate = { star: CURVE.sr[this.v], aur: CURVE.ar[this.v] };
      this.appliedRate = { star: -1, aur: -1 };
      this.spr = null;
      this.haloCache = {};
      host.__gx = this;
      this.build();
      G.all.add(this);
    }
    /* ---------- DOM ---------- */
    build() {
      const h = this.host;
      h.classList.add("gx");
      h.dataset.l = "Q";
      h.dataset.lv = this.v;
      h.innerHTML = `<div class="gx-row" style="height:${this.H}px"><span class="gx-t"><svg class="gx-ico" aria-hidden="true"><use href="#sd-star"/></svg>推理强度</span>
      <div class="gx-stage" role="slider" tabindex="0" aria-label="推理强度" style="height:${this.H}px;--bh:${this.bh}px;--tw:${this.tw * 100}%">
        <div class="gx-ch"><i class="gx-nb nb1" data-an="aur"></i><i class="gx-nb nb2" data-an="aur"></i>
          <i class="gx-sf sf1" data-an="star"></i><i class="gx-sf sf2" data-an="star"></i><i class="gx-sf sf3" data-an="star"></i><i class="gx-sf sf4" data-an="star"></i><i class="gx-sf sf5" data-an="star"></i>
          <div class="gx-auw"><i class="gx-aur au1" data-an="aur"></i><i class="gx-aur au2" data-an="aur"></i></div>
          <div class="gx-rimw"><i class="gx-rim" data-an="rim"></i></div></div><canvas aria-hidden="true"></canvas></div><b class="gx-v"></b></div>`;
      this.stage = h.querySelector(".gx-stage");
      this.chEl = h.querySelector(".gx-ch");
      this.cv = h.querySelector("canvas");
      this.ctx = this.cv.getContext("2d");
      this.valEl = h.querySelector(".gx-v");
      this.bindPointer();
      this.bindKeys();
      this.ro = new ResizeObserver(() => {
        const w = Math.round(this.stage.clientWidth);
        if (w && w !== this.W) this.layout();
      });
      this.ro.observe(this.stage);
      if (!G.manual && window.IntersectionObserver) {
        this.io = new IntersectionObserver((es) =>
          this.setVisible(es[es.length - 1].isIntersecting),
        );
        this.io.observe(h);
      }
      this.layout();
    }
    setVisible(b) {
      if (this.vis === b) return;
      this.vis = b;
      this.host.classList.toggle("gx-paused", !b);
      if (b) this.kick();
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
      this.xs = [0, 1, 2, 3, 4].map((i) => this.x0 + (i * (this.x1 - this.x0)) / 4);
      this.stage.setAttribute("aria-valuemin", 0);
      this.stage.setAttribute("aria-valuemax", 4);
      this.k = this.v / 4;
      this.haloCache = {};
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
      this.refreshTheme();
      this.renderText();
      this.draw();
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
    /* ---------- 主题 / 精灵（预渲染，rAF 里只 drawImage） ---------- */
    refreshTheme() {
      this.dark = !!this.host.closest(".th-dark");
      this.haloCache = {};
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
            mk(96, 4, (c, w, h) => {
              const g = c.createLinearGradient(0, 0, w, 0);
              const head = dir ? 1 : 0,
                tail = 1 - head;
              g.addColorStop(head, `rgba(255,255,255,1)`);
              g.addColorStop(head ? 0.82 : 0.18, `rgba(${tn[0]},${tn[1]},${tn[2]},.85)`);
              g.addColorStop(tail, `rgba(${tn[0]},${tn[1]},${tn[2]},0)`);
              c.fillStyle = g;
              c.globalAlpha = 0.38;
              c.fillRect(0, 0, w, h);
              c.globalAlpha = 1;
              c.fillRect(0, 1, w, 2);
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
      sets.comet = mk(64, 6, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(0.85, "rgba(255,255,255,.55)");
        g.addColorStop(1, "rgba(255,255,255,1)");
        c.fillStyle = g;
        c.fillRect(0, 1.5, w, 3);
      });
      this.draw();
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
    haloSprite(lv) {
      // 光晕：只在带外 ≤ 6–8px，内部被挖空；预渲染 + 缓存
      const key = this.dark + "" + lv;
      if (this.haloCache[key]) return this.haloCache[key];
      const d = this.dpr,
        c = document.createElement("canvas");
      c.width = Math.round(this.CW * d);
      c.height = Math.round(this.CH * d);
      const x = c.getContext("2d");
      x.scale(d, d);
      const P = PAL[this.dark ? "dark" : "light"][lv],
        col = this.dark ? P.g : lv === 4 ? [150, 90, 255] : [120, 80, 245];
      x.shadowColor = `rgba(${col[0]},${col[1]},${col[2]},${lv === 4 ? 1 : 0.8})`;
      x.shadowBlur = 7;
      x.shadowOffsetX = 5000;
      x.fillStyle = "#000";
      x.beginPath();
      x.roundRect(this.PX - 5000, this.cy - this.bh / 2, this.W, this.bh, this.bh / 2);
      x.fill();
      x.shadowColor = "transparent";
      x.shadowOffsetX = 0;
      x.globalCompositeOperation = "destination-out";
      x.beginPath();
      x.roundRect(this.PX, this.cy - this.bh / 2, this.W, this.bh, this.bh / 2);
      x.fill();
      return (this.haloCache[key] = c);
    }
    setHalo(on) {
      this.halo = on;
      this.host.dataset.halo = on ? "1" : "0";
      this.kick();
      this.draw();
    }
    renderText() {
      const lab = LABELS[this.v];
      if (this.valEl.textContent !== lab) {
        this.valEl.textContent = lab;
        if (!G.rm() && !G.manual && this.valEl.animate)
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
      this.host.dataset.lv = this.v;
    }

    /* ---------- 值变更 → 冲击事件 ---------- */
    setValue(v) {
      v = clamp(v, 0, 4);
      if (v === this.v) return;
      const prev = this.v,
        S = this.S,
        up = v > prev;
      this.v = v;
      this.k = v / 4;
      this.renderText();
      if (G.rm()) {
        S.x = S.tx = this.xs[v];
        S.vx = 0;
        S.lvf = v;
        this.clearFx();
        this.draw();
        return;
      }
      const L = ladder(this.k, up, prev / 4);
      S.cur = L;
      S.glow = 1;
      S.surge = L.e;
      S.arrivals.push({ tgt: this.xs[v], dir: up ? 1 : -1, L, v, up, t0: null });
      if (!this.dragging || !this.follow) S.tx = this.xs[v];
      this.kick();
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

    /* ---------- 物理 + 特效推进 ---------- */
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
    burstOn() {
      const S = this.S;
      return S.parts.length || S.waves.length || S.flash || S.nova;
    }
    kick() {
      if (G.rm()) {
        const S = this.S;
        S.x = S.tx;
        S.vx = 0;
        S.lvf = this.v;
        this.clearFx();
        this.draw();
        return;
      }
      if (this.running || !this.vis || (document.hidden && !G.manual)) return;
      if (!this.needLoop()) return;
      this.running = true;
      this.last = G.now();
      G.raf(this.frame);
    }
    frame = (ts) => {
      if (!this.vis || (document.hidden && !G.manual)) {
        this.running = false;
        return;
      }
      const t0 = performance.now(),
        dt = Math.min(0.05, Math.max(0, (ts - this.last) / 1000)) * G.scale;
      this.last = ts;
      this.step(dt);
      this.applyRates();
      this.draw();
      if (G.flush) this.ctx.getImageData(0, 0, 1, 1);
      this.afterFrame(t0);
      if (this.needLoop()) G.raf(this.frame);
      else {
        const S = this.S;
        S.x = S.tx;
        S.vx = 0;
        S.lvf = this.v;
        this.rate.star = CURVE.sr[this.v];
        this.rate.aur = CURVE.ar[this.v];
        this.applyRates();
        this.running = false;
        this.draw();
      }
    };
    applyRates() {
      if (G.manual) return;
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
    afterFrame(t0) {
      const d = performance.now() - t0,
        P = this.perf;
      P.frames++;
      P.ms += d;
      if (d > P.max) P.max = d;
      if (this.burstOn()) {
        P.bf++;
        P.bms += d;
        if (d > P.bmax) P.bmax = d;
      }
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
      this.renderText();
      this.draw();
      this.applyRates();
    }

    /* ---------- 绘制：画布 = 舞台 + 6/8px 余量；带内特效一律被带的圆角矩形裁住 ---------- */
    rgba(c, a) {
      return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
    }
    chPath(c, inset = 0) {
      const R = this.bh / 2 - inset;
      c.beginPath();
      c.roundRect(this.PX + inset, this.cy - R, this.W - inset * 2, R * 2, R);
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
      this.drawHalo(c, S, P);
      this.drawBand(c, S, P);
      this.drawStops(c, S, P);
      this.drawFx(c, S, P);
      this.drawStar(c, S, P);
    }
    drawHalo(c, S, P) {
      // 可选：超高 / 极限 带外 ≤ 6–8px 的柔光
      if (!this.halo) return;
      const f = S.lvf,
        a3 = sstep(2.2, 3, f) * (1 - sstep(3, 4, f)),
        a4 = sstep(3, 4, f),
        br = this.breath(S);
      if (a3 > 0.01) {
        c.globalCompositeOperation = P.add;
        c.globalAlpha = a3 * 0.55 * (this.dark ? 1 : 0.8);
        c.drawImage(this.haloSprite(3), 0, 0, this.CW, this.CH);
      }
      if (a4 > 0.01) {
        c.globalCompositeOperation = P.add;
        c.globalAlpha = a4 * (0.62 + 0.38 * br) * (this.dark ? 1 : 0.85);
        c.drawImage(this.haloSprite(4), 0, 0, this.CW, this.CH);
      }
      c.globalAlpha = 1;
      c.globalCompositeOperation = "source-over";
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
      this.chPath(c, 0.5);
      c.clip();
      // 1 · 极限：呼吸脉动的白紫热核星云（canvas 预渲染精灵 + 一次 drawImage）
      if (wa3 > 0.01) {
        c.globalCompositeOperation = add;
        c.globalAlpha = (0.1 + 0.2 * br) * wa3 + (0.14 + 0.26 * br) * wa4;
        c.drawImage(this.spr.core, S.x - W * 0.46, cy - bh * 1.15, W * 0.92, bh * 2.3);
        c.globalAlpha = 1;
        c.fillStyle = this.rgba(g, (0.05 + 0.08 * br) * wa4);
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
          g2 = c.createLinearGradient(cl, 0, xl, 0);
        g2.addColorStop(0, this.rgba(cc, 0));
        g2.addColorStop(0.3, this.rgba(cc, la * 1.2));
        g2.addColorStop(1, this.rgba(cc, Math.min(1, la * 2.2)));
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
            len = 18 + 18 * wa4;
          c.globalAlpha = Math.sin(Math.PI * ph) * (0.55 + 0.4 * wa4);
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
            a =
              wp.a *
              sstep(0, 14, r) *
              (1 - Math.pow(r / (Wd * 0.9), 2.2)) *
              (0.55 + 0.45 * p.v) *
              (f < 3 ? 1 : 1);
          if (a < 0.02) continue;
          const x = S.x + p.dir * r,
            th = (1.2 + 0.9 * wa4) * p.w,
            im = sp[p.tint][p.dir > 0 ? 1 : 0];
          c.globalAlpha = Math.min(1, a);
          c.drawImage(im, p.dir > 0 ? x - len : x, y - th / 2, len, th);
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
      // 5 · 光闪：填满整条带（极限 = 白闪）
      if (fl > 0.005) {
        c.globalCompositeOperation = P.add === "lighter" ? "lighter" : "source-over";
        const white = f > 3.5;
        c.fillStyle = this.rgba(
          white ? [255, 255, 255] : cc,
          Math.min(1, fl * (this.dark || P.dk > 0.5 ? 1 : 0.8)),
        );
        c.fillRect(cl, cy - R, W, bh);
        c.globalAlpha = Math.min(1, fl * 0.9);
        c.drawImage(this.spr.core, S.x - W * 0.5, cy - bh * 1.2, W, bh * 2.4);
        c.globalAlpha = 1;
      }
      c.restore();
      c.globalCompositeOperation = "source-over";
      if (fl > 0.02) {
        c.globalCompositeOperation = P.add;
        c.strokeStyle = this.rgba(cc, Math.min(1, 0.7 * fl + 0.1));
        c.lineWidth = 1.2;
        this.chPath(c, 0.5);
        c.stroke();
        c.globalCompositeOperation = "source-over";
      }
    }
    drawStops(c, S, P) {
      const cy = this.cy,
        R = this.bh / 2,
        lightish = P.dk <= 0.5,
        tick = lightish ? [78, 76, 120] : [235, 228, 255];
      this.xs.forEach((x, i) => {
        const lit = x <= S.x + 1,
          hv = i === this.hover && i !== this.v;
        if (Math.abs(x - S.x) < 4) return;
        c.strokeStyle = this.rgba(lit ? P.c : tick, lit ? 0.55 : hv ? 0.7 : lightish ? 0.32 : 0.26);
        c.lineWidth = 1;
        c.lineCap = "round";
        const tl = Math.min(4, R * 0.32);
        c.beginPath();
        c.moveTo(x, cy - R + 2.5);
        c.lineTo(x, cy - R + 2.5 + tl);
        c.moveTo(x, cy + R - 2.5);
        c.lineTo(x, cy + R - 2.5 - tl);
        c.stroke();
        c.fillStyle = lit
          ? this.rgba(lightish ? P.g : P.c, 0.85)
          : this.rgba(tick, hv ? 0.75 : 0.4);
        c.beginPath();
        c.arc(x, cy, hv ? 1.9 : 1.2, 0, 7);
        c.fill();
      });
      if (this.hover >= 0 && this.hover !== this.v) {
        c.strokeStyle = this.rgba(P.g, 0.6);
        c.lineWidth = 1;
        c.beginPath();
        c.arc(this.xs[this.hover], cy, Math.max(6.5, this.bh / 2 - 0.5), 0, 7);
        c.stroke();
      }
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
          hw = Math.min(hh * 0.6, (1.0 + 2.6 * e) * (cur.up ? 1 : 0.6)),
          a0 = (0.3 + 0.58 * e) * (cur.up ? 1 : 0.5) * (dk ? 1 : 0.7);
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
        g2.addColorStop(0, this.rgba(cc, a0 * 1.1));
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
      this.chPath(c, 0.5);
      c.clip();
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
          al = (1 - p) * (1 - p) * r.a;
        c.strokeStyle = this.rgba(dk ? g : [255, 255, 255], al * 0.45);
        c.lineWidth = (r.w + 5) * (1 - p * 0.5);
        c.beginPath();
        c.ellipse(S.x, cy, rx, hh * 1.5, 0, 0, 7);
        c.stroke(); // 宽而柔的外环
        c.strokeStyle = this.rgba(dk ? cc : [255, 255, 255], Math.min(1, al * 1.3));
        c.lineWidth = r.w * (1 - p * 0.6);
        c.beginPath();
        c.ellipse(S.x, cy, rx, hh * 1.5, 0, 0, 7);
        c.stroke();
      }); // 亮芯
      c.restore();
      // 星芒（到达瞬间的十字光）
      if (S.nova) {
        c.save();
        this.chPath(c, 0.5);
        c.clip();
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

    /* ---------- 指针 / 键盘 ---------- */
    idxAt(cx) {
      return clamp(Math.round(((cx - this.x0) / (this.x1 - this.x0)) * 4), 0, 4);
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
        else if (k === "End") nv = 4;
        if (nv == null) return;
        e.preventDefault();
        this.setValue(nv);
      });
    }
  }

  /* 位移物理（同 r4）：目标档越高，弹簧越硬 / 尾巴越长；降档统一轻柔 */
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

  window.GX = GX;
  window.GXG = G;
  window.GX_LABELS = LABELS;
  window.GX_CURVE = CURVE;
  window.GX_BURST = BURST;
  window.gxLadder = ladder;
})();
