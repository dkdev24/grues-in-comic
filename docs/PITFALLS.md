# PITFALLS.md

Hard-won cautions, kept out of `HANDOFF.md` because they are not session state — they are things that
must be true whenever the relevant subsystem is touched, and most sessions touch one.

**Read the section for what you are about to change, before you change it.** Do not read the whole
file at session start; that is what made `HANDOFF.md` expensive. Every entry here was paid for by a
bug, a wasted session, or a released build that was wrong.

**Add to this file rather than to `HANDOFF.md`** when a session produces a rule that will still be
true a year from now. `HANDOFF.md` holds what the *next* session needs; this holds what *any* session
touching that code needs. Session narrative goes to `WORKLOG.md`.

| Section | Read before touching |
|---|---|
| [Engine / IR](#engine--ir) | `engine/`, `ir/`, the extractor, the parity harness |
| [Web & the comic pane](#web--the-comic-pane) | `web/`, the mapper, the renderer, persistence |
| [Art pipeline](#art-pipeline) | `art/`, the cast, anything that draws |
| [Tooling & platform](#tooling--platform) | test runners, the dev server, the gate, any path handling |
| [The pixel gate](#the-pixel-gate-adr-0008-phase-3) | any mechanical-layer change |
| [The port (ADR 0008)](#still-live-decisions-adr-0008-re-scope-2026-07-24) | any new mechanical-layer code |
| [Method](#method) | always applicable; short |

---

## Engine / IR

*The completed fixes behind these are in `WORKLOG.md` v1.6.x–v1.7.x.*

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

## Web & the comic pane

- **The mapper is pure and canvas-free; `render.ts` holds all the numbers.** Mapper decides *what shot
  this is*; renderer decides what that looks like at the current width. That split is what lets 11
  walkthroughs replay through the mapping in Node. `SHOTS` is authoring judgement on top of the ADR.
- **The caption channel is retired, and three things now depend on the panel not breaking**
  (ADR 0009, M6.1c). Nothing emits `BM_ACTION` on an ordinary turn any more, so the panel breaks
  the port used to give for free must be asked for explicitly, with `<Brk>`: **a room change** (or a
  new location clone-appends into the last room's panel and `clonePanel` relabels it — one panel,
  two places) and **a death** (or the next turn absorbs the reaction frame; that one silently
  deleted the `reaction` rung from the whole corpus — 11 turns, 0 panels — while every rule test
  stayed green). If you remove a `<Brk>`, re-run `npm --prefix web run density` **and** look at the
  camera census: a rung going to zero is what this looks like.
- **`roomTitle` is the one panel field that does not take the incoming context** (`clonePanel`).
  The location box is metadata about *where the panel is*, not about its newest balloon, so a later
  same-room turn appending into it must not erase it.
- **Two of the DM's balloons can never share a panel** (`AvatarInPanel`, `panel.cpp:1088`), which
  is what makes a long description into a panel run — and also means **an extra DM line costs a
  panel**. The Hero is staged through that run with `<Chr>`; without it he is absent from every
  panel but the last, and the comic cuts away from its own subject.
- **The authored dialogue lives in `web/src/comic/script.ts` and nothing there may touch the DOM.**
  It sat in `comic-view.ts` until M6.1a, which made the one number the stage turns on unmeasurable:
  the view cannot be replayed in Node, so the corpus tools had to invent throwaway scripts and the
  shipped tables were never measured. Content goes in that module; the trigger, the cooldown and the
  run cursor stay in `mapper.ts`. **After editing either, run `npm --prefix web run density`** — the
  numbers are *meant* to move over M6.1, but only deliberately (`density:accept`), like the pixel gate.
- **Dialogue is authored at build time and committed as data, never generated at runtime.** The
  mapper is the parity oracle, so it must stay deterministic; a model call while the game runs would
  break that, and there is no budget for a paid API. This holds however large the authored corpus
  gets (M6.1 D1 explicitly sanctions a large one).
- **`Turn` is not JSON-safe** — `EventMix.counts` is a `Map`, and `JSON.stringify` writes it as `{}`
  with no error. Persistence recomputes `mix` rather than storing it. General rule: **derived state
  must not be persisted; a `Map`/`Set` in a persisted type is silent data loss on reload.**
- **Resize re-renders, never rescales**; the pose round-robin is frozen per panel (balloon breaks are a
  function of panel width, §4a). **Resume replays turns, it does not re-execute them** — `SaveState`
  stays the only source of world truth; if a future change makes `play()` mutate engine state, resume
  double-applies it.
- **The face/torso join is implemented twice on purpose** — pixels in `art/src/composite.ts`, sheet
  sub-rects in `web/src/comic/figure.ts` — because merging drags the decoder into the browser.
  `web/test/figure.test.ts` runs both over the real cast pose-for-pose; do not weaken it.
- **The type-only import line:** if `web/dist/art/src/` ever holds more than `format.js`, `pose.js` and
  `cast-manifest.js`, the decoder (`node:zlib`) has leaked into the browser program.
- **A URL path is not a filesystem path** (`serve.ts`, v0.18.9). `path.normalize` is platform-native,
  so normalizing before matching a mount made `/world/...` unmatchable on Windows and 404'd the world
  document. Routing decisions belong in URL space; `path.*` applies only afterward. **The general
  hazard is any POSIX-only assumption baked into tooling** — invisible on macOS, and no non-macOS run
  is coming to surface it.

## Art pipeline

- **`art/` has no assertion that a rendered image *looks* like anything** beyond
  `art/test/polarity.test.ts` (which pins the pixel-code → colour mapping, not the art). The corpus
  sweep checks shape/bounds, which an inverted/mis-hued/mirrored figure satisfies — that is how an
  inversion reached a released build (v0.13.0). **Any new colour/polarity decision needs its own pinned
  assertion, and looking at the output stays part of the loop.** Art statistics are not invariants
  (anna's bob is a legitimate 80% ink).
- **`web/assets/comic/` is a committed build artifact.** Regenerate with `npm --prefix art run pack`
  (cast pinned in the script). **Re-pack after any `art/` decode change** — v0.13.1 fixed the decoder
  but the committed sheets stayed inverted until regenerated.
- **`docs/AVB_FORMAT.md` is normative** and lists five silent-failure gotchas. Read it before touching
  the decoder.

## Tooling & platform

- **macOS is the only supported development machine** (2026-07-28). The engine, IR and importer stay
  platform-independent; the tooling is not held to that bar. Fix a platform bug when a real run hits
  one — do not spend effort on speculation.
- **The pixel gate is macOS-only, by decision.** `@napi-rs/canvas` rasterizes text through the host
  font stack, so the geometry half of the golden is portable and **the hash half is not**. On Windows
  all 17 cases fail on `— pixels` with every geometry assertion green — geometry green, pixels red,
  *every* case is the signature of a platform difference, not a regression. **`gate:accept` on a
  non-macOS host silently re-pins the golden to that host and breaks the gate everywhere it used to
  pass.** Revisit only if the project gains a second machine or CI.
- **Running `npx vitest` from the repo root times out `art/test/corpus.test.ts`** (its longer timeout
  lives in `art/vitest.config.ts`, unread by a root run). Use `npm --prefix <pkg> test`.

---

## The pixel gate (ADR 0008 Phase 3) — operating notes

Durable, not session narrative: every mechanical-layer change is measured against this.

- **The golden is macOS-rendered and the gate is a macOS gate** (decided 2026-07-28). The hash half
  goes through the host font stack; the geometry half does not. **Never `gate:accept` off macOS.**
  Full reasoning under Tooling & platform above, and in `web/README.md`.
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

The fixture set is **17 cases** — the exchange added at Slice 2 re-indexed walkthrough 01 (10 panels
→ 11), which the gate reported case by case before the golden was re-accepted.

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

## Method

- **Verify a regression test by reverting the fix**, not by watching it pass. A test written *from* a
  known bug passes trivially on the fixed code.

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
