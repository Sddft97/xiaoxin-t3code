# 把「本周重置时间轴」装进你的工作台

状态：**设计稿**。时间轴本体已在星尘里（UsageResetTimeline.tsx）；这里展示的「悬停改为点击展开」是设计稿，应用里目前仍是悬停高亮。

直接把下面这段提示词发给 Claude Code / Codex / T3 Code：

```text
请参考 `stardust-kit/weekly-reset-timeline/demo.html` 的交互，改造我项目里的「这周的重置」时间轴（原型源码见同目录 `UsageResetTimeline.tsx`）：
1. 删掉所有悬停效果：其他行变暗、字重变化、圆点放大、顶部读数跟着换内容；
2. 每行加一块铺满整行的透明点击区，行与行相接，没有死区；
3. 点一行展开详情浮层：标题、「N% 剩余 · 窗口 · 时间 重置」，有空档时再加一行红色的「约 N 小时用不了」，并给一个「定位到上面的卡片」按钮；
4. 再点同一行、按 Esc、或点浮层外收起，Esc 后焦点回到该行；行上用 `aria-expanded`；
5. 浮层只做 120ms 淡入，`prefers-reduced-motion` 下不做过渡；
6. 完成后更新依赖悬停的测试，并跑 lint 和类型检查。
```

原始 demo 默认展示 before（现状）；在 URL 加 `?mode=after` 查看下文描述的点击设计稿。
