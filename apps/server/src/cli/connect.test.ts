// @effect-diagnostics nodeBuiltinImport:off - CLI integration exercises the Node HTTP boundary.

import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as NetService from "@t3tools/shared/Net";
import * as RelayClient from "@t3tools/shared/relayClient";
import { assert, expect, it } from "@effect/vitest";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as TestConsole from "effect/testing/TestConsole";
import { Command } from "effect/cli";

import { makeCli } from "../binCli.ts";
import {
  makePersistedServerRuntimeState,
  persistServerRuntimeState,
} from "../serverRuntimeState.ts";
import { acquireRelayClientForLink } from "./connect.ts";
import { resolveHostCliCommand } from "./invocation.ts";

const managedExecutable = {
  status: "available",
  executablePath: "/tmp/cloudflared",
  source: "managed",
  version: RelayClient.CLOUDFLARED_VERSION,
} as const;

it.effect("does not install the relay client when the user declines the managed download", () =>
  Effect.gen(function* () {
    let installCalls = 0;
    const result = yield* acquireRelayClientForLink(
      {
        resolve: Effect.succeed({
          status: "missing",
          version: RelayClient.CLOUDFLARED_VERSION,
        }),
        install: Effect.sync(() => {
          installCalls += 1;
          return managedExecutable;
        }),
        installWithProgress: () =>
          Effect.sync(() => {
            installCalls += 1;
            return managedExecutable;
          }),
        pruneManagedVersions: Effect.void,
      },
      () => Effect.succeed(false),
      () => Effect.void,
    );

    assert.isTrue(Option.isNone(result));
    assert.equal(installCalls, 0);
  }),
);

it.layer(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer, NetService.layer))(
  "Stardust CLI Connect retirement",
  (it) => {
    it.effect.each(["link", "login", "logout", "publish", "status", "unlink"])(
      "hides the retired Connect command and rejects its %s subcommand",
      (subcommand) =>
        Effect.gen(function* () {
          const cli = makeCli();
          const connect = cli.subcommands
            .flatMap((group) => group.commands)
            .find((command) => command.name === "connect");
          expect(connect?.unlisted).toBe(true);
          const error = yield* Command.runWith(cli, { version: "0.0.0" })([
            "connect",
            subcommand,
          ]).pipe(Effect.flip);
          expect(error).toMatchObject({ _tag: "ShowHelp", commandPath: ["t3", "connect"] });
        }),
    );
  },
);

it.layer(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer, NetService.layer))(
  "t3 connect link next step",
  (it) => {
    it.effect("tells the user to restart a server that is already running, not to start one", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const baseDir = yield* fs.makeTempDirectoryScoped({ prefix: "t3-connect-link-test-" });
        const relayClientPath = `${baseDir}/bin/cloudflared`;
        yield* fs.makeDirectory(`${baseDir}/bin`, { recursive: true });
        yield* fs.writeFileString(
          relayClientPath,
          `#!/bin/sh\necho "cloudflared version ${RelayClient.CLOUDFLARED_VERSION}"\n`,
        );
        yield* fs.chmod(relayClientPath, 0o755);
        yield* fs.makeDirectory(`${baseDir}/userdata/secrets`, { recursive: true });
        yield* fs.writeFileString(
          `${baseDir}/userdata/secrets/cloud-cli-oauth-token.bin`,
          JSON.stringify({
            accessToken: "access",
            refreshToken: "refresh",
            expiresAtEpochMs: 4_102_444_800_000,
            identity: "user@example.com",
          }),
        );
        const state = yield* makePersistedServerRuntimeState({
          config: { host: "127.0.0.1", devUrl: undefined },
          port: 3773,
        });
        yield* persistServerRuntimeState({
          path: `${baseDir}/userdata/server-runtime.json`,
          state: { ...state, pid: process.pid },
        });

        yield* Command.runWith(makeCli({ cloudEnabled: true }), { version: "0.0.0" })([
          "connect",
          "link",
          "--headless",
          "--base-dir",
          baseDir,
        ]).pipe(
          Effect.provide(
            ConfigProvider.layer(
              ConfigProvider.fromEnv({ env: { T3CODE_CLOUDFLARED_PATH: relayClientPath } }),
            ),
          ),
        );

        const printed = (yield* TestConsole.logLines).join("\n");
        const restart = yield* resolveHostCliCommand("service restart", ["--base-dir", baseDir]);
        const serve = yield* resolveHostCliCommand("serve", ["--base-dir", baseDir]);
        assert.include(printed, "✓ Authorized as user@example.com");
        assert.include(printed, `\`${restart.command}\``);
        assert.notInclude(printed, `\`${serve.command}\``);
      }).pipe(
        Effect.scoped,
        Effect.provideService(HostProcess.Environment, {}),
        Effect.provide(Layer.fresh(TestConsole.layer)),
      ),
    );
  },
);
