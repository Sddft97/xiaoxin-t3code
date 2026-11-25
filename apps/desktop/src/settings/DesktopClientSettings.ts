import {
  migrateLegacyClientSettings,
  migrateMathRenderingDefault,
  stampMathDefaultMigration,
} from "@t3tools/shared/clientSettingsMigration";
import { ClientSettingsSchema, type ClientSettings } from "@t3tools/contracts";
import { fromLenientJson } from "@t3tools/shared/schemaJson";
import { resolveSymlinkTarget } from "@t3tools/shared/symlink";
import * as Context from "effect/Context";
import * as SecureRandom from "effect/crypto/SecureRandom";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import * as Ref from "effect/Ref";
import * as Semaphore from "effect/Semaphore";

import * as DesktopEnvironment from "../app/DesktopEnvironment.ts";

const decodeClientSettingsDocument = Schema.decodeEffect(
  fromLenientJson(Schema.Record(Schema.String, Schema.Unknown)),
);
const decodeClientSettingsValue = Schema.decodeUnknownEffect(ClientSettingsSchema);
const decodeClientSettingsJson = Effect.fnUntraced(function* (
  raw: string,
  loadCategorySeed: Effect.Effect<string | null>,
) {
  const document = yield* decodeClientSettingsDocument(raw);
  // Select the shape before validation so invalid legacy settings cannot become defaults.
  const wrapped = Object.hasOwn(document, "settings");
  const previous = wrapped ? document.settings : document;
  const migrated = migrateMathRenderingDefault(previous);
  const migratedDocument = migrated && (wrapped ? { ...document, settings: migrated } : migrated);
  const source = migrateLegacyClientSettings(migrated ?? previous);
  const settings = yield* decodeClientSettingsValue(source);
  const decoded = { settings, migratedDocument };
  if (typeof source !== "object" || source === null || Object.hasOwn(source, "sidebarCategories"))
    return decoded;
  const seed = yield* loadCategorySeed;
  if (seed === null) return decoded;
  const seeded = yield* decodeClientSettingsDocument(seed).pipe(
    Effect.flatMap((sidebarCategories) =>
      decodeClientSettingsValue({ ...settings, sidebarCategories }),
    ),
    Effect.catch(() =>
      Effect.logWarning("Could not read sidebar category migration data.").pipe(
        Effect.as(settings),
      ),
    ),
  );
  return { ...decoded, settings: seeded };
});
const encodeClientSettings = Schema.encodeEffect(ClientSettingsSchema);
const encodeDocument = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

export class DesktopClientSettingsReadError extends Schema.TaggedError<DesktopClientSettingsReadError>()(
  "DesktopClientSettingsReadError",
  {
    operation: Schema.Literals(["read-file", "decode-document", "migrate-document"]),
    path: Schema.String,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return `Desktop client settings read failed during ${this.operation} at ${this.path}.`;
  }
}

const DesktopClientSettingsWriteOperation = Schema.Literals([
  "create-temporary-file-name",
  "resolve-symlink",
  "encode-document",
  "create-directory",
  "write-temporary-file",
  "replace-settings-file",
]);

export class DesktopClientSettingsWriteError extends Schema.TaggedError<DesktopClientSettingsWriteError>()(
  "DesktopClientSettingsWriteError",
  {
    operation: DesktopClientSettingsWriteOperation,
    path: Schema.String,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return `Desktop client settings write failed during ${this.operation} at ${this.path}.`;
  }
}

export class DesktopClientSettings extends Context.Service<
  DesktopClientSettings,
  {
    readonly get: Effect.Effect<Option.Option<ClientSettings>, DesktopClientSettingsReadError>;
    readonly set: (
      settings: ClientSettings,
    ) => Effect.Effect<void, DesktopClientSettingsWriteError>;
  }
>()("@t3tools/desktop/settings/DesktopClientSettings") {}

const readClientSettings = (
  fileSystem: FileSystem.FileSystem,
  settingsPath: string,
  migrationPath: string,
) =>
  fileSystem.readFileString(settingsPath).pipe(
    Effect.asSome,
    Effect.catchTags({
      PlatformError: (cause) =>
        cause.reason._tag === "NotFound"
          ? Effect.succeed(Option.none<string>())
          : Effect.logWarning("Could not read desktop client settings.", cause).pipe(
              Effect.annotateLogs({ settingsPath }),
              Effect.andThen(
                Effect.fail(
                  new DesktopClientSettingsReadError({
                    operation: "read-file",
                    path: settingsPath,
                    cause,
                  }),
                ),
              ),
            ),
    }),
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeedNone,
        onSome: (raw) =>
          decodeClientSettingsJson(
            raw,
            fileSystem.readFileString(migrationPath).pipe(Effect.orElseSucceed(() => null)),
          ).pipe(
            Effect.asSome,
            Effect.catchTags({
              SchemaError: (cause) =>
                Effect.logWarning("Could not decode desktop client settings.", cause).pipe(
                  Effect.annotateLogs({ settingsPath }),
                  Effect.andThen(
                    Effect.fail(
                      new DesktopClientSettingsReadError({
                        operation: "decode-document",
                        path: settingsPath,
                        cause,
                      }),
                    ),
                  ),
                ),
            }),
          ),
      }),
    ),
  );

const writeClientSettings = Effect.fnUntraced(function* (input: {
  readonly fileSystem: FileSystem.FileSystem;
  readonly path: Path.Path;
  readonly settingsPath: string;
  readonly contents: string;
  readonly suffix: string;
}): Effect.fn.Return<void, DesktopClientSettingsWriteError> {
  const targetPath = yield* resolveSymlinkTarget(input.settingsPath).pipe(
    Effect.provideService(FileSystem.FileSystem, input.fileSystem),
    Effect.provideService(Path.Path, input.path),
    Effect.mapError(
      (cause) =>
        new DesktopClientSettingsWriteError({
          operation: "resolve-symlink",
          path: input.settingsPath,
          cause,
        }),
    ),
  );
  const directory = input.path.dirname(targetPath);
  const tempPath = `${targetPath}.${process.pid}.${input.suffix}.tmp`;
  yield* input.fileSystem.makeDirectory(directory, { recursive: true }).pipe(
    Effect.mapError(
      (cause) =>
        new DesktopClientSettingsWriteError({
          operation: "create-directory",
          path: directory,
          cause,
        }),
    ),
  );
  yield* Effect.gen(function* () {
    yield* input.fileSystem.writeFileString(tempPath, `${input.contents}\n`).pipe(
      Effect.mapError(
        (cause) =>
          new DesktopClientSettingsWriteError({
            operation: "write-temporary-file",
            path: tempPath,
            cause,
          }),
      ),
    );
    yield* input.fileSystem.rename(tempPath, targetPath).pipe(
      Effect.mapError(
        (cause) =>
          new DesktopClientSettingsWriteError({
            operation: "replace-settings-file",
            path: input.settingsPath,
            cause,
          }),
      ),
    );
  }).pipe(Effect.ensuring(input.fileSystem.remove(tempPath, { force: true }).pipe(Effect.ignore)));
});

export const make = Effect.gen(function* () {
  const environment = yield* DesktopEnvironment.DesktopEnvironment;
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const random = yield* SecureRandom.SecureRandom;

  const settingsPath = environment.clientSettingsPath;
  const lock = yield* Semaphore.make(1);
  const write = Effect.fnUntraced(function* (document: unknown) {
    const contents = yield* encodeDocument(document).pipe(
      Effect.mapError(
        (cause) =>
          new DesktopClientSettingsWriteError({
            operation: "encode-document",
            path: settingsPath,
            cause,
          }),
      ),
    );
    const uuid = yield* random.uuidV4();
    yield* writeClientSettings({
      fileSystem,
      path,
      settingsPath,
      contents,
      suffix: uuid.replace(/-/g, ""),
    });
  });

  return DesktopClientSettings.of({
    get: lock
      .withPermits(1)(
        Effect.gen(function* () {
          const saved = yield* readClientSettings(
            fileSystem,
            settingsPath,
            path.join(path.dirname(settingsPath), "sidebar-categories-migration.json"),
          );
          if (Option.isNone(saved)) return Option.none();
          const { settings, migratedDocument } = saved.value;
          if (migratedDocument) {
            yield* write(migratedDocument).pipe(
              Effect.mapError(
                (cause) =>
                  new DesktopClientSettingsReadError({
                    operation: "migrate-document",
                    path: settingsPath,
                    cause,
                  }),
              ),
            );
          }
          return Option.some(settings);
        }),
      )
      .pipe(Effect.withSpan("desktop.clientSettings.get")),
    set: Effect.fn("desktop.clientSettings.set")(function (settings) {
      return lock.withPermits(1)(
        encodeClientSettings(settings).pipe(
          Effect.mapError(
            (cause) =>
              new DesktopClientSettingsWriteError({
                operation: "encode-document",
                path: settingsPath,
                cause,
              }),
          ),
          Effect.flatMap((encoded) => write(stampMathDefaultMigration(encoded))),
        ),
      );
    }),
  });
});

export const layer = Layer.effect(DesktopClientSettings, make);

export const layerTest = (initialSettings: Option.Option<ClientSettings> = Option.none()) =>
  Layer.effect(
    DesktopClientSettings,
    Effect.gen(function* () {
      const settingsRef = yield* Ref.make(initialSettings);
      return DesktopClientSettings.of({
        get: Ref.get(settingsRef),
        set: Effect.fn("DesktopClientSettings.set")(function (settings) {
          return Ref.set(settingsRef, Option.some(settings));
        }),
      });
    }),
  );
