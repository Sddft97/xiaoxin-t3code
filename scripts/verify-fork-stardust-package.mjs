import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeChildProcess from "node:child_process";

const [directory, expectedTag] = process.argv.slice(2);
if (!directory || !expectedTag) throw new Error("Expected package directory and release tag");
const zip = NodeFS.readdirSync(directory).find((name) => /^T3-Code-.*-arm64\.zip$/.test(name));
if (!zip) throw new Error("No arm64 ZIP found");

const extracted = NodeFS.mkdtempSync(NodePath.join(NodePath.dirname(directory), "fork-payload-"));
try {
  run("/usr/bin/ditto", ["-x", "-k", NodePath.join(directory, zip), extracted]);
  const appName = NodeFS.readdirSync(extracted).find((name) => name.endsWith(".app"));
  if (!appName) throw new Error("No .app found in ZIP");
  const asar = NodeFS.readFileSync(
    NodePath.join(extracted, appName, "Contents/Resources/app.asar"),
  );
  for (const value of ["relay.t3.codes", "t3-relay", "Sign in to T3 Connect"]) {
    if (!asar.includes(value)) throw new Error(`Missing packaged T3 Connect value: ${value}`);
  }
  console.log(`Packaged T3 Connect payload verified for ${expectedTag}`);
} finally {
  NodeFS.rmSync(extracted, { recursive: true, force: true });
}

function run(command, args) {
  const result = NodeChildProcess.spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr}`);
}
