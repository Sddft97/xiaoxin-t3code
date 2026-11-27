# Product usage data and diagnostics

**In the Stardust fork, product usage data is opt-in and off by default.** The server records,
buffers and sends nothing, and makes no request to the endpoint below, until you turn on
**Settings > About > Share anonymous usage data** (the `telemetryEnabled` server setting). Settings
saved before this option existed count as off. Turning it off stops sending at once and discards
events not yet sent. The environment variable and managed policy described below can still force
it off; neither can turn it on. The endpoint `ingest.t3.codes` is run by the upstream T3 Code
project, not by this fork. The rest of this page describes what is sent once you opt in.

The T3 Code server sends product usage events to T3 Code's own endpoint at `ingest.t3.codes`,
associated with a hashed account or installation identifier. To count how many installations one person
uses, the server also sends hashed account identifiers: your T3 Connect account, your OpenAI and
Claude accounts when you are signed in, and a random identifier for each device that connects. The endpoint keeps a copy of each
event and forwards events to PostHog. Events include the provider, model, reasoning effort,
permission mode, turn and request results, duration, release channel, and token counts when
available. Child-agent token counts are reported separately from the main agent's. Events include
the model ID the provider used, including custom models and models served by a custom endpoint.

## Product usage events

The server sends usage events to `ingest.t3.codes` under a hashed random install ID (plus a hashed T3 Connect account ID when signed in, and random client device IDs). Events contain provider, catalog model name (non-catalog models report as custom), reasoning effort, permission mode, turn/request outcome, duration, release channel, and token counts.

## Disable telemetry

- **Server / CLI**: Set `T3CODE_TELEMETRY_ENABLED=false` or `DO_NOT_TRACK=1` before starting (`DO_NOT_TRACK=1` takes precedence). CI environments (`CI`, `GITHUB_ACTIONS`, `GITLAB_CI`, `JENKINS_URL`) disable telemetry by default unless `T3CODE_TELEMETRY_ENABLED=true`.
- **Desktop app**: Export `T3CODE_TELEMETRY_ENABLED=false` or `DO_NOT_TRACK=1` in your shell profile (macOS/Linux) or user environment variables (Windows) and restart.
- **Managed policy**: Administrators can set `"telemetry": false` in [managed policy](./managed-policy.md#other-capabilities) for servers and desktop apps.
- **Mobile app**: Toggle **Send crash reports** and **Send connection traces** separately in **Settings → About T3 Code → Diagnostics**.

## Relay connection diagnostics

T3 Connect sends connection timings, request paths, environment/thread IDs, and error types (no addresses, logs, or stack frames) to Axiom. Disabled by the server telemetry opt-outs above or by `T3CODE_OTEL_SDK_DISABLED` / `OTEL_SDK_DISABLED`.

## Agent feedback

Optional tool for agents to report T3 Code bugs or missing capabilities. Configure in **Settings → Labs → Agent feedback**:

- **Off** (default): Feedback tools and `t3 feedback` are disabled.
- **When I ask**: Agents submit a report only when you ask, shown as an interactive approval card before anything leaves your machine.
- **Automatic**: Also sends minimal automated reports (problem kind + tool/command name only—no text or conversation) when an agent hits a T3 tool failure; enables `t3 feedback` CLI reporting (up to 10/hour).

Approval cards show exact payloads (expected/actual/workaround, turn outline with no text, and optional **Include the conversation** up to 16 KB). File paths, usernames, hostnames, git remotes, and secret-like strings are scrubbed before saving, and reports use one-off random IDs. Inspect local reports with `t3 feedback list [--json]`.

## Agent activity for mobile notifications

**Settings → Sharing & access → Publish agent activity** sends project/thread titles, model names, and turn status to the T3 Connect relay for [mobile notifications and live activities](./mobile-notifications.md). This is independent of telemetry—turn it off directly on the host if you don't want it.

## Export diagnostics to your own OpenTelemetry receiver

Open **Settings → Maintenance → Diagnostics** (per environment) and enter OTLP HTTP endpoints (e.g. `http://localhost:4318/v1/traces`), save, and restart the server. Use **Test** to verify connectivity.

`T3CODE_OTLP_*_URL` and standard `OTEL_EXPORTER_OTLP_*` env vars override saved settings (use `T3CODE_OTLP_HEADERS` / `T3CODE_OTLP_PROTOCOL=http/protobuf` or the standard `OTEL_EXPORTER_OTLP_*` equivalents for auth and protobuf).
