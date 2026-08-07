# Future Work

The backlog of **non-critical, good-to-have** items — everything that is real work but does not
block anything currently in flight. It exists so `HANDOFF.md` can stay short: HANDOFF holds what the
*next* session needs, this file holds what *some* session will need eventually.

Related: `docs/DEVELOPMENT_PLAN.md` (milestones and gates — the authority on ordering),
`WORKLOG.md` (what was already built), `docs/adr/` (binding decisions).

---

## How this file works

- **Nothing here blocks the MVP.** An item that turns out to block something is not deferred — move
  it into `HANDOFF.md` → Next Actions and delete it here.
- **Every item carries three things**: what it is, *why it was deferred*, and what "done" looks like.
  An item without a why becomes an item nobody can decide about later.
- **Items leave this file in one of three ways**: scheduled into a pre-1.0.0 iteration (§1), done
  (→ `WORKLOG.md`), or explicitly dropped (say so, in place — a dropped item that vanishes silently
  gets re-proposed).
- **Do not re-litigate the deferral** when picking an item up; read the why, and if it still holds,
  put it back.

---

## 1. Pre-1.0.0 improvement iterations

`1.0.0` is reserved for public launch: **the repo goes public and the website ships** (`AGENTS.md`,
`WORKLOG.md` header). Between the current state and that day there will be **an open-ended number of
improvement iterations**, each a themed batch of work the user selects. The count is not fixed in
advance and the release date is the user's call — **do not treat any iteration as the last one
unless the user says so.**

| Iteration | Theme | Items | Status |
|---|---|---|---|
| I1 | Make it the product it was meant to be | **6.1** comic pane becomes a cartoon (DM↔Hero converse in most scenes) · **6.2** save/load/restart · **6.3** landing/home page | ◐ drafted, **not complete** — the user has more items to add |

**I1 is explicitly a partial list.** The user supplied three starters and will add more as the
iteration proceeds; the stages are drafted in `docs/DEVELOPMENT_PLAN.md` M6. **Do not read the
absence of an item as a decision that it is out of scope**, and do not treat I1's completion as the
release trigger.

**Protocol for an iteration:**

1. The user supplies the improvement items (they are the source — this file's §2 backlog is a menu to
   draw from, not the plan).
2. Record them as a new row above, expand into a subsection here with the same what/why/done shape,
   and mark the iteration ◐.
3. Work it like any stage: incremental changes, tests, `HANDOFF.md` updated each session.
4. On completion mark it ☑, write the `WORKLOG.md` entry, and leave the row as history.

Until I1 is defined, **the backlog in §2 is not scheduled work** — do not start an item from it
without asking.

---

## 2. Backlog

### 2.1 Presentation & authoring judgement

- **`SHOTS` framing table — further tuning.** ◐, first pass at v0.16.3. The ADR fixes which camera
  rung fires; these fill/reveal/backdrop numbers make each rung legible on screen.
  *Why deferred:* pure authoring judgement, nothing is wrong today. `establishing`≈`wide` similarity
  is inherent to solo-Hero scenes and was deliberately left.
  *Done looks like:* each rung visually distinct in the gallery harness (`web/gallery.html`), with
  the pixel gate re-accepted after looking at the images.

- ~~**Exchanges render shot/reverse-shot, not a two-shot.**~~ **Scheduled → M6.1d (iteration I1).**
  Caption + DM + Hero is three balloons, the fit test refuses them in the band at `UNIT`, and
  `AddLine` splits, so ADR 0005 §4's facing two-shot is rare. Deferred as authoring judgement until
  2026-07-28, when the user named the conversation itself as M6's most important item — it is one of
  four limiters keeping the pane from reading as a cartoon. Levers and full diagnosis:
  `docs/DEVELOPMENT_PLAN.md` §6.1.

- ~~**A split exchange mis-pairs the balloons.**~~ **Fixed at M6.1g** (`addScript` → `isOrphaned`).
  A frame missing one of its own turn's speakers is a fragment and no longer accepts a later turn's
  line, so the orphaned reply rides alone. Cast-agnostic, so the traversal collapse is untouched.

- ~~**Three panels in the full-game corpus are empty.**~~ **Decided at M6.1g: kept, and it is not a
  bug.** Rendered and looked at — it is the traversal collapse's one output, the Hero standing in a
  revisited room under its name, and deleting it would delete the only trace of the walk. The
  genuinely blank frame (no balloon *and* no body) is now pinned against in `director.test.ts`.

- ~~**A death wears the resurrection room's location box.**~~ **Fixed at M6.1g** (`panelRoom`). The
  panel is set and titled in the room the death happened in; the fold's `room` still advances. Pinned
  by a synthetic turn, because no walkthrough in the corpus dies any more.

- ~~**Refusal repeats cluster.**~~ **Re-measured and fixed at M6.1g — and it was not the refusals.**
  On the won corpus the culprit was `routine-ack` (and `scored`): "Taken." fires every turn of a
  `take all` and of the endgame hoard ferry, recycling a three-line tail at a gap of *one panel*.
  A cooldown of 3 plus a longer loop took repeats within 20 panels from 70 to 6, and the tightest
  real gap from 1 to 30. The refusal families, which M6.1f blamed, were never the tight ones.

- **Finding a *moment* in a long history — the half of strip navigation the jump control does not
  reach.** v0.26.5 made a few hundred panels cheap to hold and v0.26.6 put both *ends* one tap away
  (`jump.ts`), for both panes at once. Neither helps a reader looking for the room they were in ten
  minutes ago.
  *Why deferred:* the ends are where readers actually go, and the honest version of the rest is a page
  policy — ADR 0004 §5 territory rather than an afternoon.
  *Done looks like:* room/chapter markers in the strip, and/or a paged history that makes §5's "a page
  is a layout policy over the stream" true on screen as well as in the type. **The cheap first step is
  discrete panel→transcript linking**: `Panel.turn` already records which turn each panel came from,
  so tapping a panel could scroll the transcript to that turn — a jump, not a coupling, which is what
  makes the non-monotonic turn↔panel mapping stop mattering (see `jump.ts`'s header for why the
  continuous version is not on the table).

- **The `Turn[]` autosave grows without bound.** `persistence.ts` already anticipates the wall —
  `StorageFullError` exists and autosave switches itself off with a message — but nothing bounds the
  history against a ~5 MB quota.
  *Why deferred:* no observed failure yet, and every bound is a decision about what a saved game *is*
  (a full replay log is what makes resume renderer-independent — see the module header before
  trimming anything).
  *Done looks like:* a measured panel/byte budget for a completed game, then either compression or a
  bounded window that keeps `SaveState` authoritative and degrades the *strip*, not the world.

- **Panel grammar (ADR 0004) — open authoring judgement.** Page composition (§5), §4a breakpoints,
  PDF byte size, pane-scroll coupling. Amend the ADR, not the discussion doc.
  *Why deferred:* each becomes urgent only when the surface it governs is touched.
  *Constraint:* PDF export is deliberately **not** WYSIWYG — once panel width is a viewport
  function, WYSIWYG would have to canonize one reader's window. `layout.ts`/`cellFor` is where a
  print/PDF page policy would go, beside the on-screen one.
  *When it comes up:* the user wants **a recommendation, not a survey** — lead with a pick.

- **Two ADR 0007 balloon enhancements, considered and deferred as larger/optional.** A fuller
  permuted-spline outline (we ship a lighter `wavyEdge` ripple), and route-region multi-balloon
  collision (our panels are 1–2 balloons).
  *Why deferred:* no observed need; both are cost without a symptom.
  *Revisit only if* a real need appears in a running page.

- **A dedicated win-screen render for entering `STONE-BARROW`.** Today the winning moment renders as
  an ordinary panel (`script.ts` beat + `backdropFor("STONE-BARROW")` → `barrow-exterior`) — there is
  no distinct ending scene. The `barrow-interior` backdrop asset exists (`BackdropId`, `cast.json`)
  but nothing references it, because the original ZIL never modeled a room for stepping inside the
  barrow (`STONE-BARROW-FCN` fires the win directly, per `1dungeon.zil:1254`).
  *Why deferred:* 2026-08-07 gap-table review (`docs/backdrop-generation-plan.md` audit) found the
  asset orphaned; building a second render step for the win moment is new engine work, not a mapping
  fix, and no iteration has asked for a distinct ending screen yet.
  *Done looks like:* a win-specific panel/beat that draws `barrow-interior` when `WON-FLAG` fires,
  or — if this stays out of scope — `barrow-interior` deleted from `BackdropId` and `cast.json` as
  dead art.

### 2.2 Port leftovers (ADR 0008 scoped these out on purpose)

ADR 0008 is complete. What it left open is only what it declared out of scope — both items below
need the same missing thing, **the talk-to graph that mobs bring**, so they are one piece of work.

- **Mob dialogue authoring — an ADR 0006 slice.** The comic pane is already N-capable (a test
  injecting a mob line proves it); what is missing is the mapper deciding *when and what* a mob
  speaks.
  *Done looks like:* mob turns produce panels from real game events, not fixtures.

- **`OrderAvatars` seating order + histeresis un-stubbed.** Currently stable-by-insertion-order;
  `DoGreedyOrdering` (`panel.cpp:403`) needs the talk-to graph.
  *Why deferred:* un-stubbing without mobs would be untestable — nothing to order.
  *Done looks like:* the greedy ordering ported and cited, gated by the N≥3 fixtures
  (`web/tools/cast-fixture.ts`, `web/test/bodies.test.ts`), pixel gate re-accepted after looking.

- **Known gate divergence — `fit.ts` estimates arrow positions, `layoutAvatars` places them.** ☐
  *No longer observable since M6.1g:* widening `BALLOON_HEADROOM` to 0.44 gave `mob4-p02` enough band
  that the estimate stopped mattering, and `gate.test.ts` now pins the `stackBalloons` fallback set at
  **empty**. The two sides still disagree; the disagreement has slack to hide in.
  *Why deferred:* documented cost of estimating arrow positions (ADR 0008 Phase 2b/4), and now with
  no symptom at all.
  *Done looks like:* the two sides agree — and that empty-set assertion is the one that will notice
  first if the slack runs out.

### 2.3 Engine / IR hygiene

- **Invisible-routine audit, re-run after ADR 0003.** 360/439 ROUTINE forms extracted, 28
  catalogued, 51 invisible; 45 correctly excluded by design (parser/clock/turn-loop the engine owns).
  Tail worth triage: `BREATHE`, `MIN`, `UNTIE-FROM`, `FIND-IN`, `NO-GO-TELL`, `YES?`.
  *Why deferred:* parity is 143/143 strict and the game completes 350/350 — no symptom.
  *Done looks like:* **a standing report, not a one-off.** The catalog names the routine that failed
  but never what its failure cost, which is exactly why combat stayed hidden for two milestones.

### 2.4 Deferred features

- **Assisted input — SCUMM-style command picker.** Designed (panel-grammar discussion §15),
  deferred to after the MVP by decision.
  *Two constraints when it comes up:* Zork's 135-verb list **is a spoiler table** (`ECHO`,
  `ODYSSEUS`, `PRAY` *are* solutions) — so a fixed core verb set with puzzle verbs typed-only; and
  it **structurally removes `parser-miss`** (12.7%, the largest affect marker), flattening the comic
  unless something replaces it.
  *Prerequisite:* an **ADR 0002 amendment** — a read-only query API (`objectsInScope()`, pull not
  push), leaving the event stream at 1.0.0. `engine/src/scope.ts` already computes the answer.

- **Rename `web/` → `website/`.** `docs/DESIGN.md` §6 makes `web/` the website root — the landing
  page at its root, the game nested at `web/play/` — so the folder name now undersells what it holds.
  *Why deferred (2026-08-02):* the rename touches `package.json`, `tsconfig.build.json`, the
  `dist/web/src/…` output path, test imports and possibly the pixel-gate golden. That is mechanical
  churn against a 292-test, gated package for a naming win, and it is **fully separable** from the
  layout decision itself.
  *When:* after 6.3 ships and the pixel gate has been run once on the new layout. Until then, fix
  `web/package.json`'s description so it says "the website", not only the game shell.

- **Drawn logo mark, replacing the interim glyph.** `docs/DESIGN.md` §3.7 ships the site with a
  terminal-text wordmark plus one small original glyph (favicon, touch icon, OG card). The user is
  preparing a proper drawn logo.
  *Why deferred (2026-08-02):* it is the only branch of the wordmark decision that blocks on an
  asset rather than on a decision, and 6.3 must not wait for artwork.
  *When it lands:* it supersedes the glyph on all three surfaces and **may** replace the masthead
  wordmark — that is a `DESIGN.md` amendment at the time, not pre-granted. Also check it against
  6.4: if anyone but the user drew it, it needs a `THIRD_PARTY.md` entry.
  *Hard constraint either way:* **original work only** — not built from Comic Chat's bundled
  character art or any Infocom asset. Both upstreams are MIT over the *software*; identity marks are
  where "implies sponsorship" is arguable, and the game's own rendering of that art is a different
  act from branding with it.

---

## 3. Not in this file

- **ADR 0006 Slice 5 (session-recap PDF export)** — the last open ADR slice, tracked in `HANDOFF.md`
  as live work, not backlog.
- **Milestone 6 stages** (asset separation, neutral branding, the website) — those are release
  scope, defined in `docs/DEVELOPMENT_PLAN.md`.
- **Durable cautions and operating notes** (the pixel gate's rules, engine hazards, standing method
  notes) — those stay in `HANDOFF.md`; they are not work items, they are things that must be true
  at the start of every session.
