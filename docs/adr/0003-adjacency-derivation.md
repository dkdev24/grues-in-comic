# ADR 0003 — Room Adjacency as a Derived World-Document Field

- **Status:** Accepted
- **Date:** 2026-07-20
- **Stage:** 4.7 (closes the last M4 blocker on walkthrough 10)
- **Related:** ADR 0001 (behavior representation — I-SWORD was deferred there), ADR 0002 (engine runtime — why the engine must not own this)

## Context

`I-SWORD` (1actions.zil:3851) is the elvish sword's daemon. Each turn, if the player carries the sword, it sets a glow level: 2 when a villain is in the current room, 1 when one is in an *adjacent* room, 0 otherwise — printing only when the level changes.

The adjacency test is written as Z-machine memory access:

```
<SET P 0>
<REPEAT ()
  <COND (<0? <SET P <NEXTP ,HERE .P>>> <RETURN>)
        (<NOT <L? .P ,LOW-DIRECTION>>
         <SET T <GETPT ,HERE .P>>
         <SET L <PTSIZE .T>>
         <COND (<EQUAL? .L ,UEXIT ,CEXIT ,DEXIT>
                <COND (<INFESTED? <GETB .T 0>> <SET NG 1> <RETURN>)>)>)>>
```

`NEXTP` iterates a room's properties by *number*; the `LOW-DIRECTION` guard keeps the direction properties; `PTSIZE` reads the property's byte length to classify the exit; `GETB … 0` reads the destination room out of byte 0.

None of that survives into the IR. Exits are modeled structurally (a `direction` and a typed variant — `to`, `blocked`, `conditional`, `door`, `routine`), so there is no property-number space to walk and no byte 0 to read. The extractor is mechanical by design and could not translate the loop; `I-SWORD` had sat in the complex-routine catalog since stage 3.5, which cost four turns of walkthrough 10 and was the last thing blocking it from verifying strictly.

ADR 0001 deferred this to "M4 protocols … needs exit reflection; decide builtin vs op at stage 4.1". This is that decision.

## Decision

### 1. Adjacency is derived at extraction time into the world document

`Room.adjacent?: string[]` holds the ids of rooms the room declares a static exit to, deduped, in `exits` order. `deriveAdjacent()` in `ir/src/schema.ts` computes it, and `extract-world.ts` emits it.

**Declared, not reachable.** Exits of kind `to`, `conditional`, and `door` are included — the IR spelling of UEXIT/CEXIT/DEXIT. A conditional exit whose global is currently false and a door exit whose door is currently shut are both *in* the list, because the ZIL tests the exit's shape and never its state. `blocked` (NEXIT — a message, no destination) and `routine` (FEXIT/`PER` — the destination is computed) are excluded, exactly as the `PTSIZE` test excludes them.

This distinction is the field's main hazard and is documented on the field itself: `adjacent` answers "what rooms does this room name", which is **not** "where can the player go from here". It must not be used for pathfinding or for a map view.

### 2. The engine materializes it; it does not compute it

At load, each room's list becomes a `pure` `ltable` in state, reachable from behavior as an ordinary room property (`adjacentRooms`). The IR document owns *what* is adjacent; the engine owns only the runtime representation.

This keeps ADR 0002's line intact. Had the engine computed adjacency from exits on demand, a piece of Zork's world model would live in engine code; had it hard-coded the glow, the game logic would.

### 3. The extractor rewrites the exit-scan idiom onto that list

`RoutineTransformer.exitScan()` structurally matches the ZIL shape above and emits an index walk over `adjacentRooms`, with `<GETB .T 0>` replaced by the element. The `LOW-DIRECTION` guard and the `PTSIZE` test have no lowered form because `deriveAdjacent` already applied both — which is what makes the two halves of this ADR one decision rather than two.

**This is a rewrite, not a translation** — the only place in the extractor where output is not a mechanical image of its input. It is fail-closed: every clause of the match must hold, or the method returns `undefined`, the REPEAT takes the ordinary path, and the routine catalogs on `NEXTP`/`GETPT` exactly as before. A near-miss can cost extraction; it cannot produce a plausible-looking loop over the wrong thing. `ir/test/exit-scan.test.ts` asserts that fallback by perturbing single atoms in the idiom.

### 4. No new IR ops

The rewrite is expressed entirely in the existing vocabulary (`prop`, `table-get`, `gt?`, `add`, `loop`, `break`), so the behavior AST is unchanged and ADR 0001's growth log needs no entry. `adjacentRooms` is added to `BEHAVIOR_PROPERTY_KEYS` — the only key there with no ZIL property atom behind it.

## Consequences

- `I-SWORD` extracts. Walkthrough 10 verifies strictly, and per-turn parity went from 117/117 strict turns to 143/143.
- **The world document now contains derived data for the first time.** Everything else in it transcribes the source. The mitigation is that `validate.ts` re-derives `adjacent` from `exits` and fails on disagreement, so a hand-edited or stale list is an error rather than a silent divergence — but the precedent is real, and further derived sections should be argued for on their own merits rather than by pointing at this one.
- **The static-exit-graph assumption is now load-bearing.** Zork I never adds or removes an exit at runtime (its variability lives in exit *conditions*, which this correctly ignores), so precomputation loses nothing here. A future game that mutates its exit graph would invalidate the precomputed list, and would do so *quietly* — the sword would simply stop noticing a new neighbour. That game forces the reflection op described under Alternatives; this field then becomes an optimization rather than the mechanism.
- Two turns of walkthrough 10 remain quarantined per-turn, for a different reason than before: the glow reports the *outcome* of the randomized fight (the reference knocks the troll unconscious and it stays next door; a given engine seed may kill it). The glow itself is verified directly, at all three levels and on the transitions between them, in `engine/test/engine.test.ts`.

## Alternatives Considered

- **A general `exits-of` reflection op** returning structured exit records, with generic iteration and field access. The most expressive option, and the only one that would also serve `OTHER-SIDE` (gverbs.zil:2173, which needs the direction *number* and a door match — a different shape this ADR does not address). Rejected for cost: it drags list values, record access, and the five-variant `Exit` union into the behavior AST to serve two call sites.
- **A quantifier op** (`any-adjacent(room, predicate)`) instead of a list. Matches the ZIL closely — the original short-circuits and never materializes a list — and avoids introducing collection values. Rejected because the derived field needs no new op at all; this stays the fallback if derived data in the document proves to be a mistake.
- **An engine builtin.** Defensible: "enumerate a room's exits" is world-model reflection, the same category as `GETP`, which is already a Group A builtin. Rejected because the *filter* is not neutral — deciding that CEXIT and DEXIT count while FEXIT does not is a decision about what the sword can sense, and it belongs where a reader can see it beside the exits, not inside the engine.
- **A villain-side threat field** that villains publish and the sword queries. Rejected as the wrong altitude: it encodes Zork's combat model into the IR to avoid encoding a graph query.

`I-CYCLOPS` (`<NTH …>` over a table) is sometimes grouped with `I-SWORD` as "the same shape". It is not — it indexes a table rather than scanning exits — and nothing here addresses it.
