# Enquadre

Scheduling and billing SaaS for self-employed psychologists in Brazil. It handles the schedule, the patient list, WhatsApp and e-mail reminders, Pix charges with automatic payment reconciliation, a dunning sequence for overdue payments, and AI triage of patient replies.

## What it does (MVP)

- **Schedule:** weekly calendar with one-off and recurring sessions, stored in UTC and shown in `America/Sao_Paulo`.
- **Patients:** registration and history per professional.
- **Reminders:** WhatsApp (Cloud API) and e-mail 24h before each session, with a confirmation link.
- **Billing:** per-session and monthly Pix charges through a gateway subaccount, so money goes straight to the psychologist's account. Payments are reconciled automatically by webhook, with a D+1/D+3/D+7 dunning sequence.
- **AI triage:** classifies patient replies (confirm, reschedule, cancel…) and **suggests** an action that the psychologist approves, edits or discards. A rule-based crisis check runs before any AI.

## Stack

| Layer | Choice |
| --- | --- |
| Monorepo | pnpm workspaces |
| Front end | React + TypeScript + Vite (PWA), TanStack Query, React Hook Form + Zod, Tailwind |
| Back end | NestJS modular monolith with two entry points: API and worker |
| Data | PostgreSQL + Prisma |
| Queues | BullMQ + Redis, transactional outbox, future actions in PostgreSQL (`ScheduledAction`) |
| Integrations | WhatsApp Cloud API, Resend, Pix gateway (Asaas as reference), Cloudflare R2 |
| Tests | Vitest, Playwright, synthetic AI evaluation cases |
| Infra | VPS with Docker Compose and Caddy; front end on Cloudflare Pages; GitHub Actions |

Full rationale: [docs/02-mvp/02-architecture-and-stack.md](docs/02-mvp/02-architecture-and-stack.md).

## Repository layout

```
apps/web/            React + Vite PWA (dashboard and public patient pages)
apps/server/         NestJS: main.api.ts (HTTP) and main.worker.ts (queues, outbox, poller)
  src/platform/      db, queues, outbox, crypto, logs, config
  src/modules/       identity, patients, scheduling, messaging, assistant,
                     automations, billing, subscription, privacy
  evals/             triage evaluation cases (synthetic only)
packages/shared/     Zod schemas, types, user-facing copy, vertical profile
packages/db/         Prisma schema and migrations
packages/design-tokens/
infra/               docker-compose.yml, Caddyfile, backup/deploy scripts
docs/                product, MVP, ADRs, architecture, project journal
```

## Getting started

Requirements: Node.js (LTS), pnpm, and Docker (for PostgreSQL and Redis).

```bash
pnpm install
```

Scripts available in every package (set up in Sprint 0):

| Command | What it does |
| --- | --- |
| `pnpm typecheck` | Type-check all packages |
| `pnpm lint` / `pnpm format` | ESLint / Prettier |
| `pnpm test` | Unit and integration tests (Vitest) |
| `pnpm test:e2e` | End-to-end tests (Playwright, `apps/web`) |
| `pnpm --dir apps/server evals` | Run the AI triage evaluations |
| `pnpm depcruise` | Check module boundaries |

Secrets go in `.env` files, which are never committed; use `.env.example` as the reference.

## Architecture rules

These hold for every change. The reasoning is in the linked ADRs.

1. Every business record has a `professionalId`, and every query filters by it.
2. Modules talk only through each other's facade (`modules/<x>/index.ts`) or through events ([ADR 0004](docs/02-mvp/decisions/0004-modular-monolith.md)).
3. Every side effect writes an `OutboxEvent` in the same transaction ([ADR 0006](docs/02-mvp/decisions/0006-outbox-and-bullmq.md)).
4. Future actions are `ScheduledAction` rows, never delayed BullMQ jobs, and they re-check state before acting ([ADR 0016](docs/02-mvp/decisions/0016-scheduled-actions-in-postgres.md)).
5. Dates in UTC, displayed in `America/Sao_Paulo`. Money in integer cents.
6. Webhooks and jobs are idempotent.
7. Sensitive fields are encrypted at the application level ([ADR 0011](docs/02-mvp/decisions/0011-field-encryption.md)); card data never passes through Enquadre.
8. No patient data in logs, Sentry or PostHog, only IDs. Real patient data never goes into Git.
9. The crisis rule runs before any processing of an incoming message ([ADR 0010](docs/02-mvp/decisions/0010-rule-based-crisis-detection.md)), and AI only suggests ([ADR 0008](docs/02-mvp/decisions/0008-state-machine-and-ai.md), [ADR 0014](docs/02-mvp/decisions/0014-ai-reply-triage.md)).
10. Generic modules (`messaging`, `automations`, `assistant`) take niche vocabulary from the vertical profile ([ADR 0015](docs/02-mvp/decisions/0015-vertical-profile.md)).

## Documentation

`docs/` is the source of truth:

- [MVP scope](docs/02-mvp/01-scope-and-features.md), [data model](docs/02-mvp/03-data-model.md), [observability](docs/02-mvp/04-observability.md) and [sprint roadmap](docs/02-mvp/05-sprint-roadmap.md)
- [Decision records (ADRs)](docs/02-mvp/decisions/), with a [template](docs/02-mvp/decisions/_decision-template.md) for new ones
- [Architecture](docs/05-architecture/README.md): flows, modules, security and LGPD, costs and phases
- [Changelog](docs/03-project-journal/changelog.md) and sprint journal

## Contributing conventions

- Everything in the repository is written in English (code, docs, commits). Only end-user copy is in Portuguese, in `packages/shared`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).
- Strict TypeScript with no `any`; Zod at every boundary; business rules in `domain/` or `application/`; tests next to the code (`*.spec.ts`).
- A new or changed decision gets an ADR. Accepted ADRs are never deleted, only superseded.
