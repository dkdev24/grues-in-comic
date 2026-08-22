# docs/

Everything the project decided, and why. **Start here rather than opening files at random** — some
of these are specifications a reader can rely on, some are working documents that change every
session, and one folder is history that is deliberately out of date.

## If you are here to understand the project

Read in this order. Three documents are enough to know what this is and how it holds together.

1. **[`../README.md`](../README.md)** — what Grues in Comic is: Zork I (ZIL) and Microsoft Comic
   Chat, modernized into a browser-native comic adventure. Not a source port, and not an emulator.
2. **[`adr/`](adr/)** — the ten decisions the whole system rests on. `0001` (how ZIL behavior is
   represented), `0002` (the engine runtime and its event contract) and `0004` (how a turn becomes a
   comic panel) carry the most weight; the rest refine the presentation.
3. **[`IR_SCHEMA.md`](IR_SCHEMA.md)** — the Intermediate Representation, the abstraction the project
   is built around. The IR is independent of ZIL, of the browser, and of how anything is drawn.

## Specifications — stable, and safe to rely on

| Document | What it specifies |
|---|---|
| [`IR_SCHEMA.md`](IR_SCHEMA.md) | The IR's declarative world subset. Machine-readable source of truth is `ir/src/schema.ts`; this explains the design and the ZIL mapping |
| [`AVB_FORMAT.md`](AVB_FORMAT.md) | Microsoft Comic Chat's `.avb` avatar format, reverse-engineered and verified against all 191 shipped avatar files. Written because no public specification existed |
| [`adr/`](adr/) | Architecture Decision Records 0001–0010 — binding. A decision changes by amending its ADR, never by editing a discussion document |
| [`DESIGN.md`](DESIGN.md) | The look & feel specification for the website and the gameplay screen |

## Working documents — these change often

| Document | What it holds |
|---|---|
| [`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md) | Milestones, stages and decision gates. The authority on what is done and what is next |
| [`FUTURE_WORK.md`](FUTURE_WORK.md) | The deferred backlog, triaged by size, impact and priority in §2.0. Nothing in it is scheduled until it is picked |
| [`PITFALLS.md`](PITFALLS.md) | Cautions by subsystem. Every entry was paid for by a bug or a wrong build — read the section for what you are about to change |
| [`AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md`](AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md) | How the codebase's knowledge graph and wiki are generated and kept apart |

Session state lives outside this folder, in [`../HANDOFF.md`](../HANDOFF.md) (where the project is
right now) and [`../WORKLOG.md`](../WORKLOG.md) (what happened, newest first, never edited).

## Discussions and plans — reasoning, not decisions

- [`panel-grammar-discussion.md`](panel-grammar-discussion.md) — the measurements and argument behind
  ADR 0004. The ADR is the decision; this is how it was reached.
- [`backdrop-generation-plan.md`](backdrop-generation-plan.md) — how the 30 backdrops covering all
  110 rooms were generated, and what the next pass would add.

## History — [`archive/`](archive/)

Superseded planning documents from before the ADRs, kept because they are honest history. **Nothing
in there describes the project as it is today.** See [`archive/README.md`](archive/README.md) for
what each one was and what replaced it.

## Assets — [`assets/`](assets/)

Brand source files (the logo glyph, the generated favicon set). The shipping assets are under
`web/assets/`; these are the originals they were made from.
