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

- Portal currently exposes six enabled logical servers: Chatwoot, Context7, n8n, Odoo Consultas, Portainer and Uptime Kuma.
- Runtime also has Blue Odoo Ops, Apify, Cloudflare official/legacy bridges, Portal17 Toolbox and Transcription MCP.
- Chatwoot and Portainer bridges include their service prefix in the native Streamable HTTP path (`/chatwoot/mcp` and `/portainer/mcp`). The previous Traefik StripPrefix behavior conflicted with those paths. Higher-priority path-preserving routers were added without removing the legacy routers.
- Inspector protocol smoke passes directly against both bridges: Chatwoot = **123 tools, 0 schema errors, 17 warnings**; Portainer = **119 tools, 0 schema errors, 2 warnings**.
- Odoo and Apify gateways answer on `/mcp` with OAuth bearer metadata when called without credentials, confirming their MCP/auth boundary.
- Cloudflare official bridge returns a valid `tools/list` response locally.
- Canonical `/apify/mcp` and `/cloudflare/mcp` still require public-edge routing correction; the external host currently returns HTTP 404.
- There are code-ready assets for SAMU/Blue Database, Asaas, Inter and BlueApps19 MCP modules.
- Any credential or tunnel token currently embedded in a Docker service argument must be rotated after a secret-backed replacement is prepared.

## Rollout order

1. Inventory + Inspector smoke in parallel with production.
2. Fix canonical `mcp.conexaoazul.com` routing without removing existing origin routes.
3. Deploy SAMU MariaDB MCP in strict read-only mode.
4. Add Playwright identity smoke.
5. Integrate Grafana/Loki.
6. Integrate Terraform for OCI/IaC.
7. Retire duplicated bridges and direct host ports only after equivalent gateway routes are green.

## Files

- `catalog.yaml`: current inventory and candidate backlog.
- `smoke-inspector.sh`: reusable MCP protocol smoke.
