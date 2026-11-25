import type { OrchestrationV2ProviderFailure } from "@t3tools/contracts";

const legacyFailures = {
  subscription_sharing_v2_user_not_eligible: {
    message:
      "ChatGPT sharing is unavailable for this account or workspace. Use another provider or check its sharing policy.",
  },
  subscription_sharing_usage_limit_exceeded: {
    message:
      "Your ChatGPT usage limit was reached. Check ChatGPT Usage settings for your available allowance.",
  },
  subscription_sharing_workplace_individual_usage_limit_exceeded: {
    message:
      "You reached your workspace's limit for using ChatGPT in other apps. Ask your workspace admin to increase it.",
  },
  subscription_sharing_usage_unavailable: {
    message: "ChatGPT usage is temporarily unavailable. Try again shortly.",
  },
  subscription_sharing_unsupported_capability: {
    message:
      "Codex used a feature that ChatGPT sharing does not support. Use another provider for this request.",
  },
  subscription_sharing_v2_client_not_enabled: {
    message:
      "This app is not enabled for this ChatGPT connection. Use your existing CLI or another provider.",
  },
  subscription_sharing_v2_route_not_supported: {
    message: "ChatGPT does not support this request route.",
  },
  subscription_sharing_v2_invalid_user: {
    message:
      "ChatGPT could not validate this connection. Check the selected account and sharing permissions.",
  },
  subscription_sharing_v2_user_unavailable: {
    message: "ChatGPT is temporarily unavailable. Try again shortly.",
  },
} as const;
const failures = {
  invalid_encrypted_content: {
    message:
      "Codex could not verify this session's encrypted conversation history. Send another message to continue in a fresh session with the visible conversation history.",
  },
  ...legacyFailures,
  subscription_sharing_user_not_eligible: legacyFailures.subscription_sharing_v2_user_not_eligible,
  subscription_sharing_route_not_supported:
    legacyFailures.subscription_sharing_v2_route_not_supported,
  subscription_sharing_invalid_user: legacyFailures.subscription_sharing_v2_invalid_user,
  subscription_sharing_user_unavailable: legacyFailures.subscription_sharing_v2_user_unavailable,
  chatpass_v2_scope_not_authorized: {
    message:
      "This ChatGPT grant does not authorize the request. Check the connection's sharing permissions.",
  },
  chatpass_v2_invalid_authorization_context: {
    message:
      "ChatGPT could not authorize this connection. Check the client and sharing permissions.",
  },
};
const usageLimitCodes = new Set<string>([
  "subscription_sharing_usage_limit_exceeded",
  "subscription_sharing_workplace_individual_usage_limit_exceeded",
]);

export const CODEX_SHARING_UNSUPPORTED = "subscription_sharing_unsupported_capability";

function isManagedCode(value: unknown): value is keyof typeof failures {
  return typeof value === "string" && Object.hasOwn(failures, value);
}

export function classifyCodexManagedError(
  value: unknown,
  managedSharing = false,
):
  | {
      readonly code: keyof typeof failures;
      readonly message: string;
      readonly usageLimit: boolean;
      readonly codexSharing?: NonNullable<OrchestrationV2ProviderFailure["codexSharing"]>;
    }
  | undefined {
  let code: keyof typeof failures | undefined;
  let param: "input" | "tools" | undefined;
  const messages: string[] = [];
  const visit = (value: unknown, depth: number) => {
    if (depth === 0) return;
    if (typeof value === "string") {
      const raw = value.trim();
      if (isManagedCode(raw)) {
        code ??= raw;
        return;
      }
      // Codex's HTTP error display wraps the JSON body with status and URL metadata.
      const json =
        /(?:unexpected\s+)?status 400(?: Bad Request)?:\s*(\{[\s\S]*?\})(?:,\s*url:|$)/i.exec(
          raw,
        )?.[1] ?? raw;
      if (json.startsWith("{")) {
        try {
          visit(JSON.parse(json), depth - 1);
          return;
        } catch {
          // A malformed body is ordinary text, not a structured error.
        }
      }
      messages.push(raw);
    } else if (typeof value === "object" && value !== null) {
      if ("code" in value && isManagedCode(value.code)) code ??= value.code;
      if ("param" in value && (value.param === "input" || value.param === "tools")) {
        param ??= value.param;
      }
      for (const key of [
        "error",
        "data",
        "cause",
        "additionalDetails",
        "errorMessage",
        "message",
      ]) {
        visit(Reflect.get(value, key), depth - 1);
      }
    }
  };
  visit(value, 7);
  const detail = messages.join(" ");
  code ??= detail.includes("has reached their Subscription Sharing usage limit")
    ? "subscription_sharing_usage_limit_exceeded"
    : managedSharing &&
        /\bunsupported input items\b/i.test(detail) &&
        /\badditional[ _]tools\b/i.test(detail)
      ? CODEX_SHARING_UNSUPPORTED
      : undefined;
  if (code === undefined) return undefined;
  const failure = { ...failures[code], code, usageLimit: usageLimitCodes.has(code) };
  if (code !== CODEX_SHARING_UNSUPPORTED) return failure;

  const reason = /\bagent_message\b/i.test(detail)
    ? "history"
    : /tool ['"]namespace['"]/i.test(detail)
      ? "namespace"
      : /(?:input item|type) ['"]additional_tools['"]/i.test(detail)
        ? "additional_tools"
        : "unknown";
  const codexSharing = { ...(param === undefined ? {} : { param }), reason } as const;
  return {
    ...failure,
    codexSharing,
    message:
      reason === "namespace"
        ? "Codex sent a tool namespace that ChatGPT sharing does not support. Use another provider for this request."
        : reason === "additional_tools"
          ? "Codex sent an input item that ChatGPT sharing does not support. Use another provider for this request."
          : failure.message,
  };
}
