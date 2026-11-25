import * as NodeAssert from "node:assert/strict";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import { PNG } from "pngjs";

const [macDir, windowsDir, destination] = process.argv.slice(2);
NodeAssert.ok(macDir && windowsDir && destination, "Pass the macOS, Windows and report paths.");
const readJson = (dir, name) => JSON.parse(NodeFS.readFileSync(NodePath.join(dir, name), "utf8"));
const mac = readJson(macDir, "smoke.json");
const windows = readJson(windowsDir, "smoke.json");
NodeAssert.equal(mac.platform, "darwin");
NodeAssert.equal(windows.platform, "win32");
NodeAssert.equal(mac.version, windows.version);
NodeAssert.match(mac.version, /^[1-9]\d*\.\d+\.\d+$/);
NodeAssert.ok(mac.fixtureRequests > 0 && windows.fixtureRequests > 0);
const macGeometry = readJson(macDir, "geometry.json");
const windowsGeometry = readJson(windowsDir, "geometry.json");

function embed(dir, name, alt) {
  const picture = NodeFS.readFileSync(NodePath.join(dir, `${name}.png`));
  const { width, height, data } = PNG.sync.read(picture);
  NodeAssert.ok(width >= 640 && height >= 480, `${name}: screenshot dimensions are too small`);
  const colors = new Set();
  for (let i = 0; i < data.length && colors.size < 16; i += 64) {
    colors.add(data.readUInt32BE(i));
  }
  NodeAssert.ok(colors.size >= 16, `${name}: screenshot is blank or invalid`);
  return `<figure><img loading="lazy" src="data:image/png;base64,${picture.toString("base64")}" alt="${alt}"></figure>`;
}

function renderPane(dir, name, alt, optional) {
  if (optional && !NodeFS.existsSync(NodePath.join(dir, `${name}.png`))) {
    return "<p>此 runner 未采集到该画面 / Capture unavailable on this runner</p>";
  }
  return embed(dir, name, alt);
}

const screens = [
  ["first-launch", "首次启动 / First launch"],
  ["home", "首页 / Home"],
  ["sidebar", "侧栏 / Sidebar"],
  ["running-thread", "运行会话和差异 / Active thread and diff"],
  ["composer", "输入框和模型选项 / Composer and model options"],
  ["general", "设置 · 常规 / General settings"],
  ["keybindings", "设置 · 快捷键 / Keybindings"],
  ["appearance", "设置 · 外观 / Appearance settings"],
  ["about", "设置 · 关于 / About settings"],
  ["caption-corners", "系统窗口按钮与圆角 / Native caption and corners"],
  ["installer", "Windows 安装器 / Windows installer"],
  ["start-menu", "Windows 开始菜单 / Windows Start menu"],
];
const rows = ["light", "dark"].map(
  (theme) => `
  <h2>${theme === "light" ? "浅色 / Light" : "深色 / Dark"}</h2>
  ${screens
    .map(([name, label]) => {
      const key = `${name}-${theme}`;
      const shellCapture = ["caption-corners", "installer", "start-menu"].includes(name);
      const macPane =
        name === "installer" || name === "start-menu"
          ? "<p>Windows 系统界面 / Windows system UI</p>"
          : renderPane(macDir, key, `macOS ${label}`, shellCapture);
      return `<section><h3>${label}</h3><div class="pair">
      <div><strong>macOS</strong>${macPane}</div>
      <div><strong>Windows</strong>${renderPane(windowsDir, key, `Windows ${label}`, shellCapture)}</div>
    </div></section>`;
    })
    .join("\n")}
`,
);

const geometry = Object.entries(macGeometry).flatMap(([screen, anchors]) =>
  Object.entries(anchors).flatMap(([selector, macRect]) => {
    const winRect = windowsGeometry[screen]?.[selector];
    if (!winRect) return [];
    const delta = ["x", "y", "width", "height"].map((field) =>
      (winRect[field] - macRect[field]).toFixed(1),
    );
    const safeSelector = selector
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
    return [
      `<tr><td>${screen}</td><td><code>${safeSelector}</code></td>${delta.map((n) => `<td>${n}</td>`).join("")}</tr>`,
    ];
  }),
);
NodeFS.mkdirSync(NodePath.dirname(destination), { recursive: true });
NodeFS.writeFileSync(
  destination,
  `<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>星尘 v${mac.version} · macOS / Windows</title>
<style>
  :root { color-scheme: light dark; font: 16px system-ui, sans-serif }
  body { margin: 2rem auto; max-width: 1500px; padding-inline: 1rem }
  section { margin-block: 2rem }
  .pair { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 1rem }
  figure { margin: .5rem 0 0 }
  img { width: 100%; height: auto; border-radius: .5rem; display: block }
  td, th { padding: .35rem .7rem; text-align: start }
  @media (max-width: 700px) { .pair { grid-template-columns: 1fr } }
</style>
<h1>星尘 v${mac.version} · macOS / Windows</h1>
<p>两端均完成安装包启动和回放冒烟。Windows 系统外壳来自 CI 桌面，Mica 观感仍需实体 Win11 核对。</p>
<p>Both release packages passed app launch and replay smoke. Windows shell evidence comes from the CI desktop. Verify Mica on physical Windows 11 hardware.</p>
${rows.join("\n")}
<h2>布局差值 / Layout deltas</h2>
<p>Windows − macOS，CSS px。标题栏、平台字体和系统材质允许有意差异。</p>
<table><thead><tr><th>Screen</th><th>Anchor</th><th>x</th><th>y</th><th>Width</th><th>Height</th></tr></thead><tbody>${geometry.join("\n")}</tbody></table>
</html>\n`,
);
