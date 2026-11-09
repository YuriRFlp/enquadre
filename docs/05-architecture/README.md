# Architecture and system design

How Enquadre is built: the parts of the system, how they communicate, and why each choice was made. Living version in Claude Docs: "Enquadre — Arquitetura do sistema" (*"Enquadre — System architecture"*). This folder is the copy versioned alongside the code.

## Index

| File | Contents |
| --- | --- |
| `README.md` | Vision, principles, and what the secretary does on its own |
| `01-journey-and-context.md` | Automated journey and external integrations |
| `02-containers-and-infrastructure.md` | Containers, hosting, and why a VPS |
| `03-study-guide.md` | Each piece of infrastructure and backend explained |
| `04-modules-and-communication.md` | Backend modules, events, outbox, and queues |
| `05-whatsapp-secretary.md` | Phase 1 triage, the secretary, WhatsApp numbers, and how a message reaches the right account |
| `06-main-flows.md` | Reminder, rescheduling, end of session, charge, and dunning sequence |
| `07-payment-methods.md` | Pix now, card later, behind a flag |
| `08-security-lgpd-and-clinical-records.md` | Security, LGPD, and the future clinical records module |
| `09-costs.md` | Infrastructure and WhatsApp costs |
| `10-phases-and-roadmap.md` | Phases, business gates, and ADRs |

Data model, repository structure, and stack live in `../02-mvp/`.

## Vision

Enquadre is a modular monolith in TypeScript, with an API, a task worker, and a PostgreSQL database, running on a single low-cost server. It acts like a secretary: it answers on WhatsApp, schedules, reminds, confirms, charges, and reconciles payments, and only calls the psychologist when a decision is theirs to make.

## What the secretary does on its own

| Step | Automation | When the psychologist steps in |
| --- | --- | --- |
| First contact | Replies on WhatsApp, explains fees and format (in person/online), collects the name | If the person asks for something off-script or reports a crisis |
| Scheduling | Offers free slots from the schedule and books the first session | Approves new patients, if configured |
| Reminder and confirmation | Sends 24h before, records the confirmation or rescheduling request | Only notified of cancellations |
| Rescheduling | Offers new slots and moves the session | Never, if there is a free slot |
| After the session | Marks it as held unless someone said otherwise | Marks a no-show with one tap |
| Charge | Creates the charge with the accepted methods (Pix at launch; credit and debit card via the gateway's page once enabled), sends it, reconciles it via webhook, and issues a receipt | Only chooses the accepted methods in Configurações (*Settings*); on the happy path, never |
| Card settlement | Shows the confirmed amount in Financeiro (*Finances*) as "a receber" (*receivable*) until it lands in the subaccount; on refund or chargeback, reopens the charge | Decides what to do about refunds and chargebacks |
| Overdue payments | Gentle dunning sequence of reminders | After the last reminder, decides what to do |
| Free-form replies (phase 1) | Detects crisis by rule, sends a neutral reply, and suggests the action with AI | Approves, edits, or discards the suggestion with one tap; is alerted immediately in case of crisis |

First contact and conversational scheduling arrive in phase 2; see `05-whatsapp-secretary.md` and `10-phases-and-roadmap.md`.

## Principles

1. **Modular monolith first.** One codebase, one deploy, modules with clear boundaries. Split into services only when a module has its own load or team.
2. **Everything asynchronous goes through a queue.** Messages, reminders, charges, and webhooks become jobs with retries. The API responds fast and nothing is lost if a vendor goes down.
3. **Deterministic rules, AI only where it helps.** Schedule, charges, and statuses follow rules and state machines. AI only understands what the person wrote and picks the intent; it never decides on its own about money or time slots.
4. **Idempotency at every edge.** A repeated webhook, a re-run job, or a double click never produces a duplicate charge or message.
5. **Lowest cost now, clear path later.** A single server with Docker Compose, managed services only where the free tier is enough. Every cheap choice has a documented next step.
6. **Privacy by default.** Minimal health data, nothing clinical in the MVP, secrets and phone numbers encrypted, logs without patient data.
