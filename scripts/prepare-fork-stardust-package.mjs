import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeChildProcess from "node:child_process";

const [directory, expectedTag] = process.argv.slice(2);
if (!directory || !/^v[1-9]\d{0,5}\.\d{1,5}\.\d{1,5}$/.test(expectedTag ?? "")) {
  throw new Error(
    "Usage: node scripts/prepare-fork-stardust-package.mjs <directory> <vX.Y.Z> [upstream tag]",
  );
}

const upstreamTag = process.argv[4] ?? expectedTag;
const appName = "T3 Stardust.app";
const fileName = `T3-Stardust-${expectedTag.slice(1)}-macOS-arm64.zip`;
const sourceZip = NodeFS.readdirSync(directory).find((name) =>
  /^T3-Code-.*-arm64\.zip$/.test(name),
);
if (!sourceZip) throw new Error(`No packaged arm64 ZIP found in ${directory}`);

const extracted = NodeFS.mkdtempSync(NodePath.join(NodePath.dirname(directory), "fork-package-"));
try {
  run("/usr/bin/ditto", ["-x", "-k", NodePath.join(directory, sourceZip), extracted]);
  const packagedApps = NodeFS.readdirSync(extracted).filter((name) => name.endsWith(".app"));
  if (packagedApps.length !== 1)
    throw new Error(`Expected one packaged app, got ${packagedApps.length}`);
  const app = NodePath.join(extracted, appName);
  NodeFS.renameSync(NodePath.join(extracted, packagedApps[0]), app);
  const plist = NodePath.join(app, "Contents/Info.plist");
  run("/usr/bin/plutil", ["-replace", "CFBundleDisplayName", "-string", "T3 Stardust", plist]);
  run("/usr/bin/plutil", ["-replace", "CFBundleName", "-string", "T3 Stardust", plist]);
  run("/usr/bin/plutil", [
    "-replace",
    "CFBundleShortVersionString",
    "-string",
    expectedTag.slice(1),
    plist,
  ]);
  run("/usr/bin/plutil", ["-replace", "CFBundleVersion", "-string", expectedTag, plist]);
  NodeFS.writeFileSync(
    NodePath.join(app, "Contents/Resources/stardust-build.json"),
    `${JSON.stringify(
      {
        schema: 1,
        communityVersion: expectedTag.slice(1),
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
}

function run(command, args) {
  const result = NodeChildProcess.spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr}`);
}
