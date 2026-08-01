# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Adding to this file is the
exception; adding to one of those three is the rule.** If it will still be true in a year, it does
not belong here.

---

## Current Version
**0.24.7** · Platform: **macOS only** (2026-07-28)

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
  `docs/DEVELOPMENT_PLAN.md` §6. **6.1a–6.1d and 6.1f–6.1i are done; 6.1e is paused; 6.1j–6.1k
  are the remaining ADR 0010 slices.** The corpus is repaired, so **D5 and the two-shot are both met
  over a game that is actually won** — every M6.1 figure quoted before v0.24.0 was measured over a
  losing replay and is void. **ADR 0010 is Accepted (v0.24.5); slices 1 and 2 are built (v0.24.6,
  v0.24.7)** — the Hero declares his command as table-talk on 98.3% of turns, and that declaration now
  answers the DM's still-open frame across the turn boundary instead of only garnishing its own. Work
  resumes at stage **6.1j**, the collapse gives ground.

**Tests:** 292 web · 139 engine · 198 IR · parity 143/143 strict.

---

## Last Session — 6.1i built: the exchange crosses the turn boundary (v0.24.7)

**ADR 0010 slice 2 is done.** `PageLine.answers` (`page.ts`) is a fact a line carries to say "I am
replying to what's on screen, not asking something new." `isOrphaned` no longer forces the next line
to open fresh outright — it arms `guardFragment()`, consumed by whichever line reaches the page next:
unmarked still breaks (M6.1g's mis-pairing guard, unchanged), marked is let through to the ordinary
clone-append rules. In `mapper.ts` the declaration moved to the front of the turn's own lines, ahead
of even the room-change `<Brk>` — it answers the *previous* turn's frame, not this turn's own
narration. Full detail and the exact numbers are in `WORKLOG.md` v0.24.7 and
`docs/DEVELOPMENT_PLAN.md` §6.1 → 6.1i.

**Headline measurements:** two-shot recovered 17/274 → **218/274 (79.6%)**, close to the
pre-ADR0010 baseline (137/165, 83%); `panelsBothSpeakers` 243 → 477; panels 1158 → 1091 (the join
nets *fewer* panels, not more). Both goldens re-accepted after looking at the images; 292/292 web
tests green.

**One real trap, worth knowing before touching this code again:** pulling the declaration out of
`heroLines` also pulled it out of the "did the Hero say anything this turn" check that gates the
reaction fallback and the death shot — starving a turn with nothing else to say (a plain traversal
step) of any representation once its declaration went to answer the *previous* frame instead. Fixed
by keeping those two checks on `heroLines` alone (see `docs/PITFALLS.md` → Web for the durable
version of this note). `director.test.ts`'s trailing-run test needed updating for a real, expected
behavior change it happened to exercise.

## Next Actions

**We are in M6.** Stage detail, the D1–D5 decision table and the 6.1 slices live in
`docs/DEVELOPMENT_PLAN.md` §6 — this is the index, not the plan.

1. **M6.1 — the comic pane becomes a cartoon.** ◐ **The most important item in M6** (user's
   weighting). 6.1a–6.1d ✅ · 6.1f ✅ · 6.1g ✅ · 6.1h ✅ · 6.1i ✅ · **6.1e ◐** (authoring, paused
   where ADR 0010 subsumes it) · **6.1j–6.1k ☐ — the remaining ADR 0010 slices, and where work
   resumes.**

   **⇒ NEXT SESSION STARTS HERE: 6.1j — ADR 0010 slice 3, the collapse gives ground.** Read ADR 0010
   §3 and `docs/DEVELOPMENT_PLAN.md` §6.1 → 6.1j for exit criteria. The shape: a **single** traversal
   turn stops counting as a "run" (only two or more collapses now) and a longer run keeps its one
   panel but earns a **journey line** — the Hero's own declaration for the whole walk, naming where
   he ended up ("Back down to the cellar.") rather than each step — authored as its own surface
   (amends ADR 0005 §3). Measure the recovery against the **116 walks / 56 panels** bound from ADR
   0010's Context table; the exact number is to be measured in the slice, not asserted beforehand.
   Then **6.1k** re-sets D5′'s band from the measurements, re-pins both goldens, and reads a full
   playthrough — the slice that actually closes M6.1's stated purpose.

   The remaining 6.1e work is what it always was: authored dialogue across 110 rooms, committed as
   data (D1 sanctions the volume). The gazetteer is at 88 rooms; `BEAT_SCRIPT` at 12 beats / 70
   authored exchanges.
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
| `docs/adr/` | ADRs 0001–0010. **0009 governs the comic pane from 6.1c on; 0010 (Accepted) governs the Hero's channel and the panel's unit from 6.1h on** |
| `original-projects/`, `reference/` | Historical sources (tracked) · third-party reference (**gitignored**) |
| `wiki/` | Hand-authored semantic notes (`the-hero.md`, `the-guide.md`, …) |
| `WORKLOG.md` | Persistent history, one entry per version, never edited |
