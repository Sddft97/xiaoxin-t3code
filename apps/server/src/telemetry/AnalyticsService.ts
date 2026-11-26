import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export class AnalyticsService extends Context.Service<
  AnalyticsService,
  {
    readonly record: (
      event: string,
      properties?: Readonly<Record<string, unknown>>,
    ) => Effect.Effect<boolean>;
    readonly flush: Effect.Effect<void>;
    readonly recordOwners: (
      owners: ReadonlyArray<{ readonly source: string; readonly ownerId: string }>,
      observedBy: "server" | "client",
    ) => Effect.Effect<void>;
  }
>()("t3/telemetry/AnalyticsService") {}

export const layerDisabled = Layer.succeed(AnalyticsService, {
  record: Effect.fn("AnalyticsService.record.disabled")(() => Effect.succeed(false)),
  flush: Effect.void,
  recordOwners: Effect.fn("AnalyticsService.recordOwners.disabled")(() => Effect.void),
});
