// @effect-diagnostics nodeBuiltinImport:off - The guard scans source files before loading any product service.
import * as NodeFSP from "node:fs/promises";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";
import { describe, expect, it } from "vite-plus/test";

import allowlist from "./stardustPrivacyAllowlist.json" with { type: "json" };

const repository = NodeURL.fileURLToPath(new URL("../../../../", import.meta.url));
const roots = [
  "apps/desktop",
  "apps/mobile",
  "apps/server",
  "apps/web",
  "packages",
  "scripts",
  "infra/relay",
];
const extensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".html",
  ".css",
  ".kt",
  ".swift",
  ".sh",
  ".ps1",
  ".yml",
  ".yaml",
]);
const excluded = new Set([
  "node_modules",
  "dist",
  "dist-electron",
  "build",
  "target",
  "coverage",
  "fixtures",
  "test",
  "tests",
  "testkit",
  "translations",
  "dev-replay",
  ".git",
  ".cache",
  ".expo",
]);

// Scan shipped source and build inputs. Test fixtures can contain deliberately hostile examples.
const patterns = [
  /(?:https?|wss?):\/\/(?:[\w-]+\.)*t3\.codes\b(?:\/[^\s"'\x60<>]*)?/giu,
  /\b(?:[\w-]+\.)*(?:ingest|clerk|relay|app)\.t3\.codes\b/giu,
  /\b(?:[\w-]+\.)*posthog\.com\b/giu,
  /\bph[cp]_[\w-]{6,}\b|\b(?:T3CODE_|VITE_)?POSTHOG_(?:HOST|KEY|TOKEN|API_KEY)\b/giu,
  /\b(?:api\.)?axiom\.co\b/giu,
  /https?:\/\/[^\s"'\x60<>]+(?::431[78]\b|\/v1\/(?:traces|metrics|logs)\b)(?:\/[^\s"'\x60<>]*)?/giu,
];

function scanLine(line: string): string[] {
  const matches = patterns.flatMap((pattern) => [...line.matchAll(pattern)]);
  // A URL can match both the protocol rule and the bare-host rule.
  return matches
    .filter(
      (match) =>
        !matches.some(
          (outer) =>
            outer !== match &&
            outer.index <= match.index &&
            outer.index + outer[0].length >= match.index + match[0].length &&
            outer[0].length > match[0].length,
        ),
    )
    .map((match) => match[0]);
}

async function* sourceFiles(directory: string): AsyncGenerator<string> {
  for (const entry of await NodeFSP.readdir(NodePath.join(repository, directory), {
    withFileTypes: true,
  })) {
    const path = NodePath.join(directory, entry.name);
    if (entry.isDirectory() && !excluded.has(entry.name)) {
      yield* sourceFiles(path);
    } else if (
      entry.isFile() &&
      extensions.has(NodePath.extname(entry.name)) &&
      !/\.(?:test|spec|fixture|stories)\./u.test(entry.name) &&
      NodePath.basename(path) !== "stardustPrivacyAllowlist.json" &&
      NodePath.basename(path) !== "StardustPrivacyGuard.test.ts"
    ) {
      yield path;
    }
  }
}

describe("Stardust privacy source guard", () => {
  it("recognizes hosted URLs, service keys and hard-coded collector URLs", () => {
    expect(scanLine("https://nightly.app.t3.codes/")).toEqual(["https://nightly.app.t3.codes/"]);
    expect(scanLine("phc_example_project_key")).toEqual(["phc_example_project_key"]);
    expect(scanLine("http://localhost:4318/v1/traces")).toEqual([
      "http://localhost:4318/v1/traces",
    ]);
    expect(scanLine("https://collector.example/v1/metrics")).toEqual([
      "https://collector.example/v1/metrics",
    ]);
  });

  it("permits only individually documented non-network references", async () => {
    const seen = new Set<string>();
    const violations: string[] = [];
    const allowed = new Map(allowlist.map((entry) => [`${entry.path}\0${entry.line}`, entry]));
    for (const root of roots) {
      for await (const path of sourceFiles(root)) {
        const source = await NodeFSP.readFile(NodePath.join(repository, path), "utf8");
        for (const [index, line] of source.split("\n").entries()) {
          const matches = scanLine(line);
          if (matches.length === 0) continue;
          const key = `${path}\0${line.trim()}`;
          if (!allowed.has(key) || seen.has(key)) {
            violations.push(`${path}:${index + 1}: ${matches.join(", ")}`);
          } else {
            seen.add(key);
          }
        }
      }
    }
    expect(violations).toEqual([]);
    expect([...allowed.keys()].filter((key) => !seen.has(key))).toEqual([]);
  });
});
