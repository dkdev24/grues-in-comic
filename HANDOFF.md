# HANDOFF.md

Cross-session context. Update at session end.

---

## Current Version
**0.5.8**

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
  - 3.5 🔄: 295 routines extracted, 64 catalogued, 42/292 refs unresolved (86% coverage); IR schema 0.6.0
  - Batches done: a (prop/table), c (defaults/SET), arithmetic, b (loops), e (macro resolution), d (daemons/timers)
  - Next: builtin triage of long tail
- M4 ⏳: Engine core (not started)

---

## Last Session (v0.5.8)
- **Stage 3.5 batch (d) complete**: daemons/timers
- **Clock is engine builtin** (ADR 0001 appendix): QUEUE/INT/CLOCKER never extracted; interrupt record = 3-slot table [C-ENABLED?, C-TICK, C-RTN] (constants 0/1/2), QUEUE/INT return it so extracted GET/PUT works unchanged; CLOCKER newest-first, fires at pre-decrement tick ≤ 1 (−1 = demon), honors CLOCK-WAIT, increments MOVES; P-WON demon gating → stage 4.5. Reference impl in `ir/poc/world.ts`
- QUEUE name-string targets (`<QUEUE I-MATCH 2>`) join the extraction closure; `<VALUE X>` expr added
- 288→295 routines, catalog 59→64, unresolved 65→42 (86% coverage)
- Unlocked I-MATCH, I-XC, I-REMPTY, I-MAINT-ROOM, I-RIVER, I-FOREST-ROOM + FOREST-ROOM?, MUNG-ROOM
- Countdown golden: extracted I-MATCH runs through CLOCKER end-to-end; 101 tests pass
- Remaining daemons on true frontier: I-LANTERN/I-CANDLES (`<REST …>`), I-CYCLOPS (ABS), I-SWORD (NEXTP), I-THIEF (expr-`<COND …>`), I-XB (TELL-CR-arg), I-RFILL (FSET shape)

---

## Next Actions (per `docs/DEVELOPMENT_PLAN.md`)
**M3 continues:**
1. **Builtin triage**: ,ROOMS/,GLOBAL-OBJECTS iteration, RFATAL, GETPT/PTSIZE, SAVE/RESTORE/RESTART/QUIT/VERIFY, DIROUT/DIRIN, RANDOM/MOD/MIN, `<REST …>` (unlocks I-LANTERN/I-CANDLES countdowns), expr-`<COND …>` (I-THIEF), ABS/NEXTP/TELL-CR-arg → deliberate builtin list in ADR
2. Stage 5.1 (Comic Chat) = filler
3. After 3.5: M4 starts (walk map from IR); engine CLOCKER needs P-WON demon-region gating (stage 4.5)

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