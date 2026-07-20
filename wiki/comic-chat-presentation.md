# Comic Chat's presentation algorithms

Stage 5.1. What Microsoft Comic Chat did to turn a text conversation into comics, which
of those algorithms are worth carrying into Grues in Comic, and the one place where the
premise does not transfer at all.

**Sources.** The SIGGRAPH '96 paper (`reference/comic-chat-paper.md`) is the authors'
account of the *intent*; `original-projects/comic-chat/v2.1b/cchat/` is what shipped. The
two do not always agree, and where they disagree the code wins — see "Where the paper and
the code part company".

The asset half of this — decoding `.avb`, selecting poses, compositing faces onto torsos
— is implemented in `art/` and specified in `docs/AVB_FORMAT.md`. This page is about the
layer above it.

---

## The core idea

Comic Chat's insight is that **a comic panel is a rendering of a conversation, and a
conversation has structure a program can see.** Who spoke, in what order, to whom, with
what affect. Given that structure, panel composition is a constraint-satisfaction problem
rather than an art problem.

That reframing is the durable part. Almost every specific algorithm below is a cheap
approximation the authors admit is arbitrary — the paper says outright that "the actual
numbers in this function are arbitrary". What survives is the decomposition: **infer
affect from text → decide who is on stage → arrange them → place balloons → decide when
the panel is full.** Five stages, each replaceable.

---

## 1. Inferring gesture and expression from text

Comic Chat reads the typed message and guesses how the character should look. The paper
lists seven categories of cue: emoticons, chat acronyms (`LOL`, `IMHO`, `BRB`), all-caps
for shouting, `!!!`, greetings, self-references (`I`, `I'm`), other-references (`you`).

The implementation (`textpose.cpp`) is more interesting than the list. Rules are **data,
not code** — loaded from string resources at startup as `Function(arg);Strength` lines,
with six matching functions:

| Function | Matches |
|---|---|
| `FindString` / `FindString*` | Substring anywhere (`*` = case-insensitive) |
| `CheckWord` / `CheckWord*` | Whole word |
| `CheckStart` / `CheckStart*` | Start of any sentence |
| `AllCaps` | The whole utterance is upper-case with >1 capital |

`GetEmotionsFromString` runs every rule and collects **all** the matches into a
`CEmotionOpts` — a weighted set, not a winner. Conflict resolution happens later, at pose
selection.

This is the design's best trick and the paper explains why: "Hi Sue, how are you?" should
make the character both wave and point outward, and you cannot draw the composite. So
instead of resolving the conflict in the *text* layer, Comic Chat defers it to the layer
that knows what art exists. The rules are free to over-produce.

**Worth preserving.** Data-driven, over-producing rules with a late bind to available art
is a good pattern for a system whose art supply is fixed and small.

## 2. The emotion wheel, and pose selection

Emotion is a point in polar coordinates: an **angle** naming the emotion and a **radius**
0.0–1.0 giving intensity. Eight emotions sit on the perimeter — happy, coy, bored,
scared, sad, angry, shout, laugh — and neutral is the centre.

The consequence that matters: **an avatar never needs a pose for every emotion.** A
request lands on whatever the artist actually drew, by nearest-neighbour search. An
avatar with four faces still renders every emotion, just more coarsely.

Two searches, deliberately different (`avatar.cpp:230-330`, ported in `art/src/pose.ts`):

- **Faces** use an *ungated* nearest-neighbour: something always wins, because a figure
  has to have a head.
- **Torsos and simple bodies** use a *gated* search: a candidate must fall within half a
  wheel segment, or be a resting neutral, or it is not considered. Bodies can therefore
  fail to match, and the caller falls back to neutral.

Gestures (wave, point, shrug, the walks) are not on the wheel at all. They are sentinel
values above 2π, deliberately outside the metric, and match only exactly. So an emotion
constrains the **face** and a gesture constrains the **torso** — which is precisely what
lets a character wave while looking sad, and is how the `CEmotionOpts` set from stage 1
gets resolved: options are consumed highest-priority first, the first that yields a face
fixes the face, the first that yields a torso fixes the torso, and anything unfilled
falls back to neutral.

**One more detail worth keeping.** The torso search does not start at index 0 — it starts
after the pose used last (`m_lastTorso + 1`). Repeated identical emotions therefore cycle
through whatever variants exist instead of freezing on one drawing. The paper names this
as intentional: the system "has multiple neutral expressions and gestures, and cycles
through these to increase the visual richness". It is a two-line trick that does a
disproportionate amount of work in making generated panels not look generated.

## 3. Who is on stage, and which way they face

At most five characters per panel — beyond that, the paper says, facial expressions stop
being readable. Speakers must always be shown; addressees should be; new arrivals are
shown immediately.

Arrangement minimises a cost function over orderings and orientations
(`EvalPair`, `panel.cpp:278`). The shipped penalties match the paper's exactly:

| Penalty | Condition |
|---|---|
| 4 | `a` addressed nobody and is not facing `b` |
| 2 | `a` addressed nobody and `b` is not facing `a` |
| 40 | `a` addressed `b` and `a` is not facing `b` |
| 4 | `a` addressed `b` and `b` is not facing `a` |
| 4n | `a` addressed `b` and `n` characters sit between them |
| 1 | a character's left or right neighbour changed since the last panel |

The shape of the numbers is the content. Facing *away from someone you are addressing*
costs 40 — an order of magnitude more than anything else, because it is the one
arrangement that reads as broken. Positional consistency between panels costs 1, the
cheapest thing on the list, because the paper notes some comic artists do not value it at
all.

Search is greedy: place the first character, then try each insertion position and both
orientations for the second, and so on. Not optimal, and the paper says so — "it tends to
do an adequate job and is fast".

**Worth preserving: the cost function as a shape, not as numbers.** A weighted-penalty
model with a greedy search is the right complexity for this problem. The specific weights
are Comic Chat's guesses about *chat*, and Zork is not chat.

## 4. Balloon layout, and routing channels

The hardest algorithm in the system, and the one with the least transferable machinery.

Constraints: all balloons sit above the tallest character's head; reading order must be
strictly top-down then left-to-right; and each balloon must float at least partly over
its speaker's face. Bodies are placed greedily; **tails are not**, because the authors
tried greedy tail placement and got poor results.

The mechanism is the **routing channel** — a horizontal interval reserved for each
balloon's tail, disjoint from every other balloon's. Each new balloon trims the existing
channels just enough that they all remain wide enough for a tail, and shifts itself if it
would obliterate one. If a balloon cannot fit its channel, the algorithm tries to squeeze
the text; failing that, it gives up and reports how many balloons it placed — which is
the primary trigger for a panel break.

Balloon *bodies* are B-splines at tension 5.0, fitted around the laid-out text with a
margin. The paper spends a page on getting them to look hand-drawn: never dip inward on
one line to move out on the next, ignore small changes in the text outline, and add
low-frequency waves along long straight runs so the outline is not boring. That last one
is pure imitation of a specific artist (Jim Woodring).

**Mostly not worth preserving.** The B-spline balloon fitting is style-specific
craftsmanship for a look Grues in Comic has not committed to. The **routing-channel idea
is worth stealing**: reserving tail space up front, and letting failure-to-place be the
signal that a panel is full, is a clean way to make layout and pagination the same
decision.

Note also `transcriptText()` in `engine/src/events.ts` already fixes what "the text the
player saw" means. Balloon text has to come from there or the UI and the parity harness
drift apart.

## 5. Panel breaks and camera zoom

**Breaks.** In the shipped `AddLine` (`panel.cpp:1033`) a new panel starts when: the
balloon layout fails; five elements are already in the panel; the speaker already appears
in it (Comic Chat draws at most one balloon per character per panel); or the line is an
action/caption box. The paper adds a fifth rule — break with 15% probability when the
panel's first utterance ran long, so that single-character panels happen sometimes — but
**there is no such probability in `AddLine`**; the panel-break path calls no RNG at all.

The impulse behind that rule does survive elsewhere, though, and it is worth naming
because it recurs: balloon width is chosen randomly from a range, horizontal position
within a routing channel is random, line count is random, panel titles are picked at
random. Randomness is introduced *deliberately, to defeat regularity*. The system is
systematically anti-systematic.

**Zoom.** Comic Chat pulls in as tight as it can subject to three rules: do not cut a
character at the neck, do not let a required character be clipped by the panel edge, do
not cut at the ankles (knees are allowed).

The implementation is much thinner than the prose (`LayoutAvatars`, `panel.cpp:717`). The
"don't cut at the neck" rule is one line — cap the zoom factor at
`maxBodyHeight / (maxHeadHeight * 1.2)` — and zoom below 1.1× snaps to 1.0, so small
zooms never happen at all.

Establishing shots are thinner still. The paper says they appear "whenever a new person
enters a chat room" and "from time to time (about every 15 panels)". `Establishing()`
(`pageview.cpp:821`) does neither: it returns true only for the first one or two panels
on the first page, by counting them. There is no arrival trigger and no periodic
refresher — the establishing shot is a session-opening device and nothing more.

**Worth preserving.** Varying scale to avoid visual monotony is cheap and effective, and
the "establishing shot on arrival, then periodically" rule maps directly onto entering a
room.

---

## Where the paper and the code part company

Reading the paper as a specification will mislead you in five places. The pattern is
consistent: the paper describes the system the authors demonstrated, and the shipped code
is a subset with the expensive parts removed.

**Semantic elements were never shipped.** Section 6.3 and Figure 6 — the map of Ohio, the
scene object, the "Greek Chorus" meta-character making smart-alec remarks — are the
paper's most-cited feature. In the shipping source, `AddSemantics` and `PostSemantics` in
`semantic.cpp` are **both `#if 0`'d out**, their call sites in `AddLine` are commented
out, and the surviving code is annotated `// SIGGRAPH PIX Hack` and keyed on the literal
string `"OXio"` — a deliberately unmatchable misspelling of "Ohio", left behind so the
demo could not fire by accident. The feature existed to be photographed.

This matters beyond trivia: the paper's own stated objection to the approach — that it
"requires a large effort to generate enough pictures and clever remarks" — is exactly the
constraint Grues in Comic is under. The authors hit it too and shipped without it.

**The shout balloon does not exist.** The paper describes four balloon types and notes
parenthetically that the jagged-outline shout balloon is "yet to be implemented". It
still was not, three versions later. What ships is a different four: `CBWoodringNormal`
(speech), `CBWoodringWhisper`, `CBWoodringThink`, and `CBWoodringBox` — the last of which
the paper never mentions at all, and which turns out to matter most here (below). A fifth,
`CBWoodringMini` — the Greek Chorus's balloon — is `#if 0`'d out along with the feature.

**Character heights are not modelled.** `normHeight` is hard-coded to 100 with the
comment `XXX right now, we're assuming characters are the same height`, and a simple
avatar's head height is guessed as half its body — `for now, be conservative`. Relative
scale between characters, which a comic would use for staging, is simply absent.

**The 15% panel break and the periodic establishing shot are not there** — see stage 5
above for both. In each case the code implements a plainer rule than the paper describes.

---

## What Zork does to the premise

Comic Chat assumes **dialogue between peers**: several named participants, each speaking
in turn, each with a body on stage. Every algorithm above rests on that. Zork breaks it.

Measured across all 11 walkthroughs (189 turns, `verification/walkthroughs/`):

| Event | Count |
|---|---|
| `narration` | 192 — 173 `prose`, 19 `system` |
| `object-moved` | 189 |
| `player-moved` | 55 |
| `game-over` | 22 |
| `score-changed` | 14 |
| `question` | 2 |
| **`speech`** | **0** |

**Zero speech events.** Not "few" — none. Every player-visible line in the entire
verification corpus is narration. Zork I is second-person narration with five NPCs
(`GHOSTS`, `BAT`, `CYCLOPS`, `THIEF`, `TROLL`), none of whom speak in any walkthrough we
replay.

Three consequences, in increasing order of difficulty.

**Caption boxes must be first class — and Comic Chat's are first class in the wrong
direction.** The comic device for narration is the caption box, not the balloon, and here
it is the *dominant* device. Usefully, the precedent exists and does not have to be
invented: `CBWoodringBox` (`balloon.h:172`) is a real caption box, and its design is
instructive. It inherits from the speech balloon and then **opts out of everything that
makes a balloon a balloon** — `CreateBalloonSpline` returns `NULL` (no outline),
`AddArrow` is empty (no tail), `QueryRouteRgn` is a no-op and `SetRouteRgn` is a no-op
(no routing channel at all), and it carries its own type bit, `PE_BOX`. That is the right
shape: a caption is not a balloon minus a tail, it is a thing that declines to
participate in the tail-routing problem.

The mismatch is in its *panel policy*. A box arrives via `SM_ACTION` — the IRC `/me`
emote — and the very first thing `AddLine` does with one is `StartNewPanel()`. A caption
is treated as a rare interruption that gets a panel to itself. In Zork, captions are 100%
of turns. Inherit Comic Chat's caption *geometry*; invert its caption *cadence*.

**"Who is on screen when nobody speaks" has no default answer.** Comic Chat's rule —
always show the speaker — yields an empty panel. And the obvious fix, show the player,
runs into the fact that **Zork deliberately never describes the player.** There is no
avatar to draw, and inventing one is a design commitment, not an implementation detail.
The options are roughly: an unshown first-person camera with captions only; a chosen
player avatar; or panels composed around the *room* and its objects rather than around
characters. This is unresolved and should be resolved before stage 5.3, not during it.

**The one continuously present character is invisible.** Note the 189 `object-moved`
events — exactly one per turn. That is the thief's wander daemon, moving him around the
map every single turn. The character with the most continuous stage presence in the event
stream is one the player usually cannot see.

Zork's real dramatic units are not utterances but **entering a room**, **taking or losing
an object**, **fighting**, and **dying** — which are exactly the events the ADR 0002
contract already emits. The panel grammar should be built on those, with `speech` as the
rare case it actually is, rather than porting Comic Chat's utterance-driven grammar and
finding it idles.

---

## Summary: take, adapt, discard

**Take as-is.**
Emotion as (angle, intensity) with nearest-neighbour pose lookup — it decouples the art
supply from the emotional vocabulary, which matters most when art is scarce. Round-robin
cycling through equivalent poses. Over-producing text rules with late resolution against
available art. Deliberate randomness to defeat regularity.

**Adapt.**
The weighted-penalty-plus-greedy-search shape for staging, with weights rederived for
Zork's dramatic units rather than chat's. Routing channels, as the idea that layout
failure *is* the pagination signal. Zoom variation, and establishing shots on room entry.

**Discard.**
B-spline balloon fitting in Woodring's style — style-specific craftsmanship for a look
not yet chosen. Semantic elements — the authors did not ship them, for the same
art-budget reason that applies here with more force. The five-characters-per-panel limit,
which answers a constraint (many simultaneous speakers) that Zork does not have.

Also worth taking, and easy to miss because the paper never mentions it: `CBWoodringBox`
as the model for a caption — a balloon subclass that opts out of outline, tail and
routing channel rather than a balloon with those switched off.

**Must invent, because Comic Chat has no answer.**
Caption boxes as the *primary, per-turn* text device rather than a panel-breaking
interruption. The player's on-screen representation, or a deliberate decision to have
none. Panel composition driven by room-and-object events rather than by utterances. And
backdrops: Comic Chat shipped three, Zork has 110 rooms, and no amount of algorithm
closes that gap.
