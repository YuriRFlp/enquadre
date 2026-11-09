# Observability

Two layers: the **technical** layer answers "is the system working?" and the **product and business** layer answers "are people using it and paying?".

## Technical layer

| What to track | Tool | How to implement | Sprint |
| --- | --- | --- | --- |
| Logs | Pino (`nestjs-pino`) | JSON with `requestId` and `professionalId` on every request | 3 |
| Errors | Sentry (front and back) | Exception capture with the deploy version | 3 |
| Availability | Better Stack or UptimeRobot | `/health` checks the database and Redis; alert by e-mail or Telegram | 3 |
| Queues and jobs | Bull Board + alerts | Internal queue dashboard; alert when reminders or webhooks fail repeatedly | 5 |
| Performance (later) | OpenTelemetry → Grafana Cloud | Traces of slow requests, when volume justifies it | Post-MVP |

**LGPD** (Brazil's data protection law)**:** never log patients' names, phone numbers or e-mails in logs, Sentry or PostHog. IDs only.

## Product and business layer

### Usage events (PostHog)

Fired by the back end, which is more reliable than the front end.

| Event | When |
| --- | --- |
| `professional_signed_up` | Sign-up completed |
| `patient_created` | Patient registered |
| `appointment_created` | Session created (one-off or series) |
| `reminder_sent` | Reminder sent |
| `appointment_confirmed` | Patient confirmed through the link |
| `charge_paid` | Charge paid (webhook or manual) |
| `subscription_activated` | Trial became a paid subscription |
| `inbound_text_received` | Patient replied with free text (ids only) |
| `triage_suggestion_decided` | Psychologist approved, edited, or discarded a suggestion (status only) |
| `crisis_alert_sent` | Crisis rule fired and the alert was delivered |

### Financial metrics (own database)

MRR, churn and trial conversion come from the `Subscription` table, which is the source of truth. At first, an internal admin page with SQL queries. If it grows, Metabase.

### Link to business goals

| Goal (see `../01-business/04-monetization-and-metrics.md`) | Where it comes from |
| --- | --- |
| Schedule used 3+ times a week | Weekly retention in PostHog |
| Trial conversion and churn | `Subscription` |
| Reduction in no-shows | `NO_SHOW` rate in `Appointment`, before and after reminders |

### A metric that becomes a feature

Show on the psychologist's dashboard: "suas faltas caíram de 15% para 6%, cerca de R$ 800 recuperados este mês" (*"your no-shows dropped from 15% to 6%, about R$ 800 recovered this month"*). It is the main sales and retention argument.

## Initial alerts

- [ ] New error in Sentry → e-mail
- [ ] `/health` down for 2 minutes → alert
- [ ] Reminder failure rate above 5% for the day → alert
- [ ] Scheduled actions overdue by more than 5 minutes → alert
- [ ] Gateway webhook failing 3 times in a row → alert
- [ ] Failure to deliver a crisis alert to the psychologist → immediate alert, at any time
- [ ] Invalid JSON or AI errors above 5% for the day → alert

## Operational metrics added by the architecture

| What to track | Where | Why |
| --- | --- | --- |
| Outbox unpublished for more than 1 minute | Query on `OutboxEvent` + alert | Relay stopped = reminders and receipts don't go out |
| Actions overdue by more than 5 minutes without execution | Query on `ScheduledAction` (`PENDING` or `DISPATCHED` with an old `runAt`) + alert | Poller or worker stopped = reminders and dunning don't go out |
| Tomorrow's sessions with no pending or sent reminder | Daily sweep + alert | Safety net against scheduling failures |
| WhatsApp messages by category (utility, service) | `Message.costCategory` | Control cost and the 1,000 free service-message allowance of the shared number |
| WhatsApp delivery failures | `Message.status = FAILED` | Phone without WhatsApp falls back to e-mail |
| Webhooks rejected for invalid signature | API logs | Possible attack or misconfiguration |
| Day's backup uploaded to R2 | Backup script + monitor | A backup that fails silently doesn't exist |

## AI (triage in phase 1, secretary in phase 2)

Everything comes from the `AiInvocation` and `TriageSuggestion` tables, with no message content. At first, an internal admin page with SQL queries.

| What to track | Source | Why |
| --- | --- | --- |
| Rate of suggestions approved without edits | `TriageSuggestion.status` | Main quality metric; it is what allows the secretary to act on its own in phase 2 |
| Discard rate by intent | `TriageSuggestion` | Shows which intent the model gets wrong most |
| Invalid JSON and errors | `AiInvocation.outcome` | Problem with the prompt or model |
| p95 latency | `AiInvocation.latencyMs` | A slow suggestion doesn't help |
| Cost per day and per psychologist | `AiInvocation.costMicroUsd` | Confirm the AI still costs cents |
| Evaluation results per prompt version | CI (`apps/server/evals/`) | No prompt or model change ships with a regression |

The role of each tool (Sentry, PostHog, monitor, logs) is explained in `../05-architecture/03-study-guide.md`.
