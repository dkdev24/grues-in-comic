# ADR 0004 — Presentation Mapping: Engine Events to Comic Panels

- **Status:** Accepted
- **Date:** 2026-07-20
- **Amended:** 2026-07-20 — §4a added: responsiveness outranks retro fidelity (resolves the item that had blocked acceptance)
- **Amended:** 2026-07-20 — §4a: mobile keeps both panes visible (reverses this ADR's own drawer proposal); optional dictation input added
- **Amended:** 2026-07-20 — §2/§2a: the Hero's channel is a **thought** balloon, not speech; balloon classes fixed per channel; "verbatim typed command" generalized to "canonical form" for assisted input
- **Amended:** 2026-07-20 (stage 5.3, from building it) — §10: `parser-miss` fires on the `narration:system` **channel**, not only on prose patterns; §11: the Hero must own a BORED *face* as well as a SHRUG torso, which recasts the Hero
- **Superseded (in part):** 2026-07-23 — ADR 0007 reverses §4a's "panel width becomes an input, not a constant" clause: panel size is fixed and the *pane* reflows the column count. The rest of §4a stands.
- **Stage:** 5.2/5.3 (decides panel grammar *before* the comic layer is built, per Next Action #5)
- **Related:** ADR 0002 (the event contract this consumes and must not extend), `wiki/comic-chat-presentation.md` (the 5.1 source analysis), `docs/panel-grammar-discussion.md` (the reasoning and the measurements; this ADR is its output)

## Context

Stage 5.1 ported Comic Chat's asset and layout algorithms and found they answer only half the question. Comic Chat rendered a **chat**: several humans typing, each balloon's emotion parsed from that speaker's own words, composition parameterized on who is talking to whom. Zork is one player and a narrator, and the player types imperatives at a parser.

The measured shape of the gap, over all 11 walkthroughs (189 turns):

- **192 `narration` events, 0 `speech`.** Not "few" — none. Every player-visible line is narration.
- **187 `object-moved`**, roughly one per turn, overwhelmingly the thief's wander daemon.
- 55 `player-moved`, 22 `game-over`, 21 `narration:system`, 14 `score-changed`, 2 `question`.

So the historical code tells us how to lay out balloons but not who is in the panel, what they feel, or where the camera is. Those are the decisions below. Everything here is either derived from the Comic Chat source, measured against the `art/` corpus and the walkthrough replay, or explicitly flagged as authoring judgement.

**This ADR consumes ADR 0002's contract and does not extend it.** No new event types, no presentational fields on existing events. If a mapping rule needs data the contract does not carry, that is an argument to be made against ADR 0002 on its own terms, not a field added here.

## Decision

### 1. Comic Chat leads on identity

The product is a Comic Chat artifact that happens to be playing Zork, not a Zork port that happens to draw comics. Where the two traditions conflict on presentation, Comic Chat wins.

The consequence that is easy to get backwards: this is a constraint on *us*, not a license. It means we do not invent panel furniture Comic Chat never had because it would read better, and it means the Guide is drawn from the shipped cast rather than commissioned.

### 2. The panel has exactly three channels

| Channel | Balloon class | Content | Authored? |
|---|---|---|---|
| Hero | **`CBWoodringThink`** — a thought balloon | The player's command in **canonical form**, verbatim | No |
| Caption | `CBWoodringBox` | A **verbatim pull-quote** from the turn's narration | No |
| Guide | `CBWoodringNormal` — a speech balloon | Commentary | **Yes — the only authored text in the system** |

Narration is **accompanied, never replaced**: the console pane always carries the full narration text. The caption quotes it; it never paraphrases or summarizes it. This is what keeps the comic from becoming a lossy retelling of the game.

**"Canonical form"** is the typed text in typed mode and the assembled command in assisted input. Verbatim in both — nothing is rewritten into prose.

### 2a. The Hero thinks; only the Guide speaks

The Hero's channel is a **thought balloon, never a speech balloon.** This is a correction: earlier drafts of this ADR said "Hero balloon = the player's typed command" without fixing the class, and the natural reading — a speech balloon — is wrong in three separate ways.

**It misattributes the sentence.** The player's command is grammatically an imperative *addressed to* the Hero; Zork's narration answers in the second person ("**You** are standing…"). Rendering it as the Hero's speech makes the Hero the issuer of an order, and in a two-shot the only other body on stage is the Guide. "Open the door" then reads as the Hero ordering the Guide to open the door — which inverts §3 visually even though the code is correct, and makes the Guide look like an agent in the world.

**It contradicts the event contract.** Across all 11 walkthroughs the engine emits **zero `speech` events** (§Context). A comic whose most frequent element is a speech balloon is asserting, on every panel, something the engine never said. A thought balloon claims nothing the contract denies.

**It fights §9.** Hero emotion is derived from the narration — the world's reply — rather than from the balloon's own words. A thought balloon is already an interior register, so an interior expression paired with it is coherent; a speech balloon paired with a face reacting to something other than what it is saying is not.

`CBWoodringThink` is a shipped Comic Chat balloon class (`balloon.h`), so this is a **port, not an invention**, and §1 is satisfied. It also makes Hero and Guide distinguishable by balloon *class* rather than only by position, which is what lets the two-shot read at a glance.

Consequences for the port: the Layout Manager needs the think spline and its bubble-trail tail rather than the normal balloon's arrow. `AddLine`'s one-balloon-per-character rule is unaffected, so §6's ~1 panel/turn budget stands.

### 3. The Guide is presentation-only

The Guide sees the event stream and cannot touch the world. Stated as testable constraints: the Guide has no game state, cannot be addressed by the parser, and removing the Guide entirely must leave engine behaviour and the parity harness bit-identical.

### 4. The shell is two period reconstructions

A comic pane that is a **Comic Chat window on IRC**, and a console pane that is **the terminal Zork was played on**. These are not skins: Comic Chat *was* an IRC client, so this is the artifact rebuilt rather than a theme applied.

The comic pane is primary; the console is subordinate but always complete (§2). The `room-title` channel stays in the ADR 0002 contract — the console status line (room, score, moves) is its consumer. This settles a standing open issue in `HANDOFF.md`.

### 4a. Where the two conflict, **responsiveness outranks retro fidelity**

The shell is retro-*styled* but fluid. When pixel-faithful 90s chrome and a working phone-portrait layout cannot both be had, the layout wins and the chrome gives.

This does **not** reopen §1. Comic Chat still leads on identity, cast, balloons and composition — all of which are resolution-independent. What gives is only the fixed-pixel *window furniture*: title bar, toolbar and panes are reconstructions in style, not in bitmap dimensions.

The consequences below are the actual content of this decision:

**On narrow viewports the two panes stack, and both stay visible.** §4 makes the comic primary and the console subordinate-but-complete; at phone width "subordinate" means a smaller share of the vertical, *not* a hidden one. Both panes are on screen simultaneously in the default portrait layout.

This corrects an earlier draft of this ADR, which made the console a collapsible drawer on mobile. That was wrong: it optimized for comic area, but §2's actual invariant is that narration is **accompanied, never replaced**, and a transcript the reader can see honours that where one behind a gesture does not. A drawer survives only as a fallback below the narrowest workable width. A layout that truncates the console to fit has broken §2, not just the shell.

**Dictation is the sanctioned way to buy back vertical space on phones — a nice-to-have, not a requirement.** The software keyboard is the single largest consumer of a portrait viewport, and speech-to-text with the keyboard dismissed is the one option that materially improves the layout without taking space from either pane. Three constraints if it is built:

- **Dictation fills the input field; it never auto-submits.** Zork's parser is unforgiving about exact wording and its vocabulary is hostile to general-purpose recognizers — "grue" is not a word they know, and "nasty knife" and "elvish sword" will not survive intact. The player must be able to see and correct the transcription before it reaches the parser. A misrecognition that submits directly costs a turn and writes a wrong panel into a canonical stream (§5).
- **It is strictly additive.** Text entry stays fully available. A layout that works only by voice has narrowed who can play, and voice is unusable in exactly the settings this game is often played in.
- **"On-device" must be verified, not assumed.** Browser `SpeechRecognition` implementations have historically streamed audio to vendor servers. Under this project's standing no-cloud-budget constraint, a mode that makes a silent network call per turn is a materially different decision from the one recorded here — confirm platform behaviour before describing it as on-device.

**Panel width becomes an input to the Layout Manager, not a constant.** Comic Chat laid out against a known window width. Ours varies, so `AddLine`'s break rules and `LayoutAvatars`' zoom cap must be evaluated per render at the current panel size rather than once. This is the one place the port stops being a transcription.

> **Superseded by ADR 0007 (2026-07-23).** This clause is reversed: panel size is **fixed** (native, with a bounded shrink tolerance), and responsiveness moves up to the pane, which reflows the *column count*. Restoring Comic Chat's constant `m_unitWidth` both stabilizes composition and lets the mechanical layout layer be a faithful port again. The paragraph below ("Responsiveness lives in the grid and the chrome, not in the figures") still holds.

**Responsiveness lives in the grid and the chrome, not in the figures.** The panel grid reflows and the chrome stretches; figures scale as a unit so a face never scales differently from the torso it is composited onto. §8's compositing is done in figure space before any viewport scaling is applied.

**Scaling is mostly downward, which is why this is affordable.** Measured across the casting shortlists, the largest face or torso part per avatar runs **236×296 to 385×355** — dan 318×322, susan 284×389, lynnea 278×441. The three shipped backdrops are 315×315. This art is not a set of small sprites: a native-scale panel is roughly 400×400, so on a 390pt phone a single panel already fills the width and the common case is downscaling. Upscaling artifacts on large viewports are the narrow risk, not the general one, and they are bounded by capping panel scale rather than by re-drawing anything.

### 5. The panel stream is canonical; a page is a layout policy

Panels are the data structure. A *page* is a Layout Manager policy over that stream, not a thing the stream knows about. On-screen policy is the Comic Chat window; export policy is pages.

**PDF export is therefore deliberately not WYSIWYG.** This is the item most likely to be quietly "fixed" later by someone who reads the divergence as a bug. It is the decision — and §4a hardens it: once the on-screen panel width is a function of the viewport, a WYSIWYG export would have to pick one reader's window to be canonical, which is not a thing that exists.

### 6. Panel budget: ~1 panel per turn

Derived, not chosen. `AddLine`'s one-balloon-per-character rule, applied to the three-channel panel of §2, yields one panel per turn — about **189 per playthrough**, which is also what bounds the export size question.

### 7. Camera preset: a six-rung ladder over a salience filter

**The salience filter is a precondition, not a detail.** An `object-moved` is salient only if the object is the player, is in the player's inventory, or moves into or out of the player's current room. Measured: **31 of 187 (16.6%)** qualify. Without the filter, the single most common shot in the finished comic is a close-up on a thief the player cannot see.

First matching rung wins:

| # | Condition | Preset |
|---|---|---|
| 1 | `game-over` | Reaction — tight on Hero |
| 2 | `player-moved` to a first-visited room | Establishing (emphatic if the turn also scored) |
| 3 | `player-moved` to an already-visited room | Wide two-shot |
| 4 | salient `object-moved` | Close-up on that object |
| 5 | Guide balloon present | Over-the-shoulder, Guide → Hero |
| 6 | default | Medium two-shot |

Measured distribution: medium 52.4%, establishing 26.5%, close-up 12.7%, reaction 5.8%, wide 2.6%.

**Recorded so it is not re-proposed:** a `score-changed` "story beat" rung was proposed and killed by measurement. All 14 scoring turns are also first-visits, so rung 2 shadows it completely and it fires 0% of the time. It survives only as the "emphatic" modifier on rung 2.

### 8. Pose variation is a selector change, not an asset problem

Complex avatars composite faces × torsos, so a strong avatar carries **240–306 distinct figures**. The default shot is oversupplied. Monotony would come instead from `nearestByAngle` (`art/src/pose.ts:53`) being a deterministic argmax that returns the same drawing forever.

Port Comic Chat's `m_lastTorso + 1` round-robin — already implemented as the `start` parameter of `nearestGated` — and apply the same cycling to faces. Crop, distance and background jitter are a **garnish**, demoted from their previously assumed role as the main source of variety.

### 9. Emotion derives from the narration and the turn's events — never from the Hero's balloon

This inverts Comic Chat's data flow and is the single constraint most likely to be implemented backwards. Comic Chat reads a speaker's emotion from that speaker's own typed text; here the Hero's balloon is the player's verbatim command (`take lamp`) and is permanently flat. The Hero's feeling is a reaction to the **world's reply**.

Gestures are **event-gated, never sampled** — a wave or a point is a claim about what happened, and only 3–5 exist per avatar.

### 10. The affect-marker table

Markers emit a **weighted `CEmotionOpts` set**, not one winning emotion. `selectComplexPose` (`art/src/pose.ts:146`) consumes options highest-priority first and lets the first option that yields a face fix the face while the first that yields a torso fixes the torso — so a marker outranked on the face can still claim the body, and the Hero can shrug while looking annoyed.

Priority descending; angles are `EMOTION_ANGLES` indices (`art/src/format.ts:83`):

| Pri | Marker | Fires on | Emotion |
|---|---|---|---|
| 100 | `death` | `game-over` event | SCARED 1.0 |
| 90 | `grue-threat` | `/pitch black\|grue/` | SCARED 0.9 |
| 80 | `combat-victory` | `/fatal blow\|slumps to the floor\|breathes his last/` | SHOUT 0.9 |
| 70 | `combat-threat` | `/sword (is\|has) glow/` | ANGRY 0.7 |
| 60 | `scored` | `score-changed`, `delta > 0` | HAPPY 0.8 |
| 50 | `reveal` | `/reveal(s\|ing)\|sluice gates open/` | HAPPY 0.6 + POINTOTHER |
| 45 | `effort` | `/great effort\|reluctantly\|crashes shut/` | SHOUT 0.5 |
| 40 | `uncanny` | `/hollow voice\|strange gothic\|nothing special/` | COY 0.6 |
| 30 | `parser-miss` | `/I beg your pardon\|isn't one I recognize\|can't see any\|don't have that/` | BORED 0.5 + SHRUG |
| 10 | `routine-ack` | `/^(Taken\|Dropped\|Opened\|Click)\.$/` | NEUTRAL 0.0 |

**Lock the ordering; do not lock the measured percentages.** All 11 walkthroughs open at West of House and replay the same first moves, so the frequencies are opening-sequence-shaped. `effort` at 25 fires is largely three repeated sentences (the window ×8, the rug ×6, the trap door ×6).

**51% of turns are deliberately affectless.** 77 turns (40.7%) match no marker and 20 more resolve to `routine-ack`; these are room descriptions and inventory listings, where a neutral Hero is correct. This is intent, not a coverage gap — it is what keeps the 5.8% death reaction from becoming wallpaper. A future session that "improves coverage" here will flatten the comic.

**The Hero's most common emotion is exasperation at the parser.** `parser-miss` is the largest single marker (12.7%) and nothing outranks it in practice. This ADR **adopts** that deliberately: arguing with the parser is the 1977 experience, and it is funnier than neutral. It is recorded here because it was arrived at by measurement rather than chosen, and a reader should know it is load-bearing characterisation rather than an artifact.

### 11. Casting is constrained by pose inventory, not only by avatar type

- **Hero and Guide must both be complex avatars.** Simple and mascot avatars have monolithic bodies and cannot carry the default shot.
- **HAPPY and NEUTRAL share angle 0**, separated only by intensity (`format.ts:93`). Measured across the Guide shortlist: HAPPY *faces* exist at graded intensities (0.1–1.0), but **no shortlist avatar owns a HAPPY torso**. Joy is a face-only emotion in this corpus; a scoring turn draws a neutral body under a smiling face, and no table tuning changes that.
- **A Hero who shrugs at the parser must come from the 5 of 18 complex avatars that own a SHRUG torso**: dan, lance, mike, susan, tongtyed. Since `parser-miss` is the largest marker, this is a real constraint and not a preference.
- **Amended at 5.3: the Hero needs a BORED *face* as well.** `parser-miss` emits BORED **and** SHRUG (§10), and the two inventories are nearly disjoint — of the SHRUG five, only **dan** and **lance** own a BORED face. This was missed above by reading the gesture requirement and not the expression one, and it does not fail loudly: the emotion wheel is nearest-neighbour by design, so a Hero without BORED lands on whatever is nearest and renders fine. Susan lands on COY, and the comic's single most common beat then reads as the Hero being *coy* at the parser rather than exasperated by it — a silent characterisation change, which is the kind this ADR exists to catch.
- **The cast is Hero = dan, Guide = tiki** (settled at 5.3). dan is the larger of the two avatars owning both halves of `parser-miss` (17 faces × 11 torsos = 187 figures; lance has 121). Note what this dissolves: dan is not on the Guide shortlist at all, so the "cast both together, they intersect only at susan" problem below simply stops existing.
- Cast both roles together. The Guide shortlist (lynnea, anna, margaret, tiki, susan) and the SHRUG list intersect only at susan.

## Consequences

- **The comic layer can be built without further design decisions.** That was the point: §7 and §10 are the two tables 5.3 would otherwise have had to invent under implementation pressure.
- **The mapper is a pure function of the ADR 0002 event stream.** It holds per-session memory (visited rooms, last-used pose indices) but reads no engine internals, so it is testable by replaying walkthroughs and asserting on preset and emotion sequences — the same oracle the parity harness uses.
- **Two mapping rules depend on regular expressions over English narration text.** §10 is pattern-matching on prose Zork prints, which is brittle in a way the rest of this project deliberately is not: the IR exists precisely so behaviour is not recovered by string matching. The mitigation is that a marker miss degrades to NEUTRAL, which is the correct 51% default anyway — the failure mode is blandness, never wrongness. It is still the weakest joint in this ADR and the first thing to revisit if the comic feels flat.
- **The affect table is tuned on 189 opening-heavy turns.** A full playthrough would shift every frequency in §7 and §10. The orderings should survive; the percentages should not be quoted as facts about real play.
- **The Guide is the only place authored content enters**, so the project's authoring cost is bounded by the Guide's trigger rate, which this ADR does not set.
- **The Layout Manager port stops being a straight transcription (§4a).** Every other port in stage 5.1 reproduces its source site and is reviewable against it; this one takes a constant the original held fixed and makes it a parameter. It is the one place where "read the code, not the paper" is insufficient guidance, and it should be called out in review rather than diffed against the C++.
- **Historical fidelity now has a measurable definition** for the parts covered here — pose selection, panel budget and layout are ports with named source sites, so divergence is reviewable rather than a matter of taste.

## What this ADR deliberately does not decide

Each of these can be settled without amending this ADR. None of them is blocking.

- **The Guide's identity** — name, appearance, personality. A separate document. Agreed only: do not call them "Narrator" in the UI.
- **Final casting** for Hero and Guide, within §11's constraints.
- **Guide trigger rate, cooldowns and no-repeat pools** — the remaining budget question left over from §6.
- **Page composition and pull-quote selection** — which line of the narration the caption quotes.
- **Where the player types**, IRC framing fidelity (channel name, nick list), scroll coupling between panes, and measured PDF byte size.
- **Breakpoints and the exact scale cap** implied by §4a — a build-time question, to be set against real panels rather than in advance. The width at which the drawer fallback takes over belongs here too.
- **Whether dictation (§4a) ships at all**, and on which platforms. Optional by construction; nothing else in this ADR depends on it.

## Alternatives Considered

- **Derive Hero emotion from the player's command verb** (`attack` → ANGRY, `take` → HAPPY). Rejected: it reports the player's *intent*, and the joke of Zork is that intent and outcome diverge. A confident `attack troll` that ends in death would draw a triumphant Hero on the death panel.
- **An LLM to author captions and Guide lines per turn.** Rejected on the standing project constraint: no paid-LLM budget, and a free-tier model in the render loop makes the comic non-deterministic, which breaks the replay oracle that makes §7 and §10 testable at all.
- **Emit presentation hints from the engine** — a `mood` or `camera` field on events. Rejected as a direct violation of ADR 0002: the engine would begin to own how it looks, and the boundary that survived stages 4.1–5.1 intact would be spent on a convenience.
- **Skip the Guide; caption-only comics.** Genuinely simpler, and it removes the only authoring cost in the project. Rejected because two-shot composition is the shape Comic Chat's layout code is built around, and a one-character strip discards most of what §1 commits to. Retained as the fallback if Guide authoring proves unsustainable — nothing else in this ADR depends on the Guide existing.
- **A pixel-fixed retro shell** — reproduce the Comic Chat window at its historical dimensions and let the page scroll or letterbox around it. The strongest version of §1, and it would have made the whole shell a transcription with no judgement calls. Rejected by §4a: a reader on a phone is the common case, and a comic that requires a desktop window to read fails at the thing it exists to do. What is given up is real and should be acknowledged rather than rationalized — the chrome will be a period *evocation* where it could have been a reconstruction.
- **Panels driven by narration paragraphs rather than turns.** Closer to comics convention and would break up long room descriptions. Rejected because it decouples the panel stream from the turn stream, and every rule in §7 is written against a turn's event set.
