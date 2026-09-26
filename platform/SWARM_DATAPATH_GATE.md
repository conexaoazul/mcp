# Swarm data-path maintenance gate

## Current finding — 2026-09-26

Cross-node overlay traffic from `azul2` to the OCI workers is broken while direct Tailscale access is healthy.

Packet capture during a remote overlay TCP SYN showed the VXLAN outer packet leaving `wg0` toward `10.77.0.4/5:4789`, but with the **source address `100.85.130.65`** (the azul2 Tailscale address). No VXLAN response returned.

The Swarm overlay peer table currently mixes:

- OCI managers/workers: `10.77.0.2/3/4/5`
- azul2: `100.85.130.65`

Functional proof:

- local Portainer agent task on the overlay: reachable;
- two remote Portainer agent task IPs: timeout;
- remote Grafana task/VIP on `monitoring`: timeout;
- direct worker-2 Tailscale Grafana and Prometheus: HTTP 200.

This is an asymmetric Swarm data-path configuration, not an application failure.

## Why it is a human gate

Docker selects `--data-path-addr` when a node initializes or joins the swarm. There is no `docker node update` or `docker swarm update` option that changes an existing node's data-path address.

`azul2` is the current leader. The live managers are `azul2`, `blueops-oci-1`, and `blueops-oci-2`; `dev1` remains a down manager. With the current manager membership, taking azul2 out for a rejoin is not an automatic-safe action.

Do **not**:
- force `azul2` out of the swarm;
- change manager membership or quorum without the CEO/human gate;
- mask the issue with broad UDP/4789 exposure or ad-hoc NAT;
- expose VXLAN/4789 to an untrusted network.

## Interim MCP policy

Until the maintenance gate is approved:

1. MCP workloads placed on OCI workers must publish their MCP listener using `mode=host`.
2. Cloudflare Tunnel origins must target the worker's Tailscale IP directly, not azul2 routing-mesh.
3. Keep the upstream protocol/auth gate intact.
4. Run MCP initialize + tools/list + functional read-only canary after every route change.
5. Preserve SHA/digest evidence.

The Prometheus MCP canary follows this pattern on worker-2.

## Maintenance-window gate

Before changing azul2's Swarm membership:

1. Confirm all current managers and Raft health.
2. Confirm cold/archive/DR guardrails unrelated to Swarm networking are green.
3. Back up Swarm service/config/secret metadata references and capture node/service manifests.
4. Establish a manager-membership plan that preserves quorum throughout the operation.
5. Obtain explicit human approval for any demotion/removal/rejoin that changes manager membership.
6. Rejoin azul2 with its intended WireGuard data-path address (`10.77.0.1` / `wg0`) and the appropriate management-plane address.
7. Verify ingress and application overlay peer tables use the intended WireGuard addresses.
8. Re-run cross-node task-IP, VIP, ingress-published-port, Portainer, Grafana, Prometheus, transcription, and MCP protocol smokes.
9. Roll back only through the pre-recorded membership plan; never improvise quorum changes.

Use `audit-swarm-datapath.sh` before and after the maintenance window.
