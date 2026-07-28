# HANDOFF.md

Cross-session context. Read at session start, update at session end.

**Scope rule:** this file holds only what the *next* session needs — current state, what to do
next, and decisions that are still live. Completed session narrative belongs in `WORKLOG.md`
and must not be duplicated here. At session end, replace Last Session, revise Next Actions, and
append to Open Issues; do not accumulate a "Prior Session" stack.

---

## Current Version
**0.18.8**

---

## Project Status
**Grues in Comic** (was Comic-Zork). Repo: `dkdev24/grues-in-comic`.

Historical sources imported: `original-projects/zork1/` (ZIL), `original-projects/comic-chat/`
(MS Comic Chat v1.0/2.1b/2.5).

- **M1–M3 ✅** `importer/` (ZIL S-exp parser), `ir/` (schema/validator; ADR 0001 behavior AST +
  builtins, ADR 0002 TS engine + JSON event contract), and ZIL→IR semantic extraction. 110
  rooms/exits, 137 objects, 267 parser rules, 360 routines. IR schema 0.14.0. Graphify adopted
  per-module (⚑ Gate A); OpenWiki not adopted.
- **M4 ✅** Engine core (4.1–4.7): world runtime, parser, dispatch, save/restore, transcript harness,
  combat + thief (membership-verified). **11 walkthroughs, parity 143/143 strict.** ⚑ **Gate C
  claimed (v0.9.0)** — criterion amended in `docs/DEVELOPMENT_PLAN.md`.
- **M5 ◐** Comic Chat presentation. 5.1 ✅ art pipeline (`art/`), 5.2 ✅ browser shell (`web/`),
  5.3 ✅ comic renderer (⚑ Gate D cleared), 5.4 ✅ backdrops/persistence/panel sequencing/portraits
  (v0.15.0). ADR 0004 (panel grammar) Accepted; ADR 0005 (Narrative Director) implemented (v0.17.0);
  ADR 0006 (DM & player) Slices 1–4 done (v0.17.7–v0.18.8; only the Slice 5 export remains);
  ADR 0007 (comic-pane port boundary + fixed panels)
  fully built (v0.17.10–12); **ADR 0008 (full mechanical port + multi-participant) Accepted — ✅ COMPLETE.
  Phases 0–3 done (v0.18.1–v0.18.5); the layout stack is a cited port with a pixel gate.
  Re-scoped 2026-07-24 to a full faithful port vs **v2.5-beta-1 (modern variant)** (was v1.0-pre; the comic
  pane is now a multi-party GM+NPC comic, not solo-Hero). Source: `original-projects/comic-chat/v2.5-beta-1-modern/`
  (tracked; line-identical to raw `v2.5-beta-1/`), navigated via the offline C++ graph at
  `reference/comic-chat-v2.5-beta-1-modern/graphify-out/`. Seam + N-body layout landed v0.18.0; `LayoutAvatars`
  (Phase 1), `page.ts` panelization (Phase 2), the multi-balloon layout driver (Phase 2b) and the pixel
  gate (Phase 3) are all done. **What ADR 0008 leaves open is only what it scoped out: mob *authoring*
  (an ADR 0006 slice) and the `OrderAvatars`/histeresis stubs that need the talk-to graph mobs bring.**
  - **5.5 ◐ — core exit criterion MET (v0.16.0): THE GAME IS COMPLETABLE.** Engine wins Zork I
    **350/350**, ends in `STONE-BARROW`, `game-over{victory}`, 0 crashes/deaths, pinned by
    `engine/test/completion.test.ts` (seed 1234). Path built across v0.15.2–v0.16.0 (native routines →
    exorcism IR fix → room `M-END` → magic boat → resilient completion harness); see WORKLOG.
    **In-browser visual verification done; the comic-pane issue list is cleared (v0.17.2).** Remaining
    5.5 work is authoring-judgement polish — see Next Actions.

**Test counts:** 255 web, 139 engine, 198 IR, parity 143/143 strict.

---

## Last Session — ADR 0006 Slice 4: bounded conversational memory (v0.18.8)

Full narrative in `WORKLOG.md` v0.18.8; the ADR's slice list carries the decisions. What the next
session must know:

**A beat is now a *run* of lines, not one line.** `BeatEntry` in `mapper.ts` is
`string | BeatExchange | readonly (…)[]`; the *n*th time a beat speaks it takes the *n*th entry
(`variantOf`), and past the end the last one repeats. Bare strings and single exchanges are unchanged,
which is why the pixel gate's fixture script needed no edit.

- **The whole memory is one `Map<marker, count>`** folded over the turns already read, beside
  `visited`/`lastGuideTurn`. **No engine state, no clock, no RNG** — that is the ADR's load-bearing
  constraint, and `replayPanels` still holds. Anything added here must fold the same way.
- **Two rules, each a decision.** The counter is over **spoken** firings, not marker occurrences (a
  cooldown-swallowed beat was never on the page, so it must not retire a reply the reader never read);
  and **nothing cycles** — the last line of a run is authored as the *settled* one.
- **Run depths are measured.** Spoken over the 606-turn corpus: `reveal` 14×, `effort` 9×, `scored` 5×,
  `uncanny` 3×, `combat-threat` 3×, `grue-threat` 1×, `combat-victory` 0×. `reveal` got 4 lines, the
  rest 2–3. Re-measure before deepening a run rather than guessing.
- **Gotcha that cost a test iteration:** the cooldown is measured in `moves`, and **a refused command
  does not advance `moves`** — two parser misses in a row are one turn apart by the only clock the
  mapper has. Any test that wants a cooldown to expire must walk between the beats.
- **Not built, deliberately:** cross-beat memory (e.g. a kill count quoted in another beat's line).
  Legal under §4 but it needs line templating — an authoring surface, not this mechanism.
- **Test count: 255 web** (was 249); 139 engine, 198 IR, tsc, build and the 17-case gate all clean.

**Still-live finding from Slice 2 (unfixed by design):** an exchange renders as **shot/reverse-shot,
not a two-shot**
  — caption + DM + Hero is three balloons, the fit test refuses them in the band at `UNIT`, and
  `AddLine` splits. Reads well and is the ported mechanism deciding, but ADR 0005 §4's "both figures
  facing each other" panel is now rare (96.7% of turns carry a caption). Levers if it is ever wanted:
  the balloon-band height (`BALLOON_HEADROOM`) or dropping the caption on exchange turns. **Both are
  authoring/layout decisions — take them to the user, not to the port.**

**ADR 0008 Phase 3 — the pixel gate.**

- **The gate is a hash + geometry golden, not committed PNGs.** `web/tools/gate.ts` renders 16 fixed
  cases and pins each as the **SHA-256 of its PNG** plus the placement that produced it;
  `web/test/golden/panel-gate.json` (~6 KB) is the golden, `web/test/gate.test.ts` compares.
  **`npm run gate` checks, `npm run gate:accept` re-writes the golden.** A failing run dumps actual PNGs
  to `web/tools/out/gate-actual/` (gitignored) for eyeballing against a re-render of the previous commit.
- **`renderPanel` now takes an output-only `options.trace`** (`PanelTrace` in `render.ts`). It changes no
  pixels, and the gate reads placement from it rather than re-deriving it — keep it that way, or a second
  copy of the placement maths will drift from the one that draws.
- **Any accepted re-roll must be looked at first.** Balloon layout is seeded by a content hash, so touching
  that hash, the mapper's prose, or a `SHOTS` rung legitimately moves every panel. `gate:accept` is the
  right response *after* looking at the images, never instead.
- **Known pinned divergence — `mob4-p02` falls back to `stackBalloons`.** The fit test cleared a
  4-participant panel the renderer then refused: `fit.ts` estimates the two arrows at even stage slots
  (100/300 at `UNIT`), `layoutAvatars` puts the real anchors at ~140/~310, and at 140 the driver has no
  corridor for the first balloon. It is the documented cost of estimating arrow positions (ADR 0008
  Phase 2b/4), pinned by a dedicated assertion that the fallback set is exactly `{mob4-p02}`. **If a
  future change makes the two sides agree, that assertion is the one to update.** Production panels
  (0 of 10) never fall back.
- **Fixtures go through `page.ts` with the real fit test.** `render:bodies` still builds panels by hand and
  can produce 4–5-balloon panels panelization would have split — fine to eyeball, do not pin them.

**Verified:** 249 web (was 204), 139 engine, 198 IR, tsc + build clean. The gate's fixture set is 17
cases: adding the exchange to it re-indexed walkthrough 01 (10 panels → 11), which the gate reported
case by case before the golden was re-accepted.

---

## Still-live decisions (ADR 0008 re-scope, 2026-07-24)

Full narrative in `WORKLOG.md` v0.18.1; the binding text is `docs/adr/0008-*.md`. Carried here only
because the port reads them every phase:

- **Canonical source** is `original-projects/comic-chat/v2.5-beta-1-modern/` (tracked, line-identical to
  raw `v2.5-beta-1/`); all ADR citations are re-anchored to it. Pre-amendment v1.0-pre citations are wrong.
- **Scope removed by the later source:** `normHeight` is hardcoded `100` (avatar.cpp:64,110) — our
  common-height `shot.fill` is already faithful, do not add it; `RearrangeBalloons` is an empty stub
  (panel.cpp:959) — nothing to port; `BM_ACTION` captions unconditionally start a new panel
  (panel.cpp:1064) — faithful, and it retires the old "caption rides" divergence.
- **Scope added by the coverage audit:** the multi-balloon layout driver and overflow-split (Phase 2b).
- **Locked:** histeresis stubbed stable-by-insertion-order now, full with mobs; balloon placement by a
  seeded reproducible roll — we port the *algorithm*, not the pixels (font metrics differ, so a byte-match
  to the 1996 binary is unattainable).

---

## Next Actions (per `docs/DEVELOPMENT_PLAN.md`)

**In 5.5 ◐.** The core exit criterion (game completable) is MET; what remains is presentation polish
and verification. In rough priority:

00. **ADR 0008 — full faithful port of the layout stack against v2.5-beta-1. ✅ COMPLETE (Phases 0–3,
    v0.18.1–v0.18.5); kept here as the record of what was built and what it left stubbed.** Boundary preserved: camera ladder (SHOTS,
    semantic/ours) and ADR 0007 fixed-panel + reflowing pane + column-count-by-viewport stay; figure compositing
    (`figure.ts`/`composite.ts`/`pose.ts`) stays — already a verified port.
    - **Phase 0 — multi-body fixtures. ✅ DONE (v0.18.1).** `web/tools/cast-fixture.ts` packs 2–4 real `.avb`
      avatars in memory (`packFixtureCast`/`stubCast` canvas-free; `loadFixtureCast` decodes sheets);
      `web/test/bodies.test.ts` gates `layoutAvatars` at N=1..4; `npm run render:bodies` writes 30 N-body PNGs.
      Use these for every Phase 1–2b change — they are the only N≥3 coverage that exists.
    - **C++ navigation graph — BUILT.** Offline graph of the modern v2.5-beta-1 source lives at
      `reference/comic-chat-v2.5-beta-1-modern/graphify-out/` (`graph.json` 6.4 MB, `GRAPH_REPORT.md`, queryable;
      indexes `panel/balloon/avatar/…`). Use it to navigate the C++ call graph during Phases 1–2b:
      `graphify query "…" --graph reference/comic-chat-v2.5-beta-1-modern/graphify-out/graph.json` (also
      `path`/`explain`/`affected`). **Offline build command** (regenerate after edits): `graphify extract .
      --code-only --no-label` (AST-only, no LLM — plain `graphify .` errors on Bedrock via the semantic pass).
      **Gotchas for future sessions:** `reference/` is gitignored (`.gitignore:62`) and graphify merges
      `.gitignore` from the git root, so building *in-repo* finds 0 files — this graph was built in the modern
      copy and lives there, gitignored/local (AGENTS.md forbids committing raw-C++ graphs; the tracked
      `original-projects/comic-chat/v2.5-beta-1-modern/` is the durable, line-identical fallback source).
    - **Phase 1 — `LayoutAvatars` port. ✅ DONE (v0.18.2).** Equal-margin (`:807`)/shrink-to-fit (`:777`) kept;
      `IsSpeaker` gating added (`:822`, via `Body.requested`); the `normHeight` divergence retired as already
      faithful (`avatar.cpp:64,110` hardcode `100`); facing re-derived from adjacency (`OrderAvatars` `:424` /
      `EvalPair` `:279`) in `orderBodies`, replacing the geometric past-centre rule. **Still stubbed:** seating
      order (stable-by-insertion) and histeresis — `DoGreedyOrdering` `:403` needs the talk-to graph, so un-stub
      with the mob-dialogue slice. Production panels byte-identical; only N≥3 moved.
    - **Phase 2 — `page.ts` panelization. ✅ DONE (v0.18.3).** `AddLine:1058` whole (5-elem cap, `<2`-panel,
      `AvatarInPanel`→new, `BM_ACTION`→new panel, clone-append, overflow recursion + leftover re-add), with
      `AddReaction:1142`, `MakeBalloon:1036` (a `BM_*` bitmask), `FetchSpeaker`/`ReplaceBody`/`Clone`/
      `RemoveLastPanel`/`AddPanel`/`StartNewPanel`, and the `<Brk>`/`<Chr>` sentinels. Mapper now emits
      `TurnScript`; Director edits scripts and returns a `PanelDelta`; the ~30 oracle tests were re-derived and
      `page.test.ts` (20 rule tests) added. Only the opening turn's output moved — see Last Session.
    - **Phase 2b — multi-balloon layout. ✅ DONE (v0.18.4).** `balloon-layout.ts` (driver + corridors +
      force-fit split, seeded by a content hash) and `fit.ts` (the `FitTest`, wired into `createDirector`);
      `SplitHeight`/`measureAtWidth` added to `balloon.ts`; the vertical stack demoted to a draw-time
      fallback. `FitResult` gained `kept`. Two constants deliberately re-derived rather than transcribed —
      see Last Session before touching them.
    - **Phase 3 — pixel-parity gate. ✅ DONE (v0.18.5).** `tools/gate.ts` + `test/gate.test.ts` +
      `test/golden/panel-gate.json`: 16 cases (10 production panels of `01-west-of-house` at seed 1234,
      plus 3- and 4-participant scenes over the `.avb` fixture cast), each pinned as a PNG SHA-256 **and**
      the `PanelTrace` geometry behind it. Golden images are not committed (rationale in the ADR); actual
      PNGs are dumped on failure. `npm run gate` / `gate:accept`. All fixtures are staged through `page.ts`
      with the real fit test, so nothing pinned is a panel the product cannot produce. See Last Session for
      the one known fallback case.
    - **Out of scope → ADR 0006 slice:** mapper authoring of *when/what* a mob speaks (this port only makes the
      pane N-capable; a test injecting a mob line proves it).

0. **ADR 0007 fully built and verified (v0.17.10–v0.17.12).** §2 sizing, the citation backfill, and the three
   balloon enhancements are all done; the fixed-panel layout was in-browser checked, and the balloon changes
   were eyeballed via `render-panel.ts`. Nothing outstanding on ADR 0007. **Standing rule now in force:** new
   mechanical-layer code reads the C++ first and cites it. Two enhancement candidates were *considered and
   deferred* as larger/optional: a fuller permuted-spline outline (we ship a lighter `wavyEdge` ripple), and
   route-region multi-balloon collision (our panels are 1–2 balloons). Revisit only if a real need appears.

**New direction — `docs/adr/0006-dungeon-master-and-player.md` (Accepted, building).** Recasts the Guide
as a Dungeon Master and the Hero as his player, lets the Hero *speak*, and turns the two-shot into a real
exchange. Deliberately breaks ADR 0004 §2 (Hero thought-only) and ADR 0005 §4; keeps the three invariants
(presentation-only Guide, no engine internals, deterministic pure function → parity oracle). 5 slices.

- ✅ **Slice 1 (Hero speaks) — done, signed off for MVP (v0.17.5–v0.17.7).** Resolved-action balloon is
  speech; thought register retained for asides. Balloon layout reworked to Comic Chat's model (straddle +
  bottom tail + headroom, v0.17.7). Accepted as good enough for MVP; further layout-polish ideas deferred.
- ✅ **Slice 2 (DM↔Hero dialogue pairs) — done (v0.18.6).** `BEAT_SCRIPT` holds `{ dm?, hero? }` pairs,
  seven beats scripted, dialogue content pinned by a golden sequence. Rules and the one open finding
  (shot/reverse-shot instead of a two-shot) are in Last Session. No conversational memory — Slice 4 owns
  that.
- ✅ **Slice 3 (caption reframe + identity rewrite + relabel) — done (v0.18.7).** The character is
  **Dungeon Master** (user's call). See `WORKLOG.md` v0.18.7.
- ✅ **Slice 4 (bounded conversational memory) — done (v0.18.8).** Details in Last Session.
- **Slice 5 (session-recap PDF export) — the only ADR 0006 slice left.** Independent of 1–4 and
  schedulable whenever: §5 reframes the export as the record of a session at the table (read-aloud
  boxed text + the exchange in the margins). Zero engine/parity implications. Note the standing
  constraint from item 4 below: the PDF is deliberately **not** WYSIWYG.

1. **`SHOTS` framing table — further tuning (◐, first pass v0.16.3).** Authoring judgement sitting on
   top of the ADR (the ADR fixes which rung fires; these fill/reveal/backdrop numbers make each rung
   legible). `establishing`≈`wide` similarity is inherent to solo-Hero scenes and deliberately left.

2. **Engine stubs / uncovered idioms — ✅ tail closed (v0.17.3–v0.17.4).**
   - ✅ **`V-CLIMB-UP`** (last stub) and **`OTHER-SIDE`** (the `NEXTP` idiom) done in v0.17.3 — engine
     builtins over the structural exit model. See WORKLOG.
   - ✅ **`<NTH …>`** (I-CYCLOPS) and **String-in-statement** (GRATE-FUNCTION) lowered in v0.17.4 —
     extractor vocabulary, `ir/src/extract-behavior.ts`. Catalogued-complex now 26.
   - **Catalogued by design, no action** (not idiom gaps): **GOTO** (movement) and **PICK-ONE**
     (randomness) are Group A engine builtins; **V-SAY** stops on the parser's P-LEXV lex buffer — all
     three engine-owned per ADR 0002. Nothing pending; the catalog tail is fully triaged.

3. **Invisible-routine audit, re-run after ADR 0003.** 360/439 ROUTINE forms extracted, 28 catalogued,
   51 invisible. 45 correctly excluded by design (parser/clock/turn-loop the engine owns). Tail worth
   triage: `BREATHE`, `MIN`, `UNTIE-FROM`, `FIND-IN`, `NO-GO-TELL`, `YES?`. **Worth making this a
   standing report, not a one-off** — the catalog names the routine that failed but never what its
   failure cost, which is exactly why combat stayed hidden for two milestones.

4. **Panel grammar (ADR 0004, Accepted, amended twice at 5.3).** Amend the ADR, not the discussion doc.
   Still-open authoring judgement: page composition (§5), §4a breakpoints, PDF byte size, pane-scroll
   coupling. **User wants a recommendation at the point each is needed — lead with a pick, not a
   survey.** `layout.ts`/`cellFor` is where a print/PDF page policy would go, beside the on-screen one.
   PDF export is deliberately **not** WYSIWYG (once panel width is a viewport function, WYSIWYG would
   have to canonize one reader's window).

5. **Assisted input — designed, deferred to after the MVP.** SCUMM-style command picker (discussion
   §15). Two constraints when it comes up: **Zork's 135-verb list is a spoiler table** (`ECHO`,
   `ODYSSEUS`, `PRAY` *are* solutions), so a fixed core verb set with puzzle verbs typed-only; and it
   **structurally removes `parser-miss`** (12.7%, the largest affect marker), flattening the comic
   unless something replaces it. Needs an **ADR 0002 amendment** — a read-only query API
   (`objectsInScope()`, pull not push), leaving the event stream at 1.0.0. `engine/src/scope.ts`
   already computes the answer.

**Standing method note: measure before proposing rules.** Five plausible proposals died that way across
the panel-grammar sessions. The harness replay and the `art/` corpus answer questions cheaply, and a
measurement taken for one question often answers another.

---

## Open Issues

**Engine / IR** (durable cautions; the completed fixes behind them are in WORKLOG v1.6.x–v1.7.x)
- **Vehicle M-BEG dispatch fires on `<LOC WINNER>`, not `here()`** (`containerAction`, v0.15.6). ZIL's
  per-turn "room" hooks fire on the player's *container*, so any vehicle/enterable with an ACTION is a
  first-class turn participant.
- **Completion is harness-driven, not an engine correction** (v0.16.0). `12-full-game.cmd`'s fixed list
  is seed-1234-specific (thief thefts change which `put ... in case` lines land); `runFullGame`
  (`harness/complete.ts`) supplies combat/inventory resilience. **The engine was never tuned toward 350
  against the list.** Other seeds don't win — a property of the authored list, not the engine.
- **The engine's native score helper and ZIL's extracted routines must agree on the same globals**
  (v0.15.5). `addScore` advances `BASE-SCORE` in lockstep with `SCORE` because `LIVING-ROOM`'s M-END
  recomputes `SCORE = BASE-SCORE + OTVAL-FROB`. A native builtin that maintains only half of a
  derived quantity's inputs is silent corruption the moment an extracted routine reads the other half.
- **A dangling `,NAME` that is a room's ACTION routine resolves to that room** (`roomByActionRoutine`,
  v0.15.3) and **the exit-scan rewrite** (ADR 0003) are the extractor's two fail-closed non-mechanical
  transforms. Both are pattern matches against one ZIL idiom; **loosen only with a test pinning what
  they must still refuse** — widening to ambiguous names is how they'd start rewriting good references.
- **`Room.adjacent` is derived data** (ADR 0003) — safe only because `validate.ts` re-derives it from
  `exits`. It means *declared, not reachable* (shut doors are listed) and assumes a **static** exit
  graph, which holds for Zork I but would fail silently for a game that opens a passage at runtime.
- **ZIL property defaults live in the engine, not the IR** (`interpreter.ts`, `PROPDEF SIZE 5` etc.).
  **Do not "simplify" to a blanket 0 default** — breaks 10/11 walkthroughs (`truthy()` counts 0 as
  true; the `false` sentinel distinguishes absent from zero). A `propdefs` section is deferred, not
  rejected.
- **Extracting a routine can silently shadow an engine builtin** (routines win in `callRoutine`).
  `LIT?` did this in v0.8.0 and cost every dark-room turn until excluded by `ENGINE_IMPLEMENTED`.
  `DO-WALK`/`THIS-IS-IT` are currently both extracted *and* builtins and happen to agree — **re-check
  whenever the extraction frontier moves**; the failure is total, silent, and uncatalogued.
- **`state.parser` is outside the save contract** (orphan questions / "it" referent are mid-sentence
  scratch); `restore` clears them.
- **Pronoun with no referent diverges in one case:** West of House "READ IT" could resolve to the
  mailbox (its only object); we refuse in both one- and many-object rooms to match the many case.
  Recorded at the call site in `engine.ts`.
- **Multi-object lists unimplemented beyond `ALL`** — "TAKE LEAFLET AND MAILBOX" is kept as one turn
  but the second noun is dropped.
- **`game-over` may double-emit — unverified.** 22 events across 11 walkthroughs, two per walkthrough
  within one turn. Harmless to per-turn logic and the text-parity harness; would matter to a UI reacting
  to the event.
- **Randomized turns are verified by membership, not text parity.** The legal message set is derived
  from the IR (`combat.test.ts`, `membership.ts`); it must stay derived. **Membership is one-sided** —
  a narrower set never fails a passing line, so a broken derivation looks green; each membership suite
  also carries world-state assertions and a positive control of real reference output (v0.8.3).

**Project / M5**
- **`web/assets/comic/` is a committed build artifact.** Regenerate with `npm --prefix art run pack`
  (cast pinned in the script). **Re-pack after any `art/` decode change** — v0.13.1 fixed the decoder
  but the committed sheets stayed inverted until regenerated.
- **`art/` has no assertion that a rendered image *looks* like anything** beyond
  `art/test/polarity.test.ts` (which pins the pixel-code → colour mapping, not the art). The corpus
  sweep checks shape/bounds, which an inverted/mis-hued/mirrored figure satisfies — that is how an
  inversion reached a released build (v0.13.0). **Any new colour/polarity decision needs its own pinned
  assertion, and looking at the output stays part of the loop.** Art statistics are not invariants
  (anna's bob is a legitimate 80% ink).
- **Verify a regression test by reverting the fix**, not by watching it pass — done for the balloon
  tests. A test written *from* a known bug passes trivially on the fixed code.
- **Running `npx vitest` from the repo root times out `art/test/corpus.test.ts`** (its longer timeout
  lives in `art/vitest.config.ts`, unread by a root run). Use `npm --prefix <pkg> test`.
- **The type-only import line:** if `web/dist/art/src/` ever holds more than `format.js`, `pose.js` and
  `cast-manifest.js`, the decoder (`node:zlib`) has leaked into the browser program.
- **The face/torso join is implemented twice on purpose** — pixels in `art/src/composite.ts`, sheet
  sub-rects in `web/src/comic/figure.ts` — because merging drags the decoder into the browser.
  `web/test/figure.test.ts` runs both over the real cast pose-for-pose; do not weaken it.
- **Resize re-renders, never rescales**; the pose round-robin is frozen per panel (balloon breaks are a
  function of panel width, §4a). **Resume replays turns, it does not re-execute them** — `SaveState`
  stays the only source of world truth; if a future change makes `play()` mutate engine state, resume
  double-applies it.
- **The mapper is pure and canvas-free; `render.ts` holds all the numbers.** Mapper decides *what shot
  this is*; renderer decides what that looks like at the current width. That split is what lets 11
  walkthroughs replay through the mapping in Node. `SHOTS` is authoring judgement on top of the ADR.
- **`Turn` is not JSON-safe** — `EventMix.counts` is a `Map`, and `JSON.stringify` writes it as `{}`
  with no error. Persistence recomputes `mix` rather than storing it. General rule: **derived state
  must not be persisted; a `Map`/`Set` in a persisted type is silent data loss on reload.**
- Neutral branding for commercial assets (engine/IR/importer). Repo is prepared for public release but
  not yet public; nothing blocks it.

---

## Standing Notes

Hard-won rules that outlive any one session.

- **A total function with a wrong answer is the failure mode this codebase keeps producing.** The 5.3
  backdrop stub always returned *a* backdrop; `scrollIntoView` always scrolled; the corpus sweep always
  passed an inverted figure. **Assert the answer, never that an answer happened** — and *everything real
  found in the presentation work was found by looking at the running page*, not by tests. Keep Playwright
  in the loop.
- **P-WON gating is settled: do not implement it.** The transcripts contradict the source (v0.6.5);
  reasoning is at the call site, because the source reads the other way and the next reader will "fix"
  it back.
- **The shipped Release 119 story file is ground truth**, not the ZILF-reconstructed source in
  `original-projects/`. Where they disagree, the transcript wins. **Ask the reference build rather than
  reasoning about the ZIL:** `dfrotz -w 80 -s 1234 -p <story file>`. Several confident readings of the
  source turned out wrong.
- **"Cannot verify" and "fails to verify" are different states**, and the harness says which. Whole-file
  `# parity: informational` marks a limit of the method; per-turn `# informational: <reason>` …
  `# strict:` quarantines a passage. Quarantined turns stay in both numerator and denominator, and every
  opt-out carries a written reason — both enforced by test.
- **A cascade has one cause.** A missing routine or unreachable room becomes a dozen failing turns; find
  the first diverging turn before reading any later one.
- **`setFlag`/`move` on an unknown id silently invents a phantom entity** — a test can pass against an
  object that does not exist. Check ids against the world document.
- **The exit criterion bounds the constraint.** "Opening area playable" needed 13 rooms, not 110;
  backdrop scarcity was mis-scoped as 5.4's before anyone counted.

---

## Key Paths
| Path | Purpose |
|---|---|
| `importer/` | ZIL parser, tests, AST artifacts |
| `ir/` | IR schema, validator, extraction → `artifacts/zork1.world.json` |
| `engine/` | **Engine core (M4).** Zero-dep TS; `src/events.ts` is the ADR 0002 contract as code. `npm test` runs against the real Zork I world |
| `engine/harness/` | Transcript replay: `replay.ts` (parity oracle), `golden.ts` (normalizer + parity directives), `complete.ts` (`runFullGame`) |
| `verification/` | `walkthroughs/*.cmd` + `golden/*.txt`; `run-transcripts.sh` captures goldens from dfrotz |
| `web/` | **Browser shell (5.2+).** `npm --prefix web run dev` → localhost:8080. `src/session.ts` is DOM-free; `src/comic/` is the renderer + Narrative Director. No bundler, by decision — see `web/README.md` |
| `web/gallery.html` + `gallery.js` | Dev harness: every camera preset over one constant panel, for framing screenshots |
| `web/tools/cast-fixture.ts` | **ADR 0008 Phase 0.** Packs 2–4 real `.avb` avatars in memory — the only source of N≥3 bodies. Feeds `test/bodies.test.ts` and `npm run render:bodies` |
| `art/` | Comic Chat art tooling (decode, pose, pack) |
| `docs/AVB_FORMAT.md` | **Normative** `.avb` format spec + the five silent-failure gotchas. Read before touching `art/` |
| `docs/adr/` | ADRs: 0001–0005 (0005 = Narrative Director) |
| `docs/backdrop-generation-plan.md` | 30-backdrop generation plan (IDs, prompts, room→backdrop map) |
| `original-projects/zork1/`, `original-projects/comic-chat/` | ZIL and Comic Chat source references |
| `reference/` | Third-party reference material. **Gitignored** in full; local-only, may be absent from a fresh checkout. Z-Machine Standards 1.1 (normative for M4 builtins), Comic Chat SIGGRAPH '96 paper, ZILF/ZLR sources |
| `wiki/` | Semantic notes (hand-authored): `the-hero.md`, `the-guide.md`, etc. |
| `<module>/graphify-out/` | Graphify graphs (config: `.graphifyignore`) |
| `WORKLOG.md` | Persistent history — one entry per version, never edited |
| `AGENTS.md` | Agent workflow rules |
