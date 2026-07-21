# HANDOFF.md

Cross-session context. Read at session start, update at session end.

**Scope rule:** this file holds only what the *next* session needs — current state, what to do
next, and decisions that are still live. Completed session narrative belongs in `WORKLOG.md`
and must not be duplicated here. At session end, replace Last Session, revise Next Actions, and
append to Open Issues; do not accumulate a "Prior Session" stack.

---

## Current Version
**1.6.3**

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
  compositing; 16 tests, whole-corpus sweep) and the presentation analysis in `wiki/` ·
  **panel grammar ✅ (v1.2.0)** — `docs/adr/0004-presentation-mapping.md` Accepted ·
  **5.2 ✅ (v1.3.0)** — `web/`, the browser shell · **5.3 ✅ (v1.4.0)** — the comic renderer;
  every turn draws a Comic Chat panel beside the transcript, 50 web tests ·
  **masked-mono polarity fixed (v1.4.1)** — every figure had shipped inverted ·
  **5.4 ✅ (v1.6.0)** — room→backdrop assignment, session persistence, narration styling
  (`room-title`), **panel sequencing** (`comic/layout.ts`, a port of `CUnitPanelPage`'s uniform
  grid) and **character portraits** (`comic/portrait.ts` + the cast bar). Opening area playable
  in comic form — the exit criterion. **89 web tests, 468 across all packages, parity 143/143.**
  ⚑ **Gate D cleared** — asset strategy decided, so **5.4–5.5 can now be planned in detail**.
  - **5.5 ◐ (v1.6.3)** — completion oracle `verification/walkthroughs/12-full-game.cmd` wins in
    dfrotz (**350/350**). Engine runs **West of House → the temple** and now *starts* the exorcism
    at Entrance to Hades (bell goes red-hot, `XB` sets). Landed earlier: the two native routines
    (`LOUD-ROOM-FCN` echo, `STONE-BARROW-FCN` — the engine's first **victory**), a
    room-`M_BEG`-on-travel fix, a scope fix (take from a held open container), and **v1.6.3 the
    exorcism IR fix** (`,LLD-ROOM` stale room reference — see Last Session). Next blocker is now an
    **engine** one: no room `M-END` end-of-turn action, so the exorcism can't complete. Presentation
    coverage (task 3): the **30-backdrop art pass is planned** (`docs/backdrop-generation-plan.md`),
    image generation in progress; nothing landed in `backdrop.ts` yet.

---

## Last Session — stage 5.5 (v1.6.3): exorcism IR fix (stale room reference resolved)

Cleared the IR/extractor blocker from the previous session (the `,LLD-ROOM` reference in `BELL-F`).
Full narrative in `WORKLOG.md` v1.6.3.

**The fix (ir/, both files).** A `,NAME` value reference that names a room's ACTION routine and
resolves to nothing else now lowers to that **room entity**, not a bare name string. `BELL-F`'s
`<EQUAL? ,HERE ,LLD-ROOM>` now compares against `entity ENTRANCE-TO-HADES`.
- `extract-world.ts` builds `roomByActionRoutine` from each room's `action`, keeping only
  *unambiguous* action routines (a routine shared by several rooms — e.g. `FOREST-ROOM` — names no
  single room and is excluded; one whose name is a live entity id is already resolved as that entity).
- `extract-behavior.ts` `resolveName` consults it **just before** the routine-atom fallback, so it is
  **fail-closed** — only otherwise-dangling names are rewritten; every real entity/global/flag/verb/
  direction still takes precedence. The prior code had hard-coded this as an always-false "quirk";
  that reading was wrong (Release 119 named the room `LLD-ROOM`, so the compare fired there).
- Regenerated `ir/artifacts/zork1.world.json` (still validates: 110 rooms, 137 objects, 360 routines;
  `LLD-ROOM` stays extracted, reachable via the room's `action` entry ref).
- `ir/test/behavior-35-triage.test.ts` rewritten to pin the corrected resolution (it had pinned the
  old always-false quirk — verify a fix by reverting, not by watching a stale assertion pass).
- **Green:** 193 IR tests, 129 engine tests, **replay 143/143 strict (100%)**.

**Measured effect (`engine/harness/full-run.ts`).** Ringing the bell at Entrance to Hades now fires
the exorcism's `M-BEG` branch — bell goes red-hot, `XB` sets — instead of the old "Ding, dong." The
ceremony proceeds through lighting candles and reading the book. It does **not complete**: see the
next blocker.

**NEXT blocker is now ENGINE, not IR — the room `M-END` end-of-turn action.** The exorcism sets
`LLD-FLAG` in the `LLD-ROOM` room action's READ-book branch, but that branch is gated on `XC`, and
`XC` is set only by the same room action running with **`M-END`** (gated on `XB` + carried, lit
candles). The engine runs a room's action with `M_BEG` (before the verb) and `M_LOOK`/`M_ENTER`, but
**never with `M_END` at end of turn**, so `XC` stays false → `LLD-FLAG` stays false → the gate stays
barred (`take skull` at command ~174 fails). ZIL's order is `PERFORM → room M-END → CLOCKER`
(`gmain.zil:154`, `<APPLY <GETP <LOC ,WINNER> ,P?ACTION> ,M-END>`); the engine needs the same step
inserted in `runTurn` (engine.ts) between `dispatch` and `runClock`. **This has broad reach** — many
rooms carry `M-END` clauses (reservoir, mirror, etc. — 1actions.zil:477,1445,1674,2417,…) — so it is
a turn-loop change to make carefully and re-verify against 143/143. See Open Issues.

Still live from earlier stages:

- **`Turn` is not JSON-safe, and looked like it was.** `EventMix.counts` is a `Map`, and
  `JSON.stringify` writes a `Map` as `{}` — no error, no warning, nothing failing until a resumed
  turn reached the inspector and called `.get` on a plain object. The suite was green; the page
  was broken. **Persistence recomputes `mix` rather than storing it**, and the general form is
  worth holding onto: *derived state must not be persisted*, and a `Map` or `Set` anywhere in a
  persisted type is a silent data-loss bug waiting for a reload.
- **The v1.4.1 lesson recurred twice in one session, both times in the same shape.** The 5.3
  backdrop stub always returned *a* backdrop, so a dead branch and a mis-assigned room were both
  invisible; `scrollIntoView` always scrolled, so a 9.6px shortfall was invisible. **A total
  function with a wrong answer is the failure mode this codebase keeps producing** — assert the
  answer, never that an answer happened.
- **Everything real this session was found by looking at the running page**, not by tests. Three
  scroll defects, one dead backdrop branch, one `Map` round-trip. Keep Playwright in the loop.
- **Backdrop scarcity was mis-scoped as 5.4's constraint** and is 5.5's; see Open Issues. The
  general point: *the exit criterion bounds the constraint*. "Opening area playable" needs 13
  rooms, not 110, and nobody had counted.
- **Resume replays turns, it does not re-execute them.** `SaveState` stays the only source of
  world truth; the replayed turns are rendering. If a future change makes `play()` mutate engine
  state, resume silently double-applies it.

- **`art/`'s corpus sweep asserts shape, not colour** — non-empty, inside the canvas — and an
  inversion satisfies both *perfectly*. That is how this reached a released build. The general
  form: **the right shape is what makes a colour bug invisible**, which is gotcha 3 in
  `docs/AVB_FORMAT.md` one level down. **Anything in 5.4 that makes a new colour or polarity
  decision — backdrops, balloons, page furniture — needs its own pinning assertion**, because
  no existing test will notice.
- **`art/test/polarity.test.ts` pins the pixel-code → colour mapping, not the art.** Its first
  draft asserted *ink is a minority of drawn area*; anna's bob is a legitimate 80% ink and
  falsified it. **Art statistics are not invariants.** Keep the assertion on the code table —
  and note the near miss: trusting the ratio would have "fixed" a correct character.
- **Verify a regression test by reverting the fix**, not by watching it pass. Done here for all
  three assertions. A test written *from* a known bug passes trivially on the fixed code.
- **The type-only import line still holds.** Naming the manifest types from a module that
  imports the decoder put `node:zlib` in the browser program; hence the types-only leaf
  `art/src/cast-manifest.ts`. **If `web/dist/art/src/` ever holds more than `format.js`,
  `pose.js` and `cast-manifest.js`, that line has been crossed.**
- **The join is implemented twice on purpose** — pixels in `art/src/composite.ts`, sheet
  sub-rects in `web/src/comic/figure.ts` — because merging them drags the decoder into the
  browser. `web/test/figure.test.ts` runs both over the real cast pose for pose; that test is the
  only thing making the duplication acceptable, so do not weaken it.
- **Resize re-renders, never rescales**, and the pose round-robin is frozen per panel. Balloon
  breaks are a function of panel width (§4a), and an unfrozen cycle would redraw the whole strip
  with different bodies whenever the window moved.
- **The mapper is pure and canvas-free; the renderer holds all the numbers.** The mapper decides
  *what shot this is*, `render.ts` decides what that looks like at the current width. Keep that
  split — it is what lets 11 walkthroughs replay through the mapping in Node.
- **`SHOTS` in `render.ts` is authoring judgement sitting on top of the ADR**, not part of it.
  The ADR fixes which rung fires; those fill/reveal/backdrop numbers are the first values that
  made each rung legible and are the obvious thing to tune when the comic is *looked at*.
- **The mapper independently reproduced ADR 0004's own measurements** (medium 49.5% ·
  establishing 30.5% · close-up 12.0% · reaction 5.5% · wide 2.5%, against the ADR's 52.4 / 26.5 /
  12.7 / 5.8 / 2.6). Treat that as evidence the tables describe the event stream — and still
  assert orderings, never percentages.

## Next Actions (per `docs/DEVELOPMENT_PLAN.md`)

**M4: 4.1–4.7 ✅. M5: 5.1 ✅, 5.2 ✅, 5.3 ✅ (⚑ Gate D cleared), 5.4 ✅ (v1.6.0).** In **5.5 ◐**.
Exit criterion is **"game completable in the browser"** — read as: the engine, driven by
`12-full-game.cmd` with combat handled resiliently, reaches score 350 / the barrow, and the web
comic renders every turn. The winning route is proven (dfrotz); the engine and presentation are not
there yet. Do these in order:

0. **Implement the two critical native routines so the engine completes the game.** This is the
   heart of the exit criterion and is now fully scoped (see Last Session). In `engine/src/builtins.ts`
   (registered via `createBuiltins`, or in `engine.ts` beside `V-WALK`):
   - ✅ **`STONE-BARROW-FCN`** and **`LOUD-ROOM-FCN`** done in `engine/src/game-actions.ts`
     (v1.6.2); ✅ travel-runs-`M_BEG`; ✅ `scope.ts` held/carried fix. See WORKLOG v1.6.2.
   - ✅ **The exorcism IR fix (v1.6.3).** `,LLD-ROOM` in `BELL-F` now resolves to
     `entity ENTRANCE-TO-HADES` via `roomByActionRoutine` (fail-closed; ir/ extractor). The ceremony
     now *starts* (bell goes red-hot, `XB` sets). See Last Session.
   - **NEXT — room `M-END` end-of-turn action (ENGINE).** The exorcism can't *complete*: `LLD-FLAG`
     is set in `LLD-ROOM`'s READ-book branch, gated on `XC`, and `XC` is set only by that room action
     running with **`M_END`** — which the engine never does. Insert the room-`M-END` step in `runTurn`
     (engine.ts) between `dispatch` and `runClock`, matching ZIL's `PERFORM → room M-END → CLOCKER`
     (`gmain.zil:154`). **Broad reach** — many rooms have `M-END` clauses (reservoir, mirror, …) — so
     re-verify 143/143 after. Then fix whatever *next* gap surfaces past the exorcism (coal-mine
     machine, endgame thief — masked until now). Watch for **object-behaviour** gaps, not just
     undefined routines.
   - **Also a real gap for the web UI (task 3):** treasure scoring runs the extracted `SCORE-UPD`,
     which writes `globals.SCORE` directly and emits **no `score-changed` event** — the score
     display won't update on take/case. Only room-visit scores (native `addScore`) emit the event.
   - `GRATE-FUNCTION` (3rd undefined routine) is off-route; do it for completeness, not to unblock.
   - When the engine reaches 350/barrow, **make `full-run.ts`'s combat-resilient replay a committed
     completion test** (task 4) asserting `game-over{victory}` and score 350.

1. **Then presentation coverage (task 3) — per `docs/DEVELOPMENT_PLAN.md`.** Known going in:
   - **Backdrop scarcity is 5.5's live constraint**, mis-scoped to 5.4 once already. **Now being
     resolved by `docs/backdrop-generation-plan.md`** — 30 backdrops, all newly generated (the three
     MVP IDs `pastoral`/`field`/`room` are reused but re-arted; the conservatory `room8bs` is
     dropped), covering the full game, packed 3 images × 2×5 grid, 512×512 cells, Woodring hatch
     idiom / 1-bit polarity. Image generation is **in progress**; the plan carries the full
     `BackdropId` set, the room→backdrop map for `web/src/comic/backdrop.ts`, and a generation
     checklist. When landing it: `backdropFor` is already total (extends by adding rows), so the
     work is (a) crop/pack via `art/tools/avbpack.ts`, (b) extend the `BackdropId` union and
     **rename `OUTDOORS`/`OUTDOOR_BACKDROPS` → `ROOM_BACKDROPS`** (it now holds dungeon/temple/cave
     rooms, not just outdoor ones), (c) add a pinned polarity assertion per backdrop, (d) re-pack
     `web/assets/comic/`. The exit criterion still bounds priority: the winning route's room set
     deserves real backdrops first; everything else falls through to `room`.
   - **Two authoring stubs remain**, each marked at its call site and neither blocking: the
     **Guide's identity and voice** (`GUIDE_SCRIPT` in `comic-view.ts` is six placeholder lines
     proving the mechanism, plus a cooldown the ADR deliberately does not set) and **`SHOTS`** in
     `render.ts` (framing numbers, the obvious thing to tune once the comic is *looked at*).
   - **`layout.ts` is where a page policy would go.** §5 makes a page a layout policy over the
     panel stream, and the on-screen policy now exists as a real one — a print/PDF policy is a
     second function beside it, not a change to the strip. `cellFor` is already the row-major
     rule both would share.
   - **Page composition and PDF export are §5**, and deliberately not WYSIWYG: once panel width is
     a function of the viewport, a WYSIWYG export would have to pick one reader's window to be
     canonical. Expect that to read as a bug to someone; it is the decision.

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

5. **Panel grammar ✅ — `docs/adr/0004-presentation-mapping.md` is Accepted**, and amended twice
   at 5.3 from implementation evidence. The ADR is the decision of record; **amend the ADR, not
   the discussion doc.** What is left is authoring judgement, and the user has asked for a
   **recommendation at the point each is needed — lead with a pick, not a survey**. Settled at
   5.3: **casting (Hero = dan, Guide = tiki)** and **pull-quote selection** (the caption quotes
   the sentence the affect marker matched, else the turn's first; an over-long one is dropped
   rather than trimmed, since trimming makes it a paraphrase by omission). Still open: the
   **Guide's identity and voice**, its **trigger rate** (the mechanism ships, the rate is
   deliberately unset by the ADR), **page composition**, **§4a breakpoints**, **PDF byte size**,
   **pane scroll coupling**, and the **`SHOTS` framing table**.

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
- **The engine never runs a room's `M_END` action at end of turn** — only `M_BEG`/`M_LOOK`/`M_ENTER`.
  ZIL runs it every real turn (`gmain.zil:154`, order `PERFORM → room M-END → CLOCKER`). This blocks
  the exorcism's completion (`XC`→`LLD-FLAG`, see Next Actions task 0) and any other room whose
  behavior lives in an `M-END` clause. Adding it in `runTurn` is broad-reach — reservoir, mirror and
  others carry `M-END` — so it must be gated to real (clock-advancing, non-fatal) turns and
  re-verified against 143/143 strict. The v1.6.3 IR fix is what made this gap the frontier.
- **A dangling `,NAME` that is a room's ACTION routine now resolves to that room** (`roomByActionRoutine`,
  v1.6.3) — the extractor's second fail-closed non-mechanical transform, after the exit-scan rewrite.
  It fires only on names that resolve to nothing else and only for *unambiguous* action routines. Like
  the exit-scan, **loosen it only with a test that pins what it must still refuse**: widening it to
  ambiguous or live-entity names is how it would start rewriting good references.
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
- **`room-title` channel was unused in practice — CLOSED at v1.5.1.** The premise ("the title
  cannot be split out without parsing prose") was wrong: the engine does not have to *recognize*
  the title in text, it can *know* which `TELL` prints it. `RuntimeContext.titleRoom`, scoped to
  the `DESCRIBE-ROOM` frame in `runRoutine`, routes that one `D` — and the rest of its line — onto
  `room-title`, byte-identically, so parity is untouched. **The status line keeps the id lookup
  anyway**, deliberately: `restore()` describes no room and so emits no title.
  `web/src/status.ts` resolves the room name from the world document by id, taking it from
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
- **Backdrops — MVP shipped three; the post-MVP art pass is now planned and underway.**
  `docs/backdrop-generation-plan.md` specifies **30 backdrops**, all newly generated (the three MVP
  IDs are reused but re-arted, conservatory `room8bs` dropped), for full-game
  coverage — image generation is in progress. The three shipped backdrops were **not** the binding
  constraint on 5.4 (opening area = 12 outdoor rooms + house interiors, covered); scarcity gates
  **5.5** (full-game). `web/src/comic/backdrop.ts` now assigns rooms by table, not regex.
  **The live risk is `room8bs.bmp`'s content, not the count.** It is a *conservatory* — glass
  dome, planter, topiary — which is honest for Kitchen and will read badly as Cellar, Maze or
  Temple, where ~89 of the 110 rooms live. That is what the 30-backdrop pass fixes, and it is
  the reason "one generic interior" is not a durable answer.
- **`web/assets/comic/` is a committed build artifact.** Regenerate with `npm --prefix art run
  pack`; the cast is pinned in that script, so a recast is a one-line change plus a re-pack.
  **Re-pack after any `art/` decode change** — v1.4.1 fixed the decoder and the committed sheets
  stayed inverted until they were regenerated, so the source fix alone did not fix the site.
- **`art/` has no assertion that any rendered image *looks* like anything, apart from
  `test/polarity.test.ts`.** The corpus sweep checks coverage and bounds, both of which an
  inverted, mis-hued or mirrored figure satisfies. This was a released defect at v1.4.0, found
  by a human looking at the page. **Two consequences for 5.4:** any new colour/polarity decision
  needs its own pinned assertion, and *looking at the output* stays part of the loop — the
  regression that reached the browser was invisible to 13 passing tests.
- **Running `npx vitest` from the repo root times out `art/test/corpus.test.ts`.** The corpus
  sweep takes ~11 s and its longer timeout lives in `art/vitest.config.ts`, which a root-level
  run does not pick up. Not a regression and not new; use `npm --prefix <pkg> test`.
- Neutral branding for commercial assets (engine/IR/importer).
- Repo is prepared for public release but not yet public; nothing blocks it.
- **Backdrop scarcity — plan chosen: 30 AI-generated backdrops (`docs/backdrop-generation-plan.md`).**
  The MVP shipped three against 110 Zork rooms with no `AT_BACKDROP` assets; the post-MVP pass is
  now scoped as **new art in the Woodring hatch idiom** (the option chosen over compositing tricks or
  deriving variants), covering every room the winning route touches plus a `room` fallback. It
  **must match the Woodring hatch idiom and the 1-bit polarity the decoder now produces**, and per
  the `art/` item above **each new backdrop needs a pinned polarity assertion** in
  `art/test/polarity.test.ts` — nothing in the suite would notice a backdrop that is merely
  plausible, mis-hued, or inverted.
- **Sprite-sheet packing ✅ decided at 5.3** — one sheet per avatar, **parts not figures**, figure
  and aura as paired sub-rects. `art/tools/avbdump.ts` remains the *inspection* tool;
  `art/tools/avbpack.ts` is the build. Rationale is on `art/src/cast-manifest.ts`.
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
| `docs/backdrop-generation-plan.md` | 30-backdrop generation plan (IDs, prompts, room→backdrop map, checklist) for the post-MVP art pass |
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
