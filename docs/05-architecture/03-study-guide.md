# Study guide: every piece explained

What each part of the infrastructure and backend is, what it does in Enquadre, and why it was chosen. Use it as a study roadmap while the system is being built.

## The path of a request

When the psychologist opens the dashboard and taps "Nova sessão" (*"New session"*):

1. The browser asks **DNS** for the IP address of `app.enquadre...` and `api.enquadre...`. Cloudflare answers.
2. The dashboard (HTML, CSS and JavaScript) has already come from **Cloudflare Pages**, served from a server close to her.
3. The dashboard's JavaScript makes an HTTPS request to the API. It goes through **Cloudflare**, which filters attacks, and reaches the **VPS**.
4. On the VPS, **Caddy** accepts the connection on port 443, handles HTTPS, and forwards the request to the **API** container.
5. The **API (NestJS)** checks who is logged in, validates the data, and runs the use case: it writes the session to **PostgreSQL** and, in the same transaction, writes an event to the **outbox**.
6. The **worker** reads the event and creates jobs in **Redis** with **BullMQ**, for example the reminder due three days from now.
7. The API responds with JSON and the dashboard shows the session. The reminder will be sent by the worker at the right time, without anyone waiting for it now.

## Infrastructure

**DNS and Cloudflare.** DNS is the internet's "phone book": it translates a name like `enquadre.com.br` into the server's IP address. Cloudflare hosts that DNS and, with proxy mode on, sits in front of the server: traffic goes through it before reaching the VPS. That way it hides the server's real IP, blocks denial-of-service attacks, and serves HTTPS certificates to visitors. *Why here:* the free plan covers all of this, and moving to another server later is just a matter of changing a DNS record.

**CDN and Cloudflare Pages.** A CDN (content delivery network) keeps copies of static files on servers spread around the world, so each person downloads from the nearest one. After `vite build`, the React dashboard is just static files; Cloudflare Pages publishes them to the CDN on every push to GitHub. *Why here:* serving the front end from the VPS would waste the server's CPU and bandwidth for no reason, and Pages is free and fast.

**VPS.** A virtual private server is a rented virtual machine with guaranteed CPU, memory and disk, where you have full access (SSH, root). Unlike a platform such as Railway or Render (PaaS), which decides how your app runs and charges per service, on a VPS you install and maintain everything. *Why here:* a small VPS runs the API, worker, database and Redis for a low fixed price, and it is the best infrastructure school: you learn Linux, networking, firewalls and backups for real. *What to watch:* security updates, firewall (only ports 22, 80 and 443 open), SSH key login, and backups.

**Docker.** Packages an application with everything it needs (Node, libraries, files) into an image; a container is that image running, isolated from the others. What runs on your computer runs the same on the server. *Why here:* the API and worker become a single image, built in CI, and the server only needs Docker installed.

**Docker Compose.** A `docker-compose.yml` file that describes several containers and how they connect: caddy, api, worker, postgres and redis, with ports, volumes (where data is stored) and environment variables. A single `docker compose up -d` brings everything up. *Why here:* it is the simplest way to orchestrate a few containers on a single server. Kubernetes solves the same problem for dozens of servers, with far more complexity; it makes no sense right now.

**Caddy: reverse proxy, HTTPS and load balancer.** A *reverse proxy* is a server that sits in front of the application: it receives every request from the internet and forwards it to the right service inside. The application is never exposed directly. A *load balancer* is a reverse proxy that distributes requests across several copies of the application, to share the work and stay up if one copy goes down. Caddy does both and also obtains and renews HTTPS certificates on its own (via Let's Encrypt). In Enquadre, it receives traffic on ports 80 and 443, handles HTTPS, and forwards to the API container; the other containers (database, Redis, worker) don't even have a port open to the outside. When the API needs two copies, you just list them in the `Caddyfile` and Caddy starts balancing. *Why Caddy and not Nginx:* both are great, but Caddy does automatic HTTPS with a configuration file of a few lines, while Nginx requires setting up Certbot separately. *Why not a cloud load balancer:* it would cost more than the VPS itself to, today, distribute load across a single copy.

**Object storage (Cloudflare R2).** Stores files (receipt PDFs, backups) accessed through an API compatible with Amazon S3, instead of a regular disk. It is cheap, doesn't fill up the VPS disk, and isn't lost if the server breaks. *Why R2:* unlike S3, it doesn't charge for data egress, and it has a free tier.

**Backups.** A `pg_dump` is a "snapshot" of the database in a file. A cron job (the Linux task scheduler) runs the dump every night, encrypts the file and sends it to R2, keeping 30 days. *The golden rule:* a backup that has never been restored is not a backup; that's why the plan includes testing the restore every month.

**Observability.** The ability to know what the system is doing without guessing. **Sentry** captures errors with the line of code and context; **PostHog** records usage events (who booked, who confirmed) to measure the product; an **uptime monitor** hits `/health` every minute and alerts if the system goes down. **Structured logs** in JSON (Pino) record each request with an id, so a failure can be traced end to end. Details in `../02-mvp/04-observability.md`.

**CI/CD and image registry.** *CI* (continuous integration) runs lint, type checking and tests on every push, so nothing broken reaches the main branch. *CD* (continuous delivery) publishes the new version automatically. In Enquadre, GitHub Actions builds the Docker image, pushes it to GitHub Container Registry (an image "warehouse") and, over SSH, tells the server to pull the new image, run the migrations and restart the containers.

## Backend and patterns

**NestJS.** A Node.js framework with TypeScript that organizes the backend into modules, controllers (receive HTTP), services (rules) and providers. It uses *dependency injection*: instead of a class creating what it needs (`new PrismaClient()`), it declares the dependency and the framework hands it over ready to use. This makes testing easier, because in tests you hand over a fake version. *Why here:* it imposes a structure similar to that of large companies, which teaches architecture, and it fits the modular monolith well.

**REST API.** An API style in which each resource has an address (`/patients`, `/appointments/123`) and the HTTP verbs state the action: GET reads, POST creates, PATCH updates, DELETE removes. Responses in JSON and standard HTTP status codes (200 ok, 201 created, 400 invalid data, 401 not logged in, 404 not found).

**API and worker: two processes, one codebase.** The API must respond fast; the worker does the work that can wait or take a while (sending messages, generating PDFs, calling the gateway). They share the same code but start from different entry points (`main.api.ts` and `main.worker.ts`). If WhatsApp gets slow, only the worker suffers; the dashboard stays fast.

**PostgreSQL.** A relational database: it stores data in tables linked by keys (a session points to a patient). It guarantees *ACID transactions*: a set of changes happens entirely or not at all, even if the server crashes midway. *Why here:* scheduling and money need that guarantee, and PostgreSQL also has JSON, full-text search and Row Level Security without needing another database.

**Prisma and migrations.** Prisma is an ORM: you describe the tables in `schema.prisma` and it generates a typed TypeScript client to query the database. A *migration* is a versioned SQL file that moves the database from one schema version to the next; migrations run in order in each environment, so the production database always matches the code.

**Redis.** An extremely fast in-memory key-value database. It is not the source of truth (that's PostgreSQL); it is used for short-lived data. In Enquadre, it holds the job queues and the rate-limit counters.

**Queues and BullMQ.** A queue holds tasks to be done later by a consumer (the worker). BullMQ is the Node queue library that uses Redis. It offers *retries* (if sending fails, try again with increasing backoff: 1s, 4s, 16s...), *delayed jobs* (run 3 days from now), *repeatable jobs* (every day at 3 a.m.) and *rate limiting* (at most N sends per second). *Why here:* without a queue, WhatsApp being down would make the psychologist's request fail; with a queue, the work waits and gets done when the service comes back.

**Scheduled actions in the database and `SKIP LOCKED`.** BullMQ can schedule a job for 3 days from now, but then the future lives only in Redis, which has no backup. In Enquadre, each future action is a row in `ScheduledAction`, and a poller asks every minute "what is due?". So that two workers don't grab the same row, the query uses `SELECT ... FOR UPDATE SKIP LOCKED`: each worker locks the rows it took, and the others simply skip the locked ones instead of waiting. It is the same pattern used by queue systems built on PostgreSQL. *Why here:* the database backup now includes the future, and rescheduling or changing the dunning sequence becomes an `UPDATE`.

**Transactional outbox.** Problem: writing the session to the database and creating the reminder job in Redis are two operations in two systems; if the server crashes between them, you end up with a session without a reminder. Solution: write the session and an "event to publish" record to the `OutboxEvent` table in the *same* PostgreSQL transaction. A process (the relay) reads that table and creates the jobs. If it crashes, when it comes back it picks up where it left off.

**Webhooks and idempotency.** A webhook is the opposite of an API call: instead of Enquadre asking "has the Pix been paid?", the gateway calls an Enquadre endpoint when the payment happens. Providers may send the same webhook more than once; *idempotency* means ensuring that processing the same event twice has the same effect as processing it once. In Enquadre, the event id is stored in `WebhookEvent` with a unique constraint; the second arrival is ignored.

**Authentication with JWT and cookies.** A JWT is a signed token that says "this is user 42, valid until 10:15". The API checks the signature without querying the database. It lives in an *httpOnly cookie*, which the page's JavaScript cannot read, protecting against theft by malicious scripts. Since the JWT is short-lived (15 minutes), a long-lived *refresh token*, stored in the database and rotated on every use, issues new JWTs without asking for the password again.

**Server-Sent Events (SSE).** An HTTP connection that stays open and through which the server sends notifications to the browser ("Ana confirmou", *"Ana confirmed"*). Simpler than WebSocket because the flow is one-way, from the server to the dashboard.

**Envelope encryption.** Each piece of sensitive data is encrypted with a data key; that key, in turn, is encrypted with a master key kept outside the database (an environment variable or a secrets vault). Whoever steals the database can read nothing without the master key, and rotating the master key doesn't require re-encrypting all the data.

**Rate limiting.** Counts how many requests an IP or user has made in a time window and rejects the excess (HTTP 429). It protects login against password-guessing attempts and public links against abuse.

**Feature flags.** An on/off switch read at runtime that enables a feature without a new deploy, for everyone or for a list of users. This is how card payments come in: the code ships to production switched off and is turned on gradually.

**Multi-tenancy and Row Level Security.** Multi-tenancy means serving several customers (tenants, here the psychologists) on the same system and database without any of them seeing another's data. The first barrier is the code: every query filters by `professionalId`. The second is PostgreSQL's *Row Level Security*: a rule in the database itself that hides other tenants' rows, even if a developer forgets the filter.

## Applied AI

**Structured output.** Instead of asking the model for text, you ask for JSON with fixed fields (intent, date, confidence) and validate it with the same Zod schema used in the rest of the system. A response outside the format is treated as an error, logged, and produces no suggestion. *Why here:* the system needs a decision the code understands, not a paragraph.

**AI suggests, rules decide.** The model never calls scheduling or billing. It proposes; the module facade validates (free slot, lead time, patient belongs to the right psychologist) and only then executes, in phase 1 after the psychologist's approval. That way a model mistake becomes a discarded suggestion, not a wrong session.

**Confidence threshold.** The model also returns a confidence from 0 to 1. Below the threshold, the system suggests nothing and just shows the message. The threshold starts conservative and is tuned with approval data.

**Prompt versioning.** Each prompt has a name and a version (`triage-v3`), stored in `AiInvocation`. This allows comparing versions with real data and rolling back if a change makes results worse.

**Evaluations (evals).** A set of example messages with the expected answer, run in CI like a test. Every prompt or model change shows how many cases it got right before and after. In Enquadre, the cases are synthetic or rewritten from the psychologist's discards, with no real data. It is the equivalent of automated tests for a probabilistic component.

**Cost and latency per call.** Each call records tokens, cost and time. That is what makes it possible to state, with numbers, that the AI costs cents and responds fast, and to notice when that stops being true.

**Privacy in the prompt.** The prompt carries the minimum: the message text with phone numbers and e-mails masked, and the session's day and time. Never the name, history or any clinical data. Before going to production, check the AI provider's data retention policy and mention the processing in the privacy policy.

**Rules before models on critical paths.** Crisis detection is a list reviewed by psychologists, not AI, because it must be predictable and auditable. AI may become a reinforcement in the future, never a replacement.
