# Development Plan

Living document. Milestones are ordered; stages within a milestone are sized so one stage fits comfortably in a single AI-assisted session. Revisit this plan at every ⚑ decision gate — later milestones are intentionally provisional until the gates before them resolve.

- **Status legend**: ☐ not started · ◐ in progress · ☑ done
- **Update rule**: when a stage finishes, mark it in this file and record details in `HANDOFF.md` (and `WORKLOG.md` at version milestones). When a decision gate resolves, revise the affected downstream stages rather than working around the plan.

Related documents: `docs/FUTURE_WORK.md` (the non-critical backlog and the pre-1.0.0 iteration protocol — this plan orders the work, that file holds what is deliberately unscheduled), `docs/PORTING_STRATEGY.md` (phases and architecture), `docs/AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md` (Graphify/OpenWiki), `docs/gemini-analysis-on-plan-and-strategy.md` (adopted recommendations: deterministic pre-parser, interface-first engine/UI boundary, brand separation).

---

## Milestone 0 — Foundations & Verification Ground Truth (v0.2.x)

Goal: establish behavioral ground truth and validate assumptions before building anything on them.

| Stage | Task | Exit criteria | Status |
|---|---|---|---|
| 0.1 | **Toolchain setup** — install ZILF and frotz (dfrotz); compile `original-projects/zork1/` to `.z3`. Note: `original-projects/zork1/COMPILED/zork1.z3` is a shipped reference build — transcripts (0.2) can start from it even if the ZILF compile needs source patches (see github.com/The-ZIL-Files for ZILF-compatible tweaks) | `zork1.z3` builds reproducibly; build steps scripted and documented; diff vs. shipped `.z3` noted | ☑ |
| 0.2 | **Golden transcript harness** — script dfrotz to run command lists and capture transcripts; create first walkthrough scripts (opening area, mailbox/leaflet, house entry) | `verification/` contains runner script + ≥3 golden transcripts, re-runnable with one command | ☑ |
| 0.3 | **Repo hygiene** — resolve small open issues: `.gitignore` for compiled binaries in comic-chat, dangling item 4 in Gemini doc, consolidate duplicated pipeline diagrams to one canonical location, remove stale HANDOFF entries | Open Issues list in `HANDOFF.md` pruned | ☑ |

---

## Milestone 1 — Deterministic ZIL Parser (v0.3.x)

Goal: a deterministic S-expression parser producing a complete AST of the Zork I source — the foundation of the ZIL Semantic Importer, and the input that grounds all later LLM-based extraction.

| Stage | Task | Exit criteria | Status |
|---|---|---|---|
| 1.1 | **Parser POC** — S-expression lexer/parser handling one representative file (e.g. rooms/objects file); pick implementation language pragmatically (TypeScript is the candidate — feeds Gate B) | Parses one full source file into a typed AST with tests | ☑ |
| 1.2 | **Full-corpus parse** — extend to all `zork1` files; handle ZIL syntax edge cases (reader macros, strings, comments) | 100% of files parse or every failure is catalogued with cause | ☑ |
| 1.3 | **AST artifacts** — serialize ASTs to JSON; emit corpus statistics (counts of ROOM/OBJECT/ROUTINE/GLOBAL/TABLE, etc.) | Committed AST output + stats report; parser re-runnable with one command | ☑ |

---

## Milestone 2 — IR Schema & Runtime ADR (v0.4.x)

Goal: define the central abstraction (IR) and settle the engine runtime question.

| Stage | Task | Exit criteria | Status |
|---|---|---|---|
| 2.1 | **IR schema: declarative world** — schema for ROOM, OBJECT, exits, GLOBAL, TABLE, flags/properties; validate by hand-writing IR for 2–3 rooms | Schema documented + validator tool; sample IR passes | ☑ |
| 2.2 | **IR schema: behavior** — decide how ROUTINE/ACTION imperative logic is represented (interpreted mini-language vs. transpiled functions vs. hybrid); POC one nontrivial routine both ways if needed ⚑ **Gate B input** | ADR-style writeup of the chosen representation with a working POC | ☑ |
| 2.3 | **ADR: engine runtime** — TypeScript vs. C++/WASM, informed by 1.1 and 2.2 experience; define the engine↔UI event/serialization contract at the same time (interface-first, per Gemini rec) ⚑ **Gate B** | ADR committed; PORTING_STRATEGY.md and AGENTS.md updated to remove the WASM assumption or confirm it | ☑ |
| 2.4 | **Knowledge tooling validation POC** — hands-on test of Graphify and OpenWiki against the real IR from 2.1–2.2; verify the repos and capabilities match `AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md`; if they hold up, produce first `graph/` artifacts and start `wiki/` architecture pages | Findings recorded in that doc; adopt/replace decision made; first generated structural + semantic docs exist (or fallback chosen) ⚑ **Gate A** | ☑ |

**⚑ Gate B (after 2.3): RESOLVED 2026-07-18.** Behavior = interpreted behavior AST with engine builtins (ADR 0001); engine runtime = TypeScript, WASM dropped (ADR 0002, which also fixes the engine↔UI JSON event contract). Milestones 3–5 reviewed against the decisions: structure stands; Milestone 4 now targets a TypeScript `engine/` package implementing the ADR 0002 contract, and Milestone 5's UI consumes that contract (already web-native by design).

**⚑ Gate A (after 2.4): RESOLVED (split) 2026-07-18.** **Graphify adopted** — validated in-field and in-repo; per-module graphs (`importer/`, `ir/`) committed under `<module>/graphify-out/` (supersedes `graph/`); corpus governed by `.graphifyignore`; IR world data is out of its AST scope (upstream #1666), so an IR world graph, if needed later, is a small deterministic IR→graph exporter (the sanctioned fallback). **OpenWiki not adopted** (deferred 2026-07-18, finalized same day after in-repo validation): free-tier LLM access cannot complete agentic wiki generation (null completions from the free router; 16 req/min rate limit aborts pinned-model runs) and reliable operation requires a paid model — no budget for this side project. `wiki/` is hand-authored (the fallback, now the standing rule). Findings recorded in `AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md`.

---

## Milestone 3 — Semantic Extraction: ZIL → IR (v0.5.x)

Goal: populate the IR from the parsed AST, subsystem by subsystem. Deterministic transforms where possible; LLM-assisted extraction (with AST context) where logic requires judgment; everything reviewed against the source.

| Stage | Task | Exit criteria | Status |
|---|---|---|---|
| 3.1 | **World model** — rooms, exits, connections | All Zork I rooms in IR; connectivity graph matches source | ☑ |
| 3.2 | **Objects** — objects, properties, flags, containment, initial locations | All objects in IR with validator passing | ☑ |
| 3.3 | **Vocabulary & syntax** — verbs, synonyms, adjectives, parser syntax rules | Vocabulary tables extracted to IR | ☑ |
| 3.4 | **Action routines (simple)** — object/room action handlers with straightforward logic | Majority of handlers represented; complex ones catalogued | ☑ |
| 3.5 | **Complex behavior** — puzzles, daemons/timers (thief, troll, lamp, matches), scoring, death/resurrection | Each system extracted with a written behavioral spec cross-checked against golden transcripts | ☐ |

Stages 3.4–3.5 may split into multiple sessions per batch of routines — track batches in `HANDOFF.md`.

---

## Milestone 4 — Engine Core (v0.6.x)

Goal: a platform-independent engine that executes the IR and emits structured gameplay events. Per Gate B: a zero-dependency TypeScript package (`engine/`) implementing the ADR 0002 contract — pure synchronous state machine, seeded RNG, JSON events; behavior AST interpreter + builtin registry per ADR 0001. No browser code. Verified continuously against golden transcripts.

| Stage | Task | Exit criteria | Status |
|---|---|---|---|
| 4.1 | **State & world runtime** — load IR, world state, object tree, movement | Can walk the map; state transitions correct | ✅ |
| 4.2 | **Command parser** — tokenization, vocabulary lookup, syntax matching, disambiguation | Parses the command set used by golden transcripts | ✅ |
| 4.3 | **Action dispatch & events** — execute IR behavior, emit narration/state events per the Gate B contract | LOOK/TAKE/DROP/inventory flows produce correct events | ✅ |
| 4.4 | **Transcript replay harness** — feed golden-transcript commands to the engine, diff output | First golden transcript replays with acceptable diff; harness in CI-style script | ✅ |
| 4.5 | **Systems completion** — daemons, scoring, save/load, death; iterate until transcripts pass | All golden transcripts pass ⚑ **Gate C** | ✅ |

**⚑ Gate C — CLAIMED v0.9.0 (2026-07-20):** behavioral parity on captured transcripts = engine-complete milestone (major version bump).

**Amendment (2026-07-20), on what "all golden transcripts pass" means.** As originally written the
criterion was unsatisfiable, and not for want of engine work. Combat and the thief choose their
output with `<RANDOM …>`, and ADR 0002 declined to reproduce the Z-machine's PRNG — that would
pin the engine's determinism contract to one interpreter's implementation choice. A randomized
turn therefore has no single correct text to diff against, and `05-troll-combat.cmd` is
whole-file `# parity: informational` by method, not by defect.

The criterion is met as follows, and this is the standard a future gate should be read against:

1. **Deterministic turns verify strictly, by text.** 143/143 strict turns across 11 walkthroughs,
   every opt-out carrying a written reason, both enforced by test. This is unchanged and remains
   the primary evidence.
2. **Randomized turns verify by membership**, which is *evidence of the same weight only because
   it carries two further checks* (v0.8.3). Membership alone is one-sided — a narrower legal set
   never makes a passing line fail — so each membership suite must also assert:
   - **world state**, not only text: a narrated death charges the score and moves the player, a
     narrated kill removes the villain, a narrated robbery moves the object; and
   - **a positive control of real reference output**, captured from `dfrotz` against the shipped
     story file, so a silently narrowing derivation is visible.

   `engine/test/combat.test.ts` and `engine/test/thief.test.ts` both meet this; the shared
   derivation is `engine/test/membership.ts`.

**Known limitation at the gate:** `V-CLIMB-UP` remains a stub — it stalls on `GETPT`, the one
exit-property idiom ADR 0003's rewrite does not cover. It returns "You can't go that way.", which
is the correct answer in every room that does not define a climbable exit, and rooms that do
(the tree, the Cyclops stairs) route through their own exits and never reach it. No walkthrough
diverges on it. Recorded rather than waived: it is the last known gap in Group A coverage.

---

## Milestone 5 — Browser Runtime & Comic Presentation (v0.7.x+)

Goal: browser shell consuming engine events; Comic Chat–inspired presentation. Rendering stays outside the engine (web-native UI layer per Gemini rec, regardless of Gate B outcome).

| Stage | Task | Exit criteria | Status |
|---|---|---|---|
| 5.1 | **Comic Chat analysis** — study `original-projects/comic-chat/` presentation concepts: panel layout, bubble placement, character/emotion selection; document in `wiki/` (read the paper below alongside the source) | Written analysis of the algorithms worth preserving | ✅ |
| 5.2 | **Minimal browser shell** — text-mode UI over the event stream (prove the contract end-to-end) | Playable text version in browser | ✅ |
| 5.3 | **Comic renderer POC** — one scene as panels + speech bubbles | POC demonstrates event→panel mapping ⚑ **Gate D** | ✅ |
| 5.4 | **Presentation buildout** — panel sequencing, character portraits, narration styling, persistence | Opening area playable in comic form | ✅ |
| 5.5 | **Full-game pass** — art/layout coverage for the complete game | Game completable in the browser | ☑ |

**5.5 closed 2026-07-28 on its written exit criterion.** The engine wins Zork I 350/350 into `STONE-BARROW` (`engine/test/completion.test.ts`, seed 1234), the comic pane was verified in-browser and its issue list cleared at v0.17.2, and ADRs 0004–0008 are all built. The presentation *polish* that was tracked under 5.5 was never the exit criterion — it moved to `docs/FUTURE_WORK.md` §2 and is drawn from by Milestone 6.1. **Do not re-open 5.5 for polish**; a genuine coverage gap — a room or turn the browser cannot render — would be a 5.5 regression and does re-open it.

**⚑ Gate D:** comic-presentation POC decides art pipeline and asset strategy — plan 5.4–5.5 in detail only after it.

**Reference paper for 5.1/5.3:** Kurlander, Skelly & Salesin, *Comic Chat* (SIGGRAPH '96) — the authors' own account of the algorithms this milestone borrows: balloon construction and layout, character placement and orientation, default gesture/expression selection, semantic panel elements, and virtual-camera zoom. It describes the *intent* behind the code in `original-projects/comic-chat/`, so it is the faster way in for anyone starting 5.1 or designing the event→panel mapping at 5.3.

The text sits at `reference/comic-chat-paper.md` but is **gitignored** — it is a third-party copyrighted ACM publication, kept locally rather than redistributed. If it is not in your checkout, retrieve it from the ACM Digital Library or the authors' pages; nothing in the build depends on it. (It lived at `docs/comic-chat-paper.md` until 2026-07-19, when all third-party reference material was consolidated under `reference/`.)

---

## Milestone 6 — Road to 1.0.0: Improvement Iterations & Public Release (v0.19.x → v1.0.0)

Gates C and D are both cleared, so this milestone is no longer provisional. Its scope, per PORTING_STRATEGY Phase 6 and the solopreneur strategy: making the product what it was meant to be, separating reusable assets (engine, IR spec, ZIL importer) under neutral branding, and shipping.

**`1.0.0` means one thing: the repo goes public and the website ships.** Everything below is what stands between here and that day.

**This table is open.** The user supplied 6.1–6.3 as *starters* and will add more items as iteration 1 proceeds; stage numbers are stable but the list is not exhaustive. **6.1 ends when the user declares the product ready — never when a backlog empties.**

| Stage | Task | Exit criteria | Status |
|---|---|---|---|
| 6.1 | **The comic pane becomes a cartoon** — the DM and the Hero converse in most scenes, in the same panel. **The most important item in M6** | A playthrough reads as two characters talking, measured not asserted: an agreed share of turns carries a real exchange, most of them in one panel | ◐ |
| 6.2 | **Gameplay screen: save / load / restart** — UI over the engine's existing save contract; three named slots, browser storage only | A player can save, reload and restart from the browser without the console; state survives a reload | ☐ |
| 6.3 | **The static site** — landing/home page, about, public changelog, alongside the gameplay screen; to `DESIGN.md` + mockups (user-supplied, pending) | Static pages ship, gameplay screen restyled to the same look & feel | ☐ |
| 6.4 | **Asset separation & neutral branding** — engine, IR spec and ZIL importer extractable for standalone use | Reusable assets identified and separable; licensing/attribution settled (`THIRD_PARTY.md`) | ☐ |
| 6.5 | **Public release** — repo made public, website shipped | Repo public + website live → tag `1.0.0` | ☐ |

**Ordering.** 6.1 first, by the user's own weighting and because it is the only stage that can invalidate an ADR. 6.2 is independent of everything and can fill an idle session. 6.3 is blocked on `DESIGN.md` and the mockups, not on us. 6.4 is independent of 6.1–6.3. 6.5 needs all of them.

---

### 6.1 — The comic pane becomes a cartoon

**The finding that scopes this stage:** the machinery for a DM↔Hero exchange exists (ADR 0006 Slices 1–4) and the *experience* still is not a conversation. That is not a bug — it is four deliberate decisions compounding, each defensible alone:

1. **The Hero cannot report an action and reply in the same turn.** `mapper.ts`: `const hero = action ?? exchange.hero`, and `exchangeFor` rule 2 nulls the reply whenever `heroBusy`. So he only ever answers on turns he did nothing worth reporting — the quiet turns, which is the opposite of where a conversation belongs.
2. **One cooldown, set to 3, shared with the room gazetteer.** At most one exchange per three turns, and a first-visit room line spends the same budget on DM monologue.
3. **Beat coverage is 7 markers.** `parser-miss` — the largest marker there is, 12.7% of turns — and `death` are excluded on purpose. Everything else falls through to silence or to a DM-only room line.
4. **Even when both speak, they land in different panels.** Caption + DM + Hero is three balloons, the fit test refuses them in the band at `UNIT`, and `AddLine` splits — so the exchange renders shot/reverse-shot, and ADR 0005 §4's facing two-shot is rare. 96.7% of turns carry a caption.

Measured consequence, from the corpus the beat runs were tuned against: **35 spoken beats over 606 turns (~5.8%)**, and the both-speak-in-one-panel subset is smaller still. "The two main characters don't talk to each other at all" is an accurate reading of the product.

**Superseded by measurement (6.1a, v0.19.0).** The hand count above was close and slightly high. `web/tools/density.ts` replays the shipped tables over the same 606 turns and reports **29 spoken beats (4.8%)** and — the number the stage is actually judged on — **28 turns where both characters speak: 4.6%, one exchange every 21.6 turns**. Of those 28, **20 land in one panel and 8 are split across two** (limiter 4, quantified). The corpus average hides the worse fact: on the full-game oracle it is **3 exchanges in 406 turns, one every 135**, because the scene walkthroughs share an opening dense in first visits and the rest of a playthrough is not. Numbers below refer to this report, not to the hand count; the baseline is `web/test/golden/dialogue-density.json`.

**Two more corrections, from the probe 6.1b ran before writing the ADR** (the full detail, and every figure, is in `docs/adr/0009-the-dm-reads-the-room.md` §Context — that document is now the authority on the diagnosis):

- **Limiter 3 understates itself.** `parser-miss` is 12.7% of turns on the corpus it was measured on; on the full corpus it is **26.4% (160 turns)**, and `kind: refusal` — which the Director drops *entirely* (ADR 0005 §3) — is the same 26.4%. It is the largest single lever on D5, not merely the largest marker.
- **The 180-char limit was never the leak.** It drops 9 turns in 606, all of them the same 188-char sentence, so D3's rise to 200 recovers exactly those nine. And the box never showed a room description in the first place: first sentences run p50 24 / max 163 characters where an arrival's full narration runs **p50 179 / p90 422 / max 588**. "The DM speaks the room description" is therefore *new text*, 3–9× longer than the box holds — which is why the split is a real question, and why the answer is n panels rather than two (**44 of 81 arrivals fit one 200-char balloon, 12 need two, 25 need three or four**).

**The direction, decided by the user 2026-07-28 — the top-left box becomes the location name, and the DM speaks the room description.**

First, the premise that was wrong in the asking, because the plan has to record it: **the box is not the location name today.** `captionFor` (`mapper.ts:606`) puts the first sentence of the turn's *narration* there — "You are standing in an open field west of a white house…" — and drops it entirely past `CAPTION_MAX` (180 chars), which silently loses the longer descriptions. The room **name** is not in the panel at all; it lives in the status bar (`status.ts`, looked up by room id from the world document, with `room-title` available on the event stream since v1.5.1).

So the decided design is a change in both places, and it is a better one than "the DM absorbs the caption" (this plan's superseded recommendation):

- **The box becomes panel metadata, not a line.** A location title drawn by the renderer from `context.room` — which the panel context already carries — never entering the script as a `BM_ACTION` caption.
- **The DM speaks the room description**, in the read-aloud-at-the-table register ADR 0006 §5 already defines.

**Why this fixes limiter 4 outright and the absorb-the-caption proposal only worked around it:** a `BM_ACTION` caption *unconditionally starts a new panel* (`panel.cpp:1064`, faithful port). With a caption on 96.7% of turns, panelization is being told to break the panel almost every turn, which is what splits the exchange into shot/reverse-shot. Taking the box out of the line stream stops that instruction being issued, leaves DM + Hero as two balloons in the band, and lets the facing two-shot become the ordinary case rather than the rare one.

**Decisions taken 2026-07-28 — these are settled input to ADR 0009, not open questions:**

| # | Decision |
|---|---|
| D1 | **The goal outranks the mechanism.** The pane must read as a natural conversation between a DM and a solo player *as much as possible*. **Volume of authored dialogue is an accepted cost** — pre-generating many lines is explicitly sanctioned rather than something to economise on. Where a limiter and the goal conflict, the limiter goes. |
| D2 | **Narration routing:** room description → the DM's balloon; resolved action → the Hero's balloon (unchanged); parser refusals → the Hero's register (they are his frustration, and `parser-miss` is the largest affect marker); system text → the DM. |
| D3 | **Long room descriptions split across two panels**, and `CAPTION_MAX`'s successor limit rises **180 → 200 chars**. |
| D4 | **The location box shows only when the room changes**, not on every panel. The status bar already carries the persistent answer. |
| D5 | **Density target: an exchange every 2–3 turns.** This is what 6.1a's report is measured against. Now that the report exists, the size of the move is exact: **one every 21.6 turns → one every 2–3, i.e. 7–11× on the scene corpus and ~50× on a full playthrough.** |

**The invariant D1 does not suspend — and it is the one that decides *how* the pre-generation happens.** The mapper stays a **deterministic pure function**: it is the parity oracle, and 11 walkthroughs replay through it in Node. So "pre-generated" means **authored at development time and committed as data** — lines written by hand or drafted with AI assistance during a session, then pinned by the golden dialogue sequence. It does **not** mean a language model called at runtime: that would be non-deterministic, would break the oracle, and would need a paid API this project has no budget for. Any proposal to generate dialogue while the game is running is out of scope for 1.0.0.

**Slices** (each sized for a session; 6.1a is prerequisite to the rest):

| Slice | Work | Exit criteria |
|---|---|---|
| 6.1a ✅ | **Measure, and make measurement possible.** *(v0.19.0)* The tables moved to `web/src/comic/script.ts` (DOM-free, data only; the mechanism stayed in `mapper.ts`), and `web/tools/density.ts` replays them over the corpus through the production Director and the real fit test, reporting per turn: caption, DM line, Hero line (action vs reply), exchange — and per emitted panel, whether the exchange landed in one | **Met.** `npm --prefix web run density`; baseline `web/test/golden/dialogue-density.json`, pinned by `web/test/density.test.ts` (+7 tests). Headline: 28 exchanges / 606 turns, one every 21.6; 20 of 28 in one panel; captions 96.7% |
| 6.1b ✅ | **Write ADR 0009** from D1–D5 above. *(v0.19.1)* | **Met.** `docs/adr/0009-the-dm-reads-the-room.md`, Accepted. Mechanism settled: the **caption channel retires** and its text becomes the DM's speech (so nothing tells `AddLine` to break the panel), the box becomes renderer-drawn metadata on room change, a description is sentence-packed into ≤200-char balloons — **n panels, not 2** — with the Hero staged silent until the last, where his line lands. Two DM registers: read-aloud (uncooled, free) and table-talk (cooled, authored). It also supersedes ADR 0005 §3's unconditional refusal drop and ADR 0006 §4's action-suppresses-reply rule |
| 6.1c ✅ | **Move the box out of the line stream** and route the description to the DM per D2/D4. *(v0.20.0)* | **Met.** Captions **96.7% → 0%**; the box is renderer-drawn metadata from `PanelContext.roomTitle`; descriptions are ≤200-char balloons continuing across panels; `mapper.ts` still pure and canvas-free. Exchanges in one panel **20/28 → 24/28**; panels 411 → 478 (+16%). Three unforeseen rules, now in `PITFALLS.md`: a room change and a death must ask for the panel break with `<Brk>` (the caption was doing it), `roomTitle` survives a clone-append, and the Hero is staged through the DM's whole run with `<Chr>` |
| 6.1d ✅ | **Lift the remaining limiters** (D1 governs — the goal outranks each): the `action ?? reply` exclusion, the cooldown, marker coverage (`parser-miss` first — it is the largest and the funniest), gazetteer contention. *(v0.21.0)* | **Met — D5 is met.** One exchange every **21.6 turns → 2.4**, and on the full-game oracle **135 → 2.6**; 252 exchange turns of 606, every one reaching the screen, **189 of them landing the two-shot in one panel**. The four limiters went as one move: the cooldown became **per beat and 0** with the gazetteer taken out from under it (one shared budget was the mechanism behind two of the four), the Director drops a refusal only when it has nothing to say, `parser-miss` (26.4% of turns) and `routine-ack` are scripted, and the action/reply exclusion is now an ordering. Cost, as ADR 0009 §5 said to accept: panels 478 → **801** (+68%). The density instrument itself had to be fixed — see `PITFALLS.md` → Web |
| 6.1e ◐ | **Write the dialogue — the largest slice, and D1 sanctions its size.** Today's tables cover 7 markers and ~30 rooms; every-2–3-turns across 110 rooms and a full playthrough is a substantial authored corpus, committed as data. Likely spans several sessions | **Session 1 done *(v0.22.0)*: the refusals.** 6.1d met D5 on volume but **218 of 252 exchanges were a run's last line repeating**. Fixed by splitting the big markers on what happened (`parser-miss` → `not-here`/`not-carried`/`unknown-word`; the map's own "no" → **`blocked-exit`, 114 turns that had no marker at all**) and by amending ADR 0006 §4 rule 4: a run may end in a **cycling tail**, and a beat may carry **its own cooldown** — scripted at the table's 0 the refusals pushed the corpus to 1.6, *past the bottom* of D5. Result: density holds at 2.5 / 2.7 oracle, worst-repeated line per playthrough **150 → 12**, distinct lines ~30 → **91**.<br><br>**Session 2 done *(v0.23.0)*: the rooms answer back.** The marker-less block was censused first and the census corrected session 1's figure — **220 turns of 606 (36.3%), not 56.6%**: traversal 88, ambient 87, arrival 45, of which **164 wholly silent** and 56 the DM narrating at a silent player. That picked the lever: **the gazetteer gained a Hero half for all 88 rooms** (`GuideScript` now takes a `BeatExchange`; a first visit happens once, so it is the one surface that cannot wear out), and `blocked-exit` widened over 10 more turns in the map's voice. The `PanelKind` fallback was **not** built. Corpus **2.5 → 2.0**, oracle **2.7 → 2.4**, `07-forest-and-tree` **8.0 → 2.3**, no scene worse than 2.3. **Left, and now a decision rather than a task:** turns are still silent, the corpus is near the *bottom edge* of D5's band, so filling them is a trade against the refusal beats or a decision by the user to move the band. *(Session 2's silent-turn figure — 154, composition 69 bare walks / 22 examine states / … — was measured over the losing replay and is **void**; superseded by session 3's census below.)*<br><br>**Session 3 done *(v0.24.1)*: the census re-taken over the repaired corpus, no code changed.** **136 of 623 turns (21.8%) are wholly silent**, and the varied tail the void figure described is gone — it was never silent, the DM was already narrating it (examine, re-look, inventory, lamp, wait and score are all **DM-only** turns now, 154 of them, where only the *Hero* says nothing). What is left is **one surface: 119 revisit walks** — a room re-entered, title only, no prose, no gazetteer line because a first visit happens once — plus 11 scene-ending `quit`s and 6 refusals a beat's own cooldown suppressed. The 119 fall over **35 rooms**, skewed (Cellar 13, Kitchen 11, Coal Mine 10, Round Room 8, East-West Passage 8; 10 rooms hit once). **The trade is now numeric:** the corpus is at 2.27 turns/exchange (274 exchanges), so **~38 new exchanges reach the 2.0 floor** — under a third of the 119. And the revisit walk is the one surface that *wears out* (the same room, over and over), the exact inverse of the first-visit gazetteer. **The user's call, unchanged in shape but now priced**<br><br>**Session 4 done *(v0.24.2)*: the Hero stops saying ", then".** Not a measurement — the user read his dialogue back and objected to the cadence. One hardcoded template in `mapper.ts` (`The {name}, then.`) fired **59 times a playthrough**, and `wiki/the-hero.md` gave that exact string as *the* example of his register, so six authored lines copied the suffix out of the spec: **~1 in 5 Hero utterances ended the same way, and no counter here measures shape.** Fixed the way the beats already are — `ACTION_SCRIPT` in `script.ts` (5 take / 3 drop, `{name}` substituted), cursor **per kind** in the mapper's fold, still a pure function of the event stream. The voice spec now describes a register rather than a construction. Cost, looked at and accepted: two-shot **158 → 156 of 274**, panels 593 → 594, D5 holds at **2.3**. **Also raised this session and now the stage's biggest open question: the Hero speaking his *command* as table-talk** (see `HANDOFF.md` → Next Actions) — it would supersede ADR 0005 §1 and recast 6.1g's `isOrphaned`.<br><br>**Measured *(v0.24.3)*, before any ADR.** Voiceable **95.6%** with an 86-entry lexicon (directions alone are 47.6% of all commands; the tail is 12 distinct commands, all authorable). Cost **+42% panels** (722 → 1025 at page level against the real fit test), against 6.1d's accepted +68%; panels with both speakers 172 → 286. **And the finding that re-shaped it: it does not fill the silent block on its own** — all 116 silent walks are buffered into traversal runs the Director collapses to **56 panels**, so 60 are discarded before anyone reads them (ADR 0005 §3). **ADR 0010 is therefore two decisions** — the Hero speaks his command, and the traversal collapse gives ground.<br><br>**Written *(v0.24.4)*: `docs/adr/0010-the-hero-declares-his-move.md`, Status Proposed, nothing built.** §1 the declaration (supersedes ADR 0005 §1 *as an exclusivity*), §2 the exchange as the panel's unit (recasts 6.1g's `isOrphaned` on ask-vs-answer, the line carrying the marker so `page.ts` stays cast-agnostic), §3 the collapse keeps a **journey line** and stops treating a single traversal turn as a run (amends ADR 0005 §3), §4 **D5 → D5′**, both-speakers as a share of *panels*, band set from the first slice rather than invented. Four slices; 1 and 2 independently shippable, 3 is what delivers the stated purpose. **Awaiting the user's acceptance** |
| 6.1f ✅ | **Verify.** Golden dialogue sequence re-pinned, pixel gate re-accepted **after looking at the images**, full playthrough read in the browser *(v0.23.1)* | **Met.** Gate **clean, 17/17** and the density baseline **unchanged** — neither golden needed re-accepting; the 17 gate PNGs were dumped and looked at, no pixel objection; 271 web / 139 engine green. The playthrough was read panel by panel, and it found what the aggregates could not: **`12-full-game.cmd` does not complete under a naive replay.** The list is authored for the *resilient* `runFullGame` (it repeats combat until the villain falls); the comic replay loses the troll fight and then flails — **Rocky Ledge, 30/350, 16 of 110 rooms** — and that run is **406 of the corpus's 606 turns**. Four presentation findings too: the split exchange **mis-pairs** (the Hero's reply shares a frame with the *next* turn's DM line), **3 empty panels**, the **death panel wears the resurrection room's location box**, and refusal repeats **cluster**. Logged, not fixed: `PITFALLS.md` → Web for the corpus rule, `FUTURE_WORK.md` §2.1 for the four |
| 6.1g ✅ | **Repair the corpus, then fix what M6.1f found.** *(v0.24.0)* | **Met, and the repair inverted three of M6.1f's conclusions.** The full-game row now comes from `fullGameCommands()` — `runFullGame`'s own log of what it typed, replayed into a session at the same seed, reaching **STONE-BARROW 350/350 in 423 turns** where the naive replay reached Rocky Ledge at 30. Corpus **606 → 623 turns**. All four findings closed: the mis-paired split exchange (`addScript` → `isOrphaned`, cast-agnostic), the "empty" panels (**looked at and kept** — they are the traversal collapse's own output; the *blank* frame is now pinned against), the death panel's room (`panelRoom`; pinned by a synthetic turn, since nothing in the corpus dies any more), and the clustering — which on a won game is **`routine-ack`, not the refusals**, fixed with a cooldown and a longer loop (repeats within 20 panels **70 → 6**). **A fifth, found by the repair and decided by the user:** the two-shot was **70 of 274**, and the cause was the balloon band, not panelization — `BALLOON_HEADROOM` **0.36 → 0.44** takes it to **158 of 274**, meeting 6.1d's criterion on a won game for the first time. Both goldens deliberately re-accepted after looking at all 13 drifted images; D5 **2.0 → 2.3**; 278 web / 139 engine / 198 IR green, parity 143/143 |
| 6.1h ✅ | **ADR 0010 slice 1 — the lexicon and the declaration.** The Hero re-voices his command as table-talk: `COMMAND_SCRIPT` in `web/src/comic/script.ts` (three tiers — directions, intransitive verbs, transitive templates over the command's own nouns), the trigger and cursor in `mapper.ts`, rotation depth from the first line. **No panel-flow change**: the declaration lands in the turn's own panel. `ACTION_SCRIPT` becomes garnish with a cooldown; one Hero utterance per panel, declaration wins *(v0.24.6)* | **Met.** `COMMAND_SCRIPT`: 24 direction aliases on a shared 12-line rotation, ~19 intransitive verbs, ~37 transitive verb keys with 1–3 `{noun}` templates each; the 12-command tail (`take all`, bare `y`, `xyzzy`, …) stays silent by design. `heroDeclaration()` + a fold cursor in `mapper.ts` match direction → phrasal verb → intransitive → verb+noun. `ACTION_SCRIPT` gained a cooldown (4) and is held outright on any turn a declaration fires. Full game still wins 350/350; Hero speaks on **416/423 turns (98.3%)**; panels **1141 → 1158 (+1.5%,** far under the ADR's own +42% estimate — the lexicon overlaps DM frames more than its prototype did); `panelsBothSpeakers` **172 → 243**. No play-log tell on read-through. Both goldens re-accepted after looking at the images; 293/293 web tests green. **One real seam surfaced, not fixed here:** the declaration now usually claims the panel's one Hero slot ahead of the old beat reply, so the DM+reply two-shot metric collapsed (137/165 → 17/274) — exactly the join slice 2 (6.1i) exists to close; `density.test.ts`'s assertion there was relaxed to a sanity bound rather than patched around | ✅ |
| 6.1i ✅ | **ADR 0010 slice 2 — the cross-turn join.** A declaration marks itself as answering and clone-appends into the frame it answers (`PanelDelta.replacedLast`); `isOrphaned` recast on **ask-vs-answer**, with the marker on the line so `page.ts` stays cast-agnostic | **Met** *(v0.24.7)*. `PageLine.answers` carries the fact; `page.ts`'s `isOrphaned` no longer breaks the panel outright — it arms `guardFragment()`, consumed by whichever line reaches the page next, forcing fresh only when that line is unmarked. In `mapper.ts` the declaration moves to the *front* of the turn's own lines (ahead of even the room-change `<Brk>`), since it answers the *previous* turn's still-open frame, not this turn's own narration — the room break, DM lines and garnish (action/reply) still follow in their old order. The reaction/`gameOver` fallbacks that give a turn's *own* frame a body deliberately keep checking `heroLines` only, not the declaration, so a turn with nothing else to say (a plain traversal step) still gets its destination represented instead of losing it to the join. Full game still wins 350/350; two-shot (DM+reply sharing one panel) recovered **17/274 → 218/274 (79.6%)**, close to the pre-ADR0010 baseline (137/165, 83%); `panelsBothSpeakers` **243 → 477**; panels **1158 → 1091** (joins net *fewer* panels, not more). M6.1g's mis-pairing pin stays green — `page.test.ts` gained a direct pin of the guard itself (a marked line joins a DM-only fragment; an unmarked one still doesn't). Both goldens re-accepted after looking at the images; 292/292 web tests green | ✅ |
| 6.1j ✅ | **ADR 0010 slice 3 — the collapse gives ground.** A single traversal turn stops counting as a run; a longer run keeps one panel and earns a **journey line** naming its destination (amends ADR 0005 §3) | **Met** *(v0.24.8)*. `director.ts`'s buffer now counts `runLength`; a run of one flushes untouched (its own per-turn declaration, exactly as before) and a run of two or more has its buffered script's declaration swapped for a journey line from `JOURNEY_LINES` (`script.ts`, a lexicon of its own, not `COMMAND_SCRIPT`), naming the destination via a new `journeyRoomTitles` table kept deliberately separate from the location box's (still-unwired) `roomTitles`. A run whose last step's own command falls in the lexicon's silent tail (no declaration to swap) gets the journey line inserted fresh rather than staying wordless — `director.test.ts`'s SILENT_COMMANDS case pins this: the run's frame now carries a balloon and can no longer clone-append silently into the next same-room turn, so a scenario that used to merge to one panel now reads as two (updated, with the reasoning, in that test). Measured over the corpus: of 50 collapsed runs, 17 are length two or more, each now speaking the walk's destination instead of its last step's own line; panels **1091 → 1091** (unchanged — this stage trades voice for text, not for panel count, since a run's own frame already survived on its own before this slice). The 60-discarded/56-panel figure in ADR 0010's Context table predates ADR 0010 entirely (the v0.24.1 census, before the Hero had any declaration); by 6.1j, slices 1–2 had already given nearly every step a voice, so this slice's own, directly attributable recovery is what the swap-vs-insert split above measures, not that raw count. 292/292 web tests green | ✅ |
| 6.1k ✅ | **ADR 0010 slice 4 — set D5′ and verify.** The band for both-speakers-per-panel is set **from the measurements**, `density.test.ts` asserts both ends, both goldens re-pinned, a full playthrough read in the browser | D5′ has a number and a band with a stated failure mode at each end; goldens green; the playthrough reads as a conversation and not as a wall of talk | **Met.** D5′ band **25–60%** of emitted panels carry both speakers (`D5_PRIME_MIN`/`MAX`, `web/tools/density.ts`), set from today's 43.7% (477/1091) with room either side for 6.1e's remaining authoring. Both ends asserted in `density.test.ts`, corpus total and the full-game oracle both checked. Neither golden had drifted since 6.1j — density baseline and pixel gate both already matched, so nothing to re-pin. Read the full-game transcript in two slices (turns 0–50, 230–270): declarations and replies alternate, rotation holds, one soft spot (`dig sand`'s four-turn repeat — existing lexicon depth, not this slice's scope). 292/292 web tests green. **ADR 0010 is now fully built.** |

**Constraints that do not move in this stage:** the Guide/DM stays presentation-only and reads no engine internals; the mapper stays a deterministic pure function (it is the parity oracle); engine parity stays 143/143 strict. If a proposal needs the DM to know something the event stream does not carry, the answer is no — that is ADR 0006's first invariant.

**Standing method note applies with force here:** measure before proposing rules. Five plausible panel-grammar proposals died that way, and 6.1a exists so the sixth does not.

### 6.2 — Save / load / restart on the gameplay screen

The engine has had save/restore since M4 (`engine/src/` save contract, `SaveState`), and the web shell already persists a session (`web/src/persistence.ts`) — this stage is **UI over an existing contract**, not new engine work.

Two known hazards from the existing notes, both live for this stage: **`Turn` is not JSON-safe** (`EventMix.counts` is a `Map`; persistence recomputes `mix` rather than storing it — derived state must not be persisted), and **resume replays turns, it does not re-execute them** (`SaveState` stays the only source of world truth). A restart must also reset the comic pane's pose cycles and the Director's beat counters, or the new game opens with the old game's conversation state.

**Decided 2026-07-28: named save slots, maximum three, browser storage only.** No downloadable save file for 1.0.0 — which keeps the save format an internal detail rather than something a released version has to keep reading. A three-slot cap also bounds the storage question: browser storage is finite and a comic session is not small.

Left to the implementer: whether a slot stores a name the player types or one derived from room + score + moves (derived is cheaper and needs no dialog — recommend it, with rename deferred), and whether restart confirms (it should — it is the one destructive control on the screen).

**Decided 2026-08-02: the UI is slash commands in the existing text input** (`/save [slot]`, `/load <slot>`, `/restart`), not separate buttons — keeps Zork's text interface as the sole input surface, no engine change. `main.ts:164`'s `handleShellCommand(command)` already intercepts bare `save`/`restore` before `session.command()` reaches the engine; this stage extends that same interception point rather than building a new one. Slash-prefixing is also a correctness improvement over the current bare-word match, which risks shadowing a real ZIL verb — `/` makes "this is a shell command, not game input" unambiguous.

**Decided 2026-08-02: reload-based, not live in-place.** `/load` and `/restart` write to storage (or clear it) then `location.reload()`; boot-time `resume()` — the one path that already replays a saved session into both panes correctly — picks it up from there, same as today's `restore` message ("reload the page to resume"). Rejected for this stage: swapping state into the *running* page without a reload, because it needs new `reset()` methods on `comic-view.ts` and `console-view.ts` that do not exist yet, and must reset the Director's pose cycles and beat counters (the hazard paragraph above) or a loaded/restarted game opens carrying the old game's conversation state. Reload-based reuses the one resume/replay path that is already tested; live in-place is a fair v2 if the reload flicker turns out to bother anyone.

### 6.3 — The static site: landing page, about, changelog

**Decided 2026-07-28: the landing page is a separate static page, not a route in the game app**, and it is one of **several** static pages — a public changelog and an about page named so far, more likely.

That makes this stage a small static site plus the game, rather than a page bolted onto the game. Consequences worth settling early: where the static pages live in the repo relative to `web/` (the game app), how the dev server serves both (`web/tools/serve.ts` routes in URL space), and whether the public changelog is generated from `CHANGELOG.md` or written separately — **generated is the recommendation**, since two changelogs diverge the moment one is edited in a hurry.

`web/` has **no bundler by decision** (`web/README.md`), and nothing here needs one: static pages are HTML and CSS.

Still blocked on the user's `DESIGN.md` and mockups for the look & feel, which also govern restyling the gameplay screen to match.

---

**Documents this milestone will touch:** `docs/adr/` (6.1b wrote ADR 0009), `docs/FUTURE_WORK.md` §1 (the iteration table), `wiki/the-guide.md` and `wiki/the-hero.md` (6.1e is their voice), `web/README.md` (6.2/6.3 surfaces).

**The non-critical backlog is not in this file.** `docs/FUTURE_WORK.md` §2 is the menu further iterations draw from — good-to-have items with a recorded reason for deferral. Nothing in it blocks 6.5.

---

## Session Protocol

Each session: pick the next ☐ stage (or continue a ◐ one) → execute → update stage status here → update `HANDOFF.md`. Never start a later milestone's stage while an earlier ⚑ gate is unresolved. (5.1 was the standing exception to that rule — independent of every gate, usable as filler — and is now complete.)
