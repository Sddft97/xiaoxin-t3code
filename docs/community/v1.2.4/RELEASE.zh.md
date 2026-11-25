# 星尘 Agent v1.2.4

- 推理强度滑块换成 r5 银河动效。减少侧栏、主题切换和命令面板的渲染开销。
- 更新主题和星尘品牌。输入框与侧栏恢复 C115 的布局，输入框边框更细。
- Codex 使用 ChatGPT 共享连接遇到特定报错时会尝试自动恢复，保留已有对话。
- 新建临时工作树使用 `stardust/` 分支前缀。已有分支名称继续可用。
- 发布 macOS Apple Silicon 安装包及 Windows x64 测试版。Windows 测试版暂不提供 WSL 和语音输入。

从发行附件下载对应安装包，并先核对 `SHA256SUMS.txt`。macOS 公开包为 ad-hoc 签名，未经过 Apple 公证。Windows 出现 SmartScreen 提示时，先核对来源和校验值，再选择「更多信息 → 仍要运行」。[Windows 安装与校验](../../user/stardust-windows-install.md)
