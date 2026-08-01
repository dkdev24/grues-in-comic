# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Adding to this file is the
exception; adding to one of those three is the rule.** If it will still be true in a year, it does
not belong here.

---

## Current Version
**0.24.9** · Platform: **macOS only** (2026-07-28)

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
  `docs/DEVELOPMENT_PLAN.md` §6. **6.1a–6.1d and 6.1f–6.1k are done; 6.1e is paused, the only open
  item under M6.1.** The corpus is repaired, so **D5 and the two-shot are both met over a game that is
  actually won** — every M6.1 figure quoted before v0.24.0 was measured over a losing replay and is
  void. **ADR 0010 is Built (v0.24.9) — all four slices done.** The Hero declares his command as
  table-talk on 98.3% of turns, that declaration answers the DM's still-open frame across the turn
  boundary, a collapsed traversal run of two or more speaks its destination as one journey line, and
  **D5′ (the share of emitted panels carrying both speakers) has a band, 25–60%, set from today's
  43.7% measurement** and asserted in `density.test.ts`. This closes M6.1's stated purpose — the
  remaining M6.1 work is 6.1e's authoring volume, which was always open-ended.

**Tests:** 292 web · 139 engine · 198 IR · parity 143/143 strict.

---

## Last Session — 6.1k built: D5′ set, ADR 0010 fully built (v0.24.9)

**ADR 0010 slice 4 is done — all four slices are now built, and the ADR moves to Built.** D5′'s band
is **25–60% of emitted panels carry both speakers**, set from today's own measurement (43.7%, 477 of
1091) — `D5_PRIME_MIN`/`D5_PRIME_MAX` in `web/tools/density.ts`, a new `rates().bothSpeakersShare`,
both ends asserted in `density.test.ts` over the corpus total and the full-game oracle. Full detail in
`WORKLOG.md` v0.24.9 and `docs/DEVELOPMENT_PLAN.md` §6.1 → 6.1k.

**Neither golden had drifted since 6.1j** — density baseline and pixel gate both already matched, so
there was nothing to re-pin. Verification was a throwaway transcript dump (not committed) over the
full-game oracle's turns 0–50 and 230–270: it reads as a conversation, declaration/reply rotation
holds. One soft spot noted, not fixed (out of scope): `dig sand` repeats its declaration verbatim four
turns running at Sandy Cave — a lexicon-depth gap from 6.1h/i. 292/292 web tests green, `tsc --noEmit`
clean.

## Next Actions

**We are in M6.** Stage detail, the D1–D5 decision table and the 6.1 slices live in
`docs/DEVELOPMENT_PLAN.md` §6 — this is the index, not the plan.

1. **M6.1 — the comic pane becomes a cartoon.** ◐ **The most important item in M6** (user's
   weighting). 6.1a–6.1d ✅ · 6.1f ✅ · 6.1g ✅ · 6.1h ✅ · 6.1i ✅ · 6.1j ✅ · 6.1k ✅ — **ADR 0010 is
   fully built and M6.1's stated purpose is closed.** **6.1e ◐ is the only open item**: authored
   dialogue across 110 rooms, committed as data (D1 sanctions the volume). The gazetteer is at 88
   rooms; `BEAT_SCRIPT` at 12 beats / 70 authored exchanges. No exit criterion beyond "the user says
   the product is ready" — pick it up when there's appetite for more authoring, or move to M6.2/M6.4
   as filler.

   **⇒ NEXT SESSION: either resume 6.1e authoring, or pick up one of the independent M6 items below —
   the user's call, since M6.1's mechanics are done.**
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
