# 0001 — TypeScript end to end

- **Date:** 23/10/2026
- **Status:** Accepted

## Context

More experience on the front end (Vue and JavaScript), with the goal of learning React, TypeScript, and backend. Open question: use another language on the backend?

## Options considered

1. **Node + TypeScript on the back end** — same language, shared types, widely used in the market.
2. **Go, Python, or another** — broadens the repertoire, but adds a new language on top of React, TS, and backend all at once.
3. **Next.js full-stack** — ships faster, but hides part of the backend that is meant to be learned.

## Decision

Option 1: React + Vite on the front end, NestJS on the back end, monorepo with a `shared` package of Zod schemas.

## Consequences

- Full focus on backend concepts, not on new syntax.
- Another language can come later, once backend is already understood.
