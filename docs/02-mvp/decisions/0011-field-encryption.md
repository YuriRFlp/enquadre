# 0011 — Application-level encryption of sensitive fields

- **Date:** 26/10/2026
- **Status:** Accepted

## Context

Phone numbers, messages, and API keys are sensitive; the mere fact that someone is a psychologist's patient is sensitive data.

## Options considered

1. Disk encryption only: does not protect against a database leak.
2. Envelope encryption in the application, master key outside the database.

## Decision

Sensitive fields encrypted with AES-256-GCM via envelope encryption; logs and analytics with ids only.

## Consequences

Searching by these fields requires an auxiliary hash (e.g. normalized phone number). Revisit when adding clinical records, with a per-psychologist key.

Details in `../../05-architecture/`.
