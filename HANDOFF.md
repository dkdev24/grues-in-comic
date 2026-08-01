# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Adding to this file is the
exception; adding to one of those three is the rule.** If it will still be true in a year, it does
not belong here.

---

## Current Version
**0.19.1** · Platform: **macOS only** (2026-07-28)

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
  `docs/DEVELOPMENT_PLAN.md` §6. **6.1a and 6.1b are done**; 6.1 is in progress.

**Tests:** 262 web · 139 engine · 198 IR · parity 143/143 strict.

---

## Last Session — M6.1a and 6.1b: the density is measured, ADR 0009 written (v0.19.0–v0.19.1)

**6.1b (v0.19.1, docs only) — `docs/adr/0009-the-dm-reads-the-room.md`, Accepted.** It records D1–D5
and settles the mechanism they left open. **Read it before touching the pane; it is now the authority
on the diagnosis.** The load-bearing decisions:

- **The caption channel retires.** Narration becomes the DM's *speech* balloon, so no `BM_ACTION`
  line is emitted on an ordinary turn and nothing tells `AddLine` to break the panel — the cause of
  the split exchange, fixed rather than worked around. The box becomes renderer-drawn metadata: the
  room's display name, on room change only.
- **The DM has two registers with different economics** — read-aloud (derived from narration,
  uncooled, zero authoring cost) and table-talk (authored, cooled). The cooldown never should have
  gated narration the player just caused.
- **A description is sentence-packed into ≤200-char balloons — n panels, not two.** The Hero is
  staged silent through the run and his line lands in the **last** panel, so an arrival *ends* on the
  facing two-shot. (Measured: 44 of 81 arrivals fit one balloon, 12 need two, 25 need three or four.)
- It also supersedes **ADR 0005 §3** (a refusal with a line is kept; only a silent one is dropped)
  and **ADR 0006 §4 rule 2** (action-suppresses-reply becomes an ordering, not an exclusion).
- **Two corrections to the §6.1 diagnosis:** `parser-miss`/`refusal` is **26.4% of turns (160)** on
  the full corpus, not 12.7% — the largest lever on D5, and all of it currently dropped. And the
  180-char cap was never the leak: it drops 9 turns, all the same 188-char sentence.

## 6.1a — the dialogue is data, and the density is measured (v0.19.0)

- **`web/src/comic/script.ts` (new)** holds `GUIDE_SCRIPT`, `BEAT_SCRIPT` and `GUIDE_COOLDOWN`, moved
  out of the DOM-coupled view. Data only — the trigger, cooldown and run cursor stayed in `mapper.ts`.
- **`web/tools/density.ts` (new)** replays the shipped tables over all 12 walkthroughs (oracle
  included) at seed 1234, in two stages: *script* (bare mapper, per turn) and *screen* (production
  Director + real fit test, per emitted panel). `npm --prefix web run density` / `density:accept`.
- **The numbers, now reproducible — and the hand count was slightly high.** 606 turns: **28 exchanges
  (4.6%), one every 21.6 turns**; 29 spoken beats (4.8%, not 35/5.8%); **20 of 28 exchanges in one
  panel, 8 split**; captions **96.7%**. Worst fact, and new: the full-game oracle runs **3 exchanges
  in 406 turns — one every 135**. The scene walkthroughs flatter the product because they share an
  opening dense in first visits.
- Baseline `web/test/golden/dialogue-density.json`, pinned by `web/test/density.test.ts` (+7 tests,
  255 → 262). One is a deliberate tripwire that **fails when 6.1d succeeds**.

**Live decisions:** unchanged — D1–D5 stand as written. Nothing in the measurement contradicts them.

---

## Next Actions

**We are in M6.** Stage detail, the D1–D5 decision table and the 6.1 slices live in
`docs/DEVELOPMENT_PLAN.md` §6 — this is the index, not the plan.

1. **M6.1 — the comic pane becomes a cartoon.** ◐ **The most important item in M6** (user's
   weighting). 6.1a ✅ (baseline: `npm --prefix web run density`) · 6.1b ✅ (ADR 0009).
   **Next is 6.1c — the first code that changes the pane:** `PanelContext.roomTitle` + the renderer
   drawing the box on room change, narration routed to the DM's balloon, `captionFor` retired, the
   200-char sentence packing and the balloon run. Exit: no `BM_ACTION` line on an ordinary turn, long
   descriptions continue across panels, mapper still pure. **Expect the pixel gate to drift — look at
   the images before accepting**, and re-run the density report. Then 6.1d (lift the limiters — D5 is
   met here), 6.1e (write the dialogue; the largest, several sessions), 6.1f (verify).
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
