# Estimated costs

Fixed infrastructure fits under R$ 100 per month at the start; the only cost that grows with usage is WhatsApp. Values are approximate; check the providers' sites before setting the plan price.

| Item | Choice | Approximate monthly cost |
| --- | --- | --- |
| Server | VPS with 2 vCPU and 4 GB (Hetzner, Contabo, or similar) | R$ 30 to R$ 60 |
| DNS, HTTPS, web app | Cloudflare and Cloudflare Pages | R$ 0 |
| Backups and PDFs | Cloudflare R2 | R$ 0 up to about 10 GB |
| E-mail | Resend, free plan | R$ 0 up to a few thousand e-mails |
| Observability | Sentry, PostHog, and uptime monitor on free plans | R$ 0 |
| Domain | .com.br at registro.br | about R$ 40 per year |
| AI | Small model for reply triage (phase 1) and the secretary (phase 2) | cents per psychologist: see below |
| WhatsApp | Template messages (reminder, charge) | variable: see below |
| Gateway | Fee per Pix received (and per card, once enabled) | paid by the psychologist in the subaccount, or built into the plan |

## WhatsApp as the default reminder channel

The reminder goes out over WhatsApp, which is what reduces no-shows, with a free copy by e-mail. Per Meta's BRL price table in effect since July 2026, a utility message costs R$ 0.0350 in Brazil, versus R$ 0.3217 for a marketing one ([ChatMaxima, based on Meta's table](https://chatmaxima.com/whatsapp-api-pricing/brazil/)); confirm on the [official page](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) before setting the price. For a psychologist with 20 weekly patients, about 87 sessions per month:

| Scenario | Template messages per month | Cost per psychologist | Share of the R$ 49 plan |
| --- | --- | --- | --- |
| Reminder only | about 87 | about R$ 3 | about 6% |
| Separate reminder and charge | about 174 | about R$ 6 | about 12% |
| Reminder with payment link included | about 87 | about R$ 3 | about 6% |

With 100 psychologists, WhatsApp costs Enquadre between R$ 300 and R$ 600 per month. The development effort is about one sprint, in parallel with Meta's verification of the company, the number, and the templates, which can take from days to weeks.

### Service messages

According to a summary by respond.io, since October 1, 2026 service messages and utility templates within the 24h window are also charged, with 1,000 free service messages per number per month ([respond.io](https://respond.io/blog/whatsapp-pricing-change-2026)); confirm in the official table. In the MVP, Enquadre's number is shared by all psychologists, so this free tier is split among everyone. That is why the system does not send a "sessão confirmada" (*"session confirmed"*) message: tapping the button only updates the dashboard. The reminder text must be strictly transactional so Meta does not reclassify it as marketing.

### Neutral triage reply

Each free-text message gets at most one neutral reply per 24h window (ADR 0014). It is a service message and consumes the shared number's free tier; beyond it, R$ 0.035 each. With 20 patients, the estimate is 20 to 40 replies per month, at most about R$ 1.40 per psychologist. If the free tier gets tight, the neutral reply can become optional per psychologist.

## AI

Price reference as of November 2026: Claude Haiku 5.5 costs US$ 0.10 per million input tokens and US$ 0.50 per million output tokens for prompts up to 100k tokens ([official pricing](https://platform.claude.com/docs/en/about-claude/pricing); confirm before setting the price). One triage classification uses about 1,500 input tokens and 100 output tokens, i.e., about US$ 0.0002. A hundred free-text messages per month cost about US$ 0.02 per psychologist. In phase 2, the secretary multiplies the calls, but it stays in the cents. The actual cost is stored in `AiInvocation.costMicroUsd`.

### Three levers to reduce this cost

- Include the payment link in the reminder itself for patients who pay before the session.
- Patients with monthly billing receive one charge per month, not one per session.
- Offer e-mail as the main channel for those who prefer it; the psychologist chooses per patient.

## Zero-cost server option at the start

The same `docker-compose.yml` runs on a VM in Oracle Cloud's Always Free tier, which brings the server cost to zero during development and the beta. Machine availability on that tier tends to be unstable and the terms may change, so treat it as a temporary option: migrating to the paid VPS (ADR 0005) means copying the compose file, restoring the R2 backup, and pointing the DNS. With the first paying psychologist, the paid VPS becomes worth it for its predictability.
