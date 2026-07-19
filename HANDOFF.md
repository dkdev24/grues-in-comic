# HANDOFF.md

Cross-session context. Update at session end.

---

## Current Version
**0.5.11**

---

## Project Status
**Grues in Comic** (was Comic-Zork). Repo: `dkdev24/grues-in-comic`.

Historical sources imported:
- `original-projects/zork1/` — ZIL source
- `original-projects/comic-chat/` — MS Comic Chat v1.0/2.1b/2.5

**Milestones:**
- M1 ✅: `importer/` — ZIL S-exp parser, validated, AST artifacts in `importer/artifacts/`
- M2 ✅: `ir/` — IR schema/validator; declarative-world (2.1) done; behavior AST + builtin layer (ADR 0001, 2.2); TS engine, JSON event contract (ADR 0002, 2.3, ⚑ Gate B); Graphify adopted per-module (2.4, ⚑ Gate A); OpenWiki not adopted
- M3 🔄: Semantic Extraction ZIL→IR (v0.5.x)
  - 3.1–3.4 ✅: 110 rooms/exits, 137 objects, 267 parser rules in `ir/artifacts/`
  - 3.5 🔄: 309 routines extracted, 52 catalogued (all triaged, ADR 0001 builtin list), 34/292 refs unresolved (88% coverage); IR schema 0.8.0
  - Batches done: a (prop/table), c (defaults/SET), arithmetic, b (loops), e (macro resolution), d (daemons/timers), builtin triage, f (expr-position tell/set-flag/PRINTN), g (expr-cond + abs/mod/min)
  - Next: batches h/i/j per ADR 0001 Group B
- M4 ⏳: Engine core (not started)

---

## Last Session (v0.5.10 → v0.5.11)
- **v0.5.11 — batch (g) expr-position cond + abs/mod/min**: IR schema 0.8.0 — expr `cond` (COND inside AND/OR or as an argument, yielding the taken clause's last value), plus `mod` (sign of dividend), `min` (n-ary → left fold), `abs` (−32768 wraps to itself). RANDOM and the bit ops stay denied. Unlocked CANARY-OBJECT, SHAKE-LOOP, SAILOR-FCN (only MOD in the corpus), CYCLOPS-FCN (only MIN); I-CYCLOPS → `<NTH>`, I-THIEF → `,ROOMS`, GRATE-FUNCTION → String-in-statement-position. `abs` is lowerable but unexercised by the corpus. 305→309 routines, catalog 56→52, unresolved 37→34 (88%); 124 tests
  - **Note**: this batch was interrupted mid-flight by a usage limit. The source work (interpreter/behavior/extract/validate) was already complete and typechecking; what was missing was the `irVersion` bump in the sample + artifact fixtures (3 failing tests), a stale `I-CYCLOPS`-fails-on-ABS assertion in `behavior-35d.test.ts`, and the batch (g) test file. All resolved — no source logic was changed on resume.
- **v0.5.10 — batch (f) expr-position statement ops**: IR schema 0.7.0 — exprs `tell`/`set-flag`/`clear-flag` (TELL/CRLF/PRINTN/FSET/FCLEAR inside AND/OR, yield true); PRINTN → TELL number part. Unlocked I-XB, RUSTY-KNIFE-FCN, I-RFILL, SAND-FUNCTION, V-DIAGNOSE + FIGHT-STRENGTH, I-CURE (closure); TROLL-FCN advanced to APPLY (batch i). 298→305 routines, catalog 61→56, unresolved 40→37 (87%); 113 tests
- **v0.5.8 — batch (d) daemons/timers**: clock is engine builtin (ADR 0001): QUEUE/INT/CLOCKER never extracted; interrupt record = 3-slot table [C-ENABLED?, C-TICK, C-RTN], QUEUE/INT return it so extracted GET/PUT works unchanged; CLOCKER fires at pre-decrement tick ≤ 1 (−1 = demon), honors CLOCK-WAIT; P-WON demon gating → stage 4.5. Reference impl in `ir/poc/world.ts`. QUEUE name-string targets join the closure; `<VALUE X>` added. Unlocked I-MATCH, I-XC, I-REMPTY, I-MAINT-ROOM, I-RIVER, I-FOREST-ROOM. Countdown golden: extracted I-MATCH runs through CLOCKER end-to-end
- **v0.5.9 — builtin triage complete**: every catalogued routine has a written disposition in ADR 0001's "Deliberate engine-builtin list". Group A (builtins by design): meta verbs, randomness (V-RANDOM, PICK-ONE), parser/scope/movement (LIT?, GOTO, V-WALK, GLOBAL-IN?, OTHER-SIDE, …). Group B (named future batches): (f) expr-position tell/set-flag + PRINTN, (g) expr-cond + abs/mod/min, (h) table-rest (→ I-LANTERN/I-CANDLES), (i) apply, (j) RFATAL, world-doc meta entities (ROOMS/GLOBAL-OBJECTS), M4 deferrals (READ, I-SWORD)
- Triage lowerings landed: Number stmt, bare entity atom, routine-name GVal → unlocked BELL-F, GO-NEXT, TRAP-DOOR-FCN
- 288→298 routines, catalog 59→61, unresolved 65→40 (86% coverage); 105 tests pass

---

## Next Actions (per `docs/DEVELOPMENT_PLAN.md`)
**M3 continues (Group B batches per ADR 0001 triage):**
1. **Batch (h)**: table-rest views — completes I-LANTERN/I-CANDLES countdown goldens
2. **(i)** apply (TROLL-FCN, AWAKEN, DESCRIBE-OBJECT, V-BOARD); **(j)** RFATAL; world-doc meta entities (ROOMS/GLOBAL-OBJECTS/LOCAL-GLOBALS — unblocks I-THIEF), nested VILLAINS tables
3. Newly surfaced by batch (g), not yet assigned to a batch: `<NTH …>` (I-CYCLOPS) and String-in-statement-position (GRATE-FUNCTION)
4. Stage 5.1 (Comic Chat) = filler
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
| `docs/` | Project documentation |
| `wiki/` | Semantic notes (hand-authored) |
| `<module>/graphify-out/` | Graphify graphs (config: `.graphifyignore`) |
| `CHANGELOG.md` | Public changelog |
| `WORKLOG.md` | Persistent history |
| `AGENTS.md` | Agent workflow rules |
| `CLAUDE.md` | Entry point → `AGENTS.md` |