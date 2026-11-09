# Data model

Every entity belongs to a `Professional`, the system's "tenant": it has a `professionalId` (directly or through its parent entity), and fields holding a phone number or message content are encrypted in the application. **Update this file with every Prisma migration.**

## Entities by module

| Entity | Module | What it stores | Phase |
| --- | --- | --- | --- |
| Professional | identity | Psychologist's account, CRP, default price and duration, Pix key, time zone | MVP |
| RefreshToken | identity | Rotating session tokens | MVP |
| Contact | patients | Someone who talked to the secretary and is not a patient yet: phone (encrypted), name, source, status (new, in conversation, converted, discarded) | MVP (data), full use in phase 2 |
| Patient | patients | Contact info, session price, billing type, preferred channel, status | MVP |
| Consent | patients | LGPD (Brazil's data protection law) legal basis per channel: type (messages, terms), channel, date, text version | MVP |
| AvailabilityRule | scheduling | Working hours: day, start, end, modality | MVP |
| AvailabilityBlock | scheduling | Vacations, holidays, appointments | MVP |
| SlotHold | scheduling | 10-minute hold during the conversation | Phase 2 |
| AppointmentSeries | scheduling | Recurrence rule | MVP |
| Appointment | scheduling | One session: start, end, modality, link, status, source, price | MVP |
| Conversation | messaging | Channel, contact or patient, 24h window open until, mode (bot or human) | MVP |
| Message | messaging | Direction, type, body (encrypted), unique external id, status, cost category | MVP |
| MessageTemplate | messaging | Mirror of the templates approved by Meta | MVP |
| AssistantSession | assistant | State machine state and collected data | Phase 2 |
| Handoff | assistant | Psychologist's attention queue: reason (crisis, free text, not understood, asked for a human), status | MVP (crisis and free text), expanded in phase 2 |
| TriageSuggestion | assistant | Action suggested by the AI for an incoming message: intent, proposed date, confidence, psychologist's decision | MVP |
| AiInvocation | assistant | Each AI call: purpose, model, prompt version, tokens, cost, latency, outcome. No message content | MVP |
| AutomationSettings | automations | Reminder lead time, no-show policy, dunning sequence, quiet hours | MVP |
| ScheduledAction | automations | Future action: type (reminder, end of session, dunning step, monthly charge), target, when, status, attempts | MVP |
| BillingSettings | billing | Accepted methods (default `[PIX]`), pass card fee on to the patient | MVP |
| PayoutAccount | billing | Psychologist's subaccount at the gateway | MVP |
| Charge | billing | Charge: amount, due date, status, allowed methods, Pix data and payment link | MVP |
| Payment | billing | Payment: method, status (confirmed, received, refunded, charged back), dates | MVP |
| Receipt | billing | Receipt generated after the payment is reconciled, PDF in R2 | MVP |
| WebhookEvent | platform | Received events, for idempotency | MVP |
| OutboxEvent | platform | Events written in the same transaction as the change | MVP |
| Subscription | subscription | Psychologist's SaaS plan, trial, status | MVP |
| AuditLog, DataRequest | privacy | Audit trail and LGPD requests (export, deletion) | MVP |

Clinical records (the `records` module) are left for phase 3, with their own tables and key; see `../05-architecture/08-security-lgpd-and-clinical-records.md`.

## Main relationships

```
Professional 1──N Patient, Contact, AppointmentSeries, Appointment, Charge
Professional 1──1 Subscription, BillingSettings, AutomationSettings, PayoutAccount
Contact      1──1 Patient                 (when converted)
AppointmentSeries 1──N Appointment        (materialized sessions)
Charge       1──N Appointment             (one charge can group the month)
Charge       1──N Payment 1──1 Receipt
Conversation 1──N Message
Conversation 1──N Handoff                 (by id, no Prisma relation: different modules)
Message      1──0..1 TriageSuggestion     (by id, no Prisma relation: different modules)
TriageSuggestion N──1 AiInvocation
Appointment, Charge 1──N ScheduledAction (by id, no Prisma relation: different modules)
```

## Modeling decisions

1. **Recurring sessions are materialized.** A job generates the sessions for the next 8 weeks from the series. See `decisions/0003-materialized-recurring-sessions.md`.
2. **Charge separate from the session, payment separate from the charge.** Allows charging per session or closing the month, and prepares for cards (confirmed ≠ received), refunds and partial payments.
3. **Payment methods ready from the MVP.** `BillingSettings.acceptedMethods` and `Charge.allowedMethods`; enabling cards requires no migration (ADR 0009).
4. **Patients have no login.** They interact only through WhatsApp and token links (confirm session, pay).
5. **Contact before patient.** Whoever writes in becomes a `Contact`; they only become a `Patient` when confirming the first session.
6. **The AI only suggests.** `TriageSuggestion` stores the proposal and the psychologist's decision; what changes the session is the `scheduling` facade, called on approval. The decisions become the labels of the evaluation set (ADR 0014).
7. **Cross-module references by id only.** `assistant` and `automations` tables store ids from other modules (`conversationId`, `messageId`, `appointmentId`, `targetId`) as text, with no Prisma foreign key, to respect the module boundary (ADR 0004).
8. **The future lives in the database.** Reminders, end of session and the dunning sequence are rows in `ScheduledAction`, not delayed jobs in Redis; a poller publishes the due ones for execution. Losing Redis loses no action (ADR 0016).

## Prisma schema

```prisma
// ---------- identity ----------
model Professional {
  id                  String   @id @default(cuid())
  name                String
  email               String   @unique
  passwordHash        String
  crp                 String?
  phone               String?
  pixKey              String?
  defaultPriceCents   Int      @default(0)
  defaultDurationMin  Int      @default(50)
  timezone            String   @default("America/Sao_Paulo")
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  patients           Patient[]
  contacts           Contact[]
  series             AppointmentSeries[]
  appointments       Appointment[]
  charges            Charge[]
  availabilityRules  AvailabilityRule[]
  availabilityBlocks AvailabilityBlock[]
  conversations      Conversation[]
  refreshTokens      RefreshToken[]
  subscription       Subscription?
  billingSettings    BillingSettings?
  automationSettings AutomationSettings?
  payoutAccount      PayoutAccount?
}

model RefreshToken {
  id             String    @id @default(cuid())
  professionalId String
  tokenHash      String    @unique
  expiresAt      DateTime
  revokedAt      DateTime?
  professional   Professional @relation(fields: [professionalId], references: [id])
}

// ---------- patients ----------
enum ContactStatus { NEW IN_CONVERSATION CONVERTED DISCARDED }
enum PatientStatus { ACTIVE INACTIVE }
enum BillingType   { PER_SESSION MONTHLY }
enum Channel       { EMAIL WHATSAPP }

model Contact {
  id             String        @id @default(cuid())
  professionalId String
  phoneEnc       String        // encrypted
  phoneHash      String        // lookup by phone without decrypting
  name           String?
  source         String        // whatsapp, link, painel
  status         ContactStatus @default(NEW)
  createdAt      DateTime      @default(now())

  professional Professional @relation(fields: [professionalId], references: [id])
  patient      Patient?

  @@index([professionalId, phoneHash])
}

model Patient {
  id               String        @id @default(cuid())
  professionalId   String
  contactId        String?       @unique
  name             String
  phoneEnc         String?       // encrypted
  phoneHash        String?
  email            String?
  priceCents       Int?          // null = uses the professional's default
  billingType      BillingType   @default(PER_SESSION)
  preferredChannel Channel       @default(WHATSAPP)
  status           PatientStatus @default(ACTIVE)
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  professional  Professional        @relation(fields: [professionalId], references: [id])
  contact       Contact?            @relation(fields: [contactId], references: [id])
  series        AppointmentSeries[]
  appointments  Appointment[]
  charges       Charge[]
  consents      Consent[]

  @@index([professionalId, status])
  @@index([professionalId, phoneHash])
}

model Consent {
  id          String   @id @default(cuid())
  patientId   String
  kind        String   // MESSAGES, TERMS
  channel     Channel?
  textVersion String
  grantedAt   DateTime @default(now())
  revokedAt   DateTime?
  patient     Patient  @relation(fields: [patientId], references: [id])
}

// ---------- scheduling ----------
enum Frequency         { WEEKLY BIWEEKLY }
enum Modality          { IN_PERSON ONLINE }
enum AppointmentStatus { SCHEDULED CONFIRMED DONE NO_SHOW CANCELED CANCELED_LATE }
enum AppointmentSource { PANEL BOT LINK }

model AvailabilityRule {
  id             String   @id @default(cuid())
  professionalId String
  weekday        Int      // 0 = Sunday
  startTime      String   // "08:00"
  endTime        String   // "20:00"
  modality       Modality?
  professional   Professional @relation(fields: [professionalId], references: [id])
}

model AvailabilityBlock {
  id             String   @id @default(cuid())
  professionalId String
  startsAt       DateTime
  endsAt         DateTime
  reason         String?
  professional   Professional @relation(fields: [professionalId], references: [id])
}

model AppointmentSeries {
  id              String    @id @default(cuid())
  professionalId  String
  patientId       String
  frequency       Frequency
  weekday         Int       // 0 = Sunday
  startTime       String    // "14:00", in the professional's time zone
  durationMin     Int
  startsOn        DateTime
  endsOn          DateTime?
  active          Boolean   @default(true)

  professional  Professional  @relation(fields: [professionalId], references: [id])
  patient       Patient       @relation(fields: [patientId], references: [id])
  appointments  Appointment[]
}

model Appointment {
  id              String            @id @default(cuid())
  professionalId  String
  patientId       String
  seriesId        String?
  chargeId        String?
  startsAt        DateTime          // UTC
  endsAt          DateTime
  modality        Modality          @default(IN_PERSON)
  meetingUrl      String?
  status          AppointmentStatus @default(SCHEDULED)
  source          AppointmentSource @default(PANEL)
  billable        Boolean           @default(true) // whether a no-show is charged
  priceCents      Int
  publicToken     String            @unique @default(cuid())
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  professional   Professional       @relation(fields: [professionalId], references: [id])
  patient        Patient            @relation(fields: [patientId], references: [id])
  series         AppointmentSeries? @relation(fields: [seriesId], references: [id])
  charge         Charge?            @relation(fields: [chargeId], references: [id])

  @@index([professionalId, startsAt])
}

// ---------- messaging ----------
enum MessageDirection { INBOUND OUTBOUND }
enum MessageStatus    { QUEUED SENT DELIVERED READ FAILED }
enum ConversationMode { BOT HUMAN }

model Conversation {
  id              String           @id @default(cuid())
  professionalId  String
  channel         Channel
  contactId       String?
  patientId       String?
  windowOpenUntil DateTime?        // WhatsApp 24h window
  mode            ConversationMode @default(BOT)
  optedOutAt      DateTime?
  professional    Professional     @relation(fields: [professionalId], references: [id])
  messages        Message[]
}

model Message {
  id             String           @id @default(cuid())
  conversationId String
  direction      MessageDirection
  type           String           // template, text, button
  templateName   String?
  bodyEnc        String?          // encrypted
  externalId     String?          @unique // Meta id: prevents duplicates
  status         MessageStatus    @default(QUEUED)
  costCategory   String?          // utility, marketing, service
  appointmentId  String?
  chargeId       String?
  error          String?
  createdAt      DateTime         @default(now())
  conversation   Conversation     @relation(fields: [conversationId], references: [id])
}

model MessageTemplate {
  id        String @id @default(cuid())
  name      String @unique
  category  String // UTILITY
  language  String @default("pt_BR")
  variables Json
  status    String // APPROVED, PENDING, REJECTED
}

// ---------- assistant ----------
enum HandoffReason    { CRISIS FREE_TEXT LOW_CONFIDENCE HUMAN_REQUESTED }
enum HandoffStatus    { OPEN ACKNOWLEDGED RESOLVED }
enum TriageIntent     { CONFIRM RESCHEDULE CANCEL PAYMENT_INFO QUESTION OTHER }
enum SuggestionStatus { PENDING APPROVED EDITED DISMISSED EXPIRED }

model Handoff {
  id              String        @id @default(cuid())
  professionalId  String
  conversationId  String        // id in messaging, no FK
  messageId       String?       // id in messaging, no FK
  reason          HandoffReason
  status          HandoffStatus @default(OPEN)
  createdAt       DateTime      @default(now())
  acknowledgedAt  DateTime?
  resolvedAt      DateTime?

  @@index([professionalId, status])
}

model TriageSuggestion {
  id               String           @id @default(cuid())
  professionalId   String
  messageId        String           @unique // id in messaging, no FK
  appointmentId    String?          // session of the reminder that was answered, no FK
  intent           TriageIntent
  proposedStartsAt DateTime?        // UTC, when the intent is to reschedule
  confidence       Float            // 0 to 1, returned by the model
  status           SuggestionStatus @default(PENDING)
  decidedAt        DateTime?
  aiInvocationId   String?
  createdAt        DateTime         @default(now())
  aiInvocation     AiInvocation?    @relation(fields: [aiInvocationId], references: [id])

  @@index([professionalId, status])
}

model AiInvocation {
  id             String   @id @default(cuid())
  professionalId String
  purpose        String   // triage; in phase 2, assistant
  model          String
  promptVersion  String   // e.g. triage-v3
  inputTokens    Int
  outputTokens   Int
  costMicroUsd   Int      // cost in millionths of a dollar, integer
  latencyMs      Int
  outcome        String   // ok, invalid_json, low_confidence, error
  createdAt      DateTime @default(now())
  suggestions    TriageSuggestion[]

  @@index([purpose, createdAt])
}

// ---------- automations ----------
model AutomationSettings {
  id                   String  @id @default(cuid())
  professionalId       String  @unique
  reminderHoursBefore  Int     @default(24)
  lateCancelHours      Int     @default(24)
  chargeLateCancel     Boolean @default(true)
  dunningDays          Int[]   @default([1, 3, 7])
  quietStart           String  @default("21:00")
  quietEnd             String  @default("08:00")
  approveNewPatients   Boolean @default(false)
  professional         Professional @relation(fields: [professionalId], references: [id])
}

enum ScheduledActionKind   { REMINDER END_SESSION DUNNING_STEP MONTHLY_BILLING }
enum ScheduledActionStatus { PENDING DISPATCHED DONE CANCELED FAILED }

model ScheduledAction {
  id             String                @id @default(cuid())
  professionalId String
  kind           ScheduledActionKind
  targetId       String                // appointmentId, chargeId or patientId, no FK
  runAt          DateTime              // UTC
  status         ScheduledActionStatus @default(PENDING)
  attempts       Int                   @default(0)
  dispatchedAt   DateTime?             // to republish if stuck in DISPATCHED
  finishedAt     DateTime?
  lastError      String?               // no patient data
  dedupeKey      String                @unique // e.g. reminder:apt_123:2026-11-10T17:00Z
  createdAt      DateTime              @default(now())

  @@index([status, runAt])
  @@index([professionalId, status])
  @@index([kind, targetId])
}

// ---------- billing ----------
enum PaymentMethod { PIX CREDIT_CARD DEBIT_CARD }
enum ChargeStatus  { PENDING PAID OVERDUE CANCELED }
enum PaymentStatus { CONFIRMED RECEIVED REFUNDED CHARGEBACK }

model BillingSettings {
  id                   String          @id @default(cuid())
  professionalId       String          @unique
  acceptedMethods      PaymentMethod[] @default([PIX])
  passCardFeeToPatient Boolean         @default(false)
  professional         Professional    @relation(fields: [professionalId], references: [id])
}

model PayoutAccount {
  id                String @id @default(cuid())
  professionalId    String @unique
  provider          String // asaas, mercadopago, efi
  externalAccountId String
  status            String // PENDING, ACTIVE
  apiKeyEnc         String? // encrypted
  professional      Professional @relation(fields: [professionalId], references: [id])
}

model Charge {
  id              String          @id @default(cuid())
  professionalId  String
  patientId       String
  amountCents     Int
  dueDate         DateTime
  status          ChargeStatus    @default(PENDING)
  allowedMethods  PaymentMethod[] @default([PIX]) // copied at creation time
  gatewayId       String?         @unique
  pixCopyPaste    String?
  checkoutUrl     String?
  publicToken     String          @unique @default(cuid())
  createdAt       DateTime        @default(now())

  professional   Professional   @relation(fields: [professionalId], references: [id])
  patient        Patient        @relation(fields: [patientId], references: [id])
  appointments   Appointment[]
  payments       Payment[]

  @@index([professionalId, status, dueDate])
}

model Payment {
  id          String        @id @default(cuid())
  chargeId    String
  method      PaymentMethod
  status      PaymentStatus
  amountCents Int
  confirmedAt DateTime
  receivedAt  DateTime?     // Pix: same as confirmedAt; credit: when it lands in the subaccount
  gatewayId   String?       @unique
  charge      Charge        @relation(fields: [chargeId], references: [id])
  receipt     Receipt?
}

model Receipt {
  id        String   @id @default(cuid())
  paymentId String   @unique
  number    Int
  pdfKey    String   // file key in R2
  createdAt DateTime @default(now())
  payment   Payment  @relation(fields: [paymentId], references: [id])
}

// ---------- platform ----------
model WebhookEvent {
  id          String   @id // event id at the provider
  provider    String
  payload     Json
  processedAt DateTime @default(now())
}

model OutboxEvent {
  id          String    @id @default(cuid())
  type        String    // e.g. appointment.scheduled
  payload     Json
  createdAt   DateTime  @default(now())
  publishedAt DateTime?

  @@index([publishedAt, createdAt])
}

// ---------- subscription ----------
enum SubscriptionStatus { TRIALING ACTIVE PAST_DUE CANCELED }

model Subscription {
  id               String             @id @default(cuid())
  professionalId   String             @unique
  plan             String
  status           SubscriptionStatus @default(TRIALING)
  trialEndsAt      DateTime
  currentPeriodEnd DateTime?
  professional     Professional       @relation(fields: [professionalId], references: [id])
}

// ---------- privacy ----------
model AuditLog {
  id             String   @id @default(cuid())
  professionalId String
  actor          String
  action         String
  entity         String
  entityId       String
  createdAt      DateTime @default(now())
}

model DataRequest {
  id             String    @id @default(cuid())
  professionalId String
  patientId      String
  kind           String    // EXPORT, DELETE
  status         String
  createdAt      DateTime  @default(now())
  completedAt    DateTime?
}
```

`SlotHold`, `AssistantSession` and `Handoff` come in with phase 2; the first version's `Notification` table model was absorbed by `Message`.

## Migration history

| Date | Migration | What changed |
| --- | --- | --- |
| | | |
