# Casting roster survey — every Comic Chat avatar, measured for a role

**Date:** 2026-08-22 · **For:** F16 (player-chosen character designs) and F15 (NPCs on stage) ·
**Status:** measurement and candidate lists. **Not a decision** — the choosable roster is the user's
pick. The binding casting rules are ADR 0004 §11; this document is what §11 was amended from.

## What was measured

Every `.avb` in `original-projects/comic-chat/v2.5-beta-1/` — `comicart/` (25 files) and `artpack1/`
(10 files). Four names appear in both; the `artpack1` cut is richer in every case and is the one
counted here, so the corpus is **31 distinct characters**: 24 complex, 7 simple.

**`artpack1/` had never been surveyed.** The 5.2 measurement behind ADR 0004 saw 25 avatars, so six
characters (kevin, kwensa, maynard, rebecca, sage, scotty) were absent from every shortlist the ADR
records, and three of them out-draw everything the ADR quotes.

Per avatar: pose counts, which of the §10 marker emotions exist as a **F**ace and/or a **T**orso,
total figures (faces × torsos — the drawings a default shot can pick from), and whether the art is
monochrome ink or colour.

| id | name | type | pack | faces | torsos | figures | SCARED | SHOUT | ANGRY | HAPPY | COY | BORED | SHRUG | ink |
|---|---|---|---|---:|---:|---:|---|---|---|---|---|---|---|---|
| `anna` | Anna | complex | comicart | 18 | 16 | 288 | F+T | F | F+T | F | F+T | F+T | — | mono |
| `armando` | Armando | complex | comicart | 12 | 11 | 132 | F+T | F | F+T | F | F+T | F+T | — | mono |
| `bolo` | Bolo | complex | artpack1 | 14 | 16 | 224 | F+T | F+T | F+T | F | F+T | F+T | — | mono |
| `buck` | BUCK | complex | comicart | 14 | 13 | 182 | F+T | F+T | F+T | F+T | F+T | F+T | — | colour |
| `connor` | CONNOR | simple | comicart | 15 | 15 | 15 | — | F+T | F+T | F+T | F+T | F+T | — | mono |
| `cro` | Cro | complex | artpack1 | 14 | 16 | 224 | F+T | F+T | F+T | F | F+T | F | — | mono |
| `dan` | DAN | complex | comicart | 17 | 11 | 187 | F | F | F+T | F | F | F+T | T | mono |
| `denise` | Denise | complex | artpack1 | 20 | 12 | 240 | F | F+T | F+T | F | F+T | F+T | — | mono |
| `glenda` | Greg | simple | comicart | 1 | 1 | 1 | — | — | — | — | — | — | — | mono |
| `hugh` | Hugh | complex | comicart | 14 | 12 | 168 | F+T | F | F+T | F | F+T | F+T | — | mono |
| `jordan` | Jordan | simple | comicart | 14 | 14 | 14 | F+T | F+T | F+T | F+T | F+T | F+T | — | mono |
| `kevin` | Kevin | complex | artpack1 | 13 | 15 | 195 | F+T | F+T | F+T | F | F | F+T | — | mono |
| `kirby` | KIRBY | complex | comicart | 14 | 14 | 196 | F+T | F+T | F+T | F+T | F+T | F+T | — | colour |
| `kwensa` | Kwensa | complex | artpack1 | 16 | 18 | 288 | F+T | F+T | F+T | F | F+T | F+T | — | mono |
| `lance` | LANCE | complex | comicart | 11 | 11 | 121 | F | — | F+T | — | F | F | T | mono |
| `lynnea` | Lynnea | complex | artpack1 | 17 | 23 | 391 | F | F+T | F+T | F | F+T | F+T | — | mono |
| `margaret` | Margaret | complex | comicart | 20 | 13 | 260 | F | F | F+T | F | F+T | F+T | — | mono |
| `maynard` | Maynard | complex | artpack1 | 15 | 26 | 390 | F+T | F+T | F+T | F+T | F+T | F+T | — | mono |
| `mike` | Mike | complex | comicart | 10 | 8 | 80 | — | F | F+T | F | F+T | — | T | mono |
| `pedagog` | Pedagogue | simple | comicart | 1 | 1 | 1 | — | — | — | — | — | — | — | mono |
| `rainbow` | Rainbow | simple | comicart | 1 | 1 | 1 | — | — | — | — | — | — | — | mono |
| `rebecca` | Rebecca | complex | artpack1 | 19 | 24 | 456 | F+T | F+T | F+T | F+T | F+T | F+T | — | mono |
| `sage` | Sage | complex | artpack1 | 20 | 17 | 340 | F+T | F | F+T | F+T | F+T | F+T | — | mono |
| `scotty` | Scotty | complex | artpack1 | 24 | 9 | 216 | F+T | F | F+T | F | F | F+T | — | mono |
| `susan` | Susan | complex | comicart | 20 | 11 | 220 | F+T | F | F+T | F | F | — | T | mono |
| `tiki` | Tiki | complex | comicart | 20 | 12 | 240 | F | F+T | F+T | F | F+T | F | — | mono |
| `tongtyed` | TongueTyed | complex | comicart | 13 | 13 | 169 | — | F | F+T | F | F+T | — | T | mono |
| `tux` | Tux | simple | comicart | 1 | 1 | 1 | — | — | — | — | — | — | — | mono |
| `veronica` | VERONICA | complex | comicart | 12 | 15 | 180 | F+T | F+T | F+T | F+T | F+T | F+T | — | colour |
| `waf` | Waf | simple | comicart | 1 | 1 | 1 | — | — | — | — | — | — | — | mono |
| `xeno` | Xeno | complex | comicart | 13 | 14 | 182 | F+T | F | F+T | F | F | F+T | — | mono |

Reproduce with:

```
pnpm -C art exec tsx tools/roster.ts > roster.json                       # the table above
pnpm -C art exec tsx tools/roster-sheet.ts roster.json sheet.png BORED   # the picture, per emotion
```

## Four gates, not one

ADR 0004 §11 casts on **pose inventory**. Inventory is necessary and not sufficient, and the survey
found the counter-example: **lance passes the Hero predicate (SHRUG torso + BORED face) and is
unusable.** His head is a paper bag with two dots. Rendering his eleven faces side by side shows
near-identical drawings — BORED is NEUTRAL wearing a bag — so every §10 marker fires correctly and
nothing visible happens in the panel. Casting therefore clears four gates, in order:

1. **Type** — complex, for any role that must act. Simple avatars have monolithic bodies and cannot
   take the default shot. Rules out 7.
2. **Inventory** — the avatar owns the emotions §10 asks *that role* for.
3. **Legibility** — the faces visibly differ across NEUTRAL / BORED / ANGRY / SCARED. Judged by
   looking at `roster-sheet.ts` output, because nothing in `art/` asserts that a drawing reads
   (`docs/PITFALLS.md` → Art pipeline). Rules out lance.
4. **Register** — the figure belongs in a monochrome 1977-dungeon comic at roughly 200×450. Rules
   out the three colour avatars: **buck, kirby, veronica** are colour art at ~120×320, half the
   height of everyone else, and they read as children's-cartoon guest stars beside dan.

**20 characters clear gates 1, 3 and 4** (24 complex, less lance and the colour three). Gate 2 is what separates the three role pools below.

## The Hero pool

`parser-miss` is the Hero's most common beat (12.7%) and it emits **BORED + SHRUG**. Only five
complex avatars own a SHRUG torso — and four of them are the thinnest complex avatars in the corpus:

| Avatar | Figures | BORED face | Verdict |
|---|---:|---|---|
| `dan` | 187 | yes | **the cast Hero.** Clears all four gates |
| `lance` | 121 | yes | **excluded** — fails legibility (paper bag) |
| `susan` | 220 | no | substitutes COY — the parser beat reads as coy |
| `mike` | 80 | no | substitutes; also the smallest inventory in the corpus |
| `tongtyed` | 169 | no | substitutes |

**A choosable Hero cannot be built from this list** — it is one usable character wide.

**Settled 2026-08-22 (the user's decision, now an ADR 0004 §11 amendment): require the BORED *face*
and let the body substitute.** Gestures match by exact sentinel and never by nearest
(`headAndTorsoFor`, `art/src/pose.ts:139`), so a Hero with no SHRUG torso falls through to
`firstNeutral` and `parser-miss` draws **a BORED face on a resting body** — correct, silent, and less
funny than a shrug. The exasperation survives on the face, which is the half §10 leans on.

The Hero pool is therefore **17**: anna, armando, bolo, cro, dan, denise, hugh, kevin, kwensa,
lynnea, margaret, maynard, rebecca, sage, scotty, tiki, xeno. Only mike, susan and tongtyed are
excluded from the complex roster, on a missing BORED face; lance's slot is left empty by legibility.

**A picker should still surface the difference.** SHRUG ownership is now a tiebreaker, and the four
SHRUG owners besides dan (lance, mike, susan, tongtyed) are exactly the corpus's four thinnest
avatars — the old rule was selecting against inventory.

## The DM pool

The DM narrates: it wants POINTOTHER (every complex avatar has it), a wide face set for variety over
~100 panels, and full marker coverage so no beat silently substitutes. **20 of 24 complex avatars
are marker-complete** (own a face for SCARED, SHOUT, ANGRY, HAPPY, COY, BORED and NEUTRAL); the four
that are not are lance, mike, susan and tongtyed — the same four.

**Correction, from checking the mapper rather than the ADR: neither of those matters today.**
`GUIDE_EMOTION` (`web/src/comic/mapper.ts:75`) is a single fixed `angle 0, intensity 0` option — *"it
reacts to nothing, it comments"*. The DM never asks for SCARED or BORED, so **marker-completeness is
irrelevant to this role**, and ranking DM candidates by total figures is wrong: with a neutral
request, `nearestByAngle` can only return a strictly-neutral face and the torso falls to
`firstNeutral`. **The DM's real pool is its neutral poses only** — and the DM appears in nearly every
panel, so this is the number that decides whether it visibly loops:

| Avatar | Neutral faces × torsos | DM pool | Total figures (misleading) |
|---|---|---:|---:|
| `margaret` | 7 × 3 | 21 | 260 |
| `lynnea` | 4 × 5 | 20 | 391 |
| `sage` / `maynard` | 4 × 4 | 16 | 340 / 390 |
| `kwensa` / `tiki` | 5 × 3 / 5 × 3 | 15 | 288 / 240 |
| `anna` | 6 × 5 | 30 | 288 |
| `cro`, `dan`, `denise`, `hugh`, `rebecca`, `scotty`, `tongtyed` | — | 12 | 132–456 |
| `armando`, `bolo`, `kevin` | 3 × 3 | 9 | 132–224 |
| `mike` | 2 × 2 | **4** | 80 |

`rebecca` has the corpus's largest inventory and a DM pool of 12; `mike` has 4. Emotion range is a
**Hero** currency, not a DM one.

`susan` was on the ADR's Guide shortlist and is marker-incomplete (no BORED); that costs nothing in
this role, for the same reason.

## The NPC pool

F15 wants bodies on stage, most of them silent, so gate 2 barely applies and gates 3/4 relax — an
NPC that reads as a shape is doing its job. Everything not cast as Hero or DM is available, plus:

- **The two usable simple avatars**, `connor` (15 bodies) and `jordan` (14). Monolithic, no face
  compositing, fine for a silent body in frame.
- **`glenda`, `pedagog`, `rainbow`, `tux`, `waf` are not characters** — one body each. They are logo
  mascots and should not appear in a picker at all.
- **The colour three** (buck, kirby, veronica) are excluded from Hero/DM by register but are the
  obvious cast if a scene ever wants a deliberate outsider.

Suggested Zork fits, on silhouette alone — for the user to accept or ignore:

| Role | Avatar | Why |
|---|---|---|
| Thief | `armando` | tall, thin, dressed in black, beret and shades |
| Troll | `cro` | hairy brute; the only caveman in the corpus |
| Cyclops | `hugh` or `waf` | hugh is a robed beast with a face; waf is a one-pose blob, silent only |
| Something uncanny | `xeno` | an alien reads as wrong on purpose (§10 `uncanny`) |

## The user's proposed roster (2026-08-22)

**Fixed NPCs (3):** thief `armando` · troll `cro` · cyclops `xeno`.
**Hero pool (8):** anna, bolo, **dan** (default), denise, kevin, lynnea, margaret, rebecca.
**DM pool (7):** **tiki** (default), sage, kwensa, hugh, maynard, scotty, tongtyed.

*Revised 2026-08-22 after the first read: `mike` dropped from the DM pool (a 4-drawing pool for the
most-drawn role); `jordan` dropped as cyclops in favour of `xeno`, which needs no renderer work; and
the fourth "uncanny" NPC dropped — `uncanny` (§10) is a **Hero emotion fired by prose**, not a
character on stage, so there was never a body for it to cast.*

The three pools are disjoint, every pick clears gates 1, 3 and 4, every Hero pick owns a BORED face,
and every NPC is complex, so nothing here needs new rendering code. Three consequences remain, in the
order they would bite — the SHRUG question that stood here is decided above:

1. **The art payload roughly triples.** Packed: the three fixed NPCs are 228 KiB *always* loaded
   (armando 44, cro 125, xeno 59), plus one Hero (60–109) and one DM (61–128) — roughly 350–465 KiB
   against today's 149 KiB for dan + tiki. Per-cast fetching stops being an optimisation and becomes
   a requirement, and the three NPC sheets are the part that cannot be deferred.
2. **The framing ladder was tuned on dan.** dan is 388px tall; lynnea is 481 and bolo 469, ~24%
   taller in the same panel. ADR 0004 §7's six-rung `SHOTS` table and the pixel-gate goldens are both
   dan/tiki-shaped (F4, and F16's own note about cast-specific goldens), so a tall Hero needs a look
   before it is offered.

3. **Three NPCs is exactly the panel cap, and that is lucky.** `page.ts:503` starts a fresh panel at
   `bodies.length >= 5`, so Hero + DM + all three NPCs fills a panel to the brim without overflowing.
   A fourth NPC would have pushed a full stage into a panel break.

Non-issues worth recording, so they are not re-litigated: `tongtyed` missing BORED and SCARED **does
not matter for the DM** (§ above — `GUIDE_EMOTION` is fixed neutral); every Hero pick owning exactly
one BORED face is **no regression** — dan owns one too, so the most common beat already draws the
same face each time; and `xeno`'s 20 neutral drawings (4 × 5) are ample for an NPC that is usually
silent and on stage.

## What this does not decide

The choosable roster is a product decision and belongs to the user. This document supplies the pools;
F16 picks from them, and whatever it picks becomes an amendment to ADR 0004 §11 — not an edit here.
