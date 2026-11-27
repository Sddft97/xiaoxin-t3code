import * as NodeServices from "@effect/platform-node/NodeServices";
import { it } from "@effect/vitest";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { expect } from "vite-plus/test";

import * as ServerConfig from "./config.ts";
import * as ServerSettings from "./serverSettings.ts";
import * as StorageCleanup from "./storageCleanup.ts";
import * as StorageManagement from "./storageManagement.ts";
import * as StorageTidy from "./storageTidyService.ts";

it.effect.each(["win32", "linux"] as const)(
  "rejects storage scans and actions with typed failures on %s",
  (platform) =>
    Effect.gen(function* () {
      const tidy = yield* StorageTidy.StorageTidy;
      const management = yield* StorageManagement.StorageManagement;
      const unavailable = { message: "unsupported-platform" };
      expect(yield* Effect.flip(tidy.state)).toMatchObject({
        ...unavailable,
        _tag: "StorageTidyError",
      });
      expect(yield* Effect.flip(tidy.act({ action: "scan" }))).toMatchObject({
        ...unavailable,
        _tag: "StorageTidyError",
      });
      expect(yield* Effect.flip(management.inspect({}))).toMatchObject({
        ...unavailable,
        _tag: "StorageManagementError",
      });
      expect(yield* Effect.flip(management.manage({ action: "logs-plan" }))).toMatchObject({
        ...unavailable,
        _tag: "StorageManagementError",
      });
    }).pipe(
      Effect.provide(
        Layer.mergeAll(StorageTidy.layer, StorageManagement.layer).pipe(
          Layer.provide(
            Layer.mergeAll(
              ServerConfig.layerTest(process.cwd(), { prefix: "t3-storage-platform-" }),
              Layer.mock(ServerSettings.ServerSettingsService)({}),
              Layer.mock(StorageCleanup.StorageCleanup)({}),
              Layer.succeed(HostProcess.Platform, platform),
            ).pipe(Layer.provideMerge(NodeServices.layer)),
          ),
        ),
      ),
    ),
);
