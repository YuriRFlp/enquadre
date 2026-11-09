# Sprint roadmap

9 MVP sprints (0 to 7, plus 6b for AI triage), about 17 weeks, plus a short card sprint, assuming 10 to 12 hours of study per week. Each sprint ends with something working.

The order starts with what you already master (front end) to learn React and TypeScript safely, then moves into the back end, and only then into the hardest parts: dates, jobs and payments. Deployment happens early, in sprint 3.

| Sprint | Duration | What to build | What to learn | Deliverable | Status |
| --- | --- | --- | --- | --- | --- |
| 0. Foundation | 1 week | Monorepo, ESLint, Prettier, strict `tsconfig`, `shared` package | Types, interfaces vs types, unions, generics, narrowing, `unknown` vs `any` | Repo on GitHub with CI running typecheck | To do |
| 1. React with fake data | 2 weeks | Login, patient list and registration, with MSW mocking the API | Components, typed props, `useState`, `useEffect`, composition, React Router, React Hook Form + Zod; compare each concept with Vue | Navigable front end with a "fake" patient CRUD | To do |
| 2. Basic back end | 2 weeks | NestJS API with patient CRUD, Postgres in Docker, Prisma | HTTP and REST, controllers, services, modules, DTOs with Zod, migrations, error handling, integration tests | API documented in Swagger, tested | To do |
| 3. Integration, authentication and infra | 2 weeks | Front end on the real API, sign-up and login, per-professional isolation, logs and Sentry, VPS with Docker Compose and Caddy, front end on Cloudflare Pages | TanStack Query, argon2, JWT in an httpOnly cookie, refresh token, guards, CORS, Linux, Docker, reverse proxy, DNS | First deploy on the VPS (Railway as plan B) | To do |
| 4. Schedule | 2 weeks | Weekly calendar, one-off and recurring sessions, session status | Dates and time zones (date-fns-tz), business rules in the service, Vitest, `useReducer`, complex components | Your mother-in-law sets up her real schedule | To do |
| 5. Events, jobs and reminders | 2 weeks | Outbox and relay, `automations` module with `ScheduledAction` and poller, generation of recurring sessions, automatic closing, e-mail and WhatsApp (Enquadre number) reminder 24h before, confirmation link, Bull Board | Transactional outbox, BullMQ and Redis, scheduled actions in PostgreSQL with `FOR UPDATE SKIP LOCKED` (ADR 0016), retries, idempotency, public routes with token, WhatsApp Cloud API and templates. **Also:** incoming message webhook, crisis rule (ADR 0010) active before the first reminder, reply inbox and neutral reply, vertical profile `psicologia.ts` (ADR 0015) | Reminders actually arriving, and no patient reply gets lost | To do |
| 6. Billing and Pix | 2 weeks | Per-session and monthly charges, `BillingSettings` with Pix locked, gateway subaccount, Pix in sandbox, automatic payment reconciliation, PDF receipt in R2, D+1/D+3/D+7 dunning sequence | External API adapter, signed webhooks, idempotency, transactions, money in cents, feature flags | Test payment marked as paid on its own | To do |
| 6b. AI triage | 1.5 weeks | Intent classifier with Zod-validated output, phone and e-mail masking, `AiInvocation` and `TriageSuggestion`, suggestion screen with approve, edit and discard, 50 synthetic evaluation cases running in CI, option to turn it off | Structured output, prompt versioning, evaluations and confidence threshold, cost and latency per call, privacy in the prompt | Rescheduling suggestion approved with one tap on the mother-in-law's phone | To do |
| 7. Dashboard and launch | 2 weeks | Monthly summary, subscription with trial, terms and privacy, PostHog | SQL aggregations, recurring billing, Playwright, LGPD basics | Open beta for 5 to 10 psychologists | To do |
| 8. Card (short) | 1 week, a few weeks after launch | Enable "Accepted methods", card events in the adapter, refund and chargeback, "paid" and "receivable" in Billing | Feature flag with an allowlist, sandbox certification | Card active for the first psychologists | To do |

After sprint 8 comes **phase 2 (WhatsApp secretary)**, 4 to 6 sprints, once there are 10 paying customers; see `../05-architecture/10-phases-and-roadmap.md`. During sprint 3, start the business and number verification with Meta, which takes from days to weeks.

## Validation in parallel

- Sprint 0: interview with the mother-in-law
- Sprints 1 and 2: conversations with her colleagues
- From sprint 4: mother-in-law using the system for real
- Sprint 5: review the risk list and the neutral copy with the mother-in-law (and, if possible, one more colleague)
- Sprint 6b onward: note which suggestions she discards and why; each becomes an evaluation case, rewritten without real data

If the interviews show the biggest pain is something else, adjust the order of sprints 4 to 6b before building. The crisis rule and the reply inbox stay in sprint 5: they ship together with the first WhatsApp reminder.

At the end of each sprint, record it in `../03-project-journal/sprint-NN.md`.
