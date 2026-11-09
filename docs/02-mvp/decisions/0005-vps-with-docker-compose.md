# 0005 — Single VPS with Docker Compose

- **Date:** 26/10/2026
- **Status:** Accepted

## Context

API, worker, PostgreSQL, and Redis need to run at the lowest possible cost. Platforms like Railway and Render charge per service and per resource.

## Options considered

1. Railway or Render: zero maintenance, cost rises with each service.
2. VPS with Docker Compose: low fixed cost, requires taking care of backups and updates.
3. Kubernetes: unnecessary for one server.

## Decision

One VPS with 2 vCPU and 4 GB running Docker Compose (caddy, api, worker, postgres, redis), front end on Cloudflare Pages, backups on R2. Replaces the earlier choice of Railway in sprint 3.

## Consequences

Full infrastructure for R$ 30 to R$ 60 per month, and a great school for Linux and networking. Requires a firewall, SSH key, updates, and a monthly restore test. Revisit with more than 100 customers or a need for high availability (managed database first).

Details in `../../05-architecture/`.
