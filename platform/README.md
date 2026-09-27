# Blue MCP Platform

This directory is the control-plane specification for Conexao Azul MCP services.

## Goals

1. Keep one versioned inventory of every production, internal and code-ready MCP.
2. Prefer one authenticated ingress instead of exposing individual host ports.
3. Validate MCP identity and protocol, not only HTTP 200.
4. Default operational/database MCPs to read-only and gate high-impact writes.
5. Keep secrets in Docker Secrets or OCI Vault; never in service arguments, repository files or plaintext environment files.
6. Use immutable image digests for promoted production services.

## Target topology

```text
ChatGPT / Claude / Codex / Inspector
                 |
        Cloudflare Access/OAuth
                 |
     https://mcp.conexaoazul.com
                 |
        MCP Gateway / router
                 |
  +--------------+-----------------------------+
  |              |              |              |
 Odoo         Chatwoot       Portainer      n8n/Kuma
  |              |              |              |
 DB MCP       Transcribe     Cloudflare      Apify
```

## Promotion gate

A service is not considered green because its TCP port or `/healthz` returns 200.

Required gate:

```text
DNS/TLS
  -> authentication/authorization
  -> MCP protocol negotiation
  -> expected server identity
  -> tools/list
  -> tool-schema lint
  -> safe read-only canary
  -> evidence saved with runtime image digest
```

Use `smoke-inspector.sh` for the protocol-level portion.

## Current findings

Cloudflare MCP Server Portals is the authoritative control plane. The client-facing `portal_list_servers` view can lag it.

| Portal | Client URL pattern | Current servers |
|---|---|---:|
| Main / CRM | `https://mcp.conexaoazul.com/mcp/{server_id}` | 9 |
| Financeiro | `https://financeiro-mcp.conexaoazul.com/mcp/{server_id}` | 6 |
| SAMU MAIS AI | `https://samumais-mcp.conexaoazul.com/mcp/{server_id}` | 7 |
| Portal17 | `https://portal17-mcp.conexaoazul.com/mcp/{server_id}` | 1 |

Main currently includes Context7, Cloudflare Docs, Uptime Kuma, Odoo Consultas, n8n, Chatwoot, Portainer, Postiz and Prometheus. Prometheus is default-disabled with an explicit 11-tool read-only allowlist. Financeiro includes Banco Inter, three Asaas environments, Asaas Docs and Odoo Consultas. SAMU has the read-only replica plus role-specific profiles and the Conta Azul IMTECH/Savvis view. Portal17 has its dedicated Odoo 17 database toolbox server.

- The raw origin is `mcp-origin.conexaoazul.com`; the canonical `mcp.conexaoazul.com` host is Cloudflare MCP Server Portals / Agents Gateway, not a raw reverse-proxy host.
- The initial six-server portal view is therefore incomplete: Postiz is already ready in the main Portal.
- Runtime also has Blue Odoo Ops, Apify, Cloudflare official/legacy bridges, Portal17 Toolbox and Transcription MCP.
- Chatwoot and Portainer bridges include their service prefix in the native Streamable HTTP path (`/chatwoot/mcp` and `/portainer/mcp`). The previous Traefik StripPrefix behavior conflicted with those paths. Higher-priority path-preserving routers were added without removing the legacy routers.
- Chatwoot is now source-built on MCP server v2 and supports MCP `2026-07-28` plus legacy `2025-11-25`; both surfaces expose the same 123 tools, with a zero-name diff against the pre-cutover production catalog. Its Swarm update order is `stop-first` because host-mode port 18102 cannot support overlapping tasks on azul2.
- Inspector protocol smoke passes directly against both bridges: Chatwoot = **123 tools, 0 schema errors, 17 warnings**; Portainer = **119 tools, 0 schema errors, 2 warnings**.
- Odoo and Apify gateways answer on `/mcp` with OAuth bearer metadata when called without credentials, confirming their MCP/auth boundary.
- Cloudflare official bridge returns a valid `tools/list` response locally.
- Cloudflare official raw origin `https://mcp-origin.conexaoazul.com/cloudflare/mcp` is green and exposes the token-efficient three-tool surface `docs/search/execute`. It is deliberately not promoted to the broad main Portal yet because `execute` can perform writes; constrain authority or explicitly approve Access policy first.
- Apify raw origin `https://mcp-origin.conexaoazul.com/apify/mcp` is healthy at the auth boundary and returns the expected HTTP 401 Bearer challenge without credentials. Portal publication requires a verified least-privilege auth configuration.
- Prometheus MCP is promoted behind Cloudflare Access using immutable image digest `sha256:b5202b...9560c`; protocol smoke proves 18/18 read-only, destructive=false, idempotent=true and openWorld=false, while the Main portal exposes only 11 allowlisted tools by default.
- Playwright MCP `0.0.82` is active **internal-only** on azul2 using immutable MCR digest `sha256:77dccc...b8734`. It has no published ports, uses an isolated in-memory browser profile, disables WebMCP and service workers, and now runs on an `internal=true` overlay with no direct internet route. Browser HTTP/HTTPS is forced through a Squid proxy pinned by digest; the proxy denies private/link-local ranges and only allows `.conexaoazul.com` / `.conexaoazul.com.br`. Odoo and MágicaChat login smokes pass, while `example.com` and private IP navigation are blocked. The remaining Portal gate is tool/session authority, because 18 of 25 upstream tools are marked destructive.
- Terraform MCP Server `1.3.0` is active **internal-only** on azul2 with exactly the public `registry` toolset: 9 tools, no TFE/HCP token, `ENABLE_TF_OPERATIONS=false`, no published ports and an `internal=true` overlay. Its dedicated Squid proxy only allows `registry.terraform.io`, while external non-Registry destinations and private IP ranges are blocked. A live Registry smoke resolved `oracle/oci` 9.3.0 and the `core_instance` resource.
- The current authoritative reconciliation is **4 portals / 23 memberships / 22 unique servers / 0 failing** after the Prometheus and Chatwoot protocol cutovers.
- There are code-ready assets for SAMU/Blue Database, Asaas, Inter and BlueApps19 MCP modules.
- Any credential or tunnel token currently embedded in a Docker service argument must be rotated after a secret-backed replacement is prepared.

## Rollout order

1. Keep the Cloudflare Portal inventory synchronized and protocol-smoked.
2. Fix the stale client discovery view so it reflects Portal membership.
3. Correct read-only/destructive annotations on SAMU reporting tools.
4. Publish additional internal MCPs only after authority is constrained: Cloudflare, Apify, Blue Odoo Ops and Transcription.
5. Keep Playwright internal-only while reviewing an explicit minimal tool allowlist; the egress/SSRF boundary is now implemented and proven.
6. Add identity-bearing Playwright smoke only after storage-state/secrets handling is approved and secret-backed.
7. Keep Terraform Registry MCP internal-only until a future HCP/TFE need is separately approved; never add a TFE token or broader toolset by default.
8. Integrate Grafana/Loki for observability once a dedicated Viewer service-account token is available.
9. Retire duplicated bridges and direct host ports only after equivalent Portal routes are green.

## Files

- `catalog.yaml`: current inventory and candidate backlog.
- `smoke-inspector.sh`: reusable MCP protocol smoke.
- `audit-cloudflare-portals.sh`: current-state Portal audit with readiness/auth/tool-count gates.
- `playwright/stack.yml`: internal-only Playwright MCP Swarm deployment, forced through the egress proxy.
- `playwright/egress-stack.yml`: Squid egress proxy with separate private and internet-facing overlays.
- `playwright/squid.conf`: domain allowlist and private-range deny policy.
- `playwright/smoke.mjs`: protocol + Odoo/Chatwoot UI smoke plus negative external-egress test.
- `terraform/stack.yml`: internal-only Terraform Registry MCP deployment with explicit `--toolsets registry`.
- `terraform/egress-stack.yml`: dedicated Registry egress proxy stack.
- `terraform/squid.conf`: exact Registry domain allowlist and private-range deny policy.
- `terraform/smoke.mjs`: tool-surface assertion plus live Oracle/OCI Registry query.
