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
- **Size, impact and priority live in the §2.0 triage table and nowhere else.** An item's own entry
  says what it is, why it was deferred and what done looks like; how big and how urgent is one row
  in one table, so a re-rating is one edit and the two can never disagree.

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

**Nothing here is scheduled.** §2 is a menu the user draws an iteration from (§1), not a queue —
the triage below says how big a thing is and what it would buy, never that it is next.

### 2.0 Triage

Every open item, rated on one line. **The ratings live only here** — the entries below keep the
what/why/done prose and repeat none of it, so there is one place to edit when a rating changes.

- **Size** — S: an afternoon · M: a few days · L: a week or more, or open-ended.
- **Impact** — who notices. *High*: a player or reader sees a difference. *Medium*: the user or a
  future session does. *Low*: nothing visible today; it is insurance or tidiness.
- **Priority** — **1** worth doing in the next iteration the user opens · **2** do when the surface
  it governs is next opened anyway · **3** only when a symptom appears, or when its blocker clears.
  **Priority is a proposal.** The user picks iteration contents (§1); a pick overrides this column
  without argument, and the ratings are re-read, not re-litigated.

| ID | Item | Category | Size | Impact | Pri | The trigger to watch |
|---|---|---|---|---|---|---|
| F2 | Hall of Fame — arcade high-score board | Product | M | High | **1** | user's own proposal, 2026-08-22; needs the storage/moderation call first |
| F3 | Mob dialogue authoring (ADR 0006 slice) | Port leftovers | L | High | 2 | the largest remaining "reads as a cartoon" lever; needs the talk-to graph |
| F15 | NPCs on stage — troll, thief, cyclops drawn even when silent | Presentation | L (thief-only step M) | High | 2 | the game has characters the comic has never shown; needs a presence source |
| ~~F16~~ | ~~Player-chosen character designs for Hero, DM and the NPCs~~ **Hero + DM done at v0.28.0**; the NPC half moves to F15 | Product | — | — | — | shipped — see below |
| F4 | `SHOTS` framing table — further tuning | Presentation | S (tall-Hero half done v0.28.1) | Medium | 2 | next time the gallery harness or the pixel gate is open |
| F5 | The `Turn[]` autosave grows without bound | Web persistence | M | High *if it fires* | 2 | the first real `StorageFullError` in play — no symptom yet |
| F6 | Finding a *moment* in a long history | Presentation | L (first step S) | Medium | 2 | the S-sized half — tapping a panel to scroll the transcript — stands alone |
| F7 | Drawn logo mark, replacing the interim glyph | Product | S (blocked on art) | Medium | 2 | the user's artwork arriving; engineering side is small |
| F8 | Rename `web/` → `website/` | Repo hygiene | M | Low | 3 | after 6.3 ships and the gate has run once on the new layout |
| F9 | Panel grammar (ADR 0004) — open judgement | Presentation | L | Medium | 3 | whichever surface it governs gets touched; wants a pick, not a survey |
| F10 | Two ADR 0007 balloon enhancements | Presentation | M | Low | 3 | a real need in a running page — cost without a symptom today |
| F11 | `OrderAvatars` seating order un-stubbed | Port leftovers | M | Low | 3 | unblocked by F3 *or* F15 — either one puts a third body in a frame |
| F12 | Gate divergence — `fit.ts` vs `layoutAvatars` | Port leftovers | M | Low | 3 | `gate.test.ts`'s empty fallback set going non-empty |
| F13 | Invisible-routine audit, re-run after ADR 0003 | Engine / IR | M | Low | 3 | parity or completion slipping — both are clean today |
| F14 | Assisted input — SCUMM-style command picker | Product | L | High, and risky | 3 | post-MVP by decision; it *removes* the largest affect marker |

**F15 and F16 were one roster apart, and F16 built it.** `art/src/roster.ts` plus
`art/tools/rosterpack.ts` are the reusable half: a validated pool per role, packed as one sheet and
one manifest per character. F15 adds NPC roles to that table and NPC bodies to the stage; it needs no
new casting machinery.

**Two ratings are worth arguing with before acting on them.** F5 is the only *latent failure* in the
list — it is priority 2 because nothing has broken, not because breaking would be cheap. And F14's
impact is high in both directions: it is the one item that could make the comic worse.

---

### 2.1 Presentation & authoring judgement

- **[F15] NPCs on stage — the troll, the thief and the cyclops drawn in the panel, even when they
  say nothing.** Proposed by the user 2026-08-22. Today the comic pane has exactly two bodies in it,
  ever: the Hero and the DM. The game's characters exist only as prose the DM reads aloud — the
  troll blocking the way, the thief lifting a treasure out of the Hero's hands — so the comic never
  shows the cast the game is *about*. Casting comes from the same source the Hero and the DM do:
  `original-projects/comic-chat/v2.5-beta-1-modern/comicart/` holds ~30 characters, packed by
  `art/tools/avbpack.ts` into a sheet plus a `cast.json` role entry.
  *This is not F3.* F3 is mobs **speaking**, which needs the talk-to graph and the dialogue
  authoring under it. This is mobs **present**, which needs only to know who is in the room — a
  much cheaper claim, and the one that changes what the reader sees on the most turns.
  *Why deferred (2026-08-22):* the presence question has no cheap honest answer yet, and the wrong
  answer is worse than the gap. **A static NPC never emits an event**: the troll sits in
  `TROLL-ROOM` from the start and the event stream says nothing about him until he is fought, so
  presence cannot be folded out of `object-moved` the way the Hero's own room can. The world
  document gives *initial* residency, which goes stale the moment he dies — a comic that keeps
  drawing a dead troll is a worse bug than one that never drew him. The honest source is a
  **read-only scope query (an ADR 0002 amendment, pull not push — the same one F14 needs)**;
  `engine/src/scope.ts` already computes the answer.
  *The cheap first step is the thief*, who wanders: his daemon emits roughly one `object-moved` a
  turn, so his presence *is* foldable from the stream today, and `salient()` already decides when a
  move of his matters to the reader.
  *Two things it drags in:* a third body changes the panel's economics — `BALLOON_HEADROOM` and the
  two-shot were tuned for two (see `docs/PITFALLS.md` → Web), so the density baseline and the pixel
  gate both move and both need looking at, not just re-accepting. And it makes **F11 real**:
  `OrderAvatars` seating is stubbed because there is nothing to order, which stops being true the
  first time three bodies share a frame.
  *Done looks like:* walking into the troll room draws the troll, fighting him draws the fight, and
  killing him stops drawing him — from a presence source that cannot go stale, with the gate and
  the density baseline re-read rather than rubber-stamped.

- **[F4] `SHOTS` framing table — further tuning.** ◐, first pass at v0.16.3, **tall-Hero half closed
  at v0.28.1**. The ADR fixes which camera rung fires; these fill/reveal/backdrop numbers make each
  rung legible on screen.
  *Closed at v0.28.1 — the closer rungs across the roster.* `fill` scales by body height while a
  reader reads closeness off the *head*, so one number put chins between 81% and 91% of the panel on
  `close-up` (and tiki's jaw at 107%, off the frame). `MAX_HEAD_HEIGHT` caps the head under the
  balloon band: chins now land at 81–82% for every Hero, the packed Hero is pixel-identical, and the
  Guide is whole rather than cropped. `web/tools/shots-grid.ts` is the harness that showed it — one
  rung across every Hero, geometry printed beside the images. Cost accepted deliberately: the Guide
  loses its push-in past `medium`, because rung 4 is a close-up *on the Hero*.
  *Still open, and now the top of this entry:* **`reaction` is not a reaction shot.** Its `fill` of
  2.1 never survives two bodies — the row shrink (`panel.cpp:577`) pins it near 1.05 — so the
  game-over beat renders indistinguishable from `close-up`. It wants a decision (a solo rung? a rung
  that pushes the Guide off-stage?), not a number. Also unresolved and deliberately left:
  `establishing`≈`wide`, inherent to solo-Hero scenes.
  *Done looks like:* each rung visually distinct in the gallery harness (`web/gallery.html`) **and in
  `shots-grid.ts` across the roster**, with the pixel gate re-accepted after looking at the images.

- **[F6] Finding a *moment* in a long history — the half of strip navigation the jump control does not
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

- **[F9] Panel grammar (ADR 0004) — open authoring judgement.** Page composition (§5), §4a breakpoints,
  PDF byte size, pane-scroll coupling. Amend the ADR, not the discussion doc.
  *Why deferred:* each becomes urgent only when the surface it governs is touched.
  *Constraint:* PDF export is deliberately **not** WYSIWYG — once panel width is a viewport
  function, WYSIWYG would have to canonize one reader's window. `layout.ts`/`cellFor` is where a
  print/PDF page policy would go, beside the on-screen one.
  *When it comes up:* the user wants **a recommendation, not a survey** — lead with a pick.

- **[F10] Two ADR 0007 balloon enhancements, considered and deferred as larger/optional.** A fuller
  permuted-spline outline (we ship a lighter `wavyEdge` ripple), and route-region multi-balloon
  collision (our panels are 1–2 balloons).
  *Why deferred:* no observed need; both are cost without a symptom.
  *Revisit only if* a real need appears in a running page.

### 2.2 Port leftovers (ADR 0008 scoped these out on purpose)

ADR 0008 is complete. What it left open is only what it declared out of scope — F3 and F11 below
need the same missing thing, **the talk-to graph that mobs bring**, so they are one piece of work.

- **[F3] Mob dialogue authoring — an ADR 0006 slice.** The comic pane is already N-capable (a test
  injecting a mob line proves it); what is missing is the mapper deciding *when and what* a mob
  speaks.
  *Done looks like:* mob turns produce panels from real game events, not fixtures.

- **[F11] `OrderAvatars` seating order + histeresis un-stubbed.** Currently stable-by-insertion-order;
  `DoGreedyOrdering` (`panel.cpp:403`) needs the talk-to graph.
  *Why deferred:* un-stubbing without mobs would be untestable — nothing to order.
  *Done looks like:* the greedy ordering ported and cited, gated by the N≥3 fixtures
  (`web/tools/cast-fixture.ts`, `web/test/bodies.test.ts`), pixel gate re-accepted after looking.

- **[F12] Known gate divergence — `fit.ts` estimates arrow positions, `layoutAvatars` places them.** ☐
  *No longer observable since M6.1g:* widening `BALLOON_HEADROOM` to 0.44 gave `mob4-p02` enough band
  that the estimate stopped mattering, and `gate.test.ts` now pins the `stackBalloons` fallback set at
  **empty**. The two sides still disagree; the disagreement has slack to hide in.
  *Why deferred:* documented cost of estimating arrow positions (ADR 0008 Phase 2b/4), and now with
  no symptom at all.
  *Done looks like:* the two sides agree — and that empty-set assertion is the one that will notice
  first if the slack runs out.

### 2.3 Engine / IR hygiene

- **[F13] Invisible-routine audit, re-run after ADR 0003.** 360/439 ROUTINE forms extracted, 28
  catalogued, 51 invisible; 45 correctly excluded by design (parser/clock/turn-loop the engine owns).
  Tail worth triage: `BREATHE`, `MIN`, `UNTIE-FROM`, `FIND-IN`, `NO-GO-TELL`, `YES?`.
  *Why deferred:* parity is 143/143 strict and the game completes 350/350 — no symptom.
  *Done looks like:* **a standing report, not a one-off.** The catalog names the routine that failed
  but never what its failure cost, which is exactly why combat stayed hidden for two milestones.

### 2.4 Web persistence

- **[F5] The `Turn[]` autosave grows without bound.** `persistence.ts` already anticipates the wall —
  `StorageFullError` exists and autosave switches itself off with a message — but nothing bounds the
  history against a ~5 MB quota.
  *Why deferred:* no observed failure yet, and every bound is a decision about what a saved game *is*
  (a full replay log is what makes resume renderer-independent — see the module header before
  trimming anything).
  *Done looks like:* a measured panel/byte budget for a completed game, then either compression or a
  bounded window that keeps `SaveState` authoritative and degrades the *strip*, not the world.

### 2.5 Product & website features

- **[F2] Hall of Fame — an arcade high-score board for players who finish the game.** Proposed by the
  user 2026-08-22 after the v0.27.5 ending fix made the win visible. A player who reaches the Stone
  Barrow is offered — opt-in, dismissible — a prompt for initials or a nickname; the finished run is
  recorded and shown on the landing page as a cabinet-style score table, ranked by **moves** (every
  winner scores exactly 350, so moves is the only arcade metric the game has).
  *Why deferred (2026-08-22):* it is the first thing in the project that stores data from a
  visitor, and both branches of it — the storage and the moderation — are decisions the user should
  make deliberately rather than inherit from an implementation. Nothing in flight blocks on it.
  *Why it is possible at all despite "static site":* the site is on **Cloudflare Pages** (6.5-beta),
  which serves Pages Functions from the same origin. A board needs no separate backend, no CORS and
  no new host — one function directory and one database that the existing Cloudflare account
  already covers on its free tier. This is the reason to *not* reach for a third-party form service.

  *Shape, if it is built as recommended:*

  | Piece | Decision |
  |---|---|
  | Storage | **D1** (SQL), not KV — the board is a sorted top-N query, which KV would make a full scan and re-sort on every read |
  | API | `functions/api/hof.ts` at the **repo root** (Pages resolves `functions/` against the project root directory, which is the repo root here — *not* `web/`): `GET` returns the top N, `POST` records one run |
  | Table | `hall_of_fame(id, name, score, moves, country, finished_at)` |
  | Trigger | the victory panel — the comic already knows (`marker: "victory"`, `kind: "terminal"`, `web/src/comic/mapper.ts`), so nothing new needs to detect the ending |
  | Display | monospace rows on `web/index.html` in the existing `tokens.css` palette — `1ST  DKM  🇰🇷  350  411 MOVES` — no new assets |

  *The country column, and the rule that goes with it (user's requirement, 2026-08-22):* players
  stay anonymous apart from the name they type, **plus** a country. It comes from Cloudflare's
  `request.cf.country` (equivalently the `CF-IPCountry` header) — resolved at the edge, attached
  server-side, so the client neither sends it nor can spoof it, and no geo-IP library is involved.
  **Store the two-letter code and never the IP address.** The IP is what the country is derived
  from in-flight; writing it would turn a decoration into a personal-data column for no gain. If
  per-IP rate limiting is wanted, use a salted hash in KV with a short TTL, not a column. An ISO
  code renders as a flag by offsetting its letters into the regional-indicator range — again, no
  assets. Handle `T1` (Tor), `XX` and absent as an explicit unknown rather than a wrong flag, and
  expect VPN users to be filed under the wrong country: this is a decoration, not a claim.

  *What cannot be promised, and must not be designed around:* **the client cannot be trusted.** A
  static page can POST any score. Verifying honestly would mean replaying the submitted command log
  in the Worker — the engine *is* platform-independent enough to run there (that property is real
  and this is the first place it would pay off) — but a winning run is ~420 turns and blows the free
  tier's 10ms CPU budget per invocation, and there is no paid budget for this project. So the board
  ships with plausibility checks only (score exactly 350, a sane move range, rate limiting) and is
  understood as an **arcade cabinet, not a ledger**. Anyone who wants a fake entry on it can have
  one; that was also true of the machines this imitates.
  *Moderation is part of the feature, not a follow-up:* names are user input rendered on a public
  page — a length cap, a character allowlist (3–12 arcade-style characters reads best), and a way
  for the user to delete a row.
  *Done looks like:* a visitor finishes the game on the deployed site, is offered the prompt, and
  their entry appears on the landing page's board with their flag; declining leaves no record at
  all; and the user can delete any row.
  *Alternative if the storage decision goes the other way:* a **localStorage-only** personal board
  ("your runs") with a shareable brag URL — no backend, no moderation surface, no shared board.
  Worth naming because it is the version that costs nothing to keep running forever.

- ~~**[F16] Player-chosen character designs — a "choose your cast" screen on a new game.**~~
  **Done at v0.28.0, for the Hero and the Dungeon Master.** A new game opens on a picker built from
  `roster.json`: eight Heroes and seven Dungeon Masters, the user's roster of 2026-08-22, each one
  already past ADR 0004 §11's four gates. The choice rides in the save envelope as an optional field
  (`persistence.ts`) so a resumed game re-draws its history with the cast it was read with, and in a
  standing preference key so it survives `/restart`; `/cast` re-opens the picker on a reload, the
  same swap `/load` uses. Art is fetched per cast, never per roster — the picker's first fetch is
  names only, and a preview pulls one sheet when the player lands on a character. The pixel gate is
  untouched: `cast.json` still packs dan and tiki, and a pick is a runtime skin (gate clean, 24/24).
  *What did not ship, and why:* **the NPC third**. Casting the thief, troll and cyclops means putting
  them on stage, which is F15's whole content — there is no picker to add them to until there is a
  body to draw. The three fixed NPCs in the survey's roster stay reserved for it.
  *Two costs the survey predicted, as they turned out:* the payload cost was real and is paid by
  per-cast fetching (15 sheets are ~1.4 MiB; one cast is ~150 KiB). The **framing** cost has not bitten
  at the shots the opening uses — Lynnea, the tallest Hero at 481px against dan's 388, was played and
  looked at and sits in the panel correctly. The closer rungs were the ones that had not been looked
  at, and they had indeed drifted: **fixed at v0.28.1 under F4**, where the roster's head fractions,
  not its heights, turned out to be what the dan-tuned ladder was blind to.
  *Still open, if it is ever wanted:* per-cast goldens (deliberately not built — see
  `docs/PITFALLS.md`), and a picker that ranks rather than lists.

- **[F7] Drawn logo mark, replacing the interim glyph.** `docs/DESIGN.md` §3.7 ships the site with a
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

- **[F14] Assisted input — SCUMM-style command picker.** Designed (panel-grammar discussion §15),
  deferred to after the MVP by decision.
  *Two constraints when it comes up:* Zork's 135-verb list **is a spoiler table** (`ECHO`,
  `ODYSSEUS`, `PRAY` *are* solutions) — so a fixed core verb set with puzzle verbs typed-only; and
  it **structurally removes `parser-miss`** (12.7%, the largest affect marker), flattening the comic
  unless something replaces it.
  *Prerequisite:* an **ADR 0002 amendment** — a read-only query API (`objectsInScope()`, pull not
  push), leaving the event stream at 1.0.0. `engine/src/scope.ts` already computes the answer.

### 2.6 Repo & release hygiene

- **[F8] Rename `web/` → `website/`.** `docs/DESIGN.md` §6 makes `web/` the website root — the landing
  page at its root, the game nested at `web/play/` — so the folder name now undersells what it holds.
  *Why deferred (2026-08-02):* the rename touches `package.json`, `tsconfig.build.json`, the
  `dist/web/src/…` output path, test imports and possibly the pixel-gate golden. That is mechanical
  churn against a 292-test, gated package for a naming win, and it is **fully separable** from the
  layout decision itself.
  *When:* after 6.3 ships and the pixel gate has been run once on the new layout. Until then, fix
  `web/package.json`'s description so it says "the website", not only the game shell.

### 2.7 Closed — kept for the record

Struck through rather than deleted, per this file's own rule: an item that vanishes silently gets
re-proposed. None of these is work.

- ~~**[F1] A dedicated win-screen render for entering `STONE-BARROW`.**~~ **Done at v0.27.6.** The
  ending's panels draw `barrow-interior`, keyed on the `victory` affect marker because Zork I models
  no room inside the barrow (`backdrop.ts` → `MARKER_BACKDROPS`); the Hero's declaration opts out
  per line, so the frame at the door is still the exterior. The art is no longer orphaned, so the
  "delete it as dead art" branch is closed too. Detail: `WORKLOG.md`.

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

---

## 3. Not in this file

- **ADR 0006 Slice 5 (session-recap PDF export)** — the last open ADR slice, tracked in `HANDOFF.md`
  as live work, not backlog.
- **Milestone 6 stages** (asset separation, neutral branding, the website) — those are release
  scope, defined in `docs/DEVELOPMENT_PLAN.md`.
- **Durable cautions and operating notes** (the pixel gate's rules, engine hazards, standing method
  notes) — those stay in `HANDOFF.md`; they are not work items, they are things that must be true
  at the start of every session.
