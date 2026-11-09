# 0012 — WhatsApp reminder as the default channel, with an e-mail copy

- **Date:** 26/10/2026
- **Status:** Accepted

## Context

WhatsApp is the channel that actually reduces no-shows; e-mail is free. Pricing for service messages changed in October 2026, and the free tier of the shared number is split among all psychologists.

## Options considered

1. E-mail only: zero cost, low effectiveness.
2. WhatsApp only: effective, no free alternative.
3. WhatsApp by default + e-mail copy.

## Decision

Reminder via a WhatsApp utility template, with an e-mail copy when available; no "sessão confirmada" (*"session confirmed"*) message; strictly transactional text.

## Consequences

About R$ 3 to R$ 6 per psychologist per month (July 2026 rates, to be confirmed). Revisit if the cost exceeds 15% of the plan or the service-message free tier runs out.

Details in `../../05-architecture/`.
