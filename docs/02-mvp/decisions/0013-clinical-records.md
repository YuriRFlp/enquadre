# 0013 — Clinical records out of the MVP, in an isolated records module

- **Date:** 26/10/2026
- **Status:** Accepted

## Context

Psychologists want to record progress notes and per-session information, but this is the most sensitive data in the system, subject to CFP (Federal Council of Psychology) and LGPD (Brazil's data protection law) requirements.

## Options considered

1. Include in the MVP: more value, greater risk and timeline.
2. Isolated module in phase 3, with stronger security.

## Decision

Reserve the records module: tables, per-psychologist key, 2FA, audit, locking and addenda, PDF export. Basic version in 2 to 3 sprints; in-browser encryption as a later evolution.

## Consequences

Nothing in the MVP needs to change to add it. It may become a more expensive plan. Revisit in phase 3, or earlier if it is the top request from paying users.

Details in `../../05-architecture/`.
