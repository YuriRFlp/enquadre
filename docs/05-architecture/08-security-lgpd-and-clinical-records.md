# Security, LGPD, and clinical records

## Security, LGPD, and reliability

Since the system handles health data and money, security and reliability come in from sprint 3 onward, not as a final step.

| Topic | Decision |
| --- | --- |
| Authentication | Password with argon2, short-lived JWT in an httpOnly cookie + rotating refresh token; optional Google login |
| Public links | Random 128-bit token per session or charge, expires, shows only the first name |
| Webhooks | Signature validated (Meta and gateway), raw event stored, deduplicated by external id |
| Sensitive data | Phone numbers, message bodies, and API keys encrypted in the database (AES-256-GCM, key outside the database). Card data never passes through Enquadre: the patient types it on the gateway's page |
| AI | Prompt without name, phone, or history; only state and last message. Provider that does not train on the data |
| Logs and analytics | Only ids; never name, phone, or message text |
| LGPD (Brazil's data protection law) | Consent per channel, opt-out in every message, data export and deletion, configurable message retention, data processing agreement with each provider |
| Backups | Daily encrypted `pg_dump` to R2, 30-day retention, restore tested once a month |
| External failures | Exponential retry; once exhausted, an alert and an item on the psychologist's "pendências" (*"pending issues"*) screen |
| Limits | Per-IP rate limit on login and public links; send limit per WhatsApp number |

With clinical data out of the MVP, Enquadre stores personal, scheduling, and payment data. The mere fact that someone is a psychologist's patient is already sensitive, so encryption and minimization apply from the start. Before launch, a review with a lawyer specialized in LGPD is worthwhile; the brother-in-law may be a good start.

## Clinical records

The clinical record (progress notes, per-session information, patient file) stays out of the MVP and comes in phase 3 as an isolated module, `records`; the data entry is simple, but it becomes the most sensitive data in the system and raises the bar for security and rules.

### What goes beyond data entry

- **Professional rules:** the Federal Council of Psychology (Conselho Federal de Psicologia) requires documented records kept for at least 5 years (CFP Resolution 001/2009, as amended), and the Code of Ethics defines confidentiality. Confirm the current regulation with the council or a lawyer.
- **LGPD:** health data, a sensitive category. The psychologist is the controller and Enquadre the processor: data processing agreement, incident response plan, and reviewed providers.
- **Encryption:** a dedicated key per psychologist (envelope encryption); the text is never readable in the database or in backups.
- **Access and auditing:** mandatory two-factor authentication to open the clinical record, logging of every read, no support access without explicit authorization.
- **Integrity:** a note is locked after a set period; corrections become addenda, not edits.
- **Export and retention:** PDF of the clinical record for a patient request or transfer, and controlled deletion after the legal period.
- **Kept away from AI:** no clinical content goes to AI models without explicit consent.

### Versions and approximate effort

| Version | What it includes | Approximate effort |
| --- | --- | --- |
| Basic and secure | Per-session note, progress notes and patient file, encryption with a per-psychologist key, 2FA, auditing, locking and addenda, PDF export | 2 to 3 sprints |
| With attachments | Upload of documents and tests, encrypted in R2 | 1 more sprint |
| No Enquadre access | In-browser encryption and recovery key; if the psychologist loses both the password and the key, the data is lost | 2 to 3 more sprints |

**How it fits into the architecture.** `records` has its own tables, encryption key, and permissions. It links to sessions and patients only by id, does not publish events with content, and no other module reads its data. That is why adding it later does not require redoing anything from the MVP.

**Positioning.** The clinical record turns Enquadre from a scheduling tool into a practice management system and greatly increases retention. The idea is to offer it in a higher-priced plan, after the first paying customers have validated scheduling and billing, and with a legal review before launch.
