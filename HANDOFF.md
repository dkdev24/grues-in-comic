# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Adding to this file is the
exception; adding to one of those three is the rule.** If it will still be true in a year, it does
not belong here.

---

## Current Version
**0.23.1** · Platform: **macOS only** (2026-07-28)

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
  `docs/DEVELOPMENT_PLAN.md` §6. **6.1a–6.1d and 6.1f are done and D5 is met; 6.1e is in progress**
  — and 6.1f found that the numbers D5 is judged on are measured over a losing replay (below).

**Tests:** 271 web · 139 engine · 198 IR · parity 143/143 strict.

---

## Last Session — M6.1f: the playthrough is read (v0.23.1)

**6.1f ✅.** Narrative in `WORKLOG.md` v0.23.1. Verification only — nothing was changed in `web/src/`.

- **Both goldens were already in sync; neither needed re-accepting.** Gate **clean, 17/17**, density
  baseline **unchanged**, 271 web / 139 engine tests green, typecheck clean. The 17 gate PNGs were
  dumped (`runGate()` only writes them on drift) and looked at one by one — no pixel objection.
- **Reading the full game panel by panel found what no aggregate could: `12-full-game.cmd` does not
  complete under the comic replay.** The list is authored for the **resilient** `runFullGame`, which
  repeats combat until the villain falls. A naive replay — `web/tools/density.ts` and the pane both —
  loses the troll fight on turn ~70 and then flails: **Rocky Ledge, 30/350, 16 of 110 rooms.** The
  engine's completion test still reaches the barrow at 350; it drives the harness, not the raw list.
- **That run is 406 of the corpus's 606 turns**, so the 2.0 exchanges-per-turn figure, "refusals are
  45% of all turns" and the 154-silent-turns census are two-thirds a flail through the surface map.
  Now a `PITFALLS.md` → Web rule.
- **Four presentation findings, logged in `FUTURE_WORK.md` §2.1, none fixed:** a split exchange
  **mis-pairs** (the Hero's reply shares a frame with the *next* turn's DM line — 144 of 300 split),
  **3 empty panels**, the **death panel wears the resurrection room's location box**, and refusal
  repeats **cluster** within ~20 panels.
- The browser half was done: played live at :8080, the pane behaves as the transcript says.

## Next Actions

**We are in M6.** Stage detail, the D1–D5 decision table and the 6.1 slices live in
`docs/DEVELOPMENT_PLAN.md` §6 — this is the index, not the plan.

1. **M6.1 — the comic pane becomes a cartoon.** ◐ **The most important item in M6** (user's
   weighting). 6.1a–6.1d ✅ (D5 met) · 6.1f ✅ · **6.1e ◐.**

   **Do the corpus repair first — it is the recommended next action.** 6.1f established that the
   full-game row, two-thirds of every M6.1 measurement, is a game lost at the troll and then flailed
   through 16 surface rooms (`PITFALLS.md` → Web). Make the comic-side replay resilient the way
   `runFullGame` is, then re-measure. That is a deliberate move of the density baseline, accepted
   like a gate re-roll.

   **Then the question for the user, which the repair may reword:** every scene reads 2.0–2.4 and
   the corpus sits on the **bottom edge of D5's 2–3 band**, so the **154 turns still wholly silent
   cannot simply be given beats** — each is a trade against the refusal beats that fire 283 times.
   Leave the silence (a comic where the pair are quiet on a bare walk is arguably right), trade
   refusal turns for it, or move D5's band? Composition, measured: 69 bare walks with no prose at
   all, 22 container states on examine, 8 floor items noticed on entry, 8 room re-descriptions, 7
   lamp toggles, 7 inventory listings, 6 waits, 5 score checks, ~22 one-offs. **Those figures come
   from the losing replay too** — expect them to move.

   **Do not answer the D5 question on today's numbers.**
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
