# 0004 — Modular monolith with boundaries checked in CI

- **Date:** 26/10/2026
- **Status:** Accepted

## Context

One person will build and maintain the system while learning backend at the same time. Microservices would bring deploys, networking, and distributed failures with no benefit at this scale.

## Options considered

1. Microservices from the start: strong isolation, but high operational complexity.
2. Monolith without rules: fast at first, turns into a tangle.
3. Modular monolith: one deploy, modules with a public facade and events.

## Decision

Modular monolith with 9 modules (identity, patients, scheduling, messaging, assistant, automations, billing, subscription, privacy) plus the platform layer. No module reads another module's tables; dependencies are checked with dependency-cruiser in CI.

## Consequences

A single deploy and simple debugging. Extracting a module into its own service in the future is possible because the boundaries already exist. Revisit when a module needs to scale on its own or gets its own team.

Details in `../../05-architecture/`.
