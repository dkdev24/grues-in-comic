# HANDOFF.md

Cross-session context. Read at session start, update at session end.

**Scope rule:** this file holds only what the *next* session needs — current state, what to do
next, and decisions that are still live. Completed session narrative belongs in `WORKLOG.md`
and must not be duplicated here. At session end, replace Last Session, revise Next Actions, and
append to Open Issues; do not accumulate a "Prior Session" stack.

---

## Current Version
**0.18.0**

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
  ADR 0006 (DM & player) Slice 1 done (v0.17.7); ADR 0007 (comic-pane port boundary + fixed panels)
  fully built (v0.17.10–12); **ADR 0008 (full mechanical port + multi-participant) Accepted — building.
  Re-scoped 2026-07-24 to a full faithful port vs **v2.5-beta-1 (modern variant)** (was v1.0-pre; the comic
  pane is now a multi-party GM+NPC comic, not solo-Hero). Source: `original-projects/comic-chat/v2.5-beta-1-modern/`
  (tracked; line-identical to raw `v2.5-beta-1/`), navigated via the offline C++ graph at
  `reference/comic-chat-v2.5-beta-1-modern/graphify-out/`. Seam + N-body layout landed v0.18.0; Phases 1–3
  (LayoutAvatars, page.ts panelization, multi-balloon layout, pixel gate) not started — see Next Actions 00.**
  - **5.5 ◐ — core exit criterion MET (v0.16.0): THE GAME IS COMPLETABLE.** Engine wins Zork I
    **350/350**, ends in `STONE-BARROW`, `game-over{victory}`, 0 crashes/deaths, pinned by
    `engine/test/completion.test.ts` (seed 1234). Path built across v0.15.2–v0.16.0 (native routines →
    exorcism IR fix → room `M-END` → magic boat → resilient completion harness); see WORKLOG.
    **In-browser visual verification done; the comic-pane issue list is cleared (v0.17.2).** Remaining
    5.5 work is authoring-judgement polish — see Next Actions.

**Test counts:** 124 web, 139 engine, 198 IR, parity 143/143 strict.

---

## Last Session — ADR 0008 re-scoped: full faithful port, un-deferred (docs only, no code)

**No code changed this session; `docs/adr/0008-*.md` was amended (uncommitted).** User rejected the incremental
refactor path: v0.18.0 was a *structural refactor* of figure placement, not the "complete rewrite" the prior
handoff claimed — proven pixel-identical in solo-Hero panels (N=1 `layoutAvatars` collapses to the old solo
branch), so it was always going to look the same in normal play. Decision: **stop refactoring, do a faithful
port** — and, crucially, **the comic pane is no longer a solo-Hero adventure**: it becomes a true multi-party
comic (GM = former Guide + NPCs = mobs). That makes Comic Chat's multi-speaker machinery the *target*, not a
mismatch, and it flips every earlier "defer until mobs" call to "build now."

**Canonical source re-pinned to the modern v2.5-beta-1 variant** — tracked at
`original-projects/comic-chat/v2.5-beta-1-modern/`, navigated via the offline C++ graph at
`reference/comic-chat-v2.5-beta-1-modern/graphify-out/` (was v1.0-pre; all prior ADR citations were from the
wrong tree and are re-anchored in the amendment's table; modern is line-identical to raw `v2.5-beta-1/`). Three findings from the later
source *remove* scope: **`normHeight` is hardcoded `100`** (avatar.cpp:64,110) → common-height `shot.fill` is
already faithful, don't add it; **`RearrangeBalloons` is an empty stub** (panel.cpp:959) → nothing to port;
**`BM_ACTION` captions unconditionally start a new panel** (panel.cpp:1064) → faithful rule, retires the old
"caption rides" divergence.

**A full-pipeline coverage audit was run** (panel.cpp/balloon.cpp/avatar.cpp + headers, table in ADR amendment)
so the port has no silent gaps. It found **two real gaps** hidden by the old "1–2 balloons per panel" assumption
that multi-party kills: (1) the **multi-balloon layout driver** `LayoutBalloons`/`GetCloudEstimate`/`LayoutBalloon`
+ collision (`GetInterveningBBox`, `AdjustRouteRgns`) — we currently vertical-stack; (2) **overflow-split**
`ForceFitBalloon`/`SplitHeight` — absent, but `AddLine`'s overflow recursion needs it. Both fold into this port.

**Decisions locked this session:** histeresis (`OrderAvatars`/`UpdateHistoresis`) stubbed stable-by-insertion-order
now, full with mobs; adopt faithful `BM_ACTION`→new-panel; multi-balloon layout folded into this port (Phase 2b);
balloon placement uses a **seeded reproducible roll** (organic Comic-Chat scatter, still deterministic via a
per-panel deterministic seed — NOT the old deterministic-midpoint; byte-match to the 1996 binary is unattainable
since our font metrics differ, so we port the *algorithm*, not the pixels).

---

## Next Actions (per `docs/DEVELOPMENT_PLAN.md`)

**In 5.5 ◐.** The core exit criterion (game completable) is MET; what remains is presentation polish
and verification. In rough priority:

00. **ADR 0008 — full faithful port of the layout stack against v2.5-beta-1. Build plan (all folded into one
    port, no longer deferred). START HERE next session at Phase 0.** Boundary preserved: camera ladder (SHOTS,
    semantic/ours) and ADR 0007 fixed-panel + reflowing pane + column-count-by-viewport stay; figure compositing
    (`figure.ts`/`composite.ts`/`pose.ts`) stays — already a verified port.
    - **Phase 0 — multi-body fixtures.** Load 2–4 real `.avb` avatars via `art/` into a `Cast` so Phases 1–2b
      verify with N bodies now, decoupled from mob authoring. (Likely first task of next session.)
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
    - **Phase 1 — `LayoutAvatars` port** (`render.ts`, `panel.cpp:726`): keep equal-margin (`:807`)/shrink-to-fit
      (`:777`); add `IsSpeaker` gating (`:822`); DELETE `normHeight` (faithful common-height = `shot.fill`); STUB
      stable slots by insertion-order (full `OrderAvatars`/`UpdateHistoresis` `:753,818` with mobs); verify our
      `mirror`-past-centre vs where C++ sets `m_flip`. Gate: N-body PNGs.
    - **Phase 2 — `page.ts` panelization** (`AddLine`, `panel.cpp:1058`): 5-elem cap, `<2`-panel, `AvatarInPanel`
      →new, **`BM_ACTION`→new panel** (faithful), clone-append, overflow recursion; `AddReaction:1142`,
      `MakeBalloon:1036` taxonomy. Mapper → line stream `{avatarId,text,mode,emotion}`; re-derive ~30 oracle tests.
    - **Phase 2b — multi-balloon layout** (the audit gap): port `LayoutBalloons:855`/`GetCloudEstimate:885`/
      `LayoutBalloon:925` + `GetInterveningBBox`/`AdjustRouteRgns` collision + `ForceFitBalloon:877`/`SplitHeight`
      overflow, replacing the vertical stack. **Seeded reproducible roll** (per-panel deterministic seed).
    - **Phase 3 — pixel-parity gate:** commit `render:panel` PNGs (seed 1234) incl. a 3-body/multi-balloon
      fixture; byte-diff regression (none exists today).
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
