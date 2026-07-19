# HANDOFF.md

Cross-session context. Update at session end.

---

## Current Version
**0.5.16**

---

## Project Status
**Grues in Comic** (was Comic-Zork). Repo: `dkdev24/grues-in-comic`.

Historical sources imported:
- `original-projects/zork1/` — ZIL source
- `original-projects/comic-chat/` — MS Comic Chat v1.0/2.1b/2.5

**Milestones:**
- M1 ✅: `importer/` — ZIL S-exp parser, validated, AST artifacts in `importer/artifacts/`
- M2 ✅: `ir/` — IR schema/validator; declarative-world (2.1) done; behavior AST + builtin layer (ADR 0001, 2.2); TS engine, JSON event contract (ADR 0002, 2.3, ⚑ Gate B); Graphify adopted per-module (2.4, ⚑ Gate A); OpenWiki not adopted
- M3 ✅: Semantic Extraction ZIL→IR (v0.5.x) — world-document unit complete
  - 3.1–3.4 ✅: 110 rooms/exits, 137 objects, 267 parser rules in `ir/artifacts/`
  - 3.5 ✅ (Group B complete): 346 routines extracted, 32 catalogued (all triaged, ADR 0001 builtin list), 39/292 refs unresolved (87% coverage); IR schema 0.13.0
  - Batches done: a (prop/table), c (defaults/SET), arithmetic, b (loops), e (macro resolution), d (daemons/timers), builtin triage, f (expr-position tell/set-flag/PRINTN), g (expr-cond + abs/mod/min), h (table views), i (apply), j (RFATAL); world-doc gaps 1 (meta entities) + 2 (table-valued globals) + 3 (nested tables/ITABLE)
  - Remaining catalog = Group A engine builtins by design + a one-off tail (NEXTP, NTH, String-in-stmt, bare `,ONBIT`/`,ACTORBIT`, non-atom FSET? flag)
- M4 ⏳: Engine core (next — not started)

---

## Last Session (v0.5.14 → v0.5.16)
- **v0.5.16 — world-doc gap 3: nested table elements + ITABLE**: IR schema 0.13.0 — a `TableElement` may be a `{table, offset}` pointer, **no new behavior ops**. VILLAINS is an LTABLE of three anonymous `<TABLE …>` rows; ZIL stores an *address* in the slot, which batch (h)'s `TableRef` already models, so `<GET ,VILLAINS .CNT>` hands HERO-BLOW a pointer it indexes straight through. Nested tables get a derived `parent#index` id and **no pointer variable** — ZIL never named them, so v0.5.15's flat-id exception does not widen. Three element forms had to be learned, two of them only visible once nesting worked: bare `<>` (the cyclops has no weapon), an atom naming a table-valued global, and a numeric `CONSTANT` — the last two are the melee message tables, deeply nested `(PURE)` LTABLEs whose leaves interleave strings with the `F-WEP`/`F-DEF` markers. Declaring the atom pulled the whole tree in: **tables 19→132**, globals 86→103. `<ITABLE NONE n>` now extracts as zero-filled `itable` storage (P-PRSO/P-PRSI); it addresses like `table`, so only `RuntimeTable`'s kind union changed. gparser.zil's `(LEXV)`/`(BYTE LENGTH)` ITABLEs stay **denied by design** — READ's parser buffers (Group A), not world state. Unlocked NOT-HERE-OBJECT-F; **HERO-BLOW advanced past the document to `operator RANDOM`**, a Group A builtin, so it is no longer a world-doc blocker. 345→346 routines, catalog flat at 32 (NOT-HERE-PRINT/`PRINTB` entered as the closure widened), unresolved steady 39/292; 184 tests
- **v0.5.15 — world-doc gap 2: table-valued globals**: IR schema 0.12.0 — `GlobalVariable.value` accepts a `{table, offset}` pointer; **no new behavior ops**. `<GLOBAL X <TABLE …>>` declares storage *and* a variable pointing at it; extraction emitted only the table, so `,X` read a global the document never had. **Wider than batch (h) reported**: 29 unbound reads across all 19 table-valued globals, not just LAMP-TABLE. Globals 66→86. **The pointer must stay a variable** — I-LANTERN/I-CANDLES advance by `<SETG LAMP-TABLE <REST .TBL 4>>`, so a `{op:"table"}` constant expr would have been unwritable and wrong; keeping it a global meant zero vocabulary change. Table and pointer share the one ZIL name (sole flat-id exception, narrowly enforced in `claimId`; the runtime already separates variable and table namespaces). **Validator tightened**: `global` ref kind was `global-or-table`, which is what let those 29 reads validate for five batches — now strict, and the artifact still passes. Golden boots the lamp daemon from document state alone (batch h's golden with its hand-seeding removed). Routine counts unchanged — this gap corrupted extracted routines rather than blocking them; 175 tests
- **v0.5.14 — world-doc gap 1: meta entities**: IR schema 0.11.0 — new `metaEntities` section, **no new behavior ops**. The 13 routines stuck on `unknown name ,ROOMS` / `,GLOBAL-OBJECTS` were blocked by the *document*, not the vocabulary: stage 3.2 dropped ZIL's three scaffolding objects, so `resolveName` had no entity to resolve to. They are now `{id, role, location?}` anchors (roles `rooms` / `global-objects` / `local-globals`) in the flat entity namespace, so `,ROOMS` lowers to a plain `{op:"entity"}` and `in?`/`first`/`next`/`equal?` work unchanged. **Not** entities-with-properties — GLOBAL-OBJECTS' FLAGS list and LOCAL-GLOBALS' DESCFCN/FDESC are ZIL property-slot allocation, not game state. **Membership stays derived** (rooms list + `global`/`local-globals` location kinds); only the anchors' own nesting is stored, because LOCAL-GLOBALS sits inside GLOBAL-OBJECTS and gparser.zil's scope walk climbs that edge. Validator enforces one anchor per role, meta-only parents, no cycles. Unlocked DESCRIBE-ROOM, FIRSTER, HACK-HACK, I-THIEF, PRE-TURN, ROPE-FUNCTION, TREE-ROOM, V-DISEMBARK, V-EAT, V-EXIT, V-FIND; RANDOMIZE-OBJECTS/V-CLIMB-UP advanced to RANDOM/GETPT. 324→345 routines, catalog 43→32, unresolved 29→39/292 (90%→87% — the widened closure reached more Group A builtin refs; nothing regressed); 165 tests. Also backfilled `docs/IR_SCHEMA.md`, which had drifted at schema 0.6.0 since batch b
- **v0.5.13 — batches (i) apply + (j) RFATAL — Group B complete**: IR schema 0.10.0 — expr `apply` calls a routine named at run time (`<APPLY <GETP .O ,P?ACTION> …>`); a false/absent name yields false **without calling** (Z-machine call-to-address-0, how the corpus probes objects with no ACTION). `apply` contributes no static call target — reachability comes from the world doc's `action` refs. **(j) needed no new vocabulary**: RFATAL is `<PROG () <PUSH 2> <RSTACK>>` = return M-FATAL (2); the handler protocol is already plain values (false/1/2) that only the M4 parser loop compares. RSTACK is load-bearing — JIGS-UP ends `<PROG () … <RFATAL>)>`, so a `<RETURN>`-style lowering would have `break`d the PROG and run on past the player's death. Unlocked TROLL-FCN, AWAKEN, DESCRIBE-OBJECT, V-BOARD, CANDLES-FCN, ITAKE, JIGS-UP, PRE-BOARD, V-TELL. 312→324 routines, catalog 50→43, unresolved 34→29 (90%); world doc grew to 66 globals / 19 tables as the closure widened; 150 tests
- **v0.5.12 — batch (h) table views**: IR schema 0.9.0 — expr `table-rest` (ZIL `<REST tbl bytes>`). Runtime values gain a table pointer: `BehaviorValue` splits into `BehaviorLiteral` (documents stay scalar) + `TableRef` `{table, offset}`; bare id = offset 0, views compose, `table-get`/`table-set` read through them. Offset counts **elements**, not bytes — the extractor halves the ZIL byte count and denies odd/non-literal. LTABLEs are not viewable (count word sits in the skipped slot). Unlocked I-LANTERN, I-CANDLES, LIGHT-INT; the batch (d) countdown goldens now run end-to-end (lamp dims through all three messages, burns out at the 0 terminator, table never written). 309→312 routines, catalog 52→50, unresolved 34/292 (88%, flat — the three are reached by call/QUEUE name, not by a world-doc ref); 135 tests
- **v0.5.11 — batch (g) expr-position cond + abs/mod/min**: IR schema 0.8.0 — expr `cond` (COND inside AND/OR or as an argument, yielding the taken clause's last value), plus `mod` (sign of dividend), `min` (n-ary → left fold), `abs` (−32768 wraps to itself). RANDOM and the bit ops stay denied. Unlocked CANARY-OBJECT, SHAKE-LOOP, SAILOR-FCN (only MOD in the corpus), CYCLOPS-FCN (only MIN); I-CYCLOPS → `<NTH>`, I-THIEF → `,ROOMS`, GRATE-FUNCTION → String-in-statement-position. `abs` is lowerable but unexercised by the corpus. 305→309 routines, catalog 56→52, unresolved 37→34 (88%); 124 tests
  - **Note**: this batch was interrupted mid-flight by a usage limit. The source work (interpreter/behavior/extract/validate) was already complete and typechecking; what was missing was the `irVersion` bump in the sample + artifact fixtures (3 failing tests), a stale `I-CYCLOPS`-fails-on-ABS assertion in `behavior-35d.test.ts`, and the batch (g) test file. All resolved — no source logic was changed on resume.
- **v0.5.10 — batch (f) expr-position statement ops**: IR schema 0.7.0 — exprs `tell`/`set-flag`/`clear-flag` (TELL/CRLF/PRINTN/FSET/FCLEAR inside AND/OR, yield true); PRINTN → TELL number part. Unlocked I-XB, RUSTY-KNIFE-FCN, I-RFILL, SAND-FUNCTION, V-DIAGNOSE + FIGHT-STRENGTH, I-CURE (closure); TROLL-FCN advanced to APPLY (batch i). 298→305 routines, catalog 61→56, unresolved 40→37 (87%); 113 tests
- **v0.5.8 — batch (d) daemons/timers**: clock is engine builtin (ADR 0001): QUEUE/INT/CLOCKER never extracted; interrupt record = 3-slot table [C-ENABLED?, C-TICK, C-RTN], QUEUE/INT return it so extracted GET/PUT works unchanged; CLOCKER fires at pre-decrement tick ≤ 1 (−1 = demon), honors CLOCK-WAIT; P-WON demon gating → stage 4.5. Reference impl in `ir/poc/world.ts`. QUEUE name-string targets join the closure; `<VALUE X>` added. Unlocked I-MATCH, I-XC, I-REMPTY, I-MAINT-ROOM, I-RIVER, I-FOREST-ROOM. Countdown golden: extracted I-MATCH runs through CLOCKER end-to-end
- **v0.5.9 — builtin triage complete**: every catalogued routine has a written disposition in ADR 0001's "Deliberate engine-builtin list". Group A (builtins by design): meta verbs, randomness (V-RANDOM, PICK-ONE), parser/scope/movement (LIT?, GOTO, V-WALK, GLOBAL-IN?, OTHER-SIDE, …). Group B (named future batches): (f) expr-position tell/set-flag + PRINTN, (g) expr-cond + abs/mod/min, (h) table-rest (→ I-LANTERN/I-CANDLES), (i) apply, (j) RFATAL, world-doc meta entities (ROOMS/GLOBAL-OBJECTS), M4 deferrals (READ, I-SWORD)
- Triage lowerings landed: Number stmt, bare entity atom, routine-name GVal → unlocked BELL-F, GO-NEXT, TRAP-DOOR-FCN
- 288→298 routines, catalog 59→61, unresolved 65→40 (86% coverage); 105 tests pass

---

## Next Actions (per `docs/DEVELOPMENT_PLAN.md`)
**M3 complete: Group B done, all three world-doc gaps closed. M4 is next.**
1. ✅ **Meta entities** — done in v0.5.14 (`metaEntities`, IR 0.11.0); I-THIEF unblocked
2. ✅ **Table-valued globals** — done in v0.5.15 (`{table, offset}` global values, IR 0.12.0); validator `global` ref kind tightened
3. ✅ **Nested table elements + ITABLE** — done in v0.5.16 (`{table, offset}` table elements, IR 0.13.0); HERO-BLOW now blocks only on Group A `RANDOM`
- The world-document unit is **complete**: the document loads and boots a world with nothing seeded by hand, which was the precondition for M4
4. One-off tail, unassigned: `<NEXTP …>` (I-SWORD, OTHER-SIDE), `<NTH …>` (I-CYCLOPS), String-in-statement-position (GRATE-FUNCTION), bare `,ONBIT`/`,ACTORBIT` (LIT?, V-SAY), non-atom FSET? flag (GOTO), `REST` with a non-literal byte count (PICK-ONE — Group A regardless)
5. Stage 5.1 (Comic Chat analysis) = filler, independent of every gate. Read `docs/comic-chat-paper.md` (the authors' SIGGRAPH '96 paper — balloon layout, character placement, gesture selection, camera zoom) alongside `original-projects/comic-chat/`; it explains the intent behind that source. Gitignored, so it may be absent from a fresh checkout — see the reference note in `docs/DEVELOPMENT_PLAN.md` M5
4. M4 can start against the Group A builtin contract (walk map from IR); engine CLOCKER needs P-WON demon-region gating (stage 4.5)

**M0 complete** (0.1–0.3):
- 0.1: ZILF/ZAPF 0.11.1, frotz 2.55; builds to `verification/build/zork1.z3` (86,696 bytes)
- 0.2: Transcript harness with 3 goldens; ZILF build ≈ shipped (banner + Kitchen object order differ)
- 0.3: Pipeline doc consolidated to `docs/AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md`

---

## Open Issues
- Neutral branding for commercial assets (engine/IR/importer)
- Kitchen object order (sack/bottle swapped) — decide for engine parity (stage 4.4)

---

## Key Paths
| Path | Purpose |
|---|---|
| `importer/` | ZIL parser, tests, AST artifacts |
| `ir/` | IR schema, validator, extraction → `artifacts/zork1.world.json` |
| `original-projects/zork1/` | ZIL source reference |
| `original-projects/comic-chat/` | Comic Chat source reference |
| `docs/comic-chat-paper.md` | Kurlander/Skelly/Salesin SIGGRAPH '96 Comic Chat paper — presentation-algorithm reference for stage 5.1/5.3. **Gitignored** (third-party); local-only, may be absent |
| `docs/` | Project documentation |
| `wiki/` | Semantic notes (hand-authored) |
| `<module>/graphify-out/` | Graphify graphs (config: `.graphifyignore`) |
| `CHANGELOG.md` | Public changelog |
| `WORKLOG.md` | Persistent history |
| `AGENTS.md` | Agent workflow rules |
| `CLAUDE.md` | Entry point → `AGENTS.md` |