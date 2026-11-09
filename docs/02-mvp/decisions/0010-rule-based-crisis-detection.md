# 0010 — Rule-based crisis detection, with CVV and immediate alert

- **Date:** 26/10/2026
- **Status:** Accepted. Since 0014, applies from phase 1 onward, to every incoming message

## Context

Patients may write in moments of risk. A silent failure on this path is unacceptable.

## Options considered

1. AI detection: covers variations, may fail without warning.
2. Rule-based detection (list reviewed by psychologists), with AI as optional reinforcement.

## Decision

A list of risk words and phrases triggers, by rule, a reply with CVV (188, Brazil's suicide prevention helpline) and SAMU (192, emergency medical service) and an immediate alert to the psychologist.

## Consequences

Guaranteed, auditable behavior; the list needs periodic review by psychologists. It must never depend on AI alone.

Details in `../../05-architecture/`.
