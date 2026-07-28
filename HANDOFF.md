# HANDOFF.md

Cross-session context. Read at session start, update at session end.

**Scope rule:** this file holds only what the *next* session needs — current state, what to do
next, and decisions that are still live. Completed session narrative belongs in `WORKLOG.md`
and must not be duplicated here. At session end, replace Last Session, revise Next Actions, and
append to Open Issues; do not accumulate a "Prior Session" stack.

---

## Current Version
**0.18.12**

**Development platform: macOS only** (user's decision, 2026-07-28). See Open Issues → the pixel gate.

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
- **M5 ✅ (closed 2026-07-28)** Comic Chat presentation, 5.1–5.5 all met their exit criteria.
  Art pipeline (`art/`), browser shell (`web/`), comic renderer (⚑ Gate D cleared), backdrops/
  persistence/sequencing/portraits, and the full-game pass. **5.5's criterion — the game is
  completable in the browser — was met at v0.16.0:** engine wins Zork I **350/350**, ends in
  `STONE-BARROW`, `game-over{victory}`, 0 crashes/deaths, pinned by `engine/test/completion.test.ts`
  (seed 1234); in-browser visual verification done and the comic-pane issue list cleared (v0.17.2).
  ADRs: 0004 Accepted, 0005 implemented (v0.17.0), 0006 Slices 1–4 done (Slice 5 open), 0007 fully
  built (v0.17.10–12), 0008 **complete** (Phases 0–3, v0.18.1–v0.18.5 — a cited port of the layout
  stack with a pixel gate, against **v2.5-beta-1 (modern variant)**).
  **The presentation polish formerly tracked here is now `docs/FUTURE_WORK.md` §2** — unscheduled by
  design, drawn from by M6.1.
- **M6 ◐ — the road to 1.0.0**, iteration I1 drafted from the user's first three items: **6.1 the
  comic pane becomes a cartoon** (the headline item), 6.2 save/load/restart, 6.3 landing page,
  6.4 asset separation & neutral branding, 6.5 public release → tag `1.0.0`. All ☐. The list is
  **open** — more items land as I1 proceeds. See `docs/DEVELOPMENT_PLAN.md` M6 and
  `docs/FUTURE_WORK.md` §1.

**Test counts:** 255 web, 139 engine, 198 IR, parity 143/143 strict.

---

## Last Session — M6 drafted, then decided (v0.18.10–v0.18.12)

Documentation-only, three doc versions. No code changed; 255 web / 139 engine / 198 IR, parity
143/143 strict. Full narrative in `WORKLOG.md` v0.18.10–v0.18.12.

- **v0.18.10 moved the non-critical backlog out** to the new `docs/FUTURE_WORK.md`, closed M5 on its
  written exit criterion, and turned M6 from "stages to be defined" into real stages.
- **v0.18.11 drafted M6 from the user's first three items** — landing page, save/load/restart, and
  the cartoon — and diagnosed the third. **Read `docs/DEVELOPMENT_PLAN.md` §6.1 before touching the
  pane:** four decisions compound to keep the DM and Hero from conversing (the `action ?? reply`
  exclusion, cooldown 3 shared with the gazetteer, 7 scripted markers with `parser-miss` excluded,
  and the three-balloon split). Measured: **~5.8% of turns carry a spoken beat.**
- **Direction decided by the user, and it supersedes this session's own recommendation.** The
  top-left box becomes the **location name** (panel metadata drawn from `context.room`, never a
  script line) and **the DM speaks the room description**. Note the premise that was wrong in the
  asking: that box is *not* the location name today — `captionFor` puts the first sentence of
  narration there and drops it past 180 chars; the room name is only in the status bar. Taking the
  box out of the line stream is what fixes the split, because a `BM_ACTION` caption
  **unconditionally starts a new panel** (`panel.cpp:1064`) and one fires on 96.7% of turns.
  → **ADR 0009**, slice 6.1b.
- **v0.18.12: the user answered every open question.** D1–D5 in the plan's §6.1 decision table, plus
  three named save slots (browser storage only) and a small static site (landing, about, public
  changelog) rather than one page. **D1 governs: the goal outranks the mechanism, and a large
  authored dialogue corpus is an accepted cost.**
- **"Pre-generated" means authored at build time and committed as data** — the mapper stays a
  deterministic pure function because it is the parity oracle. A runtime model call is out of scope
  for 1.0.0 (non-deterministic, breaks the oracle, needs a paid API there is no budget for).
- **Start at 6.1a, not at the fix.** The authored tables are stuck in DOM-coupled `comic-view.ts`,
  so the density cannot be measured until they move — and D5's every-2–3-turns target is meaningless
  until that baseline exists.

---

## The pixel gate (ADR 0008 Phase 3) — operating notes

Durable, not session narrative: every mechanical-layer change is measured against this.

- **The golden is macOS-rendered and the gate is a macOS gate** (decided 2026-07-28). The hash half
  goes through the host font stack; the geometry half does not. **Never `gate:accept` off macOS.**
  Full reasoning in Open Issues → Project / M5 and `web/README.md`.
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

## Next Actions (per `docs/DEVELOPMENT_PLAN.md`)

**M5 is closed. We are in M6 — the road to 1.0.0.** 5.5 met its written exit criterion (game
completable in the browser) and was marked ☑ on 2026-07-28; ADRs 0004, 0005, 0007 and 0008 are all
fully built. The presentation polish that used to sit in this section is **not lost** — it moved to
`docs/FUTURE_WORK.md` §2 with its reasons, and is the menu the improvement iterations draw from.

**Live work — this is the whole list:**

1. **ADR 0006 Slice 5 (session-recap PDF export)** — the only open ADR slice. Independent of Slices
   1–4 and schedulable whenever: §5 reframes the export as the record of a session at the table
   (read-aloud boxed text + the exchange in the margins). Zero engine/parity implications.
   **Standing constraint: the PDF is deliberately *not* WYSIWYG** — once panel width is a viewport
   function, WYSIWYG would have to canonize one reader's window. `layout.ts`/`cellFor` is where a
   print/PDF page policy goes, beside the on-screen one.

2. **M6.1 — the comic pane becomes a cartoon. ☐ The most important item in M6 (user's weighting).**
   The DM and the Hero must converse in most scenes, in the same panel. **The machinery exists and
   the experience does not** — four limiters compound, the full diagnosis and the six slices
   (6.1a measure → 6.1f verify) are in `docs/DEVELOPMENT_PLAN.md` §6.1. **Start at 6.1a**: the
   authored tables are trapped in DOM-coupled `comic-view.ts`, so the density nobody has measured
   cannot be measured until they move. **Direction and five decisions (D1–D5) are settled** — see the
   plan's decision table; 6.1b now *records* them as **ADR 0009** rather than asking. Target density:
   **an exchange every 2–3 turns**, ~15–25× today's ~5.8%.

3. **M6.2 — save / load / restart on the gameplay screen.** ☐ UI over the engine's existing save
   contract, not new engine work. **Decided: three named slots, browser storage only, no downloadable
   save file.** Independent — good filler for an idle session. Two live hazards in Open Issues:
   `Turn` is not JSON-safe, and resume replays rather than re-executes; a restart must also clear the
   pose cycles and the Director's beat counters.

4. **M6.3 — the static site.** ☐ **Decided: separate static pages, not routes in the game app** —
   landing/home, about, and a public changelog (recommend generating it from `CHANGELOG.md` rather
   than maintaining a second one). **Blocked on the user's `DESIGN.md` + mockups** (promised, not yet
   supplied), which also govern restyling the gameplay screen.

5. **M6.4 asset separation & neutral branding** (☐, independent) and **M6.5 public release** (☐ —
   repo public + website ships → tag `1.0.0`).

**The M6 list is open.** The user supplied 6.1–6.3 as starters and will add more once work begins;
absence from the table is not a decision that something is out of scope. **6.1 does not end when the
list is done — it ends when the user says the product is ready.**

**ADR status, one line each:** 0004 Accepted (amended twice; open §5/§4a authoring judgement →
FUTURE_WORK §2.1) · 0005 implemented (v0.17.0) · 0006 Slices 1–4 done (v0.17.5–v0.18.8), Slice 5
open · 0007 fully built and verified (v0.17.10–12), nothing outstanding · 0008 Accepted and
**complete** (Phases 0–3, v0.18.1–v0.18.5); what it left stubbed was scoped out on purpose and is in
FUTURE_WORK §2.2.

**Standing rule from ADR 0007, still in force:** new mechanical-layer code reads the C++ first and
cites it. The offline navigation graph is at
`reference/comic-chat-v2.5-beta-1-modern/graphify-out/` (gitignored, local-only; rebuild with
`graphify extract . --code-only --no-label` *inside the modern copy* — building in-repo finds 0
files because `reference/` is gitignored and graphify merges the root `.gitignore`). The tracked,
line-identical fallback source is `original-projects/comic-chat/v2.5-beta-1-modern/`.

**Standing method note: measure before proposing rules.** Five plausible proposals died that way
across the panel-grammar sessions. The harness replay and the `art/` corpus answer questions
cheaply, and a measurement taken for one question often answers another.

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
- **The pixel gate is macOS-only, by decision (2026-07-28).** `gate.test.ts` pins each case as a PNG
  SHA-256 **and** its `PanelTrace` geometry; `@napi-rs/canvas` rasterizes text through the host font
  stack, so the geometry half is portable and **the hash half is not**. On Windows all 17 cases fail
  on `— pixels` with every geometry assertion green — that shape (geometry green, pixels red,
  *every* case) is the signature of a platform difference, not a regression. The user develops on
  macOS only, so the golden stays macOS-rendered rather than growing a platform key or a
  geometry-only mode. **`gate:accept` on a non-macOS host silently re-pins the golden to that host
  and breaks the gate everywhere it used to pass** — the trap this note exists to prevent. Revisit
  only if the project gains a second machine or CI.
- **A URL path is not a filesystem path** (`serve.ts`, v0.18.9). `path.normalize` is platform-native,
  so normalizing before matching a mount made `/world/...` unmatchable on Windows and 404'd the world
  document. Routing decisions belong in URL space; `path.*` applies only afterward. The bug was
  invisible on macOS because there the two spaces look identical — **the general hazard is any
  POSIX-only assumption baked into tooling, which only a non-macOS run would surface, and there will
  not be one.**
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
- **Neutral branding + asset separation for engine/IR/importer is M6.2**, and the repo going public is
  **M6.3** — both now stages with exit criteria in `docs/DEVELOPMENT_PLAN.md` rather than a loose note.
  The repo is *prepared* for public release; what is not prepared is the website, the other half of
  the 1.0.0 criterion.

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
| `docs/adr/` | ADRs 0001–0008. 0005 = Narrative Director, 0006 = DM & player (Slice 5 open), 0007 = comic-pane port boundary, 0008 = full mechanical port (complete) |
| `docs/FUTURE_WORK.md` | **The non-critical backlog** + the pre-1.0.0 improvement-iteration protocol. Nothing in it blocks release; nothing in it is scheduled until the user defines an iteration |
| `docs/backdrop-generation-plan.md` | 30-backdrop generation plan (IDs, prompts, room→backdrop map) |
| `original-projects/zork1/`, `original-projects/comic-chat/` | ZIL and Comic Chat source references |
| `reference/` | Third-party reference material. **Gitignored** in full; local-only, may be absent from a fresh checkout. Z-Machine Standards 1.1 (normative for M4 builtins), Comic Chat SIGGRAPH '96 paper, ZILF/ZLR sources |
| `wiki/` | Semantic notes (hand-authored): `the-hero.md`, `the-guide.md`, etc. |
| `<module>/graphify-out/` | Graphify graphs (config: `.graphifyignore`) |
| `WORKLOG.md` | Persistent history — one entry per version, never edited |
| `AGENTS.md` | Agent workflow rules |
