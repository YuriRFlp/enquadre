# 0014 — Triage of patient replies starting in phase 1, with AI suggesting and the psychologist approving

- **Date:** 04/11/2026
- **Status:** Accepted. Complements 0008 and 0010

## Context

In phase 1 the patient "only receives" reminders and charges from Enquadre's shared number, but in practice they reply in free text: "posso trocar pra quinta?" (*"can I switch to Thursday?"*), "não vou conseguir ir, tô mal" (*"I won't be able to make it, I'm not well"*), "já paguei ontem" (*"I already paid yesterday"*). No document defined what happens to these messages. Worse: crisis detection (0010) was designed for the phase 2 secretary, and a risk message can arrive in the very first month of use without anyone seeing it.

In addition, the project also serves as an AI engineering portfolio, and the original plan had no use of AI before phase 2.

## Options considered

1. Ignore free text in phase 1: zero effort, but leaves crises and rescheduling requests unanswered. Unacceptable.
2. Only forward free text to the psychologist: safe, but no product gain or AI learning.
3. Layered triage: crisis rule always active, a reply inbox in the dashboard, and a small model that classifies the intent and suggests an action, which the psychologist approves with one tap.
4. Full secretary already in the MVP: highest value, but brings forward the risk and timeline that pushed the secretary to phase 2.

## Decision

Option 3, in three layers, in this order:

1. **Rule-based crisis detection (0010), active from phase 1.** Every incoming message goes through the risk list before anything else. If it matches, the patient receives the reply with CVV (188, Brazil's suicide prevention helpline) and SAMU (192, emergency medical service), the psychologist receives an immediate alert, and the AI is not even called. It ships in the same deploy as WhatsApp, never later.
2. **Reply inbox.** All free text shows up in the dashboard, linked to the patient and to the reminder's session, as a `Handoff` with reason `FREE_TEXT`. The patient receives a single neutral reply per 24h window ("Recebemos sua mensagem e vamos repassar para Marta Lima", *"We received your message and will pass it on to Marta Lima"*), so they are not left without a response.
3. **AI suggestion.** A small model receives only the message text (with phone numbers and e-mails masked) and the minimal session context (weekday and time, no name) and returns JSON validated with Zod: intent (`CONFIRM`, `RESCHEDULE`, `CANCEL`, `PAYMENT_INFO`, `QUESTION`, `OTHER`), date and time of day when present, and confidence. Above the threshold, the dashboard shows the suggested action ("Pediu para remarcar para quinta 15h. Aprovar?", *"Asked to reschedule to Thursday 3 pm. Approve?"*); below it, only the message. Approving calls the facade of the module that owns the action (e.g. `scheduling.reschedule`); the AI never changes the schedule or charges on its own.

Every AI call is recorded in `AiInvocation` (model, prompt version, tokens, cost, latency, result), without message content. Every psychologist decision (approved, edited, discarded) is recorded in `TriageSuggestion`.

## Consequences

- The safety gap closes: crises are handled from the very first reminder sent.
- The psychologist no longer reads and interprets each reply on their personal WhatsApp; they approve with one tap.
- The phase 2 evaluation set is born: the psychologist's decisions are the label for each case. The rate of suggestions approved without edits becomes the metric that tells when it is safe to let the secretary act on its own.
- Cost: cents of AI per psychologist, plus the neutral replies, which consume the service-message free tier of the shared number (see `../../05-architecture/09-costs.md`).
- Effort: about a week and a half (sprint 6b) plus the crisis layer and the inbox in sprint 5.
- Evaluation cases versioned in Git are synthetic or rewritten by hand, with no real data at all. Real messages exist only in the database, encrypted, and never go to the repository, logs, Sentry, or PostHog.
- The message text is sent to the AI provider. Before turning it on in production: check the provider's data retention and usage policy, mention the processing in the privacy policy, and allow the AI suggestion to be turned off in the psychologist's settings.
- Revisit if the approval-without-edit rate stays below 70% after a month of real use, or if the free-text volume is so low that the simple inbox is enough.

Details in `../../05-architecture/05-whatsapp-secretary.md`.
