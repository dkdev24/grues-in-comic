# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Adding to this file is the
exception; adding to one of those three is the rule.** If it will still be true in a year, it does
not belong here.

---

## Current Version
**0.22.0** · Platform: **macOS only** (2026-07-28)

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

**Tests:** 269 web · 139 engine · 198 IR · parity 143/143 strict.

---

## Last Session — M6.1e session 1: the refusals get a voice (v0.22.0)

6.1a–6.1d ✅ · **6.1e ◐ — session 1 of several.** Narrative in `WORKLOG.md` v0.22.0; the decisions
are ADR 0009 §Implementation slices 3 and **an amendment to ADR 0006 §4 rule 4**.

- **6.1d met D5 by volume, and the volume was bad: 218 of 252 exchanges were a run's last line
  repeating** (150 of them `parser-miss`). Density held at **2.5 corpus / 2.7 oracle** while the
  worst-repeated line in a playthrough went **150 → 12** and distinct lines ~30 → **91**.
- **The big markers now split on what happened.** `parser-miss` → `not-here` / `not-carried` /
  `unknown-word` (measured ~95 / 54 / 11), and the map's own refusal → **`blocked-exit`: 114 turns
  saying exactly "You can't go that way", which had no marker at all.** Everything downstream asks
  **`markerFamily` / `isRefusal`**, never a marker name — that seam is what makes a fourth variant a
  table edit.
- **ADR 0006 §4 rule 4 amended:** a run may end in a **cycling tail** (`run` is the arc and is never
  re-entered — the guarantee rule 4 actually wanted; `loop` cycles). And **a beat carries its own
  cooldown**: at the table's 0 the refusals put the corpus at **1.6, past the *bottom* of D5's
  band** — the ceiling assertion added at 6.1d is what caught it.
- **The cooldown clock moved off `turn.status.moves`** (it does not advance on a refusal, so it was
  no cooldown at all on the beats that needed one) onto the mapper's own read count. `PITFALLS.md`
  → Web was revised, not appended to.

## Next Actions

**We are in M6.** Stage detail, the D1–D5 decision table and the 6.1 slices live in
`docs/DEVELOPMENT_PLAN.md` §6 — this is the index, not the plan.

1. **M6.1 — the comic pane becomes a cartoon.** ◐ **The most important item in M6** (user's
   weighting). 6.1a–6.1d ✅ (D5 met) · **6.1e ◐ — continue writing the dialogue.** The mechanism is
   finished as of v0.22.0; depth on the refusals is done. What is left is **the 56.6% of turns that
   carry no affect marker at all** — ambient 191, traversal 89 of 606 — which is the last big block
   of silence and the reason `07-forest-and-tree` reads one exchange every 8 turns while every
   other scene sits at 2. Two levers, neither yet chosen:
   - **A fallback keyed on `PanelKind`** (ambient / traversal), so a turn with no marker still has a
     beat to answer. Widest reach, and the one that risks generic lines — the failure mode the
     marker split was written to escape.
   - **A Hero half for the gazetteer** (`exchangeFor` rule 3, still DM-only). Narrow and safe: it
     only fires on first visits, so it cannot wear out, but it reaches ~26 turns of the corpus.

   **Measure the composition of those 287 turns before writing either** — the last two sessions both
   turned on a distribution nobody had looked at. Then 6.1f (verify: golden re-pinned, gate
   re-accepted **after looking at the images**, a playthrough read in the browser).

   Then 6.1f (verify: golden re-pinned, gate re-accepted **after looking at the images**, a
   playthrough read in the browser).
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
