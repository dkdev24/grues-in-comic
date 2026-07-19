# HANDOFF.md

Cross-session context. Update at session end.

---

## Current Version
**0.6.3**

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
- M4 ⏳: Engine core (v0.6.x) — 4.1 ✅ world runtime, object tree, exit resolution, seeded RNG, ADR 0002 contract as code; 4.2 ✅ lexicon, scope, command parser; 4.3 ✅ interpreter, Group A builtins, dispatch chain, save/restore; 4.4 ✅ transcript harness — **all 3 goldens replay with zero diff (30/30 turns)**. 4.5 remaining

---

## Last Session (v0.6.3) — M4 stage 4.4: transcript replay harness

**All three golden transcripts replay with zero diff — 30/30 turns, 100%.** The goldens are
dfrotz captures of the shipped Release 119 story file, so this is a diff against real
Zork I, not against our own earlier output. 79 engine tests (11 new), IR 184/184.

- **`harness/golden.ts`** — parses dfrotz captures into per-turn blocks (status lines are
  the boundaries) and normalizes away presentation on both sides: banner, status line, `>`
  prompt, end-of-session dialogue, and hard wrapping (dfrotz wraps at terminal width, the
  engine doesn't — a literal compare would fail on every sentence over 76 chars while
  saying nothing about behavior). **Paragraph breaks are kept** — Zork uses blank lines
  deliberately and a missing one is a real diff
- **`harness/replay.ts`** — `npm run replay`, exit code = failing walkthroughs, CI-ready.
  A crashed turn is a diff, not an abort, so one bad command doesn't hide the rest
- **`test/transcript.test.ts`** — same comparison in the suite, so parity can't regress
  silently. **The normalizer has its own tests** plus a minimum-compared-turns guard: it
  defines what "same output" means, so one discarding too much would make everything pass

**Four defects, caught on the first run (which reported 70%):**

1. **Object-tree insertion order was backwards — this closes the long-standing open issue.**
   "Kitchen object order (sack/bottle swapped)" has been carried since stage 0.2 as a
   question of which behavior to prefer. It was never a judgement call: the Z-machine's
   `insert_obj` **prepends**, so children end up in reverse declaration order. Document
   order gave plausible output — all objects present, stable order, just not the original's.
   `load.ts` now prepends, matching the runtime `move`
2. **Room actions were never called with `M-ENTER`** — where Zork puts the consequences of
   arriving. The Cellar was entered in silence, the trap door never slammed, and the game
   became winnable in a way it should not be. It runs **before** the description
3. **A spurious engine fallback** — dispatch printed "You can't do that." whenever a verb
   default returned false, but those routines usually already printed their own refusal
4. **A harness bug, not an engine bug** — `quit` emits no status line, so its output lands
   in the previous turn's block. Recorded because the fix belonged in the *normalizer*: had
   it been "fixed" in the engine, the engine would have grown code to emit interpreter
   dialogue it has no business emitting

---

## Prior Session (v0.6.2) — M4 stage 4.3: action dispatch & events

**The engine plays Zork I.** A walkthrough from West of House into the Living Room
reproduces the original's prose. 68 engine tests (22 new), IR 184/184, typecheck clean.

- **`src/runtime.ts`** — per-turn context: PRSA/PRSO/PRSI, seeded RNG, and an event sink
  in place of the POC's string buffer. Text buffers across `TELL` calls (one ZIL routine
  prints a sentence in many pieces); structural events flush first, so prose printed before
  a move stays before it
- **`src/interpreter.ts`** — the ADR 0001 evaluator ported from `ir/poc/interpreter.ts`,
  substance unchanged. Document routines resolve **before** engine builtins, so a game can
  override a utility
- **`src/builtins.ts`** — Group A: clock, light rule, GOTO, PICK-ONE, PROB, GLOBAL-IN?,
  FLAMING?, OPENABLE?, OTHER-SIDE. Implements the **ZIL library**, not Zork's call sites —
  no `zork1` identifier in `engine/`
- **`src/engine.ts`** — `createEngine`, turn loop, the four-step dispatch chain, and
  `snapshot`/`restore` over a fully JSON-serializable save

**The engine delegates room description to the game's own `DESCRIBE-ROOM`/`DESCRIBE-OBJECTS`.**
Those already implement verbose/brief, the light rule, and first-visit; reimplementing them
in the engine would be a second competing answer to a question the IR has answered — what
ADR 0001's Group A/B split exists to prevent. A fallback describer remains for partial docs.

**Six bugs, every one producing a plausible wrong answer rather than a crash.** All are now
named regression tests in `test/engine.test.ts` ("ZIL semantics that failed silently"):

1. **`verb?` compares against PRSA, not the verb word** — `<VERB? THROUGH>` means "the
   action is V-THROUGH". Invisible wherever verb and action agree (TAKE → V-TAKE), which is
   what made it dangerous; it surfaced only on "ENTER WINDOW" (verb ENTER, action V-THROUGH)
2. **Room action contexts are numbers** — `M-LOOK` is 3. The string `"M-LOOK"` is a type
   error nowhere; the comparison just never matches and computed rooms lose their prose
3. **`PERFORM`'s first argument is a verb name** — `<PERFORM ,V?WALK .DIR>` extracts to
   `"WALK"`, so the action is `V-WALK`
4. **ZIL `PROPDEF` defaults were missing** — the player declares no SIZE (default 5), so
   V-TAKE's arithmetic threw and *every* take failed
5. **Rooms had no properties in state** — `load.ts` did objects only, so
   `<GETP ,HERE ,P?ACTION>` always returned the default
6. **`GOTO` set TOUCHBIT to mark a visit** — but TOUCHBIT is DESCRIBE-ROOM's "already
   described" flag, so marking the visit erased the description. First-visit scoring now
   uses the engine's own `visited` set

**`PICK-ONE` rewritten** against the real algorithm: a *rotating* choice, layout
`[cursor, ...messages]` in IR element terms, and ZIL's `<REST .FROB 2>` skips two **bytes**
(one element). Reading it as two elements returns the cursor as a message. A plain random
pick would drift from the transcripts within a few turns even under one seed.

---

## Prior Session (v0.6.1) — M4 stage 4.2: command parser

Three new modules in `engine/`. 46 tests pass (24 new), IR 184/184, both typecheck clean.

- **`src/vocabulary.ts`** — one lookup structure over both halves of the vocabulary (the
  `vocabulary` section's 135 verbs/prepositions/directions/buzzwords/synonyms, plus the
  nouns and adjectives that live on objects), so the parser never asks which half a word
  came from. Words truncate to **6 chars** — the Z-machine dictionary does, and a golden
  transcript may contain "MAILBO". Syntax rules are pre-sorted most-specific-first (slots,
  then prepositions), which is what sends `PUT DOWN LAMP` to V-DROP rather than plain PUT
- **`src/scope.ts`** — all four ZIL sources (carried, room, the room's LOCAL-GLOBALS
  scenery pool, GLOBAL-OBJECTS), recursing through containers that are OPEN/TRANS/SURFACE.
  `INVISIBLE` honoured as the parser's "cannot see this yet" bit (how the thief stays
  unmentionable). Scope order doubles as disambiguation preference: held before floor.
  **The parser and 4.3's action dispatch share this one definition** — two ideas of "here"
  is how IF engines rot
- **`src/parser.ts`** — produces PRSA/PRSO/PRSI and nothing else; permission and sense are
  the action's business. Failures are a discriminated union (`unknown-word` ≠ `no-verb` ≠
  `not-here` ≠ `ambiguous`) because ZIL prints a different refusal for each and transcripts
  show it. When several rules fit, it reports why the *best-fitting* one failed

**Standing check: "parses every command the golden transcripts use"** — 39 commands from
`verification/transcripts`, so 4.4 cannot arrive and discover the parser never read its
input.

**One real bug, and its shape will recur.** ZIL's search-option list mixes two unrelated
ideas: HELD/CARRIED/ON-GROUND/IN-ROOM say *where to look*; MANY/HAVE/TAKE constrain what
the **action** may do. Treating the list uniformly as a location filter failed silently in
one direction only — EXAMINE's sole option is MANY, so its search narrowed to nothing and
`EXAMINE MAILBOX` broke while `TAKE MAILBOX` kept working. `originAllowed` now partitions
the list; a slot with no location option accepts anything in scope (ZIL's default).

Two other failures were **wrong test assumptions**, both now tests: `PUT X IN Y` is `V-PUT`
(IN vs ON differ at the rule level — ON is `V-PUT-ON` — but both IN-forms share an action),
and `TAKE` searches ON-GROUND/IN-ROOM only, so an object already held is deliberately out
of reach (ZIL's "You already have that").

`ir/src/index.ts` gained the vocabulary type exports; they existed in `schema.ts` but had
never been re-exported, so no consumer could name them.

---

## Prior Session (v0.6.0) — M4 stage 4.1: engine core, state & world runtime

**First code written against Gate B.** New `engine/` module — `@grues-in-comic/engine`,
zero runtime dependencies (`ir` imported `import type` only, via a tsconfig path), no
DOM/timers/I/O.

- **`src/events.ts`** — the ADR 0002 contract as code: `EngineEvent`, `TurnResult`,
  `CONTRACT_VERSION` "1.0.0", plus `transcriptText()` which defines *once* what "the text
  the player saw" means, so the 4.4 harness and the 5.2 text UI cannot drift on the
  question parity is measured by
- **`src/state.ts`** — `GameState` (everything mutable; the document stays immutable input,
  which is what makes state a complete save file) and object-tree primitives with ZIL
  semantics: `isIn` is direct containment, `isWithin` transitive, and `move` inserts at the
  FRONT per `insert_obj` because room-listing order depends on it
- **`src/load.ts`** — materialises every "derived" relationship exactly once (rooms under
  ROOMS in document order, global/local-globals pools, LOCAL-GLOBALS nested in
  GLOBAL-OBJECTS for the scope walk). Flags/properties/tables are **copied**, so play cannot
  corrupt a shared world. Load-time linking *appends* (ZIL declaration order = listing
  order) — deliberately the opposite of runtime `move`
- **`src/movement.ts`** — `resolveExit` answers "where does this lead, may I go?" without
  touching state, returning `go`/`blocked`/`refused`/`routine`/`none`. Split from performing
  the move because parser, vehicles, daemons and the thief all ask without committing, and
  4.3 needs the refusal *reason* to pick the right event. `PER` exits defer to 4.3
- **`src/rng.ts`** — mulberry32; determinism is a contract term, not an implementation
  detail. Whole state round-trips through one number; `random(n)` is 1..n inclusive per the
  Z-machine opcode

**22 tests, all against the real 110-room/137-object world, not fixtures.** Two are
load-bearing: a whole-document sweep proving no exit points at a nonexistent room (the
defect class that would otherwise crash 4.4 inexplicably), and **unconditional-exit
reachability from the start is exactly 16** — the entire surface world, since everything
underground is behind the kitchen window (door exit) or trap door (`PER`). If that number
grows, an exit that should be gated has stopped being gated.

One real bug caught by tests: the start room was not marked visited at load, so walking out
and back read as a first visit — would have mis-scored first-entry room values in 4.3.
Three other failures were **wrong test assumptions, not wrong code**, each a trap worth
recording: the leaflet's id is `ADVERTISEMENT`; "Behind House" is the *display name* of the
room whose id is `EAST-OF-HOUSE` (never conflate id and `name`); and the 16-room figure that
looked too low is correct.

---

## Prior Session (v0.5.18) — project scope, trademark notices, `.avb` format cracked

**No engine, IR, or artifact changes. M4 is still the next actual work.** Two doc threads
and one real technical result.

**Scope — ADR 0002 gained "Scope of Portability: source frontends, not story files".**
Triggered by asking whether the project should eventually run any Z-machine-compatible IF.
Answer: widen the ambition to an **IR-native engine with pluggable source frontends**
(ZIL is frontend #1; the ZIL family — Zork II/III, Enchanter, Planetfall — is the cheap
expansion; Inform 6 is a plausible frontend #2), and keep **compiled story files
explicitly out of scope** — that re-raises the ADR's existing ZLR/ZVM objection and is a
second engine, not an extension. Three M4 rules follow: builtins implement the Standard
rather than Zork I's call sites; no `zork1` identifier in `engine/`; **the first
portability test is importing Zork II after M4 works, not a speculative refactor**. That
last rule is load-bearing — do not build a frontend abstraction during M4.

**Trademark notices added** to `README.md` and `NOTICE`. The MIT grants cover copyright
only and convey no trademark rights; the storyline and prose are *safe* to reuse (they
live in the MIT-licensed ZIL source), and the exposure was always branding, not content.
Renaming away from "Comic-Zork" handled the main risk. Nominative use (identifying the
historical work, reproducing the `ZORK I` status banner for transcript parity) is
recorded as such. "Grue" confirmed clear by the user — it predates Zork (Vance).

**README de-staled**: WebAssembly references removed (Gate B dropped WASM in ADR 0002 and
the README never caught up), architecture diagram now shows the TS engine + JSON event
contract. The repository-structure block was also rewritten — it listed `importers/`,
`zork/`, `wasm/`, `graph/`, `wiki/`, `tests/`, `scripts/`, `assets/`, `renderer/`, most of
which never existed.

**`.avb` avatar format solved — `art/` module created (stage 5.1 POC).**
`art/poc/avbdec.py` decodes Comic Chat avatars to PNG. Verified: **191/191 files parse,
4656/4656 images decode.** Format spec is `docs/AVB_FORMAT.md`, which exists mainly to
record five behaviours a header-only reader gets wrong — four of them **silently**:
1. `AK_OFFSET_ADJUSTMENT` is a **32-bit** read ("2-bit" in the comment is a typo),
   accumulates, applies only to non-zero offsets. Tiki carries 77.
2. **body/face/torso have different field sets** — torso has no `x`/`y`. Misalignment
   yields plausible records with garbage format bytes rather than an exception.
3. `MaskedMonoPalette` is **not** the render palette — it is the DIB table for the
   Win32 three-DIB split. Real semantics (`avbfile.h:98`): `00=blank 01=aura 10=black
   11=white`. Using the array gives a correctly-shaped but dark-red/navy figure.
4. Intensity is **`byte/255`** (`avatario.cpp:158`); the `/10` + `IndexToByte` path in the
   same file is the wire protocol. Emotion, by contrast, is a raw index.
5. Four images are **BI_RLE4** BMPs (Bolo/Cro/Denise/Lynnea torsos × 4 version dirs = 16).

Assets inventory: 31 characters (5 are single-pose stubs), 18–43 poses each, every pose
tagged with an 8-point emotion wheel + intensity. `AT_COMPLEX` avatars composite face and
torso separately. **Zero `AT_BACKDROP` files exist** — the only backdrops are three
315×315 `.bmp`s, against Zork I's 110 rooms. That gap is an M5 design question, not a
decoding one. `AK_USAGE_FLAGS` unset everywhere; nothing complicates the MIT position.

---

## Earlier Session (v0.5.17) — licensing, provenance, public-repo prep

**Documentation and repo hygiene only. No engine, IR, or artifact changes; M4 is still the next actual work.**

Triggered by a question about whether ZILF/ZLR make this project redundant. They do not, and the reasoning is now written down instead of being tribal knowledge:

- **ADR 0002 gained an "Alternatives Considered" section.** The ADR argued TypeScript vs. C++/WASM but never recorded why an engine is written at all rather than reusing an interpreter. A compiled story file is an opaque memory image; `speech.speaker` and `player-moved` room ids are recoverable from the IR and not from `zork1.z3`. **The Z-Machine Standards Document 1.1 is now the normative source for M4 Group A builtin semantics** — read `reference/z-machine-standards-1.1.md`, not an interpreter's source.
- **ZLR ships no license** (verified: no LICENSE/COPYING, no headers in `ZLR.VM/*.cs`; the Gargoyle licenses in the tree cover a vendored dependency). Default copyright applies — stricter than GPL. Last-resort reference only; if consulted, describe observed *behavior*, not implementation, and record it in ADR 0002.
- **Build tools attributed**: ZILF/ZAPF 0.11.1 (GPL-3.0), Frotz 2.55 (GPL-2.0-or-later) in `NOTICE` + `THIRD_PARTY.md`. Invoked as external executables — not vendored, so no copyleft reach into Apache-2.0 source. Both upstream imports verified to carry genuine Microsoft MIT grants.
- **`reference/`** created and gitignored: Z-Machine Standard, Comic Chat paper (moved from `docs/`), ZILF/ZLR sources. See `reference/README.md` — note it warns that `reference/zilf/AGENTS.md` is ZILF's own agent guide and has **no authority here**.
- **299 Comic Chat build outputs untracked** (~33 MB: `.exe`/`.dll`/`.ocx`/`.lib`/`.class`/`.map`/`.sym` + a vendored Sun JDK). Source, docs, and **661 comic art files kept** — the `.avb` art is an M5 input. `original-projects/zork1/` untouched.
- **`original-projects/` stays version-controlled** — MIT permits redistribution, `AGENTS.md` requires it, and `importer/`/`ir/`/`verification/` read from it. Gitignoring it was considered and rejected.
- Commit authorship moved to `11153426+dkdev24@users.noreply.github.com`; history rewritten.

**Open decision:** the repo is prepared for public release but has not been made public. Nothing further blocks it.

---

## Earlier Sessions (v0.5.14 → v0.5.16)
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
**M4 in progress. 4.1–4.4 ✅ — next is 4.5, systems completion (⚑ Gate C).**

1. **Stage 4.5 — systems completion** (⚑ Gate C): daemons, scoring, save/load, death.
   Engine `CLOCKER` needs P-WON demon-region gating; the POC's `builtins.CLOCKER` in
   `ir/poc/world.ts` is the starting point but does not implement that gating
   - **Gate C's own criterion is already met on the current three transcripts.** The honest
     next step is therefore **more walkthroughs** — the thief, combat, the lamp countdown,
     death and resurrection — before claiming the gate. Parity on three short transcripts
     is a real result but a narrow one, and the systems 4.5 adds are precisely the ones
     those three never exercise
   - Replace the three stubbed builtins (`RANDOMIZE-OBJECTS`, `HERO-BLOW`, `V-CLIMB-UP`)
     with real implementations as the thief/combat systems land

**Done in M3** (kept for reference):
1. ✅ **Meta entities** — done in v0.5.14 (`metaEntities`, IR 0.11.0); I-THIEF unblocked
2. ✅ **Table-valued globals** — done in v0.5.15 (`{table, offset}` global values, IR 0.12.0); validator `global` ref kind tightened
3. ✅ **Nested table elements + ITABLE** — done in v0.5.16 (`{table, offset}` table elements, IR 0.13.0); HERO-BLOW now blocks only on Group A `RANDOM`
- The world-document unit is **complete**: the document loads and boots a world with nothing seeded by hand, which was the precondition for M4
4. One-off tail, unassigned: `<NEXTP …>` (I-SWORD, OTHER-SIDE), `<NTH …>` (I-CYCLOPS), String-in-statement-position (GRATE-FUNCTION), bare `,ONBIT`/`,ACTORBIT` (LIT?, V-SAY), non-atom FSET? flag (GOTO), `REST` with a non-literal byte count (PICK-ONE — Group A regardless)
5. Stage 5.1 (Comic Chat analysis) = filler, independent of every gate. Read `reference/comic-chat-paper.md` (the authors' SIGGRAPH '96 paper — balloon layout, character placement, gesture selection, camera zoom) alongside `original-projects/comic-chat/`; it explains the intent behind that source. Gitignored, so it may be absent from a fresh checkout — see the reference note in `docs/DEVELOPMENT_PLAN.md` M5
   - **Partly started (v0.5.18)**: `.avb` decoding is solved — `art/`, `docs/AVB_FORMAT.md`. Remaining 5.1 work: **face/torso compositing** (`cx`/`cy`/`cxDelta`/`cyDelta`; selection in `GetHeadAndBodyFromEmotion`, `v2.1b/cchat/avatar.cpp`), mask/aura planes for DIB-format poses, and the TS port of the decoder
   - **Panel grammar is an open design question, not a decoding one.** Comic Chat assumes dialogue between peers; Zork is second-person narration with 5 NPCs (`GHOSTS`, `BAT`, `CYCLOPS`, `THIEF`, `TROLL`). Most turns emit `narration` with no speaker, so caption boxes must be first-class, not just balloons — and "who is on screen when nobody speaks" needs an answer (the player is deliberately undescribed in Zork)

**M0 complete** (0.1–0.3):
- 0.1: ZILF/ZAPF 0.11.1, frotz 2.55; builds to `verification/build/zork1.z3` (86,696 bytes)
- 0.2: Transcript harness with 3 goldens; ZILF build ≈ shipped (banner + Kitchen object order differ)
- 0.3: Pipeline doc consolidated to `docs/AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md`

---

## Open Issues
- Neutral branding for commercial assets (engine/IR/importer)
- Repo is prepared for public release but not yet public (carried from v0.5.17; nothing blocks it)
- **Backdrop scarcity**: 3 shipped Comic Chat backdrops vs. 110 Zork rooms, and no `AT_BACKDROP` assets exist. Options sketched but undecided — panel compositions that avoid backdrops, deriving variants from the three originals, or new art in the Woodring hatch idiom for the ~10 rooms that carry the game. M5 decision
- `art/` has **no test harness**; the 4656-image corpus sweep was ad hoc. Needs a regression test once the module gains a toolchain
- **`room-title` channel is unused in practice.** The engine delegates room description to Zork's own `DESCRIBE-ROOM`, which prints the name with `<TELL D ,HERE>`, so the title cannot be split onto its own channel without parsing prose — which the ADR 0002 contract forbids. A UI wanting the title should read `player-moved`.to and look the name up in the world document. Decide in 4.4/5.2 whether the channel stays in the contract
- **ZIL property defaults live in the engine, not the IR.** `PROPDEF SIZE 5` etc. are encoded in `engine/src/interpreter.ts`. The document is the correct home; adding a `propdefs` section is an IR schema change deferred rather than rejected
- **Stubbed builtins**: `RANDOMIZE-OBJECTS`, `HERO-BLOW`, `V-CLIMB-UP` return no-ops so call sites reach a defined value instead of crashing a turn. They belong to the thief/combat systems in 4.5
- `README.md:27` still says the engine is "inspired by the original gameplay" — understates the commitment to behavioral compatibility verified by golden transcripts. Minor wording

---

## Key Paths
| Path | Purpose |
|---|---|
| `importer/` | ZIL parser, tests, AST artifacts |
| `ir/` | IR schema, validator, extraction → `artifacts/zork1.world.json` |
| `engine/` | **Engine core (M4).** Zero-dep TS; `src/events.ts` is the ADR 0002 contract as code. `npm test` runs against the real Zork I world |
| `art/` | Comic Chat art tooling. `poc/avbdec.py` decodes `.avb` → PNG (stage 5.1 POC; Python by exception — port to TS per ADR 0002) |
| `docs/AVB_FORMAT.md` | **Normative** `.avb` format spec + the five silent-failure gotchas. Read before touching `art/` |
| `original-projects/zork1/` | ZIL source reference |
| `original-projects/comic-chat/` | Comic Chat source reference |
| `reference/` | Third-party reference material. **Gitignored** in full (third-party, some copyleft, some unlicensed); local-only, may be absent from a fresh checkout. See `reference/README.md` |
| `reference/comic-chat-paper.md` | Kurlander/Skelly/Salesin SIGGRAPH '96 Comic Chat paper — presentation-algorithm reference for stage 5.1/5.3 |
| `reference/z-machine-standards-1.1.md` | Z-Machine Standards Document 1.1 — **normative source** for M4 Group A builtin semantics (ADR 0002) |
| `reference/zilf/`, `reference/zlr/` | ZILF and ZLR sources, read-only. ZLR is a fallback only; see ADR 0002 and `reference/README.md` before reading it |
| `docs/` | Project documentation |
| `wiki/` | Semantic notes (hand-authored) |
| `<module>/graphify-out/` | Graphify graphs (config: `.graphifyignore`) |
| `CHANGELOG.md` | Public changelog |
| `WORKLOG.md` | Persistent history |
| `AGENTS.md` | Agent workflow rules |
| `CLAUDE.md` | Entry point → `AGENTS.md` |