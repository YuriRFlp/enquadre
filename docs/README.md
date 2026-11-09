# Enquadre: scheduling and billing SaaS for psychologists

Living documentation of the project. Started on 23/10/2026 and should be kept up to date as work progresses.

## Structure

```
docs/
├── README.md                          ← you are here
├── 01-business/                       ← why and for whom
│   ├── 01-ideation-and-niche-choice.md
│   ├── 02-product-vision.md
│   ├── 03-competition-and-differentiation.md
│   ├── 04-monetization-and-metrics.md
│   ├── 05-brand-and-design.md
│   └── validation/
│       ├── interview-script.md
│       └── interviews/
│           └── _interview-template.md
├── 02-mvp/                            ← what to build and how
│   ├── 01-scope-and-features.md
│   ├── 02-architecture-and-stack.md
│   ├── 03-data-model.md
│   ├── 04-observability.md
│   ├── 05-sprint-roadmap.md
│   └── decisions/                     ← decision records (ADRs 0001 to 0016)
│       ├── _decision-template.md
│       └── 0001-... to 0016-...md
├── 03-project-journal/                ← what happened
│   ├── _sprint-template.md
│   └── changelog.md
├── 04-design-system/                  ← visual identity and screens
│   ├── design-system.html
│   ├── tokens.css
│   ├── logo/
│   └── wireframe_telas/               (HTML, PDF and PNGs of the screens)
└── 05-architecture/                   ← system design: how and why
    ├── README.md                      (index and principles)
    └── 01-... to 10-...md
```

## How to maintain this documentation

- **Business (`01-business`)** changes when you learn something from users: interviews, pricing, competitors. Each interview becomes a file in `validation/interviews/`, copied from the template.
- **MVP (`02-mvp`)** changes when the system changes. Update the data model alongside every Prisma migration.
- **Decisions (`02-mvp/decisions`)**: every choice that is hard to undo (library, pattern, business rule) gets a numbered file. Never delete an old decision; mark it as "Superseded by 000X".
- **Journal (`03-project-journal`)**: at the end of each sprint, copy `_sprint-template.md` as `sprint-NN.md` and fill it in. Record relevant changes in `changelog.md`.
- **Architecture (`05-architecture`)** changes together with the ADRs: every new decision that alters a flow, module or cost updates the corresponding file and the ADR table in `10-phases-and-roadmap.md`.
- **Design system (`04-design-system`)** is the exported copy of the design artifacts; update it when tokens, logos or screens change.

Tip: keep this folder as `docs/` inside the monorepo, so the documentation is versioned together with the code.

## Current status

| Item | Status |
| --- | --- |
| Phase | Validation + Sprint 0 |
| Next action | Interview the first psychologist |
| Paying professionals | 0 (goal: 10 within 3 months of launch) |
