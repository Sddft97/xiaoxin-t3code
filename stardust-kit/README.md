# 星尘积木工坊 · Stardust Kit（首期：推理强度滑块全系列）

> **在线试玩**：[xiaoxin666.cn/stardust](https://www.xiaoxin666.cn/stardust#workshop) · **本地试玩**：每个目录里的 `demo.html` 都可以直接用浏览器打开。  
> **中文** · [English](#english)

这里收录了我们在打磨 **T3 星尘版（Stardust）** 过程中设计并实测过的全部推理强度滑块动画方案。你可以直接在官网在线拖动体验，也可以挑选最合眼缘的一套，直接复制目录里的源码或 `PROMPT.zh.md` 交给 AI 助手装进自己的 T3 工作台。

| 方案目录                    | 风格与特色                                                                                                                                         | 包含文件                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `v18-starship-fluid/`       | **V18 流体写实星舰（设计稿；v1.2.0 曾默认搭载，现行应用已换成银河推理滑块，见下方二期）** · 5 档连续飞行 + 180ms 过档冲击 + 离屏贴图 + 2s 自动休眠 | 生产级 `.ts/.tsx` + `demo.html` + 改造 Prompt |
| `v16-stardust-observatory/` | **V16 星尘观测站** · 像素小机器人夜里守望，7 件物件随档位逐一苏醒 + 流星划过                                                                       | `demo.html` + 改造 Prompt                     |
| `v19-pixel-starship/`       | **V19-A 16-Bit 街机像素星舰** · 复古街机高精像素火箭与圆润火焰烟球                                                                                 | `demo.html` + 改造 Prompt                     |
| `v19-cyber-hud/`            | **V19-B 赛博机甲 HUD** · 遥测网格、流体光带尾迹与曲速能量护盾                                                                                      | `demo.html` + 改造 Prompt                     |
| `v17-thrill-experiments/`   | **V17 高对比实验 4 套** · 星舰 / 聚变核心超频 / 日食引力弹弓 / 星钢极热淬火                                                                        | `demo.html` + 改造 Prompt                     |

> 二期的视觉组件见下方「二期」表格；底部会话/令牌弹簧浮层与任务步骤卡仍在计划中。

---

<!-- phase2-zh -->

## 二期 · 视觉组件

[四个界面设计技能与安装说明](skills/README.md)涵盖动效审查、截图验收、星尘视觉与组件上架。

| 目录                     | 组件                                                                              | 状态                         | 包含文件                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| `galaxy-effort-slider/`  | **银河推理滑块** · 拖动星星换推理档位，背景随档位从冷星点一路烧成曲速热核。       | **已在星尘里**               | `demo.html` · `PROMPT.zh.md` · `GalaxyEffortSlider.tsx` · `galaxyEffortCanvas.js` · `galaxyEffort.css` |
| `quota-capsule/`         | **额度胶囊** · 顶栏订阅额度，见应用源码。暂无已核实的原始演示。                   | **已在星尘里**               | `demo.html` · `PROMPT.zh.md` · `QuotaTopbar.tsx` · `quotaTopbar.module.css` · `quotaTopbarModel.ts`    |
| `weekly-reset-timeline/` | **本周重置时间轴** · 悬停一行查看读数，点击方案见 `?mode=after`。                 | **已在星尘里（时间轴本体）** | `demo.html` · `PROMPT.zh.md` · `UsageResetTimeline.tsx`                                                |
| `model-chip/`            | **模型胶囊** · 28 像素的小胶囊：账号编号在图标角上，推理强度是名字下的 5 段细轨。 | **已在星尘里**               | `demo.html` · `PROMPT.zh.md` · `modelChip.css`                                                         |
| `theme-toggle/`          | **主题开关** · 一枚 36 像素的图标瓦片，太阳与月亮是同一个形状变过去的。           | **设计稿**                   | `demo.html` · `PROMPT.zh.md`                                                                           |
| `stardust-icon/`         | **星环星宝图标** · 紫夜底、自发光的五角星、两只竖条眼和一圈柔光星环。             | **已在星尘里**               | `demo.html` · `PROMPT.zh.md` · `StardustMark.tsx`                                                      |

> **状态说明**：「已在星尘里」= 随应用发布，可在 [Stardust v1.2.4](https://github.com/zds-xiaoxin/stardust/releases/tag/v1.2.4) 核对；「设计稿」= 只是演示与提示词，应用里没有，可以用提示词做出来。一键装配的积木面板还没有，仍在设计中。
> 每个 `demo.html` 都能直接用浏览器打开，支持双语的原稿可加 `?lang=en` 查看英文。部分原稿保留了中文界面。

---

<a id="english"></a>

## English — Stardust Kit (Phase 1: Reasoning Effort Slider Collection)

**Try it online**: [xiaoxin666.cn/stardust](https://www.xiaoxin666.cn/stardust#workshop) · **Try it locally**: open the `demo.html` in any engine folder in your browser.

This directory packages every reasoning-effort slider animation explored while building **T3 Stardust**. Try them all live in your browser, then copy the standalone source or `PROMPT.en.md` into Claude Code / Codex / T3 Code to install your favorite theme into your own workbench.

- `v18-starship-fluid/` — **V18 Fluid Starship Launch Stack (design draft; it was the v1.2.0 default, the app now ships the Galaxy effort slider, see phase 2 below)** · 5-stage flight, 180ms upshift juice, pre-baked sprite atlas & 2s idle auto-sleep.
- `v16-stardust-observatory/` — **V16 Stardust Observatory** · Cozy pixel-art midnight observatory waking up step by step.
- `v19-pixel-starship/` — **V19-A 16-Bit Arcade Pixel Starship** · Retro hi-bit pixel rocket & fireball plumes.
- `v19-cyber-hud/` — **V19-B Cyber Mecha HUD** · Telemetry grid, ribbon contrails & warp shield.
- `v17-thrill-experiments/` — **V17 High-Contrast Experiments** · 4 high-impact themes (Starship / Fusion Reactor / Solar Eclipse / Starsteel Forge).

<!-- phase2-en -->

## Phase 2 · Visual components

[Four UI skills and setup instructions](skills/README.md#english) cover motion audits, screenshot checks, Stardust styling and workshop contributions.

| Folder                   | Component                                                                                                               | Status                          | Files                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `galaxy-effort-slider/`  | **Galaxy effort slider** · Drag the star to change effort; the band escalates from cold stars to a warp-speed core.     | **In Stardust**                 | `demo.html` · `PROMPT.en.md` · `GalaxyEffortSlider.tsx` · `galaxyEffortCanvas.js` · `galaxyEffort.css` |
| `quota-capsule/`         | **Quota chips** · Top-bar subscription quotas. Implementation source included. A verified original demo is unavailable. | **In Stardust**                 | `demo.html` · `PROMPT.en.md` · `QuotaTopbar.tsx` · `quotaTopbar.module.css` · `quotaTopbarModel.ts`    |
| `weekly-reset-timeline/` | **Weekly reset timeline** · Hover a lane for its readings. The click study is available with `?mode=after`.             | **In Stardust (base timeline)** | `demo.html` · `PROMPT.en.md` · `UsageResetTimeline.tsx`                                                |
| `model-chip/`            | **Model chip** · A 28px chip: account number on the logo corner, effort as a 5-segment rail under the name.             | **In Stardust**                 | `demo.html` · `PROMPT.en.md` · `modelChip.css`                                                         |
| `theme-toggle/`          | **Theme toggle** · A 36px icon tile where sun and moon are one shape morphing.                                          | **Design draft**                | `demo.html` · `PROMPT.en.md`                                                                           |
| `stardust-icon/`         | **Ringed-star icon** · A violet night tile, a self-lit star, two bar eyes and a soft ring.                              | **In Stardust**                 | `demo.html` · `PROMPT.en.md` · `StardustMark.tsx`                                                      |

> **Status**: “In Stardust” ships in the app, as documented in [Stardust v1.2.4](https://github.com/zds-xiaoxin/stardust/releases/tag/v1.2.4). “Design draft” is a demo plus prompt only; it is not in the app and can be built with the prompt. The one-click block panel does not exist yet and is still being designed.
> Every `demo.html` opens directly in a browser; add `?lang=en` where the original supports English. Some originals retain their Chinese interface.
