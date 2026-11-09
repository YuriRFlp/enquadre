# Main flows

Five flows cover day-to-day operation; each step is a job or an event, so it can fail and be retried without duplicate effects.

## Reminder and confirmation

1. `appointment.scheduled` → `automations` writes a `ScheduledAction` of type `REMINDER` for 24h before (`dedupeKey` = type + session id + time).
2. When it comes due, the poller publishes the action to the queue; execution checks whether the session is still scheduled for that time. If it was canceled or rescheduled, it ends as `CANCELED` without sending.
3. `messaging` sends the approved template with "Confirmar" (*"Confirm"*) and "Preciso remarcar" (*"I need to reschedule"*) buttons via WhatsApp (default channel) and, if the patient has an e-mail, the same message by e-mail.
4. The reply (button, text, or click on the public link) becomes `appointment.confirmed` or opens the rescheduling flow in `assistant`. The system doesn't send a "session confirmed" message: the tap only updates the dashboard (see `09-costs.md`).
5. No reply by 2h before: the dashboard marks the session as "aguardando" (*"pending"*); nothing is resent, to avoid bothering the patient.

## Rescheduling and cancellation

1. `assistant` offers up to 3 free slots and holds the chosen one for 10 minutes.
2. Once confirmed, `scheduling` moves the session and emits `appointment.rescheduled` via the outbox; `automations` cancels that session's old actions and creates new ones. The check at execution time covers the gap between the two steps.
3. Cancellation with less notice than the policy: the session becomes "cancelada com cobrança" (*"canceled with charge"*) and enters the charge flow; the text to the patient cites the agreed policy.

In the MVP, without free-form conversation, rescheduling happens through the session's public link.

## End of session

1. At the end time, the `END_SESSION` action marks the session as held, unless the psychologist has already marked a no-show.
2. The psychologist gets a daily summary at 8 p.m. with the day's sessions and one tap to correct no-shows.

## Charge and reconciliation

1. "Per session" patient: `appointment.ended` creates the charge. "Monthly" patient: a `MONTHLY_BILLING` action on the configured day groups the month's sessions into one charge.
2. `billing` creates the charge at the gateway with the methods the psychologist accepts (at launch, Pix only), using the charge id as the idempotency key, and stores the Pix copy-and-paste code and the payment page link.
3. `messaging` sends the payment page link; the page shows amount, due date, and the Pix code to copy; once card is enabled, it also shows the button that leads to the gateway's page.
4. The payment webhook (Pix paid or card approved) comes in through the API, is deduplicated in `WebhookEvent`, and becomes `charge.paid`.
5. `billing` generates the PDF receipt, stores it in R2, and sends it to the patient; the dashboard updates in real time. With a credit card, a second webhook signals when the money lands in the subaccount (`payment.received`), and the amount leaves "a receber" (*receivable*) in Financeiro (*Finances*).

## Dunning sequence

1. Past due without payment: `charge.overdue`, and `automations` writes a `DUNNING_STEP` action for each day of the sequence. If the charge is paid first, execution checks the status and ends without sending.
2. Neutral reminders at D+1, D+3, and D+7, always with the payment link, never after 9 p.m. or on Sundays.
3. After D+7, the sequence stops and the psychologist decides: send one more reminder, settle it in person, or mark it as paid manually.
4. The sequence days are configurable per psychologist, and it can be turned off per patient. Changing the configuration updates pending actions with an `UPDATE`.
