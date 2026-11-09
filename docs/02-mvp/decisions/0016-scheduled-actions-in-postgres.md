# 0016 — Scheduled actions in PostgreSQL, not delayed jobs in Redis

- **Date:** 04/11/2026
- **Status:** Accepted. Complements 0006

## Context

The `automations` module needs to trigger actions in the future: a reminder 24h before, closing the session at its end time, dunning sequence steps (D+1, D+3, D+7), and the monthly charge. The documentation said `automations` owned a `ScheduledAction` table, but it did not exist in the data model, and the `scheduled-actions` queue was described as delayed jobs in BullMQ.

Delayed jobs keep the future only in Redis, which the study guide itself defines as "not the source of truth". Backups go to R2 from PostgreSQL; if Redis is recreated or restarts without persistence, reminders and dunning steps silently vanish, with no way to rebuild them. It would also be hard to show in the dashboard what is scheduled and to reschedule everything when the psychologist changes the reminder lead time or the dunning days.

## Options considered

1. Delayed jobs in BullMQ, with a deterministic id: simple, but the future lives only in Redis.
2. Derive from state, without storing actions: a cron queries, for example, "sessions 24h from now without a reminder". Robust, but each automation becomes its own query and there is no unified view or audit trail.
3. A `ScheduledAction` table in PostgreSQL as the source of truth, with a poller that publishes due actions to a common execution queue.

## Decision

Option 3.

- `automations` writes each future action to `ScheduledAction`, with a unique `dedupeKey` (e.g. `reminder:apt_123:2026-11-10T17:00Z`), which makes creation idempotent.
- A poller in the worker runs every minute, selects due actions with `SELECT ... FOR UPDATE SKIP LOCKED`, marks them as `DISPATCHED`, and publishes to the `scheduled-actions` queue, which becomes an execution queue with no delay, with retries.
- Actions `DISPATCHED` for more than 10 minutes without completion are published again; execution is idempotent.
- On execution, the action checks the current state before acting (is the session still scheduled for that time? is the charge still open?). If not, it ends as `CANCELED` with no effect.
- When a session is rescheduled or canceled, `scheduling` emits the event through the outbox (0006) and `automations` cancels the old actions and creates the new ones. Since `scheduling` cannot touch `automations` tables (0004), this does not happen in the same transaction; the check on execution covers the gap between the event and the rescheduling.
- Changes to settings (reminder lead time, dunning days) become an `UPDATE` on that psychologist's pending actions.
- Repeatable jobs defined in code (the poller itself, the 8 pm summary, series extension, backup) stay in BullMQ: they are registered again every time the worker starts, so they do not depend on what was in Redis.

## Consequences

- Losing Redis loses no future action; at most it delays the ones that were executing until the poller's next pass.
- The dashboard can show upcoming actions ("lembrete amanhã às 14h", *"reminder tomorrow at 2 pm"*) with a simple query, and there is a trail of when each action ran and with what result.
- Precision is about one minute, more than enough for reminders and dunning.
- One more table and a poller to maintain. The "actions overdue for more than 5 minutes without execution" alert becomes as important as the stalled-outbox alert.
- It is still worth enabling AOF persistence on Redis, so in-flight jobs are not lost, but it is no longer critical.
- A daily safety sweep looks for tomorrow's sessions with no pending or sent reminder and raises an alert.
- Revisit if volume demands second-level precision or if the table grows enough to call for partitioning; archiving actions completed more than 90 days ago solves it for a long time.

Details in `../../05-architecture/04-modules-and-communication.md` and `../../05-architecture/06-main-flows.md`.
