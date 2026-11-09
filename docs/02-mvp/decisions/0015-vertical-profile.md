# 0015 — Vertical profile: messaging, automations, and assistant with no psychology vocabulary in code

- **Date:** 04/11/2026
- **Status:** Accepted

## Context

Enquadre is a vertical product for psychologists, and that does not change. But the same engine (reminders, confirmation, charges, triage and, later, the secretary) serves other self-employed professionals with a similar routine: nutritionists, speech therapists, physiotherapists. If psychology texts and rules are scattered throughout the code, opening a second niche becomes a rewrite.

## Options considered

1. Psychology-specific code everywhere: faster now, expensive to generalize later.
2. Separate engine and vertical packages (`packages/core`, `packages/verticals`): strong separation, but goes against the modular monolith (0004) and adds structure with no immediate benefit.
3. Vertical profile as configuration, inside the monolith.

## Decision

Option 3. The `messaging`, `automations`, and `assistant` modules do not reference psychology vocabulary directly. Everything niche-specific comes from a typed profile in `packages/shared/src/vertical/`, starting with `psicologia.ts`:

- displayed vocabulary ("paciente", "sessão", "psicólogo"; *"patient", "session", "psychologist"*);
- prewritten message texts and neutral replies;
- risk list used by the crisis rule (0010), reviewed by psychologists;
- intents accepted by triage and by the secretary;
- defaults for the no-show policy and the dunning sequence;
- path to the niche's evaluation cases.

The profile is versioned code, not a database table: it changes through review and deploy, like any rule.

## Consequences

- Near-zero cost now: it is a discipline about where to put texts and rules.
- Opening a second niche becomes writing another profile, reviewing the risk list with professionals in that field, and creating evaluation cases, without touching the modules.
- `identity`, `scheduling`, and `billing` stay as they are; table names (`Patient`, `Appointment`) remain, because they are generic enough.
- Revisit if a real second niche with paying users appears; then it may be worth extracting the engine into its own package.
