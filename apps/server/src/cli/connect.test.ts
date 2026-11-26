import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as NetService from "@t3tools/shared/Net";
import * as RelayClient from "@t3tools/shared/relayClient";
import { assert, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import { Command } from "effect/cli";

import { makeCli } from "../binCli.ts";
import { acquireRelayClientForLink } from "./connect.ts";

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
