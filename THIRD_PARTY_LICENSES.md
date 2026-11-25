# 第三方许可 · Third-party licenses

[来源与署名 / Attribution](NOTICE.md) · [已配置的源码和资源许可 / Configured source and asset notices](third-party-licenses/source-notices.json)

本目录保留 SPDX 许可模板，以及从本仓库配置离线生成的源码和资源许可文本。各安装包的完整依赖许可清单由对应版本构建流程生成，包含构建实际解析的依赖和模块。

This repository preserves the SPDX templates and offline notices generated from its configuration for copied source and assets. Each distribution generates its full dependency-notice manifest using the packages and modules resolved for that build.

- 模板 / Templates: `node scripts/sync-third-party-license-notices.ts`
- Web 和桌面 / Web and desktop: 依赖就绪后 / with dependencies installed, run the web production build defined in [apps/web/vite.config.ts](apps/web/vite.config.ts). The build emits `third-party-licenses.json`.
- 移动端 / Mobile: [Metro production configuration](apps/mobile/metro.config.js) invokes the same generator for the mobile dependency set.
- 原生声明 / Native notices: [Ghostty and mobile terminal notices](apps/mobile/modules/t3-terminal/THIRD_PARTY_NOTICES.md), [Linux CLI libatomic license](scripts/licenses/libatomic.LICENSE). Keep the notices shipped by Electron and Chromium with packaged artifacts.
