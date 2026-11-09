# Changelog

Relevant changes to the project and the documentation, most recent first. Dates are in DD/MM/YYYY format.

| Date | Type | Description |
| --- | --- | --- |
| 04/11/2026 | Technical | ADR 0016: future actions in `ScheduledAction` in PostgreSQL with a poller and `SKIP LOCKED`; the `scheduled-actions` queue becomes an execution queue; resolves the table cited in the modules but missing from the data model |
| 04/11/2026 | Technical | ADR 0014: reply triage in phase 1 (rule-based crisis detection from the first reminder, replies inbox, AI suggests and the psychologist approves); `Handoff`, `TriageSuggestion` and `AiInvocation` entities in the MVP; sprint 6b |
| 04/11/2026 | Technical | ADR 0015: vertical profile; messaging, automations and assistant with no psychology vocabulary in the code |
| 04/11/2026 | Documentation | Links fixed to match the real structure (`03-project-journal`, `04-design-system`, `05-architecture`); README with the updated tree; study guide with an applied AI section; AI costs and a free server option |
| 26/10/2026 | Documentation | New folder 03-arquitetura (system design, study guide, diagrams); journal renamed to 04 |
| 26/10/2026 | Technical | VPS with Docker Compose instead of Railway; outbox + BullMQ; 9 modules; ADRs 0004 to 0013 |
| 26/10/2026 | Product | Payment methods: Pix at launch, card through the gateway's page behind a flag |
| 26/10/2026 | Product | WhatsApp as the default reminder channel; full secretary in phase 2 |
| 25/10/2026 | Design | Enquadre name, logo, design system and screens |
| 23/10/2026 | Documentation | Initial structure: business, MVP, decisions and journal |
| 23/10/2026 | Business | Niche chosen: self-employed psychologists |

Types: Business · Product · Technical · Documentation · Deploy.
