# HANDOFF.md

Cross-session context. Read at session start, update at session end.

**Scope rule:** this file holds only what the *next* session needs — current state, what to do
next, and decisions that are still live. Completed session narrative belongs in `WORKLOG.md`
and must not be duplicated here. At session end, replace Last Session, revise Next Actions, and
append to Open Issues; do not accumulate a "Prior Session" stack.

---

## Current Version
**1.7.7**

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
  - **5.5 ✅ core exit criterion (v1.7.0) — THE GAME IS COMPLETABLE.** The engine wins Zork I:
    **350/350**, ends in `STONE-BARROW`, `game-over{victory}`, 0 crashes/deaths. Committed test
    `engine/test/completion.test.ts` (seed 1234) locks it in. The resilient driver lives in
    `engine/harness/complete.ts` (`runFullGame`, shared by `full-run.ts` and the test): it splits the
    fixed list before the map-gated barrow tail, runs `recoverHoard()` to ferry any thief-scattered
    treasure back to the case (fixing the v1.6.6 skull+torch strand), then wins. Path there:
    magic boat `LAUNCH` (v1.6.6, 173→334), room `M-END` (v1.6.5), exorcism IR fix (v1.6.3), the two
    native routines `LOUD-ROOM-FCN`/`STONE-BARROW-FCN` (v1.6.2, first victory). Presentation
    (task 3): 30-backdrop art pass LANDED (v1.6.4), Guide gazetteer authored. See Last Session.

---

## Last Session — Narrative Director (ADR 0005): Slices 1–4 landed, Slice 5 next

The comic pane read as a *play-log, not a story* — a category error: ADR 0004 treats the parser
transcript and the comic script as one artifact. Fix is **ADR 0005, the Narrative Director**
(`web/src/comic/director.ts`): `ingest(turn) → Panel[]` (0..N) between the turn stream and the panel
stream, an *edited, past-tense retelling* — while the console pane still shows every word live.
Supersedes 0004 §3 (Guide trigger), §6 (1 panel/turn), §2/§2a (Hero balloon = command); preserves
0002 (contract not extended), the §7 camera ladder, §10 affect ordering, §2 captions, and the
pure-function/parity-oracle property. **Full detail: WORKLOG v1.7.5 / v1.7.6. Hero voice settled in
`wiki/the-hero.md`.**

**Five slices, each green-tested, never one rewrite:**
- **1 ✅ Hero balloon = resolved action.** `heroBalloon(took, dropped, names)` renders the outcome of
  `object-moved` events ("The leaflet, then." / "The leaflet can stay."), `null` for
  movement/look/refusal. Object names via `objectNameTable(doc.objects)`.
- **2 ✅ Director skeleton.** Wraps the mapper 1:1; view drives `ingest`. `.panels` is the emitted stream.
- **3 ✅ Beat detection + noise drop.** Mapper tags each panel `kind`
  (`arrival|traversal|action|terminal|refusal|ambient`, `panelKind()`); Director **drops `refusal`**
  (parser said no, nothing happened) and passes the rest 1:1. Mapper always folds even on a drop, so
  stream state stays whole. §6 superseded: emitted stream = full fold **minus refusals**
  (`director.test.ts`). **Web 95/95 green.**
- **4 ✅ Traversal collapse.** The Director's first *buffering* edit: a run of consecutive
  `traversal` panels (backtracking) collapses to one panel at the run's destination (the last one).
  `pendingTraversal` holds the run; it flushes when a non-traversal beat arrives or via new
  `Director.flush()`. A trailing run stays buffered until `flush` — intended past-tense trailing.
  View gained `flush()`, called after the resume replay (`main.ts`) so a session saved mid-walk shows
  where the player is. §6-successor invariant is now **emitted === `edited(full fold)`** (reference
  reducer in `director.test.ts`). Walking through *new* rooms is unaffected (each is an `arrival`).
- **5 ◐ NEXT — Guide converses + two-shot.** The visible buddy-comic payoff; rests on 1–4. Two parts:
  (a) **broaden the Guide trigger** from room-keyed first-visit (`guideFor` in `mapper.ts`, script
  `GUIDE_SCRIPT` in `comic-view.ts`) to **beat-keyed** — the Guide reacts to *what the Hero just did*
  (the panel's `kind`/events), not only to entering a scripted room. Stay presentation-only (reads
  events, touches no state, still cooldown-gated) so `wiki/the-guide.md` §3 holds. (b) **two-party
  affect + facing**: when a beat carries both a Hero action and a Guide reply, compute affect for
  **both** figures and promote the camera to a real facing two-shot (§7 `over-shoulder`/`wide`, now
  driven by the *exchange*, not by "a guide line exists and nothing else happened" — see
  `cameraFor`). When it lands, **`wiki/the-guide.md` rule 6 ("address the scene, not the Hero")
  relaxes — decide it there**, and note the Hero may move from a *thought* balloon to *speech*
  (`heroBalloon` balloon class; `wiki/the-hero.md` left this to §4). Affect two-party work lives in
  `web/src/comic/affect.ts` (currently Hero-only) + `render.ts`/`figure.ts` (facing). This is the
  largest slice — consider itemizing (a)/(b) as separate commits if it runs long.

**Not verified in-browser across the whole arc** (offer stands: Playwright screenshots of a take, a
dropped refusal, and a collapsed backtrack). Deterministic per-object Hero-line variation remains a
sanctioned later refinement (`wiki/the-hero.md`).

**Slice 2 ✅ landed — Director skeleton (pure 1:1 refactor).** `web/src/comic/director.ts`:
`createDirector(options) → { ingest(turn) → Panel[], panels }` wraps the mapper and returns exactly
one panel per turn. `comic-view.ts` now drives the Director, not the mapper — `appendTurn` loops over
`ingest`'s 0..N panels (draws one canvas today; future-correct for drops=0 and montages=N).
`director.test.ts` proves **no behaviour change**: the Director's flattened output is byte-identical
to the mapper's panel sequence over every walkthrough. **Web 91/91 green, build clean, graph
regenerated.** The mapper is unchanged and stays the per-panel renderer; the Director owns only the
seam where Slice 3 adds beat detection.

Earlier version narrative for this milestone (v1.6.6, v1.7.0–v1.7.3 — completion, score events,
suite-green, SHOTS tuning) has moved to WORKLOG; see those entries for detail.

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
   - ✅ **Room `M-END` end-of-turn action (v1.6.5).** `runRoomEnd` in `engine.ts` runs the current
     room's ACTION with `M_END` between the walk-drain and `runClock` (ZIL `gmain.zil:154`). The
     exorcism now completes. It exposed a scoring bug — `addScore` now advances `BASE-SCORE` too, so the
     Living Room's `SCORE = BASE-SCORE + OTVAL-FROB` recompute no longer wipes room-visit points. See
     WORKLOG v1.6.5. 143/143 restored, 129 engine tests green.
   - ✅ **Magic boat `LAUNCH` — DONE (v1.6.6).** M-BEG dispatch now targets `<LOC WINNER>` via
     `containerAction(ctx)`, so `RBOAT-FUNCTION` intercepts `LAUNCH` before `V-LAUNCH`. The whole
     Frigid River leg + coal mine run; oracle advances **173 → 334/350**, misses 104 → 4. See WORKLOG
     v1.6.6.
   - ✅ **The completion harness (task 4) — DONE (v1.7.0). The game is won: 350/350, barrow, victory.**
     The 334→350 gap was thief-RNG divergence, not a dispatch gap. `runFullGame`
     (`engine/harness/complete.ts`) makes the combat-resilient replay **thief-and-inventory resilient**:
     it splits the fixed list before the map-gated tail, `recoverHoard()` ferries any hideaway-stranded
     treasure back to the case (multiple trips, junk dropped, lantern on for the dark descent), then
     `SCORE-UPD` reveals the MAP and the map-read → SW → `STONE-BARROW-FCN` tail wins. Committed as
     `engine/test/completion.test.ts` (seed 1234) asserting `game-over{victory}` + score 350. Minor
     residue: `get out of boat` at SANDY-BEACH (#219) still fails — vehicle didn't follow the player
     off the river (cosmetic; see Last Session).
   - ✅ **Web UI score-event gap — DONE (v1.7.1).** `reconcileScore` in `engine.ts` emits a corrective
     `score-changed` at the end of any `command()` where SCORE moved without an event — covering the
     extracted `SCORE-UPD` and LIVING-ROOM M-END recompute, i.e. all treasure scoring. `web/src/status.ts`
     already folds the event, so the display now updates on take/case. Pinned by `completion.test.ts`
     (`eventScore === 350`; fails at 302 without the fix).
   - `GRATE-FUNCTION` (3rd undefined routine) is off-route; do it for completeness, not to unblock.
   - ✅ **Committed completion test landed (v1.7.0)** — `engine/test/completion.test.ts` asserts
     `game-over{victory}` + score 350 + `STONE-BARROW`, over the shared `runFullGame` driver.

1. **Then presentation coverage (task 3) — per `docs/DEVELOPMENT_PLAN.md`.** Known going in:
   - ⚑ **Comic pane reads as a play-log, not a story — scoped as ADR 0005 (Narrative Director),
     Proposed.** Root cause and the 5-slice plan are in `docs/adr/0005-narrative-director.md` and
     the Last Session note. **Slices 1–4 ✅** (Hero balloon = action · Director skeleton · beat detection
     + `refusal` drop · traversal collapse). **Next: Slice 5 — Guide converses + two-shot** (design in
     the Last Session block above). The mapper's "one panel per turn (§6)" test at `mapper.test.ts`
     still holds (the mapper is 1:1; §6 is superseded on the Director's *emitted* stream, asserted in
     `director.test.ts`).
   - ✅ **Backdrop scarcity RESOLVED (v1.6.4).** 30 generated backdrops packed into
     `web/assets/comic/`; `web/src/comic/backdrop.ts` assigns all 110 rooms by id (`ROOM_BACKDROPS`,
     renamed from `OUTDOORS`/`OUTDOOR_BACKDROPS`); `BackdropId` union is the 30-id set; decoder reads
     the macOS V4/32-bit BMPs; polarity pinned per backdrop. **Remaining backdrop polish, not
     blocking:** the renderer (`render.ts:165`) still cover-fits to a hardcoded 315×315 square, so
     non-square crops stretch a few px (accepted); wire it to each image's native aspect if it ever
     shows. See WORKLOG v1.6.4 and Last Session.
   - ✅ **Guide identity and voice — DONE (this session).** Identity settled in `wiki/the-guide.md`
     (the tiki idol; short, present-tense, deadpan asides; atmosphere not hints — §3 keeps it
     presentation-only). `GUIDE_SCRIPT` in `comic-view.ts` is now an authored 88-room gazetteer
     across the full main path, replacing the 6 placeholders; keyed by real room id (fixed the
     placeholder's dead `BEHIND-HOUSE` key → `EAST-OF-HOUSE`). Every key validated against
     `zork1.world.json`. Content-only; the mechanism and its tests are unchanged.
   - ◐ **`SHOTS` framing table — first pass DONE (v1.7.3), by looking at the running page.** Tuned
     `reaction` backdrop 0.3→0.18 (face dominates the game-over beat) and `over-shoulder` fill 1.0→0.86
     (Hero no longer clipped in the two-shot); `medium`/`close-up`/`establishing`/`wide` left as-is.
     Dev harness `web/gallery.js` + `gallery.html` renders every preset over one constant panel for
     screenshot comparison — reuse it for the next framing pass. `establishing`≈`wide` similarity noted
     and deliberately left (inherent to solo-Hero scenes). Further tuning wants real endgame panels
     (varied rooms/emotions) in front of you, not more constant-panel work.
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
- ✅ **Magic boat `LAUNCH` / vehicle M-BEG — DONE (v1.6.6).** The M-BEG dispatch applicable is
  `<LOC WINNER>` (the vehicle when aboard), not always `here()` — `containerAction(ctx)` in `engine.ts`.
  General lesson: **ZIL's per-turn "room" hooks (M-BEG) actually fire on the player's *container*, so
  any vehicle/enterable with an ACTION is a first-class turn participant.** The same slot now covers
  `RBOAT-FUNCTION`; if a game adds another rideable with M-BEG behaviour it works for free. Reaching
  350 is now blocked only by thief-RNG (next bullet), not by any dispatch gap.
- ✅ **The game is completable — 350/barrow/victory (v1.7.0), via a resilient harness, not an engine
  fix.** `12-full-game.cmd`'s fixed list is tuned to dfrotz seed 1234, and the engine's generator draws
  a different thief-theft sequence — so completion is driven by `runFullGame` (`harness/complete.ts`),
  which repeats combat until the villain falls and ferries any hideaway-stranded treasure back to the
  case. Locked by `engine/test/completion.test.ts` (seed 1234). **The engine was never "corrected"
  toward 350 against the list** — the resilience lives in the harness, exactly where it belongs. Other
  seeds still don't win: the fixed *command list* is seed-1234-specific (the thief's mid-game thefts
  change which `put ... in case` lines land), which is a property of the authored list, not the engine.
- ✅ **Room `M_END` end-of-turn action — DONE (v1.6.5).** `runRoomEnd` runs it between the walk-drain
  and `runClock` (`gmain.zil:154`), on the room the player ends the turn in, no-op once the turn has
  finished. It uncovered a scoring split ZIL relies on: `addScore` now advances `BASE-SCORE` in lockstep
  with `SCORE` (as `SCORE-UPD` does), so the Living Room's `SCORE = BASE-SCORE + OTVAL-FROB` recompute
  no longer zeroes room-visit points. The general lesson worth keeping: **the engine's native score
  helper and ZIL's extracted routines must agree on the same globals** — a native helper that maintains
  only half of a derived-quantity's inputs is a silent-corruption bug the moment an extracted routine
  reads the other half back. Watch the same class where a native builtin shadows a ZIL global that
  extracted code also touches.
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
- ⚑ **Comic pane: multiple issues reported from live testing, mostly unenumerated.** User testing of
  the running site found "many issues" in the comic pane; the panel-layout/columns problem (pane
  collapsed to one oversized panel below ~810px) was diagnosed and fixed at v1.7.4 — see WORKLOG. The
  rest were not itemized in the session that found them. **Next session: ask for the specific list
  before investigating further**, then re-test live in the browser per issue (this bug was only
  caught that way, not by any test).
- ✅ **Backdrops — 30-backdrop art pass LANDED (v1.6.4).** `web/src/comic/backdrop.ts`
  (`ROOM_BACKDROPS`) assigns all 110 rooms an apt backdrop by id; `BackdropId` is the 30-id union;
  30 BMPs packed into `web/assets/comic/`. The old conservatory `room8bs` was dropped; the generic
  interior (`room`) is now the fallback only, not the answer for ~89 rooms. Decoder
  (`art/src/image.ts`) reads macOS V4-header / 32-bit BMPs. Polarity pinned in
  `art/test/polarity.test.ts`. See WORKLOG v1.6.4.
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
- ✅ **Backdrop scarcity — DELIVERED (v1.6.4): 30 AI-generated backdrops** in the Woodring hatch
  idiom, one per themed area, packed and assigned to all 110 rooms. Polarity is pinned in
  `art/test/polarity.test.ts` (non-degeneracy for all 30 + four human-checkable extremes); per-image
  ink fractions are intentionally not pinned (13–72% by design). If the art is ever regenerated,
  re-pack (`npm --prefix art run pack`) and re-check those extremes.
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
