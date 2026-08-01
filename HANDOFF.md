# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Adding to this file is the
exception; adding to one of those three is the rule.** If it will still be true in a year, it does
not belong here.

---

## Current Version
**0.21.0** · Platform: **macOS only** (2026-07-28)

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
  `docs/DEVELOPMENT_PLAN.md` §6. **6.1a–6.1d are done and D5 is met**; 6.1 is in progress.

**Tests:** 267 web · 139 engine · 198 IR · parity 143/143 strict.

---

## Last Session — M6.1d: the limiters came off and D5 is met (v0.21.0)

6.1a ✅ · 6.1b ✅ · 6.1c ✅ · **6.1d ✅ — the stage's number is reached.** Narrative in `WORKLOG.md`
v0.21.0; the decisions are ADR 0009 §5/§6, which is the authority.

- **One exchange every 21.6 turns → 2.4, and on the full-game oracle 135 → 2.6.** D5 asked for one
  every 2–3 on the corpus *and* the oracle. 252 exchange turns of 606, all reaching the screen,
  **189 of them landing the two-shot in one panel.** Panels 478 → 801 (+68%) — the cost ADR 0009 §5
  accepted in advance.
- **Two of the four named limiters were one object: a single cooldown shared by every authored
  line.** It is now **per beat**, the gazetteer is **uncooled** (a first visit happens once, so the
  room path limits itself), and the shipped value is **0** — at 1 the oracle reads 5.8, outside D5,
  because markers arrive in clusters. The run, not a clock, is what keeps a beat from wearing out.
- **The Director drops a refusal only when it has nothing to say**, asked of the script (`speaks()`)
  rather than of the marker table — so 6.1e's dialogue changes what survives without touching
  `director.ts`. **`parser-miss` (26.4% of turns) and `routine-ack` are scripted.** The Hero may
  report an action *and* answer (§6); only the ordering survives.
- **The density instrument was wrong and was repaired** — it attributed panels through `panel.turn`,
  which is the *last* line written into a panel, and printed a negative split count once most turns
  spoke. Per-turn attribution now comes off the Director's `PanelDelta`. In `docs/PITFALLS.md` → Web,
  with the per-beat cooldown and the `status.moves` clock that does not advance on a refusal.
- **The 6.1a tripwire fired and was inverted deliberately**; three tests guarding retired rules were
  rewritten. Density baseline re-accepted; the pixel gate is clean at 17 cases (its fixtures carry
  their own scripts, so this slice did not move it).

## Next Actions

**We are in M6.** Stage detail, the D1–D5 decision table and the 6.1 slices live in
`docs/DEVELOPMENT_PLAN.md` §6 — this is the index, not the plan.

1. **M6.1 — the comic pane becomes a cartoon.** ◐ **The most important item in M6** (user's
   weighting). 6.1a ✅ · 6.1b ✅ · 6.1c ✅ · 6.1d ✅ (D5 met: 2.4 corpus, 2.6 oracle). **Next is 6.1e —
   write the dialogue.** The largest slice, several sessions, and D1 sanctions its size. The
   mechanism is finished; what is left is coverage. Three things it inherits, named rather than
   discovered later:
   - **Depth, not breadth, is the pressing half.** `parser-miss` fires 160× in the corpus against a
     ten-line run, so its last line repeats ~150 times. **Decide first whether a beat that frequent
     wants a rotating tail** instead of a settled last line — that amends ADR 0006 §4 rule 4, so it
     is a decision, not an edit.
   - **Write against the oracle's distribution, not the scenes'.** 56.6% of turns carry no marker at
     all (ambient 191, traversal 89 of 606), which is why `07-forest-and-tree` still reads one
     exchange every 8 turns while every other scene is at 2.
   - **The gazetteer is still DM-only** (`exchangeFor` rule 3). Giving room lines a Hero half is the
     obvious next lever if 6.1e needs one; it was not needed to meet D5.

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
