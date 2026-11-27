import type { ManagedPolicySummary } from "@t3tools/contracts";
import {
  nodeProcessRuntimeAttributes,
  processServiceInstanceId,
} from "@t3tools/shared/observability";
import { isRelayTracingEnabled } from "@t3tools/shared/otelEnvironment";
import * as RelayTracing from "@t3tools/shared/relayTracing";

import { resolveRelayClientTracingConfig } from "./publicConfig.ts";

const relayClientTracingConfig = resolveRelayClientTracingConfig();

/**
 * `false` once the environment or a managed policy opted out. Until the desktop has read the
 * login shell, a shell-profile opt-out is still unknown, so tracing stays off.
 */
export const allowedFor = (
  env: Readonly<Record<string, string | undefined>>,
  policy: ManagedPolicySummary | undefined,
) =>
  policy?.limits?.telemetry !== false &&
  env.T3CODE_DESKTOP_SHELL_DISCOVERY_PENDING !== "1" &&
  isRelayTracingEnabled(env);

/** Relay traces leave the machine for T3 Connect, so a policy with `telemetry: false` stops them. */
export const relayLayer = (
  resource: Omit<RelayTracing.RelayClientTracingResource, "serviceInstanceId">,
  _tracingConfig: Parameters<typeof RelayTracing.layer>[0] = relayClientTracingConfig,
) => RelayTracing.layer(null, { ...resource, serviceInstanceId: processServiceInstanceId() });

export const layerHeadlessRelayClient = relayLayer({
  serviceName: "t3code-server",
  runtime: "node",
  attributes: nodeProcessRuntimeAttributes(),
  client: "headless-cli",
});

export const layerServerRelayBroker = relayLayer({
  serviceName: "t3code-server",
  runtime: "node",
  attributes: nodeProcessRuntimeAttributes(),
  client: "environment-server",
  component: "relay-broker",
});
