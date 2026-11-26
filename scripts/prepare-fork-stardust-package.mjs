import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeChildProcess from "node:child_process";

const [directory, expectedTag, upstreamTag] = process.argv.slice(2);
if (!directory || !/^v[1-9]\d{0,5}\.\d{1,5}\.\d{1,5}$/.test(expectedTag ?? "") || !upstreamTag) {
  throw new Error(
    "Usage: node scripts/prepare-fork-stardust-package.mjs <directory> <vX.Y.Z> <upstream tag>",
  );
}

const upstreamVersion = upstreamTag.replace(/^v/, "");
const sourceZip = NodeFS.readdirSync(directory).find((name) =>
  /^T3-Code-.*-arm64\.zip$/.test(name),
);
if (!sourceZip) throw new Error(`No packaged arm64 ZIP found in ${directory}`);

const fileName = `T3-Stardust-${expectedTag.slice(1)}-macOS-arm64.zip`;
const upstreamExtract = NodeFS.mkdtempSync(
  NodePath.join(NodePath.dirname(directory), "fork-shell-"),
);
const extracted = NodeFS.mkdtempSync(NodePath.join(NodePath.dirname(directory), "fork-package-"));
try {
  const shellZip = NodePath.join(upstreamExtract, `T3-Stardust-${upstreamTag}-macOS-arm64.zip`);
  download(
    `https://github.com/zds-xiaoxin/xiaoxin-t3code/releases/download/${upstreamTag}/T3-Stardust-${upstreamTag}-macOS-arm64.zip`,
    shellZip,
  );
  run("/usr/bin/ditto", ["-x", "-k", shellZip, upstreamExtract]);
  const shellName = NodeFS.readdirSync(upstreamExtract).find((name) => name.endsWith(".app"));
  if (!shellName) throw new Error("Upstream Stardust release has no .app shell");
  const app = NodePath.join(extracted, "T3 Stardust.app");
  copy(NodePath.join(upstreamExtract, shellName), app);
  run("/usr/bin/ditto", ["-x", "-k", NodePath.join(directory, sourceZip), extracted]);
  const packagedName = NodeFS.readdirSync(extracted).find(
    (name) => name.endsWith(".app") && name !== "T3 Stardust.app",
  );
  if (!packagedName) throw new Error("No built app found");
  const packagedApp = NodePath.join(extracted, packagedName);
  const plist = NodePath.join(app, "Contents/Info.plist");
  for (const [key, value] of [
    ["CFBundleDisplayName", "T3 Stardust"],
    ["CFBundleName", "T3 Stardust"],
    ["CFBundleShortVersionString", expectedTag.slice(1)],
    ["CFBundleVersion", expectedTag],
  ])
    run("/usr/bin/plutil", ["-replace", key, "-string", value, plist]);
  for (const resource of [
    "app.asar",
    "app.asar.unpacked",
    "node_modules",
    "apple-speech",
    "resource-monitor",
    "server-compile-cache",
    "stardust-build.json",
  ]) {
    const source = NodePath.join(packagedApp, "Contents/Resources", resource);
    if (!NodeFS.existsSync(source)) continue;
    const destination = NodePath.join(app, "Contents/Resources", resource);
    NodeFS.rmSync(destination, { recursive: true, force: true });
    copy(source, destination);
  }
  NodeFS.writeFileSync(
    NodePath.join(app, "Contents/Resources/stardust-build.json"),
    `${JSON.stringify(
      {
        schema: 1,
        communityVersion: upstreamVersion,
        forkReleaseVersion: expectedTag.slice(1),
        customBuild: `fork-${upstreamTag}`,
        releaseVersion: expectedTag,
        publicRelease: false,
        installed: true,
        releaseChannel: "stable",
        signingMode: "ad-hoc",
        upstreamTag,
      },
      null,
      2,
    )}\n`,
  );
  run("codesign", ["--force", "--deep", "--sign", "-", "--timestamp=none", app]);
  run("codesign", ["--verify", "--deep", "--strict", app]);
  run("xattr", ["-dr", "com.apple.quarantine", app]);
  const appAsar = NodeFS.readFileSync(NodePath.join(app, "Contents/Resources/app.asar"));
  for (const value of ["relay.t3.codes", "t3-relay", "Sign in to T3 Connect"]) {
    if (!appAsar.includes(value)) throw new Error(`Packaged app is missing ${value}`);
  }
  run("/usr/bin/ditto", [
    "-c",
    "-k",
    "--sequesterRsrc",
    "--keepParent",
    app,
    NodePath.join(directory, fileName),
  ]);
  console.log(`Prepared ${fileName}`);
} finally {
  NodeFS.rmSync(extracted, { recursive: true, force: true });
  NodeFS.rmSync(upstreamExtract, { recursive: true, force: true });
}

function copy(source, destination) {
  run("/usr/bin/ditto", [source, destination]);
}

function run(command, args) {
  const result = NodeChildProcess.spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr}`);
}

function download(url, destination) {
  run("curl", ["-fL", "--retry", "3", "--connect-timeout", "30", url, "-o", destination]);
}
