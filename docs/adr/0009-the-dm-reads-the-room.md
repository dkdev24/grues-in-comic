# ADR 0009 — The DM Reads the Room: the caption channel retires and the box becomes metadata

- **Status:** Accepted (building — 6.1c landed v0.20.0, 6.1d v0.21.0; 6.1e–6.1f in `docs/DEVELOPMENT_PLAN.md` §6.1)
- **Date:** 2026-08-01
- **Supersedes:** ADR 0004 §2/§2a and §3 *insofar as the caption is a **script line** in the panel's balloon list* (`BM_ACTION`, `CBWoodringBox`) — the read-aloud text moves into the DM's speech balloon and the box becomes panel metadata; ADR 0005 §3's noise-drop **as an unconditional rule** (a refusal that has a line to say is now kept); ADR 0006 §4's "the resolved action outranks the Hero's reply" **as a permanent exclusion** (it becomes a per-panel ordering, not a suppression)
- **Preserves (non-negotiable):** ADR 0002 (the event contract — consumed, never extended); the DM stays **presentation-only** — no game state, unaddressable, removable (ADR 0004 §3); the mapper stays a **deterministic pure function of the event stream**, canvas-free, so `replayPanels` and the parity oracle still hold (ADR 0004 §5, ADR 0005/0006 testing contracts); **dialogue is authored at build time and committed as data, never generated at runtime**; `page.ts` stays a faithful port and keeps every panelization decision (ADR 0007, ADR 0008)
- **Related:** `docs/DEVELOPMENT_PLAN.md` §6.1 (the diagnosis and decisions D1–D5 this records), `web/tools/density.ts` (the instrument every claim here is measured with), `wiki/the-guide.md`, `wiki/the-hero.md`

## Context

ADR 0006 gave the DM and the Hero a way to converse and Slices 1–4 built all of it. The
pane still does not read as a conversation, and since M6.1a that is a number rather than an
impression. Over the 606-turn corpus (11 scene walkthroughs + the completion oracle, seed
1234, the shipped tables):

| | |
|---|---|
| Turns where **both** characters speak | **28 — 4.6%, one every 21.6 turns** |
| …on the full-game oracle alone | **3 in 406 turns — one every 135** |
| Exchanges landing in **one** panel | 20 of 28 (8 split shot/reverse-shot) |
| Turns carrying a caption | **586 — 96.7%** |
| Turns whose kind is `refusal`, **all dropped by the Director** | **160 — 26.4%** |
| Turns with no affect marker at all | 343 — 56.6% |

§6.1 named four compounding limiters. The measurement re-ranks them, and the re-ranking is
what this ADR is built on: **the caption is the load-bearing one.** A `BM_ACTION` line
unconditionally opens a panel (`panel.cpp:1064`, faithful port), so on 96.7% of turns
panelization is instructed to break the panel — which is why 8 of 28 exchanges are split,
and why ADR 0005 §4's facing two-shot is the exception rather than the rule.

Two premises that motivated the fix turn out to be wrong, and the design has to account for
what is actually there:

- **The box is not the location name** (§6.1 already recorded this) — and it is also **not
  the room description.** `captionFor` shows *one sentence*: the marker-matched one, else
  the turn's first. First sentences run p50 24, p90 65, max 163 characters, while an
  arrival's full narration runs **p50 179, p90 422, max 588**. The comic has never shown a
  room description; it has shown its opening clause.
- **The 180-character limit is not silently eating long descriptions.** It drops 9 turns in
  606, and all nine are the same 188-character sentence. Raising it to 200 (D3) recovers
  exactly those nine and nothing else. The limit was never the problem — the channel was.

So "the DM speaks the room description" is not a re-route of the caption. It is **new text
on the panel**, three to nine times longer than what the box shows today, which is what makes
the split question (D3) real: greedily packed into ≤200-character balloons without splitting
a sentence, **44 of 81 arrivals fit in one balloon, 12 need two, and 25 need three or four.**

## Decision

### 1. The goal outranks the mechanism (D1)

The pane must read as a natural conversation between a DM and a solo player, as far as it
can. **Where a limiter and that goal conflict, the limiter goes** — every rule below that
retires an earlier decision is an instance of this, and none of them is a discovery of a bug.
The earlier rules were right for their slice.

**Volume of authored dialogue is an accepted cost**, not something to economise on. What
that does *not* license is generating it at runtime: the mapper is the parity oracle, a model
call would be non-deterministic, and there is no budget for a paid API. **Pre-generated means
authored at development time and committed as data** (`web/src/comic/script.ts`), pinned by
the golden dialogue sequence and measured by `tools/density.ts`.

### 2. The caption channel retires; the read-aloud text becomes the DM's speech (D2)

ADR 0006 §2 already settled that the caption *is* the DM reading the module aloud — one
voice in two registers. It left the text in a box because the box was there. It moves:

- **Narration the panel quotes is a DM speech balloon** (`BM_SAY`), not a `BM_ACTION` box.
  Room descriptions, ambient narration and system text all route here (D2). The register is
  read-aloud; the voice is the one `wiki/the-guide.md` settles.
- **The resolved action stays the Hero's** (ADR 0005 §1, unchanged): what he did is derived
  from events and is his to say.
- **Parser refusals become the Hero's** (D2). They are his frustration, not the module's
  boxed text, and at 26.4% of turns they are the largest single source of unspoken material
  in the game.

This is the decision that fixes the split-exchange problem *at its cause* rather than
working around it: with no `BM_ACTION` line on an ordinary turn, nothing tells `AddLine` to
break the panel, DM + Hero are two balloons the band can hold, and the facing two-shot
becomes the ordinary case. The panel is quieter in structure and louder in speech.

**The DM therefore has two registers with different economics, and the distinction is
load-bearing:**

| Register | Source | Cooldown | Authoring cost |
|---|---|---|---|
| **Read-aloud** | The turn's narration, verbatim | **None** — it is what happened | Zero |
| **Table-talk** | `GUIDE_SCRIPT` / `BEAT_SCRIPT` | Cooled (`GUIDE_COOLDOWN`) | The M6.1e corpus |

The cooldown exists so the *authored* voice does not wear out. It has no business gating
narration the player just caused, and after this ADR it does not.

### 3. The box becomes panel metadata: the location, on change only (D4)

The top-left box is drawn by the **renderer** from the panel's context — never entering the
script, never becoming a `PageLine`, never able to break a panel. It shows the **room's
display name**, and **only on the panel where the room changes** (D4); the status bar already
carries the persistent answer, so repeating it every panel is noise.

Mechanically the mapper gains a `roomTitles` table alongside its `names` table (same shape,
same source — the world document, resolved by the caller), and `PanelContext` carries the
resolved title. That keeps the lookup out of the renderer and the world document out of the
mapper's imports: data in, pure function, canvas-free, oracle intact.

### 4. A long description continues across panels; the Hero holds the last one (D3)

D3 says a long room description splits across two panels. The measurement says two is the
*typical* case, not the maximum — 25 of 81 arrivals need three or four balloons at 200
characters. So the rule generalizes, and it generalizes onto machinery that already exists:

1. **The description is packed into balloons of ≤200 characters, never splitting a
   sentence.** 200 is D3's raised limit, and the sentence boundary is what keeps the DM
   reading aloud rather than being interrupted mid-clause.
2. **Each balloon is one `AddLine`.** How many panels that becomes is `page.ts`'s decision,
   made by the real fit test — the port's job, not a policy invented here. A description
   that needs four balloons gets however many panels those four fit into.
3. **Nothing is dropped.** The old "a long sentence is dropped rather than trimmed" rule
   existed because the box could not continue; a balloon run can, so the reason is gone.
4. **The DM keeps the floor for the whole run**, and the **Hero is staged silent** in every
   panel of it but the last (`AddReaction` — he is listening, and his pose still answers the
   world's reply, ADR 0004 §9). **His line lands in the final panel**, beside the DM's
   closing balloon.

Rule 4 is the answer to "what is the Hero doing in the second panel", and it is chosen
because it makes the *arrival* — the most characterful beat in the game — end on the facing
two-shot D5 is asking for, instead of opening on one and trailing into monologue.

### 5. The Director drops a refusal only when it has nothing to say (D5's largest lever)

ADR 0005 §3 drops every `refusal` turn as noise. That was measured when a refusal carried no
balloon; under §2 above it carries the Hero's. **A refusal with a line is a beat and is
kept; a refusal with nothing to say is still dropped.** At 26.4% of turns this is the single
largest lever on D5, and it is also the funniest material in the game — the Hero arguing with
the parser is exactly the DM-and-player relationship ADR 0006 is built on.

**Consequence, stated up front: the panel stream gets longer.** More turns survive the edit,
so a playthrough is more panels. D1 governs — a comic where the two characters talk is worth
more than a short one — and the density report is where the cost is watched.

### 6. The Hero may report an action *and* answer (D5, ADR 0006 §4 rule 2 relaxed)

ADR 0006 §4 made the resolved action suppress the reply, to avoid two Hero balloons in one
panel that panelization would then split. With the caption no longer breaking the panel, the
premise is gone. **The action line and the reply may both appear**, action first (it is
derived and cannot be wrong; the reply is authored garnish, and garnish goes second). If the
pair does not fit, `page.ts` splits it exactly as it splits anything else — the fit test
decides, not a suppression rule written upstream of it.

The ordering survives as an ordering. What retires is the exclusion.

## The testing contract

Unchanged in kind, and it is what allows every break above:

- The mapper stays **pure, canvas-free, and stream-derived**. The new inputs (`roomTitles`)
  are data passed in; the new state (which room the box last showed) is a fold over turns
  already read, exactly like `visited` and `lastGuideTurn`.
- **`replayPanels` and the golden dialogue sequences still hold**, and the goldens grow: the
  description-splitting rule is a content assertion, not a shape one.
- **`web/tools/density.ts` is the gate on the goal.** Every slice re-runs it and accepts the
  move deliberately (`density:accept`). D5 is met when the report reads **one exchange every
  2–3 turns**, on the full-game oracle as well as the scene corpus — the oracle is the honest
  number, and it is the one that starts at 1-in-135.
- **The pixel gate (ADR 0008 Phase 3) will drift on every slice here** and must be re-accepted
  after *looking at the images*. Balloon placement is seeded by a hash of the panel's own
  speakers and text; this ADR changes both on nearly every panel in the game.
- Engine parity stays **143/143 strict**. Nothing here touches the engine, the IR or the
  event contract.

## Consequences

- **`captionFor` retires**, and with it the `CAPTION` speaker as a balloon. The `CAPTION`
  role id and `CBWoodringBox` class stay in the renderer: the box is still drawn, now from
  metadata, and `page.ts`'s `BM_ACTION` handling stays a faithful port whether or not this
  product emits one. **We keep the port complete and stop using it here** — the distinction
  ADR 0007 draws between the mechanical layer and our arrangement over it.
- **Panels carry more text.** The DM's read-aloud balloon is longer than the box it replaces
  and is subject to the fit test rather than to a hard character limit, so `BALLOON_HEADROOM`
  and the band geometry get exercised far harder than the corpus has exercised them. Expect
  `stackBalloons` fallbacks to appear where none were; the gate names them per case.
- **`wiki/the-guide.md` needs a section, not a rewrite.** The two registers (§2) are new to
  the identity document; the voice rules are not affected. `wiki/the-hero.md` gains the
  refusal register (§2) — his frustration is now a scripted voice with 160 turns of corpus
  behind it.
- **The authored corpus is larger than the scene numbers suggest.** The gazetteer is
  first-visit only, so the scene walkthroughs flatter it; a real playthrough is mostly
  revisits and refusals. M6.1e writes against the oracle's distribution, not the scenes'.
- **Reversibility.** The caption-as-line arrangement is recoverable from git and from ADR
  0004; nothing here deletes the mechanism, only the product's use of it.

## Implementation slices

Mapped to `docs/DEVELOPMENT_PLAN.md` §6.1, which stays the schedule of record.

1. **6.1c — the box leaves the line stream.** ✅ **Done (v0.20.0).** `PanelContext.roomTitle`
   drawn by the renderer on room change (§3); narration routes to the DM's balloon (§2);
   `captionFor` retired; the 200-character packing and the balloon run (§4) landed with it.
   Three things the design did not foresee, each now a rule and a caution in
   `docs/PITFALLS.md`:
   - **The caption was also holding the panel open.** With it gone, a room change clone-appended
     into the previous room's panel and a death frame was absorbed by the next turn — which
     deleted the `reaction` rung from the corpus outright (11 turns, 0 panels). Both now ask for
     the break explicitly with `<Brk>` (`panel.cpp:1067`).
   - **`roomTitle` must survive a clone-append**, or the box vanishes the moment a later
     same-room turn appends into the panel that opened the room. It is the one field that does not
     take the incoming context.
   - **The Hero has to be staged through the DM's whole run**, not only between description
     balloons: two DM balloons never share a panel, so an ordinary read-aloud + gazetteer turn is
     already a two-panel run, and without `<Chr>` he is absent from the first.

   Measured after the slice: **captions 96.7% → 0%**, exchanges landing in one panel **20 of 28 →
   24 of 28**, panels 411 → 478 (+16%, the predicted cost), DM balloons 54 → 420. Exchanges
   themselves are unchanged at 28 — they are 6.1d's to move.
2. **6.1d — the limiters go.** ✅ **Done (v0.21.0).** All four, as written: the Director's
   conditional refusal drop (§5), the cooldown retuned (§2), marker coverage widened
   (`parser-miss` and `routine-ack`), the action/reply exclusion relaxed to an ordering (§6).
   Two things the design did not name:
   - **The cooldown had to become *per beat*, not merely smaller**, and the gazetteer had to
     come out from under it. One shared budget was the mechanism behind two of the four
     limiters at once — a beat silenced an unrelated beat, and either silenced a room's one
     first-visit line for good. Shipped value **0**: measured at 1 the corpus reads one
     exchange every 3.8 turns and the oracle 5.8, both outside D5, because the markers that
     carry a playthrough arrive in clusters. What replaces the clock is the run.
   - **The density instrument was wrong once most turns spoke.** It attributed panels to turns
     through `panel.turn`, and a panel carries the context of the *last* line written into it,
     so whole turns vanished from the map and the split count printed negative. It now
     attributes per turn from the Director's own `PanelDelta`, and "in one panel" means the
     DM's authored line and the Hero's answer in one frame — not the whole turn in one frame,
     which a description run legitimately is not.

   Measured after the slice: **one exchange every 21.6 turns → 2.4, and on the full-game oracle
   135 → 2.6** (D5 met on both). 252 exchange turns of 606, all of them reaching the screen;
   **189 of 252 land the two-shot in one panel.** Panels 478 → 801 (+68%), the cost §5 said to
   accept. Table-talk balloons 54 → 308.
3. **6.1e — write the dialogue.** ◐ The largest slice, several sessions, sized by §Consequences.
   Exit: no scene falls back to silence over a full playthrough; run depths re-measured.
   **Session 1 (v0.22.0) — the refusals, and the mechanism they needed.** 6.1d met D5 on volume
   and the measurement underneath it was bad: **218 of 252 exchanges were a run's last line
   repeating.** Two moves fixed it, and both are amendments to ADR 0006 §4 rule 4 rather than
   new machinery here:
   - **The big markers split by what actually happened** — `parser-miss` became `not-here` /
     `not-carried` / `unknown-word` (measured shares ~95 / 54 / 11), and the *map's* refusal
     became `blocked-exit`, which is **114 turns of the corpus saying exactly "You can't go that
     way"** and had no marker at all. Downstream asks `markerFamily`/`isRefusal`, never a name.
   - **Runs gained a cycling tail and a per-beat cooldown.** Scripting the refusals at cooldown
     0 put the corpus at 1.6 — *past the bottom* of D5's band — so how often a beat is worth
     hearing is now written beside its lines.

   Measured after: density holds at **2.5 corpus / 2.7 oracle**, the worst-repeated line in a
   playthrough went **150 → 12**, distinct authored lines per playthrough ~30 → **91**. The
   cooldown clock also had to move off `turn.status.moves`, which does not advance on a refusal
   — see `docs/PITFALLS.md` → Web.

   **Session 2 (v0.23.0) — the rooms answer back, and D5 becomes the binding constraint.** The
   silence left after session 1 was censused before anything was written, and the census
   corrected the figure session 1 left behind: **220 turns of 606 carry no marker (36.3%)**, not
   56.6% — traversal 88, ambient 87, arrival 45 — and **164 of them were wholly silent** while
   56 had the DM narrating a room at a player who said nothing. That distribution chose between
   the two levers on the table:
   - **The gazetteer gained a Hero half** (`GuideScript` now takes a `BeatExchange`), authored
     for all 88 rooms. It was the narrow-and-safe lever and the census made it the wide one: it
     reaches **every** arrival, and a first visit happens once, so unlike a beat it **cannot wear
     out** — no run, no cooldown, no repeat to design around.
   - **`blocked-exit` widened** over 10 more turns the census turned up in the map's voice
     ("would need a machete", "no tree here suitable for climbing"). Two singletons were left
     alone on purpose: one turn in the whole corpus is a coincidence, not a beat.
   - **The `PanelKind` fallback was not built**, and should not be built on today's numbers —
     see below.

   Measured after: corpus **2.5 → 2.0**, oracle **2.7 → 2.4**, `07-forest-and-tree` **8.0 →
   2.3**, and no scene now reads worse than 2.3. **That puts the corpus on the bottom edge of
   D5's band, which is the finding this session hands forward: the remaining silence is bounded
   by D5, not by authoring effort.** 154 turns are still wholly silent and their composition is
   known (69 bare walks with no prose at all, 22 container states on examine, 8 floor items on
   entry, 8 room re-descriptions, 7 lamp toggles, 7 inventory listings, 6 waits, 5 score checks,
   ~22 one-offs). Filling any of them now is a **trade** — a turn taken from the refusal beats,
   which fire 283 times — or a decision by the user to move D5's band. It is not an addition.
4. **6.1f — verify.** Golden dialogue sequence re-pinned, pixel gate re-accepted after
   looking at the images, a full playthrough read in the browser.
