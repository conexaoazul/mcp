# Canary test plan

1. Validate policy schema and deny paid overage by default.
2. Ollama health/capability probe; no heavy model pull in this gate.
3. Cloudflare AI Gateway auth/read-only smoke with runtime secret.
4. Generate one disposable 1:1 asset within an approved free/capped route.
5. Persist under R2/S3 canary prefix; read back bytes; verify SHA-256.
6. Record provenance without raw secrets or sensitive prompt data.
7. Force primary route failure and prove circuit breaker/fallback.
8. Reuse the same persisted asset in Gmail/Odoo attachment smoke where available.
9. Create Postiz Instagram DRAFT; verify no immediate publication.
10. Capture cost/latency/provider evidence.
11. Rollback test: disable consumer route; legacy Social generation remains untouched.

## Promotion blockers
- plaintext secret
- unbounded spend/overage
- cross-tenant storage or credential access
- no R2 readback/SHA proof
- fallback not proven
- automatic social publication
