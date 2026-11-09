# MVP scope and features

The MVP (phase 1) has 8 product modules. **P0** is the minimum for daily use; **P1** goes in before charging for the subscription. The secretary that converses on WhatsApp is phase 2; in phase 1, patients' free-text replies go through triage (ADR 0014) (see `../05-architecture/05-whatsapp-secretary.md`).

| Module | Feature | Priority | Status |
| --- | --- | --- | --- |
| Account | Sign-up and login with e-mail and password, password recovery | P0 | To do |
| Account | Professional profile: name, CRP, default session fee, default duration, Pix key | P0 | To do |
| Patients | Registration: name, phone, e-mail, session fee (overrides the default), preferred channel, status | P0 | To do |
| Patients | Search and listing with filters | P0 | To do |
| Schedule | Weekly and daily view | P0 | To do |
| Schedule | One-off and recurring sessions (weekly, biweekly) | P0 | To do |
| Schedule | Mark a session as completed, no-show, or canceled (with or without a charge) | P0 | To do |
| Schedule | Automatic closing: the session becomes "completed" at its end time, unless marked as a no-show | P0 | To do |
| Schedule | Configurable office hours | P1 | To do |
| Schedule | Daily summary at 8 p.m. with the day's sessions and quick no-show correction | P1 | To do |
| Reminders | Automatic reminder 24h before by e-mail | P0 | To do |
| Reminders | WhatsApp reminder (default channel, single Enquadre number, approved utility template) | P1 | To do |
| Reminders | Confirmation and rescheduling by the patient via buttons or a public link | P1 | To do |
| Billing | Charge per session or per monthly package | P0 | To do |
| Billing | Manual paid / pending tracking | P0 | To do |
| Billing | Pix charge via gateway with automatic payment reconciliation by webhook | P1 | To do |
| Billing | "Accepted methods" field locked to Pix (card "coming soon"), data ready for multiple methods | P1 | To do |
| Billing | PDF receipt | P1 | To do |
| Billing | Dunning sequence at D+1, D+3 and D+7, configurable | P1 | To do |
| Triage | Rule-based crisis detection on every incoming message: reply with CVV (188) and SAMU (192) and immediate alert to the psychologist | P1, mandatory in the same deploy as the WhatsApp reminder | To do |
| Triage | Reply inbox: every free-text message appears in the dashboard, linked to the patient and the session | P1 | To do |
| Triage | Single neutral reply per 24h window ("we'll pass this on to the professional") | P1 | To do |
| Triage | AI classifies the intent and extracts dates; suggested action that the psychologist approves, edits, or discards | P1 | To do |
| Triage | Logging of every AI call and an evaluation set running in CI | P1 | To do |
| Triage | Settings option to turn off AI suggestions | P1 | To do |
| Dashboard | Monthly summary: sessions, no-shows, billed, receivable | P0 | To do |
| Dashboard | No-shows before/after reminders and amount recovered | P1 | To do |
| Subscription | Plans, 14-day trial, recurring SaaS billing | P1 | To do |

Possible statuses: To do · In progress · Done · Postponed.

## Right after the MVP

| Feature | When |
| --- | --- |
| Credit and debit card through the gateway's page, enabled by the flag | A few weeks after launch (see `../05-architecture/07-payment-methods.md`) |
| Middle ground: a psychologist-specific link so the secretary can handle new contacts on the Enquadre number | If the interviews show that first contact is the biggest pain |

## Implementation notes

- **WhatsApp:** Meta's official Cloud API, no intermediary; one Enquadre number sends on behalf of the psychologist. Start the business and template verification early, because it takes from days to weeks. Until it is approved, e-mail covers the reminders. Do not send a "session confirmed" message (cost of service messages).
- **Triage:** the crisis rule runs before everything else and never depends on the AI. The prompt carries only the message text, with phone numbers and e-mails masked, and the session's day and time; no name and no history. The AI only suggests; approving calls the facade of the module that owns the action. Copy, the risk list, and intents come from the vertical profile (ADR 0015).
- **Payments:** compare Asaas, Mercado Pago and Efí. All have a sandbox, Pix and webhooks; prefer the one that offers a subaccount per psychologist and lets you choose the methods shown on the payment page.

## Out of MVP scope

See `../01-business/02-product-vision.md`. Free conversation with the secretary, booking through the bot, and the psychologist's own number are phase 2. Phase 1 triage replies with nothing beyond the neutral message and the crisis message.

## Post-MVP backlog

- Phase 2: WhatsApp secretary (welcome, booking, rescheduling through conversation), conversation inbox in the dashboard (evolution of the reply inbox), handoff to a human, psychologist's own number
- Phase 2: experiment comparing the state machine with classifier against an agent with tools restricted to a few states, measured with the same evaluation set
- Google Calendar sync
- Automatic cancellation policy
- Phase 3: encrypted clinical records (`records` module), integration with Receita Saúde, plan for small clinics
