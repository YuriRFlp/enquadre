# 0007 — Official WhatsApp Cloud API, no BSP, single number in the MVP

- **Date:** 26/10/2026
- **Status:** Accepted

## Context

Reminders and charges over WhatsApp reduce no-shows, but unofficial libraries lead to bans and intermediaries (BSPs) charge a monthly fee.

## Options considered

1. Unofficial library: free, high risk of being banned.
2. BSP (intermediary provider): easy, extra monthly fee.
3. Official Cloud API directly with Meta.

## Decision

Official Cloud API, one shared Enquadre number in the MVP, sending on behalf of the psychologist. In phase 2, each psychologist's own number via Embedded Signup as a Tech Provider (evaluate coexistence).

## Consequences

Pay only per message. Requires business verification, number verification, and template approval. The patient's first contact is out of the MVP. Revisit in phase 2.

Details in `../../05-architecture/`.
