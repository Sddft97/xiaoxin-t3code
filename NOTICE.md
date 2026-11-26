# 致谢与许可 / Credits and licenses

## 星尘 Agent

星尘 Agent 是由**开源小新（OpenSource Xiaoxin）**与贡献者维护的独立产品，基于 [pingdotgg/t3code](https://github.com/pingdotgg/t3code) 的 MIT 许可代码开发。上游版权为 Copyright (c) 2026 T3 Tools Inc.。星尘 Agent 与 T3 Tools Inc. 无关联，也未获其认可。“T3”和“T3 Code”为上游使用的名称。上游与星尘的 MIT 许可见 [LICENSE](LICENSE)。

下表列出随源码分发或由此代码构建带入的主要第三方代码及资源。[第三方许可索引](THIRD_PARTY_LICENSES.md)链接到完整声明，具体发行物的依赖清单随构建生成。

## Stardust Agent

Stardust Agent is an independent product maintained by **OpenSource Xiaoxin** and contributors. It is derived from [pingdotgg/t3code](https://github.com/pingdotgg/t3code), licensed under MIT. Upstream copyright is Copyright (c) 2026 T3 Tools Inc. Stardust Agent is unaffiliated with and has no endorsement from T3 Tools Inc. “T3” and “T3 Code” are upstream names. See [LICENSE](LICENSE) for the MIT terms and copyright notices.

The table lists the principal third-party code and assets copied into source or added by its build. The [third-party license index](THIRD_PARTY_LICENSES.md) links to the full notices. Each build generates its own dependency manifest.

| 组件 / Component                                                                              | 许可与声明 / License and notice                                                                                                                 |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| ZhiweiXiao98/t3code 简体中文词汇 / Simplified Chinese UI vocabulary                           | MIT · [i18n notice](apps/web/src/i18n/NOTICE)                                                                                                   |
| OpenCode provider 与 Office 查看器 / Provider and Office viewers                              | MIT · [provider notice](packages/provider-opencode/NOTICE), [viewer license](apps/web/src/components/files/office/LICENSE.opencode)             |
| Apple Speech engine（Callstack）、Ionic keyboard assist、GitHub gemoji 数据 / data            | MIT · [generated notices](third-party-licenses/source-notices.json)                                                                             |
| Ghostty、GhosttyKit、libghostty-vt、VVTerm 集成 / integration                                 | MIT · [Ghostty license](native/libghostty-vt/LICENSE), [terminal notices and revisions](apps/mobile/modules/t3-terminal/THIRD_PARTY_NOTICES.md) |
| Symbols Nerd Font Mono、MesloLGS NF、KaTeX fonts                                              | MIT / Apache-2.0 / OFL-1.1 · [generated notices](third-party-licenses/source-notices.json)                                                      |
| Expo editor、react-native-uitextview                                                          | MIT · [editor license](apps/mobile/modules/t3-composer-editor/LICENSE), [source text license](apps/mobile/modules/t3-source-text/LICENSE)       |
| WABT wasm2c、SIMDe、RaTeX、micromark-extension-llm-math                                       | Apache-2.0 / MIT · [generated notices](third-party-licenses/source-notices.json)                                                                |
| agent-device、Expo Device Hub、serve-sim、WebRTC portions                                     | MIT / Apache-2.0 / BSD-3-Clause · [generated notices](third-party-licenses/source-notices.json)                                                 |
| VoidZero vite-plus remote cache Cloudflare vendor                                             | MIT · [vendor license](infra/task-cache/vendor/vite-plus-remote-cache-cloudflare/LICENSE)                                                       |
| Pierre Words、react-native-enriched-markdown、react-native-screens（本地包 / local tarballs） | Apache-2.0 / MIT · Each tarball contains its own LICENSE, and Pierre Words includes NOTICE                                                      |
| deadrobotmusic、BaggoNotes、Tonik1105 音效 / audio assets                                     | CC0-1.0 · [generated notices](third-party-licenses/source-notices.json)                                                                         |
| GCC libatomic（Linux CLI archive）                                                            | GPL-3.0-or-later WITH GCC-exception-3.1 · [license text and packaging input](scripts/licenses/libatomic.LICENSE)                                |
| npm 包补丁 / npm dependency patches                                                           | 原包权利与许可适用 / subject to original package terms · [patches](patches/) and [notice configuration](third-party-licenses.config.json)       |
