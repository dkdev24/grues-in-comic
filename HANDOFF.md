# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Adding to this file is the
exception; adding to one of those three is the rule.** If it will still be true in a year, it does
not belong here.

---

## Current Version
**0.23.0** · Platform: **macOS only** (2026-07-28)

## Project Status

**Grues in Comic** (was Comic-Zork) — repo `dkdev24/grues-in-comic`, not yet public. Zork I (ZIL)
modernized to a browser-native comic adventure via an IR the engine executes.

- **M1–M4 ✅** `importer/` (ZIL parser) · `ir/` (schema, validator, extraction — 110 rooms, 137
  objects, 267 parser rules, 360 routines) · `engine/` (world runtime, parser, dispatch,
  save/restore, combat + thief). **Parity 143/143 strict** over 11 walkthroughs. Gates A and C
  cleared.
- **M5 ✅** (closed 2026-07-28) Comic presentation. **The game is completable in the browser** —
  350/350, ends in `STONE-BARROW`, pinned by `engine/test/completion.test.ts` (seed 1234). Gate D
  cleared. ADRs 0004–0008 all built; 0008 is a cited port of the Comic Chat layout stack with a
  pixel gate.
- **M6 ◐** — the road to 1.0.0 (repo public + website ships). Stages and the decision table are in
  `docs/DEVELOPMENT_PLAN.md` §6. **6.1a–6.1d are done and D5 is met; 6.1e is in progress**.

**Tests:** 271 web · 139 engine · 198 IR · parity 143/143 strict.

---

## Last Session — M6.1e session 2: the rooms answer back (v0.23.0)

6.1a–6.1d ✅ · **6.1e ◐ — session 2 of several.** Narrative in `WORKLOG.md` v0.23.0; the decisions
are in ADR 0009 §Implementation slices 3.

- **The census came first, and corrected the figure the last session handed over.** Not 56.6% of
  turns without a marker — **220 of 606 (36.3%)**: traversal 88, ambient 87, arrival 45. The split
  that mattered was not `PanelKind` but who was already speaking: **164 wholly silent, 56 the DM
  narrating a room at a player who says nothing.**
- **That chose the lever.** The "narrow and safe" option was not narrow: **45 of 45 marker-less
  first visits already had a gazetteer line and no reply.** So the gazetteer gained a Hero half —
  `GuideScript` takes a `BeatExchange` now, all **88 rooms** written — and the `PanelKind` fallback
  was **not** built, which keeps the generic-line risk off the table entirely.
- **A room line cannot wear out** (a first visit happens once), which is now a `PITFALLS.md` rule:
  it is the only authored surface with no run, no cooldown and no repeat to design around.
- **`blocked-exit` widened** over 10 more turns in the map's voice ("would need a machete", "no tree
  here suitable"). Two singletons left silent on purpose.
- **Density: corpus 2.5 → 2.0, oracle 2.7 → 2.4, `07-forest-and-tree` 8.0 → 2.3**, no scene worse
  than 2.3. Baseline re-accepted deliberately; 269 web / 139 engine tests green, gate clean.

## Next Actions

**We are in M6.** Stage detail, the D1–D5 decision table and the 6.1 slices live in
`docs/DEVELOPMENT_PLAN.md` §6 — this is the index, not the plan.

1. **M6.1 — the comic pane becomes a cartoon.** ◐ **The most important item in M6** (user's
   weighting). 6.1a–6.1d ✅ (D5 met) · **6.1e ◐ — and it is now blocked on a decision, not on
   writing.** Every scene reads between 2.0 and 2.4; the corpus sits on the **bottom edge of D5's
   2–3 band**, so the **154 turns that are still wholly silent cannot simply be given beats** —
   each one is a trade against the refusal beats that fire 283 times.

   **The question for the user:** leave the remaining silence alone (a comic where the pair are
   quiet on a bare walk is arguably right), trade some refusal turns for it, or move D5's band?
   Their composition is measured and waiting either way: 69 bare walks with no prose at all, 22
   container states on examine, 8 floor items noticed on entry, 8 room re-descriptions, 7 lamp
   toggles, 7 inventory listings, 6 waits, 5 score checks, ~22 one-offs.

   Then 6.1f (verify: golden re-pinned, gate re-accepted **after looking at the images**, a
   playthrough read in the browser). **6.1f is schedulable now** — nothing above blocks it.
2. **M6.2 — save / load / restart.** ☐ UI over the engine's existing save contract; three named
   slots, browser storage only. Independent — good filler for an idle session.
3. **M6.3 — the static site** (landing, about, public changelog as separate static pages). ☐
   **Blocked on the user's `DESIGN.md` + mockups.**
4. **M6.4 asset separation & neutral branding** (☐, independent of everything) · **M6.5 public
   release** → tag `1.0.0` (☐, needs the rest).
5. **ADR 0006 Slice 5 — session-recap PDF export.** ☐ The only open ADR slice, schedulable whenever.
   **The PDF is deliberately not WYSIWYG.**

**The M6 list is open.** More items land as work proceeds; absence is not a scoping decision. **M6.1
ends when the user says the product is ready, not when a list empties.**

---

## Standing Rules

Three that apply to most sessions. Everything else is in `docs/PITFALLS.md`.

- **Read `docs/PITFALLS.md` for the subsystem you are about to change, before you change it.** Each
  entry was paid for by a bug or a wrong released build.
- **Measure before proposing rules.** Five plausible panel-grammar proposals died that way. The
  harness replay and the `art/` corpus answer questions cheaply.
- **New mechanical-layer code reads the C++ first and cites it** (ADR 0007). Canonical source is
  `original-projects/comic-chat/v2.5-beta-1-modern/`; the offline navigation graph is at
  `reference/comic-chat-v2.5-beta-1-modern/graphify-out/` (gitignored, rebuild *inside* that copy
  with `graphify extract . --code-only --no-label`).

---

## Key Paths
| Path | Purpose |
|---|---|
| `importer/`, `ir/` | ZIL parser → AST; IR schema, validator, extraction → `ir/artifacts/zork1.world.json` |
| `engine/` | Engine core. Zero-dep TS; `src/events.ts` is the ADR 0002 contract as code |
| `engine/harness/` | `replay.ts` (parity oracle), `golden.ts` (normalizer + directives), `complete.ts` (`runFullGame`) |
| `verification/` | `walkthroughs/*.cmd` + `golden/*.txt` from dfrotz |
| `web/` | Browser shell + comic renderer. `npm --prefix web run dev` → :8080. No bundler, by decision (`web/README.md`) |
| `web/tools/` | `gate.ts` (pixel gate), `density.ts` (M6.1 dialogue-density report), `cast-fixture.ts` (N≥3 bodies), `render-panel.ts`, `serve.ts` |
| `web/src/comic/script.ts` | The authored dialogue as data — DOM-free so the corpus replay can measure it |
| `art/` | Comic Chat art tooling (decode, pose, pack). Format spec: `docs/AVB_FORMAT.md` (**normative**) |
| `docs/DEVELOPMENT_PLAN.md` | Milestones, stages, gates — **the authority on what to do next** |
| `docs/PITFALLS.md` | Durable cautions by subsystem — read the relevant section before changing code |
| `docs/FUTURE_WORK.md` | The deferred backlog + the pre-1.0.0 iteration protocol |
| `docs/adr/` | ADRs 0001–0009. **0009 governs the comic pane from 6.1c on** |
| `original-projects/`, `reference/` | Historical sources (tracked) · third-party reference (**gitignored**) |
| `wiki/` | Hand-authored semantic notes (`the-hero.md`, `the-guide.md`, …) |
| `WORKLOG.md` | Persistent history, one entry per version, never edited |
