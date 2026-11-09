# 0003 — Materialized recurring sessions

- **Date:** 23/10/2026
- **Status:** Accepted

## Context

Most patients have a fixed weekly or biweekly session. Each session must be individually reschedulable, cancelable, or markable as a no-show.

## Options considered

1. **Compute occurrences on the fly** from the rule (RRULE) — fewer rows in the database, but exceptions get complex.
2. **Materialize** — a job generates `Appointment` records for the next 8 weeks from `AppointmentSeries`.

## Decision

Option 2.

## Consequences

- Each session is an ordinary record: easy to edit, charge, and notify.
- Requires a periodic job to extend the horizon, and care when editing or ending a series (update only future sessions that have not taken place).
