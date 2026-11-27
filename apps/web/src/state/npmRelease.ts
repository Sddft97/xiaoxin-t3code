import {
  AuthOrchestrationReadScope,
  type EnvironmentId,
  type ServerConfig,
  ServerNpmReleaseError,
} from "@t3tools/contracts";
import { cliServiceUpdateSpec, isNewerCliServiceRelease } from "@t3tools/shared/cliRelease";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { Atom } from "effect/reactivity";
import { msg } from "gt-react";

import { m, type MessageResolver } from "../i18n/messages";

import { environmentSummaries } from "./presentation";
import { environmentAtomList } from "./environmentAtomList";
import { primaryEnvironmentIdAtom } from "./primaryEnvironment";
import { serverEnvironment } from "./server";
import { environmentSession, sessionHasScope } from "./session";

const isServerNpmReleaseError = Schema.is(ServerNpmReleaseError);

function unsupportedLookup(config: ServerConfig | null): ServerNpmReleaseError | null {
  if (config === null) {
    return new ServerNpmReleaseError({
      reason: m(msg("Connect to this server to check releases.")),
    });
  }
  return config.environment.capabilities.npmReleaseLookup === true
    ? null
    : new ServerNpmReleaseError({
        reason: m(
          msg("This server does not support registry lookups. Update it before switching tracks."),
        ),
      });
}

export function npmReleaseFailureMessage(
  cause: Cause.Cause<unknown>,
  resolve: MessageResolver = m,
): string {
  const error = Option.getOrUndefined(Cause.findErrorOption(cause));
  return isServerNpmReleaseError(error)
    ? error.message
    : resolve(
        msg(
          "Could not check this environment's npm registry. Check the connection and registry settings.",
        ),
      );
}

export const npmReleaseAtom = Atom.family((spec: string) =>
  Atom.make((get) => {
    const primary = get(primaryEnvironmentIdAtom);
    // With the desktop's local server turned off there is no primary, so a connected server answers.
    const candidates =
      primary === null ? get(environmentSummaries.connectedEnvironmentIdsAtom) : [primary];
    const environmentId =
      candidates.find(
        (id) => unsupportedLookup(get(serverEnvironment.configValueAtom(id))) === null,
      ) ?? candidates[0];
    if (environmentId === undefined) {
      return Effect.fail(
        new ServerNpmReleaseError({ reason: m(msg("Connect to a server to check releases.")) }),
      );
    }
    const unsupported = unsupportedLookup(get(serverEnvironment.configValueAtom(environmentId)));
    if (unsupported !== null) return Effect.fail(unsupported);
    return get
      .result(serverEnvironment.npmRelease({ environmentId, input: { spec } }))
      .pipe(
        Effect.map((release) =>
          release === null
            ? null
            : { version: release.version, databaseMigration: release.databaseMigration },
        ),
      );
  }).pipe(Atom.withLabel(`npm-release:${spec}`)),
);

export const serviceUpdateQueryAtom = Atom.family((environmentId: EnvironmentId) =>
  Atom.make((get) => {
    const server = get(serverEnvironment.configValueAtom(environmentId))?.environment;
    if (
      server?.capabilities.serverSelfUpdate !== "boot-service" ||
      server.capabilities.npmReleaseLookup !== true ||
      !sessionHasScope(
        get(environmentSession.sessionStateAtom(environmentId)),
        AuthOrchestrationReadScope,
      )
    )
      return null;

    const spec = cliServiceUpdateSpec(server.serverVersion);
    if (spec === undefined) return null;
    return {
      currentVersion: server.serverVersion,
      query: serverEnvironment.npmRelease({ environmentId, input: { spec } }),
    };
  }).pipe(Atom.withLabel(`service-update-query:${environmentId}`)),
);

export const serviceUpdateVersionAtom = Atom.family((environmentId: EnvironmentId | null) =>
  Atom.make((get) => {
    if (environmentId === null) return null;
    const service = get(serviceUpdateQueryAtom(environmentId));
    if (service === null) return null;
    const release = get(service.query);
    return release._tag === "Success" &&
      release.value !== null &&
      isNewerCliServiceRelease(service.currentVersion, release.value.version)
      ? release.value.version
      : null;
  }),
);

export const serviceUpdateVersionsAtom = environmentAtomList(
  "service-update-versions",
  serviceUpdateVersionAtom,
);
