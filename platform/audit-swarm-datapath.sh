#!/usr/bin/env bash
set -euo pipefail

EXPECTED_PREFIX="${EXPECTED_DATAPATH_PREFIX:-10.77.0.}"
NETWORK="${1:-ingress}"

command -v docker >/dev/null
docker info >/dev/null

echo "network=$NETWORK expected_datapath_prefix=$EXPECTED_PREFIX"

peers="$(docker network inspect "$NETWORK"   | jq -r '.[0].Peers[]?.IP'   | sort -u)"

if [[ -z "$peers" ]]; then
  echo "FAIL: no overlay peers found for $NETWORK" >&2
  exit 2
fi

bad=0
while IFS= read -r ip; do
  [[ -n "$ip" ]] || continue
  if [[ "$ip" == "$EXPECTED_PREFIX"* ]]; then
    echo "PASS peer=$ip"
  else
    echo "FAIL peer=$ip expected_prefix=$EXPECTED_PREFIX" >&2
    bad=1
  fi
done <<<"$peers"

echo "--- swarm node advertised addresses ---"
docker node ls -q | while read -r id; do
  docker node inspect "$id"     --format '{{.Description.Hostname}}|{{.Status.State}}|{{.Status.Addr}}|{{.Spec.Role}}|{{.Spec.Availability}}'
done | sort

if (( bad )); then
  cat >&2 <<'EOF'
FAIL: mixed overlay data-path addresses detected.
Do not repair by ad-hoc NAT/firewall rules. data-path-addr is selected at
swarm init/join time; use the maintenance-window rejoin gate.
EOF
  exit 1
fi

echo "PASS: overlay peers use the expected data-path network"
