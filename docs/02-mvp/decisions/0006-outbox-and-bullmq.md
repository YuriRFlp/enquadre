# 0006 — Transactional outbox + BullMQ for events

- **Date:** 26/10/2026
- **Status:** Accepted. Complemented by 0016 (future actions live in PostgreSQL, not in delayed jobs)

## Context

Database changes need to trigger effects (reminders, receipts, messages) without the risk of losing the effect if the server goes down between writing and enqueuing.

## Options considered

1. Enqueue directly after writing: simple, but can lose events.
2. Dedicated broker (RabbitMQ, Kafka): robust, expensive, and complex for now.
3. Outbox in PostgreSQL + relay to BullMQ on Redis.

## Decision

Every relevant change writes a row to OutboxEvent in the same transaction; the relay in the worker publishes to the BullMQ queues (inbound-webhooks, domain-events, scheduled-actions, outbound-messages, assistant, maintenance).

## Consequences

No event is lost and every effect has retries. Consumers must be idempotent. Revisit when volume justifies a dedicated broker.

Details in `../../05-architecture/`.
