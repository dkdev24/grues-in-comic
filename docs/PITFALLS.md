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
- **The `LIT` global is the story file's, not the engine's** (v0.27.0). `light-changed` recomputes
  ZIL `LIT?` at the turn boundary and reports it; it must **not** write `state.globals["LIT"]` on the
  way past. The extracted routines both set and branch on that global at their own moments, so
  "correcting" it to serve a UI is an engine behavior change with no test asking for it. The same
  reasoning is why the derived answer is stored on `SaveState.lit` rather than read back out of
  `globals` on restore — that global can lag a turn, and the save is the one place a host cannot
  fold the stream instead.
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
- **A host-only verb (not a ZIL `SYNTAX` entry) must be registered on the lexicon, not just handled
  in `metaVerb`/a builtin.** `buildLexicon(doc)` only knows the words the extracted `vocabulary`
  carries; an unregistered word never reaches dispatch — it fails at `isKnownWord` in `parser.ts`
  with "I don't know the word", before any builtin gets a chance to run. `HINT`/`HELP` (v0.25.2) hit
  this and were fixed with a lexicon-injection helper (`addHostVerb()`) — since removed, because
  v0.26.2 moved both out of the engine entirely (they are shell commands, `/hint`/`/help`, never typed
  as game verbs), but the trap is real for the next genuine host-only verb: inject a zero-object
  `SyntaxRule` after `buildLexicon(doc)` runs, so `buildLexicon` itself stays a pure, ZIL-faithful
  function.
- **Nothing may be added to the opening turn's engine output** — it is diffed byte-for-byte against
  golden transcripts from a reference interpreter (143/143 strict). A "welcome"/instructions line
  belongs in host-side static content (`web/index.html`, styled by `style.css`), never an `EngineEvent`
  emitted from `start()`/`GO` — same reasoning that already keeps the copyright banner host-side
  (`builtins.ts` `V-VERSION`, deliberately a no-op).
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
- **`BALLOON_HEADROOM` is a layout constant *and* the fit test's budget, and it is what decides
  whether the two-shot exists** (M6.1g). The band `fit.ts` lays balloons into is the same band that
  keeps a figure's head clear of a straddling balloon, and a panel drawing the location box gives
  `TITLE_HEIGHT` of it away (ADR 0009 §3). At 0.36 that left ~90px at `UNIT` — one balloon, not two —
  so the fit test refused the facing two-shot on exactly the turns that carry a room title, and
  `AddLine` split the exchange into shot/reverse-shot. 0.44 took it from **70 of 274 exchanges in one
  panel to 158**, and incidentally retired the pinned `mob4-p02` stack fallback. **Anything that
  changes this number, `TITLE_HEIGHT`, or `UNIT` is changing the conversation, not just the
  spacing** — re-run `density` as well as the pixel gate.
- **`SHOTS.fill` scales a figure by its *body* height, and the reader judges closeness by its
  *head*** (F4, v0.28.1). The two agreed while the cast was dan alone; the roster made the head
  0.295 of the figure for denise, 0.347 for kevin and 0.479 for tiki, so one `fill` put chins between
  81% and 91% of the panel on `close-up` — head-and-no-shoulders for half the Heroes, and tiki's jaw
  *off* the bottom edge at 107%. `MAX_HEAD_HEIGHT` caps the head under the headroom band, which is
  what makes a rung mean the same thing for every character. **Any new framing number is a
  per-character number until it is checked against the roster** — `npx --prefix web tsx
  web/tools/shots-grid.ts` renders one rung across every Hero and prints chin/head geometry beside it.
- **Shrinking a placed figure moves it *down*, because `shot.reveal` measures from the feet**
  (F4, v0.28.1). `y = height - figure.height * scale * reveal`, so a scale clamp applied inside `fit`
  drops the head by the same arithmetic that shrinks it — on `reaction` (reveal 0.4) that walked the
  Guide's head off the bottom of the frame and the balloon driver refused the panel into
  `stackBalloons`, which the gate reports as a finding. Clamp **after** layout, re-pin the head-top to
  the band, and only for figures the band actually pinned (`applyHeadroom`).
- **A rung carrying a speech balloon cannot be tighter than a `close-up`, whatever its numbers say**
  (F4, v0.28.2). `BALLOON_HEADROOM` pins the head-top at 0.44 and `MAX_HEAD_HEIGHT` caps the head at
  0.38, so the head is bounded at 38% of the panel the moment a straddling balloon exists. `reaction`
  asked for `fill: 2.1` and got a `close-up` on every panel that had one. **A tight rung has to be
  wordless to be tight** — which is why the death frame stages the Hero alone and says nothing, and
  why `SHOTS.reaction` is expressed as `headFill`/`headTop` rather than `fill`/`reveal`.
- **`addReaction` clone-appends, so a staged body lands in whoever's panel is still open** (F4,
  v0.28.2). The mapper broke *forward* out of the death frame with a trailing `<Brk>` at 6.1c and
  left the backward direction alone, so the reaction body joined the previous turn's exchange and
  `clonePanel` relabelled that panel as the death — **6 of 11 walkthroughs**, decided by whether the
  previous line happened to be a `BM_ACTION` caption. **A rung that needs its own frame needs a break
  on both sides of it.**
- **`reactions` staging is a second body for an existing frame, never a frame of its own** (F4,
  v0.28.2). A turn that produced no line has no frame to stage into, and staging anyway manufactures
  a wordless `medium` shrug. Zork's `quit` confirmation is that turn, so every ending in the corpus
  closed on a shrug *after* its own death frame. Guard staging on `lines.length > 0`.
- **A turn that ends the game may not have moved the player, and two rules were written as if it
  always had** (v0.27.5, reported from play). The barrow win aborts the walk, so the winning turn
  carries no `player-moved`: the read-aloud's whole-text path (gated on `moved`) quoted one sentence
  of the longest speech in the game, and `locationBox`'s room-change rule drew no box for a place
  the map does not contain. Both now ask `gameOver`/`won` as well. **Anything keyed on `moved` should
  say whether it means "the player is somewhere else" or "the turn was a move"** — the ending is
  the second without the first, and it is the one turn in the game with no second chance to notice.
- **The `game-over` event has an `outcome`, and reading only the boolean above it draws the win as a
  death** (v0.27.5). `AFFECT_MARKERS`' `death` fired on any game-over for the whole life of the
  table, which was invisible while the corpus contained no victory. **A marker that fires on an
  event rather than on prose must read every field the event carries**, not just its presence.
- **`roomTitle` is the one panel field that does not take the incoming context** (`clonePanel`).
  The location box is metadata about *where the panel is*, not about its newest balloon, so a later
  same-room turn appending into it must not erase it.
- **`dark` is the second such field, and a light change breaks the panel** (v0.27.0). Both were paid
  for by rendering the cellar descent and looking at it — no rule test could see either. Without the
  break, the Hero's next-turn declaration clone-appends into the frame that said "It is pitch black"
  and `clonePanel` takes the incoming context: the darkness beat is not *followed* by the reveal, it
  is **replaced** by it (`replacedLast`). A frame is drawn in the light it opened in. A dark panel
  also refuses an incoming `roomTitle` — the box belongs to the turn that lit the room. **Anything
  that adds a panel-level fact should ask which of the two rules it follows**, newest-line-wins or
  fixed-at-open; the default is the first and it is wrong for anything describing the *frame*.
- **`turn.status` is the state at the *end* of the turn, and the declaration does not live there**
  (v0.27.1, reported from play). `Panel.dark` read `status.lit` directly, so the Hero's "down looks
  right" — which ADR 0010 §2 has answering the *previous* frame, standing in the room he has not left
  yet — opened a black panel a frame early, and a lit one a frame early on the way out. `PageLine.dark`
  is the light half of the per-line exception `PageLine.room` already was. **Any future panel fact
  derived from `turn.status` has the same question to answer**: is it true of the turn, or of the
  frame? The declaration is where the two differ, and it is one line in the script.
- **A room entered in the dark still owes the reader its name** (`titleOwed`, v0.27.0). ADR 0009 §3
  draws the location box on the turn the room changes, and an unlit arrival suppresses it — but the
  room never changes again, so without the debt the box is never drawn at all and the reader never
  learns they are in the Cellar. Held until the room is first seen, then paid once, on a lit frame.
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
- **The authored cooldown is per beat and the room gazetteer is not cooled at all** (ADR 0009 §5,
  M6.1d). One shared budget across every authored line was two of M6.1's four limiters at once: a
  beat three turns ago silenced an unrelated beat now, and either silenced a room's *one* first-visit
  line permanently — the room path never comes round again. If a future change reintroduces a shared
  clock, D5 goes with it.
- **`turn.status.moves` does not advance on a refusal, so it is not a clock** (found M6.1d, acted on
  M6.1e). ZIL does not charge the player for a parse it rejected, so a run of refusals is several
  turns wearing the same number — and a cooldown measured in moves is therefore *no* cooldown on
  exactly the beats that fire most. The mapper counts its own reads (`turnsRead`) instead, which is
  a fold like everything else and advances once per turn whatever the engine thinks. **Anything that
  wants to measure elapsed play in the presentation layer has the same choice to make**, and the
  engine's counter is the wrong side of it.
- **The room gazetteer is the only authored surface that cannot wear out** (M6.1e session 2). A
  first visit happens once per room per playthrough, so a `GUIDE_SCRIPT` entry has no run, no
  cooldown and no repeat to design around — which is why the Hero's half was added there and why a
  line written for a room can be as specific as the author likes. Everything keyed on a *marker* has
  the opposite property. **Do not add a firing rule that lets a room line fire twice**: it would put
  the one surface with no repeat protection into the class that needs it.
- **`12-full-game.cmd` is authored for the *resilient* harness, and a naive replay of it loses the
  game** (found M6.1f, repaired M6.1g). `runFullGame` repeats combat until the villain falls and
  ferries scattered treasure back to the case; feeding the raw list to a session instead lets the
  troll win on turn ~70, and the remaining ~330 commands bounce off walls — **Rocky Ledge, 30/350,
  16 of 110 rooms**, which was **406 of the corpus's 606 turns**. `density.ts` now takes the row from
  `fullGameCommands()` — the driver's own log of what it actually typed, replayed into a fresh
  session at the same seed, which reproduces the won game turn for turn (423 turns, STONE-BARROW,
  350/350). **Any comic-side measurement over the full game must go through that log, or say in its
  output that it is measuring a losing run.** The log includes commands that *threw*, deliberately:
  the harness swallows those and carries on, and a replay that skipped them would diverge.
- **A measurement taken over a lost game is not a weak measurement, it is a different game**
  (M6.1g, the lesson of the repair; **and it is still live — see F17**, 2026-08-23: `density.ts`
  fixed its own corpus and nothing else shares the fix, so `mapper.test.ts`'s `allPanels()` still
  replays `12-full-game.cmd` raw, where the troll wins on command 29 and 254 of the next 375
  commands bounce off walls — 60% of the corpus). Every conclusion M6.1d–f drew from the corpus had to be re-taken
  and three of them inverted: the two-shot was not 59% but 26% (the flail carries no arrivals, so it
  never paid the location box's share of the balloon band — see `render.ts`'s note on
  `BALLOON_HEADROOM`); the clustering culprit was not the refusal beats but `routine-ack`, which the
  flail could not reach; and the exchange rate sat at the floor of D5's band rather than mid-band.
  **When a corpus row changes, re-read every rate that quotes it before acting on any of them.**
- **D5's band is the binding constraint on filling silence, not authoring effort** (M6.1e session 2;
  figures updated M6.1g). The corpus sits at one exchange every **2.3** turns against a band of 2–3,
  so turns that are still wholly silent cannot simply be given beats: each one added is a turn that
  has to come off something else. **Measure before writing, then check the ceiling** —
  `density.test.ts` asserts both ends precisely because "they never stop talking" fails D5 as hard
  as "they never start".
- **How often a beat speaks is authored beside its lines, not tuned globally** (`BeatCycle.cooldown`,
  M6.1e). The two refusal families are 45% of all turns; at the table's default they push the corpus
  *past the bottom* of D5's band (1.6 against a floor of 2). D5 is a band, not a floor — a comic
  where the two never stop talking fails it as surely as one where they never start, which is why
  `density.test.ts` asserts both ends.
- **A beat needs a cooldown *and* a long enough loop — they space different things** (M6.1g). The
  `cooldown` spaces the *firings*; the length of `loop` spaces the *lines*. `routine-ack` had
  neither, and "Taken." is what a `take all` and the endgame hoard ferry produce on consecutive
  turns, so its three-line tail recycled at a gap of one panel. Cooldown alone left the same line
  eleven panels apart; cooldown 3 **and** five lines put it forty apart. **When a line reads as
  repetitive, measure the gap in panels, not the count** — and beware the measurement artifact that
  a pair whose two halves are the *same string* (the echo joke) always reports a gap of 1.
- **A hardcoded line in `mapper.ts` is a line no rotation protects, and the voice spec can *prescribe*
  a tic** (M6.1e session 4). The Hero's resolved-action balloon was one template — `The {name},
  then.` — firing **59 times a playthrough** in the identical cadence, and it read as a verbal tic
  rather than a voice (the user's call; no measurement flagged it, because every counter here counts
  *firings and gaps*, not shape). Two things made it durable: the string lived in the mapper, where
  the "content goes in `script.ts`" rule would otherwise have put it beside a rotation; and
  `wiki/the-hero.md` **specified** the shape, so six authored lines copied the suffix from the spec.
  It is now `ACTION_SCRIPT` with a cursor per kind in the mapper's fold. **Two standing rules:
  content that fires on an event-derived trigger belongs in `script.ts` like every other line, and a
  voice document must describe a register, never a fixed construction** — anything it writes as a
  literal example will be reproduced verbatim across the corpus.
- **Two of a turn's speakers in two panels is a fragment, and the next turn must not join it
  unless it says it's answering** (`addScript` → `isOrphaned`, M6.1g; recast ask-vs-answer at
  ADR 0010 §2 / M6.1i). When an exchange splits, the frame holding the Hero's reply contains no DM,
  so `AvatarInPanel` happily clone-appends the *next* turn's DM line into it and the reader sees him
  answering a question asked after he spoke — 144 of 300 split exchanges at M6.1f. The rule is
  cast-agnostic (`page.ts` knows nothing about the DM or the Hero) and only fires when the turn's
  last frame is missing a speaker the turn had, so the traversal collapse and the ordinary two-shot
  are untouched. Since M6.1i a fragment isn't an unconditional break any more — `isOrphaned` arms
  `guardFragment()`, and only a line carrying `PageLine.answers` gets past it (still cast-agnostic:
  the fact rides on the line, not on knowing who the Hero is).
- **A line pulled out of `heroLines` to answer a *different* frame still has to leave something
  behind for its own** (M6.1i). The Hero's declaration answers the *previous* turn's frame (ADR
  0010 §2), so it moved out of `mapper.ts`'s `heroLines` array — but `heroLines.length === 0` was
  also the gate for the reaction fallback and the death shot, the mechanisms that give a turn's *own*
  frame a body when nothing else will. Counting the declaration there too (`heroSpoke`) looked
  natural and was wrong: a turn with nothing else to say (a plain traversal step) would answer the
  old frame and then hand its own room-change break nothing to land in — no reaction, no destination
  panel, the room silently unrepresented. The fix is that those two checks stay on `heroLines` alone,
  unaware the declaration exists at all, exactly as they were before ADR 0010 §1. **The general
  shape: when a line moves to serve a different frame than the one its turn produces, re-audit every
  place that used its presence as a proxy for "this turn's frame has content" — the proxy was never
  about the line, it was about the frame, and pulling the line changes which frame it's evidence for.**
- **A death happens in two rooms and the panel belongs to the first** (`panelRoom`, M6.1g). ZIL
  narrates the killing blow and then `JIGS-UP` resurrects, both inside one turn, so `room` has
  already moved on by the time the panel is built — the troll's killing blow was captioned *Forest*
  and drawn against the forest backdrop. `room` itself must still advance (the fold's memory is what
  makes later turns answerable); only the panel is pinned back. **The corpus cannot catch this** —
  the walkthroughs all survive and the full game now wins — so it is pinned by a synthetic turn in
  `mapper.test.ts`.
- **The wordless panel is deliberate; the *blank* one would not be** (M6.1g, resolving an M6.1f
  finding). A frame with a location box and no balloon is the traversal collapse's one output
  (ADR 0005 §3): the Hero has walked back through rooms he has seen, the pair have nothing to say,
  and rendered it is him standing in the room under its name. Deleting it would delete the only
  trace of the walk. What must never appear is a frame with **neither** a balloon nor a body, which
  `director.test.ts` pins.
- **`density.ts` attributes panels to turns through the Director's `PanelDelta`, never through
  `panel.turn`** (M6.1d). A panel carries the context of the *last* line written into it, so once most
  turns spoke, whole turns disappeared from a `panel.turn` map and the report printed a negative split
  count. Related: **"the exchange is in one panel" is not "the turn is in one panel"** — a turn whose
  DM also reads a description aloud is a panel run by design (ADR 0009 §4), and the exchange ending it
  is what the run is built to end on.
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
- **The strip is virtualized, and the round-robin is advanced at strip-join, not at first draw**
  (v0.26.5). A canvas costs `w × h × dpr² × 4` bytes on or off screen — ~1.5 MB per panel at a phone's
  DPR — so a completed game's few hundred panels are hundreds of megabytes of live bitmap, which a
  mobile browser answers by discarding the tab. `comic-view.ts` therefore paints only what is within
  `SCROLL_HEADROOM` of the viewport and zeroes the rest. Two rules fall out and neither is optional:
  **(1) only the bitmap is virtual** — the element, its CSS size and its `aria-label` always exist, or
  the scroll height, the grid flow and the screen-reader reading of the strip all start lying;
  **(2) anything that advances per-panel state must do it when the panel joins the strip**, because
  paint order is now the reader's scroll path. The cycle is advanced by `selectFigures` (the
  width-free half of `renderPanel`, exported for exactly this) and the state it advanced *from* is
  frozen per panel, so every repaint is idempotent. Get (2) wrong and the bug is invisible until
  someone scrolls a long strip back up and the bodies have changed —
  `web/test/select-figures.test.ts` is what pins it.
- **Any programmatic scroll of a pane must be instant, and any reader-intent signal must come from the
  gesture rather than the scroll** (v0.26.6, `jump.ts`). Two traps, both invisible in a short game.
  *Smooth* is not a free upgrade once the strip is virtualized: an animated scroll across the history
  paints every panel it passes, so a smooth jump to the beginning is a full-strip repaint dressed as a
  nicety (the per-turn `scrollTo` may stay smooth — it moves one panel height). And **both panes scroll
  themselves on every turn** to follow the newest, so anything that treats a `scroll` event as "the
  reader is browsing" fires once per command — which is why `ScrollPane` exposes `onReaderScroll`
  (wheel/touchmove/pointerdown/keydown) beside `onScroll` (geometry). Related: a control faded with
  `opacity` alone stays in the tab order, so the fade must carry `visibility` too.
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
- **`MapperOptions.roomTitles` (the location box's, ADR 0009 §3) has never been wired in production**
  (found 6.1j, v0.24.8). `comic-view.ts` never passed it to `createDirector`, so the shipped caption
  has been showing raw room ids (`"NORTH-OF-HOUSE"`) instead of titles the whole time `roomTitle` has
  existed — every test that checks it supplies its own table, which is why nothing caught the gap.
  6.1j needed a room-name table for the journey line and deliberately did **not** reuse this one or
  fix its wiring — that is a separate, unscoped change with its own pixel-gate blast radius across
  every panel — so it built `journeyRoomTitles` beside it instead (`director.ts`). If a future session
  wires the caption's table, check whether `journeyRoomTitles` can just become `roomTitles` again.
- **`AvatarInPanel` (`panel.cpp:655`) does not distinguish a posed body from a spoken one, and a
  silent turn's reaction (`reactions`, `mapper.ts`) stages the Hero's body into a panel he never got a
  balloon in** (found in play, M6.2 session). ADR 0010 §2's whole point is that the *next* turn's
  declaration answers that still-open frame — but the literal port blocked it anyway, because the
  Hero's body was already *there*, even though he had not spoken. `page.ts`'s `addLine` now takes the
  weaker `avatarSpokeInPanel` (checks `panel.speakers`, not `panel.bodies`) for a line carrying
  `PageLine.answers`, scoped to that one line because `answers` is already the one thing ADR 0010 does
  not port verbatim (ADR 0007 governs every other line). **This does not extend to `PageLine.room`:** a
  departure-room line clone-appending into an *older*, already-committed panel relabels that panel's
  `room` to wherever *this* line's own turn happened to depart from — found via a collapsed traversal's
  journey line mis-painting the run's arrival panel with its own last step's departure room. The
  `answers`-only exemption is further gated on `line.room === undefined`.
- **The `m_panels.GetCount() < 2` guard (`panel.cpp:1079`/`:1148`) is a genuine, deliberate historical
  port, pinned by `mapper.test.ts`'s `"opens the page one panel at a time"`** — looked at and kept in
  the M6.2 session above. It still produces a 3-panel opening (instead of 2) whenever the very first
  turn of a fresh page — session start or `/restart`, the only times `page.panels` is empty — has a
  multi-line DM description: the run's first `<Chr>` bounces into a stray panel instead of the one it
  was staged beside, which strands the Hero's body in what becomes the run's *last* panel and costs his
  own reply a panel it should have joined. **Deliberately left as-is** (the user's call, M6.2 session):
  it is a one-time artifact of a session's opening frames, not the recurring, throughout-play case the
  `avatarSpokeInPanel` fix above addresses, and touching it means retiring a test that explicitly pins
  fidelity to the cited C++ line. Revisit only with the user's explicit go-ahead.

## Art pipeline

- **`art/` has no assertion that a rendered image *looks* like anything** beyond
  `art/test/polarity.test.ts` (which pins the pixel-code → colour mapping, not the art). The corpus
  sweep checks shape/bounds, which an inverted/mis-hued/mirrored figure satisfies — that is how an
  inversion reached a released build (v0.13.0). **Any new colour/polarity decision needs its own pinned
  assertion, and looking at the output stays part of the loop.** Art statistics are not invariants
  (anna's bob is a legitimate 80% ink).
- **`web/assets/comic/` is a committed build artifact, and since v0.28.0 there are two of them.**
  `npm --prefix art run pack` builds the canonical bundle (dan, tiki, every backdrop, `cast.json`);
  `npm --prefix art run pack:roster` builds `web/assets/comic/roster/` — the fifteen choosable
  characters plus `roster.json` — from `art/src/roster.ts`. **Re-pack *both* after any `art/` decode
  change** — v0.13.1 fixed the decoder but the committed sheets stayed inverted until regenerated,
  and the roster is now a second place that can rot the same way.
- **A chosen cast is a runtime skin; the pixel gate's cast is not choosable.** The gate, the render
  tools and `cast.json` all stay dan/tiki whatever the player picks (ADR 0004 §11), because the 24
  accepted goldens are pictures of dan and tiki. If a gate case ever renders someone else, the bug is
  that a chosen cast reached the gate path — not that the golden is stale. Never `gate:accept` to
  make a re-cast pass.
- **The roster ships names, not art.** `roster.json` is the picker's whole first fetch; sheets are
  pulled per selection and per cast (~150 KiB), never as a set (~1.4 MiB). A change that preloads the
  roster to make previews snappier trades a third of a megabyte for a hover.
- **Casting on pose inventory alone will ship an expression-dead character.** ADR 0004 §11's
  predicate ("owns a SHRUG torso and a BORED face") is an inventory test, and **lance passes it
  wearing a paper bag** — every marker fires, nothing visible changes in the panel. Look at the
  figures before casting: `npx tsx art/tools/roster.ts > roster.json` then
  `npx tsx art/tools/roster-sheet.ts roster.json sheet.png BORED`. Pools: `docs/casting-roster-survey.md`.
- **The avatar corpus is 31 characters, not 25** — `original-projects/comic-chat/v2.5-beta-1/` has
  `artpack1/` as well as `comicart/`. Six characters live only in `artpack1/`, and four names exist
  in both with the `artpack1` cut richer (lynnea 306 → 391 figures). Any survey that reads one
  directory is measuring two-thirds of the corpus, which is how the ADR 0004 shortlists were built.
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
- **Rasterizing SVG has no native tool here** (2026-08-02). No `rsvg-convert`, ImageMagick, Inkscape
  or Python PIL on this machine; headless Chrome plus `sips` is the working path, and it has two
  traps that both fail *silently*, producing a plausible file rather than an error:
  1. **Screenshotting an `<img src="…svg">` yields a blank frame** — capture happens before the load
     completes. Inline the SVG markup into the HTML wrapper, and pass `--virtual-time-budget=3000`.
  2. **Chrome enforces a minimum window size**, so `--window-size=32,32` gives an empty image. Render
     one large master (1024×1024) and downscale with `sips -z`.

  Both were hit generating the §3.7 site glyph. **Always open the output and look at it** — neither
  failure sets a non-zero exit code.
- **`/play`'s world fetch (`WORLD_URL = "/world/zork1.world.json"`, `web/src/main.ts`) only exists
  locally because `web/tools/serve.ts` mounts `ir/artifacts/` at `/world/`.** Cloudflare Pages (or
  any static host) serves the build output directory verbatim — there is no server-side route
  mapping. A Pages build must physically copy `ir/artifacts/zork1.world.json` into the output
  directory at `world/zork1.world.json`, or `/play` 404s on boot with no build-time error. Confirmed
  2026-08-02 setting up the `grues.danielkimdev.com` beta deploy — see `docs/DEVELOPMENT_PLAN.md` §6.5.
- **Wrangler cannot create or configure a Git-connected Pages project** (checked 2026-08-02,
  wrangler 4.118.0). `wrangler pages project create` only makes a direct-upload project; linking a
  GitHub repo for continuous deployment (branch, build command, output directory, custom domain) is
  dashboard-only, even with the Cloudflare GitHub App already installed on the repo. `wrangler pages
  project list` / `deployment list` can inspect an existing Git-linked project afterward, just not
  create one.

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
