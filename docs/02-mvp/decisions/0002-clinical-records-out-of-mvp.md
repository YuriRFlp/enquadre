# 0002 — Clinical records out of the MVP

- **Date:** 23/10/2026
- **Status:** Accepted (detailed by 0013)

## Context

Clinical records are part of a psychologist's routine, but they are sensitive health data under the LGPD (Brazil's data protection law) and require stronger security.

## Options considered

1. **Include clinical records in the MVP** — more complete, but increases risk, timeline, and liability.
2. **Leave them out** — focus on schedule, reminders, and charges, which already solve the main pain.

## Decision

Option 2. The product is positioned as a complement to whatever the psychologist already uses for clinical records.

## Consequences

- Lower switching cost for the user (no need to migrate clinical records).
- Revisit after validation, with encryption and a study of the LGPD and CFP (Federal Council of Psychology) rules.
