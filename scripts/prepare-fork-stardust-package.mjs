import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeChildProcess from "node:child_process";

const [directory, expectedTag, upstreamTag] = process.argv.slice(2);
if (!directory || !/^v[1-9]\d{0,5}\.\d{1,5}\.\d{1,5}$/.test(expectedTag ?? "") || !upstreamTag) {
  throw new Error(
    "Usage: node scripts/prepare-fork-stardust-package.mjs <directory> <vX.Y.Z> <upstream tag>",
  );
}

const releaseVersion = expectedTag.slice(1);
const sourceZip = NodeFS.readdirSync(directory).find((name) =>
  /^T3-Code-.*-arm64\.zip$/.test(name),
);
if (!sourceZip) throw new Error(`No packaged arm64 ZIP found in ${directory}`);

const fileName = `T3-Stardust-${releaseVersion}-macOS-arm64.zip`;
const extracted = NodeFS.mkdtempSync(NodePath.join(NodePath.dirname(directory), "fork-package-"));
try {
  run("/usr/bin/ditto", ["-x", "-k", NodePath.join(directory, sourceZip), extracted]);
  const bundles = NodeFS.readdirSync(extracted).filter((name) => name.endsWith(".app"));
  if (bundles.length !== 1) throw new Error(`Expected one built app, found ${bundles.length}`);
  const app = NodePath.join(extracted, "T3 Stardust.app");
  NodeFS.renameSync(NodePath.join(extracted, bundles[0]), app);
  const plist = NodePath.join(app, "Contents/Info.plist");
  if (
    run("/usr/bin/plutil", ["-extract", "CFBundleIdentifier", "raw", plist]).trim() !==
    "com.t3tools.t3code"
  ) {
    throw new Error("The built app bundle identifier does not match installed T3 Stardust apps");
  }
  for (const [key, value] of [
    ["CFBundleDisplayName", "T3 Stardust"],
    ["CFBundleShortVersionString", releaseVersion],
  ])
    run("/usr/bin/plutil", ["-replace", key, "-string", value, plist]);
  NodeFS.writeFileSync(
    NodePath.join(app, "Contents/Resources/stardust-build.json"),
    `${JSON.stringify(
      {
        schema: 1,
        // Installed v1.2.4 checks communityVersion against the fork release tag.
        communityVersion: releaseVersion,
        forkReleaseVersion: releaseVersion,
        customBuild: `fork-${upstreamTag}`,
        releaseVersion: expectedTag,
        publicRelease: false,
        installed: true,
        releaseChannel: "stable",
        signingMode: "ad-hoc",
        upstreamTag,
        sourceCommit: run("git", ["rev-parse", "HEAD"]).trim(),
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
  return result.stdout;
}
