# ADR 0005 — The Narrative Director: from Play-Log to Edited Retelling

- **Status:** Proposed
- **Date:** 2026-07-22
- **Supersedes (in part):** ADR 0004 §3 (Guide presentation-only *trigger*), §6 (one panel per turn), §2/§2a (the Hero balloon is the canonical command)
- **Superseded (in part):** 2026-08-01 — ADR 0010 recasts §1 *as an exclusivity* (the Hero also **declares his intent**; the resolved outcome becomes that declaration's garnish — §1's reason, that a balloon reading `n` is a play-log, is preserved and is the constraint ADR 0010 works under), and amends §3's traversal collapse *as an unconditional discard* (a collapsed run keeps one panel, but may no longer throw away the voice of every turn it swallowed). §2, §4 and the rest of §3 stand.
- **Preserves:** ADR 0002 (the event contract — still consumed, still not extended), ADR 0004 §7 camera ladder, §10 affect ordering, §2 verbatim captions, and the property that made §5 testable: a **deterministic pure function of the event stream with no engine internals**
- **Related:** `wiki/the-guide.md` (the Guide's settled identity — this ADR broadens its *trigger*, not its *character*)

## Context

ADR 0004 built a faithful projection of the transcript: one panel per turn, the Hero's
command in a thought balloon, the Guide keyed to room geography, affect computed for the Hero
alone. It works exactly as designed — and that is the problem. Tested live (v0.16.4), the comic
reads as a **visualized play-log, not a visual story**:

1. **The Hero thinks in commands.** `look`, `n`, `s` are control inputs, not thought. Nobody
   narrates their life as "North. North. Look." (`mapper.ts` pipes `turn.command` straight into
   `CBWoodringThink`.)
2. **The two characters never talk to each other.** The Guide fires on first-visit-to-a-scripted-
   room, independent of what the Hero just did, so it cannot *respond*. It is a caption on a timer.
3. **The Hero faces away from the Guide.** Affect is Hero-only; the two figures are posed by
   independent pipelines that never reference each other. Nothing frames an *exchange*.
4. **Trial-and-error is rendered verbatim.** One panel per turn means every failed parse, every
   redundant `look`, every wrong direction gets a panel. A comic is *edited*; a log is not.

The root cause is a category error: ADR 0004 treats the **parser transcript** and the **comic
script** as the same artifact. They are not. A transcript is second-person, imperative, and live.
A comic is third-person, past-tense, and edited — it narrates what happened *after* it happened,
and it leaves the dead ends on the cutting-room floor.

## Decision

Insert a **Narrative Director** between the turn stream and the panel stream. Where ADR 0004's
`Mapper` was `panel(turn) -> Panel` (exactly one), the Director is
`ingest(turn) -> Panel[]` (**zero to many**), buffering across turns so the comic becomes an
*edited retelling* trailing live play, rather than a live mirror of it.

The four subsystems, in dependency order:

### 1. The player is the author, not a character (Hero balloon = resolved action)

The player's command is **authorship of the Hero's action**, not the Hero's dialogue. The Hero
balloon is derived from the turn's **resolved events** (`object-moved LAMP→player`,
`player-moved →CELLAR`), which already carry the semantics the raw string only gestures at, and
which are already in scope in the mapper. An authored verb-template table keyed on
`(event-type, role)` renders the *outcome* ("*The lamp — mine now.*"), not the *input* (`take lamp`).
When no event is sayable, the balloon is **absent** and the action is carried by the figure pose
alone. Supersedes ADR 0004 §2/§2a for the Hero channel.

This is the highest-value, lowest-risk change and ships first (Slice 1), independently of the rest.

### 2. Beat detection: what earns a panel

The Director classifies each turn from its events (and the §10 affect signal), into one of:

- **Beat** — arrival in an unvisited room, acquiring/losing an object, a state change (open, reveal,
  score, door), combat, death, a salient NPC action. These become panels.
- **Traversal** — a `player-moved` to an already-visited room with nothing else. Collapsed.
- **Noise** — a parser refusal (`narration:system` — already a clean contract read, ADR 0004 §10),
  a redundant `look`/`examine` that revealed nothing new, a failed action. Dropped or collapsed.

Only beats are guaranteed a panel. Supersedes ADR 0004 §6.

### 3. Editing: the retelling lags, and is cut

The Director **buffers** turns and emits panels when a beat resolves:

- A run of pure noise is **dropped**. Ten failed attempts followed by a success render as the
  success — optionally preceded by **one** "the Hero fumbles" panel when the run exceeds a
  threshold, never as ten panels.
- A run of traversal is **collapsed** into the arrival at its destination (a montage panel is a
  later option, not v1).
- The comic therefore trails live play by up to a beat. The **console pane still shows every word
  live** (ADR 0004 §2's "narration is accompanied, never replaced" is unchanged) — only the comic
  is edited. This is the price of a story over a log, and it is paid on the right surface.

### 4. The Guide converses; the exchange is framed as a two-shot

- **Trigger broadened, character unchanged.** The Guide reacts to the **beat** (what the Hero just
  did), not only to room entry. It stays presentation-only per `wiki/the-guide.md`: it reads
  events, touches no game state, remains unaddressable and removable. A tiki idol that *reacts* to
  the Hero is still a tiki idol that "cannot help, only observe." Supersedes ADR 0004 §3's trigger;
  honors its constraint. `GUIDE_SCRIPT` gains beat-keyed entries alongside the room-keyed ones.
- **Two-party affect.** When a beat produces both a Hero action and a Guide reply, affect is
  computed for **both** figures and the camera promotes to a **two-shot with the figures facing
  each other** (ADR 0004 §7's `over-shoulder`/`wide` rungs, now driven by the *exchange* rather
  than by "a guide line exists and nothing else happened"). Resolves symptoms 2 and 3 together.

## The testing contract

ADR 0004 §5 was testable because the mapper was a **deterministic pure function of the event
stream holding only stream-derived memory**. The Director keeps exactly that property — it holds
buffered turns and beat state, all derived from the stream, reads no engine internals — so the
parity oracle (`replayPanels`) still applies. What changes is the *assertion*: from "one panel per
turn" to "this walkthrough produces this **panel sequence**." Golden panel-sequences per
walkthrough replace the 1:1 count. Determinism, replayability, and the no-engine-internals firewall
are all preserved; only the arity of the mapping changes.

## Consequences

- **The comic and the console can disagree in count and lag in time.** Intended. They are two
  renderings of one play session — one live and complete, one edited and past-tense.
- **The verb-template and beat-keyed Guide tables are new authored surfaces.** Bounded the same way
  §3/§10 bound theirs: a miss degrades to "no balloon," never to a wrong one.
- **Beat classification is the new load-bearing joint** (as the §10 regexes were for affect). It
  reads the event *contract* first (types, `system` channel, score deltas) and prose only as a last
  resort, keeping the firewall ADR 0002 exists to provide.
- **This is a multi-slice change to the parity-guarded core.** Ships behind green tests, one slice
  at a time (see HANDOFF Next Actions), never as a single rewrite.

## Implementation slices

1. **Hero balloon = resolved action** (§1). Local to the mapper + a verb-template table. No
   buffering, still 1 panel/turn. Ships and is judged on its own.
2. **The Director skeleton** (`ingest -> Panel[]`) wrapping the existing mapper, initially 1:1
   (a refactor with no behavior change; parity golden proves it).
3. **Beat detection + noise drop** (§2, §3 noise half). Golden panel-sequences replace the 1:1
   count.
4. **Traversal collapse** (§3 traversal half).
5. **Guide converses + two-shot** (§4). The visible buddy-comic payoff, last because it rests on
   1–4.
