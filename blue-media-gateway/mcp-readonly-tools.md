# MCP read-only tool contract

This contract is implementation-ready but MUST NOT be deployed to production until the target MCP service/repository is resolved.

## Tools
- ai_runtime_status
- ollama_status
- ollama_models
- cf_ai_gateway_status
- r2_canary_status
- media_gateway_health

## Required MCP annotations
All status/discovery tools:
- readOnlyHint: true
- destructiveHint: false
- idempotentHint: true
- openWorldHint: false for private/local status tools
- openWorldHint: true only where a status probe contacts an external provider

Annotations are client hints, not authorization. Server-side ACL remains mandatory.

## Cloudflare financial guard
For third-party AI Gateway routes:
- gateway setting: byok_only=true before production use
- per-request defense-in-depth: cf-aig-no-wholesale=true
- Workers AI billing mode must be inspected separately; byok_only does not disable Workers AI billing.
- status tool reports booleans/aliases only; never token values.

## R2
r2_canary_status defaults to metadata/read-only.
A write/readback/SHA canary is a distinct explicitly gated operation using a disposable canary prefix and bounded object size.

## Ollama
ollama_status and ollama_models MUST NOT pull models or submit inference.
Return reachability, version (when available), model metadata and evidence timestamp only.

## Evidence envelope
{
  "state": "PASS|LAST_KNOWN_PASS|DEGRADED|OPEN|FAIL",
  "observed_at": "ISO-8601",
  "ttl_seconds": 300,
  "source": "private_mcp|cloudflare_api|r2_api|ollama_api",
  "summary": "redacted"
}
