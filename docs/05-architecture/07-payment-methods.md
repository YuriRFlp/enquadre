# Payment methods

The system is built from the start to support several payment methods, but only Pix is active at launch; credit and debit cards come a few weeks after the MVP, through the gateway's payment page, without Enquadre ever touching card data.

| Moment | What the psychologist sees in Settings | What the system does |
| --- | --- | --- |
| MVP launch | "Métodos aceitos" (*"Accepted methods"*) field visible and locked, with Pix checked and the notice "Cartão em breve" (*"Card coming soon"*) | Every charge is created with Pix only |
| A few weeks later | The field is unlocked; the psychologist checks credit card, debit card, or both | The charge is created with the checked methods and the patient chooses at payment time |

## Why the gateway's page and not our own checkout

| Path | What it requires | Effort |
| --- | --- | --- |
| Gateway payment page (chosen) | Create the charge with the accepted methods and handle the webhooks, as is already done for Pix. The card never passes through Enquadre's server, which stays out of the heavy card security requirements (PCI) | A few days |
| Own checkout inside Enquadre | Form with gateway tokenization, 3DS authentication (mandatory in practice for online debit), handling of declines, and more screens | A few weeks |
| Recurring card (monthly automatic debit) | Saved card, renewal failures, consent | Much later, if requested |

## Two layers of control

1. **System flag** `payments.card.enabled`, off by default. While it is off, the option stays locked in the interface and the API rejects any attempt to enable card. It accepts an allowlist of psychologists, so card can be enabled first for a few users.
2. **Psychologist setting** `BillingSettings.acceptedMethods`, with default value `[PIX]`.

The methods of each charge are the intersection of three lists: what the psychologist accepts, what the flag allows, and what the gateway offers for that subaccount. The rule lives in `billing` and applies to the API, not just to the screen.

## Data model prepared since the MVP

- `PaymentMethod`: enum with `PIX`, `CREDIT_CARD`, and `DEBIT_CARD`.
- `BillingSettings` (one per professional): `acceptedMethods` (list, default `[PIX]`) and `passCardFeeToPatient` (off by default; the law allows different prices per payment method).
- `Charge.allowedMethods`: copy of the methods at creation time. Changing the setting does not alter charges already sent.
- `Payment.method` and `Payment.status` with `CONFIRMED`, `RECEIVED`, `REFUNDED`, and `CHARGEBACK`, plus `confirmedAt` and `receivedAt`. For Pix, both dates are the same; for credit, the money arrives later (usually about 30 days).

Full schema in `../02-mvp/03-data-model.md`.

## Events

| Event | When | Effect |
| --- | --- | --- |
| `charge.paid` | Payment confirmed (Pix paid or card approved) | Patient becomes up to date, receipt is issued, dunning sequence stops |
| `payment.received` | Money available in the subaccount | Financial dashboard moves the amount from "a receber" (*"receivable"*) to "recebido" (*"received"*) |
| `payment.refunded` and `payment.chargeback` | Card refund or dispute | Charge goes back to open and the psychologist is notified |

## Gateway adapter

`billing` talks to the gateway through its own interface: `createCharge` takes amount, due date, methods, and idempotency key and returns the Pix code and the payment page link; `parseWebhook` translates the provider's event into the events above. Before enabling card, confirm how the chosen gateway limits the methods shown on the page (for example, offering card without offering boleto); if that is not possible, the adapter creates the charge with the method the patient chose on Enquadre's page.

## Patient page

Pix always appears directly on the page, since it is cheaper and instant. Once card is enabled, a "Pagar com cartão" (*"Pay with card"*) button also appears, which leads to the gateway's page and returns to a confirmation screen.

## What is left for the card activation sprint

Unlock the field in the interface, map card events in the adapter, refund and dispute screens, "pago" (*"paid"*) vs. "a receber" (*"receivable"*) distinction in Finance, sandbox certification, and gradual rollout through the flag's allowlist. None of this requires a database migration.
