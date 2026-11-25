# 把「银河推理滑块」装进你的工作台

状态：**已在星尘里**。现行应用里的推理滑块。

直接把下面这段提示词发给 Claude Code / Codex / T3 Code：

```text
请参考仓库目录 `stardust-kit/galaxy-effort-slider/` 里的 `GalaxyEffortSlider.tsx`、`galaxyEffortCanvas.js`、`galaxyEffort.css`、`galaxyEffortLevels.ts` 和 `demo.html`，把「银河推理滑块」装进我当前工作台的推理强度选择器：
1. 保留 5 档（低 · 中 · 高 · 超高 · 极限），每档换一套星场密度、星云色温和到达时的冲击效果；
2. 滑块区域固定 32px 高的单行银河带，不改变弹窗高度；
3. 用 `role="radiogroup"` 加方向键、Home/End 支持键盘，并尊重 `prefers-reduced-motion`：开启时直接切档、不播爆发效果；
4. 页面不可见或静止约 2 秒后停掉 canvas 循环；
5. 如果项目没有 `STARDUST_STAR_PATH`，请用自己的星形 Path 替换，再跑 lint、类型检查和现有滑块测试。
```
