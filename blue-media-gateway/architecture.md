# Hybrid routing architecture

Consumer -> Blue Media API/MCP
  -> policy/entitlement/budget
  -> local plane: Ollama
  -> cloud plane: Cloudflare AI Gateway
       -> Workers AI
       -> BYOK / external providers
  -> optional compatibility plane: LiteLLM
  -> persist output to R2/S3
  -> readback + SHA-256
  -> Asset Registry
  -> Postiz/Gmail/Odoo/Web

## Principles
- Ollama handles eligible low-cost/private work first.
- Cloudflare AI Gateway is the default external control plane.
- LiteLLM is optional, not a mandatory hop.
- A provider success is not an asset success until storage readback and SHA verification pass.
- Public social publication is never coupled to generation.
- Billing/overage is disabled by default and requires a separate financial/human gate.
- No tenant may inherit another tenant's provider key, bucket prefix or budget.

## Failure behavior
local unavailable -> cloud route if entitlement permits
cloud primary 5xx/timeout -> circuit breaker -> allowed fallback
storage failure -> generation result rejected for distribution
budget exceeded -> hard stop unless approved overage is already enabled
all providers unavailable -> retryable failure; never silently publish stale media
