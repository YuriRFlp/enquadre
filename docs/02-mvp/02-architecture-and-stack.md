# Architecture and stack

TypeScript monorepo with separate front end and back end; the back end is a modular monolith with two processes (API and worker), PostgreSQL and Redis, on a VPS with Docker Compose. The full explanation, with diagrams and the reasoning behind each piece, is in `../05-architecture/`.

## Overview

```
[ Browser ] ──► [ Cloudflare: DNS, HTTPS, protection ]
                       │                     │
                       ▼                     ▼
          [ Static web app ]        [ VPS · Docker Compose ]
          (Cloudflare Pages)          Caddy ──► API (NestJS) ──► PostgreSQL (data + outbox)
                                                   │                ▲
                                                   ▼                │
                                                 Redis ◄──► Worker (BullMQ)
                                                                │
                              WhatsApp · Pix gateway · E-mail · AI · R2 (backups and PDFs)
```

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Monorepo | pnpm workspaces: `apps/web`, `apps/server`, `packages/shared`, `packages/db`, `packages/design-tokens` | Shared types, schemas and tokens |
| Front end | React + TypeScript + Vite, PWA | Study focus, without Next.js "magic"; installable on the phone |
| Routing | React Router (or TanStack Router) | Industry standard |
| Front-end data | TanStack Query | Caching, loading and API errors |
| Forms | React Hook Form + Zod | Typed validation, the same as the back end |
| UI | Tailwind + Enquadre design system components (shadcn/ui as a base) | Consistent interface without weeks of design |
| API and worker | NestJS, one codebase with two entry points (`main.api.ts`, `main.worker.ts`) | Modules, dependency injection, guards |
| Database | PostgreSQL + Prisma | Transactions, migrations, generated types |
| Queues and events | BullMQ + Redis, with a transactional outbox in PostgreSQL; future actions in `ScheduledAction` in PostgreSQL (ADR 0016) | Reminders, charges, messages and webhooks with retries, without keeping the future only in Redis |
| Auth | JWT in an httpOnly cookie + rotating refresh token; argon2 | Learn real auth |
| Real time | Server-Sent Events | Dashboard updates when the patient confirms or pays |
| Messaging | WhatsApp Cloud API (Meta) + Resend (e-mail) | Channel that reduces no-shows + free channel |
| Payments | Gateway with subaccount (Asaas as reference; Mercado Pago, Efí), Pix now, card later | Money goes straight to the psychologist's account |
| AI | Small model, structured output validated with Zod: reply triage in phase 1, secretary in phase 2 (ADRs 0008 and 0014) | Cheap, predictable and auditable |
| AI evaluation | Synthetic cases in `apps/server/evals/`, run with Vitest in CI on every prompt or model change | Prompt changes without regressions |
| Files | Cloudflare R2 | PDF receipts and backups |
| Proxy | Caddy | Automatic HTTPS and routing |
| Hosting | VPS (2 vCPU, 4 GB) with Docker Compose; front end on Cloudflare Pages | Low fixed cost (replaces Railway/Render; see ADR 0005) |
| Tests | Vitest (front and back), Playwright (E2E) | Same tool on both ends |
| CI/CD | GitHub Actions + GitHub Container Registry, deploy over SSH | Lint, typecheck, tests, image and deploy |
| Architecture | `dependency-cruiser` in CI | Enforces the boundaries between modules |

## Repository structure

```
enquadre/
├── apps/
│   ├── web/                     # React + Vite (dashboard, PWA and public page)
│   │   └── src/
│   │       ├── app/             # routes, layout, providers
│   │       ├── features/        # today, schedule, patients, billing, conversations, settings
│   │       ├── public/          # patient pages (confirm, pay)
│   │       └── ui/              # design system components in React
│   └── server/                  # NestJS
│       ├── src/
│       │   ├── main.api.ts      # starts HTTP
│       │   ├── main.worker.ts   # starts queue consumers and the outbox relay
│       │   ├── platform/        # db, queues, outbox, crypto, logs, config
│       │   └── modules/
│       │       ├── identity/
│       │       ├── patients/
│       │       ├── scheduling/
│       │       │   ├── api/
│       │       │   ├── application/
│       │       │   ├── domain/
│       │       │   ├── infra/
│       │       │   └── index.ts  # public facade
│       │       ├── messaging/
│       │       ├── assistant/
│       │       ├── automations/
│       │       ├── billing/
│       │       ├── subscription/
│       │       └── privacy/
│       └── evals/               # triage evaluation cases (synthetic, no real data)
├── packages/
│   ├── shared/                  # shared Zod schemas, types and copy
│   │   └── src/vertical/        # niche profile: psicologia.ts (ADR 0015)
│   ├── db/                      # Prisma schema and migrations
│   └── design-tokens/           # design system tokens.json → CSS and Tailwind
├── infra/
│   ├── docker-compose.yml       # caddy, api, worker, postgres, redis
│   ├── Caddyfile
│   └── scripts/                 # backup, restore, deploy
├── docs/                        # this documentation and ADRs
└── .github/workflows/           # lint, typecheck, tests, deploy
```

Deployment is a GitHub Action that builds the image, pushes it to GitHub Container Registry and runs `docker compose pull && up -d` on the server over SSH. Migrations run before the new version starts.

## Architecture rules (apply from day 1)

- Every business record has a `professionalId`, and every query filters by it (isolation between professionals); Row Level Security as a second barrier once there is more than one developer.
- A module only imports another module's facade (`index.ts`), never its tables; `assistant` and `automations` sit at the top and the others notify through events.
- Every change that produces a side effect writes an `OutboxEvent` in the same transaction.
- Dates stored in UTC, displayed in `America/Sao_Paulo`.
- Monetary amounts in cents (integer), never `float`.
- Webhooks and jobs are idempotent: the same event received twice does not mark a payment as paid or send a message twice.
- Sensitive fields (phone, message body, keys) encrypted in the application; card data never passes through Enquadre.
- Never log patient data in logs, Sentry or PostHog; use IDs only.
- Every incoming message goes through the crisis rule before any other processing, including the AI.
- The AI only suggests; no AI call changes the schedule, a charge, or a patient without a decision by the system or the psychologist.
- `messaging`, `automations` and `assistant` do not mention psychology vocabulary; copy and rules come from the vertical profile.
- Real patient data never goes into Git, not even as an evaluation case.

Decisions that led to these choices: the `decisions/` folder.
