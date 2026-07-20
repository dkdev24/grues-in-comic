# HANDOFF.md

Cross-session context. Read at session start, update at session end.

**Scope rule:** this file holds only what the *next* session needs — current state, what to do
next, and decisions that are still live. Completed session narrative belongs in `WORKLOG.md`
and must not be duplicated here. At session end, replace Last Session, revise Next Actions, and
append to Open Issues; do not accumulate a "Prior Session" stack.

---

## Current Version
**1.3.0**

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
- **M5** Comic Chat presentation — **5.1 ✅** art pipeline (`art/`: decode, pose selection,
  compositing; 13 tests, whole-corpus sweep) and the presentation analysis in `wiki/` ·
  **panel grammar ✅ (v1.2.0)** — `docs/adr/0004-presentation-mapping.md` Accepted ·
  **5.2 ✅ (v1.3.0)** — `web/`, the browser shell; Zork I is playable in a browser.
  **5.3 is now unblocked on both design and plumbing.**

---

## Last Session — stage 5.2, the browser shell (v1.3.0)

**Zork I is playable in a browser.** New package `web/`; read `web/README.md` first, the full
narrative is `WORKLOG.md` v1.3.0. Engine, IR and art are untouched — parity is unchanged at
143/143 strict, 155/161 overall.

5.2's real job was to consume the ADR 0002 contract from *outside* the engine for the first time.
**The contract survived.** Three things only become visible from outside; none needs a contract
change, and each is pinned by a test in `web/test/status.test.ts` rather than left as prose:

1. **`room-title` never arrives** — the standing open issue, now confirmed from the consumer side
   and marked resolved below. The status line resolves the room name from the world document by id.
2. **`start()` emits no `player-moved`.** The opening placement arrives as an `object-moved` of
   `ADVENTURER` with `from` === `to`. **Scope that rule to the player**: the thief's wander daemon
   emits ~1 `object-moved` per turn, so a looser rule puts the status line in the thief's room.
3. **`restore()` emits no events**, so any UI state *derived* from the stream must be rebuilt from
   `SaveState` (`locations`, `globals.SCORE`).

Carried forward as the things most likely to be got wrong next:

- **`src/session.ts` is deliberately DOM-free, and that is what 5.3 consumes.** It hands over a
  turn's events plus derived state and holds no opinion about panels. Both panes reading one
  stream is what makes ADR 0004 §2's "narration is accompanied, never replaced" cheap instead of a
  synchronization problem. **Do not give the comic pane its own engine handle.**
- **The console pane was built subordinate already** (ADR 0004 §4), owning a `<section>` rather
  than the page, so 5.3 adds a sibling. §4a was verified in a real browser at 390×844 — both panes
  visible, no horizontal scroll — not asserted from the CSS.
- **Style by channel, never by parsing text.** There is no regex over narration anywhere in `web/`;
  adding one is the failure mode ADR 0002 exists to prevent. Likewise `textContent`, never
  `innerHTML` — the transcript is where a world document could inject markup into the page.
- **No bundler, no new dependencies, by decision.** `tsc` alone emits browser-native ESM because the
  engine imports the IR for types only. If 5.3 needs asset pipelines or code splitting, add a
  bundler *then*, on that evidence — `web/README.md` records why it was not needed here.
- **The inspector is the half of 5.2 worth keeping.** The console renders four event types and
  drops three; the three it drops are exactly what 5.3 renders. The live mix reproduced the ADR 0004
  census on a real session (`object-moved` ≈ 1.00/turn, `speech` 0.00).

## Next Actions (per `docs/DEVELOPMENT_PLAN.md`)

**M4: 4.1–4.7 ✅. M5: 5.1 ✅, 5.2 ✅.** Nothing is blocked; **5.3 is next by the plan** and is
⚑ **Gate D**.

1. **Stage 5.3 — comic renderer POC: one scene as panels + speech bubbles.** ⚑ **Gate D** — it
   decides art pipeline and asset strategy, and 5.4–5.5 are planned in detail only after it.
   Both blockers are gone: the design is `docs/adr/0004-presentation-mapping.md` (Accepted) and
   the plumbing is `web/`.
   - **Consume `web/src/session.ts`.** It is DOM-free and already hands over a turn's events plus
     derived state; the comic pane is a sibling `<section>` of the console pane, not a new engine
     handle. ADR 0004 §2's "narration is accompanied, never replaced" is only cheap if both panes
     read one stream.
   - **The material is the event types the console pane drops** — `object-moved`, `player-moved`,
     `score-changed`, `game-over`. `web/src/inspector-view.ts` already displays them per turn,
     which is the cheapest way to watch a mapping rule behave before committing it.
   - **The salience filter is a precondition, not a detail (ADR 0004 §7).** Only 31 of 187
     `object-moved` are player-salient; without it the most common shot in the comic is a close-up
     on an unseen thief. The live mix in the shell confirmed the ~1/turn rate on a real session.
   - **Sprite-sheet packing was deferred to this stage** — `art/tools/avbdump.ts` emits one PNG per
     pose plus a JSON manifest, and packing waits on what the renderer wants to load.
   - **Panel width is a Layout Manager parameter (§4a)**, evaluated per render at the current panel
     size. Review that as a design change, not as a diff against the C++.
   - **A bundler is a live option now, and only now.** `web/` deliberately has none; if 5.3 needs
     asset pipelines or code splitting, add one on that evidence (`web/README.md` records why it
     was not needed at 5.2).

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

5. **Panel grammar ✅ — `docs/adr/0004-presentation-mapping.md` is Accepted.** No longer a
   blocker on 5.3. The ADR is the decision of record; **amend the ADR, not the discussion doc.**
   What is left is authoring judgement, not design, and the user has asked for a **recommendation
   at the point each is needed — lead with a pick, not a survey**: the Guide's identity, final
   Hero/Guide casting (cast both together — the shortlists intersect only at susan), Guide
   trigger/cooldown, page composition and pull-quote selection, §4a breakpoints, PDF byte size,
   pane scroll coupling.

6. **Assisted input — designed, deferred to after the MVP.** A SCUMM-style command picker; see
   discussion §15. Not to be started before the MVP ships, but two constraints should be
   remembered whenever it comes up: **Zork's 135-verb list is a spoiler table** (`ECHO`,
   `ODYSSEUS`, `PRAY` *are* puzzle solutions, unlike Monkey Island's mundane nine), so it needs a
   fixed core verb set with puzzle verbs typed-only; and it **structurally removes `parser-miss`**,
   the largest affect marker at 12.7%, so it flattens the comic unless something replaces it. It
   requires an **ADR 0002 amendment** — a read-only query API (`objectsInScope()`), pull not push,
   leaving the event stream at 1.0.0. `engine/src/scope.ts` already computes the answer.

**Standing method note: measure before proposing rules.** Five plausible proposals died that way
across the panel-grammar sessions. The harness replay and the `art/` corpus both answer questions
cheaply, and a measurement taken for one question often answers another — the 0-`speech` census
sat unread for two sessions before it settled the balloon class.

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
- **`room-title` channel is unused in practice — resolved at 5.2, no contract change.** The engine
  delegates room description to Zork's own `DESCRIBE-ROOM`, which prints the name with
  `<TELL D ,HERE>`, so the title cannot be split onto its own channel without parsing prose —
  which ADR 0002 forbids. **The channel stays** (the console status line is its consumer,
  `docs/panel-grammar-discussion.md` §7.1), and the documented workaround is now implemented and
  tested: `web/src/status.ts` resolves the room name from the world document by id, taking it from
  `player-moved`.to and — for the opening turn, which emits none — from the player's own
  `object-moved`. An unknown id renders as the id, so a gap is visible rather than blank.
  **Two adjacent findings from the same stage**, both consumer-side, both tested, neither needing a
  contract change: `start()` emits no `player-moved`, and `restore()` emits no events at all
  (derived UI state must be rebuilt from `SaveState`).
- **`game-over` may double-emit — unverified.** The §10 event census counts **22 `game-over`
  events across 11 walkthroughs**, two per walkthrough within the same turn. Possibly legitimate
  (a death followed by a quit), possibly a double-emit. Harmless to per-turn logic and to the
  parity harness, which compares text; it would matter to a UI that reacts to the event. Noticed
  incidentally, not investigated.
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
- **Sprite-sheet packing is deferred to 5.3.** `art/tools/avbdump.ts` emits one PNG per pose plus a
  JSON manifest; packing waits until the renderer shows what it wants to load.
- **`art/src/pose.ts` diverges from the original on purpose, once.**
  `CAvatarComplex::GetBodyFromEmotion` reuses one `nearestI` across its face and torso loops, so
  a request whose torso search matches nothing draws *the face's index as a torso*. The port
  falls back to neutral instead, matching what the `CEmotionOpts` path already does. Recorded at
  the call site.
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
| `web/` | **Browser shell (5.2).** `npm --prefix web run dev` → localhost:8080. `src/session.ts` is DOM-free and is what 5.3's comic pane consumes; no bundler, by decision — see `web/README.md` |
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
