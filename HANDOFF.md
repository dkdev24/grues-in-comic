# HANDOFF.md

Cross-session context. Read at session start, update at session end.

**Scope rule:** this file holds only what the *next* session needs — current state, what to do
next, and decisions that are still live. Completed session narrative belongs in `WORKLOG.md`
and must not be duplicated here. At session end, replace Last Session, revise Next Actions, and
append to Open Issues; do not accumulate a "Prior Session" stack.

---

## Current Version
**1.0.0**

---

## Project Status
**Grues in Comic** (was Comic-Zork). Repo: `dkdev24/grues-in-comic`.

Historical sources imported: `original-projects/zork1/` (ZIL source),
`original-projects/comic-chat/` (MS Comic Chat v1.0/2.1b/2.5).

- **M1 ✅** `importer/` — ZIL S-exp parser, validated, AST artifacts
- **M2 ✅** `ir/` — IR schema/validator; ADR 0001 (behavior AST + builtins), ADR 0002 (TS engine,
  JSON event contract, ⚑ Gate B); Graphify adopted per-module (⚑ Gate A); OpenWiki not adopted
- **M3 ✅** Semantic extraction ZIL→IR — world-document unit complete. 110 rooms/exits,
  137 objects, 267 parser rules, 360 routines (28 catalogued, all triaged), 87% ref coverage.
  IR schema 0.14.0
- **M4 ✅** Engine core — 4.1 ✅ world runtime · 4.2 ✅ parser · 4.3 ✅ dispatch, save/restore ·
  4.4 ✅ transcript harness · 4.5 ✅ `TAKE ALL`, wider corpus · 4.6 ✅ orphan questions,
  pronouns, compound sentences, per-turn parity directives · **4.7 ✅ villain combat**
  (IR `random` op, membership verification, `GO` as entry ref — both sides of the fight,
  death and resurrection) · **ADR 0003 ✅ derived adjacency** (`I-SWORD`) · **thief ✅ verified**
  (robbery, wander, melee — membership + a dfrotz positive control) · **membership hardened**
  (combat gains world-state assertions and its own reference control).
  **11 walkthroughs, 143/143 strict turns (100%), 155/161 overall. 120 engine tests, IR 193.**
  ⚑ **Gate C CLAIMED (v1.0.0)** — criterion amended in `docs/DEVELOPMENT_PLAN.md`, see below
- **M5** Comic Chat presentation — `.avb` decoding solved (v0.5.18); the rest is open

---

## Last Session (v1.0.0)

**⚑ Gate C claimed. The engine is complete** — Zork I runs end to end on the IR, in TypeScript,
zero dependencies, no browser code.

- **The criterion was amended in place, not quietly reinterpreted.** Stage 4.5's "all golden
  transcripts pass" was **unsatisfiable as written**: combat and the thief draw with
  `<RANDOM …>`, ADR 0002 declined to reproduce the Z-machine PRNG, so `05-troll-combat.cmd` is
  informational *by method, not by defect*. The amendment lives at
  `docs/DEVELOPMENT_PLAN.md` under Gate C and is the standard the next gate should be read
  against.
- **What parity now means, in two tiers**: deterministic turns strict by text (143/143, every
  opt-out with a written reason, enforced by test); randomized turns by **membership + world-state
  assertions + a `dfrotz` positive control** — all three, because membership alone is one-sided.
- **`V-CLIMB-UP` is a known limitation at the gate, recorded rather than waived.** It stalls on
  `GETPT` and answers "You can't go that way.", which is correct in every room without a
  climbable exit; the tree and the Cyclops stairs route through their own exits and never reach
  it. No walkthrough diverges on it. Last known gap in Group A coverage.

**11 walkthroughs, 143/143 strict, 155/161 overall. 120 engine tests, IR 193.**

## Next Actions (per `docs/DEVELOPMENT_PLAN.md`)

**M4: 4.1–4.7 ✅. Combat, the RNG question and `GO` are settled.**

**M5 is unblocked** — the session protocol's bar on starting a later milestone no longer applies.

1. **Stage 5.2 — minimal browser shell** over the event stream. The natural next step now that
   Gate C is claimed, and the **first real test of whether the ADR 0002 event contract is usable
   from outside the engine**: everything to date has consumed it from the harness, which was
   written alongside it and shares its assumptions. Expect the `room-title` channel question
   (open issues) to become concrete here rather than theoretical.

2. **`V-CLIMB-UP`, the last stub** — stalls on `GETPT`. Recorded as a known limitation at Gate C
   because no walkthrough diverges on it, but it is the last known gap in Group A coverage and
   the natural companion to the `OTHER-SIDE` item below, which needs the same idiom.

3. **Unassigned one-off tail** in the routine catalog: `<NEXTP …>` (OTHER-SIDE — ADR 0003
   rewrote `I-SWORD`'s scan but does **not** cover OTHER-SIDE, which needs the direction number
   and a door match), `<NTH …>` (I-CYCLOPS — a table index, not an exit scan, despite having
   been grouped with `I-SWORD`), String-in-statement-position (GRATE-FUNCTION), bare
   `,ONBIT`/`,ACTORBIT` (LIT?, V-SAY), non-atom FSET? flag (GOTO), `REST` with a non-literal
   byte count (PICK-ONE — Group A regardless).

4. **The invisible-routine audit, re-run after ADR 0003.** 439 ROUTINE forms, **360 extracted,
   28 catalogued, 51 invisible**. 45 are correctly excluded by design (40 `gparser`, 3 `gclock`,
   2 `gmain`: the engine owns the parser, the clock and the turn loop). The tail worth triage is
   now six: `BREATHE`, `MIN`, `UNTIE-FROM`, `FIND-IN`, `NO-GO-TELL`, `YES?` — `INFESTED?` left
   the list by being reached, which is precisely the point below.
   **Worth making this a standing report rather than a one-off**: the catalog names the routine
   that failed but never what its failure cost, which is exactly why combat stayed hidden for
   two milestones.

5. **Stage 5.1 (Comic Chat) = filler, independent of every gate.** Read
   `reference/comic-chat-paper.md` (SIGGRAPH '96 — balloon layout, character placement, gesture
   selection, camera zoom) alongside `original-projects/comic-chat/`. Remaining: **face/torso
   compositing** (`cx`/`cy`/`cxDelta`/`cyDelta`; selection in `GetHeadAndBodyFromEmotion`,
   `v2.1b/cchat/avatar.cpp`), mask/aura planes for DIB-format poses, and the TS port of the
   decoder.
   - **Panel grammar is an open design question, not a decoding one.** Comic Chat assumes
     dialogue between peers; Zork is second-person narration with 5 NPCs (`GHOSTS`, `BAT`,
     `CYCLOPS`, `THIEF`, `TROLL`). Most turns emit `narration` with no speaker, so caption boxes
     must be first-class, not just balloons — and "who is on screen when nobody speaks" needs an
     answer (the player is deliberately undescribed in Zork).

---

## Open Issues

**Engine / IR**
- **ZIL property defaults live in the engine, not the IR.** `PROPDEF SIZE 5` etc. are encoded in
  `engine/src/interpreter.ts`; the document is the correct home, and a `propdefs` section is
  deferred rather than rejected. **Do not "simplify" this to a blanket 0 default** — tried in
  v0.6.6, breaks ten of eleven walkthroughs, because `truthy()` counts 0 as true and the `false`
  sentinel distinguishes absent from zero. The table also carries `strength`, a Zork property
  rather than a library one — the ADR 0002 seam this table already sits on.
- **`Room.adjacent` is derived data in a document that otherwise transcribes the source**
  (ADR 0003) — the first such field, and the precedent should not be extended casually. It is
  safe only because `validate.ts` re-derives it from `exits`; keep that check if the field
  changes. Two traps: it means **declared, not reachable** (a shut door and a false condition are
  in the list — it is not a pathfinding graph), and it assumes the **exit graph is static**,
  which holds for Zork I but would fail *silently* for a game that opens a passage at runtime.
  That game forces the general reflection op ADR 0003 rejected on cost.
- **The exit-scan rewrite is the extractor's one non-mechanical transform.** It is fail-closed
  and tested by perturbation, but it is a pattern match against one ZIL idiom: an unrelated
  routine written in a *similar* shape would not match (correct), and a future edit that loosens
  the match to catch more cases is how it would start producing wrong loops. Loosen it only with
  a test that pins what it must still refuse.
- **`state.parser` is deliberately outside the save contract.** Orphan questions and the "it"
  referent are mid-sentence scratch, not world state; `restore` clears them rather than
  reinstating a half-asked question.
- **Pronoun with no referent diverges in one case.** In West of House, where the mailbox is the
  room's only object, the reference resolves "READ IT" *to the mailbox* rather than refusing.
  Whether that is a one-candidate fallback is unverified, so we refuse in both rooms — matching
  the many-object case only. Recorded at the call site in `engine/src/engine.ts`.
- **Multi-object lists are unimplemented** beyond `ALL`. "TAKE LEAFLET AND MAILBOX" is correctly
  kept as *one* turn by the sentence splitter, but the second noun is dropped; the reference
  prints a prefixed answer per object, as `TAKE ALL` already does.
- **`room-title` channel is unused in practice.** The engine delegates room description to Zork's
  own `DESCRIBE-ROOM`, which prints the name with `<TELL D ,HERE>`, so the title cannot be split
  onto its own channel without parsing prose — which the ADR 0002 contract forbids. A UI wanting
  the title should read `player-moved`.to and look the name up in the world document. Decide
  whether the channel stays in the contract.
- **Stubbed builtins**: `V-CLIMB-UP` alone now (GETPT), returning a no-op so call sites reach a
  defined value instead of crashing a turn. `RANDOMIZE-OBJECTS` and `HERO-BLOW` are real
  extracted routines as of v0.7.0.
- **Extracting a routine can silently *shadow* an engine builtin**, because routines take
  precedence in `callRoutine`. `LIT?` did exactly that in v0.8.0 and cost every dark-room turn
  until it was excluded by `ENGINE_IMPLEMENTED`. `DO-WALK` and `THIS-IS-IT` are currently both
  extracted *and* builtins and happen to agree — **check this whenever the extraction frontier
  moves**; the failure is total and silent, and the catalog will not mention it.
- **`GO` runs at engine construction**, not in `start()`, so initialization cannot be skipped.
  An explicit `start:` option overrides `GO`'s room placement and re-describes; `start()` just
  replays the events construction produced.
- **Randomized turns are verified by membership, not text parity** — the settled answer to the
  RNG question. `engine/test/combat.test.ts` derives the legal message set from the IR; it must
  stay derived, since a hand-listed set drifts and starts passing by construction. The thief
  follows the same pattern as of v0.8.2, through the shared `engine/test/membership.ts`.
  **Membership is one-sided and cannot be the whole check**: a *narrower* legal set never makes a
  passing line fail, so a broken derivation looks green. **Both suites now carry the two things
  that close this** (v0.8.3) — world-state assertions for the behaviour, and a positive control
  of real reference output. Any *new* membership suite needs both from the start; membership
  alone is not evidence of anything but legality.

**Project / M5**
- Neutral branding for commercial assets (engine/IR/importer).
- Repo is prepared for public release but not yet public; nothing blocks it.
- **Backdrop scarcity**: 3 shipped Comic Chat backdrops vs. 110 Zork rooms, and no `AT_BACKDROP`
  assets exist. Options sketched but undecided — panel compositions that avoid backdrops,
  deriving variants from the three originals, or new art in the Woodring hatch idiom for the ~10
  rooms that carry the game. M5 decision.
- `art/` has **no test harness**; the 4656-image corpus sweep was ad hoc.
- `README.md:27` still says the engine is "inspired by the original gameplay" — understates the
  commitment to behavioral compatibility verified by golden transcripts. Minor wording.

---

## Standing Notes

Hard-won rules that outlive any one session.

- **P-WON gating is settled: do not implement it.** The transcripts contradict the source
  (v0.6.5); the reasoning is at the call site, because the source reads the other way and the
  next reader will otherwise "fix" it back.
- **The shipped Release 119 story file is ground truth**, not the ZILF-reconstructed source in
  `original-projects/` (settled in stage 0.2). Where the two disagree, the transcript wins.
- **Ask the reference build rather than reasoning about the ZIL.** Nearly every parser and
  `TAKE ALL` detail in 4.5/4.6 was settled that way, and several confident readings of the
  source turned out wrong. `dfrotz -w 80 -s 1234 -p <story file>`.
- **"Cannot verify" and "fails to verify" are different states**, and the harness says which.
  Whole-file `# parity: informational` marks a limit of the method; per-turn
  `# informational: <reason>` … `# strict:` quarantines a passage inside an otherwise strict
  walkthrough. Quarantined turns leave the strict count in *both* numerator and denominator, and
  every opt-out must carry a written reason — both enforced by test.
- **A cascade has one cause.** A single missing routine or unreachable room turns into a dozen
  failing turns and buries where divergence actually began; find the first diverging turn before
  reading any later one.
- **`setFlag`/`move` on an unknown id silently invent a phantom entity**, which can make a test
  pass against an object that does not exist. Check ids against the world document.

---

## Key Paths
| Path | Purpose |
|---|---|
| `importer/` | ZIL parser, tests, AST artifacts |
| `ir/` | IR schema, validator, extraction → `artifacts/zork1.world.json` |
| `engine/` | **Engine core (M4).** Zero-dep TS; `src/events.ts` is the ADR 0002 contract as code. `npm test` runs against the real Zork I world |
| `engine/harness/` | Transcript replay: `replay.ts` (parity oracle), `golden.ts` (normalizer + parity directives) |
| `verification/` | `walkthroughs/*.cmd` + `golden/*.txt`; `run-transcripts.sh` captures goldens from dfrotz |
| `art/` | Comic Chat art tooling. `poc/avbdec.py` decodes `.avb` → PNG (Python by exception — port to TS per ADR 0002) |
| `docs/AVB_FORMAT.md` | **Normative** `.avb` format spec + the five silent-failure gotchas. Read before touching `art/` |
| `original-projects/zork1/` | ZIL source reference |
| `original-projects/comic-chat/` | Comic Chat source reference |
| `reference/` | Third-party reference material. **Gitignored** in full (some copyleft, some unlicensed); local-only, may be absent from a fresh checkout. See `reference/README.md` |
| `reference/z-machine-standards-1.1.md` | Z-Machine Standards Document 1.1 — **normative source** for M4 Group A builtin semantics (ADR 0002) |
| `reference/comic-chat-paper.md` | Kurlander/Skelly/Salesin SIGGRAPH '96 — presentation-algorithm reference for stage 5.1/5.3 |
| `reference/zilf/`, `reference/zlr/` | ZILF and ZLR sources, read-only. ZLR is a fallback only; see ADR 0002 and `reference/README.md` before reading it |
| `docs/` | Project documentation |
| `wiki/` | Semantic notes (hand-authored) |
| `<module>/graphify-out/` | Graphify graphs (config: `.graphifyignore`) |
| `CHANGELOG.md` | Public changelog |
| `WORKLOG.md` | Persistent history — one entry per version, never edited |
| `AGENTS.md` | Agent workflow rules |
