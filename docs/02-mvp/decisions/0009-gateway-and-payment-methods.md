# 0009 — Gateway with subaccounts and multiple methods, only Pix active at launch

- **Date:** 26/10/2026
- **Status:** Accepted

## Context

Money must land directly in the psychologist's account, and cards increase conversion, but they must not delay the MVP nor put Enquadre in card security scope (PCI).

## Options considered

1. Static Pix with the psychologist's key: zero cost, no automatic payment reconciliation.
2. Gateway with subaccount and hosted payment page.
3. Own card checkout: weeks of work and PCI scope.

## Decision

Gateway (Asaas as the reference) with one subaccount per psychologist. Data model with PaymentMethod, BillingSettings.acceptedMethods (default [PIX]), Charge.allowedMethods, and Payment.status (CONFIRMED, RECEIVED, REFUNDED, CHARGEBACK). Credit and debit cards through the gateway's page, behind the payments.card.enabled flag with an allowlist, a few weeks after the MVP.

## Consequences

Enabling cards requires no migration. Confirm whether the gateway allows showing cards without boleto. Revisit if fees weigh on the plan or if users ask for an own checkout or recurring card payments.

Details in `../../05-architecture/`.
