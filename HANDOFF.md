# HANDOFF.md

Cross-session context. Read at session start, update at session end.

**Scope rule:** this file holds only what the *next* session needs — current state, what to do
next, and decisions that are still live. Completed session narrative belongs in `WORKLOG.md`
and must not be duplicated here. At session end, replace Last Session, revise Next Actions, and
append to Open Issues; do not accumulate a "Prior Session" stack.

---

## Current Version
**0.8.0**

---

## Project Status
**Grues in Comic** (was Comic-Zork). Repo: `dkdev24/grues-in-comic`.

Historical sources imported: `original-projects/zork1/` (ZIL source),
`original-projects/comic-chat/` (MS Comic Chat v1.0/2.1b/2.5).

- **M1 ✅** `importer/` — ZIL S-exp parser, validated, AST artifacts
- **M2 ✅** `ir/` — IR schema/validator; ADR 0001 (behavior AST + builtins), ADR 0002 (TS engine,
  JSON event contract, ⚑ Gate B); Graphify adopted per-module (⚑ Gate A); OpenWiki not adopted
- **M3 ✅** Semantic extraction ZIL→IR — world-document unit complete. 110 rooms/exits,
  137 objects, 267 parser rules, 358 routines (29 catalogued, all triaged), 87% ref coverage.
  IR schema 0.14.0
- **M4 ⏳** Engine core — 4.1 ✅ world runtime · 4.2 ✅ parser · 4.3 ✅ dispatch, save/restore ·
  4.4 ✅ transcript harness · 4.5 ✅ `TAKE ALL`, wider corpus · 4.6 ✅ orphan questions,
  pronouns, compound sentences, per-turn parity directives · **4.7 ✅ villain combat**
  (IR `random` op, membership verification, `GO` as entry ref — both sides of the fight,
  death and resurrection).
  **11 walkthroughs, 117/117 strict turns (100%), 151/163 overall. 108 engine tests, IR 184/184.**
  ⚑ **Gate C not yet claimed**
- **M5** Comic Chat presentation — `.avb` decoding solved (v0.5.18); the rest is open

---

## Last Session (v0.8.0)

**`GO` is now an entry ref, which fixed all three things v0.7.1 flagged.** The game's own
initialization routine was unreachable, so nothing it did happened: the five daemons were never
queued and the melee tables never patched.

- **Combat is whole.** `I-FIGHT` → `DO-FIGHT` → `VILLAIN-BLOW` → `WINNER-RESULT` all extract.
  Villains strike back, disarm the player, knock them out and kill them; `JIGS-UP` and
  **resurrection** work. The troll also gets its free swing on entry, so some seeds end before
  the player swings at all.
- **`TABLE_CORRECTIONS` is deleted.** `GO` patches `DEF*-RES` at runtime, as the source always
  meant it to. The extractor no longer hardcodes what the game does itself.
- **Four extractor gaps fell out of reaching `GO`**, each documented at its site: flags used as
  *values* (`,NONLANDBIT`, `,ONBIT` — also fixed `LIT?`); `PROB`'s two-argument form, which
  expands to `<ZPROB base>` and **discards its second operand** (VILLAIN-BLOW passes an
  undeclared `.HERO?` there, which is legal precisely because the macro drops it);
  `NON_RETURNING_BUILTINS`, so `GO`'s trailing `<MAIN-LOOP> <AGAIN>` stops catalogueing it; and
  `ENGINE_IMPLEMENTED`, after extracting `LIT?` silently **shadowed** the engine's own lighting
  and cost every dark-room turn in the corpus.
- **Initialization runs at construction, not in `start()`**, so a host that goes straight to
  `command()` cannot get a daemon-less game. An explicit `start:` option still overrides `GO`'s
  placement.
- **The combat test grew the damage assertion it was missing**, and its legal-message set is now
  derived from the `VILLAINS` table rather than hand-listed. The negative control twice caught
  the check going soft — first accepting a marker printed as a raw number, then accepting
  anything at all once wildcard-dominant patterns entered the set.

Parity unchanged at **151/163, 117/117 strict**: combat's *text* is a random draw either way.
Engine 108 tests, IR 185.

## Next Actions (per `docs/DEVELOPMENT_PLAN.md`)

**M4: 4.1–4.7 ✅. Combat, the RNG question and `GO` are settled.**

1. **⚑ `I-SWORD` — the last blocker on walkthrough 10, and it needs an *IR* answer.**
   `GO` now queues it, so the daemon runs the moment it extracts; the four remaining diffs there
   are all the sword glow. Delete the `# parity:` line in
   `verification/walkthroughs/10-dam-and-reservoir.cmd` when it lands and the walkthrough
   verifies strictly. It walks exits as numbered Z-machine properties (`<NEXTP …>`) and the IR
   models exits structurally, so it likely wants a small behavior op for "rooms adjacent to
   here". **A schema decision — deliberately not taken autonomously.** `I-CYCLOPS` (`<NTH …>`)
   has the same shape and would be answered by the same op.

2. **The thief is live and unverified.** `I-THIEF` is queued and running as of v0.8.0, but no
   walkthrough exercises a robbery and `ROB`/the thief's pass have never been checked against
   the reference. Verify by membership, as combat is. Longer walkthroughs are where an
   unverified thief will show up first.

3. **Systems completion** (⚑ Gate C): **death and resurrection now work** (v0.8.0 — `JIGS-UP`
   via `WINNER-RESULT`), so what remains here is the thief's robbery pass, which is item 2.
   **P-WON gating is settled: do not implement it** — the transcripts contradict the source
   (v0.6.5; reasoning is at the call site, because the source reads the other way and the next
   reader will otherwise "fix" it back). `V-CLIMB-UP` is the last stub.

4. **Unassigned one-off tail** in the routine catalog: `<NEXTP …>` (I-SWORD, OTHER-SIDE),
   `<NTH …>` (I-CYCLOPS), String-in-statement-position (GRATE-FUNCTION), bare
   `,ONBIT`/`,ACTORBIT` (LIT?, V-SAY), non-atom FSET? flag (GOTO), `REST` with a non-literal
   byte count (PICK-ONE — Group A regardless).

5. **The invisible-routine audit, re-run after `GO`.** 439 ROUTINE forms, **358 extracted, 29
   catalogued, 52 invisible**. 45 are correctly excluded by design (40 `gparser`, 3 `gclock`,
   2 `gmain`: the engine owns the parser, the clock and the turn loop). The tail worth triage is
   now seven: `BREATHE`, `INFESTED?`, `MIN`, `UNTIE-FROM`, `FIND-IN`, `NO-GO-TELL`, `YES?`.
   **Worth making this a standing report rather than a one-off**: the catalog names the routine
   that failed but never what its failure cost, which is exactly why combat stayed hidden for
   two milestones.

6. **Stage 5.1 (Comic Chat) = filler, independent of every gate.** Read
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
- **`I-SWORD` needs an IR answer, not an engine one.** It walks exits as numbered Z-machine
  properties (`<NEXTP …>`); the IR models exits structurally, so the extractor cannot translate
  it mechanically and the engine must not hard-code it (ADR 0002). Likely needs a small IR
  behavior op for "rooms adjacent to here" — an IR schema decision, deliberately not taken
  autonomously. Same shape as `I-CYCLOPS` (`<NTH …>`).
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
  stay derived, since a hand-listed set drifts and starts passing by construction. Death,
  resurrection and the thief should follow the same pattern.

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
