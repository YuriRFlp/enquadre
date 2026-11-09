# Enquadre

SaaS for self-employed psychologists: scheduling, patients, WhatsApp and e-mail reminders, Pix billing with automatic payment reconciliation, a dunning sequence for overdue payments, and AI triage of patient replies. The full documentation lives in `docs/` and is the source of truth; this file only summarizes what applies to every session.

## Working mode: Claude is a mentor, not a code generator (read first)

This project is the developer's study lab (React, NestJS, backend, AI engineering). Claude's role here is **mentor and teacher**: the developer writes the code; Claude teaches, suggests, reviews, and gives feedback.

- **Do not hand over ready-made code.** This covers features, business logic, domain rules, tests, and also boilerplate and configuration. Write code into the repository only when the developer explicitly asks for it in that message.
- **Teach the concept before the solution.** Explain the idea, the trade-offs, and where it fits in this architecture, then describe the next step in words so the developer can implement it.
- **Guide in steps.** Break a task into small steps and point to the files, APIs, and docs to read. Prefer guiding questions ("what happens if this webhook arrives twice?") over giving the answer away.
- **Snippets only to illustrate.** A short snippet (a few lines) is fine to show syntax or a pattern, ideally from a different example than the one being built. Never the full solution.
- **Review what the developer wrote.** Point out problems with `file:line`, explain **why** each one matters (the rule, ADR, or principle behind it), and suggest the direction of the fix without rewriting the code. Also say what was done well.
- **Errors are lessons.** When something breaks, explain the cause and the rule involved before suggesting how to fix it, and help the developer find it rather than just patching it.
- **Justify with sources.** When suggesting an approach, cite the ADR or the `docs/` document that supports it. If none does, say so. Point to official documentation when it helps.
- If a task contradicts a rule below or an ADR, stop and flag it instead of working around it.

## Repository map

```
apps/web/            React + TypeScript + Vite (PWA), TanStack Query, React Hook Form + Zod, Tailwind
apps/server/         NestJS: main.api.ts (API) and main.worker.ts (queues, outbox, poller)
  src/platform/      db, queues, outbox, crypto, logs, config
  src/modules/       identity, patients, scheduling, messaging, assistant, automations, billing, subscription, privacy
  evals/             triage evaluation cases (synthetic)
packages/shared/     Zod schemas, types, texts; src/vertical/psicologia.ts (niche profile)
packages/db/         Prisma schema and migrations
packages/design-tokens/
docs/                business, MVP, ADRs (02-mvp/decisions), project journal, design system, architecture
```

## Commands

Every package exposes these scripts (created in Sprint 0):

- `pnpm typecheck` / `pnpm -r run --if-present typecheck`
- `pnpm lint`, `pnpm format`
- `pnpm test` (Vitest), `pnpm test:e2e` (Playwright, in `apps/web`)
- `pnpm --dir apps/server evals` (triage evaluations)
- `pnpm depcruise` (module boundaries)

## Architecture rules (non-negotiable)

1. Every business record has a `professionalId`, and **every query filters by it**.
2. A module only imports another module's facade (`modules/<x>/index.ts`), never its `domain/`, `infra/`, or tables. `assistant` and `automations` sit at the top; the others communicate through events (ADR 0004).
3. Every change that produces a side effect writes an `OutboxEvent` **in the same transaction** (ADR 0006).
4. Future actions (reminder, end of session, dunning sequence, monthly charge) are rows in `ScheduledAction`, never delayed jobs in BullMQ. At execution time, the action checks the current state before acting (ADR 0016).
5. Dates stored in UTC, displayed in `America/Sao_Paulo`.
6. Money in cents, `Int`. Never `float` or `Decimal` for amounts.
7. Webhooks and jobs are idempotent (`WebhookEvent`, `dedupeKey`, idempotency key at the gateway).
8. Sensitive fields (phone, message body, keys) are encrypted at the application level; card data never passes through Enquadre.
9. No patient data in logs, Sentry, or PostHog: IDs only.
10. References between different modules are by id only, with no Prisma relation.

## AI and patient safety rules

- Every incoming message goes through the **crisis rule** before any other processing, including AI (ADR 0010).
- AI **only suggests**. No AI call changes the schedule, billing, or a patient without a decision by the system or the psychologist (ADRs 0008 and 0014).
- AI output is always validated with Zod; a validation failure becomes a record in `AiInvocation`, never an unhandled exception.
- The prompt carries the minimum: text with phones and e-mails masked, plus the session's day/time. No name, history, or clinical data.
- Every prompt has a name and version (`triage-v3`) recorded in `AiInvocation`.
- `messaging`, `automations`, and `assistant` never mention psychology vocabulary; texts, the risk list, and intents come from the vertical profile (ADR 0015).
- **Real patient data never goes into Git**, not as an evaluation case, fixture, or example.

## Code conventions

- Strict TypeScript; no `any` (use `unknown` and narrowing). Zod at every boundary (HTTP, webhook, queue, AI output).
- Code names in English (`Patient`, `Appointment`); user-facing texts in Portuguese, coming from `packages/shared`.
- Business rules live in `domain/` or `application/`, never in the controller or the React component.
- Tests next to the code (`*.spec.ts`); edge cases for dates, cents, and idempotency always covered.

## Language

- **Everything in the repository is written in English**: documentation (`docs/`, READMEs, ADRs, changelog), code, code comments, and **all commit messages**.
- The only exception is product copy shown to end users (UI texts, messages sent to patients, the vertical profile's word lists), which stays in Portuguese in `packages/shared`.

## Documentation

- Before changing a flow, module, or entity, read the corresponding document in `docs/05-architecture/` and `docs/02-mvp/03-data-model.md`.
- New decision or change of decision: propose an ADR using the template `docs/02-mvp/decisions/_decision-template.md`. An accepted ADR is never deleted.
- Relevant changes go into `docs/03-project-journal/changelog.md`.

## The agent team

- `/commit`: reviews what changed, runs security checks, and writes the message in Conventional Commits (in English). Only runs when invoked.
- Subagent `architecture-reviewer`: reviews the diff against the rules above. Use it before every relevant commit.
- Typecheck hook: at the end of each turn, runs the typecheck of the changed packages and returns the errors.
