import { defineRule } from "@oxlint/plugins";
import * as Option from "effect/Option";

import legacyReads from "../platform-read-baseline.json" with { type: "json" };
import { getPropertyName, isIdentifier, unwrapExpression } from "../utils.ts";

const adapterFiles = new Set([
  "apps/web/src/lib/PlatformProfile.ts",
  "apps/desktop/src/preload.ts",
  "packages/shared/src/HostProcess.ts",
]);

export default defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Route OS detection through PlatformProfile or HostProcess.",
    },
  },
  createOnce(context) {
    let allowed = 0;
    return {
      before() {
        const filename = context.filename.replaceAll("\\", "/");
        const file = /(?:^|\/)((?:apps|packages|scripts|oxlint-plugin-t3code)\/.*)$/.exec(
          filename,
        )?.[1];
        if (file && adapterFiles.has(file)) return false;
        allowed = file ? ((legacyReads as Record<string, number>)[file] ?? 0) : 0;
      },
      MemberExpression(node) {
        const property = getPropertyName(node.property);
        if (Option.isNone(property) || property.value !== "platform") return;
        const object = unwrapExpression(node.object);
        const direct = isIdentifier(object, "navigator") || isIdentifier(object, "process");
        const qualified =
          Option.isSome(object) &&
          object.value.type === "MemberExpression" &&
          isIdentifier(unwrapExpression(object.value.object), "globalThis") &&
          Option.exists(
            getPropertyName(object.value.property),
            (name) => name === "navigator" || name === "process",
          );
        if (!direct && !qualified) return;
        if (allowed > 0) {
          allowed -= 1;
          return;
        }
        context.report({
          node,
          message: "Use PlatformProfile or HostProcess for platform detection.",
        });
      },
    };
  },
});
