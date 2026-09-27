# Runtime discovery contract

The canary must be operable without shell access.

## Required read-only capabilities
- `ai_runtime_status`: aggregate local/cloud/storage state with evidence timestamps.
- `ollama_status`: reachability/version only; never pull a model.
- `ollama_models`: model names, sizes and capability metadata; no prompts or secrets.
- `cf_ai_gateway_status`: configured/reachable/authenticated flags, gateway identifier hash, no token.
- `r2_canary_status`: bucket/prefix reachability plus optional disposable write/readback/SHA test.
- `media_gateway_health`: policy loaded, circuit state, storage state and provider aliases.

## Evidence states
`PASS | LAST_KNOWN_PASS | DEGRADED | OPEN | FAIL`

Every result includes `observed_at`, `source`, `ttl_seconds`, and a redacted evidence summary.

## Network rule
Internal readiness probes use the Swarm/private service address directly. Cloudflare AI Gateway is the external AI control plane and MUST NOT be a dependency for internal service health.

## Safety
Discovery is read-only by default. Model pulls, paid inference, Unified Billing/credit activation, public Social publication, DNS and production routing are separate human-gated mutations.
