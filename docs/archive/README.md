# docs/archive

**Nothing in this folder is current.** These are the documents the project was steered by before the
ADRs and `docs/DEVELOPMENT_PLAN.md` took over that job. They are kept because they are honest
history — the reasoning that produced the decisions, including the parts that turned out wrong — and
deleting them would leave `WORKLOG.md`'s early entries pointing at nothing.

**If you want to know what the project does or how it is built, do not start here.** Start at
`docs/README.md`.

| File | What it was | What replaced it |
|---|---|---|
| `PORTING_STRATEGY.md` | The original phase plan, written when the engine was expected to be C++ compiled to WebAssembly | ADR 0002 (TypeScript engine, browser-native) and `docs/DEVELOPMENT_PLAN.md`. Its "Phase 4 — WebAssembly" no longer exists |
| `chatgpt-new-overall-architecture.md` | An early AI-drafted architecture overview | ADRs 0001–0010. `docs/panel-grammar-discussion.md` §8 is a point-by-point review of where it was wrong |
| `gemini-analysis-on-plan-and-strategy.md` | An AI review of the plan; three of its recommendations were adopted (deterministic pre-parser, interface-first engine/UI boundary, brand separation) | The adopted parts live in ADR 0002 and the development plan. The fourth recommendation was truncated and is unrecoverable |
| `SOLOPRENEUR_STRATEGY.md` | The project's original positioning as a portfolio piece | Nothing — it was never a technical document, and the project's public description is `README.md` |

Paths moved here on 2026-08-22, ahead of the repository going public. Older `WORKLOG.md` entries
name these files at their previous location, `docs/<name>.md`; that is history and is left as written.
