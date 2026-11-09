---
name: commit
description: Reviews the changes, runs security and LGPD checks, and creates Conventional Commits following Enquadre's conventions, with messages always in English. Only runs when the developer invokes /commit.
disable-model-invocation: true
argument-hint: "[scope or note, e.g.: billing only]"
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git add *) Bash(git commit *) Bash(pnpm *)
---

# /commit

Creates small, safe, well-described commits. Developer's note, if any: $ARGUMENTS

## 1. Understand what changed

Run `git status --porcelain` and `git diff` (and `git diff --staged`, if anything is staged). If there are no changes, say so and stop.

If there are already staged files, work only with them, unless the note asks for something else.

## 2. Security checks (block the commit)

Stop and explain the problem if the diff contains:

- `.env*` files (except `.env.example`), keys, tokens, or passwords;
- data that looks like real patient data: full names, phone numbers, CPFs, e-mails, or message excerpts in fixtures, tests, seeds, or `apps/server/evals/`;
- logs, `console.log`, Sentry, or PostHog receiving a name, phone number, or message body;
- `--no-verify`, or tests or lint rules disabled without a justification in the code.

In those cases, do not commit. Suggest the fix and wait.

## 3. One subject per commit

If the diff mixes different subjects (e.g.: a `billing` feature and a lint fix in `web`), propose splitting it into separate commits, listing the files of each one, and ask before proceeding.

## 4. Quick checks

Run typecheck and tests only for the affected packages, if the scripts exist:

- `pnpm --dir <package> run --if-present typecheck`
- `pnpm --dir <package> run --if-present test`

If `packages/shared` or `packages/db` changed, run `pnpm -r run --if-present typecheck`. If something fails, show the summarized error and stop.

## 5. Message

**The whole commit message is always written in English** (description, body, and footer), even if the developer's note or the conversation is in Portuguese.

Format:

```
<type>(<scope>): <description>

<optional body: the why of the change, not the how>

Refs: ADR NNNN
```

- **Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `build`, `perf`. A breaking change uses `!` (`feat(billing)!:`) and explains it in the body.
- **Scopes:** the module name (`identity`, `patients`, `scheduling`, `messaging`, `assistant`, `automations`, `billing`, `subscription`, `privacy`, `platform`) or the package name (`web`, `shared`, `db`, `design-tokens`), or `evals`, `docs`, `ci`, `infra`.
- **Description:** in English, imperative mood, lowercase, no trailing period, up to 72 characters. E.g.: `feat(automations): write reminder to ScheduledAction when booking a session`.
- **Body:** in English, lines up to 72 characters. Explain the motivation and any side effects.
- **Refs:** cite the ADR when the change implements or alters a decision.

## 6. Changelog

If the change is a feature visible to the psychologist, a new decision (ADR), or an architecture change, propose a line in `docs/03-project-journal/changelog.md` (date as DD/MM/YYYY, area, short description, in English) to go into the same commit. Internal adjustments, tests, and refactorings are not included.

## 7. Confirm and execute

Show the message (or messages, if you split it) and the files of each commit and **wait for confirmation**. Then run `git add` on the listed files and `git commit`.

Never run `git push`, `git commit --amend` on an already pushed commit, `--no-verify`, or `git add -A` without checking the list. Pushing is always up to the developer.
