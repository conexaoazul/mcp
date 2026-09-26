#!/usr/bin/env bash
set -euo pipefail

CF_WRAPPER="${CF_WRAPPER:-$HOME/bin/cf}"
CF_ACCOUNT_NAME="${CF_ACCOUNT_NAME:-Conexão Azul}"
OUT_DIR="${MCP_EVIDENCE_DIR:-./evidence/mcp-portals}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

command -v jq >/dev/null || { echo "jq is required" >&2; exit 69; }
[[ -x "$CF_WRAPPER" ]] || { echo "Cloudflare wrapper not executable: $CF_WRAPPER" >&2; exit 69; }

mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"

accounts="$("$CF_WRAPPER" GET "/accounts?per_page=100")"
account_id="$(jq -r --arg name "$CF_ACCOUNT_NAME" '.result[]? | select(.name==$name) | .id' <<<"$accounts" | head -1)"
[[ -n "$account_id" && "$account_id" != "null" ]] || {
  echo "Cloudflare account not found: $CF_ACCOUNT_NAME" >&2
  exit 2
}

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

portals="$("$CF_WRAPPER" GET "/accounts/$account_id/access/ai-controls/mcp/portals?per_page=100")"
jq -r '.result[]?.id' <<<"$portals" | while read -r portal_id; do
  [[ -n "$portal_id" ]] || continue
  "$CF_WRAPPER" GET "/accounts/$account_id/access/ai-controls/mcp/portals/$portal_id" |
    jq -c '.result | {
      id,
      name,
      hostname,
      servers: [
        .servers[]? | {
          id,
          name,
          hostname,
          auth_type,
          status,
          authentication_status,
          tool_count: (.tools | length)
        }
      ]
    }' >>"$tmp"
done

jq -s 'sort_by(.hostname)' "$tmp" >"$OUT_DIR/$STAMP-portals.json"

jq -r '
  .[] as $portal |
  $portal.servers[] |
  [
    $portal.hostname,
    .id,
    .status,
    .authentication_status,
    (.tool_count|tostring),
    .hostname
  ] | @tsv
' "$OUT_DIR/$STAMP-portals.json" >"$OUT_DIR/$STAMP-servers.tsv"

bad="$(
  jq '[
    .[] as $p |
    $p.servers[] |
    select(
      .status != "ready"
      or .tool_count <= 0
      or (
        .auth_type == "bearer"
        and .authentication_status != "connected"
      )
    )
  ] | length' "$OUT_DIR/$STAMP-portals.json"
)"

portals_count="$(jq 'length' "$OUT_DIR/$STAMP-portals.json")"
memberships_count="$(jq '[.[].servers[]] | length' "$OUT_DIR/$STAMP-portals.json")"
unique_servers="$(jq '[.[].servers[].id] | unique | length' "$OUT_DIR/$STAMP-portals.json")"

printf 'portals=%s memberships=%s unique_servers=%s failing=%s\n' \
  "$portals_count" "$memberships_count" "$unique_servers" "$bad"

sha256sum "$OUT_DIR/$STAMP-portals.json" "$OUT_DIR/$STAMP-servers.tsv" \
  >"$OUT_DIR/$STAMP-SHA256SUMS.txt"

if [[ "$bad" != "0" ]]; then
  echo "FAIL: one or more Portal MCP servers failed readiness/auth/tool-count gate" >&2
  jq -r '
    .[] as $p |
    $p.servers[] |
    select(
      .status != "ready"
      or .tool_count <= 0
      or (.auth_type == "bearer" and .authentication_status != "connected")
    ) |
    [$p.hostname,.id,.status,.authentication_status,.tool_count] | @tsv
  ' "$OUT_DIR/$STAMP-portals.json" >&2
  exit 1
fi

echo "PASS: Cloudflare MCP Portals are ready"
