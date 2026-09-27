# Blue Media Gateway — Canary

Goal: remove image generation as a single point of failure for Social/email/Odoo while keeping generation, storage and publication independently gated.

## Canary contract
1. `POST /v1/images/generations` through an OpenAI-compatible router (LiteLLM).
2. Providers are aliases, never hard-coded by consumers: `blue-media-default`, `blue-media-brand`, `blue-media-cheap`.
3. Provider output is persisted to R2/S3 before distribution.
4. Registry records SHA-256, provider/model, prompt hash, dimensions, MIME, cost/latency when available, campaign/evidence IDs and approval state.
5. Distribution receives an asset URL, never provider credentials.
6. Social defaults to draft; publication is a separate human gate.

## Initial canary
- no production DNS change
- no Portainer/Swarm mutation
- no paid provider enabled by this PR
- secrets are environment references only
- first E2E acceptance: generate -> persist -> readback -> SHA -> Postiz Instagram draft
- fallback behavior must be tested by forcing primary failure

## Providers
Primary candidates: Workers AI/FLUX, Gemini Image, Recraft.
Challengers: BFL FLUX MCP/API, fal.ai, Replicate, Stability, ComfyUI/Comfy MCP.

## Promotion gates
- provider primary and fallback smoke
- R2 write/readback
- deterministic metadata + SHA
- no secret in logs/config
- max cost/budget policy
- attachment accepted by Postiz
- draft created, never auto-published
- rollback = disable gateway consumer route; existing Social path remains intact
