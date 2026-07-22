# HANDOFF.md

Cross-session context. Read at session start, update at session end.

**Scope rule:** this file holds only what the *next* session needs — current state, what to do
next, and decisions that are still live. Completed session narrative belongs in `WORKLOG.md`
and must not be duplicated here. At session end, replace Last Session, revise Next Actions, and
append to Open Issues; do not accumulate a "Prior Session" stack.

---

## Current Version
**0.17.5**

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
  (v0.15.0). ADR 0004 (panel grammar) Accepted; ADR 0005 (Narrative Director) implemented (v0.17.0).
  - **5.5 ◐ — core exit criterion MET (v0.16.0): THE GAME IS COMPLETABLE.** Engine wins Zork I
    **350/350**, ends in `STONE-BARROW`, `game-over{victory}`, 0 crashes/deaths, pinned by
    `engine/test/completion.test.ts` (seed 1234). Path built across v0.15.2–v0.16.0 (native routines →
    exorcism IR fix → room `M-END` → magic boat → resilient completion harness); see WORKLOG.
    **In-browser visual verification done; the comic-pane issue list is cleared (v0.17.2).** Remaining
    5.5 work is authoring-judgement polish — see Next Actions.

**Test counts:** 113 web, 139 engine, 198 IR, parity 143/143 strict.

---

## Last Session — ADR 0006 Slice 1: the Hero speaks (v0.17.5)

First build under ADR 0006 (Guide-as-DM, Hero-as-player). The Hero's resolved-action balloon moved from
**thought → speech** (`heroBalloon` now returns `CBWoodringNormal`): he addresses the DM across the table
instead of captioning his life. The **thought register is retained** for interior asides (type + renderer
stay live; aside *content* is a later slice), so balloon class is now **per line, not per channel**. Details
in WORKLOG v0.17.5.

- **One-token behavioural change** in `web/src/comic/mapper.ts` (`heroBalloon`); take/drop templates and
  ADR 0005 §1 name-resolution unchanged. Doc/contract updates: `Balloon.balloonClass` no longer "fixed per
  channel" (`mapper.ts` + `balloon.ts` header).
- **No render change** — `drawBalloon`/`render.ts` were already class-driven and already aim `panel.hero`'s
  tail at the Hero's head, so a hero speech balloon reuses the Guide's `roundedSpeech` path. `CBWoodringThink`
  stays exercised by `balloon.test.ts`.
- **Presentation-only, zero engine/IR/parity impact** (ADR 0002 untouched, `replayPanels` still applies).
  The old `never emits a speech balloon for the Hero` test was **inverted**. **113 web tests green, tsc clean.**
  Engine/IR/parity not re-run — no code changed in those packages.
- **Close-up tail bug fixed + validated headless.** The speech tail crossed the Hero's face on close-ups.
  Two causes: (1) the tail aimed at the head's *centre* (`faceX`), so a balloon *beside* the head drove
  across the face — fixed by aiming at the nearest point on the head silhouette (`headEdgeTip`, `render.ts`:
  crown when above, temple when beside); (2) `roundedSpeech` floored the tip 22px below the box, overshooting
  the crown into the face on a close-up — reduced to a 2px min exit (`balloon.ts`). **Verified in PNGs across
  balloon-above / balloon-beside / Guide two-shot.** The crown anchor now serves only thought bubbles.
- **New: `web/tools/render-panel.ts` PNG harness** (`npm run render:panel`), on `@napi-rs/canvas`. Renders
  real panels through `renderPanel` headless — the way to eyeball balloon/tail/placement without launching
  the app (the `web/` suite has no canvas). Use it to sanity-check every future comic-geometry change.
- **Open: side-balloon tail should emanate from the balloon's *side*, not its bottom.** After the head-edge
  fix, a Hero balloon *beside* the head still roots its tail on the **bottom edge** of the bubble (like an
  above-head balloon), so a sideways tail exits downward and then cuts back to the temple — it reads wrong.
  A balloon to the side of its speaker should sprout the tail from the **side boundary** facing the head
  (left/right edge), the way Tiki's above-head balloon correctly sprouts from its bottom. Fix next session
  in `roundedSpeech` (`web/src/comic/balloon.ts`): choose the tail's root **edge** from the tip's direction
  relative to the box (below → bottom edge, as now; left/right → that side edge), and place the two root
  points along that edge. `headEdgeTip` (`render.ts`) already gives the correct tip; only the *root* is
  wrong. Reproduce with the harness's `-tallcap` variant (`npm run render:panel 01-west-of-house.cmd`).
- **Not yet done:** the ADR 0006 Consequences wiki rewrite (deferred with aside content — `the-hero.md`
  already defers the class to the ADRs).

---

## Next Actions (per `docs/DEVELOPMENT_PLAN.md`)

**In 5.5 ◐.** The core exit criterion (game completable) is MET; what remains is presentation polish
and verification. In rough priority:

**New direction — `docs/adr/0006-dungeon-master-and-player.md` (Accepted, building).** Recasts the Guide
as a Dungeon Master and the Hero as his player, lets the Hero *speak*, and turns the two-shot into a real
exchange. Deliberately breaks ADR 0004 §2 (Hero thought-only) and ADR 0005 §4; keeps the three invariants
(presentation-only Guide, no engine internals, deterministic pure function → parity oracle). 5 slices.

- ✅ **Slice 1 (Hero speaks) — done v0.17.5.** Resolved-action balloon is now speech; thought register
  retained for asides. Presentation-only, 113 web tests green. **Wants in-browser visual sign-off** of the
  hero speech balloon before slice 2 leans on it (render path is Guide-proven, but not yet eyeballed).
- **Slice 2 (DM↔Hero dialogue pairs) — primary next build.** Beat-keyed line pairs (DM line ↔ Hero line),
  *without* conversational memory (that's slice 4). Golden panel-sequences extend to **assert dialogue
  content**, not just count/shape. The `beatScript` mechanism (marker → Guide line) already exists in
  `mapper.ts`; slice 2 pairs it with a keyed Hero line and renders both figures in the exchange.
- Slice 3 (caption-as-read-aloud reframe + identity/wiki rewrite + relabel), Slice 4 (bounded stream-derived
  conversational memory — the hardest-gated risk surface), Slice 5 (session-recap PDF export, independent).

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
