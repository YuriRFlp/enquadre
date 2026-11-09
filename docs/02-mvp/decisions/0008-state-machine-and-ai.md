# 0008 — Deterministic state machine; AI only to understand text

- **Date:** 26/10/2026
- **Status:** Accepted. Complemented by 0014 (reply triage in phase 1)

## Context

The secretary talks to people, sometimes in distress, and touches the schedule and money. Freely generated AI replies are unpredictable.

## Options considered

1. Free-form AI agent: flexible, unpredictable, and expensive.
2. Rules and buttons only: predictable, understands little free text.
3. State machine with AI only to classify intent and extract dates.

## Decision

Buttons and rules first; a small AI model receives only the state and the last message and returns JSON validated with Zod. Replies come from prewritten, reviewed texts.

## Consequences

Predictable and cheap behavior; no personal data in the prompt. Revisit if the rules don't cover most conversations.

Details in `../../05-architecture/`.
