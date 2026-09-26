# MCP ROI Roadmap — Conexão Azul

Updated: 2026-09-26

## Principle

Cloudflare MCP Server Portals / Agents Gateway is already the production control plane for remote MCP access. Do not replace it with another gateway without a measured benefit.

Use new projects only when they add a capability the current Portals + Swarm + Odoo/n8n stack does not already provide.

## Now — highest ROI / lowest risk

| Work | Why | Source |
|---|---|---|
| MCP Inspector in CI | Protocol/identity/tools/schema evidence instead of HTTP 200 | https://github.com/modelcontextprotocol/inspector |
| Portal audit | Detect stale/error/auth/tool drift across all Portals | local `audit-cloudflare-portals.sh` |
| Fix discovery drift | Current client view can omit servers already in Cloudflare Portal | Cloudflare Portal API is authoritative |
| SAMU annotation cleanup | Reporting SQL is read-only but several generated tool annotations declare destructive/write semantics | current Portal tool metadata |
| Secret hygiene | Move private key/cert and inline tunnel credentials to Docker Secrets / OCI Vault | runtime audit |
| Image digest pinning | Make promoted MCP runtime reproducible and auditable | current Swarm policy |

## Next — net-new capability

### 1. Playwright MCP
Repository: https://github.com/microsoft/playwright-mcp

Use for identity-aware browser smokes: Odoo login, Chatwoot, Portal redirects, chatter flows and self-healing UI tests. Keep it isolated; browser automation is a high-authority capability.

### 2. Grafana + Loki MCP
Repositories:
- https://github.com/grafana/mcp-grafana
- https://github.com/grafana/loki-mcp

Use for incident investigation across metrics + logs. This is a better observability complement than adding more generic infrastructure MCPs.

### 3. Terraform MCP
Repository: https://github.com/hashicorp/terraform-mcp-server

Use for OCI/DR IaC discovery and HCP/Terraform Registry workflows. Keep apply/destructive actions behind human gates; prioritize plan/read workflows.

### 4. Cloudflare official MCP — constrained publication
Repository: https://github.com/cloudflare/mcp-server-cloudflare

The existing origin is green and the current Code Mode surface is only `docs`, `search`, `execute`. This is highly token-efficient, but `execute` may write. Prefer:
- a dedicated Ops Portal with narrower Access policy; or
- a wrapper/tool policy that exposes `docs` + `search` broadly and gates `execute`.

Do not publish the unrestricted server into the broad main Portal by default.

### 5. Apify
The internal origin/auth boundary is green. Publish only after the Portal credential path and least-privilege scope are validated.

### 6. Blue Odoo Ops + Transcription
Both runtimes already exist. Prefer dedicated Ops/Media portal membership over adding high-authority tools to the general CRM portal.

## Evaluate, do not duplicate

### Docker MCP Gateway
Repository: https://github.com/docker/mcp-gateway

Useful for:
- local/offline agent profiles;
- isolated worker-side MCP execution;
- tool allowlists and Docker-native catalogs;
- clients outside Cloudflare Portal.

Do **not** use it as a wholesale replacement for Cloudflare Portals today; that would duplicate production auth/catalog/routing.

### MCP Registry
Repository: https://github.com/modelcontextprotocol/registry

Use as a discovery/import source, not as a second authoritative production registry. The Conexão Azul catalog + Cloudflare Portal API remain operational truth.

### MariaDB official MCP / DBHub / MCP Toolbox
Repositories:
- https://github.com/MariaDB/mcp
- https://github.com/bytebase/dbhub
- https://github.com/googleapis/mcp-toolbox

These are already represented by the Blue Database MCP evaluation and the SAMU Toolbox deployment. Benchmark them in `conexaoazul/blue-database-mcp`; do not deploy three overlapping database MCPs into production.

### GitHub MCP
Repository: https://github.com/github/github-mcp-server

Useful to give Claude/Codex/other agents the same GitHub workflow. ChatGPT already has a native connected GitHub surface in this environment, so another production server is not urgent.

## Publication tiers

1. **Read-only broad** — docs, Context7, safe reporting.
2. **Operational read** — observability, DB reporting, GitHub read.
3. **Controlled write** — Odoo/Chatwoot/n8n actions with scoped identities.
4. **High authority** — Portainer, shell, Cloudflare execute, Terraform apply, browser automation.

Tiers 3–4 require explicit identity, audit evidence and human approval for destructive/high-impact actions.
