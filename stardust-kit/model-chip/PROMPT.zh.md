# 把「模型胶囊」装进你的工作台

状态：**已在星尘里**。输入区的模型选择器按钮。

直接把下面这段提示词发给 Claude Code / Codex / T3 Code：

```text
请参考 `stardust-kit/model-chip/` 里的 `modelChip.css`、`ProviderModelPicker.chip-excerpt.tsx.txt` 和 `demo.html`，把输入区的模型选择器按钮改成紧凑的「模型胶囊」：
1. 整体 28px 高；左侧 22px 圆角图标瓦片，多账号时在瓦片右下角放一个 12.5px 的账号编号徽标，单账号不显示；
2. 模型名下方叠一条零宽的 5 段强度轨（每段 5×2px、间隔 1.5px），已达档位的段用强调色，不占横向宽度；
3. 去掉下拉箭头；弹层打开或悬停时背景加深；
4. 模型名过长时只截断前半段，保留最后 7 个字符；
5. 浅色和深色主题各给一组颜色变量；完成后跑 lint、类型检查和 ProviderModelPicker 的相关测试。
```
