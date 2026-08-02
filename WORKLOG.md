# WORKLOG.md

Persistent project history. **New entries go at the top (newest first); never edit past entries.**

**Versioning:** the project stays **0.x.x** for its entire pre-public life. **1.0.0 is reserved for
public launch** — the day the repo goes public and the website (likely a GitHub Page) ships. The
milestone that was briefly tagged `1.0.0` ("Gate C — engine complete") is `v0.9.0`; the whole former
`1.x` line has been renumbered into the 0.x series (`1.M.P → 0.(M+9).P`). `CHANGELOG.md` tracks the
same 0.x versions for public consumption.

---

## v0.26.2 — 2026-08-02 — `/hint` and `/help` become real shell commands, not game verbs

**v0.26.1 forwarded `/hint` into the engine as a real command; the user rejected the whole
premise.** "There's no such thing as 'HINT/HELP'" — `/help` and `/hint` are two separate system
commands, and hint must be reachable **only** through `/hint`, never through plain `hint`. This is a
bigger change than v0.26.1's routing patch: it moves HINT out of the engine entirely.

**Engine (`engine/src/engine.ts`, `engine/src/builtins.ts`).** `V-HINT` and `V-HELP` are gone, and so
are the `HINT`/`HELP` lexicon registrations (`addHostVerb`, now dead code, deleted). In their place,
`Engine` gained `hint(): string[]` — a **query, not a turn**: it reads scope directly (the same
filter `V-HINT` used — held + room, scenery/global excluded) without touching the turn counter, the
event stream, or `command()`'s dispatch chain at all. `HELP`'s content was pure static text with no
world-state dependency, so it needed no engine method — it moved to the shell outright.

**Shell (`web/src/session.ts`, `web/src/main.ts`).** `Session` gained a `hint()` passthrough. `/hint`
now calls it directly and prints to the console pane; `/help` absorbed the old `HELP` verb's "how to
play" text alongside the existing save/load/restart listing. Neither produces a comic panel — that
was already true of `/save`/`/load`/`/restart`, and it's the right consequence of hint no longer
being a turn: the comic pane renders turns, and this isn't one.

**Consequence, deliberate: plain `hint`/`help` typed as game commands now fail.** Neither was ever a
real ZIL word, so removing the lexicon registration means the parser rejects them exactly like any
other unknown word ("I don't know the word `hint`") — confirmed in the browser, and it does **not**
cost a turn, same as any other parse rejection. `engine/test/hint.test.ts` rewritten: tests `hint()`
as a query (returns the mailbox, leaves `turn`/`SCORE` untouched) and separately asserts the plain
words are unrecognized. `docs/PITFALLS.md`'s host-verb entry updated — `addHostVerb()` no longer
exists, but the trap it guarded against is still real for the next genuine host-only verb.

**Copy updated everywhere it named the old mechanism:** the console's onboarding line, `play/index.html`'s
static hint-note, the landing page's feature card, `docs/DESIGN.md` §3.3, `docs/DEVELOPMENT_PLAN.md`
§6.6 (revision note, not a rewrite of the closed entry). `CHANGELOG.md` gained a new public entry
rather than editing v0.25.2's.

**Tests:** 142 engine (`hint.test.ts` rewritten) · 293 web (`session.test.ts` +1) · pixel gate 17/17
— gate stayed clean because nothing inside `#comic`/`#console` markup changed, only the shell logic
around them.

---

## v0.26.1 — 2026-08-02 — 6.3 corrections: domain, upstream links, changelog source, `/hint`

**Four fixes on top of v0.26.0, all from the user's first read of the shipped site.**

**Wrong personal domain throughout.** The recorded origin was `danielkimdev24.com`; the user's actual
domain is `danielkimdev.com`. Corrected everywhere it appeared — `docs/DESIGN.md`, `docs/
DEVELOPMENT_PLAN.md`, `WORKLOG.md`, `web/index.html`, `web/about.html`, `web/changelog.html`,
`web/tools/changelog.template.html`, `web/package.json`. The recorded origin is now
`https://grues.danielkimdev.com`.

**Upstream repositories added to "Where this came from."** §3.4 named both source projects but never
linked to them. Added `github.com/historicalsource/zork1` and `github.com/microsoft/comic-chat` —
the same two repos `WORKLOG.md`'s own licence-verification entry (2026-07-xx) already cites — to both
the landing page's background section and the about page's opening paragraph.

**The changelog was generated from the wrong file.** `tools/build-changelog.ts` parsed `WORKLOG.md`,
the verbose internal engineering log, and put that detail on a public page — exactly what
`DESIGN.md` §3.5 warned against, just aimed at the wrong source. The project already has a
purpose-built public changelog, `CHANGELOG.md` ("Keep a Changelog" format), that had simply gone
stale — unversioned since `v0.17.2`, with all of Milestone 6 sitting in `[Unreleased]`. Fixed both
halves: the generator now parses `CHANGELOG.md`'s `## [vX.Y.Z] - DATE — summary` headers instead, and
`CHANGELOG.md` gained real versioned entries for `v0.24.9` through `v0.26.0` (Hero speaks his own
commands, save/load/restart, comic-pane dialogue fixes, HINT/HELP, the static site itself), each a
short player-facing summary rather than a slice-by-slice narrative. `[Unreleased]` now holds only
what's still ahead of `1.0.0`.

**`/hint` was reported broken; the command was not.** `HINT` and `HELP` (M6.6, built v0.25.2) are
ZIL-side host verbs, typed without a slash, as the console's own onboarding line says. But `/save`,
`/load`, `/restart` and `/help` are all slash-prefixed shell commands (M6.2), and a player who just
learned that pattern reasonably tries `/hint` next — which fell into `handleShellCommand`'s `default`
case and reported "Unknown command." Fixed by forwarding `/hint` to the engine as a real command
(`main.ts`, new `runGameCommand` helper shared with the plain submit path) rather than teaching the
player a syntax the game doesn't use twice. `/help`'s own listing and the unknown-command message
both now say HINT/HELP are typed without a slash.

**Tests:** 292 web, pixel gate 17/17 — unchanged, none of this touched engine or render code.

---

## v0.26.0 — 2026-08-02 — 6.3 built: the static site ships (local only)

**M6.3 is built**, following the build order `HANDOFF.md` left at session end: the layout move, the
shared token file, the six-section landing page, `/play` redirect, about + generated changelog, all
verified in the browser at real viewport sizes. Nothing is deployed — local-only via `serve.ts`,
per `docs/DESIGN.md` §6, until the user calls 6.5.

**Layout moved per DESIGN.md §6.** `web/index.html` → `web/play/index.html`, `web/style.css` →
`web/play/style.css`, script tag `./dist/…` → `../dist/…`. `web/` is now the website root; the
landing page lives at `/`.

**`web/tokens.css`** holds the exact §2 `:root` block. Both `web/site.css` and `web/play/style.css`
`@import url("/tokens.css")`; `play/style.css`'s own `:root` now only keeps what tokens.css doesn't
cover (`--status-bg/fg`, `--panel-bg/fg`, `--mono`), and `body`'s hardcoded `#0c0c0e` became
`var(--page-bg)`.

**Landing page** (`web/index.html` + `web/site.css`): all six §3 sections — masthead (live text
wordmark, blinking cursor, nav), introduction (H1, deck, amber CTA, secondary link, a Comic Chat
window holding a strip sample), features (4 cards, 2×2 → 1-up below 720px), background (two-column
eras + joining thesis + parity claim), changelog (latest 3, generated), footer (authorship line,
licence rows, non-affiliation, `THIRD_PARTY.md` link). Meta description, OG tags and canonical URL
all use the recorded origin `https://grues.danielkimdev.com`, absolute per §6 gotcha 2.

**The strip sample is real engine output, not a mockup** (§3.2's own requirement): rendered via
`tools/render-panel.ts` against `02-house-entry.cmd`, three panels picked (the classic opening, a
Hero traversal line, a both-speakers close-up in the Living Room) and stitched into
`web/assets/strip-sample.png` with `@napi-rs/canvas`.

**Changelog is generated, not hand-written** (§3.5). New `web/tools/build-changelog.ts` parses
`## vX.Y.Z — DATE — summary` headers out of `WORKLOG.md`, rewrites the `CHANGELOG:START…END` block
in `index.html` with the latest 3, and renders the full list into `changelog.html` from
`tools/changelog.template.html`. Wired as `npm run changelog`. Two hand-kept changelogs cannot
diverge because there is only one written by hand.

**`about.html`** carries the fuller history, the parity claim (143/143 walkthroughs byte for byte,
relocated here per the session that wrote `DESIGN.md`), the licence/trademark statement, and the
repo link.

**`serve.ts` gained two capabilities it didn't have.** (1) A 301 redirect `/play` → `/play/` — DESIGN
§6 gotcha 1 flagged this as necessary but `resolvePath` had a second, undocumented gap that would
have broken it anyway: **only the site root `/` resolved to `index.html`; every other directory
404'd**, including the redirect's own target. Fixed by resolving `index.html` for any path ending in
`/`, not just the root. (2) Extensionless routes (`/about`, `/changelog`) resolve to their `.html`
file on a 404 retry, since DESIGN.md §6 writes those paths without an extension.

**One real bug caught by browser verification, not by the type checker.** `main.ts`'s `WORLD_URL`
and `COMIC_ASSETS` were relative (`./world/…`, `./assets/comic`), correct only when the game's HTML
lived at the site root. At `/play/` they resolved to `/play/world/…`, one level below the actual
`/world/` mount, and the game failed to boot (`Could not start: world document: HTTP 404`). Both
became absolute paths. Caught by loading `/play/` in a real browser per DESIGN.md §8's own
instruction to iterate there rather than trust a still image — a type-only check would not have
caught it, since both were valid strings.

**Gameplay screen restyling, scoped per §6 as directed:** only the masthead wordmark treatment and
the shared token file, panes untouched. A `.masthead` header (same wordmark + cursor markup as the
site's) sits above `#shell`; `#shell`'s height became `calc(100dvh - 2.5rem)` to make room. The pixel
gate stayed clean (`npm run gate` — 17/17) because nothing inside `#comic` or `#console` changed.

**Verified in the browser at real viewport sizes** (DESIGN.md §8's explicit instruction — a still
image cannot resolve these): desktop and 375px-wide renders of `/`, `/play/`, `/about`; one real
defect found and fixed there — the masthead wordmark wrapped mid-word and the nav links crowded it
at 375px, fixed with `flex-wrap` on both the masthead and its nav.

**Not built, on purpose:** `build-site.ts`, `dist-site/`, a GitHub Action, `CNAME`, DNS — all 6.5.
The `website/` rename is still deferred (`docs/FUTURE_WORK.md` §2.4).

**Tests:** 292 web (unchanged) · pixel gate 17/17 clean.

---

## v0.25.3 — 2026-08-02 — 6.3 unblocked: `docs/DESIGN.md` written, site glyph built

**No code shipped. This is the specification session that unblocks the static site.** M6.3 had been
blocked since 2026-07-28 on a user-supplied `DESIGN.md` plus mockups; both halves are now resolved,
the first by writing the document and the second by withdrawing the requirement.

**`docs/DESIGN.md` (new).** The art direction rests on one rule that resolves every later conflict:
*the terminal is the page's substrate; the comic is what is pinned to it.* Text lives on black in
monospace (Zork's 1977–80 register); anything showing the game — panels, the CTA, screenshots — is a
Comic Chat window on top of it, with its own grey chrome and cream interior. The two never mix inside
one box. Explicitly excluded: ironic 90s pastiche, fake CRT scanlines, and Windows 95 widgets used
for things that were never widgets. The retro is *cited* in the sense ADR 0007 uses.

The token block reuses `web/style.css`'s `:root` verbatim so the site and the gameplay screen cannot
drift, adding only `--ink`, `--amber`, `--halftone` and `--measure`. **Two accents total** — green
belongs to the terminal era and marks interactive text; amber exists solely so the one CTA is the
warmest thing on the page. No webfonts, no bundler, radius 0 everywhere, depth by 1px borders and
two-tone bevels rather than blur.

All six sections the user asked for are specified — introduction, CTA, features, background,
changelog, copyright — plus responsive/motion/a11y rules and a file layout (`site/` beside `web/`,
`/` and `/play` routed by `serve.ts`).

**Every §7 open question was closed the same session:**

- **Wordmark** — terminal text, not a drawn mark, plus one original glyph for the thumbnail surfaces
  (Option D of four presented). A full drawn logo is coming from the user later and is recorded in
  `docs/FUTURE_WORK.md` §2.4 as **explicitly not blocking 6.3**.
- **Footer** — `A project by Daniel Kim`, linking to `danielkimdev.com`. Authorship phrasing rather
  than a `©` line, keeping the human note distinct from the three licence rows.
- **Feature cards** — 1, 2 and 4 accepted as drafted. Card 3 was replaced: the 143/143 parity claim
  is a *developer's* credibility line, meaningless to a visitor who has never played Zork, so the
  save/resume card (M6.2, real since v0.25.0) took the slot and the parity claim moved to §3.4 and
  the about page. A standing rule was added that **every card must be true on ship day** — the
  unbuilt PDF export being the obvious temptation.
- **H1** — `Play Zork I as a comic strip.` The user's proposal (*"Reimagining two historical
  Microsoft open-source projects as a browser-native comic adventure"*, the `AGENTS.md` self-
  description) was **relocated rather than dropped**: it has no verb to act on, withholds the two
  names behind a category label, and wraps to three lines at H1 size — but it is exactly right as the
  deck's opener, the meta description and the OG subtitle, which is where it now lives.
- **Game URL** — `/play`, same origin. §6 records the four reasons the site and the game app stay
  separate at all: different lifecycles (a typo fix must not re-run the pixel gate), load cost,
  keeping the gated pane unreachable from site CSS, and 6.4's asset separation.

**The mockup requirement was withdrawn (§8).** An image-generated page mockup was tried and returned
a generic dark enterprise-SaaS page — pricing tiers, testimonials, *"REHOST YOUR LEGACY VAX/VMS
APPLICATIONS"* — with none of the elements that make the design what it is. Traceable to the prompt
(*"1980s DEC computer terminal"* pulled the model to VAX/VMS marketing), but the general lesson
stands: a diffusion model cannot hold a twelve-element page spec. **The old §8 rule that "the mockup
wins" was itself the hazard** — it would have let that misfire overwrite a considered design — so it
is replaced by a narrower rule: a later mockup wins only where the document is silent, never against
a dated decision.

**The glyph is built** (`site/assets/`): `glyph.svg` master, `favicon-32.png`,
`apple-touch-180.png`, `og-card.png` (1200×630) and its `og-card.source.html`. Subject is the grue's
eyes in the dark, `--accent` on `--page-bg`. Single-subject generation worked first try where the
page mockup failed.

The SVG is a **trace** of the user's raster, not the raster: green mask → two connected components →
convex hulls → 6 outer and 5 inner vertices per eye → mirrored about x=192 (the generated halves
already agreed to within one pixel). Three defects fixed in the pass, each a §3.7 requirement the
raster missed — colour snapped to the tokens (`#6abf6e` on `#111113` as measured), the generator's
watermark sparkle removed (it survived to 16px as a visible dot), and **the crop tightened from 66%
to 88% of frame width**. That last one is what matters: verified at 16px, the eyes stay distinct and
the inner slits still read as notches, where the untightened raster became a green blob. The crop was
the problem, not the drawing.

**`docs/grues-favicon/` is committed as the user's backup, not as a shipping asset.** It is an
earlier, different logo — a pixel-art grue face with "GRUES IN COMIC" lettering inside a border
frame — and it violates three §3.7 rules (lettering, container shape, more than two tones); at 16px
it is illegible. Its `site.webmanifest` also carries empty `name`/`short_name` and white
`theme_color`/`background_color`, wrong for a dark-substrate site. Retained deliberately; see
`docs/DESIGN.md` §3.7.

**Also recorded:** `docs/PITFALLS.md` → Tooling gained the two headless-Chrome rasterizing traps
(screenshotting an `<img src="…svg">` captures before load; Chrome enforces a minimum window size so
small `--window-size` values yield empty frames). Both fail *silently* with a plausible file and no
non-zero exit code, and both were hit generating these assets.

**Documents touched:** `docs/DESIGN.md` (new), `docs/DEVELOPMENT_PLAN.md` (6.3 unblocked in three
places), `docs/FUTURE_WORK.md` §2.4, `docs/PITFALLS.md`, `HANDOFF.md`.

---

## v0.25.2 — 2026-08-02 — 6.6: HINT and HELP commands built

**M6.6 is built — new stage, scoped and closed the same session.** New players unfamiliar with
text-adventure trial-and-error get two new in-fiction commands, alongside the existing `/help`
shell command (M6.2, save/load/restart — unrelated, slash-prefixed so it can never shadow a real
verb). `HINT` and `HELP` are typed bare, like any other verb, and are dispatched by the parser like
one.

- **`HINT`** (`engine/src/builtins.ts` `V-HINT`) lists everything currently in scope — held items
  plus the room's own objects — by name, via `scope()` filtered to drop `origin === "global"`
  (the always-in-scope pool: hands, walls, the grue) and anything flagged `NDESCBIT`/`INVISIBLE`.
  Deliberately shallow: which verb usefully applies to an object is runtime behavior the routines
  decide, not a static property scope can answer, so `HINT` names things and stops — no verb, no
  effect, nothing spoiled.
- **`HELP`** (`V-HELP`) is a static command-syntax primer (verb + object, a few worked examples)
  that points at `HINT`.
- **Neither is a ZIL verb**, so neither can come from the extracted vocabulary. `engine.ts`'s new
  `addHostVerb()` registers both words on the lexicon directly at `createEngine`, the same shape a
  real `SYNTAX` entry would take (zero object slots, action `V-<WORD>`) — `buildLexicon(doc)` itself
  stays untouched and ZIL-faithful.
- **The start-of-game pointer is static HTML** (`web/index.html`'s `.hint-note`, styled in
  `style.css`), not an engine event: the opening turn's text is diffed byte-for-byte against golden
  transcripts (143/143 strict), so anything new there would show up as a parity regression against
  a reference interpreter that never printed it. Same reasoning that keeps the copyright banner
  host-side.
- **Console pane only, by the user's explicit choice** — no comic-pane rendering of the hint
  listing.
- New `engine/test/hint.test.ts`. 142/142 engine tests green, `tsc --noEmit` clean, parity still
  143/143 strict (`npm run replay`).

## v0.25.0 — 2026-08-02 — 6.2: save / load / restart built

**M6.2 is built — UI over the engine's existing save contract, no engine change.** `web/src/main.ts`'s
`handleShellCommand` (already the interception point bare `save`/`restore` used) now routes four
slash commands: `/save [1-3]`, `/load [1-3]`, `/restart`, `/help`. Every shape decision was made last
session (`docs/DEVELOPMENT_PLAN.md` §6.2, 2026-08-02); this session was implementation only.

- **Three named slots** are separate `persistence.ts` `createSessionStore` keys
  (`grues-in-comic/save/v1/slot/1..3`), distinct from the autosave/current-game key `resume()` reads
  on boot — a named save can never collide with autosave, and `/load <n>` works by copying the slot's
  `{save, turns}` envelope into the current-game key, then `location.reload()`, so the existing
  resume/replay path (the only one that rebuilds both panes and the Director state correctly) does the
  actual rebuild.
- **Slot labels are derived, not stored**: `slotLabel()` reads a slot's `SaveState` directly
  (`locations[PLAYER_ID]`, `globals["SCORE"]`, `turn`) through the same fields `Session.load` already
  uses to rebuild the status line on restore, so `1: Troll Room, score 45, move 88` never drifts from
  what `/load` would actually resume.
- **`/restart` confirms by re-entry**: one `/restart` arms a `restartArmed` flag and prints the
  confirmation line; any other command (including a malformed slash command) disarms it; a second
  immediate `/restart` clears the current-game key and reloads.
- **Discoverability**: a `[Type /help for save, load, and restart commands.]` system line at session
  start, through the same `consoleView.appendSystem` channel `[missing routines: …]` already uses.
- Verified live in a browser session with `agent-browser` (not just unit tests): `/help`'s listing,
  bare `/save`/`/load` slot listing (all-empty and after saving two slots), `/save <n>` then `/load <n>`
  round-tripping back to the saved room/score/move, `/load` on an empty slot reporting
  `Slot n is empty.`, the disarm-on-other-command case, and the confirmed double-`/restart` actually
  clearing to a fresh game. 292/292 web tests green, `tsc -p tsconfig.build.json` clean — no test
  additions, since `main.ts` is DOM bootstrap with no unit tests today and nothing here moved logic out
  of it worth extracting.

## v0.25.1 — 2026-08-02 — declaration/reaction panel-split bug fixed

**Found in play by the user, not measurement**: on nearly every room visit, the DM's still-open frame
(a silent traversal turn with nothing else to say, staged with the Hero's *body* but no balloon via
`reactions`) refused to let the *next* turn's declaration answer it — `AvatarInPanel`'s literal port
(`panel.cpp:655`) does not distinguish a posed body from a spoken one, so it forced a fresh panel
purely because the Hero was already standing there, splitting what ADR 0010 §2 was built to make a
two-shot. `page.ts`'s `addLine` now takes a weaker `avatarSpokeInPanel` (checks `panel.speakers`, not
`panel.bodies`) for a line carrying `PageLine.answers`, gated on `line.room === undefined` — a
departure-room line clone-appending into an older, already-committed panel was found (in the same
investigation) to relabel that panel's `room` to wherever *this* line's own turn happened to depart
from, exposed via a collapsed traversal's journey line mis-painting its run's arrival panel.

- **Measured**: 43 of 1058 panels in the full-game corpus were declaration-vs-fit-driven splits before
  this fix; with the real fit test, 32 remain (genuine balloon-space constraints — correct, unrelated
  to this bug); under `ALWAYS_FITS` the pure-logic count dropped from 17 to 1. D5 stays 2.3, D5′ moves
  from 46.6% to 44.1%, both inside their bands — `density:accept`/`gate:accept` re-baselined
  deliberately, not blindly, after eyeballing the pixel diffs.
- **A second, narrower cause of the same visual pattern exists only at a session's opening 1-2
  panels** (`/restart` or first load) — `m_panels.GetCount() < 2` (`panel.cpp:1079`/`:1148`) is a
  genuine, deliberate historical port, already pinned by `mapper.test.ts`. **Left as-is, the user's
  explicit call**: fixing it means retiring that fidelity-pinning test, and the recurring, throughout-
  play case is what this fix addresses. See `docs/PITFALLS.md` → Web & the comic pane for both entries.
- `director.test.ts` updated in two places: the wordless-frame invariant now scopes the required
  `roomTitle` to `kind === "traversal"` (a `kind === "terminal"` wordless reaction — the death/quit
  shot — legitimately has none, newly exposed because a turn's own trailing content more often ends up
  orphaned now that its declaration successfully reaches back); the back-and-forth-walk test's journey
  line now correctly merges into the arrival's own DM balloon (2 speakers, not 1) since it carries no
  `room` override to conflict with the fix's guard.
- 292/292 web tests green, `tsc -p tsconfig.build.json` clean, verified live in a browser via
  `agent-browser`: a real playthrough now draws the DM and Hero talking in one panel on an ordinary
  room visit.

## v0.24.9 — 2026-08-01 — 6.1k: D5′ set and verified — ADR 0010 fully built

**ADR 0010 slice 4 is built — all four slices are now built, and the ADR's status moves to Built.**
D5′ (ADR 0010 §4, "the share of emitted panels in which both characters speak") gets its band from
this slice's own measurement rather than an invented number: `web/tools/density.ts` exports
`D5_PRIME_MIN = 25` and `D5_PRIME_MAX = 60`, a new `rates().bothSpeakersShare` derives
`panelsBothSpeakers / panels`, and the report prints it alongside D5. `density.test.ts` asserts both
ends of the band, over the corpus total and the full-game oracle separately.

- **Today's number: 43.7%** (477 of 1091 emitted panels carry both speakers) — comfortably inside the
  band, with room on both sides for 6.1e's remaining authoring to move it without the band needing to
  move too.
- **Neither golden had drifted since 6.1j.** The density baseline and the pixel gate both already
  matched before this slice touched anything, so there was nothing to re-pin — 6.1h–6.1j already
  carried that cost.
- **Read the full-game transcript in two slices (turns 0–50, 230–270)** with a throwaway script built
  on the same `createDirector`/`createSession` wiring `density.ts` uses, since the ADR's own
  consequence section says no counter here measures *shape*. It reads as a conversation: declarations
  and replies alternate, rotation holds across both slices sampled. One soft spot found and left as-is
  because it is out of this slice's scope: `dig sand` repeats its declaration verbatim four turns
  running mid-game (Sandy Cave) — an existing lexicon-depth gap from 6.1h/i, not something this slice
  introduced or was asked to fix.
- 292/292 web tests green, `tsc --noEmit` clean.

**ADR 0010 in full:** the Hero declares his command as table-talk on 98.3% of turns (§1), the
declaration answers the DM's still-open frame across the turn boundary (§2), a collapsed traversal run
of two or more speaks its destination as one journey line (§3), and D5′ now has a number and a band
with a stated failure mode at each end (§4). M6.1's stated purpose — filling the pane's silence with
the player's own voice — is closed. What remains under M6.1 is 6.1e's authoring volume, which was
always open-ended and is not an ADR slice.

## v0.24.8 — 2026-08-01 — 6.1j: the collapse gives ground

**ADR 0010 slice 3 is built.** `director.ts`'s traversal buffer now counts `runLength` alongside the
buffered script. A run of exactly one flushes exactly as it always has — its own per-turn declaration,
untouched — because a single traversal turn was never a run and the ADR says so explicitly. A run of
two or more has its buffered script's declaration swapped for a **journey line**: the Hero's single
line for the whole walk, naming where he ended up ("Back to the cellar.") rather than repeating each
step's own. The lexicon lives in `script.ts` as `JOURNEY_LINES` — its own rotation, not routed through
`COMMAND_SCRIPT` — and the destination's title comes from a new `journeyRoomTitles` table, wired
through `main.ts` → `comic-view.ts` → `DirectorOptions`.

- **Deliberately not the location box's `roomTitles`.** That table exists on `MapperOptions` for the
  ADR 0009 §3 caption but has never actually been wired in production (`comic-view.ts` never passed
  it, so the caption has been showing raw room ids all along — a dormant, pre-existing gap). Wiring it
  would be a separate, unscoped change with its own pixel-gate blast radius across every panel, not
  this slice's to make, so 6.1j gave the journey line its own table instead.
- **A run whose last step can't speak still speaks.** `withJourneyLine` first looks for the buffered
  script's own declaration and swaps its text; when there isn't one (the last step's command fell in
  the lexicon's silent tail — `climb tree` with no direction word to phrase, say), it inserts a fresh
  line instead, borrowing the emotion the turn's silent-Hero reaction already carried and dropping that
  reaction now that the line covers it. Measured over the corpus this branch never fires today (every
  run's last step in the eleven walkthroughs happens to be a bare direction), but it is not
  hypothetical — the lexicon's 4.4% silent tail is real, and a run should not lose its voice because of
  which step happened to end it.
- **The corpus:** of 50 collapsed traversal runs, 17 are length two or more and now speak the
  destination instead of the last step's own line. Panels **1091 → 1091**, unchanged — this slice
  trades *what* the run's frame says for *whether it stays wordless in a merge*, not panel count; a
  run's own frame already survived on its own before this slice (confirmed by diffing panel totals
  against the pre-6.1j code on the same corpus). The ADR's own 60-discarded/56-panel figure is from the
  v0.24.1 census, before the Hero had any declaration at all — by the time 6.1j starts, slices 1–2 had
  already recovered nearly all of it, so the number this slice can honestly claim is the swap-vs-insert
  split above, not that older count.
- **One test's expectation changed for a real reason, not a regression.** `director.test.ts`'s
  back-and-forth-walk test used a silenced `commandScript` to isolate the collapse mechanism from
  declaration content — but the journey line is the Director's own default, not routed through
  `commandScript`, so the run now speaks regardless. Its previously-wordless frame can no longer
  clone-append into the following same-room turn (a body with something to say behaves like any other
  panel), so the test now asserts two panels where it asserted one; the comment explains why.

Stage 6.1j is ✅ in `docs/DEVELOPMENT_PLAN.md` §6.1. Work resumes at **6.1k** (set D5′ from the
measurements, re-pin both goldens, read a full playthrough) — the slice that actually closes M6.1's
stated purpose.

---

## v0.24.7 — 2026-08-01 — 6.1i: the exchange crosses the turn boundary

**ADR 0010 slice 2 is built.** `PageLine.answers` (`page.ts`) is the fact a line carries to say "I am
replying to what's already on screen, not asking something new." `isOrphaned` no longer forces the
next line to open fresh outright — it arms a new `guardFragment()` guard, consumed by whichever line
reaches the page next: an unmarked line still breaks (the M6.1g mis-pairing guard, unchanged), a
marked one is let through to the ordinary clone-append rules. In `mapper.ts` the Hero's declaration
moves to the front of the turn's own lines, ahead of even the room-change `<Brk>` — it answers the
*previous* turn's still-open frame (what the DM said last), not a comment on this turn's own
narration, which hasn't happened yet. The room break, this turn's DM lines and the garnish
(resolved action or beat reply) still follow in their old relative order.

- **The one real trap:** pulling the declaration out of `heroLines` also pulled it out of the
  "did the Hero say anything this turn" check that gates the reaction fallback and the death shot.
  That starved a turn with nothing else to say (a plain traversal step) of any representation at
  all once its declaration went to answer the *previous* frame instead — the room-change break fired
  with nothing behind it to land in. Fixed by keeping those two checks on `heroLines` alone, exactly
  as before ADR 0010 §1 existed; the declaration's cross-turn role doesn't change what a turn's own
  frame needs.
- **Measured over the full won game (423 turns, still STONE-BARROW 350/350):** the two-shot metric
  6.1h collapsed (137/165 → 17/274) recovered to **218/274 (79.6%)**, close to the pre-ADR0010
  baseline. `panelsBothSpeakers` **243 → 477**. Panels **1158 → 1091** — the join nets *fewer*
  panels than slice 1 alone, not more, since a declaration that joins an existing frame doesn't open
  one. Both goldens re-accepted after looking at the drifted images (17 gate cases, no garbling — the
  join reads as a real two-shot, not an overlap); 292/292 web tests green.
- **`page.test.ts` gained a direct pin of the guard mechanism itself** (not just the corpus-level
  consequence): a marked line joins a DM-only fragment; an unmarked one still doesn't, same as
  M6.1g's original test. `director.test.ts`'s trailing-run test needed updating for a real behavior
  change it happened to exercise: the walk's own declaration usually can't join the still-open frame
  from the arrival before it (the Hero already spoke there — an ordinary same-speaker block, nothing
  to do with the new guard), so the flush now emits two panels instead of one.

Stage 6.1i is ✅ in `docs/DEVELOPMENT_PLAN.md` §6.1. Work resumes at **6.1j** (the collapse gives
ground — a single traversal turn stops counting as a run, a longer run earns a journey line).

---

## v0.24.6 — 2026-08-01 — 6.1h: the Hero speaks his command

**ADR 0010 slice 1 is built.** `COMMAND_SCRIPT` (`web/src/comic/script.ts`): 24 direction aliases
sharing one 12-line rotation (directions are 47.6% of the corpus and the deepest repetition the
project has ever authored for), ~19 intransitive verbs, ~37 transitive verb keys with 1–3
`{noun}`-templated lines each. The 12-command tail (`take all`/`drop all`, bare `y` ×11, `xyzzy`,
`plugh`, bare `take`/`put`, four bare nouns) stays silent by design, per the ADR. `heroDeclaration()`
plus a fold cursor in `mapper.ts` match direction → phrasal verb → intransitive verb → verb+noun, a
pure function of `turn.command`. `ACTION_SCRIPT` ("Worth the weight.") is now garnish: it gained a
4-turn cooldown and is held outright on any turn a declaration fires, so the panel never carries two
Hero utterances (ADR 0009 §6 unchanged). No panel-flow change, as the slice specifies.

- **Measured over the full won game (423 turns, still STONE-BARROW 350/350):** Hero speaks on
  **416/423 turns (98.3%)**. Panels **1141 → 1158 (+1.5%)** — far under the ADR's own +42% estimate;
  the shipped lexicon overlaps DM frames more than the ADR's prototype did, so declarations land in
  frames that were already being drawn more often than the estimate assumed. `panelsBothSpeakers`
  **172 → 243**, the direction the ADR predicted. Both goldens re-accepted after looking at the
  drifted images; 293/293 web tests green (11 new).
- **Read through for the play-log tell** ("Let's head north." several hundred times, the failure ADR
  0005 §1 removed in costume) — not found; the rotation reads as varied.
- **One real seam surfaced, deliberately not patched here.** The declaration now usually claims the
  panel's one Hero-utterance slot ahead of the old beat reply, so the DM+reply two-shot metric
  collapsed **137/165 → 17/274**. This is not a regression to chase in this slice — it is exactly the
  join ADR 0010 §2 (slice 2, stage 6.1i) exists to close, where a declaration marks itself as
  answering and clone-appends into the DM's frame. `density.test.ts`'s assertion on that metric was
  relaxed to a sanity bound rather than invented around.
- **Judgment call, unspecified by the ADR:** `ACTION_SCRIPT`'s cooldown is 4, chosen so the silent
  tail of the lexicon doesn't leave a long run of un-cooled reaction lines.

Stage 6.1h is ✅ in `docs/DEVELOPMENT_PLAN.md` §6.1. Work resumes at **6.1i**.

---

## v0.24.5 — 2026-08-01 — ADR 0010 accepted, and the stage regains a work queue

The user accepted **ADR 0010 whole** — both decisions, §1–§4. Status flipped to **Accepted
(2026-08-01)**; no code written against it.

- **The four slices became plan stages 6.1h–6.1k**, each with its own exit criteria, so
  `docs/DEVELOPMENT_PLAN.md` is once more the authority on what to do next: 6.1h the lexicon and the
  declaration, 6.1i the cross-turn join, 6.1j the collapse giving ground, 6.1k setting D5′'s band
  and verifying.
- **6.1e is paused rather than closed.** ADR 0010 subsumes the silent-turn question it was blocked
  on, but the a/b/c room-authoring option is deliberately kept in `HANDOFF.md`: if 6.1j returns
  fewer of the 60 discarded walks than hoped, those rooms are the fallback.
- **`HANDOFF.md` now carries a starting brief for 6.1h** rather than a decision — the build order,
  the tier sizes the v0.24.3 measurement implies, the goldens to expect drift in, and the one check
  no counter here performs: **read a playthrough**, because the `, then` tic proved nothing in this
  repo measures the *shape* of a line.

---

## v0.24.4 — 2026-08-01 — ADR 0010 is written, and it is two decisions

`docs/adr/0010-the-hero-declares-his-move.md`, **Status: Proposed**. Nothing is built; the ADR needs
acceptance first. It is written around the shape v0.24.3's measurements forced on it.

- **§1 — the Hero declares his move.** The command re-voiced as table-talk, three tiers (directions,
  intransitive verbs, transitive templates over the command's own nouns) as data in `script.ts`, with
  the trigger and cursor in `mapper.ts`. **Supersedes ADR 0005 §1 as an *exclusivity* only** — §1's
  reason (a balloon reading `n` is a play-log, the player is the author) is preserved verbatim as the
  constraint the ADR works under, because the raw string and the re-voiced intent are different
  claims and §1 only ever disposed of the first. `ACTION_SCRIPT` survives as garnish with a cooldown;
  one Hero utterance per panel, declaration wins.
- **§2 — the exchange, not the turn, is the panel's unit.** A declaration clone-appends into the
  frame it answers (`PanelDelta.replacedLast`, which already ships). **6.1g's `isOrphaned` is recast
  on ask-vs-answer** rather than same-turn — and the *line* carries the marker, so `page.ts` decides
  it without learning the cast. The reader watching a drawn panel gain a balloon is accepted
  deliberately and flagged as M6.2 state.
- **§3 — the traversal collapse gives ground** (amends ADR 0005 §3). The collapse stays; the discard
  goes. A run keeps one panel and one **journey line**, and a single traversal turn stops counting as
  a run. This is the half that actually reaches the 60 walks the Director throws away, and it is
  separable from §1 on purpose.
- **§4 — D5 retires for D5′.** A turn rate stops meaning anything when the Hero speaks every turn
  (~1.0 by construction), so the target becomes both-speakers as a share of **panels** — still a
  band, both ends failing, **numbers set from the first slice's measurement rather than invented in
  the document.**
- **Alternatives are recorded with their reasons**, including the honest one: taking §1 without §3 is
  legitimate, but taking it *believing* it fills the silence is not — which is why the 116/56
  measurement sits in the ADR body.
- **Housekeeping:** ADR 0005 gains the back-reference. **ADR 0009 gains a correction header** — every
  figure in it was measured before the corpus repair and is void (its "154 wholly silent turns" is
  136, of which 119 are one thing); its decisions stand.

---

## v0.24.3 — 2026-08-01 — ADR 0010 input: the commands are voiceable, the panels are not free

The user proposed that the Hero speak his *command* as table-talk, the way a player declares an
action to a DM. Measured before writing the ADR, per the standing method note. Two questions were
asked; a third answered itself and matters more than either.

- **A — re-voiceability: 95.6%, and the lexicon is small.** 611 commands over the corpus, 183
  distinct. A prototype lexicon of **86 entries** (22 directions, 22 intransitive verbs, 42
  transitive templates) phrases **584 of them**, at a mean of 19 characters — shorter than the
  Hero's existing lines. Shape: **directions are 47.6%** of everything typed, transitive verbs
  41.1%, intransitive 6.9%. **The tail is 12 distinct commands / 27 occurrences** and every one is a
  known kind: `y` ×11 (answers to the parser's disambiguation question — a *reply*, with no verb to
  voice), `take all` / `drop all` (an intent with no object until the events come back), the magic
  words `xyzzy` / `plugh`, bare `take` / `put`, and four nouns typed alone. None of it is a surprise,
  and all of it is authorable by hand.
- **B — balloon pressure: +42%.** One command line per turn, measured at the page level against the
  real fit test over the won full game: **722 → 1025 panels**. The Director is deliberately outside
  that loop (it would edit the two arms differently, and balloon pressure is a page property), so
  these are not the shipped 594 — the *ratio* is the finding. For scale, 6.1d's four limiters cost
  +68% and were accepted. The upside moves too: panels carrying both speakers **172 → 286**.
- **C — the one that changes the proposal, and nobody asked for it.** The stated point of speaking
  the command was to fill the 119 silent revisit walks. **All 116 of them in the full game are
  buffered into traversal runs, and the Director collapses those runs to 56 panels** (ADR 0005 §3 —
  a run keeps only its destination). So **at most 56 of the 116 can carry a line at all; the other
  60 are discarded before anyone reads them.** Speaking the command does *not* fill the silent block
  unless the collapse rule is opened up as well — which is a second ADR-level change, and the one
  that actually decides whether the proposal delivers what it was proposed for.

**Consequence for the ADR:** it is not one decision but two — *the Hero speaks his command* and *the
traversal collapse gives ground*. They can be taken separately, and the first without the second
buys conversation everywhere **except** the place the census said was empty.

The measurement tool was written and deleted, as in sessions 2 and 3. The prototype lexicon is
described above rather than kept: 86 template lines are cheap to re-author, and an unreferenced tool
in `web/tools/` would rot against the mapper it observes.

---

## v0.24.2 — 2026-08-01 — M6.1e session 4: the Hero stops saying ", then"

A read, not a measurement, and no instrument would have caught it: the user read the Hero's dialogue
back and objected to the cadence. **Roughly one in five of his utterances ended in `, then`** — and
the tic was not an authoring slip, it was *specified*.

- **One template, 59 firings.** `heroBalloon` in `mapper.ts` was `The {name}, then.` on every take
  and `The {name} can stay.` on every drop — the only Hero content still hardcoded outside
  `script.ts`, and therefore the only Hero content with no rotation behind it. Every counter the
  pane has measures firings and gaps; none of them measures *shape*, which is why 6.1g's clustering
  work went straight past it.
- **`wiki/the-hero.md` prescribed it.** Rule 1 gave `"The lantern, then."` as *the* example of his
  register, so six authored beat and gazetteer lines copied the suffix out of the spec. The rule now
  says what it meant — clipped fragments, no fixed construction — and says explicitly that a voice
  document must describe a register rather than a shape, because a literal example gets reproduced
  verbatim across the corpus.
- **The fix is the one the beats already use.** `ACTION_SCRIPT` in `script.ts` (5 take lines, 3
  drop), `{name}` substituted by the mapper, and a cursor **per kind** in the mapper's fold so a long
  collecting run does not walk the drop rotation it never reaches. Still a pure function of the
  event stream, so the oracle is untouched. The option defaults to the shipped table rather than to
  empty: this line is derived from events and always sayable, so an un-updated caller must not go
  silent.
- **Voice chosen by the user from three candidate registers** — reaction over report ("Worth the
  weight.", "Somebody left this lying around.") on the grounds that the panel already shows him
  taking the thing.
- **Cost, looked at and accepted:** the two-shot goes **158 → 156 of 274** and panels 593 → 594 on
  the full game. Not a length effect — shortening the longest new line changed nothing; varying the
  text simply lands different lines against the fit test. D5 holds at **2.3**.
- **Verification:** both gate panels that carry the line were rendered and read (`wk01-p06`,
  `wk01-p08`) — clean two-shots, "Taken." / "Worth the weight." — before `gate:accept`; density
  baseline accepted at 8 drifted counters. **280 web** (+2 new: the rotation wraps, and the two
  cursors advance independently) / **139 engine** / **198 IR** green, typecheck clean, parity
  **143/143 strict**.

---

## v0.24.1 — 2026-08-01 — M6.1e session 3: the silent turns turn out to be one turn, 119 times

The last thing 6.1g left was a census to re-take: the 154 silent turns and their composition were
measured over the losing replay and were void. Taken again over the repaired corpus, **no code
changed** — the slice is a measurement, and the number it replaces was never the point. The
composition is.

- **136 of 623 turns (21.8%) are wholly silent.** Of those, **119 are a walk into a room already
  visited** — the room title, no prose, and no gazetteer line because a first visit happens once.
  The remainder is 11 scene-ending `quit`s and 6 refusals suppressed by a beat's own cooldown. That
  is the whole block.
- **The varied tail was never silent.** 22 examine states, 8 re-looks, 7 lamp toggles, 7 inventory
  listings, 6 waits, 5 score checks — the old census's long list — are all turns where the DM
  narrates and only the **Hero** says nothing back: **154 DM-only turns**, a different lever with a
  different cost. The old figure was not merely stale; it pointed at the wrong surface.
- **The 119 are skewed over 35 rooms** — Cellar 13, Kitchen 11, Coal Mine 10, Round Room 8,
  East-West Passage 8, Behind House 7, North of House 6; 10 rooms are hit exactly once. A handful of
  rooms is most of the block.
- **The trade is now numeric, which is what makes it decidable.** The corpus sits at 2.27
  turns/exchange over 274 exchanges, so **~38 new exchanges reach D5's 2.0 floor** and all 119 would
  take it to **1.59**. Three options, all the user's: voice the top ~10 rooms inside the headroom;
  trade against the refusal beats; or move the band now that a won game is what is measured.
- **The design hazard that travels with it:** a revisit line sits on the one authored surface that
  **wears out** — the same room, entered many times — the exact inverse of the first-visit gazetteer
  that v0.23.0 chose *because* it cannot. Anything written here needs a run, a cycling tail and its
  own cooldown from the first line.
- **The census tool was written and deleted again**, following v0.23.0's precedent. It classifies by
  what the player typed and what the engine emitted, never by re-deriving the mapper's firing rules;
  a kept copy is the second-copy hazard `density.ts`'s own header warns about. The measurement lives
  here.

---

## v0.24.0 — 2026-08-01 — M6.1g: the corpus is repaired, and it takes three conclusions with it

6.1f ended by finding that the row carrying two thirds of every M6.1 measurement was a game **lost**
at the troll and then flailed through 16 surface rooms. This slice repairs that row, re-measures, and
fixes the four presentation findings that were logged against the old numbers. Three of the four
turned out to be about something other than what M6.1f named, which is the real lesson of the slice.

### The repair

- **`runFullGame` now records what it typed** (`RunResult.issued`, plus `fullGameCommands()`). The
  resilient list — repeated strikes, re-arms after a disarm, the hoard ferry — is what wins;
  `12-full-game.cmd` on its own is authored *for* that driver and does not. `density.ts` takes the
  full-game row from that log instead of from disk, and replaying it into a fresh session at seed
  1234 reproduces the won game turn for turn: **423 turns, STONE-BARROW, 350/350**, against Rocky
  Ledge, 30/350, 16 of 110 rooms. Crashing commands are in the log deliberately — the harness
  swallows them and carries on, so a replay that skipped them would diverge.
- **Corpus 606 → 623 turns**, and the full-game row moves everywhere: read-aloud 68 → 300, gazetteer
  16 → 67 (the flail never reached 51 of the rooms it now visits), panels 314 → 593.

### What the repaired numbers said, against what M6.1f said

- **The two-shot was not 59%, it was 26%** — 70 of 274 exchanges in one panel. And the cause was not
  panelization: it was `BALLOON_HEADROOM`. The band `fit.ts` lays balloons into is the same band that
  keeps a head clear of a straddling balloon, and a panel drawing the location box gives
  `TITLE_HEIGHT` of it away, leaving ~90px at `UNIT` — room for one balloon. So the fit test was
  refusing the facing two-shot on exactly the turns that carry a room title, which is exactly the
  turns a losing flail does not have. **0.36 → 0.44, decided by the user after before/after renders:
  158 of 274.** 6.1d's exit criterion is met on a won game for the first time. It also retired the
  pinned `mob4-p02` stack fallback, so `gate.test.ts` now pins that set at empty.
- **The clustering culprit was `routine-ack`, not the refusal beats.** "Taken." is what a `take all`
  and the endgame hoard ferry produce on consecutive turns, and its three-line tail was recycling at
  a gap of **one panel** — "And that one." 34 times. Cooldown 3 on `routine-ack` and `scored`, plus
  a longer loop on each (5 and 4 lines): repeats within 20 panels **70 → 6**, tightest real gap
  **1 → 30**. A measurement artifact worth knowing: a pair whose halves are the same string (the echo
  joke) always reports a gap of 1.
- **D5 moved off the floor as a side effect** — one exchange every **2.0 → 2.3** turns, mid-band.
  The pending D5 question is repriced and still the user's.

### The other three findings

- **The split exchange mis-paired**, and it is fixed in `addScript` (`isOrphaned`). A frame missing
  one of its own turn's speakers is a fragment, and a fragment no longer accepts a later turn's line
  — so the Hero never shares a frame with a question asked after he answered. The rule is
  cast-agnostic, because `page.ts` knows nothing about the DM or the Hero, and it only fires on a
  frame that is short a speaker, so the traversal collapse and the ordinary two-shot are untouched.
  A `speakerInPanel` divergence from `AvatarInPanel` was tried first and **reverted**: it changed
  nothing, because the fit test was the blocker all along.
- **The "empty" panels are kept.** Rendered and looked at: a location box, the Hero standing in a
  room he has walked back to, no balloon — the traversal collapse's one output (ADR 0005 §3), and
  deleting it would delete the only trace of the walk. What is now pinned against is the genuinely
  blank frame: no balloon **and** no body.
- **The death panel is set where the death happened** (`panelRoom`). ZIL narrates the killing blow
  and then resurrects inside one turn, so `room` had already moved on — the troll's blow was
  captioned *Forest* and drawn against the forest backdrop. The fold's `room` still advances; only
  the panel is pinned back. The corpus cannot catch this any more (the walkthroughs survive and the
  full game wins), so it is pinned by a synthetic turn.

### Verification

Both goldens deliberately re-accepted, after looking at all 13 drifted gate images one by one — no
pixel objection; figures drop a few pixels on `close-up` only, and `establishing`/`wide` are
identical. **278 web** (271 + 7 new) / **139 engine** / **198 IR** green, typecheck clean on all,
parity **143/143 strict**.

---

## v0.23.1 — 2026-08-01 — M6.1f: the playthrough is read, and the corpus turns out to be a dead man walking

6.1f is the verification slice — re-pin the goldens, re-accept the pixel gate *after looking at the
images*, and read a full playthrough end to end. The first two were clean in minutes. The third one
was the point of the slice, and it found what no aggregate number could.

- **Both goldens were already in sync and nothing needed re-accepting.** `npm run gate` → *clean, 17
  cases*; `npm run density` → *baseline unchanged*; 271 web / 139 engine tests green, typecheck
  clean. The dialogue-density baseline and `panel-gate.json` still describe the shipped code, so
  6.1f re-pinned nothing — the right outcome, not a skipped step.
- **The gate images were looked at, one by one.** `runGate()` only writes PNGs on drift, so the 17
  cases were dumped to `web/tools/out/` (gitignored) and read. They are good: the location box sits
  where ADR 0009 put it, the description balloon carries the run, the two-shot faces correctly,
  `mob4-p02` still shows its documented `stackBalloons` fallback. No pixel objection.
- **Then the full-game corpus was read as a comic, panel by panel — and the headline is that
  `12-full-game.cmd` does not complete under the comic replay.** The command list is authored for
  `runFullGame`, which is *resilient*: it repeats combat until the villain falls. A naive replay —
  which is what `web/tools/density.ts` and the comic pane do — loses the troll fight on turn ~70,
  is resurrected in the Forest, and then spends the remaining ~330 commands bouncing off walls.
  Measured: **final room Rocky Ledge, score 30/350, 16 of 110 rooms visited.** The engine's
  completion test is not wrong — it drives the resilient harness and still reaches the barrow at
  350 — but the *density corpus* is a different run of the same file.
- **That is two-thirds of every M6.1 number.** The full-game row is 406 of the corpus's 606 turns.
  So "refusals are 45% of all turns", the 2.0 exchanges-per-turn corpus figure, and the 154-silent-
  turns census are all dominated by a flail through 16 surface rooms, not by a playthrough. The
  question 6.1e left for the user — *leave the silence, trade refusal beats for it, or move D5's
  band?* — is posed on that data, which is why it should not be answered before the corpus is fixed.
- **Reading it also surfaced four presentation findings that no counter was watching.** The split
  exchange **mis-pairs**: when a two-shot splits, the frame that carries the Hero's reply also
  carries the *next* turn's DM line, so the reader sees him answering the wrong question (144 of 300
  exchanges split, and long stretches read entirely as offset pairs). **Three panels are empty** —
  `[wide]` frames with a location box and no balloon at all. The **death panel wears the wrong
  location box** (the Troll Room killing is narrated under a *Forest* title, the room the
  resurrection moved to). And the refusal lines **cluster**: the worst repeats 10 times, and the
  same DM/Hero pair recurs within ~20 panels — a per-playthrough maximum of 12 reads much worse when
  the hits are adjacent than when they are spread.
- **Nothing was fixed in this slice, by design.** Each finding is logged where it belongs — the
  corpus caveat as a `PITFALLS.md` rule, the four presentation findings in `FUTURE_WORK.md` §2.1 —
  and the corpus repair is the recommended next action because the pending D5 decision depends on it.
- The browser half was done too: the game was played in the shell at :8080 and the pane read live.
  It behaves as the transcript says it does.

---

## v0.23.0 — 2026-08-01 — M6.1e session 2: the rooms answer back, and D5 becomes the constraint

Session 1 left a number to act on and session 2 refused to act on it until it had been measured
again — which was right, because **the number was wrong**. The standing method note earned its keep
for the sixth time.

- **The census, before any writing.** 56.6% of turns carrying no marker was a conflation of two
  different counts. Measured directly: **220 of 606 turns (36.3%)** carry no marker — traversal 88,
  ambient 87, arrival 45 — and the useful split is not by `PanelKind` at all but by who was already
  speaking: **164 turns are wholly silent, and 56 are the DM narrating a room at a player who says
  nothing back.**
- **That killed the choice the last session framed.** The two candidate levers were "a fallback
  keyed on `PanelKind`" (widest reach, risks generic lines) and "a Hero half for the gazetteer"
  (narrow and safe, est. ~26 turns). The census says the safe one is not narrow: **every single
  marker-less first visit — 45 of 45 — already had a gazetteer line and no reply.** The generic-line
  risk was avoidable for free, so the fallback was not built.
- **The gazetteer became an exchange.** `GuideScript` now takes a `BeatExchange` as well as a bare
  string (every existing entry and test script unchanged), and all **88 rooms** were written a Hero
  half. This is the one authored surface that **cannot wear out** — a first visit happens once, so
  there is no run, no cooldown and no repeat to design around. It is now a `PITFALLS.md` rule,
  because a future firing rule that let a room line repeat would put the only unprotected surface
  into the class that needs protection.
- **`blocked-exit` widened over 10 more turns** the census found in the map's voice rather than the
  parser's — "You would need a machete to go further west", "There is no tree here suitable for
  climbing". Two singletons were deliberately left silent: one turn in the whole corpus is a
  coincidence, not a beat.
- **Measured after:** corpus **2.5 → 2.0**, oracle **2.7 → 2.4**, and the scene that was the reason
  for the session, `07-forest-and-tree`, **8.0 → 2.3**. No scene now reads worse than 2.3. Exchanges
  241 → 300 of 606; two-shot 156 of 300.
- **The finding that outlives the slice: 6.1e is now bounded by D5, not by effort.** The corpus sits
  on the *bottom edge* of the 2–3 band, so the 154 turns still silent — composition known: 69 bare
  walks with no prose at all, 22 container states on examine, 8 floor items, 8 re-looks, 7 lamp
  toggles, 7 inventory listings, 6 waits, 5 score checks — cannot simply be given beats. Each one
  now has to be **traded** against the refusal beats that fire 283 times, or the user moves the
  band. That is a decision, not a task, and it is where the next session should start.
- **Tests:** 271 web (+2: the room pair, and the DM-only entry it must not break), 139 engine, 198 IR, pixel gate clean at 17 cases, parity 143/143 strict. The
  density baseline was re-accepted deliberately (99 counters moved).
- **The census tool was written and then deleted on purpose.** It re-derived the mapper's affect
  input to classify turns, which is the second-copy hazard `density.ts`'s own header warns about —
  it would have agreed with the mapper right up until it didn't. The measurement lives here.

---

## v0.22.0 — 2026-08-01 — M6.1e session 1: the refusals get a voice, and runs learn to cycle

6.1d met D5 by volume. The first thing 6.1e measured was what that volume was made of, and the
answer disqualified it: **218 of 252 exchanges were a run's last line repeating** — 150 of them
`parser-miss` alone. The pane reached "one exchange every 2.4 turns" by saying the same thing over
and over. This session fixed the quality behind the number, and left the number where it was.

- **The big markers split by what actually happened.** `parser-miss` was one marker answering three
  different noes, so its lines could only ever be generic. Measured over the corpus it is
  `not-here` ~95, `not-carried` 54 and `unknown-word` 11 — three different jokes, now three markers
  with their own runs. Splitting also divides the firing count any one run has to carry.
- **The map's "no" was the largest silent thing in the game.** 114 turns say exactly *"You can't go
  that way"* and carried no marker at all — bigger than any beat except the parser family. It is
  `blocked-exit`, its own marker rather than a `parser-miss` variant, because the parser understood
  perfectly and it is the *map* that refused: he is not misunderstood, he is walking into a wall.
- **ADR 0006 §4 rule 4 is amended, with its reasoning intact.** Rule 4 said the last line of a run
  repeats and nothing cycles, so a beat never loops back to sounding freshly surprised. That holds
  for a beat firing 3–14 times; it does not survive one firing 160 times. A run may now declare a
  **cycling tail** — `run` is the arc, walked once and never re-entered (which is exactly what rule
  4 was protecting), and `loop` cycles after it. Worst-repeated line in a full playthrough: **150 →
  12**. Distinct authored lines in a playthrough: ~30 → **91**.
- **A beat carries its own cooldown**, and this is the finding that surprised me. Scripting the two
  refusal families at the table's 0 put the corpus at **one exchange every 1.6 turns and the oracle
  at 1.5** — *past the bottom* of D5's band, two characters talking over the game rather than about
  it. D5 is a band, not a floor, and the ceiling assertion added at 6.1d caught it. How often a beat
  is worth hearing now sits beside its lines, where the author can see how many there are.
- **The cooldown clock had to move.** `turn.status.moves` does not advance on a refusal — ZIL does
  not charge for a rejected parse — so a run of refusals is several turns wearing one number, and a
  cooldown measured in moves is no cooldown at all on precisely the beats that needed one. The
  mapper counts its own reads instead. 6.1d had already found this and filed it as harmless at
  cooldown 0; it stopped being harmless the moment a beat wanted a cooldown.
- **Density held while quality moved:** 2.5 corpus, 2.7 oracle, every scene in band except
  `07-forest-and-tree` at 8.0. Two-shot 149 of 241 (62%) — lower than 6.1d's 75%, and it is a
  composition effect rather than a regression: refusal turns suppress the DM's read-aloud, so
  cooling them shifts the surviving exchanges toward turns that carry a description run.
- **Tests:** 269 web (+2: the cycling tail, the per-beat cooldown), 139 engine, 198 IR, gate clean
  at 17 cases. Ten tests moved off the marker *name* onto `markerFamily`/`isRefusal`, which is the
  seam that makes a fourth variant a table edit and nothing more.
- **Next session's material, measured not guessed:** 56.6% of turns carry no marker (ambient 191,
  traversal 89 of 606). That is why one scene still reads 1-in-8 while every other is at 2, and it
  is the last big block of silence.

---

## v0.21.0 — 2026-08-01 — M6.1d: the limiters come off, and D5 is met

The slice the whole stage was pointed at. ADR 0009 §5/§6, built — and the number M6.1 is judged on
moved from **one exchange every 21.6 turns to one every 2.4**, with the full-game oracle (the honest
row, the one that started at **one in 135**) at **2.6**. D5 asked for one every 2–3, on the corpus
*and* on the oracle. Both.

- **Four limiters, and they turned out to be two.** The plan named the `action ?? reply` exclusion,
  the cooldown, marker coverage and gazetteer contention as four compounding limits. Two of them
  were the same object: **one cooldown budget shared by every authored line.** A beat silenced an
  unrelated beat, and either silenced a room's single first-visit gazetteer line *permanently*,
  because the room path never comes round a second time. The cooldown is now **per beat**, the
  gazetteer is **not cooled at all**, and the shipped value is **0** — measured, not chosen: at 1 the
  corpus reads 3.8 and the oracle 5.8, both outside D5, because the markers that carry a playthrough
  arrive in clusters and a clock deletes half of every cluster. What replaces the clock is the run:
  consecutive firings say consecutive lines, which is an escalating conversation rather than a stuck
  record.
- **The Director drops a refusal only when it has nothing to say** (§5). It asks the *script*, not
  the marker table — `speaks(script)`, everything that is not a `<Brk>`/`<Chr>` sentinel — so the
  dialogue M6.1e writes changes what survives without touching `director.ts` again.
- **`parser-miss` is scripted, ten deep.** 26.4% of all turns, the largest marker in the game and the
  one the pane was silent on; the DM holds the rulebook and the Hero is the player who knows exactly
  what he meant, so it is written as an argument that wears down rather than a joke that repeats.
  `routine-ack` (4.3%) joined it — scriptable only because §6 now lets the Hero report *and* answer.
- **The Hero may report an action and answer on the same turn** (§6). The exclusion existed to keep
  two of his balloons out of one panel, which the caption would then split; the caption went at
  6.1c, so only the ordering survives — derived action first, authored garnish second. The DM is
  staged through his run with `<Chr>` for the same reason the Hero is staged through the DM's: if the
  pair splits, the frame without the staging cuts away from half the conversation.
- **The instrument had to be repaired mid-slice, and that is the finding worth keeping.**
  `density.ts` attributed panels to turns through `panel.turn` — but a panel carries the context of
  the *last* line written into it, so once most turns spoke, whole turns vanished from the map and
  the report printed "194 of 154 (-40 split)". It now attributes per turn from the Director's own
  `PanelDelta`, and it distinguishes "the exchange landed in one panel" from "the whole turn landed
  in one panel": a turn whose DM also reads a description aloud is a panel *run* by ADR 0009 §4, and
  the exchange closing it is exactly what the run is built to end on. Under the honest reading,
  **189 of 252 exchanges land the two-shot in one panel.**
- **The cost, accepted in advance by ADR 0009 §5:** panels 478 → **801** (+68%) over 606 turns. More
  turns survive the edit, so a playthrough is more comic. Table-talk balloons 54 → 308.
- **The tripwire fired and was inverted, as 6.1a designed it to be.** `density.test.ts` asserted
  `turnsPerExchange > 5` — "we are still nowhere near" — and failing it *is* the exit criterion. It
  now bounds D5 on both sides, plus a new test that keeps the two-shot the common case. Three older
  tests guarded rules this slice retired and were rewritten to guard what replaced them.
- **Tests:** 267 web (+2) · 139 engine · 198 IR · pixel gate clean, 17 cases, no drift (its fixtures
  carry their own scripts). Nothing in `engine/` or `ir/` was touched; parity stays 143/143 strict.
- **Still open, and named rather than deferred quietly:** `parser-miss` fires 160 times in the
  corpus and a ten-line run means the tenth line repeats a hundred and fifty times — depth is
  M6.1e's, together with the question of whether a beat that frequent wants a *rotating* tail
  instead of a settled last line (that would amend ADR 0006 §4 rule 4, so it is a decision, not an
  edit). And one scene walkthrough, `07-forest-and-tree`, still reads one exchange every 8 turns:
  the forest is unmarked ambient turns, which is precisely the material 6.1e exists to write.

---

## v0.20.0 — 2026-08-01 — M6.1c: the caption channel retires, and the DM speaks the room

The first slice that changes what the pane draws. ADR 0009 §2/§3/§4, built: narration became the
DM's speech balloon, the top-left box became the location name as **panel metadata**, and a long
room description became a run of balloons across as many panels as it takes.

- **Captions 96.7% → 0%.** That was the point: a `BM_ACTION` line unconditionally opens a panel
  (`panel.cpp:1064`), so the box was instructing panelization to break the panel on nearly every
  turn. **Exchanges landing in one panel went 20 of 28 → 24 of 28** without a single change to the
  dialogue tables. Panels 411 → 478 (+16%), the cost the ADR predicted and accepted.
- **What the DM says now:** 366 read-aloud balloons where there were 0, plus the 54 authored ones he
  already had. On a turn the player moved he reads the *whole* description — packed into ≤200-char
  balloons, never splitting a sentence — and the room *name* is stripped out of it, because the name
  is the box (the channels concatenate without punctuation, so reading it back gave "North of House
  You are facing…").
- **`register: "narration" | "authored"` on every line.** The two registers were suddenly
  indistinguishable — both are `guide` speech — and half the suite was asserting on "the DM's line"
  meaning the authored one. Rather than have tests infer it from the text, the line carries where it
  came from. It cost nothing (`page.ts` carries it, never reads it) and it is what the density tool
  and every dialogue golden now key on.

**Three things the design did not foresee, each found by a test and each now a caution:**

1. **The caption was also holding the panel open.** With it gone, a room change clone-appended into
   the *previous room's* panel and `clonePanel` relabelled that panel with the new room — one panel,
   two places, with the location box on top. And a death frame was absorbed by the next turn, which
   **deleted the `reaction` rung from the corpus outright: 11 turns, 0 panels.** Both now ask for the
   break explicitly with `<Brk>` (`panel.cpp:1067`) — the port's own answer, not a new mechanism.
2. **`roomTitle` must survive a clone-append.** It is the one panel field that does not take the
   incoming context: the box is metadata about *where the panel is*, not about its newest balloon.
3. **The Hero must be staged through the DM's whole run**, with `<Chr>` after every DM balloon but
   the last. Two of the DM's balloons never share a panel (`AvatarInPanel`), so an ordinary
   read-aloud + gazetteer turn is already a two-panel run — and without the staging the comic cut
   away from its own subject for the first half of it.

**Verification.** 265 web tests green (was 262). The pixel gate drifted on all 11 production cases,
as predicted; **re-accepted after looking at the images**, which is also where the staging bug was
confirmed by eye. Density baseline re-accepted. Engine parity untouched at 143/143.

**Rule this session is an instance of:** *when a mechanism is doing two jobs, removing it costs you
the job you were not thinking about.* The caption was a channel **and** a panel break; every failure
above is the second job coming due. A rule test cannot catch it — "the `reaction` rung exists" was a
corpus census, and it is the only reason the death frame did not ship broken.

---

## v0.19.1 — 2026-08-01 — M6.1b: ADR 0009, and the caption turns out to be the limiter

Documentation only; no code changed. `docs/adr/0009-the-dm-reads-the-room.md` records D1–D5 and
settles the mechanism the user's decisions left open. The plan expected this slice to work out *how a
description splits across two panels*; measuring first changed the shape of the answer.

- **The re-ranking.** §6.1 listed four compounding limiters and the caption was the fourth. It is the
  first: a `BM_ACTION` line unconditionally opens a panel (`panel.cpp:1064`), and 96.7% of turns
  carry one, so panelization is told to break the panel almost every turn. **So the caption channel
  retires** — narration becomes the DM's *speech* balloon (which ADR 0006 §2 had already declared it
  to be, in fiction), and the box becomes renderer-drawn metadata: the room's display name, on room
  change only (D4). Nothing then instructs a break on an ordinary turn, and the facing two-shot
  becomes the ordinary case instead of the exception. The cause, not the symptom.
- **Two DM registers, with different economics, and the distinction is load-bearing.** Read-aloud
  (derived from the turn's narration, **uncooled**, zero authoring cost) and table-talk (authored,
  cooled). `GUIDE_COOLDOWN` exists so the *authored* voice does not wear out; it had no business
  gating narration the player just caused, and after this ADR it does not.
- **The split is n panels, not two.** Sentence-packed into ≤200-char balloons: **44 of 81 arrivals
  fit one, 12 need two, 25 need three or four.** Each balloon is one `AddLine` and `page.ts` decides
  the panels — the port's job, not a policy invented here. The Hero is staged silent through the run
  and **his line lands in the last panel**, so an arrival *ends* on the two-shot rather than opening
  on one and trailing into monologue. That is the answer to "what is the Hero doing in the second
  panel".
- **Two corrections to the diagnosis, both from measuring before writing.**
  - **`parser-miss` is 26.4% of turns (160), not 12.7%** — the older figure was a different corpus.
    `kind: refusal` is the same 26.4%, and the Director drops **all** of it (ADR 0005 §3). It is the
    largest single lever on D5, so the ADR supersedes that drop: a refusal with a line is a beat and
    is kept; a silent one is still dropped.
  - **The 180-char cap was never the leak.** It drops 9 turns in 606, every one of them the same
    188-char sentence, so D3's rise to 200 recovers exactly those nine. And the box never showed a
    room description at all — first sentences run p50 24 / max 163 characters where an arrival's full
    narration runs p50 179 / p90 422 / **max 588**. "The DM speaks the room description" is *new
    text*, 3–9× longer than the box holds, which is what made the split a real question.
- **Also superseded: ADR 0006 §4 rule 2.** The action no longer suppresses the reply — with the
  caption gone the premise (two Hero balloons would split the two-shot) is gone. It survives as an
  *ordering* (action first, reply second) and the fit test decides the rest.
- **Recorded costs, so no slice discovers them.** The panel stream gets longer (more turns survive
  the edit); the pixel gate will drift on nearly every panel and must be re-accepted *after looking
  at the images*; `stackBalloons` fallbacks should be expected where none were.

**Rule this session is an instance of:** *measure before proposing rules — including before writing
the document that fixes the rules.* Two of the three premises the slice was scheduled on were wrong
in the same direction: the thing that looked like a text-length problem was a panelization problem,
and the biggest lever was mis-sized by half. Both were an hour's probe away.

---

## v0.19.0 — 2026-08-01 — M6.1a: the authored dialogue becomes data, and the density becomes a number

M6.1's target is a measurement — an exchange every 2–3 turns (D5) — and the thing being measured
could not be reached. `GUIDE_SCRIPT` and `BEAT_SCRIPT` were written inside `web/src/comic-view.ts`,
the one module in the comic stack that imports `document`, so every corpus tool that wanted to
replay the pane (`mapper.test.ts`, `gate.ts`) invented a throwaway script instead. **The shipped
dialogue had never been measured.** The ~5.8% in the §6.1 diagnosis was a hand count, done once.

- **`web/src/comic/script.ts` (new)** — the two tables and `GUIDE_COOLDOWN`, moved verbatim. Data
  only: the first-visit trigger, the cooldown and the run cursor stay in `mapper.ts`, which is what
  keeps the mapper a deterministic pure function and therefore still the parity oracle. The view now
  imports the tables; the cooldown it used to pass as a literal `3` is the module's constant, because
  it is the budget the tables are *written against* and 6.1d is going to move it.
- **`web/tools/density.ts` (new)** — the report, modelled on the pixel gate: run it, read it, accept
  it. All 12 walkthroughs including the completion oracle, at seed 1234, in **two stages that answer
  different questions**. *Script*: a bare mapper, per turn — what the authoring produces. *Screen*:
  the production Director with the real fit test, per emitted panel — what survives the edit and
  where `AddLine` put it. A DM line is attributed to beat or gazetteer, and a Hero balloon to reply or
  action report, **by looking the text up in the shipped table** rather than by re-deriving
  `exchangeFor` here; a second copy of that logic would agree until 6.1d changed one of them.
- **The numbers, and one correction.** Over 606 turns: **28 exchanges (4.6%) — one every 21.6 turns**;
  29 spoken beats (4.8%), where the hand count said 35 (5.8%); **20 of the 28 land in one panel, 8
  split across two** — limiter 4 quantified; captions **96.7%**, which reproduces the diagnosis
  exactly and is the reason for the splits. The Director dropped none of them.
- **The finding the corpus average was hiding.** The full-game oracle carries **3 exchanges in 406
  turns — one every 135.** The eleven scene walkthroughs all open at West of House and are dense in
  first visits, so they flatter the gazetteer; the rest of a playthrough is revisits, where the room
  table has nothing left to say and the beat table is the only source. D5 is therefore a ~7–11× move
  on the scene corpus and **~50× on a real playthrough** — 6.1e's authoring load is larger than the
  scene numbers suggest, which is the answer to "how much dialogue is enough".
- **Baseline** `web/test/golden/dialogue-density.json`, pinned by `web/test/density.test.ts`
  (**web 255 → 262**). Counts only — rates are derived, so the baseline cannot disagree with itself.
  Alongside the pin, invariants that hold whatever the numbers do (a Hero balloon is a reply *or* an
  action, never both; nothing reaches the screen that was not scripted), and one deliberate
  **tripwire that fails when 6.1d succeeds**, so passing D5 is an event someone has to acknowledge
  rather than a threshold quietly crossed.

**Rule this session is an instance of:** *a target expressed as a number needs its instrument built
first, and the instrument must read the shipped artifact.* The tables were correct, the mechanism was
correct, and the one number the milestone turns on was still off by 20% — because it had been counted
by hand against code no test could reach.

---

## v0.18.13 — 2026-07-28 — `HANDOFF.md` and `AGENTS.md` cut to what a session actually needs

The two files loaded at every session start had grown to ~4,970 words between them. Most of that was
durable rather than current: cautions that must be true whenever a subsystem is touched, sitting in a
file whose stated scope is "what the next session needs".

- **`docs/PITFALLS.md` (new)** takes the durable half — Open Issues, Standing Notes, the pixel-gate
  operating notes and ADR 0008's still-live decisions — reorganized **by subsystem** (Engine/IR ·
  Web & the comic pane · Art pipeline · Tooling & platform · the pixel gate · the port · Method) with
  a lookup table on top. The point of the reorganization: a session touching `art/` reads twelve
  lines, not two hundred. **Read the section for what you are changing, before you change it.**
- **`HANDOFF.md` 344 → 108 lines**, and its scope rule is now explicit about where things go instead:
  narrative → `WORKLOG.md`, durable cautions → `PITFALLS.md`, deferred work → `FUTURE_WORK.md`.
  Status compressed from four milestone paragraphs to four lines; Next Actions became an index into
  `DEVELOPMENT_PLAN.md` §6 rather than a second copy of it; Key Paths lost the rows that repeated
  what the paths themselves say.
- **`AGENTS.md` 178 → 64 lines.** Purpose/Objective/Core Principle/Long-Term Vision were four
  sections making one point, and the Engineering Principles bullet lists were generic. The system
  documents became one table with a *when to read* column, which is the part an agent actually needs.
- **Per-session load: ~4,970 → ~1,570 words (-68%).** Verified nothing durable was dropped by
  diffing bullet-by-bullet against the previous `HANDOFF.md`; everything flagged as missing was
  either session narrative now in this log, or a decision now in `DEVELOPMENT_PLAN.md`. One rule was
  *promoted* while moving — dialogue is authored at build time and never generated at runtime,
  because the mapper is the parity oracle — since it was living only in a session summary.

**Rule this session is an instance of:** *a file read in full every session is a recurring tax, and
durable knowledge is exactly the kind that does not need re-reading.* Splitting by *when it is
needed* costs nothing and pays every session; splitting by topic alone would not have.

---

## v0.18.12 — 2026-07-28 — M6 decided: six answers, and the dialogue corpus is sanctioned

The user answered every open question on the M6 draft, so §6.1 stopped being a set of forks and
became a decision table (D1–D5) that ADR 0009 will now record rather than ask.

- **D1 is the one that governs the rest: the goal outranks the mechanism.** The pane must read as a
  natural DM↔solo-player conversation *as much as possible*, and **the volume of authored dialogue is
  an accepted cost** — pre-generating many lines is sanctioned, not something to economise on. Where
  a limiter and the goal conflict, the limiter goes.
- **The invariant D1 does not suspend, written into the plan because it decides *how* the
  pre-generation happens:** the mapper stays a deterministic pure function — it is the parity oracle
  and 11 walkthroughs replay through it in Node. So "pre-generated" means **authored at development
  time and committed as data**, pinned by the golden sequence. It does **not** mean a model called at
  runtime: non-deterministic, breaks the oracle, and needs a paid API this project has no budget for.
  Out of scope for 1.0.0.
- **D2 narration routing:** description → DM, resolved action → Hero, parser refusals → the Hero's
  register (they are his frustration, and `parser-miss` is the largest affect marker), system text →
  DM. **D3:** long descriptions split across two panels, limit 180 → **200** chars. **D4:** the
  location box appears **only on room change** — the status bar already carries the persistent
  answer. **D5:** density target **an exchange every 2–3 turns**, ~15–25× today's ~5.8%.
- **6.2 decided:** three named save slots, browser storage only, no downloadable save file — which
  keeps the save format an internal detail a released version never has to keep reading.
- **6.3 grew from a page into a small static site:** landing/home, about, and a public changelog, as
  separate static pages rather than routes in the game app. Recommendation recorded: generate the
  public changelog from `CHANGELOG.md`, because two changelogs diverge the first time one is edited
  in a hurry.

**What this session did not do:** measure anything. 6.1a still owns that, and D5's target is
meaningless until the baseline exists — the tables are still trapped in DOM-coupled `comic-view.ts`.

---

## v0.18.11 — 2026-07-28 — M6 drafted from the user's first three items; the cartoon gap diagnosed

Documentation-only. The user supplied three starter items for M6 — a landing page, save/load/restart,
and *"make the comic pane actually a cartoon where the DM and Hero chat in most scenes"* — with more
to follow. Drafting the third one required finding out why the pane is not one already, since ADR 0006
Slices 1–4 claim to have built exactly that.

- **The diagnosis: the machinery exists, the experience does not, and no single decision is wrong.**
  Four compound. (1) `mapper.ts` does `const hero = action ?? exchange.hero` and `exchangeFor` rule 2
  nulls the reply when `heroBusy` — so the Hero answers *only* on turns he did nothing worth
  reporting. (2) One cooldown of 3, shared with the room gazetteer. (3) Seven markers scripted, with
  `parser-miss` — 12.7% of turns, the largest — deliberately excluded. (4) Caption + DM + Hero is
  three balloons, so the fit test splits the exchange into shot/reverse-shot and the facing two-shot
  is rare. Net: **35 spoken beats over 606 turns, ~5.8%**, and the both-speak-in-one-panel subset is
  smaller. The user's "they don't talk to each other at all" is an accurate reading of the product.
- **The recommendation on record was "spend the caption" — the user decided something better.** The
  top-left box becomes the **location name** (panel metadata from `context.room`) and **the DM speaks
  the room description**. The ask came with a wrong premise worth recording: the box is *not* the
  location name today — `captionFor` puts the first sentence of narration in it and drops it past
  `CAPTION_MAX` 180, silently losing long descriptions; the room name lives only in the status bar.
  The decided design is strictly stronger than absorbing the caption, because a `BM_ACTION` caption
  **unconditionally starts a new panel** (`panel.cpp:1064`, faithful port) and one fires on 96.7% of
  turns — so panelization is being *told* to break the exchange nearly every turn. Removing the box
  from the line stream stops that instruction being issued at all. → **ADR 0009**, slice 6.1b, which
  must also settle the narration routing policy (description → DM, resolved action → Hero, refusals
  and system text → undecided) and long-description length.
- **6.1a exists because the measurement is currently impossible.** `GUIDE_SCRIPT`/`BEAT_SCRIPT` live
  inside DOM-coupled `web/src/comic-view.ts`, so the real tables cannot be replayed over the corpus
  the way `mapper.test.ts` replays the walkthroughs. Move the authored content to a DOM-free module,
  then baseline the density every later slice is measured against. **Measure before proposing rules**
  — the standing note, applied to the largest presentation change the project has attempted.
- **M6 now has five stages** (6.1 cartoon · 6.2 save/load/restart · 6.3 landing page · 6.4 asset
  separation · 6.5 public release), with 6.1 sliced a–f. The table is written as **open**: absence
  from it is not a scoping decision, and 6.1 ends when the user says the product is ready.

**Rule this session is an instance of:** *a subsystem's tests can be green, its ADR satisfied, and the
feature still absent from the product.* Slices 1–4 each did what they said. What none of them owned
was the question the user asked — how often, in practice, do the two characters actually talk.

---

## v0.18.10 — 2026-07-28 — The backlog moved out: M5 closed, M6 defined, `FUTURE_WORK.md` created

Documentation-only. No code changed; 255 web / 139 engine / 198 IR tests and parity 143/143 strict
all unchanged. The trigger was a question — *does any of the open work block the MVP?* — whose
answer was no for every item but one, which meant `HANDOFF.md`'s Next Actions had become a backlog
rather than a next-actions list.

- **`docs/FUTURE_WORK.md` created.** Everything non-critical moved there with its reasoning intact:
  `SHOTS` tuning, the shot/reverse-shot finding and its two levers, ADR 0004's open authoring
  judgement, the two deferred ADR 0007 balloon enhancements, ADR 0008's deliberately-scoped-out
  leftovers (mob authoring and the `OrderAvatars`/histeresis stubs — one piece of work, both waiting
  on the talk-to graph), the `mob4-p02` gate divergence, the invisible-routine audit, and assisted
  input with its two constraints and its ADR 0002 prerequisite. **Every entry carries a *why
  deferred*** — the field that decides whether an item can be picked up a year later, and the one a
  bare backlog list always loses.
- **M5 closed on the criterion actually written for it.** 5.5's exit criterion was "game completable
  in the browser", met at v0.16.0 and verified in-browser at v0.17.2. What kept 5.5 open was polish
  that was never its criterion. The plan now says so, and says what *would* re-open it: a room or
  turn the browser cannot render.
- **M6 stopped being provisional.** Gates C and D are both cleared, so "stages to be defined after
  Gate C/D" had expired. Now three stages: **6.1** open-ended user-defined improvement iterations,
  **6.2** asset separation & neutral branding (independent of 6.1), **6.3** repo public + website
  ships → tag `1.0.0`.
- **6.1's exit criterion is deliberately not "the backlog is empty."** It is *the user declares the
  product ready*. The iteration count is not fixed in advance, and §2 items stay unscheduled until
  an iteration names them — written into both the plan and `FUTURE_WORK.md` because the obvious
  failure mode of publishing a backlog is an agent treating it as a work queue.
- **The gap the cleanup exposed:** the website is half of the 1.0.0 criterion and has no design
  behind it anywhere in the docs. The leftover polish never blocked release; that does.

**Rule this session is an instance of:** *a next-actions list that only grows is a backlog wearing
the wrong hat.* Deferred work needs a file where deferral is the normal state, or it accumulates in
the one document read in full at every session start.

---

## v0.18.9 — 2026-07-28 — The dev server was `/`-shaped; macOS named as the platform

The shell served a 404 for its own index and for the world document on Windows while working on
macOS. Nothing was missing from the checkout: `web/tools/serve.ts` matched its mounts on a path it
had already normalized.

- **The bug.** `resolvePath` ran `path.normalize(pathname)` and *then* tested
  `clean.startsWith("/world/")`. `normalize` is platform-native — on Windows it rewrites
  `/world/zork1.world.json` to `\world\zork1.world.json`, so the `/world` mount never matched, the
  request fell through to the `web/` root, and `main.ts:192` threw on the world document before the
  shell could boot. The same rewrite turned `/` into `\`, missing the `rest === "/"` → `index.html`
  case, so the index resolved to a directory and 404'd too. Two symptoms, one line.
- **The fix.** Match the mount on the **raw URL path** — URL paths are always `/`-separated,
  whatever the host — and normalize only the remainder before joining. The traversal guard is
  unchanged and still runs after normalization, which is the ordering that makes `../` fail rather
  than resolve. `sep` joins `""`/`"/"` as an index case.
- **The general rule this is an instance of:** *a URL path is not a filesystem path.* Anything that
  decides routing must decide it in URL space; `path.*` may only be used once the decision is made.
  The failure was invisible on the development machine because there POSIX separators make the two
  spaces look identical.
- **The pixel gate is a macOS gate — decided, not deferred.** On Windows all 17 `gate.test.ts` cases
  fail on `— pixels` while every paired geometry assertion passes: `@napi-rs/canvas` rasterizes text
  through the host font stack, so identical layout yields different bytes. Geometry green + pixels
  red across *every* case is the signature of a platform difference; a real regression moves geometry
  and rarely moves everything uniformly. The user develops on macOS only, so the golden stays
  macOS-rendered rather than growing a platform key or a geometry-only mode. **`gate:accept` on a
  non-macOS host is the trap** — it re-pins the golden to that host and breaks the gate everywhere
  else. Recorded in `web/README.md` and HANDOFF Open Issues.
- **Verified** by probing the running server: `/`, `/world/zork1.world.json`, `/assets/comic/cast.json`
  and `/dist/web/src/main.js` all 200 (were 404/404/200/200). 238 web tests pass on Windows; the 17
  pixel failures are the platform divergence above and are green on macOS.

---

## v0.18.8 — 2026-07-28 — ADR 0006 Slice 4: the beats remember how often they have fired

A beat is no longer one line but a **run** of them: the *n*th time it speaks it takes the *n*th
authored exchange, and the last one holds. This is the ADR's conversational-memory half — the risk
surface the testing contract singled out — and it is deliberately the smallest memory that removes
the stuck-record reading. **255 web tests green (was 249), 139 engine, 198 IR, tsc, build and the
17-case pixel gate clean.**

- **`mapper.ts`:** new `BeatEntry` (`string | BeatExchange | readonly (…)[]`) and `variantOf`; the
  memory itself is one `Map<marker, count>` folded over the turns already read, sitting beside
  `visited` and `lastGuideTurn`. No engine state, no wall-clock, no RNG — so the panel stream is still
  a pure function of the event stream and `replayPanels` still applies. Bare strings and single
  exchanges still work, so nothing authored before this slice changed shape.
- **Two rules, each a decision.** The counter is over **spoken** firings, not marker occurrences — a
  beat the cooldown swallowed was never on the page, and advancing past its line would retire a reply
  the reader never read; it advances at the same moment `lastGuideTurn` does. And **past the end the
  last line repeats, nothing cycles**: a run that looped back to its opener would be a DM surprised by
  a room he has seen four times, so the last entry is authored as the settled one.
- **Run depths are measured, not chosen.** Over the 606-turn corpus a beat is *spoken* `reveal` 14×,
  `effort` 9×, `scored` 5×, `uncanny` 3×, `combat-threat` 3×, `grue-threat` 1×, `combat-victory` 0×.
  So `reveal` got four lines and the rest two or three; the fights are scripted three deep because the
  walkthroughs avoid combat and real play does not. All seven beats rewritten as arcs — fresh
  reaction, recognition, then the worn line the pair are left with.
- **Six tests, the memory gated hardest:** the run walked in order, the clamp at the end, spoken-not-
  occurred (cooldown-swallowed firings burn nothing), per-marker independence, rule 2 × rule 4 (a
  reply the Hero's resolved action outranked ages nothing), and a **determinism replay** — same seed,
  same walkthrough, twice, byte-identical dialogue. That last one is where anything reaching outside
  the event stream fails first.
- **Method note:** the cooldown is measured in `moves`, and a refused command does not advance it, so
  two parser misses in a row are *one turn apart* by the only clock the mapper has. Cost a test
  iteration; worth writing down.
- **Not built, deliberately:** cross-beat memory (a running kill count quoted inside another beat's
  line). Legal under §4, but it needs line templating — an authoring surface, not this mechanism.

---

## v0.18.7 — 2026-07-28 — ADR 0006 Slice 3: the character is named, the caption is his to read

The Guide is now **Dungeon Master** — a proper name, on the user's call, from the three options ADR
0006 §Consequences left open. **249 web tests green (was 245), 139 engine, 198 IR, tsc and build clean.**

- **One seam for the label:** `castLabel` in `comic-view.ts`, reaching the cast bar and the panel alt
  text and nothing else. **Role ids do not move** — `guide`/`hero` stay manifest keys and
  `Line.speaker` values — so the mapper, the panel stream, the cast manifest and the art pipeline are
  untouched and the parity oracle never sees this slice.
- **`test/cast-label.test.ts` (4 tests)** pins the name, the two labels the ADRs rule out ("Narrator",
  "Guide"), the drawing's name (`tiki`) staying out of it, and the id boundary itself. A relabel with
  no test reverts silently, which is the whole reason it exists.
- **§2 landed as fiction, not behaviour.** The caption is the same verbatim pull-quote and
  `captionFor` is unchanged; what retired is the "Not the Narrator" boundary — the caption channel
  *is* the module's read-aloud text in his voice, so there is no rival narrator to collide with.
- **`wiki/the-guide.md` rewritten as *The Dungeon Master*** (filename kept so `[[the-guide]]` links
  resolve). The tiki idol survives as the **drawing**; what retired is the idol as the whole of the
  concept. **The voice rules 1–6 needed no rewriting** — a DM who has run this module too many times
  sounds like an idol that has watched it too many times, so not one shipped line of script changed.

---

## v0.18.6 — 2026-07-28 — ADR 0006 Slice 2: the DM and the Hero converse

`BEAT_SCRIPT` entries become **pairs** — the DM's line and the Hero's answer, keyed on the same beat —
so the two-shot carries an exchange instead of a comment. **245 web tests green (was 243), 139 engine,
198 IR, tsc and build clean.**

- **`mapper.ts`:** `guideFor` → `exchangeFor`, returning both halves. New `BeatExchange`/`BeatScript`
  types; a bare `string` entry still means DM-only, which is why the pixel gate's own script needed no
  change to keep passing.
- **Three rules, each a decision.** One cooldown for the whole exchange (consumed only when something
  is said); the **resolved action outranks the Hero's reply**, so he never holds two balloons and the
  replies land on the quiet turns; the room gazetteer stays DM-only.
- **Measured over the 606-turn corpus:** the outranking rule costs 2 replies. 33 of 35 DM lines are
  answered — an exchange on 5.4% of turns, 94% of the DM's lines.
- **Seven beats scripted** (`combat-victory`, `combat-threat`, `grue-threat`, `scored`, `reveal`,
  `effort`, `uncanny`). `death` is unscripted (the `reaction` rung carries no speech balloon) and so is
  `parser-miss` (12.7% of turns would eat the whole cooldown budget and starve the rarer beats).
- **Golden dialogue:** `mapper.test.ts` now pins walkthrough 01's exchange line for line, which is the
  ADR 0006 testing contract's "assert dialogue content, not just count and shape".
- **The gate caught the new shape immediately.** Adding an exchange to its fixture script re-indexed the
  strip (10 panels → 11) and it reported every moved case. Re-accepted after eyeballing.
- **Finding — the exchange renders as shot/reverse-shot, not as a two-shot.** Caption + DM + Hero is
  three balloons, which the fit test refuses in the band at `UNIT`, so `AddLine` splits: the DM speaks
  in one panel, the Hero answers in the next. Faithful (the ported mechanism decides) and it reads well,
  but it means the "both figures facing each other" two-shot of ADR 0005 §4 rarely occurs while 96.7% of
  turns carry a caption. Left as-is; the levers (balloon-band height, dropping the caption on exchange
  turns) are authoring decisions, not port ones.
- **Wiki rewritten with the slice, not ahead of it:** `the-guide.md` rule 6 (it is conversation now) and
  `the-hero.md` §The pairing (the thought-only settlement is superseded) + §Coverage (the reply table).

---

## v0.18.5 — 2026-07-28 — ADR 0008 Phase 3: the pixel-parity gate. **The port is complete.**

The layout stack now has a change detector. Phases 1–2b replaced three reimplementations with ports,
two of them seeded, and nothing in the suite would have noticed a change that kept every rule and moved
every pixel. **238 web tests green (was 204, +34), 139 engine, 198 IR, tsc and build clean.**

- **`web/tools/gate.ts` + `web/test/gate.test.ts` + `web/test/golden/panel-gate.json`** (16 cases, ~6 KB).
  Each case pins the **SHA-256 of the rendered PNG** and the **geometry that produced it**. `npm run gate`
  checks; `npm run gate:accept` re-writes the golden when a re-roll is intended.
- **`renderPanel` gained an output-only `options.trace`** (`PanelTrace`) — placed bodies, balloon boxes,
  tail targets, line counts, the fallback flag. Recorded by the code that draws, so the gate never
  re-derives the placement maths and cannot drift from it. It changes no pixels and is optional.
- **Golden PNGs are deliberately not committed** — ~300 KB of binary per case, rewritten on every accepted
  re-roll. A failing run dumps its actual PNGs to `web/tools/out/gate-actual/` (gitignored) instead.
- **Fixtures are staged through `page.ts` with the real fit test**, never hand-built: 10 panels of
  `01-west-of-house` (seed 1234) through the real mapper, plus 3- and 4-participant scenes over the
  `.avb` fixture cast. Rendered at `UNIT` (400×340), the size `fit.ts` panelizes at.
- **First catch:** `mob4-p02` — a 4-participant panel the fit test cleared and the renderer refused, so it
  is drawn by the `stackBalloons` fallback. Cause is the documented arrow-position estimate (`fit.ts`
  slots the speakers at 100/300; `layoutAvatars` puts the real anchors at ~140/~310, and at 140 the driver
  has no corridor). Pinned rather than papered over, with a dedicated assertion that the fallback set is
  exactly `{mob4-p02}`.

---

## v0.18.4 — 2026-07-28 — ADR 0008 Phase 2b: the multi-balloon layout driver ported

`web/src/comic/balloon-layout.ts` is the cited port of Comic Chat's balloon layout driver, and
`web/src/comic/fit.ts` runs it behind `page.ts`'s `FitTest` seam, so `AddLine`'s overflow recursion —
ported but stubbed in Phase 2 — is live. This closes the last gap the v2.5-beta-1 coverage audit found.
**204 web tests green (was 178, +26), 139 engine, 198 IR, tsc and build clean.**

- **Ported:** `LayoutBalloons:855`, `GetCloudEstimate:885`, `LayoutBalloon:925`, `GetInterveningBBox:167`,
  `LowestPreviousBottom:213`, `AdjustRouteRgns:247`, `ForceFitBalloon:153`, `QueryRouteRgn`/`SetRouteRgn`
  (`balloon.cpp:1358,1375`), and `CLabel::SplitHeight` (`balloon.cpp:777`, into `balloon.ts` beside a new
  `measureAtWidth` = `SetBBox`'s reflow-at-a-given-width). `render.ts`'s vertical stack is retired to a
  draw-time fallback.
- **Balloons now go over their own speaker and are squeezed out of the corridors** (`m_routeRgn`) their
  predecessors reserved, instead of stacking down the left. Visible immediately: the caption and the
  Hero's balloon sit **side by side** in the production panels where they used to stack, and the N=2
  fixture puts each speaker's balloon over their own head with their own tail.
- **Two constants had to be re-derived rather than transcribed** — `Dock`'s 90-unit lift is 0 here
  (our box excludes the tail/wave overhang it exists to subtract) and `DockAtTop`'s `-250` becomes the
  rule it encodes ("dock only a balloon nothing pushed down"), because our text is proportionally
  smaller against the panel than the original's. Carried literally, each one stacks balloons back on top
  of each other; both are argued in full at their definitions and in ADR 0008 §"Phase 2b built".
- **The roll is deterministic:** `srand(m_seed)` becomes a mulberry32 seeded by an FNV-1a hash of the
  panel's own speakers and text, so a panel always lays out the same way *and* the panel stream stays a
  pure function of the event stream (ADR 0006's third invariant, `replayPanels`).
- **`FitResult` gained `kept`.** `ForceFitBalloon` splits in place — it replaces the balloon's own string
  before `AddLine` re-adds the remainder — so without the kept half the first panel would repeat the
  whole line the continuation panel carries.
- **The fit test measures at `UNIT`, never the viewport**, with arrow positions estimated as even stage
  slots (the cast is async; the Director must not wait on it). It decides *whether* a panel splits, never
  where a balloon lands.
- **New tests:** `balloon-layout.test.ts` (15, one per ported branch — straddle, caption pin, dock,
  corridors, tuck-alongside vs drop-below, hook room, force-fit split, refusal), `fit.test.ts` (6,
  through `page.addLine` so the recursion and leftover re-add are exercised), plus `splitHeight` and
  `measureAtWidth` in `balloon.test.ts`.

---

## v0.18.3 — 2026-07-27 — ADR 0008 Phase 2: panelization ported (`page.ts`)

`web/src/comic/page.ts` is the cited port of `CUnitPanelPage` against
`original-projects/comic-chat/v2.5-beta-1-modern/panel.cpp` — the routine ADR 0007 left as a
reimplementation and ADR 0004 §7 had called semantic. **178 web tests green (was 157, +21), 139 engine,
198 IR, tsc and build clean.**

- **`AddLine:1058` ported whole**, with `AddReaction:1142`, `MakeBalloon:1036` (a `BM_*` bitmask per
  `defines.h:63`, so the `uModes == BM_ACTION` exact-mask test at `:1064` is a literal port),
  `StartNewPanel`(panel.h:91), `FetchSpeaker:606`, `ReplaceBody:626`, `AvatarInPanel:655`, `Clone:562`,
  `RemoveLastPanel:993`, `AddPanel:1029`. The `<Brk>`/`<Chr>` sentinels are ported too.
- **The pipeline re-ordered to mapper → Director → page.** The Director's edits are semantic and now
  apply to the *utterance* stream; panelization runs last on what survives. Editing panels afterwards
  would mean dropping a panel that had already absorbed a kept line by clone-append. So
  `Mapper.panel(turn): Panel` became `Mapper.read(turn): TurnScript` (`{context, lines, reactions}`),
  and `Director.ingest`/`flush` return a `PanelDelta` (`{replacedLast, appended}`).
- **`PanelDelta.replacedLast` is the repaint seam.** Clone-append replaces the previous panel with a
  grown copy, so `comic-view.ts` drops and redraws its last canvas — our stand-in for
  `RemoveLastPanel`/`RefreshLastPanel`, without which the reader would see the same panel twice.
- **`LayoutBalloons` injected, not stubbed away.** `AddLine`'s overflow recursion and leftover re-add
  (`:1110-1135`) are ported behind a `FitTest` seam; Phase 2b supplies the real driver
  (`LayoutBalloons:855`/`ForceFitBalloon:877`). The default `ALWAYS_FITS` reproduces today's behaviour,
  and the recursion guard is the original's own commented-out `:1112` line — a lone balloon that fits
  nowhere is kept rather than recursed on forever.
- **One behavioural change, and it is faithful:** `m_panels.GetCount() < 2` (`:1079`, `:1148`) refuses
  clone-append while the page holds fewer than two panels, so the *opening* turn's caption takes panel 0
  and the Hero's body panel 1. Comic Chat never noticed — its page opens with a title panel (`AddTitle`,
  out of scope). Every later turn is unchanged. **5 of the 6 production `render:panel` panels are
  byte-identical to their `HEAD` renders**; the sixth is that opening panel.
- **Oracle tests re-derived, not weakened.** `mapper.test.ts` gained a `strip()` (mapper + page) and a
  `Shot` (the panels a turn drew, plus *its own* lines — a clone-append lands them in a panel holding an
  earlier turn's lines, so scanning the panel would misattribute them). `director.test.ts`'s golden
  reducer now edits scripts and panelizes the survivors through the same port. The §6 "one panel per
  turn" count became a derived bound: panels ≤ turns on every walkthrough, never more (406/406 on the
  full game, 12/14 on `09-take-all-surface`).
- **New:** `web/test/page.test.ts`, 20 rule tests, one per branch of `:1058-1139`, each cited.

**Next:** Phase 2b (multi-balloon layout + overflow split, behind the `FitTest` seam), then Phase 3
(pixel-parity gate).

---

## v0.18.2 — 2026-07-27 — ADR 0008 Phase 1: `LayoutAvatars` ported (speaker gate, adjacency facing)

The three Phase 1 items, against `original-projects/comic-chat/v2.5-beta-1-modern/panel.cpp`. **157 web
tests green (was 149, +8), tsc and build clean.** Two byte-diff checks back the claim that play is
unchanged: the production `render:panel` panels are **byte-identical** to the same panels rendered from
`HEAD`, and the N=1/N=2 fixture PNGs are byte-identical to their v0.18.1 renders. Only N≥3 moves.

- **`IsSpeaker` gate ported** (`panel.cpp:822`, applied at `:741-749`). A body is staged when it is
  `m_requested` or carries a balloon in this panel; the rest are dropped *before* any dimension is read,
  as the original reclaims them ahead of `GetDimInfo`. `Body` gains `requested?: boolean` (`avatar.h:87`)
  and the mapper sets it on the Hero — he is the panel's subject and poses on silent turns; the DM and
  mobs earn the stage by speaking. Nothing changes today (the mapper stages the DM only when it speaks);
  it is the rule that stops a Grue in the room from being a Grue in the frame once mobs exist.
- **`normHeight` divergence retired** (`avatar.cpp:64,110`). `render.ts` claimed common-height scaling as
  "the one deliberate divergence" from `maxBodyHeight · normHeight/maxNorm` (`panel.cpp:765`). The
  shipped source hardcodes `normHeight = 100` for every body — both sites carry an `XXX ... we're
  assuming characters are the same height` — so the ratio is 1 and our behaviour was already faithful.
  Comment corrected and cited; no code change, and none needed.
- **Facing ported from adjacency, superseding the geometric rule** (`OrderAvatars` `:424`, `EvalPair`
  `:279`). `m_flip` is settled in `OrderAvatars` *before* any coordinate exists, so "mirror when past the
  panel's centre" was structurally wrong even where it agreed. The no-talk-to branch of `EvalPair`
  (`:293-297`) is complete on its own — 4 for not facing a neighbour, 2 for a neighbour not facing you —
  and reduces over a fixed row to "face the side holding more bodies", ties keeping `m_lastDir`
  (`:396-398`), stubbed to its initial `FALSE` (`avatar.cpp:894`). At N≤2 this is identical to the old
  rule, which is why the two-shot is untouched; at N=3 it is the middle body that differs, and a
  coordinate rule had to invent an answer there where the port has one.
- **Stubbed, deliberately: seating.** `DoGreedyOrdering` (`:403`) picks seats by `EvalPlacement`, which
  is driven by the talk-to graph (`AddTalkTos` `:316`) and histeresis (`UpdateHistoresis` `:435`). With
  no mob dialogue authored, no body addresses another; the greedy then degenerates — ratings tie and the
  seat is an artefact of the tie-break, not the scene. Fabricating a talk-to graph to feed it would be
  inventing semantics in the mechanical layer, which ADR 0008 forbids. Order stays stable-by-insertion
  until the mob-dialogue slice supplies the input, as the ADR planned.
- **Fixtures extended:** `fixtureBodies` marks bodies requested by default (a layout fixture must stage
  what it is given, or the gate silently shrinks an N-body case), with a flag to exercise the gate;
  `render:bodies` now writes 30 PNGs including `-gated` variants where the silent bodies are reclaimed.

---

## v0.18.1 — 2026-07-27 — ADR 0008 Phase 0: multi-body fixtures, and the first N≥3 gate

`layoutAvatars` shipped in v0.18.0 as an N-participant routine that nothing could hand more than two
bodies: the packed cast (`web/assets/comic/cast.json`) holds exactly `hero` and `guide`, so every N≥3
path was asserted nowhere — and at N=1 the routine collapses to the old solo branch, so normal play
could not have caught a regression either. ADR 0008 §2 requires the port to be "pixel-verified now
against real `.avb` avatar fixtures (2–4 bodies)", decoupled from mob authoring; this milestone builds
that input, ahead of the Phase 1 `LayoutAvatars` port. **149 web tests green (was 124, +25), tsc and
`npm run build` clean, 21 N-body PNGs reviewed.**

- **`web/tools/cast-fixture.ts`** — packs 2–4 avatars in memory with `art/`'s own
  `parseAvatar`→`packAvatar` pipeline over the tracked corpus. Nothing is committed and the shipped
  bundle is untouched: mob *casting* is a later ADR 0006 slice (ADR 0008 §4 puts it out of scope), and
  `art`'s `pack` script cannot be re-run from a clean checkout anyway (its backdrops come from the
  gitignored `reference/` tree). Two entry points, because the callers differ: `packFixtureCast` +
  `stubCast` are pure and canvas-free for geometry tests, `loadFixtureCast` decodes sheets through
  `@napi-rs/canvas` for PNG harnesses. Fixture roles are `hero`/`guide` (production casting, so a
  fixture panel stays comparable with `render:panel`) plus generic `mob-a`/`mob-b` — bolo and xeno,
  picked for contrasting silhouette and full emotion coverage, deliberately *not* named troll/thief.
- **`web/test/bodies.test.ts`** (25 tests) — `layoutAvatars` at N=1..4 over real corpus geometry,
  pinned as *properties*, not coordinates (pixels are Phase 3's job; duplicating them here would make
  every framing tweak a two-file edit): equal margins including both edges (`panel.cpp:607-616`),
  uniform shrink-to-fit on overrun (`:575-585`), insertion order left-to-right, no neighbour overlap,
  inward mirroring past centre, a shared floor, and the per-body width cap.
- **`web/tools/render-bodies.ts`** (`npm run render:bodies`) — 21 synthetic panels, 1–4 bodies ×
  3 camera rungs × {one speaker, all speaking}, through the same `renderPanel` the browser calls.
  Both ends of the speaking range are rendered because Phase 1's `IsSpeaker` gating changes who is
  *staged*. The four-speaker images also make Phase 2b's gap visible: balloons still vertical-stack.

**Also recorded here: the docs-only ADR 0008 re-scope that preceded this work** (commit `bc8c1f1`, no code
changed). The incremental-refactor path was rejected — v0.18.0 was a *structural refactor* of figure
placement, not a rewrite, and was proven pixel-identical in solo-Hero panels (N=1 `layoutAvatars` collapses
to the old solo branch), so it was always going to look the same in normal play. Decision: **stop
refactoring, do a faithful port**, and treat the comic pane as a true multi-party comic (GM = former Guide,
NPCs = mobs) rather than a solo-Hero adventure — which turns Comic Chat's multi-speaker machinery into the
*target* and flips every earlier "defer until mobs" call to "build now". The canonical source was re-pinned
to `original-projects/comic-chat/v2.5-beta-1-modern/` (was v1.0-pre; all prior ADR citations re-anchored in
the amendment's table), navigated via an offline, gitignored C++ graph at
`reference/comic-chat-v2.5-beta-1-modern/graphify-out/`. Three findings from the later source *remove*
scope — `normHeight` is hardcoded `100` (avatar.cpp:64,110), `RearrangeBalloons` is an empty stub
(panel.cpp:959), `BM_ACTION` captions unconditionally start a new panel (panel.cpp:1064, retiring the old
"caption rides" divergence) — while a full-pipeline coverage audit found two real gaps the old "1–2
balloons per panel" assumption had hidden: the multi-balloon layout driver and overflow-split. Locked:
histeresis stubbed stable-by-insertion-order now (full with mobs); faithful `BM_ACTION`→new-panel; balloon
placement by **seeded reproducible roll** (we port the algorithm, not the pixels — font metrics differ, so
byte-match to the 1996 binary is unattainable).

---

## v0.18.0 — 2026-07-24 — ADR 0008: the renderer becomes an N-participant port (seam + LayoutAvatars)

The comic renderer's mechanical layer was a *reimplementation from analysis* for two routines ADR 0007
left un-ported: figure placement (hardcoded Guide-left/Hero-right) and panelization. ADR 0006's DM recast —
now with **Grues/mobs as chat participants** — dissolves the reason those stayed reimplementations, so this
milestone begins the full port. **124 web tests green (was 124; one balloon literal + mapper assertions
reshaped, none dropped), tsc clean, `render:panel` PNGs reviewed** (solo DM, Hero close-up + tall caption:
figures placed/scaled, captions clean, speech balloons straddle from above with a short tail).

- **ADR 0008** (`docs/adr/0008-full-mechanical-port-and-multi-participant-chat.md`, Accepted — building):
  extends ADR 0007's port boundary through panelization and N-body avatar layout; the semantic layer shrinks
  to "Turn → chat lines + scene context"; figure geometry ported but `art/` assets kept (full avatar-sheet
  port deferred); the 2-speaker Panel-slot model is superseded. Records the Grue-dialogue scope boundary
  (the port makes the pane N-capable; authoring mob lines is a later semantic slice).

- **Seam generalized (`mapper.ts`).** `Panel`'s fixed `hero`/`guide`/`caption` slots + single panel `emotion`
  are replaced by Comic Chat's own two lists (ADR 0008 §2): **`bodies: Body[]`** (`m_bodies` — who's on stage,
  each with its own emotion: the DM when it speaks, the Hero always, `panel.cpp:623` requested-or-speaker) and
  **`speakers: Line[]`** (`m_elements` — the balloons, `Line = { speaker, balloonClass, text }`). Splitting
  presence from speech restores the Hero on every panel (he poses to the world's reply on silent turns) while
  giving each participant its own pose. `Balloon` drops `channel`; new `HERO`/`GUIDE`/`CAPTION` ids +
  `lineOf(panel, id)` keep the semantic tests readable.

- **N-body avatar layout ported (`render.ts`).** New `layoutAvatars()` is the port of
  `CUnitPanel::LayoutAvatars` (`panel.cpp:528`): bodies (Comic Chat's `IsSpeaker`, `:622` — every line with a
  cast body; the caption is bodiless) are scaled to the camera fill height, the row is shrunk to fit when it
  overruns (`:577`), then spread with **equal margins including the edges** (`:607-616`); a body past panel
  centre is mirrored to face inward. Replaces the Guide-left/Hero-right hardcode. `drawBalloons` now keys
  anchors/faces by speaker id off `panel.speakers`. Divergences cited in-code: `shot.fill` stands in for
  `maxBodyHeight`/`normHeight` (our art carries no per-avatar norm height); the `zoomIn` branch is dropped
  (the §7 ladder + `MAX_SCALE` choose size).

- **Consumers updated:** `comic-view.ts` alt-text describes N speakers; `render-panel.ts` and
  `balloon.test.ts`/`mapper.test.ts` moved to `speakers`/`lineOf`; `figure.test.ts` join parity vs
  `art/composite.ts` unchanged and green.

**Measurement — panelization port deferred, not skipped.** The two gating decisions were made (caption rides
with its panel; full cross-turn packing). Then a measure over the walkthrough corpus (606 turns) found
**captions on 96.7% of turns**, and — since a repeat caption starts a new panel — only the **3.3% caption-less
turns are cross-turn-mergeable**. So `CUnitPanelPage::AddLine` packing is a **~3% no-op on the current DM↔Hero
stream** while it would force re-deriving 30 turn-indexed oracle tests. Its real value (the 5-element cap,
packing discipline) is **latent**: it pays off when **mobs produce multi-line turns** (the deferred semantic
slice). Decision: build `page.ts` **together with mob dialogue**, not against a stream where it changes almost
nothing. The two decisions + this finding are recorded for that time. Also deferred (as ADR 0007 deferred
route-region collision): a full `RearrangeBalloons` port — the vertical balloon stack is retained.

## v0.17.13 — 2026-07-23 — Balloons redrawn to read hand-drawn, wider, and docked close

Follow-up to v0.17.12: the rippled-rounded-rect still read as vector art, balloons were capped narrow, and
on a tall panel the tail stretched the full drop to a far-below head. Three fixes in `web/src/comic/balloon.ts`
+ `web/src/comic/render.ts`, all ported from Comic Chat with named divergences:

1. **Single-spline outline** — the outline is now one closed cardinal spline through a ring of corners +
   *outward-only* edge bumps (`pushWaves`/`strokeCardinal`), the deterministic stand-in for
   `CreateBalloonSpline`'s `CBeta` over `AddWavies` points (`balloon.cpp:1652`, `:560`). Replaces the
   `arcTo`-corner + in/out-quadratic rounded rect. `WAVE_INTERVAL 30→22`, `WAVE_AMP 8→6` retuned for the
   spline. The **45°-from-vertical tail clamp** (`AddArrow`, `balloon.cpp:1450`) — previously a declared
   divergence — is now reproduced, since the tail is short enough for it to matter. Tail stays a sharp bowed
   two-quad tip off the body spline.
2. **Wider balloons** — `goalWidth` spreads the compact area estimate toward the free width by a fixed
   `WIDTH_BIAS` (deterministic stand-in for `GetCloudEstimate`'s roll-toward-`maxWidth` + fudge,
   `panel.cpp:890`, `:900`), capped at the one-line width. `render.ts` lifts the cap to near-full width
   (`width-20`) when a single balloon owns the panel, `width*0.66` when several share it.
3. **Capped tail / close docking** — `render.ts` `TAIL_MAX=70` drops each tailed balloon toward its speaker
   so the tail is short and the vertical slack falls *above* the balloon, restoring Comic Chat's grow-up-from-
   the-speaker feel (its `MINTAILHEIGHT` is a floor with no stretch, `balloon.cpp:1439`).

**No engine/IR impact. 124 web tests green (was 123; +1), tsc clean. Visually verified** with `render-panel.ts`
across establishing/over-shoulder/close-up/tall-cap panels — hand-drawn wobble, short bowed ~45° tails, slack
above, caption boxes still clean rects.

---

## v0.17.12 — 2026-07-23 — Three C++-sourced balloon enhancements (ADR 0007 standing rule)

The port-backfill audit (v0.17.11) surfaced three places where Comic Chat's balloon code is genuinely better
than our simplifications. All adopted in `web/src/comic/balloon.ts`, each a port with a named divergence per
the ADR 0007 standing rule. **No engine/IR impact. 123 web tests green (was 117; +6), tsc clean. Visually
verified** with `render-panel.ts` (rippled outline + bowed tail + compact balloons all reading correctly;
caption boxes still clean rects).

1. **Area-based width goal** — new exported `goalWidth()`, a deterministic port of `GetCloudEstimate` +
   `AreaEstimate` (`panel.cpp:753`, `:775`). A balloon now chooses a compact target-aspect width from the
   text's ink area — floored by the widest word (`panel.cpp:766`), capped at the free width (`panel.cpp:777`),
   with short text kept to one line (`panel.cpp:761`) — then greedy-wraps into it. **This removed the old
   line-*balancing* hack** (`wrap()` is deleted): balancing was a symptom-fix for not choosing a good width
   first, and the original never balances (`BreakIntoLines` is a plain greedy wrap, `balloon.cpp:96`). Named
   divergence: `GetCloudEstimate` rolls a random point in `[minWidth, maxWidth]`, which ADR 0004 §5 forbids, so
   we take a fixed `TARGET_ASPECT` (1.9) instead of the roll.
2. **Rippled Woodring outline** — `roundedSpeech` edges ripple through a new `wavyEdge()` (port of `AddWavies`,
   `balloon.cpp:406`) rather than drawing a clean rounded rect, so balloons read hand-drawn. The original's
   beta-spline smoothing is approximated with quadratic segments; corners stay `arcTo`-rounded. Constants
   (`WAVE_INTERVAL=30`, `WAVE_AMP=8`) are a named divergence from the scaled figure-space values (~60/~14):
   small Zork balloons need a tighter interval to reach the two-interval ripple minimum at all, and quadratic
   smoothing shows only ~half the control offset, so amplitude is bumped for visibility.
3. **Bowed tail** — the two tail sides are `CArc`-style quadratic curves bowed by `alt = .05·tailLen`
   (`balloon.cpp:305`) instead of a straight triangle. The 45°-angle-clamp divergence (`balloon.cpp:284`)
   still stands — the layout straddle keeps the tail vertical, so the drawer needs no clamp.

Tests: `balloon.test.ts` recorder gained `quadraticCurveTo`; the speech-balloon tests were rewritten around
the rippled outline (the tail is the lowest vertex, flanked by two roots on the bottom edge, with no body
vertex jutting past the side edges) and four `goalWidth` tests were added. ADR 0007 is now fully built;
`HANDOFF` Next Actions #0 records two further candidates (fuller permuted spline, route-region collision)
as considered-and-deferred.

---

## v0.17.11 — 2026-07-23 — ADR 0007 port backfill: geometry audit + cited source sites

Completed ADR 0007 Consequences ¶3 (the tracked port-backfill follow-up): audited `web/src/comic/balloon.ts`
and `web/src/comic/render.ts` mechanical geometry against `balloon.cpp`/`panel.cpp` and made every ported
routine either cite its source site or state a **named divergence with a reason** — the standard the v0.17.7
straddle/bottom-tail work set. **Documentation only; no behaviour changed. 117 web tests green, tsc clean.**

The headline finding is the ADR-0007-class bug the ADR was written to catch: `wrap()` claimed "Comic Chat
balanced line lengths," but `BreakIntoLines` (`balloon.cpp:96`) is a plain greedy wrap. A Woodring balloon
reads as a *shape* because of the permuted spline outline (`CreateBalloonSpline`/`PermutePt`, `balloon.cpp:159`;
`ShiftLines` jitter is disabled in v1.0, `MAXCENTERSHIFT=0`), not the line breaks. The balancing is now stated
as **our** substitute for the wobbly outline we don't draw — a deliberate deviation, not the original's
behaviour — rather than misattributed to the source.

Citations/divergences added:
- `greedyWrap` → `balloon.cpp:96`; widest-word clamp is a named divergence (we clamp to the native panel per
  ADR 0007 §2; the original grows the box, `balloon.cpp:115`).
- `roundedSpeech` → `AddArrow` (`balloon.cpp:238`), with two divergences: straight triangle vs the original's
  two bowed `CArc`s (`:305`), and no 45°-from-vertical clamp (`:284`) since the layout straddle keeps the tail
  vertical for us.
- `TAIL_MIN_EXIT` → `MINTAILHEIGHT=100` (`balloon.cpp:235`); ours is 2px because the balloon docks at the panel
  top while the speaker stands at the bottom, so the drop is already tall.
- `cloud`/`bubbleTrail` → `CBWoodringThink::Draw` (`balloon.cpp:648`): reimplementations (the original has no
  standalone scallop/bubble routine — the cloud is the same permuted spline), so the source fixes the *look*
  only; bubble count/sizing are ours.
- `render.ts` balloon straddle → sharpened `GetCloudEstimate` citation to `panel.cpp:781`, and noted our
  deterministic midpoint placement vs the original's `randfloat` (ADR 0004 §5 forbids the roll).
- Fixed a stale `balloon.ts` header comment still citing ADR 0004 §4a's reversed "port stops being a
  transcription" clause; now points to ADR 0007 §2 (width is (near-)constant again).

All cited C++ sites were verified to exist (no phantom citations). ADR 0007 status updated: Consequences ¶3
marked done; the remaining open item is an in-browser visual check of both v0.17.10 and v0.17.11.

---

## v0.17.10 — 2026-07-23 — ADR 0007 §2 implemented: fixed panels, reflowing pane

Built the deferred core of ADR 0007 §2 in `web/src/comic/layout.ts`. `layoutStrip` stops stretching a panel
to its column share: `panelWidth = min(share, UNIT.width)`, so a panel renders at **native** (400×340) and a
row's leftover becomes centred margin — the browser analogue of `PreparePrintDC`'s own remainder
(`panel.cpp:1471`). This reverses ADR 0004 §4a's per-render panel width, curing the "figure/balloon space
slides with the viewport" authoring instability. The strip-level upscale constant `MAX_PANEL_SCALE` is
**retired** (native is the ceiling; there is nothing left to cap upward — `render.ts`'s figure-scale `MAX_SCALE`
is untouched).

`columnsFor` still fits extra columns against `MIN_PANEL_SCALE`, **retuned 0.75 → 0.85** as the single
shrink-tolerance floor. ADR 0007 offered keeping 0.75 as a separate absolute floor; the build decision was to
**collapse to one 0.85 floor** — the old 0.75 fit test only ever decided column count, which the 0.85
preference floor now decides, so two constants become one. Resulting width regimes: native (common), a
`[0.85·native, native]` shrink to earn a second column rather than maroon one native panel in margin, and a
straight fit-down below native on phones too narrow for one native panel. `MAX_COLUMNS` unchanged at 3.

`layout.test.ts` rewritten for the new behaviour (native lone panel, phone fit-down, 0.85-band two-up,
native-capped wide viewport). `layoutStrip`'s return shape is unchanged, so `comic-view.ts` needed no edit.
ADR 0007 status + Consequences ¶1 updated to "implemented"; port backfill (¶3) remains a tracked follow-up.
**117 web tests green (+2 net), full suite 117 web / 139 engine / 198 IR passing, tsc clean.** `graphify update web` run.

---

## v0.17.9 — 2026-07-23 — MAX_COLUMNS 2 → 3

`layout.ts MAX_COLUMNS` raised from 2 to 3 — three panels read better than two on a wide viewport, showing
more of the recent exchange while keeping the newest panel within a glance (the cost the ceiling bounds).
This resolves the "separate, later question" ADR 0007 flagged; the ADR consequence notes and its rationale
comment are updated. `columnsFor`/`layoutStrip` already consume the constant, and `layout.test.ts:43` was
written against `MAX_COLUMNS` (not literal 2), so no test edits were needed. **115 web tests green, tsc clean.**

---

## v0.17.8 — 2026-07-23 — ADR 0007: comic-pane port boundary + fixed panels (decision only)

Doc-only milestone — records two architectural decisions; no code changed (115 web tests still green from
v0.17.7). New `docs/adr/0007-comic-pane-port-boundary-and-fixed-panels.md`; ADR 0004 §4a annotated as
superseded-in-part (header + inline note). Prompted by the v0.17.7 balloon-drift post-mortem.

- **Decision 1 — port boundary.** The comic pane's **mechanical** layer (balloon spline + arrow/tail,
  `AddLine`, overlap/route regions, `LayoutAvatars`, the panel grid) is a faithful **port with cited source
  sites** from `balloon.cpp`/`panel.cpp`; only the **semantic** layer (channel map, emotion-from-narration,
  camera ladder, Director, cast) is reimplemented. This is ADR 0004 §1 applied to layout mechanics, and the
  process fix for the class of bug that produced the side tail (a re-derived geometry that drifted from the
  source). Standing rule: new mechanical code reads the C++ first and cites it.
- **Decision 2 — fixed panels, reflowing pane.** Reverses ADR 0004 §4a's "panel width is a per-render input."
  A panel renders at native size (`UNIT` 400×340), no strip-level stretch; the pane varies the column count by
  width (`m_unitWidth` model, `panel.cpp:1456`). Shrink tolerance ≈0.85 of native prefers an extra column;
  narrow phones fit-down one column. Cures the "figure/balloon space slides with the viewport" instability
  that §4a's stretch introduced.

Implementation deferred (see HANDOFF Next Action #0): `layout.ts` rewrite + `layout.test.ts`, plus a tracked
geometry port-backfill of `render.ts`/`balloon.ts` against the C++.

---

## v0.17.7 — 2026-07-23 — Balloons straddle the speaker (Comic Chat layout)

Supersedes v0.17.6's approach. Reviewing the original C++ (`balloon.cpp`, `panel.cpp`) showed Comic Chat
**never draws a side tail**: `CBWoodringNormal::AddArrow` always roots the tail on the balloon's *bottom*
edge (`top2.y = cbbox.Bottom`), tip at the speaker's `m_arrowX` above the head. It reads well because
`GetCloudEstimate` (panel.cpp:776–789) places the balloon's left edge in `[headX − width, headX]`,
"guaranteeing that it overlaps character" — the balloon **straddles the head horizontally and sits above**
(figures own the bottom, balloons `DockAtTop`), so the tail just drops. v0.17.6 had it backwards: our
layout parked the Hero balloon in a *side margin* and slid it off the head, forcing a beside-the-head
balloon that then needed an (ugly) side tail.

Rewrote our layout to the original's model:

- **Placement (`render.ts drawBalloons`):** a speech balloon now centres on its speaker's head x and clamps
  inside the panel (`[headX − width, headX]`'s symmetric case), instead of being pushed to a side margin by
  `clearOfFaces`. `clearOfFaces` is retained only for a *thought aside* (floated in the roomier margin like
  Comic Chat's clouds; asides aren't emitted yet). Captions stay pinned top-left.
- **Headroom (`render.ts`, new `BALLOON_HEADROOM = 0.36`):** when a speech/thought balloon is present, each
  figure is pushed down until its head-top clears the top 36% of the panel, reserving room for the balloon to
  sit above and drop a near-vertical tail. This is the "constrain close-up framing" decision — a close-up
  head no longer reaches the top edge. The game-over `reaction` rung has no such balloon and keeps its full face.
- **Tail (`balloon.ts roundedSpeech`):** reverted to **bottom-edge only** (the v0.17.6 side-edge branch is
  gone). Root slides under the head, clamped to the box; near-vertical geometry is the layout's guarantee,
  not the drawer's.

**Validated headless** across establishing / over-shoulder / close-up / `-tallcap`: balloons sit above the
head, straddling, tail dropping to the crown — matches the reference screenshots. `balloon.test.ts` tests
rewritten to pin *always-bottom* rooting (never a side tail) for below- and off-centre speakers. **115 web
tests green, tsc clean.** Presentation-only; engine/IR/parity untouched.

---

## v0.17.6 — 2026-07-23 — Speech-tail side rooting

Closes the open item from v0.17.5: a Hero speech balloon *beside* its speaker rooted its tail on the
**bottom** edge, so the tail exited downward and cut back up to a head level with the balloon — a kink,
not a pointer. `roundedSpeech` (`web/src/comic/balloon.ts`) now chooses the tail's **root edge** from the
tip's direction relative to the box: head below → bottom edge (unchanged); head beside → that side edge
(left/right). The path is built edge-by-edge so the tail notch is inserted mid-traversal on the chosen
edge, respecting the clockwise pen direction (top→bottom on the right, right→left on the bottom,
bottom→top on the left). `headEdgeTip` (`render.ts`) already supplied the correct tip; only the root moved.

- **Presentation-only, zero engine/IR/parity impact.** `TAIL_MIN_EXIT` semantics preserved (now also
  guarantees a side tail clears the box edge before angling). The bottom-edge case is byte-for-byte the
  prior behaviour.
- **Validated headless** via `npm run render:panel 01-west-of-house.cmd` — side tails on the close-up and
  `-tallcap` variants now sprout from the balloon's right edge straight to the Hero's temple, no face
  crossing; the below-head case still roots on the bottom.
- **Two new tests** in `balloon.test.ts` pin the root edge (recorder now captures `lineTo` points):
  bottom-edge root for a speaker below, side-edge root for a speaker beside, with an explicit assertion
  that the side case does *not* fall back to a bottom-edge root. **115 web tests green, tsc clean.**

---

## v0.17.5 — 2026-07-22 — ADR 0006 Slice 1: the Hero speaks

**Date:** 2026-07-22

First build under `docs/adr/0006-dungeon-master-and-player.md` (Guide-as-DM, Hero-as-player). Slice 1
breaks ADR 0004 §2a / ADR 0005 §4 as the ADR intends: the Hero's resolved-action balloon moves from a
**thought** balloon to a **speech** balloon — he now addresses the DM across the table rather than
captioning his life to no one. The **thought register is retained** for interior asides (its type and
renderer stay live; aside *content* is authored in a later slice), so balloon class is now chosen **per
line, not per character**.

- **`heroBalloon` returns `CBWoodringNormal`** (was `CBWoodringThink`) — one-token behavioural change;
  the take/drop templates and object-name resolution (ADR 0005 §1) are unchanged. `web/src/comic/mapper.ts`.
- **Doc/contract updates:** `Balloon.balloonClass` is no longer "fixed per channel" — caption/guide stay
  fixed, `hero` chooses per line (`mapper.ts` interface + `heroBalloon` docblock; `balloon.ts` header).
- **No render change.** `render.ts`/`drawBalloon` were already class-driven and already target the Hero's
  head for `panel.hero`, so a hero speech balloon renders through the same `roundedSpeech` path the Guide
  uses, tail to the Hero. The `CBWoodringThink` cloud path stays exercised by `balloon.test.ts`.
- **Presentation-only — zero engine/IR/parity impact.** The event contract (ADR 0002) is untouched;
  `replayPanels` still applies. Test `never emits a speech balloon for the Hero` inverted to
  `the Hero speaks: every resolved-action balloon is a speech balloon`. **113 web tests green, tsc clean.**
  Engine 139 / IR 198 / parity 143/143 unaffected (not re-run — no code in those packages changed).

**Close-up tail fix + a PNG render harness (same session).** The new speech tail crossed the Hero's face
on close-ups. Two compounding causes, both found by *rendering panels and reading the geometry*, not by eye:

1. **Aimed at the head's centre.** The tail targeted the crown anchor at `faceX` (horizontal centre of the
   head), so whenever the balloon sat *beside* the head — a tall caption pushes the Hero balloon down to
   head height — the tail drove straight across the face into the nose. Fix: aim the speech tail at the
   **nearest point on the head's silhouette** (`headEdgeTip`, `render.ts`) — the crown when the balloon is
   above, the temple when it is to the side. This is the real fix; a comic tail touches its speaker's edge.
2. **Overshot vertically.** `roundedSpeech` floored the tip at `max(target.y, boxBottom + 22)`, a minimum
   tail length that on a close-up (head ~7px below the balloon) punched ~30px past the crown into the face.
   Reduced to `boxBottom + TAIL_MIN_EXIT=2`, so the tail reaches a distant speaker the same way but stops
   at a near one (`balloon.ts`). The crown anchor (now used only by *thought* bubbles) keeps a hairline cap.

Verified across three placements in rendered PNGs: balloon-above (tail→crown/hair), balloon-beside (→temple),
Guide two-shot (→top of tiki head, distant tail unchanged). Was invisible while the Hero used a thought
bubble (bubble-trail dots, always wide two-shots).

- **New dev tool `web/tools/render-panel.ts`** (`npm run render:panel [walkthrough.cmd] [outDir]`), on
  `@napi-rs/canvas` (prebuilt, no system deps; added as a devDependency). Renders real panels through the
  browser's own `renderPanel` to PNG, so balloon/tail/placement geometry can be validated headless — the
  `web/` suite is jsdom-free and had no way to exercise a real canvas. Output dir is git-ignored (`out/`).

**Wiki not rewritten this slice.** `wiki/the-hero.md` already defers the thought-vs-speech class to the
ADRs ("not restated here"), so no edit was forced; the dual-register identity rewrite (ADR 0006
Consequences) lands with the aside *content* in a later slice.

---

## v0.17.4 — 2026-07-22 — Catalog tail cleared: `<NTH>` + string-in-statement; the rest is engine-owned by design

**Date:** 2026-07-22

Triaged Next Action #2's "remaining catalog tail" — five routines each stalled on a distinct ZIL idiom
(none an exit scan, so ADR 0003 did not apply). Two were genuine extraction-vocabulary gaps and are now
lowered; the other three are engine-owned by design and stay catalogued. Catalogued-complex fell 28 → 26;
routines extracted 360 → 362.

**1. `<NTH>` → 0-based `table-get` (unblocks I-CYCLOPS).** ZILCH's NTH is a 1-based table read; the IR's
`table-get` is 0-based, so the index shifts down by one. `I-CYCLOPS` reads its wrath message
`<NTH ,CYCLOMAD <- <ABS ,CYCLOWRATH> 1>>` — the ZIL index already subtracts one, and NTH subtracts one
more, so the lowered shape carries a double `sub`. Added `NTH` to `EXPR_HEADS` and one `formExpr` case
(`ir/src/extract-behavior.ts`). Pinned end-to-end: the real extracted index driven over the real CYCLOMAD
table returns the correct game string for a given `CYCLOWRATH` (magnitude 2 → first message, 6 → last-but-
one) — the off-by-one is what the test discriminates.

**2. Bare String in statement position → a value statement (unblocks GRATE-FUNCTION).** A String ending a
COND clause is that clause's value, exactly like the Number/GVal/LVal cases already handled in `stmt()`
(`expr()` already lowered String). `GRATE-FUNCTION` passes the taken clause's `"The grating opens."`
string to `OPEN-CLOSE` as its open-message; the clause body ended in that bare String. One line in `stmt()`.

**3. The remaining three stay catalogued — not idiom gaps.** `GOTO` (`FSET? flag is not an atom` — a flag
held in a variable) and `PICK-ONE` (`REST` with a computed byte offset) are **Group A engine builtins**
(movement, randomness; asserted by the triage test), so extracting them would shadow the engine. `V-SAY`
stops on the parser's **P-LEXV lex buffer** (`unsupported ITABLE spec`), which is ADR 0002 engine-owned —
its old "bare `,ONBIT`/`,ACTORBIT`" label was **stale** (flag-as-value has been extractable since the
`resolveName` flag-name path; that was never V-SAY's blocker). HANDOFF corrected.

**Verification.** +5 IR tests (`ir/test/behavior-35k.test.ts`), each discriminating — reverting either fix
re-catalogues its routine and four of the five fail (the fifth, the engine-owned tail, stays green either
way, confirming it was untouched). Two stale "advance-to-next-blocker" markers in `behavior-35d`/`-35g`
updated to assert extraction. IR 193 → 198, engine 139 unchanged, strict parity 143/143, completion still
350/350. `graphify update` run for `ir`.

---

## v0.17.3 — 2026-07-22 — V-CLIMB-UP implemented; OTHER-SIDE latent-bug fix (the GETPT/NEXTP idioms)

**Date:** 2026-07-22

Closed Next Action #2's first two items — the last engine stub and its companion uncovered idiom. Both
read a room's exit *properties* in the ZIL (`<GETPT ,HERE .DIR>` / the `NEXTP` walk); the IR models
exits structurally, so both become lookups over `exitFor`/`room.exits` — the same substitution ADR 0003
made for the sword's exit scan, done here as engine builtins rather than an extractor rewrite. Neither
routine is reached by any walkthrough (every climbable object and every door object self-handles its own
passage before the default verb runs), so every message was pinned against the Release 119 build
(`dfrotz -s 1234`), not reasoned from the ZIL.

**1. V-CLIMB-UP — full builtin (`engine/src/builtins.ts`), replacing the "You can't go that way" stub.**
Faithful to `gverbs.zil`: dispatched as an action it takes no object (DIR=up, OBJ=false), so "climb up
<anything>" simply walks any up exit — the case the stub got wrong wherever an up exit existed (Kitchen→
Attic). `V-CLIMB-DOWN` calls it `<V-CLIMB-UP ,P?DOWN ,PRSO>`, carrying the object through, which makes
the object-lead / wall / tree / "can't do that" branches reachable. Reproduces the exact refusals,
including STAIRS printing plural ("The stairs don't lead downward.", no singular "es"), the wall-synonym
message, and the PATH-vs-tree distinction, via `GLOBAL-IN?` (`room.scenery`) and the exit kinds
(NEXIT=blocked, UEXIT/CEXIT/DEXIT=real).

**2. OTHER-SIDE — return the door-exit's *direction*, not the room beyond (latent wrong-answer).** The
builtin returned `exit.to`; ZIL's `<RETURN .P>` returns the direction property, and its only caller
`V-THROUGH` feeds it to `<DO-WALK .M>`, which expects a heading. Returning a room would push a room id
onto `pendingWalks` and never move — the "total function with a wrong answer" pattern this codebase keeps
producing (HANDOFF standing note). Unexercised today only because every door self-handles passage;
corrected now with a discriminating test (force the cellar trap door open, "enter trap door" → moves up
to the living room, which fails if a room is returned).

**Also:** factored shared `displayName`/`globalIn` helpers in `builtins.ts` (`GLOBAL-IN?` now delegates);
refreshed the stale "V-CLIMB-UP still stalls on GETPT" comment.

**Tests:** +5 in `engine/test/engine.test.ts` (139 engine, up from ~129). Strict parity unchanged at
143/143. `graphify update engine` run.

**Status:** ✅ Committed to 5.5 polish. Remaining catalog-tail idioms (I-CYCLOPS `<NTH>`, GRATE string,
`,ONBIT`/`,ACTORBIT`, non-atom `FSET?`, non-literal `REST`) still open — none blocks a walkthrough.

---

## v0.17.2 — 2026-07-22 — Comic pane: tail connection + whole-panel fit on mobile

**Date:** 2026-07-22

The two comic-pane issues surfaced by live testing (Next Action #2), both confirmed fixed in-browser.

**1. Balloon tail reconnected to the speaker (`web/src/comic/balloon.ts`).** The tail was clamped to a
fixed `TAIL_REACH = 72`px by `clampReach`, a cap added originally to stop an "unclamped needle across
the panel." But because balloons stack from the panel top while figures stand at the bottom, that cap
left the tail floating in mid-air, connected to nobody — worst in the single-column layout, whose tall
panel puts the head farthest below the balloon. The `target` passed into `drawBalloon` is already the
head anchor (`render.ts`, crown at `headH * 0.2`), so the fix is to run the tail straight to it:
`roundedSpeech` uses `target` as its tip and `bubbleTrail` walks its bubbles to `target`. `TAIL_DEPTH`
still forces the tail out of the box before turning toward a close speaker. `clampReach`/`TAIL_REACH`
removed (no test asserted tail geometry).

**2. Whole panel fits without scrolling on short / portrait viewports.**
- `web/src/comic-view.ts` (`measure()`): panel size came only from the column *width*, so height was
  whatever the 400:340 aspect made it — on a portrait phone (more so once the keyboard halves the
  viewport) that exceeded the strip, and one panel needed scrolling. `measure()` now also caps the
  panel to the strip's visible height (`clientHeight` − vertical padding) and derives width from it at
  the native aspect; the narrower row is centred by the existing `justify-content: center`. The
  `ResizeObserver` already redraws on the height change the keyboard triggers.
- `web/style.css`: the `.comic-cast` member list is hidden at `max-width:720px and orientation:portrait`
  and at `max-height:560px` (the latter catches the on-screen keyboard in either orientation), handing
  that vertical space to the panel. `§4a`'s "fully shown" is a promise about one panel, not the strip's
  history.

**Also:** `README.md:27` reworded — "inspired by the original gameplay" → extracts the original's
semantics into an IR, verified turn-for-turn against its transcripts (143/143 strict). Cleared the
matching Open Issue.

**Tests:** 113 web green, full suite unchanged (`layoutStrip` signature untouched, so `layout.test.ts`
is unaffected; no test asserted tail geometry). Both fixes confirmed by looking at the running page, per
the standing "found by looking, not by tests" note.

---

## v0.17.1 — 2026-07-22 — Hero thought-balloon fixes, now pinned by unit tests

**Date:** 2026-07-22

Two things in one entry: the three Hero thought-balloon fixes (landed verified-in-browser late in the
0.17.0 work but never versioned) and the unit tests that pin them this session.

**The fixes** — verified in-browser on the real "The leaflet, then." panel (take leaflet at West of
House):
1. **Shape (`web/src/comic/balloon.ts`, `cloud()`).** It rendered as a chain of overlapping *full*
   circles around a visible rectangle: `cloud()` stamped a complete circle (`arc(…, 0, 2π)`) at every
   bump *and* added the inner `rect`, then the caller stroked the lot. Rewritten as one continuous
   closed path of outward-only scallop arcs — a single clean cloud, no interior lines.
2. **Face-avoidance (`web/src/comic/render.ts`, `drawBalloons` + new `clearOfFaces`).** Each on-stage
   head is a keep-out box; the Hero thought is capped to the roomier side-margin, parked in that corner
   (`heroSide`), and any balloon whose box/scallops/tail would enter a face box is slid horizontally out
   (`clearOfFaces`). The tail aims at the crown (`headH * 0.2`), not mid-face. On a close-up with no
   margin it tolerates a small overlap rather than an unreadable ribbon (floor `width*0.3`).
3. **Close-up width cap (`render.ts`, `MAX_FIGURE_WIDTH` + `fit`).** A figure is capped to `0.55 ×
   panel width` **only when the panel carries a Guide speech or Hero thought balloon** (`widthCap` in
   `renderPanel`, threaded into `fit`). Conditional on purpose: the game-over `reaction` rung has no
   such balloon and stays full-frame; only `close-up` shrinks (~6%).

**The tests:**
- `web/test/balloon.test.ts` drives `drawBalloon` (the only path to the non-exported `cloud()`) through
  a recording 2D context and asserts the thought outline is one closed path with **no interior `rect`
  and no full-circle arc** (`|end−start| < 2π`); a `CBWoodringBox` caption is the control (still draws a
  `rect`, no scallops).
- `web/test/render.test.ts` covers `clearOfFaces` (slides disjoint from an overlapping face; no-op when
  already clear; tolerates a panel-spanning head) and `fit`/`MAX_FIGURE_WIDTH` (caps a wide figure only
  under a finite cap, uncapped at `Infinity`, no-op for narrow figures).
- `fit`, `clearOfFaces`, and `MAX_FIGURE_WIDTH` are now `export`ed from `render.ts` for test access
  (`renderPanel` was their only caller); `cloud()` stays private. Each assertion was confirmed to
  **fail on the reverted bug**.

**113 web tests green** (was 101); typecheck clean; graph updated.

---

## v0.17.0 — 2026-07-22 — Narrative Director: Guide converses + facing two-shot — Slice 5 (subsystem complete)

**Date:** 2026-07-22

The buddy-comic payoff, and the last of ADR 0005's five slices: the Guide replies to what the Hero
does, and the two look at each other. Minor bump — the Narrative Director subsystem is complete.

### Changes

- **(a) Beat-keyed Guide — `web/src/comic/mapper.ts` + `comic-view.ts`.** `guideFor` now takes the
  turn's affect marker and consults a new `BEAT_SCRIPT` (marker → line) *before* the room gazetteer:
  the Guide replies to the beat the Hero just caused (`combat-victory`, `combat-threat`, `grue-threat`,
  `scored`, `reveal`) rather than only narrating a room on entry. This is the whole of "the two
  characters talk to each other" — the line is chosen by *what the Hero did*. Same cooldown, still
  presentation-only (reads events/marker, touches no state), so `wiki/the-guide.md` §3 holds; the room
  gazetteer path is unchanged when no beat reacts. `MapperOptions` gained `beatScript`. Death (the
  `reaction` shot, tight on the Hero) is deliberately excluded from `BEAT_SCRIPT` — the idol does not
  crowd a death.
- **(b) Facing — `web/src/comic/figure.ts` + `render.ts`.** `drawFigure` gained a `mirror` param that
  flips the figure horizontally about its own box via a `save`/`translate`/`scale(-1,1)` transform, so
  the face-onto-torso join flips as one unit. `render.ts` mirrors the Hero (the right-hand figure) in a
  two-shot so the two face each other instead of the Hero facing out of frame — the user-reported
  "Hero looks away from the Guide" symptom. The Hero's balloon-tail anchor flips to `width - faceX`
  under mirror so the tail still finds the face.
- **The Guide stays deadpan.** "Two-party affect" was deliberately narrowed to *facing* only:
  `GUIDE_EMOTION` remains neutral. `wiki/the-guide.md` settles the Guide as a carving that "reacts to
  nothing; it comments" — giving the idol expressions would contradict its identity, and the
  user-visible fix was the two looking at each other, not the idol emoting.
- **Voice docs updated.** `wiki/the-guide.md` rule 6 relaxed ("address the beat, now — not only the
  scene"); `wiki/the-hero.md` records the §4 decision that the **Hero keeps the *thought* balloon and
  does not speak** — the exchange is the idol commenting on the Hero's actions, not spoken dialogue.
- **Tests.** `mapper.test.ts`: the Guide reacts to a beat (`open mailbox` → `reveal` marker → beat
  line, with no gazetteer entry present), and the gazetteer still fires on first entry when no beat
  reacts. `figure.test.ts`: `drawFigure` mirrors about the box when asked and is a no-op transform by
  default.

### Status

Web 101/101 green, build clean, graph regenerated. **ADR 0005 complete across all five slices**: the
comic edits out try-and-error (refusals) and backtracking (traversal runs), the Hero acts instead of
thinking commands, and the Guide replies to the Hero's beats face to face. **NOT verified in-browser
— the facing flip and the Guide's framing on tight shots need a visual pass (Playwright); the mirror
direction was inferred from the symptom, not seen.** That visual verification + tuning is the next
action.

---

## v0.16.7 — 2026-07-22 — Narrative Director: traversal collapse — Slice 4

**Date:** 2026-07-22

The Director's first *buffering* edit: backtracking no longer renders as a panel per step.

### Changes

- **`web/src/comic/director.ts` — a run of consecutive `traversal` panels collapses to one.** The
  Director now buffers: a `traversal` panel is held in `pendingTraversal` (kept as the *latest* — the
  run's destination so far) and not emitted; the run **flushes** — emitting that single panel — when a
  non-traversal beat arrives (`arrival` in a new room, `action`, `terminal`, `ambient`) or via the new
  `Director.flush()`. Walking through *new* rooms is untouched: each is an `arrival`, a beat, emitted
  as it happens — only *revisiting* collapses. A refusal never interrupts a run (the buffer keeps
  filling across it). A trailing run (input ends mid-walk) stays buffered until `flush`, which is the
  intended past-tense trailing, not a bug. The mapper is still folded on every turn, so stream state
  stays whole across buffered turns.
- **`web/src/comic-view.ts` — `flush()` on `ComicView`, and the draw logic extracted to `render()`.**
  `appendTurn` and `flush` both call `render(panels)`; the 0..N-panel loop and scroll-to-newest are
  now shared. `main.ts` calls `comic?.flush()` after the resume replay loop, so a session saved
  mid-walk shows where the player actually is rather than stalling on the last emitted beat.
- **`web/test/director.test.ts` — Slice 4 golden.** The §6-successor invariant is now **emitted ===
  `edited(full fold)`**, where `edited` is a reference reducer (drop refusals, collapse each maximal
  traversal run to its last panel, trailing flush) kept in the test so the editing contract is
  executable and reviewable. Asserted over every walkthrough, plus a corpus check that collapse
  actually fires (`emittedTotal < keptTotal` — the full game backtracks heavily). Focused tests pin
  the buffering against real geography (WEST-OF-HOUSE ⇄ NORTH-OF-HOUSE): a back-and-forth walk
  collapses to one panel at the destination; a trailing run waits for `flush`, which is idempotent.
  The Slice 3 refusal tests are kept.

### Status

Web 97/97 green, build clean, graph regenerated. The comic now edits out both try-and-error
(refusals, Slice 3) and backtracking (traversal runs, Slice 4). Next: Slice 5 — the Guide converses
with the Hero and the two share a facing two-shot (the buddy-comic payoff; the largest slice).

---

## v0.16.6 — 2026-07-22 — Narrative Director: beat detection + noise drop — Slice 3

**Date:** 2026-07-22

The comic stops being a play-log: the Director now drops parser refusals — the try-and-error that
ADR 0004's one-panel-per-turn rendered verbatim.

### Changes

- **`web/src/comic/mapper.ts` — panels are tagged with a beat `kind`.** New `PanelKind`
  (`arrival | traversal | action | terminal | refusal | ambient`) and exported `panelKind()`, a
  first-match ladder over signals the mapper already folds: game-over → `terminal`; a move →
  `arrival`/`traversal` (a move that also scored is still, first, a place the player went); took/
  dropped/salient-object/score → `action`; the `parser-miss` affect marker with none of the above →
  `refusal`; narration-only → `ambient`. Reads the event contract first, the affect marker (itself a
  channel-read before a prose match) only to tell a refusal from ordinary narration. `Panel` gains a
  `kind` field. **Classification is the mapper's (it already folds the stream); the drop *policy* is
  the Director's** — mechanism vs. policy.
- **`web/src/comic/director.ts` — drops `refusal`.** `ingest` still folds the mapper on every turn
  (its visited/inventory/room state is what *later* turns classify against, so skipping a turn would
  desync the stream) but returns `[]` when the panel's kind is `refusal`, so the view draws nothing.
  A dropped turn never carries a Guide line (a refusal is never a first visit), so the cooldown is
  untouched. `.panels` is now the **emitted** stream, not the full fold.
- **Tests.** `mapper.test.ts`: `panelKind` ordering unit test + a real-turn tagging check (arrival on
  the opening, action on take/drop, ambient on look). `director.test.ts` rewritten for Slice 3: the
  §6-successor invariant **emitted === full fold minus refusals** over every walkthrough; a synthetic
  refusal (`blorptastic`, an unknown word — not `xyzzy`, which Zork answers as a joke) proving the
  drop; and a refusal-between-two-moves check proving stream state stays whole across a drop (the
  `north` after it still reads `arrival` at `NORTH-OF-HOUSE`).

### Status

Web 95/95 green, build clean, graph regenerated. ADR 0004 §6 (one panel per turn) is now superseded
on the emitted stream. The mapper is still 1:1 and its §6 test still holds — the mapper classifies,
the Director edits. Next: Slice 4 (traversal collapse — the Director's first *buffering* edit), then
Slice 5 (Guide converses + two-shot).

---

## v0.16.5 — 2026-07-22 — Narrative Director: scaffolding (ADR 0005) + Hero voice — Slices 1–2

**Date:** 2026-07-22

The comic pane read as a *play-log, not a story*. Diagnosed as a category error — ADR 0004 conflated
the parser transcript with the comic script — and scoped the fix as **ADR 0005, the Narrative
Director**: a layer that turns the comic into an edited, past-tense retelling (drop noise, collapse
traversal, converse) instead of a one-panel-per-turn mirror. This entry lands the first two of five
slices; both are behaviour-preserving groundwork.

### Changes

- **`docs/adr/0005-narrative-director.md` (Proposed).** Supersedes ADR 0004 §3 (Guide trigger), §6
  (one panel/turn), §2/§2a (Hero balloon = command); preserves ADR 0002 (contract not extended), the
  §7 camera ladder, §10 affect ordering, §2 verbatim captions, and the pure-function/parity-oracle
  property. Testing contract moves from "1 panel per turn" to "walkthrough → golden panel sequence."
  Five slices enumerated.
- **Slice 1 — Hero balloon = resolved action.** `heroBalloon(took, dropped, names)` in
  `web/src/comic/mapper.ts` renders the *outcome* of the turn's `object-moved` events ("The leaflet,
  then." / "The leaflet can stay.") and returns **null** for movement, examination and parser
  refusals — the raw-command thought bubble (`s`, `look`) is gone. Object-name table
  `objectNameTable(doc.objects)` (`web/src/status.ts`, mirrors `roomNameTable`) threads
  `main.ts → createComicView(…, names) → createMapper({names})`; static world data, so the mapper
  stays a pure function of (stream + config). Replaced the §2a "command verbatim" test with the §1
  derivation + a `heroBalloon` unit test.
- **Hero voice + character settled — `wiki/the-hero.md`** (sibling of `wiki/the-guide.md`). The Hero
  is the player's deliberately-unnamed self-insert = the target player: middle-aged, tech-savvy,
  lapsed tabletop-D&D, therefore systems-minded and genre-literate, revisiting a familiar dungeon.
  Five voice rules; built as the Guide's complement (both dry, opposite ends of time) for the Slice 5
  two-shot. Slice 1 templates now read in that voice.
- **Slice 2 — Director skeleton.** `web/src/comic/director.ts`: `createDirector(options) →
  { ingest(turn) → Panel[], panels }` wraps the mapper, returns exactly one panel per turn.
  `comic-view.ts` now drives the Director; `appendTurn` loops over `ingest`'s 0..N panels (draws one
  canvas today, future-correct for drops=0 and montages=N). `director.test.ts` proves no behaviour
  change: flattened output byte-identical to the mapper's sequence over every walkthrough — the parity
  seam Slice 3 will break on purpose.

### Status

Web 91/91 green, build clean, graph regenerated. Still 1 panel/turn (no arity change until Slice 3).
Not verified in-browser. Next: Slice 3 (beat detection + noise drop), where 1:1 breaks and golden
panel-sequences replace the count assertions.

---

## v0.16.4 — 2026-07-22 — Two-up panel layout: columns were fitting against native width, not a shrinkable minimum

**Date:** 2026-07-22

User testing of the running site turned up multiple problems in the comic pane; this session fixed the
simplest — panel layout — and logged the rest as open for the next session (see Open Issues, Project / M5).

### Changes

- **`web/src/comic/layout.ts` — new `MIN_PANEL_SCALE` (0.75), and `columnsFor` now fits against it.**
  `columnsFor` required each column to hold a full native-width (400px) panel before granting a second
  column, so any comic pane narrower than ~810px fell back to **one** panel stretched toward
  `MAX_PANEL_SCALE` (640px) — confirmed live via Playwright at 1280×800, a thoroughly ordinary laptop
  width. That is the opposite of what a two-up layout should do at a merely-average width, and §4a
  already settles the direction (style.css: "responsiveness outranks retro fidelity"; stretching was
  already a parameter on the grow side). `columnsFor` now fits against `UNIT.width * MIN_PANEL_SCALE`
  (300px) instead of the full native width; `layoutStrip`'s existing share/clamp arithmetic needed no
  change; because of how `columnsFor`'s fit inequality works, `panelWidth` is mathematically guaranteed
  `>= MIN_WIDTH` whenever the column count isn't capped by `MAX_COLUMNS`, so panels can't shrink further
  than 300px this way. Two columns now kick in around 610px of strip width instead of 810px.
- **`web/test/layout.test.ts`** — the boundary test encoded the old native-width threshold on purpose (it
  is the test that would have caught a *typo* reproducing the ported bug); updated it to the new
  `MIN_PANEL_SCALE`-based boundary (`2 * MIN_WIDTH + GUTTER`) since the boundary itself intentionally
  moved, not just its value.

### Status

**Web suite green (89/89, all packages 468).** Verified live: rebuilt, ran the dev server, drove two
turns via Playwright at 1280×800 — two panels now render per row where previously one oversized panel
did. **Comic pane still has other reported issues beyond layout** — user flagged "many issues" during
testing and called this one "the simplest"; the rest are unenumerated and are next session's first task.
See Open Issues, Project / M5.

---

## v0.16.3 — stage 5.5 task 1: tune the SHOTS framing table by looking at the running page

**Date:** 2026-07-21

### Changes

The remaining presentation authoring stub — `SHOTS` in `web/src/comic/render.ts`, the per-preset
framing numbers — tuned per the standing method (look at the running page, don't propose rules blind).

- **New dev harness `web/gallery.js` + `web/gallery.html`.** Holds one real panel constant (real
  backdrop / pose / emotion, replayed from a short deterministic drive at seed 1234) and renders every
  `CameraPreset` over it, so the only variable across a row is the SHOTS row itself. Each canvas is
  id'd `cv-<preset>-<width>` for direct screenshotting. Imports the built `dist/` modules, as
  `index.html` does. Served by `tools/serve.ts`; viewed via Playwright.
- **`reaction` backdrop 0.3 → 0.18.** This rung fires on game-over (§7 rung 0), the biggest emotional
  beat; at 0.3 the house behind the head still competed with the face. At 0.18 the backdrop is a soft
  ghost and the face dominates. Confirmed by before/after screenshot.
- **`over-shoulder` fill 1.0 → 0.86.** At 1.0 the Hero (the *addressed* figure, not the subject —
  Guide at x≈0.06, Hero at x≈0.94) had its far arm clipped by the right frame edge. At 0.86 the Hero
  sits fully in frame beside the foreground Guide; the two-shot reads cleanly. Confirmed by screenshot.
- **Left as-is, deliberately:** `establishing` (0.5) vs `wide` (0.58) look near-identical, but the
  ordering is correct and the similarity is inherent to solo-Hero scenes (no second figure, no object
  art) — tuning it further is the kind of proposal the method note warns dies under measurement.
  `medium` / `close-up` already read correctly.

### Status

**Web suite green (89), typecheck clean.** Framing change only — no test asserts SHOTS values (they
are authoring judgement on top of the ADR, which fixes only *which* rung fires). Screenshots archived
in the session, not committed.

---

## v0.16.2 — stage 5.5: green the web presentation baseline (two pre-existing failures)

**Date:** 2026-07-21

### Changes

Cleared the two long-standing red marks in the presentation suite before building further on it —
both traced to root cause, neither a mapper/renderer defect.

- **`web/test/portrait.test.ts` tsc error** (`'dw'/'dh' possibly undefined`). Under
  `noUncheckedIndexedAccess` the destructured `drawImage` args are `number | undefined`; the aspect
  assertion divided them. Fixed with non-null assertions (`dw! / dh!`), matching the existing
  `calls[0]!` style — the mock always records nine numeric args.
- **`web/test/mapper.test.ts` camera-ranking failure** — a *test-corpus* issue, not a mapper bug.
  `allPanels()` globs every `.cmd`, and stage 5.5 added `12-full-game.cmd` (a 405-command, revisit-
  heavy whole playthrough) to that directory. The §7 ranking assertion expects the ADR's measured
  order (medium > establishing > …), but a full run contributes 84 `wide` vs 20 `establishing`,
  flipping `wide` above `establishing`. Measured to confirm: over the 11 scene walkthroughs the order
  is exactly the ADR's (medium 99 > establishing 61 > close-up 24 > reaction 11 > wide 5); the oracle
  alone inverts it. Fix: the ranking test now measures over a new `scenePanels()` (oracle excluded),
  which is the corpus §7 was measured on; the invariant tests keep the full `allPanels()` corpus. File
  header updated to describe the two corpora.

### Status

**Web suite fully green: 89 tests, typecheck clean.** Engine unchanged (134 green). The whole repo now
has no known failing tests. Test-only change — no source touched.

---

## v0.16.1 — stage 5.5: treasure scoring emits `score-changed` (the web score climb)

**Date:** 2026-07-21

### Changes

- **Fixed the score-event gap: treasure deposits now surface a `score-changed` event.** The extracted
  ZIL routines that move SCORE — `SCORE-UPD` on a trophy-case deposit (gverbs.zil:1851) and the
  LIVING-ROOM M-END recompute (1actions.zil:483) — write `globals.SCORE` directly and know nothing
  about the event stream, so only room-visit awards (native `addScore`) emitted the event. The whole
  endgame treasure-scoring climb (302 → 350 at seed 1234) was therefore invisible to any host that
  listens for `score-changed` — including the web status line, which already folds the event
  (`web/src/status.ts`).
- **`reconcileScore(ctx, before)` in `engine.ts`**, called at the end of `command()`: compares the
  final SCORE against the score already reported this turn (the last `score-changed`, else the turn's
  starting score) and emits one corrective event for any remainder. A turn where `addScore` already
  carried the full delta adds nothing; a turn moved only by an extracted routine emits one event
  carrying the final total. It runs on the buffered prose, so `emit` flushes the "Done." first and the
  score event lands after the line it explains. Covers **every** path that writes SCORE, not just the
  two named routines — the interpreter stays oblivious to the event contract.
- **Committed regression: `completion.test.ts` now asserts `eventScore === 350`** — the highest score
  ever carried by a `score-changed` *event* across the winning run (vs. read from state). Verified to
  fail without the fix (stalls at 302, the room-visit-only total).

### Status

**134 engine tests green** (+1), typecheck clean, strict transcript parity intact (structural event,
no narration change). Web suite unchanged (the one `mapper.test.ts` shot-ranking failure predates this
and is unrelated). Graphify regenerated.

---

## v0.16.0 — stage 5.5: the game is completable — 350/350, victory at the barrow

**Date:** 2026-07-21

### Changes

- **The engine now wins Zork I.** The completion driver reaches score **350/350**, ends in
  `STONE-BARROW`, and emits `game-over{victory}` — the exit criterion of milestone 5.5.
- **New shared driver `engine/harness/complete.ts` (`runFullGame`).** The combat-resilient replay
  logic moved out of `full-run.ts` into this module so the probe and the committed test run the
  *same* code. `full-run.ts` is now a thin human-readable front end over it.
- **Thief-and-inventory-resilient recovery.** The v0.15.6 probe stalled at 334/350 because the
  engine's RNG has the thief hoard skull(t10)+torch(t6) = the 16-pt gap; both drop in his hideaway
  (TREASURE-ROOM) on death and the fixed list can't recover them past the load limit. `runFullGame`
  splits the fixed list just before the map-dependent barrow tail, then runs `recoverHoard()`: while
  score < 350, it ferries **any** treasure stranded in the hideaway back to the trophy case — turning
  the lantern on for the dark descent (`w,w,u`), shedding non-treasure junk to clear the load limit,
  taking what fits, returning (`d,e,e`), casing it, and repeating for as many trips as it takes. When
  the case completes, `SCORE-UPD` reveals the map and the tail (`take map`, `read map`, navigate to
  the barrow) wins. The recovery hardcodes nothing seed-specific — it recovers whatever the draw
  scattered, keyed off each object's `treasureValue`/`value` and first synonym.
- **Committed completion test `engine/test/completion.test.ts`** (seed 1234) asserts score 350,
  `victory`/`game-over{victory}`/`STONE-BARROW`, zero crashes/deaths/missing-routines, and no
  stranded treasure. This is the milestone-5.5 exit criterion wired into the suite so it can't
  regress silently.
- **Why seed 1234 only:** `12-full-game.cmd` is a fixed command list authored against dfrotz seed
  1234; under other streams the thief robs a different mid-game set, so which `put <treasure> in
  case` lines land diverges and the list stops describing a winning game (30–334 across seeds). That
  is a property of the fixed list, not the engine (ADR 0002 keeps the engine's own PRNG). The
  recovery loop and combat repetition added on top are RNG-agnostic and player-realistic.

### Status

**133 engine tests green** (+4 completion), typecheck clean, strict parity intact (23 transcript
tests). Graphify regenerated (1007 nodes). Milestone 5.5's core exit criterion — the game is
completable in the engine — is met.

---

## v0.15.6 — stage 5.5: magic boat `LAUNCH` (vehicle M-BEG dispatch)

**Date:** 2026-07-21

### Changes

- **Fixed the M-BEG applicable to be `<LOC WINNER>`, not always the room** (`engine.ts`).
  ZIL's PERFORM runs the second dispatch slot as `<APPLY <GETP <LOC ,WINNER> ,P?ACTION> ,M-BEG>`
  (gmain.zil:212). When the player is aboard a vehicle, `<LOC WINNER>` is the vehicle, so the
  vehicle's ACTION — not the room's — runs with M-BEG. The engine had dispatched M-BEG only to
  `here()` (the room), so `RBOAT-FUNCTION`'s LAUNCH handling (which lives under its M-BEG branch,
  1actions.zil:2738) was never reached and `V-LAUNCH`'s refusal won instead.
- New `containerAction(ctx)` helper resolves the ACTION of the player's container: the room on
  land (identical to the old lookup), the vehicle when aboard. Applied at both M-BEG sites — the
  `command` dispatch and the bare-direction `travel` path (so river-current WALK also reaches the
  boat).
- **Impact:** the whole Frigid River leg + coal mine now run. Under the combat-resilient full-game
  probe (`full-run.ts`, seed 1234) the engine advances **173 → 334/350**, misses **104 → 4**,
  0 crashes, 0 deaths. `launch` now drifts RIVER-1→4; buoy/emerald/scarab/shovel/dig all work.
- **Remaining 16 pts to 350 is thief-RNG divergence, not an engine defect.** The completion oracle
  is authored for dfrotz seed 1234's exact RNG stream; the engine's generator differs (ADR-noted).
  Under the engine's draws the thief steals *both* skull and torch from the player (dfrotz steals
  only the torch; the skull is cased early at cmd #215). On the thief's death both drop in
  TREASURE-ROOM, and at recovery the player hits the inventory limit
  (`"You're holding too many things already!"`), stranding skull(10)+torch(6) = the exact 16-pt
  gap. Scores swing 30–334 across seeds {1,7,42,99,1234,2026}, confirming RNG-sensitivity. Reaching
  350 needs a completion harness resilient to thief theft + inventory (task 4), or dfrotz's exact
  RNG (infeasible) — a distinct problem from the boat gap.

### Status

129 engine tests green, typecheck clean, strict parity intact (23 transcript tests). Graphify
regenerated (1001 nodes). The named task-0 blocker (magic boat LAUNCH) is complete.

---

## v0.15.5 — 2026-07-21 — Room `M-END` end-of-turn action; the exorcism completes (stage 5.5)

**Date:** 2026-07-21

The engine now runs a room's ACTION with `M-END` at end of turn — the last frontier gap identified at
v0.15.3. ZIL runs it every non-fatal turn (`gmain.zil:154`, order `PERFORM → room M-END → CLOCKER`),
and the exorcism's completion depended on it: `LLD-FLAG` is set in `LLD-ROOM`'s READ-book branch gated
on `XC`, and `XC` is set only by that room action running with `M-END`, which the engine never did.
With the step in place the ceremony finishes, and the full-game oracle advances from a hard stop at the
temple to **173/350 at DAM-BASE** — the next gap is the magic boat, not the exorcism.

### Changes

- **`engine/src/engine.ts` — room `M-END` step in `runTurn`.** New `runRoomEnd(ctx)` runs the current
  room's ACTION with `M_END` between the walk-drain and `runClock`, on the room the player *ends* the
  turn in (so a WALK's `M-END` fires in the destination, matching `<LOC ,WINNER>`). It no-ops once the
  turn has finished (ZIL gates `M-END` on `PERFORM` not returning `M-FATAL`) and swallows a `FatalSignal`
  exactly as `runClock` does — an `RFATAL` in `M-END` ends the game and skips the clock. Also added
  `endIfFinished(ctx)`, a small helper that reads `ctx.finished` in a fresh scope and emits `game-over`:
  the earlier `if (ctx.finished !== undefined)` guard narrows the property to `undefined` for the rest of
  `runTurn`, and TS does not widen it back after `runRoomEnd`/`travel` mutate it, so a second inline
  spread would be a `never`. Both game-over checks now route through the helper (one less duplicated
  spread).
- **`engine/src/builtins.ts` — `addScore` advances `BASE-SCORE` in lockstep with `SCORE`.** This is the
  regression `M-END` exposed and the substantive fix. ZIL splits the score: `SCORE-UPD` (gverbs.zil:1851)
  adds a fixed award to **both** `BASE-SCORE` and `SCORE`, and `BASE-SCORE` is the accumulator the
  trophy-case recompute reads back — `LIVING-ROOM-FCN`'s `M-END` sets `SCORE = BASE-SCORE + OTVAL-FROB`
  on every TAKE/PUT in the Living Room (1actions.zil:483). The engine's native `addScore` (room-visit
  values, via GOTO) only advanced `SCORE`, so the first `take`/`put` in the Living Room recomputed
  `SCORE` from a `BASE-SCORE` of 0 and **silently wiped every room-visit point** — walkthrough 06
  dropped 35→25 (the Kitchen's 10), walkthrough 04 likewise. Advancing `BASE-SCORE` in `addScore`
  restores the invariant `SCORE = BASE-SCORE + value-of-treasures-in-case`. No double-counting: find
  value (`P?VALUE`, via SCORE-UPD) and case value (`P?TVALUE`, via OTVAL-FROB) are separate properties.
- **Verified by perturbation, not just green.** The score regression was diagnosed with a throwaway
  probe that printed `SCORE` after each command (Kitchen 10 → `take lamp` 0 → `down` 25), pinpointing
  the loss to the Living Room `M-END` rather than to room scoring; the fix restored 10 → 10 → 35.

### Status

**Stage 5.5 ◐.** Strict parity **143/143** restored (04 and 06 back to full after the score fix);
**129 engine tests green**; typecheck clean. The exorcism blocker is closed. **Next gap is the magic
boat:** `#212 "launch"` returns `V-LAUNCH`'s refusal ("You can't launch that by saying \"launch\"!")
because the boat's ACTION (`RBOAT-FUNCTION`, 1actions.zil:2722) — which intercepts `LAUNCH` and drives
the Frigid River drift via `RIVER-LAUNCH`/`GO-NEXT` — is not being reached. That blocks the entire
river leg, so the oracle stalls at 173/350; it is an object-behaviour gap, exactly the class the v0.15.3
handoff flagged. The committed completion test (`full-run.ts` → asserting `game-over{victory}` + 350)
is still deferred until the engine actually reaches the barrow.

---

## v0.15.4 — 2026-07-21 — 30-backdrop art pass: full-game backdrop coverage (stage 5.5, task 3)

**Date:** 2026-07-21

Backdrop scarcity — the presentation constraint on stage 5.5 — is resolved. The MVP shipped three
backdrops against 110 rooms, so ~89 rooms drew as one generic interior. The post-MVP art pass
(`docs/backdrop-generation-plan.md`) generated 30 backdrops in the Woodring hatch idiom, and every
room now draws one that fits it.

### Changes

- **Assets: 30 generated backdrops** committed as `reference/backdrops/bmp/NN-*.bmp` (source PNGs
  alongside). Cropped ~260–313 px, neither square nor 512 — the renderer cover-fits, so the few-px
  stretch is invisible and was deliberately left uncorrected.
- **`art/src/image.ts` — decoder extended to read modern BMPs.** The generated files are macOS
  `sips`/Preview output: 124-byte `BITMAPV4HEADER`, several 32-bit `BI_BITFIELDS`. `decodeImage`
  previously required the 40-byte `BITMAPINFOHEADER` and handled 1/2/4/8/24 bpp only, so every file
  threw `unsupported DIB header 124`. Now accepts 40/108/124-byte headers (V4/V5 extra fields skipped
  — pixel data is located by `bfOffBits`) and decodes 32-bit BGRA in `unpackRows` (alpha ignored;
  backdrops are opaque). There is no palette-code path for these, so the masked-mono polarity class of
  bug cannot recur here. The AVB corpus (40-byte DIBs) is unaffected — 16 art tests still green.
- **`art/package.json` — `pack` script updated 3 → 30 `--backdrop` args**, sourced from
  `../reference/backdrops/bmp/NN-*.bmp` with ids stripped from filenames. `npm --prefix art run pack`
  rebuilds `web/assets/comic/`: 32 PNGs (30 backdrops + hero + guide), `cast.json` lists all 30.
- **`web/src/comic/backdrop.ts` — full-game assignment.** `BackdropId` union extended from 3 to the
  30-id set. `OUTDOORS` / `OUTDOOR_BACKDROPS` renamed to a single exported `ROOM_BACKDROPS` map (the
  table no longer holds only outdoor rooms). It now assigns **all 110 rooms** by id — maze→`maze`,
  reservoir→`reservoir`, Entrance to Hades→`hades-entrance`, the coal-mine shaft→`timber-room`, and so
  on. `room` remains the fallback for any unlisted id (`backdropFor` stays total) but does not fire
  for Zork 1. `comic-view.ts`'s `backdropFor(panel.room)` call is unchanged.
- **Backdrop sources are local-only; the polarity test asserts on the shipped bundle.** The BMP/PNG
  originals live under `reference/backdrops/`, which is **gitignored** (that tree is documented as
  "third-party reference material, never vendored"; the first-party art landed there by convenience
  and stays local). So the committed artifact is `web/assets/comic/*.png`, and to keep the test
  runnable on a clean clone it reads *those* — decoded by a new **`decodePng` in `art/src/png.ts`**
  (RGBA8/RGB/greyscale, all five scanline filters, node `zlib`, symmetric with the existing
  `encodePng`) — via the ids/files in `cast.json`, not the ignored sources. Regenerating or re-cropping
  backdrops therefore needs the local sources plus `npm --prefix art run pack`.
- **Tests.** `web/test/backdrop.test.ts` updated for the rename and the reassignments
  (Kitchen/Living Room→`house-interior`, Attic→`attic`, Cellar→`cellar`, Maze→`maze`,
  Hades→`hades-entrance`), and a new assertion that **every** world room is assigned — nothing falls
  through silently. `art/test/polarity.test.ts` gains a backdrop block: all 30 shipped PNGs must decode
  non-degenerate (both ink and paper present — catches a solid fill, a blank, a failed decode, or a
  full inversion), and four extremes are pinned to the polarity a reader can confirm (temple,
  round-room paper-dominant; hades-entrance, barrow-interior ink-dominant). Per-image ink fractions
  are deliberately **not** pinned — they span 13–72% by design (Hades and the barrow are meant to be
  dark), the "ink is a minority" trap this file already warns against.
- **Green:** web backdrop 6/6, art suite 21 (polarity 8, corpus 13). Two failures predate this work
  and are unrelated (confirmed by stashing on clean HEAD): `web/test/portrait.test.ts` tsc `dw/dh
  possibly undefined`, and `web/test/mapper.test.ts` shot-ranking.

### Status

**Stage 5.5 ◐.** Presentation coverage (task 3) for backdrops is complete; the remaining 5.5 blocker
is unchanged and lives in the **engine** — the room `M-END` end-of-turn action that gates the
exorcism's completion (see v0.15.3 and Next Actions task 0). Backdrop polish still open but not
blocking: `render.ts` cover-fits to a hardcoded 315×315 square, so non-square crops stretch a few px.

---

## v0.15.3 — 2026-07-21 — Exorcism IR fix: stale room reference resolved (stage 5.5)

**Date:** 2026-07-21

### Changes

- **`ir/src/extract-behavior.ts` + `ir/src/extract-world.ts`:** a `,NAME` value reference that names
  a room's ACTION routine and resolves to nothing else now lowers to that **room entity**, not to a
  bare name string. Zork I renamed the room `LLD-ROOM → ENTRANCE-TO-HADES` (1dungeon.zil) but left
  `,LLD-ROOM` in `BELL-F`'s `<EQUAL? ,HERE ,LLD-ROOM>` (1actions.zil) and kept the action routine's
  name; Release 119 — the golden's game — still named the room `LLD-ROOM`, so the exorcism's compare
  fired there. `extract-world.ts` builds `roomByActionRoutine` from each room's `action` (only
  *unambiguous* ones — a routine shared by several rooms, e.g. `FOREST-ROOM`, is excluded, as is one
  whose name is itself a live entity id); `resolveName` consults it just before the routine-atom
  fallback, so it is **fail-closed** — only otherwise-dangling names are rewritten. The prior code
  had deliberately encoded this as an always-false "original-game quirk"; that reading was wrong.
- **`ir/artifacts/zork1.world.json` regenerated.** `BELL-F` now compares `HERE` against
  `entity ENTRANCE-TO-HADES`; the `LLD-ROOM` routine stays extracted (reachable via the room's
  `action` entry ref). Extraction still validates: 110 rooms, 137 objects, 360 routines.
- **Effect (measured, `engine/harness/full-run.ts`):** ringing the bell at Entrance to Hades now
  fires the exorcism's `M-BEG` branch — the bell goes red-hot and `XB` sets — instead of the old
  always-false "Ding, dong." The ceremony proceeds correctly through lighting the candles and reading
  the book. It does **not** yet complete: `XC` (set by the room's `M-END` action, gated on `XB` +
  lit candles) never becomes true, because the engine does not run a room's `M-END` action at end of
  turn — so `LLD-FLAG` is never set and the gate stays barred. That is the newly-surfaced **engine**
  gap (turn-loop, gmain.zil:154 `PERFORM → room M-END → CLOCKER`), a different subsystem.
- **Tests:** `ir/test/behavior-35-triage.test.ts` rewritten to pin the corrected resolution (was
  pinning the always-false quirk). 193 IR tests pass; 129 engine tests pass; **replay 143/143 strict
  (100%)** — parity unbroken.

### Status

**Stage 5.5 ◐.** The IR/extractor blocker is cleared and the exorcism now *starts*. The full game is
still not winnable in the engine: the next gap is the room `M-END` end-of-turn action (blocks the
exorcism's completion and any other room whose behavior depends on `M-END`). Not milestone-complete.

---

## v0.15.2 — Engine driven West of House → the temple; first victory path (stage 5.5)

**Date:** 2026-07-21

### Changes

- **`engine/src/game-actions.ts` (new):** a quarantined home for game-specific action routines the
  extractor catalogued but cannot mechanically translate — ADR 0002 keeps `builtins.ts`
  game-agnostic, and combat is *extracted*, so no such home existed. Registered into `ctx.builtins`
  from `createEngine`; a routine the world document defines still wins. Holds:
  - **`STONE-BARROW-FCN`** — the engine's **first victory path**. `ctx.finished.outcome` typed
    `"victory"` but nothing set it (the `FINISH` builtin defaults to death); this sets it on
    `M_BEG` + ENTER / WALK-west / IN, printing the "mastered the first part of the ZORK trilogy" win.
  - **`LOUD-ROOM-FCN`** — the Loud Room. `M_LOOK` description (deafening vs. eerie on `LOUD-FLAG` /
    `GATES-OPEN` / `LOW-TIDE`); verb `ECHO` sets `LOUD-FLAG` and clears `SACREDBIT` on the platinum
    `BAR`. The modal "commands lost in the noise" read-loop and the roaring-state ejection are
    deliberately not ported (off-route parser-buffer mechanics), noted at the call site.
- **`engine.ts`:** a bare direction now runs the current room's `M_BEG` action before travelling, so
  a room can intercept the move — this is how the Stone Barrow wins on `w`. ZIL runs the room action
  for every command including walk; the engine's shortcut had skipped it. 143/143 strict held.
- **`engine/src/scope.ts` (`originAllowed`):** ZIL's `GET-OBJECT` always searches the player
  (gparser.zil:1078); the syntax's location options scope only the *room* search. So a held object,
  or one inside an open container you hold, is always referable — `TAKE SCEPTRE` now finds the
  sceptre in the coffin in your hands. `TAKE ALL` still honours the bits (P-ALL keeps them), so it
  does not re-take what you already hold. Corrected a parser test that encoded the old wrong "can't
  see a held object" behaviour.
- **Completion oracles are now a distinct artifact class.** `12-full-game.cmd` carries
  `# oracle: completion`; `golden.ts`/`replay.ts` surface `oracle`, and `transcript.test.ts` excludes
  oracles from the strict-turn ratio (a 405-turn oracle would otherwise swamp the parity corpus —
  it is verified by *reaching the win*, not turn-parity).
- Tests: `engine/test/game-actions.test.ts` (echo puzzle, barrow victory, take-from-held-container).
  129 engine tests pass; replay 143/143 strict; `run-transcripts.sh` golden matches.

### Status

**Stage 5.5 ◐.** With combat handled resiliently (`engine/harness/full-run.ts`, diagnostic) the
engine now runs West of House → the temple: score 116 of 350, ~command 166 of 405. Next blocker is
an **IR/extractor** bug, not an engine one — the exorcism at Entrance to Hades never fires because
`BELL-F`'s extracted body references the room by its pre-rename name `LLD-ROOM` instead of
`ENTRANCE-TO-HADES` (the modernized source renamed the room but not the reference; Release 119, the
golden's game, still has the old name, so dfrotz works). Not a milestone-complete build — the engine
does not yet win the full game.

---

## v0.15.1 — Full-game completion oracle; engine gap measured (stage 5.5 started)

**Date:** 2026-07-21

### Changes

- **Authored the complete winning walkthrough** `verification/walkthroughs/12-full-game.cmd`:
  405 commands, West of House → Stone Barrow, all 19 treasures in the trophy case, **350/350,
  "Master Adventurer"** under dfrotz seed 1234 against the Release 119 reference build. Captured
  its golden `verification/golden/12-full-game.txt`. Both `run-transcripts.sh` (golden matches
  dfrotz) and the engine replay suite stay green; the walkthrough is `# parity: informational`
  (troll/thief combat and the thief relocating the ivory torch are random draws the engine's
  generator cannot match turn-for-turn — the documented stage-4.5 limitation, multiplied).
- Route was built incrementally against dfrotz as the oracle. Decisions worth keeping are in the
  `.cmd` header: lantern stays lit the whole game (LAMP-OFF disables the I-LANTERN timer, so the
  ~385 on-turn budget only drains while lit; 411 moves with the ends unlit clears it), the torch is
  a treasure not the light source (so the coal-gas room never detonates it), sharp objects puncture
  the boat (eat the lunch, carry the garlic, pocket screwdriver+sceptre in the sack), dig the sand
  exactly four times, drop the torch before the Gas Room.
- **Measured engine completion** with `engine/harness/full-run.ts` (diagnostic, not a committed
  test): replays the walkthrough through the engine with combat handled resiliently (attack until
  the villain leaves the room, re-arm on disarm), since the walkthrough's frotz-tuned hit-counts do
  not kill the villains under the engine's RNG. Finding: **of 117 action routines the world
  references, only 3 are undefined** — `LOUD-ROOM-FCN` (echo puzzle → platinum bar; throws today
  and desyncs everything after it), `STONE-BARROW-FCN` (the winning move; the engine has **no**
  victory path — `ctx.finished` types `"victory"` but nothing sets it), and `GRATE-FUNCTION`
  (off the Odysseus route). The first two block completion and are the immediate 5.5 work.

### Status

**Stage 5.5 ◐.** Winning route proven end-to-end in dfrotz; the engine runs opening → troll → maze
→ painting → dam and is blocked by exactly two missing native routines, both fully scoped in
HANDOFF (mechanism: register beside the existing `ctx.builtins` specials). Presentation coverage
(backdrops/art/layout over the full run) not yet started. Not a milestone-complete build — the
engine does not yet win.

---

## v0.15.0 — Stage 5.4 complete: panel sequencing and character portraits

**Date:** 2026-07-21

Closes the two items 5.4 had left. `web/src/comic/layout.ts` sequences the panel stream into a
grid; `web/src/comic/portrait.ts` and a cast bar in the comic pane put the strip's two characters
on screen. Both are pure and canvas-free above the draw call, so both are tested in Node.

### Sequencing is a port, and the surprise is what it does not do

`CUnitPanelPage` (`original-projects/comic-chat/v2.5-beta-1/panel.cpp`) lays panels out as a
**uniform grid**. Every panel is exactly `m_unitWidth` wide (`:669`, `:1023`); the cell is
`index % panelsPerRow` across and `index / panelsPerRow` down (`:1016`); the column count is
derived from available space rather than stored (`:1456`).

**Comic Chat never varies panel width by shot.** The comic-book instinct — a wide establishing
panel, a narrow reaction beat — is exactly what the original does not do, and adopting it would
have let ADR 0004 §7's camera ladder decide layout as well as framing. The rungs stay a framing
decision in `render.ts`; `layout.ts` only flows. That is the whole reason the item was cheap:
reading the source replaced a design argument with a citation.

Leftover width has two behaviours and both are principled. Below the cap panels **stretch** to
fill the row — §4a's "the constant becomes a parameter", already what 5.3 did per panel. At the
cap (1.6× native) they stop growing and the row is **centred**, which is what `PreparePrintDC`
does with its own leftover (`:1471`). So the wide viewport lands back on the original's behaviour
rather than away from it. Columns are capped at Comic Chat's own `m_panelsPerRow = 2` (`:56`),
kept as a ceiling and not as the answer: the original laid out a finished transcript, where more
columns is just more comic, while this strip is live and a wide grid trades the newest panel —
the thing the reader is looking for — against panels already read.

**A real bug in the source, not reproduced.** `:1456` computes `panelsWide` with `m_vInterstice`
in the numerator against `m_hInterstice` in the denominator, where the `panelsHigh` line directly
above it uses `m_hInterstice` for both. It never fires in Comic Chat because both interstices
hold the same value. Reproducing a typo that never fired would be transcription, not porting;
`columnsFor` takes one gutter and the divergence is documented at the call site.

The gutter moved from CSS into script (`STRIP_GUTTER`). 5.3's scroll bug was a `0.6rem` gap the
pinning arithmetic could not see, and sequencing now needs the same number in the grid's `gap`
and in `layoutStrip`'s column arithmetic — one constant, and the stylesheet does not set it.

### Portraits are not a port, and that is recorded rather than glossed

Comic Chat has the feature: the member list draws avatar icons when `m_bIconMembers` is set
(`memblst.cpp:391`), keyed by `CAvatar::m_iconIndex`. In the shipped v2.5 source that field is
assigned exactly once — to `-1`, in the constructor (`avatar.cpp:896`) — and nothing populates it
or the image list behind it. There is no source site, so the crop rule is ours and is documented
as a decision.

The rule: **a portrait is the avatar's neutral face, alone.** Face rather than figure, because a
portrait answers "who is this" and a whole figure at nick-list size is a 20-pixel person — and
the face is already a separately packed sub-rect, so the crop is free. Neutral rather than the
panel's emotion, because the tempting version is wrong twice: a roster would flicker once per
turn, and ADR 0004 §9 gives the emotion to the *panel*, which is the thing that has a turn. Both
paths resolve through `pose.ts`'s own `firstNeutral`, so the bar shows the same drawing a NEUTRAL
panel would — which is what makes it read as *this character* rather than as second art of them.

The bar is labelled by role, not by avatar name: the manifest knows the Hero is dan and the Guide
is tiki (§11) and neither is a character name — they are the names of drawings, cast for pose
inventory. The Guide's identity is still open and the ADR's one standing instruction is not to
call them "Narrator", so the bar says what each one is and leaves naming to whoever settles it.
The avatar sits in a `title` attribute, reachable when a portrait looks wrong and noise otherwise.

### Tests

22 new web tests; 89 web, 468 across all five packages, parity unchanged.

Nothing asserts that a layout came back. The standing failure mode here is a **total function
with a wrong answer** — 5.3's backdrop stub always returned *a* backdrop — so every assertion
names its number: the column count at 809px and at 810px (the boundary is the whole content of
the ported expression), the panel width that follows, the cell an index lands in.

**Verified by mutation, per the standing rule.** Dropping the `Math.max(1, …)` column clamp fails
the narrow-pane test; turning the portrait's letterbox `min` into `max` fails both orientation
tests. The third assertion — "the drawn aspect is the source aspect" — did **not** catch that
second mutation, because a cover-crop preserves aspect while overflowing the box. It catches an
independent-axis stretch only, and its comment now says so rather than claiming the credit.

The NEUTRAL assertion checks angle **and** intensity, spelled out rather than borrowed from
`pose.ts`'s private `isNeutral`: §11 records that HAPPY and NEUTRAL share angle 0 and separate
only by intensity, so an angle check alone would accept a smiling portrait — and a test that
reuses the implementation's own predicate asserts only that the code agrees with itself.

### Driven, not inferred

Playwright over the running page, which is where everything real in this milestone has been
found. Six turns played: two columns at 1600px (453.4px tracks, 10px gutter, no overflow), one
column at 390px (344.8px, no horizontal overflow on the strip or the body), the cap holding at
640px on the stacked mid-width layout, the strip still pinned to the newest panel across all
three, and a reload replaying seven panels back into the grid with the cast bar intact and zero
console errors. Portrait pixels were read back off the canvas and carry both dark ink and light
fill — though note the polarity argument here is that portraits crop the *same sheet* the figures
draw from and so make no new colour decision; an ink-ratio assertion would be exactly the "art
statistics are not invariants" mistake `art/test/polarity.test.ts` already caught once.

### Status

**Stage 5.4 ✅.** The opening area is playable in comic form — its exit criterion. Panel
sequencing, portraits, backdrop assignment, persistence and narration styling all done. 5.5 next,
where backdrop scarcity is the live constraint.

---

## v0.14.1 — 2026-07-21 — Stage 5.4 (part 2): narration styling, and the title that was never sent

The transcript rendered a room's name and its description as one undifferentiated block. The
`room-title` channel had existed in the contract since ADR 0002 and `.line.room-title` had
existed in `style.css` since 5.2, and nothing had ever produced an event on it — dead CSS behind
a dead channel, in exactly the shape this project keeps producing.

### The premise that was wrong

The issue had been recorded twice, both times as unfixable-without-violating-ADR-0002: Zork's own
`DESCRIBE-ROOM` prints the room name with `<TELL D ,HERE>`, so the name arrives inside a prose
run, and separating it back out would mean matching narration text — which is precisely what
channels exist to avoid.

That conflates two different things. The *shell* cannot tell which line is a title without
parsing. The *engine* does not have to: it is executing the `TELL` and knows what is in it. The
fix names the title structurally, at the point of printing, and no consumer parses anything.

`RuntimeContext.titleRoom` holds the room whose name, if `DESCRIBE-ROOM` prints it with `D`,
opens the title line. `execTellPart` sees a `name` part resolving to that room, closes any prose
run, and switches the channel; the run closes again on the CRLF — *after* the optional
`", in the <vehicle>"`, because that is where ZIL ends the line, not after the name.

### Scoped to the routine, not to the call site

The first draft set the hint in `builtins.ts`, around the engine's `DESCRIBE-ROOM` call. It
titled rooms the player walked into and left `LOOK` untitled: the game's own `V-LOOK` calls
`DESCRIBE-ROOM` directly and never passes through the engine's `describeRoom` at all. The hint
moved into `runRoutine`, keyed to the routine's id and restored in `finally` alongside the depth
counter, which covers both entry points and confines it to the one routine whose `TELL D ,HERE`
is a title. The regression test drives both paths, in a room that is not the starting one.

### Why parity did not move

Golden-transcript parity is measured on `transcriptText`, the concatenated player-visible text of
a turn, across channels. Splitting one narration event into two therefore changes nothing the
harness compares — provided no character moves, which is why the title run closes on the newline
rather than on the name. 143/143 strict turns unchanged, 22 transcript tests green. A test pins
the byte-level join (`West of House\nYou are standing…`) so a future channel split cannot quietly
drop the separator.

### The web side needed no change

`console-view.ts` already mapped `channel → className`. The engine fix made the existing CSS
live with no shell edit at all — the seam working as designed. Confirmed on the running page with
Playwright, not inferred from the suite: the room name renders as its own `line room-title`
element, white and bold, on arrival, on `LOOK`, and after a reload replays the session.

Two stale claims were corrected while here: `system` is *not* unemitted (`engine.ts` emits it at
ten call sites for parser errors), and `web/src/status.ts` keeps resolving room names by id on
purpose rather than as a workaround — `restore()` describes no room, so a status line folded from
title events would blank on restore.

### Tests

123 engine tests (was 120; +3 for the title), 67 web tests, parity unchanged at 143/143 strict.

### Status

**Stage 5.4 in progress.** Backdrop assignment, persistence and narration styling done; panel
sequencing and portraits remain.

---

## v0.14.0 — 2026-07-21 — Stage 5.4 (part 1): backdrop assignment and session persistence

Two units of stage 5.4, plus three shell defects found by driving the running site with
Playwright rather than by reading it.

### Visual defects, found by looking

The session opened by hunting visual glitches in the browser. Three were real, and each had
been invisible to a passing suite:

- **The transcript lost its scroll position on resize.** `scrollToEnd()` ran only on append, so
  a viewport change re-flowed the pane and left the newest narration off-screen until the next
  command — at 390px the status line read "Behind House, Moves: 5" above the opening room
  description. Fixed with a `ResizeObserver`.
- **The comic strip did the same thing, worse**, because its `ResizeObserver` already existed and
  only redrew: a redraw re-heights every panel, so the held scroll position drifted **99px** off
  the bottom and clipped the newest panel.
- **`scrollIntoView({ block: "end" })` aligns to the container's *content* edge**, which stops
  short of the strip's own `padding-bottom`. The newest panel sat flush against the pane while
  every earlier panel kept its 9.6px gap. Scrolling the strip itself fixes it.

Both panes now track a `pinned` flag from their own scroll events, so a reader who has scrolled
back into history is not yanked forward by a resize.

### Room → backdrop is a table, not a regex

The 5.3 stub tested `/…|HOUSE|…/` **before** `/^(WEST|NORTH|SOUTH|EAST)-OF-HOUSE$/`, so all four
house rooms took the first branch and **the `field` backdrop never drew**. `UP-A-TREE` matched
nothing and rendered as a cellar interior. Neither could fail a test, because the stub always
returned *some* backdrop — the same shape as the v0.13.1 polarity bug, where the right structure
hid the wrong content.

`web/src/comic/backdrop.ts` replaces it with an explicit table, **inverted on purpose**: it names
the 18 outdoor rooms and everything else falls through to `room`, because Zork is mostly indoors,
so a room missing from the table gets a plausible backdrop rather than a wrong one. All 18 ids are
asserted present in `zork1.world.json`, so a typo is a test failure rather than a silent interior.

**Verified by reverting to the stub** (the standing rule): 3 of the 6 tests fail, including the
exact `expected 'pastoral' to be 'field'`.

### Backdrop scarcity ✅ decided — and it was never 5.4's constraint

HANDOFF called three backdrops for 110 rooms the binding constraint on 5.4. Measured, it is not:
the opening area is **12 outdoor rooms plus the house interiors**, which the three shipped
backdrops cover. Scarcity gates **5.5**, not 5.4.

**Decision: ship the three for the MVP, revisit with AI-generated backdrops after.** The live risk
is not the count but `room8bs.bmp`'s *content* — it is a conservatory (glass dome, planter,
topiary), honest for Kitchen and wrong for the ~89 rooms that are cellar, maze and temple.

### Persistence: the turn history is what gets saved

A reload lost the game entirely; `save`/`restore` existed but wrote state only, and
`Engine.restore` emits no events by design — so a state-only resume returns a correct world and
two empty panes.

`web/src/persistence.ts` persists **`Turn[]`**, not rendered output. Resume replays the same
`play()` the live game uses, so both panes rebuild through the code path they already have, and a
renderer change applies retroactively to saved games instead of conflicting with them. The strip
reproduces exactly: panels are a pure function of the turn sequence and the pose round-robin is
deterministic when replayed from the start.

**`mix` is not persisted, and that was a bug first.** `EventMix.counts` is a `Map`;
`JSON.stringify` writes a `Map` as `{}`, silently, with nothing failing until a resumed turn
reached the inspector and called `.get` on a plain object. Found by reloading the page — the suite
was green. `mix` is a fold over `events`, so `read()` recomputes it through a fresh tracker.

Autosave stops at the first refusal rather than throwing once per turn, and reports why once.
Every unreadable payload resolves to "no saved game" **and clears the slot**: an autosave that
throws on boot would make the game unstartable with no in-game way to recover.

### State at the milestone

- `web/`: **67 tests** (was 50) — `backdrop.test.ts` 6, `persistence.test.ts` 11.
- **Engine and IR untouched.** Parity unchanged at 143/143 strict turns, 155/161 overall.

### Status

**Stage 5.4 in progress.** Backdrop assignment and persistence done; panel sequencing, portraits
and narration styling remain. Narration styling is blocked on a contract question — see HANDOFF.

---

## v0.13.1 — 2026-07-21 — Masked-mono polarity: every figure was inverted

Reported from play, not from a test: the cast rendered as white linework on black
silhouettes. Real, whole-corpus, and one constant wide.

### The defect

`AIP_MASKEDMONO` packs two bits per pixel. `avbfile.h:93` documents them as

```
00 = blank    01 = aura    10 = black    11 = white
```

and `art/src/raster.ts` implemented that faithfully. **The header comment is wrong.**
`CPose::ConvertMasksCommon` (`avbfile.cpp:1636`) is what actually ran: it splits the pair
into three 1bpp DIBs — image, mask, aura —

```
00 => 0,0,0    01 => 1,0,1    10 => 0,1,1    11 => 1,1,1
```

and gives every one of them the colour table `[white, black]`. In the image DIB, `10` → 0 →
white and `11` → 1 → black: the opposite of the header. The next line,
`pbDestBits[0] &= pbDestBits[1]`, forces the aura-only region white, which is why `01`
never carries ink.

So `MASKEDMONO_INK` was `2` and should have been `3`. Fixed, with `MASKEDMONO_PAPER = 2`
added so the coverage test reads as an enumeration of the two drawn codes rather than a
double negation of the two undrawn ones.

### Why 13 tests and a whole-corpus sweep missed it

The art suite asserted that every pose rasterizes to a **non-empty** figure that stays
**inside its canvas**. An inversion satisfies both perfectly — the geometry is pixel-exact
and only the polarity is wrong. Nothing in the module asserted colour at all. This is the
same trap as gotcha 3 one level down: *the right shape is what makes it easy to miss.*

`art/test/polarity.test.ts` (3 tests) now pins it:

- **the mapping, corpus-wide** — for every masked-mono part in all 191 files, a drawn pixel
  whose code is `10` must be white and `11` must be black;
- **dan and tiki specifically** — the two avatars the shell casts must have pale faces, with
  the centre sampled as a patch so one feature pixel cannot decide the test.

All three fail when the constants are reverted; that was checked, not assumed.

### The measurement that corrected the test

The first draft of the corpus assertion said *ink is a minority of the drawn area* —
plausible for line art, and **false**. It flagged anna at 78–80% ink. Rendering her showed
the art is correct: a black bob legitimately fills most of the face's bounding box. Had the
ratio been trusted, a character who was never broken would have been "fixed".

**Art statistics are not invariants; the code table is.** The assertion was rewritten to pin
the pixel-code → colour mapping, which needs no assumption about any drawing. Noted here
because it is the standing method note (*measure before proposing rules*) applying to a
test rather than to a grammar rule.

### Also

- `docs/AVB_FORMAT.md` gotcha 3 repeated the header's claim verbatim; corrected, with the
  conversion table and the reason the inversion is invisible to a coverage test.
- Sprite sheets regenerated (`npm --prefix art run pack`).
- `web/tools/serve.ts` gained a `listen` error handler: `EADDRINUSE` printed a raw unhandled
  `'error'` stack trace *after* a successful build, which reads as a broken shell rather than
  a port already held by a previous `dev`.

### State at the milestone

- `art/`: **16 tests** (was 13). `web/` 50, engine 120, IR 193 — all unchanged.
- **Engine and IR untouched.** Parity unchanged at 143/143 strict turns, 155/161 overall.

### Status

**Stage 5.3 ✅ still; a defect in it fixed.** 5.4 remains next.

---

## v0.13.0 — 2026-07-20 — Stage 5.3: the comic renderer (⚑ Gate D)

**Zork I now draws itself as a comic.** Every turn produces a Comic Chat panel beside the
transcript: original `.avb` figures composited face-onto-torso, Woodring balloons, the ADR 0004
§7 camera ladder and §10 affect table, over the three shipped backdrops. Both panes of the §4
shell exist for the first time, reading one event stream.

### What was built

- **`web/src/comic/mapper.ts` — events → panels.** A pure function of the ADR 0002 stream, holding
  only per-session memory (visited rooms, the player's room and inventory), all derived from the
  stream rather than read from the engine. That is what makes it testable by replaying
  walkthroughs, the parity harness's own oracle.
- **`web/src/comic/affect.ts`** — §10's marker table, quarantining the one place ADR 0004
  knowingly accepts prose matching.
- **`web/src/comic/figure.ts`, `balloon.ts`, `render.ts`** — pose selection and the join against a
  sprite sheet; the three Woodring classes with `AddLine`'s balanced wrap; camera presets as
  framing evaluated at the current panel width.
- **`art/src/pack.ts` + `tools/avbpack.ts`** — the cast bundle. `art/src/bmp.ts` brings the three
  shipped backdrops in; `art/src/cast-manifest.ts` is the types-only leaf that keeps the browser
  clean.
- The inspector moved inside the console pane as a collapsed `<details>`; the comic took the
  primary slot. Verified in a real browser at 390×844: both panes visible, no horizontal scroll.

### The asset decision (⚑ Gate D)

**The browser runs the selector, never the decoder.** `art/` decodes at build time and emits one
sprite sheet per avatar plus a manifest; the shell imports `format.ts` and `pose.ts` as source —
the emotion wheel, pure arithmetic — and loads PNGs for everything else. The whole cast plus three
backdrops is **five requests, ~330 KiB**.

- **Parts are packed, not figures**: dan's 187 figures are 28 drawings, so the join happens in the
  browser. Baking figures would multiply the payload by an order of magnitude for identical pixels
  *and* freeze the join that §8's round-robin exists to keep re-pairing.
- **A figure and its aura are separate sub-rects** — correctness, not size: both halos precede
  either figure, so a flattened part has the second blit biting a halo-shaped hole in the first.
- **No bundler was needed.** 5.2 recorded that 5.3 would be the evidence test for adding one. It
  was, and the answer was no: canvas plus static assets has nothing to bundle.
- `pose.ts`'s selectors became generic over `{ angle, intensity }` so the shell can run the real
  wheel over manifest entries instead of forking it. No behaviour change; `art`'s 13 tests pass.

### Two ADR amendments, both from building it rather than reading it

- **§10: `parser-miss` fires on the `narration:system` channel.** Every refusal the *engine*
  issues goes out on that channel — which is what ADR 0002 put it there for — and one of them,
  `I don't know the word "…"`, interpolates the word and matched none of the four listed patterns.
  The commonest refusal in real play was drawing a *neutral* Hero. Measured over all 11
  walkthroughs the distribution is unchanged, so this is robustness at no cost to the numbers.
- **§11: the Hero needs a BORED face, not only a SHRUG torso.** `parser-miss` emits both, and the
  inventories are nearly disjoint: of the five SHRUG owners only dan and lance own a BORED face.
  It fails silently — the wheel is nearest-neighbour, so susan renders fine but lands on COY, and
  the comic's most common beat reads as the Hero being coy at the parser rather than exasperated.
  **Cast settled: Hero = dan, Guide = tiki**, which also dissolves §11's "they intersect only at
  susan" problem, since dan is not on the Guide shortlist at all.

Also corrected while implementing: `routine-ack` must anchor to the whole turn, not per line —
applied per line it measurably overtakes `parser-miss` as the largest marker, because any turn
*containing* a bare "Taken." claims it.

### Independent confirmation of the ADR's own measurements

The mapper replayed over all 11 walkthroughs (200 panels — 189 turns plus each walkthrough's
opening) reproduces §7's distribution closely: **medium 49.5% · establishing 30.5% · close-up
12.0% · reaction 5.5% · wide 2.5%**, against the ADR's 52.4 / 26.5 / 12.7 / 5.8 / 2.6. Affectless
turns land at 46.5% against the predicted 51%. The ADR's tables were derived from a separate
measurement pass; that an independent implementation lands on the same numbers is the strongest
evidence available that §7 and §10 describe the event stream rather than a spreadsheet.

### Conventions worth keeping

- **The comic pane has no engine handle.** `main.ts` hands one `Turn` to both panes; §2's
  "accompanied, never replaced" is a property of the wiring, not something to keep in sync.
- **The join is implemented twice on purpose** — once against pixels (`art/src/composite.ts`),
  once against sheet sub-rects (`web/src/comic/figure.ts`) — because merging them would drag
  `node:zlib` into the browser. `web/test/figure.test.ts` runs both over the real cast and asserts
  they agree pose for pose. That test is the only thing making the duplication acceptable.
- **A type-only import is erased at emit but not at type-check.** Importing the manifest types
  from a module that itself imports the decoder put `node:zlib` in the browser program. Hence a
  types-only leaf. If `dist/art/src/` grows past `format.js`, `pose.js` and `cast-manifest.js`,
  the line has been crossed.
- **Resize re-renders; it never rescales.** Panel width is a Layout Manager input (§4a), so
  balloon breaks are a function of it — and the pose round-robin is frozen per panel, or scrolling
  back would show a different comic than the one the player read.
- **The Guide is on stage exactly when it speaks**, whatever the camera rung. A Guide balloon over
  an empty stage is a speech balloon with no speaker — the misattribution §2a spent three
  paragraphs avoiding.
- **Assert orderings, never the measured percentages** (§10 says so): the corpus is
  opening-heavy, and every frequency in it would shift under real play.

### State at the milestone

- `web/`: 11 source modules, **50 tests** (was 12). `art/`: 3 new modules, 1 new tool, 13 tests
  unchanged. New committed artifact `web/assets/comic/` — regenerate with `npm --prefix art run pack`.
- **Engine and IR untouched.** 120 engine tests, IR 193; parity unchanged at 143/143 strict turns
  and 155/161 overall. Removing the comic layer entirely leaves engine behaviour bit-identical,
  which is ADR 0004 §3 stated as a testable constraint.

### Status

**Stage 5.3 ✅ — ⚑ Gate D cleared.** 5.4 and 5.5 can now be planned in detail.

---

## v0.12.0 — Browser Shell (Milestone 5, stage 5.2)

**Date:** 2026-07-20

Zork I is playable in a browser. New package `web/` — the first consumer of the ADR 0002 event
contract written *outside* the engine, which was the point of the stage: everything to date had
consumed the stream from the transcript harness, written alongside it and sharing its assumptions.

### The three findings

The contract survived contact, but three things only become visible from outside. None needs a
contract change; all three need a consumer to know them, so each is pinned by a test in
`web/test/status.test.ts` rather than left as prose.

1. **`room-title` never arrives.** The standing `HANDOFF.md` open issue, confirmed from the
   consumer side: room description is delegated to Zork's `DESCRIBE-ROOM`, which prints the name
   inside a `prose` line, and ADR 0002 forbids parsing prose. The status line looks the name up in
   the world document by room id. An id missing from the table renders as the id — a visible bug
   report rather than a blank bar. This is exactly the workaround ADR 0004 §4 anticipated when it
   kept the channel in the contract for the console status line.
2. **`start()` emits no `player-moved`.** The opening turn reports the player's placement as an
   `object-moved` of `ADVENTURER` whose `from` and `to` are both `WEST-OF-HOUSE`. A shell watching
   `player-moved` alone shows an empty status line until the player first walks. Watching the
   player's own `object-moved` covers both cases — and must be scoped to the player, because the
   thief's wander daemon emits roughly one `object-moved` per turn and a looser rule puts the
   status line in the thief's room.
3. **`restore()` emits no events.** UI state *derived* from the stream has nothing to fold, so it
   has to be rebuilt from `SaveState` — which carries `locations` and `globals.SCORE` for the
   purpose. Found by building save/restore, not by reading the contract.

### The shell

- **The console pane is ADR 0004 §4's terminal**, built subordinate-from-the-start so 5.3 adds a
  comic pane rather than triggering a rewrite. Infocom status line (room, score, moves), transcript,
  prompt. `save`/`restore` are shell commands to `localStorage`, not game verbs — ZIL's SAVE/RESTORE
  are interpreter commands and this shell is the interpreter. A save whose contract *major* differs
  is refused rather than half-applied.
- **An event inspector beside it**, showing the running mix and the last turn's raw events. This is
  the stage's second deliverable and the reason it is worth more than a text concatenator: the
  console renders four event types and drops three, and the three it drops are what 5.3 renders. The
  mix seeds every contract type at zero so `speech: 0` is a visible row, not a missing one.
- **`src/session.ts` holds the engine and the derived state with no DOM**, which is what 5.3's comic
  pane will consume. Both panes reading one stream is what makes ADR 0004 §2's "narration is
  accompanied, never replaced" cheap instead of a synchronization problem.
- **§4a verified in a real browser**, not asserted: at 390×844 both panes stay on screen and the
  page does not scroll horizontally.

### No bundler, and no new dependencies

`tsc` alone emits browser-native ES modules. It works because the engine has zero runtime
dependencies and imports the IR for **types only** (ADR 0002) — nothing survives into the emitted
JS — and because every internal import already carries a `.js` extension. `tools/serve.ts` is
`node:http` and nothing else, mounting `ir/artifacts/` at `/world/` so the page fetches the same
1.8 MB world document the parity harness replays rather than a copy that can drift.

A shell that needed a toolchain to demonstrate the contract is consumable would have weakened the
claim it exists to make. If 5.3 needs asset pipelines or code splitting, that is the evidence to
add one on.

### Conventions established for the presentation layer

- **Style by channel, never by parsing text.** There is no regex over narration anywhere in `web/`,
  and adding one is the failure mode ADR 0002 §2 exists to prevent.
- **`textContent`, never `innerHTML`.** The transcript is the one place a world document could
  inject markup into the page.
- **Render `speech` even though the engine emits none.** ADR 0004 §Context measured zero across all
  11 walkthroughs; a shell that silently dropped the type is how an engine-side change would go
  unnoticed here. `web/test/session.test.ts` asserts the zero, so if the premise ever changes the
  ADR hears about it.

### State at the milestone

- New package `web/` (0.1.0): 6 source modules, 12 tests, its own `graphify-out/` (76 nodes,
  120 edges, 8 communities).
- **Engine, IR and art untouched.** 120 engine tests, IR 193, art 13; parity unchanged at
  143/143 strict turns and 155/161 overall.

### Status

**Stage 5.2 ✅.** Stage 5.3 — the comic renderer POC, ⚑ Gate D — is next, and is unblocked on both
design (ADR 0004 Accepted) and plumbing (this shell).

---

## v0.11.0 — 2026-07-20 — Panel grammar settled: ADR 0004 accepted

Design only. No engine, IR or art code changed; the deliverable is a decision record that unblocks
stage 5.3. Two working sessions, both measurement-led: `docs/panel-grammar-discussion.md` grew from
413 to 949 lines and produced `docs/adr/0004-presentation-mapping.md` (195 lines, Accepted, three
same-day amendments).

### The question 5.1 could not answer

Stage 5.1 ported Comic Chat's asset and layout algorithms and found they solve only half the
problem. Comic Chat rendered a chat: several humans typing, emotion parsed from each speaker's own
words, composition parameterized on who addresses whom. Zork is one player and a narrator, and the
player types imperatives at a parser. The historical code says how to lay out balloons; it never
says who is in the panel, what they feel, or where the camera is.

### Answered by measurement, not reasoning

- **The composition algorithm is recoverable but degenerate at cast size 2.** `EvalPair` placement
  collapses to a constant — Hero left, Guide right, permanently — and `LayoutAvatars` zoom never
  leaves 1.0. Those are precisely the parts parameterized on the social graph Zork never populates.
  Ported faithfully they produce no variation at all. `AddLine` still works.
- **Panel budget is derived, not chosen: ~1 panel/turn**, ~189 per playthrough, from `AddLine`'s
  one-balloon-per-character rule against the three-channel panel. This also bounded the PDF export
  question that had been carried as an open worry.
- **A six-rung camera ladder over a salience filter.** The filter is load-bearing: only **31 of 187
  `object-moved` (16.6%)** involve the player, their inventory or their room. Unfiltered, the most
  common shot in the finished comic would be a close-up on a thief the player cannot see.
  Measured distribution — medium 52.4%, establishing 26.5%, close-up 12.7%, reaction 5.8%, wide 2.6%.
- **A ten-marker affect table**, emitted as a weighted `CEmotionOpts` set so a marker outranked on
  the face can still claim the torso.

### Three findings that changed the design

**The Hero's most common emotion is exasperation at the parser** — `parser-miss` is the largest
single marker at 12.7%, and nothing outranks it in practice. Adopted deliberately rather than tuned
away: arguing with the parser is the 1977 experience.

**HAPPY and NEUTRAL share angle 0** on the emotion wheel, separated only by intensity. HAPPY *faces*
exist at graded intensities, but no avatar on the casting shortlist owns a HAPPY torso. Joy is a
face-only emotion in this corpus and no table tuning changes that.

**Only 5 of 18 complex avatars own a SHRUG torso** (dan, lance, mike, susan, tongtyed). Since
`parser-miss` is the largest marker and SHRUG is its natural gesture, pose inventory now constrains
casting. The Guide shortlist and the SHRUG list intersect only at susan, so both roles must be cast
together.

### Method: proposals that died on measurement

Five, across the two sessions, recorded in the discussion so they are not re-proposed:

- A naive `object-moved` close-up rule (fixed by the salience filter above).
- A `score-changed` "story beat" camera rung — all 14 scoring turns are also first-visits, so the
  establishing rung shadows it completely and it fires **0%** of the time. Survives only as an
  "emphatic" modifier.
- The premise that the art corpus was too thin for jitter — complex avatars carry **240–306**
  composited figures, so the default shot is oversupplied. Monotony was relocated to the *selector*
  (`nearestByAngle` is a deterministic argmax) and fixed by porting Comic Chat's tie-cycling.
- A drawer-based mobile console, reversed by the mockups (below).
- A speech balloon for the Hero, reversed on contract evidence (below).

The lesson is recorded in `HANDOFF.md`: measure against the replay and the corpus before committing
a rule. **Correction to the v0.10.0 entry above**, which is left unedited per the append-only rule:
the `object-moved` count is **187**, not 189 — the §10 event census is the accurate figure.

### Amendments the same day, both from outside review

**Responsiveness outranks retro fidelity (§4a).** Retro-*styled* but fluid. Panel width becomes a
Layout Manager parameter rather than a constant — the one place the 5.1 port stops being a
transcription. Measured mitigation: avatar parts run 236×296–385×355 and backdrops are 315×315, so
scaling is mostly *downward* and the cost is far lower than the discussion had assumed. Mobile keeps
both panes visible, reversing this ADR's own drawer proposal after AI-generated mockups made the
case that a visible transcript honours "narration accompanied, never replaced" better than a
gesture-hidden one. Optional dictation input is sanctioned to reclaim keyboard space, with the
constraint that it must never auto-submit — Zork's vocabulary defeats general recognizers, and a
misrecognition writes a wrong panel into a canonical stream.

**The Hero thinks; only the Guide speaks (§2a).** The ADR had fixed the Hero balloon's *content*
without fixing its *class*, and the natural reading — a speech balloon — was wrong three ways. A
speech balloon reading `open the door` makes the Hero appear to order the Guide, promoting the Guide
to an agent in the world and contradicting §3 at the layer a reader actually perceives. It also
asserts speech on every panel when the engine emits **0 `speech` events**; that figure had been
sitting in the §10 census, taken for camera rules and never read for balloon classes. `CBWoodringThink`
is shipped Comic Chat (`balloon.h`), so the fix is a port, not an invention.

### Assessed and not adopted

**cmx.js** (MIT, in `reference/`). Licensing is not the obstacle. Its figure model is procedural
vector stick figures posed by a 14-joint skeleton; ours composites pre-drawn bitmap faces onto
bitmap torsos from `.avb`, and there is no bridge. More decisively, it is an *authoring* tool that
renders a comic a human wrote by hand, and contains no composition logic at all — no camera, no
emotion, no layout decisions, which is the entire half of the problem this milestone exists to
solve. Comic Chat's C++ remains the better source because it *decides*.

**Assisted input** — a SCUMM-style command picker — is designed but deferred to after the MVP. The
data supports it cheaply (267 syntax rules, 137 objects with synonyms, `engine/src/scope.ts` already
computes scope), but two findings shape it: **Zork's 135-verb list is a spoiler table** (`ECHO`,
`ODYSSEUS`, `PRAY` *are* puzzle solutions, unlike Monkey Island's mundane nine), so it needs a fixed
core verb set with puzzle verbs typed-only; and it structurally removes `parser-miss`, the largest
affect marker, so it flattens the comic unless something replaces it. It also requires an ADR 0002
amendment — a read-only query API, pull rather than push, leaving the event stream at 1.0.0.

### State at the milestone

- `docs/adr/0004-presentation-mapping.md` — **Accepted**, 11 decisions, 3 amendments. Consumes the
  ADR 0002 contract without extending it.
- `docs/panel-grammar-discussion.md` — 949 lines, §1–§16. Now the reasoning record; the ADR is the
  decision of record.
- Engine, IR and art untouched: 11 walkthroughs, 143/143 strict, 120 engine tests, IR 193, art 13.

### Status

**Panel grammar ✅.** Stage 5.2 (minimal browser shell) is next by the plan, and 5.3 is now
unblocked on design.

---

## v0.10.0 — 2026-07-20 — Stage 5.1 complete: the art pipeline and the presentation analysis

Stage 5.1 was the standing exception in the session protocol — independent of every gate, usable
as filler. It had been partly started at v0.5.18, which solved `.avb` decoding and left three
things open. All three are now closed, and the analysis the stage was actually named for is
written.

### `art/` is a module now, not a POC

The Python decoder (`art/poc/avbdec.py`) stays as a reference; `art/src/` is the implementation,
TypeScript per ADR 0002. Seven modules: record stream, image decoding, plane rasterization, pose
selection, compositing, PNG output, and `inflate.ts` — the single platform dependency, isolated
so a browser-side decoder swaps one file for `DecompressionStream("deflate")`.

**The port is verified against the POC rather than against itself.** 194/194 directly comparable
poses hash byte-identical. "Directly comparable" means masked-mono poses with no separate planes,
since the POC never implemented plane compositing and has no output for the DIB poses.

### Face/torso compositing

`AT_COMPLEX` avatars store headless torsos and separate faces. The join is
`torso.c + face.cDelta - face.c` — landing the face's own anchor on the torso's neck socket, then
applying a per-face nudge. The offset can be negative, so the composite box is the union of the
torso at the origin and the face at its offset, with both parts rebased onto it.

Also ported: the emotion wheel and its two *different* searches. Faces use an ungated
nearest-neighbour (a figure must have a head); torsos and simple bodies use a gated one and can
fail, falling back to neutral. Gestures are sentinels above 2π, outside the metric, matching only
exactly — which is what lets a character wave while looking sad.

**One deliberate divergence.** `CAvatarComplex::GetBodyFromEmotion` reuses a single `nearestI`
across both loops, so an unmatched torso search silently draws the face's index as a torso. The
port falls back to neutral, as the `CEmotionOpts` path already did.

### Mask and aura planes

Comic Chat drew a pose as up to three Win32 blits: aura `MERGEPAINT`, mask `MERGEPAINT`, drawing
`SRCAND`. Read as alpha instead of raster ops that says the mask and aura define *coverage*, the
drawing defines *colour*, and any pixel no plane punched keeps the backdrop — transparency. The
three-blit dance is a Win32 detail an alpha channel does not need.

**Three new gotchas, all silent, now in `docs/AVB_FORMAT.md` (up to eight):**

- **Plane polarity is not constant.** 2833 aura planes ship the colour table `[white, black]` and
  **73 ship `[black, white]`**. Assume index 0 is the figure and 73 planes render inverted. Read
  polarity from the palette — testing luminance costs nothing and decodes both groups.
- **`AIP_DUALMASK` planes are 2bpp masked-mono, not 1bpp.** 384 of them. "Dual" names the fact
  that mask and aura ride in one bitmap.
- **One asset relies on the blits having been `StretchBlt`.** Xeno's LAUGH face carries 145×150
  planes against a 150×158 drawing, in all four versions of the file. Nothing else in the corpus
  disagrees with its drawing.

### A bug the paper caught after the code did not

Both halos must be drawn before *either* figure — otherwise the second part's halo eats a
halo-shaped bite out of the first at the neck. The first implementation flattened each part and
blitted, which is wrong; §4.4 of the paper states the rule outright and `CBodyDouble::DrawBody`
implements it. `rasterizeLayers` now keeps the halo separable and `compositeBody` interleaves.
There is a test that builds the naive ordering alongside the correct one and asserts the naive
one loses ink, so the rule cannot be quietly undone.

### `wiki/` — the deliverable the stage was named for

`wiki/comic-chat-presentation.md` covers the five algorithms (text→emotion rules, the emotion
wheel, character staging, balloon routing channels, panel breaks and zoom), what to take, adapt
and discard, and the panel-grammar problem.

**The most useful finding is that the paper is not a specification.** Five things it describes
are absent from the shipped code:

- **Semantic elements were never shipped.** The map of Ohio, the scene object, the "Greek Chorus"
  — the paper's most-cited feature. `AddSemantics` and `PostSemantics` are both `#if 0`'d, their
  call sites commented out, and the surviving code is annotated `// SIGGRAPH PIX Hack` and keyed
  on the literal string `"OXio"` — a deliberately unmatchable misspelling, so the demo could not
  fire by accident. The authors' own stated objection was art budget, which is exactly this
  project's constraint.
- The shout balloon. Four balloon types ship, but a *different* four — including
  `CBWoodringBox`, a caption box the paper never mentions.
- Character heights: `normHeight` is hard-coded to 100, `XXX ... assuming characters are the same
  height`.
- The 15%-probability panel break: the shipped `AddLine` calls no RNG at all.
- Periodic establishing shots: `Establishing()` is true only for the first one or two panels of
  the session. No arrival trigger, no refresher.

### What Zork does to the premise, measured

Comic Chat assumes dialogue between peers. Across all 11 walkthroughs (189 turns): **192
`narration` events and 0 `speech`.** Not few — none. The 189 `object-moved` events are one per
turn, the thief's wander daemon: the character with the most continuous stage presence is one the
player usually cannot see.

So captions are the primary device, not the exception. `CBWoodringBox` is the right *geometry* —
it inherits from the speech balloon and then opts out of outline, tail and routing channel
entirely — but the wrong *cadence*: it arrives via `SM_ACTION` and forces a panel break, treating
captions as rare interruptions. Inherit the geometry, invert the cadence.

Two decisions remain open and belong before 5.3, not during it: the player's on-screen
representation (Zork deliberately never describes the player, so "show the speaker" yields an
empty panel), and backdrops — 3 shipped against 110 rooms, which no algorithm closes.

### State at the milestone

- **`art/`: 13 tests.** 191 files parse · 4656 images · 2066 masks · 2908 auras · 4656 poses
  rasterize · 2348 composites. Exact counts, since the corpus is fixed and version-controlled.
- Engine and IR untouched: 11 walkthroughs, 143/143 strict, 120 engine tests, IR 193.
- `wiki/` created. `docs/AVB_FORMAT.md` extended to eight gotchas and a compositing section.

### Status

**M5 stage 5.1 ✅.** Stage 5.2 (minimal browser shell) is next by the plan.

---

## v0.9.0 — 2026-07-20 — ⚑ Gate C claimed: the engine is complete

Zork I runs end to end on the IR, in TypeScript, with no browser code and no dependencies.

### What the gate rests on

`docs/DEVELOPMENT_PLAN.md` stage 4.5 asked that "all golden transcripts pass". **As written that
was unsatisfiable**, and the reason is a decision the project made deliberately: combat and the
thief choose their output with `<RANDOM …>`, and ADR 0002 declined to reproduce the Z-machine's
PRNG rather than pin the engine's determinism contract to one interpreter's implementation
choice. A randomized turn has no single correct text to diff, so `05-troll-combat.cmd` is
whole-file informational **by method, not by defect**.

The criterion was therefore amended in place rather than quietly reinterpreted, and the amendment
is the part worth keeping:

1. **Deterministic turns verify strictly, by text** — 143/143 across 11 walkthroughs, every
   opt-out carrying a written reason, both enforced by test. Unchanged, and still the primary
   evidence.
2. **Randomized turns verify by membership** — but membership counts as evidence of the same
   weight *only* because v0.8.3 made it carry two further checks. It is one-sided on its own: a
   narrower legal set never makes a passing line fail. So each suite also asserts **world state**
   (a narrated death charges the score and moves the player; a narrated kill removes the villain;
   a narrated robbery moves the object) and **a positive control of real `dfrotz` output** against
   the shipped story file.

The gate is claimed against that standard, with the standard written down where the next gate
will be read.

### Known limitation, recorded rather than waived

`V-CLIMB-UP` is still a stub — it stalls on `GETPT`, the one exit-property idiom ADR 0003's
rewrite does not cover. It answers "You can't go that way.", correct in every room without a
climbable exit; rooms that have one (the tree, the Cyclops stairs) route through their own exits
and never reach it. No walkthrough diverges on it. It is the last known gap in Group A coverage.

### State at the milestone

- **11 walkthroughs, 143/143 strict turns, 155/161 overall.**
- **120 engine tests, 193 IR tests.** Zero dependencies; ADR 0002 contract intact.
- 360 of 439 ROUTINE forms extracted, 28 catalogued, 51 invisible (45 excluded by design).
- IR schema 0.14.0; world document 110 rooms, 137 objects, 267 parser rules.

### Status

**M4 complete. Gate C claimed.** M5 (browser runtime and Comic Chat presentation) is unblocked —
the session protocol's bar on starting later milestones no longer applies. Stage 5.2, the minimal
browser shell over the event stream, is the natural next step and is the first real test of
whether the ADR 0002 event contract is usable from outside the engine.

---

## v0.8.3 — 2026-07-20 — Membership hardened: combat gains world-state and a reference control

v0.8.2 verified the thief and, in doing so, exposed that `combat.test.ts` was verified more
weakly than the suite it had inspired. Gate C's exit criterion is "all golden transcripts pass",
but walkthrough 05 is whole-file `# parity: informational` because combat is randomized — so if
Gate C is claimed, membership *is* the parity evidence for those turns. It needed to be as good
as the thing it stands in for. **No engine or IR source changed.**

### Membership is one-sided

The load-bearing realisation, now written into both suites: a **narrower** legal set never makes
a passing line fail. A derivation that quietly stopped resolving `TROLL-MELEE` would leave every
membership assertion green while covering a fraction of the game. Membership can therefore only
ever prove "this line is legal" — never "the legal set is complete", and never "the world
actually changed."

Two additions close each half.

### The reference positive control

24 lines captured from `dfrotz -w 200 -s <seed>` fighting the troll in
`verification/build/zork1.z3`, spanning all three sources — `HERO-MELEE` rows, `TROLL-MELEE`
rows, and routine TELL text including `I-SWORD`'s glow. All 24 are accepted by the derived set,
which is the first direct evidence that the derivation covers what the reference actually prints
rather than merely what the ZIL contains.

Verified to bite: simulating `TROLL-MELEE` failing to resolve drops all three villain reference
lines while the hero lines still pass — the exact silent narrowing the control exists to catch.

### World-state assertions

`fight()` now records the world alongside the text and the two are reconciled:

- a narrated kill must **remove** `TROLL` from the world;
- a narrated death must set `DEATHS`, resurrect to `FOREST-1`, and charge **exactly 10 points**;
- `ADVENTURER.strength` (wounds) and `TROLL.strength` (unconscious at negative) must both move
  across the sample — the fight's real state machine, which no text check touches;
- nobody is both dead and victorious.

Both mutations were tested and caught (troll left in the world; penalty off by one).

### Two bugs found — in the test helper, not the engine

Seed 5 dies during the **approach**, from the troll's free `I-FIGHT` swing on entry, before a
single "kill troll" is typed. The helper read the villain's blows and the score only inside the
fight loop, so those seeds had a wounded player with no blow recorded and no score baseline. The
approach is now observed on the same terms.

The trailing `observe()` after the loop also ran a second time with no command in between,
overwriting `scorePrev` with the post-death score and destroying the delta the penalty check
depends on. Removed, with a comment saying why it must not come back.

### Results

- Engine **120** tests (was 117), IR 193 unchanged. Parity unchanged at 143/143 strict, 155/161.
- `combat.test.ts` and `thief.test.ts` now verify on the same terms, through
  `engine/test/membership.ts`.

### Status

The verification Gate C would rest on is now as strong as the gate's claim. **The remaining
Gate C question is definitional, not technical**: the criterion says "all golden transcripts
pass" and walkthrough 05 cannot, by construction. Amending it to state what parity means for
randomized turns is the last step before the milestone can be claimed.

---

## v0.8.2 — 2026-07-20 — The thief verified: robbery, wander and melee

The thief had been queued and running since v0.8.0 with nothing exercising him. No walkthrough
stays underground long enough to be robbed, so `ROB` and the wander could have been wrong for a
milestone the way combat was in v0.7.0 — the failure that motivated the membership method in the
first place. `engine/test/thief.test.ts` closes that.

### Method

Membership, as combat is, and for a stronger reason: *where* the thief is decides whether he
robs you at all, so a golden transcript would pin a turn number that is not reproducible across
interpreters. The legal set is derived from the IR — `THIEF-MELEE` rows, plus the TELL text of
the thief routines and the other daemons that speak during a long underground wait
(`I-LANTERN`, `I-SWORD`, `V-WAIT`).

The derivation machinery moved out of `combat.test.ts` into **`engine/test/membership.ts`**,
shared by both suites; `combat.test.ts` now imports it and is otherwise unchanged. One addition:
`stringLiterals()`, for tables that are interleaved data rather than message rows — `LAMP-TABLE`
is `[100, "The lamp appears a bit dimmer.", 70, …]`, and treating it as a row spliced the
countdowns into one pattern that matched nothing.

### What it asserts

Membership alone would pass on a thief who wanders and never steals — he simply prints "finding
nothing of value" forever — so the behaviour is asserted on the **world**, not the text: the
painting has to end up in the thief's possession. Also that he becomes visible (both branches of
`THIEF-VS-ADVENTURER`), and that the wander covers the dungeon without walking him into
daylight.

A **positive control** pins four lines captured from `dfrotz -w 80 -s 1234` against
`verification/build/zork1.z3` running the same scenario. It is the only hand-written text in the
file, and it earns its place: a derivation that quietly stopped resolving a table would still
satisfy every membership check (a smaller legal set never makes a passing line fail) while
covering less of the game. Real reference output is what makes that narrowing visible. All four
are accepted.

### Findings

- **The thief works.** Robbery, visibility, melee and the round of the dungeon all behave, and
  the reference build produces the same family of lines in the same scenario.
- **His wander is deterministic, and correctly so.** It walks `NEXT` through the ROOMS tree, not
  a draw — identical across seeds, which looked like an RNG bug until the IR settled it. The
  randomness is in `ZPROB`, in whether he robs and whether he shows himself.
- The vigil is kept in the **Cellar**, not the Gallery where the painting lies: his round passes
  the Cellar several times per hundred turns and the Gallery twice, too few for the visible
  branch to come up at all.

### Results

- Engine **117** tests (was 110), IR 193 unchanged. Parity unchanged at 143/143 strict, 155/161.
- No engine or IR source changed — this milestone is verification only.

### Status

M4 4.1–4.7 complete and the thief is verified, so ⚑ **Gate C's systems list is down to
`V-CLIMB-UP`**, the last stub.

---

## v0.8.1 — ADR 0003: Derived Adjacency, and the Sword Glows

**Date:** 2026-07-20

### Changes

`I-SWORD` was the last blocker on walkthrough 10 and the last M4 item ADR 0001 had deferred
without an answer. It needed an *IR* decision, not an engine one: the daemon walks a room's
exits as numbered Z-machine properties (`NEXTP`, then `GETPT`/`PTSIZE`/`GETB` to read the
destination out of byte 0), and the IR models exits structurally, so there was nothing for a
mechanical extractor to translate.

**ADR 0003** (`docs/adr/0003-adjacency-derivation.md`) resolves it in four parts, with the
alternatives — a general `exits-of` reflection op, a quantifier op, an engine builtin, a
villain-side threat field — recorded and argued rather than merely listed.

- **`Room.adjacent` is derived at extraction time.** The ids a room declares a static exit to,
  deduped, in exit order. `deriveAdjacent()` in `ir/src/schema.ts` is the single definition:
  `extract-world` emits the field, `validate` **re-derives and compares** it, so a stale or
  hand-edited list is a validation error rather than a silent divergence. This is the first
  derived data in a document that otherwise transcribes the source, and the ADR says so.
- **Declared, not reachable.** `to`/`conditional`/`door` are in (the IR spelling of
  UEXIT/CEXIT/DEXIT); `blocked` and `routine` are out. A shut door and a false condition still
  count, because the ZIL tests the exit's *shape* and never its state — so the field must not be
  used for pathfinding or a map view, which is documented on the field itself.
- **The engine materializes, it does not compute.** At load each list becomes a `pure` `ltable`
  reachable as an ordinary room property (`adjacentRooms`). The document owns what is adjacent;
  the engine owns only the runtime shape, which keeps ADR 0002's line intact.
- **The extractor rewrites the idiom.** `RoutineTransformer.exitScan()` matches the ZIL shape
  structurally and emits an index walk over `adjacentRooms`. The `LOW-DIRECTION` guard and the
  `PTSIZE` test have no lowered form because `deriveAdjacent` already applied both.

**The rewrite is the one place in the extractor where output is not a mechanical image of its
input**, so it is fail-closed by construction: any clause that does not match returns
`undefined`, the REPEAT takes the ordinary path, and the routine catalogs on `NEXTP`/`GETPT`
exactly as before. A near-miss costs extraction; it cannot produce a plausible loop over the
wrong thing. `ir/test/exit-scan.test.ts` proves that by perturbing single atoms inside the idiom
(`LOW-DIRECTION` → an unknown name, `DEXIT` → `FEXIT`) and asserting the routine falls back.

**No new IR ops.** The whole rewrite is `prop` / `table-get` / `gt?` / `add` / `loop` / `break`,
so the behavior AST is unchanged and ADR 0001's growth log needs no entry. `adjacentRooms` joins
`BEHAVIOR_PROPERTY_KEYS` as the only key there with no ZIL property atom behind it.

**Two turns of walkthrough 10 are still quarantined, for a new reason.** The glow reports the
*outcome* of the randomized fight: the reference knocks the troll unconscious, so it is still in
the adjacent Troll Room ("faint blue glow", then nothing once the player leaves), while the
engine's seed kills it outright. The directive was rewritten to say that instead of the old
"I-SWORD is not extracted". The glow itself is verified directly in `engine/test/engine.test.ts`
— all three levels *and* the transitions, since the ZIL only prints when the level changes and a
scan returning a constant would still print once.

`I-SWORD` also turned out to speak during combat: killing the last villain in the room is
exactly what makes the glow change, so "Your sword is no longer glowing." now follows the
troll's death on the same turn. The combat suite's legal-message set gained `I-SWORD` (derived
from the IR, as the rest of that set is) rather than a hand-written line.

### Results

- 439 ROUTINE forms: **360 extracted** (was 358), **28 catalogued** (was 29).
- **Walkthrough 10 verifies strictly.** Per-turn parity **143/143 strict** (was 117/117),
  155/161 overall. All 11 walkthroughs pass.
- Engine **110** tests, IR **193**.

### Status

M4 4.1–4.7 complete. The thief daemon is live but unverified — no walkthrough exercises a
robbery — and `V-CLIMB-UP` is the last stub. `OTHER-SIDE` still catalogs on `NEXTP`: its shape
is different (it needs the direction number and a door match) and ADR 0003 does not cover it.

---

## v0.8.0 — `GO` as an Entry Ref: Combat Whole, Daemons Running

**Date:** 2026-07-20

### Changes

The fix v0.7.1 called for. `GO` (`1dungeon.zil:2637`) is the game's initialization routine and
was reachable from nothing, so none of what it does happened: five daemons never queued, three
melee result tables never patched.

- **`GO` added to `entryRefs`.** `I-FIGHT`, `DO-FIGHT`, `VILLAIN-BLOW` and `WINNER-RESULT`
  extract with it, and `INT-I-FIGHT`/`I-SWORD`/`I-THIEF`/`I-CANDLES`/`I-LANTERN` are all queued
  at startup. Villains strike back, disarm the player, knock them out and kill them; `JIGS-UP`
  and resurrection work. The troll takes its free swing on entry, so some seeds are decided
  before the player swings.
- **`TABLE_CORRECTIONS` deleted.** `GO` writes `DEF*-RES` at runtime, which is what the source
  always meant; the extractor no longer hardcodes it. The v0.7.0 premise is gone with it.

Four extractor gaps surfaced on the way, each documented at its site:

- **Flags used as values.** `<PUTP … ,P?VTYPE ,NONLANDBIT>` carries a flag as data, not to
  FSET/FCLEAR/FSET?. Resolved by name, matching how the world document already stores
  `vehicleType: "NONLANDBIT"`. Also cleared `LIT?` — see the shadowing note below.
- **`PROB`'s two-argument form.** The DEFMAC expands it to `<ZPROB base>` and **discards the
  second operand unevaluated**. VILLAIN-BLOW writes `<PROB 25 <COND (.HERO? 10)(T 50)>>` where
  `.HERO?` is never declared — legal precisely because the macro drops it. Extracting that
  operand catalogued VILLAIN-BLOW on an undeclared local and took the counterattack with it.
- **`NON_RETURNING_BUILTINS`.** `MAIN-LOOP` is the turn loop and never returns, so `GO`'s
  trailing `<AGAIN>` is dead code on the Z-machine too. Statements after such a call are dropped
  rather than denied; without this `GO` catalogued on "AGAIN outside a REPEAT/PROG".
- **`ENGINE_IMPLEMENTED`.** Once `LIT?` became extractable it *shadowed* the engine's lighting —
  routines take precedence over builtins — and called into `DO-SL`, parser scope machinery the
  IR does not model. Every dark-room turn in the corpus broke. Now never queued.

**Engine**: initialization moved to construction rather than `start()`, so a host going straight
to `command()` cannot get a daemon-less game; `start()` replays what construction produced. An
explicit `start:` option still overrides `GO`'s placement. `V-VERSION` (the copyright banner, a
sanctioned diff since 0.2) and `MAIN-LOOP` added as builtins.

**Tests**: the combat suite gained the damage assertion v0.7.0 lacked — villains land blows, the
player dies, fights are decided either way — and derives its villains and melee tables from the
`VILLAINS` table instead of a hand-written list. The negative control twice caught the check
going soft: once accepting a marker printed as a raw number, once accepting anything at all
after wildcard-dominant patterns entered the set (which also made the alternation backtrack
catastrophically). Wildcard-bearing patterns now have to carry real literal text; pure-literal
ones are kept at any length, because ZIL assembles a sentence from several TELLs.

### Results

- 439 ROUTINE forms: **358 extracted** (was 352), **29 catalogued** (was 30), **52 invisible**
  (was 57). 45 of the 52 are excluded by design (parser, clock, turn loop).
- Parity unchanged at **151/163, 117/117 strict** — combat text is a random draw either way, and
  walkthrough 10's four diffs remain `I-SWORD`.
- Engine **108** tests, IR **185**.

### Status

M4 4.1–4.7 complete. `I-SWORD` is the last blocker on walkthrough 10 and needs an IR answer.
The thief daemon is live but unverified — no walkthrough exercises a robbery.

---

## v0.7.1 — Correction to v0.7.0

**Date:** 2026-07-20

Documentation only. Two claims in the v0.7.0 entry above are wrong; that entry is left standing
per the never-edit rule, and this one corrects it.

### Corrections

- **"Villain combat landed" overstated what shipped.** Only the *player's* blow resolves.
  `VILLAIN-BLOW` and `WINNER-RESULT` are not extracted, nor is the `I-FIGHT` daemon that drives
  them (`I-FIGHT` → `DO-FIGHT` → `VILLAIN-BLOW` → `WINNER-RESULT`). **Villains never strike
  back, so the player cannot be hurt or killed in a fight.** The reference build does strike
  back ("The troll's mighty blow drops you to your knees"); the engine prints nothing like it.
  The v0.7.0 tests do not catch this — they assert the troll dies and that printed messages are
  legal, and a one-sided fight satisfies both. A damage assertion is needed.

- **The `DEF*-RES` zeros are not a ZILF reconstruction defect.** `GO` (`1dungeon.zil:2637`)
  patches all three tables at runtime — `<PUT ,DEF1-RES 1 <REST ,DEF1 2>>` and five more — so
  the zeros are placeholders the game overwrites, and the `;<REST …>` comments annotate what it
  writes rather than preserving a lost value. The dfrotz evidence cited in v0.7.0 was real but
  the conclusion drawn from it was wrong: the shipped build works because `GO` runs, not because
  the source is defective. `TABLE_CORRECTIONS` therefore holds the right values on a wrong
  premise and duplicates in the extractor what the game does itself.

### Root cause of both

**`GO` is not an entry ref.** `entryRefs` (`ir/src/extract-world.ts:663`) covers room and object
actions and syntax handlers only, so nothing reaches the game's initialization routine — which
queues all five daemons *and* patches the melee tables. `engine/src/load.ts:128` hand-reimplements
a fragment of it (`HERE`, `WINNER`, `MOVES`) and silently omits the rest.

### Audit

439 ROUTINE forms in the corpus, 352 extracted, 30 catalogued — **57 invisible as neither**. 44
are correctly excluded by design (39 `gparser`, 3 `gclock`, 2 `gmain`: the engine owns the
parser, the clock and the turn loop). The remaining 13 are the combat chain, `GO`, and a short
tail (`BREATHE`, `UNTIE-FROM`, `INFESTED?`, `YES?`, `NO-GO-TELL`, `FIND-IN`, `ZPROB`, `MIN`).

### Status

No code change. `TABLE_CORRECTIONS` stays in place only because deleting it before `GO` is
extracted breaks the melee draw outright. Extracting `GO` is the next task and supersedes it.

---

## v0.7.0 — Villain Combat: `RANDOM` in the IR, and Membership Verification

**Date:** 2026-07-20

### Changes

**The blocker was extraction, not the engine.** Villain combat had been recorded as an engine
gap, but `HERO-BLOW` was in the behavior catalog with a single reason: `operator RANDOM`. Because
extraction is reachability-driven from entry refs, its failure meant nothing it called was ever
queued — so `VILLAIN-BLOW`, `VILLAIN-STRENGTH`, `VILLAIN-RESULT`, `WINNER-RESULT` and `REMARK`
were absent from the IR *and* from the catalog, invisible as either successes or failures.

- **IR schema 0.14.0 — the `random` expression op** (`<RANDOM n>`, a uniform draw in 1..n). The
  op names the *draw*; which sequence a seed produces stays an engine concern, so the IR is not
  pinned to any interpreter's PRNG. `RANDOM` left `DENIED_OPERATORS`; the engine evaluates it
  through `ctx.rng`, which already round-trips through the save contract.
- **`RANDOM` in statement position is denied deliberately**, with an accurate reason. There its
  value is discarded, which on the Z-machine means a non-positive operand *seeds* the generator
  rather than drawing (`V-RANDOM`, the `#RND` debug verb). Seeding is a different operation and
  does not lower to `random`.
- **`PRINT` and `PRINTD` extract as `tell` parts**, unblocking `REMARK` — which became reachable,
  and therefore catalogued, only once `RANDOM` landed. Both map onto existing shapes: `PRINT`
  stringifies a value like a bare TELL token, `PRINTD` is exactly TELL's `D`. `PRINTB` and
  `PRINC` stay denied as Z-machine address plumbing.
- **Melee result-table corrections (`DEF1-RES`, `DEF2-RES`, `DEF3-RES`).** The ZILF reconstruction
  declares these with literal zeros in every slot that should hold a table view, parking the real
  value in a comment (`0 ;<REST ,DEF1 2>`). `HERO-BLOW` indexes them by attack strength and then
  draws from the row it gets, so the views are what make a stronger blow skip the leading MISSED
  entries; taken literally the zeros make that second GET read address 0. The shipped Release 119
  build plainly does not read garbage — fought under dfrotz it lands a knockout and then a kill —
  so the corrections restore the views the comments describe. Encoded as data with the evidence
  at the site, not by parsing comments out of the source.
- **Engine**: `HERO-BLOW` and `RANDOMIZE-OBJECTS` stubs removed. Routines take precedence over
  builtins, so the stubs were dead code shadowed at every call site. `V-CLIMB-UP` remains (GETPT).

**Verification of randomized turns: membership, not text parity** (the RNG question in HANDOFF,
resolved to option (b)). Combat draws randomly and the engine's generator is not frotz's, so
fight text cannot be diffed against a golden. `engine/test/combat.test.ts` instead asserts that
every line printed during a fight is a message the game *could* have produced, over 40 seeds.
The legal set is derived from the IR — melee message rows plus the literal TELL text of the
combat routines — never hand-listed, since a hand-kept list would drift and start passing by
construction. A negative control asserts the check rejects a corrupted message, a leaked table
id, and a marker printed as its raw number; it caught a real weakness in the name wildcard while
being written, which is why entity names must now begin with a letter.

### Results

- **Walkthrough 10 went from stuck-at-turn-13 to 24/28.** The troll dies, the carcass message
  fires, the axe drops, and the dam sequence is reached and matches.
- Overall parity **138/163 → 151/163 (93%)**; strict walkthroughs **117/117 (100%)**.
- Engine tests **103 → 108**; IR **184/184**. Routines extracted **346 → 352**, catalogued
  complex **32 → 30**.
- **Walkthrough 10's remaining four diffs are all `I-SWORD`**, not combat. Its `# parity:`
  directive was rewritten to name the real cause rather than left asserting a fixed problem.

### Status

M4 stages 4.1–4.6 complete, combat outcomes landed. `I-SWORD` is now the single blocker on
walkthrough 10 and needs an IR answer (`<NEXTP …>`), not an engine one.

---

## v0.6.8 — Documentation: HANDOFF Trimmed to Its Purpose

**Date:** 2026-07-20

### Changes

`HANDOFF.md` had grown to 482 lines, most of it a stack of nine "Prior Session" sections
reproducing material already in this file. Since it is read at the start of every session, that
cost was paid every time and bought nothing the WORKLOG did not already hold.

- **Removed all Prior/Earlier Session sections.** Each was verified present here first.
- **v0.5.17 was backfilled into this file before deleting it** — it had been recorded in HANDOFF
  and never in the WORKLOG, so HANDOFF was its only copy. It now sits between v0.5.16 and
  v0.5.18.
- **Added a scope rule at the top of HANDOFF**: only what the next session needs; completed
  narrative goes to the WORKLOG; do not accumulate a Prior Session stack. The absence of that
  rule is why the file drifted.
- **Added a Standing Notes section** collecting the hard-won rules that outlive any one session
  and were previously buried in session narrative — Release 119 as ground truth, asking the
  reference build rather than reasoning about the ZIL, the "cannot verify" / "fails to verify"
  distinction, cascades having one cause, and `setFlag` on an unknown id inventing a phantom
  entity.
- **Stale content corrected**, not just moved: Next Actions still claimed "Gate C's criterion is
  already met on the current three transcripts" (there are now eleven walkthroughs), still
  described stage 4.5 as in progress, and still listed the three completed M3 gaps as pending
  items.
- Open Issues split into Engine/IR and Project/M5; `engine/harness/` and `verification/` added
  to Key Paths.

482 → 187 lines. No engine, IR, or artifact changes.

### Status

M4 stages 4.1–4.6 complete. Villain combat is the top blocker for Gate C and has a waiting test
in walkthrough 10.

---

## v0.6.7 — Engine Core: Per-Turn Parity Directives, Walkthrough 10 Re-Captured (Milestone 4, stage 4.6)

**Date:** 2026-07-20

### Result

**117/117 strict turns — 100%.** 138/163 overall. 103 engine tests, IR 184/184.

### Walkthrough 10, re-captured

The old capture never reached the dam. The new one is the real sequence — bubble, yellow button, bolt, sluice gates open and water pours through. The yellow button was not guessed: the reference refused the bolt with "The bolt won't turn with your best effort." until the button was pressed.

**It is informational, for a reason that expires.** The dam sits behind the Troll Room, which the IR's exit graph shows is a **cut vertex** — no route to the dam avoids it, and no non-combat way past exists (giving the sword, throwing it, and talking were all tried against the reference; he throws it back and keeps blocking). The engine cannot resolve combat *outcomes*, so the troll never dies and all 18 remaining strict turns cascade from that one cause.

Unlike walkthrough 05 this is **"fails to verify", not "cannot verify"** — a missing subsystem, not a limit of the method. The capture is correct and complete: **deleting one `# parity:` line when villain combat lands makes it verify the dam strictly.**

### Per-turn parity directives

`# informational: <reason>` scopes to the commands after it until `# strict:`. Whole-file informational was too blunt for a walkthrough that must *pass through* something unverifiable to reach what it tests — even once combat exists, the four fight turns are a random draw and can never match text-for-text, while everything around them can.

Quarantined turns leave the strict count in **both** numerator and denominator, so a quarantine cannot inflate the ratio.

### The strict-majority guard was rewritten, not relaxed

It allowed one informational file out of however many, and a second tripped it. Bumping the number would have been the exact drift the guard exists to catch. It now counts **turns** (≥ 2/3 strict — no bumping needed when a walkthrough is added, and a long quarantine costs more than a short one) and additionally requires every opt-out to **carry a written reason**.

Also fixed: `# reason:` was swallowing the per-turn directives below it, turning the whole-file reason into an unreadable run-on.

### Status

Villain combat is now the top blocker for Gate C, and it has a waiting test in walkthrough 10.

---

## v0.6.6 — Engine Core: Orphan Questions, Pronouns, Compound Sentences (Milestone 4, stage 4.6)

**Date:** 2026-07-20

### Result

Walkthrough `11-parser-edges` replays with zero diff. 99 engine tests, IR 184/184.

The session began by auditing an interrupted one. The working tree held no modified files — only two uncaptured walkthrough/golden pairs. Walkthrough 10 was a **bad capture** (it never reached the dam, dying to the troll at turn 19, so every diff in it was combat noise); walkthrough 11 was a clean spec for four real parser gaps.

### The four gaps

- **Compound sentences.** One line may hold several commands, each its own turn: "TAKE THE LEAFLET AND READ IT" costs two moves, "TAKE LEAFLET AND MAILBOX" costs one. The only discriminator is whether a **verb follows the AND**.
- **Orphan questions.** ZIL asks for a missing object instead of refusing the verb, and the next input answers it. This makes the parser stateful across turns — a new `ParserMemory` on `GameState`, which nothing else in the engine needed. An orphan is abandoned when the next input starts its own sentence.
- **Implicit objects.** A slot with a `find` flag and exactly one in-scope candidate is filled and echoed: `(leaflet)`.
- **HAVE slots** report their own requirement ("You don't have that!") rather than the surroundings ("You can't see any sword here!").

### Every detail came from the reference build

The ZIL reads plausibly several ways on all four. Two first attempts were wrong and dfrotz caught both:

- **Auto-supply must ignore the slot's *location* options.** TAKE searches ON-GROUND/IN-ROOM, yet bare TAKE answers for a leaflet *in your hand*. The first version re-parsed the completed sentence and had it rejected by the very rule that produced it. The command is now built directly: the find flag decides what was meant, and where it sits is the action's problem.
- **The orphan must not pick the most-specific rule**, though the main parse loop must. Bare PUT would land on `PUT DOWN …` and ask "What do you want to put down?" when the reference asks "What do you want to put?". A slot introduced by a preposition cannot be what the player left out.
- A third correction: the no-antecedent message, which had been invented rather than checked, is **"I don't see what you are referring to."**

Detail the golden pins down: the orphan question echoes the player's own **six-character-truncated** words — "What do you want to put the mailbo in?", not "the small mailbox".

### Two process failures worth remembering

1. **A new test passed for the wrong reason.** `setFlag(state, "LEAFLET", …)` silently invents a phantom entity — the leaflet's id is `ADVERTISEMENT`. The assertion then "passed" against an object that does not exist in the world. Only a sibling test failing exposed it; the file was then swept and every other id verified real.
2. **The first property-default fix was wrong.** Bare WAKE supplies the player and V-ALARM reads its STRENGTH, which `ME` does not declare, so arithmetic threw — a pre-existing defect this change merely made reachable. Defaulting *every* absent property to 0, as `GETP` does, **breaks ten of eleven walkthroughs**: `truthy()` counts 0 as true here, so the `false` sentinel is load-bearing and distinguishes absent from zero. `strength` was added to the existing stopgap table instead.

### Status

Left unimplemented deliberately: in West of House, where the mailbox is the room's only object, the reference resolves "READ IT" *to the mailbox* rather than refusing. Whether that is a one-candidate fallback is unverified, so we refuse in both rooms and the divergence is recorded at the call site. Multi-object lists beyond `ALL` remain unimplemented.

---

## v0.6.5 — Engine Core: Multiple Objects, Wider Corpus (Milestone 4, stage 4.5 continued)

**Date:** 2026-07-20

### Result

**104/104 strict turns across 8 walkthroughs — 100%.** 115/122 overall including the informational one. 89 engine tests, IR 184/184.

Three more walkthroughs: `07-forest-and-tree` (climbing, the egg, nested scoring), `08-containers` (bottle/sack manipulation), `09-take-all-surface` (multiple objects, surfaces, refusals).

### `TAKE ALL` — ZIL's MANY search option

Deferred in 4.3 as "constrains the action, not where to look". Implemented here, and almost every detail was settled by **asking the reference build rather than reasoning about it**:

- **`ALL` is a BUZZ word**, so it must be recognised *before* buzzword filtering — otherwise "TAKE ALL" reduces to a bare "TAKE" with no object and is rejected as ungrammatical.
- **"All" ranges over the room's loose objects, things on a *surface* in the room, and what the player holds.** The surface case is not obvious: "TAKE ALL" in the Kitchen takes the bottle and sack, both sitting *on the table*, so "direct children of the room" is too narrow. But it does **not** take the water inside the bottle, though the bottle is transparent and the water plainly in scope — so "everything visible" is too broad. A surface is furniture; its contents read as being in the room. An ordinary container's contents come along inside it.
- **`TRYTAKEBIT` widens the slot's find flag.** "TAKE ALL" in the Living Room answers for the rug and the trophy case as well — "The rug is extremely heavy and cannot be carried." — because ZIL includes objects flagged "try to take me and I will explain why not" and lets their action routines refuse. The wooden door, carrying neither TAKEBIT nor TRYTAKEBIT, is silently absent. Filtering these out would have replaced six answers with four, and each missing one is gameplay.
- Each result is prefixed with the object's name (`brown sack: Taken.`) so several answers stay attributable. A single object gets no prefix.

### Two defects in existing code

1. **`flush` was trimming trailing spaces**, which is wrong for any flush that happens *mid-sentence*. "TAKE ALL" prints "brown sack: ", then dispatches; dispatch emits an `object-moved` event, which flushes; the trailing space vanished and the transcript read `brown sack:Taken.`
2. **`run-transcripts.sh` fed `#` directive lines to dfrotz as commands.** Introduced by the `# parity:` directive added in v0.6.4 — the capture script had no reason to expect comments in a `.cmd` file, and silently corrupted walkthrough 05's golden (0/18 until noticed). The script now strips comments and blank lines before piping to dfrotz.

### A source/transcript conflict, resolved in favour of the transcript

HANDOFF has listed **P-WON demon-region gating** as 4.5 work since stage 3.5. The source reads unambiguously: `<COND (,P-WON <COND (<VERB? TELL BRIEF … SCORE …> T) (T <SET V <CLOCKER>>)>)>` — meta-verbs cost no time, so SCORE should not advance the move counter.

Implementing it broke walkthrough 06. The golden has SCORE advancing MOVES from 11 to 12.

The trap is that **dfrotz redraws the status line only when it changes**, so a SCORE turn shows no status line at all — which reads as "no move was consumed" and actually means "the counter had not changed *yet* at that prompt". The second SCORE printing "in 13 moves" is what settles it: the clock ran.

Per HANDOFF (stage 0.2), the shipped Release 119 story file is the ground truth, not the ZILF-reconstructed source in `original-projects/`. So the transcript wins and the gating is *not* implemented. The reasoning is recorded in a comment at the call site, because the source reads the other way and the next person to notice will otherwise "fix" it back.

### Status

Stage 4.5 substantially advanced. Remaining: death and resurrection, the thief's robbery pass, and combat — all three gated on the RNG decision, which remains the one thing standing between the project and an honest Gate C.

---

## v0.6.4 — Engine Core: Wider Parity Coverage (Milestone 4, stage 4.5 in progress)

**Date:** 2026-07-20

### Why

v0.6.3 met Gate C's stated criterion — all golden transcripts passing — on three short walkthroughs that never touch the lamp, darkness, scoring, the trap door, or combat. Claiming the gate on that basis would have been true and misleading. This session tripled the corpus first.

### Three new walkthroughs, captured from the reference build

`04-lamp-and-darkness`, `05-troll-combat`, `06-scoring-and-treasure`, captured with `run-transcripts.sh capture` against the shipped Release 119 story file. The three existing goldens re-captured **byte-identical**, which is worth stating: the oracle is stable, so new diffs are the engine's, not the capture's.

Parity went 30/30 (3 walkthroughs) → **64/64 on strict walkthroughs, 82 turns total across 6**.

### Defects found

1. **The harness split turns on the wrong thing.** Turn boundaries were taken to be dfrotz's status line; they are the **`>` prompt**. dfrotz redraws the status line only when the move counter advances, and ZIL's meta-verbs (SCORE, DIAGNOSE, VERBOSE) deliberately do not consume a move. Every such command was therefore merged into its neighbour, shifting all later turns by one — which presents as a cascade of unrelated content diffs rather than as an off-by-one. Walkthroughs 01–03 parsed correctly only because none of them uses SCORE mid-sequence.
2. **`stripSessionEnd` was deleting real output.** It cut at the score summary, and `SCORE` prints a byte-identical summary to the one `quit` prints — so a mid-walkthrough SCORE had its entire output removed and then "matched" an engine that printed nothing. This is exactly the failure the normalizer's own module comment warns about: a comparison passing by construction. It now keys on the quit confirmation prompt, which is the thing that actually distinguishes them.
3. **A missing daemon routine destroyed every subsequent turn.** `I-SWORD` is catalogued rather than extracted, and CLOCKER threw on it every turn from the moment the sword was picked up — turning one cause into twelve reported failures and burying the turn where real divergence began. CLOCKER now disables such an interrupt after recording it, and the engine exposes `missingRoutines()` so the omission is reported once and loudly. Recovering from this alone took walkthrough 05 from 6/18 to 11/18.
4. **Door exits gave the generic refusal.** ZIL names the door — "The trap door is closed." — where the engine said "You can't go that way." The generic answer remains correct for a conditional exit, which has no object to name.
5. **"Not here" did not echo the player's words.** ZIL's NOT-HERE-PRINT answers "You can't see any trophy case here!"; the engine answered generically. The generic form is what ZIL prints only when it has no noun to quote.
6. **Entering an unlit room was not announced.** GOTO prints "You have moved into a dark place." before the M-ENTER call, so the player learns they have stepped into the dark before the room's arrival effects speak.

### A limit of the method, made explicit

Walkthrough 05 cannot reach turn-for-turn parity, for two reasons that are worth keeping distinct:

- **`I-SWORD` is catalogued, not extracted** (`unknown form <NEXTP …>`). It walks the room's exits as *numbered Z-machine properties* to decide whether a villain is near — precisely the memory layout the IR abstracts away. The extractor cannot translate that mechanically, and expressing its semantics over the IR's structured exits is an **IR** decision, not an engine one. Implementing it in `engine/` would violate ADR 0002's rule that no game-specific identifier appears there.
- **Combat output is chosen by random draw**, and the engine's seeded generator is not the Z-machine's. Identical seeds produce different sequences, so these turns can never match text-for-text unless the engine reproduces frotz's generator exactly. That is an open architectural question, not a defect.

Rather than delete the walkthrough (hiding the limitation) or leave it failing (training everyone to ignore a red harness), walkthroughs may now declare `# parity: informational` with a reason. Such a walkthrough is still run and still reported — as `INFO`, with its reason printed — but does not fail the suite. The summary reports strict and overall figures separately, and a test asserts the strict set stays the large majority, so parity cannot be "achieved" by marking everything informational.

**"Cannot verify" and "fails to verify" are different states, and the harness now says which is which.**

### Status

83 engine tests (4 new), IR 184/184, typecheck clean. **64/64 strict turns (100%), 75/82 overall (91%).**

Stage 4.5 remains open: daemons beyond the clock, death and resurrection, save/load verbs, and the P-WON demon-region gating. Gate C should not be declared until the RNG question is answered, since combat is a substantial part of Zork I's behavior and is currently unverifiable by this method.

---

## v0.6.3 — Engine Core: Transcript Replay Harness (Milestone 4, stage 4.4)

**Date:** 2026-07-20

### Result

**All three golden transcripts replay with zero diff — 30/30 turns, 100%.** The goldens are dfrotz captures of the shipped Release 119 story file, so this is a diff against real Zork I, not against our own earlier output.

### The harness

- **`engine/harness/golden.ts`** — parses a dfrotz capture into per-turn blocks and normalizes them. Turn boundaries are the status lines, which dfrotz redraws after each prompt. Normalization removes what is *presentation* on both sides: the interpreter banner, the status line, the `>` prompt, the end-of-session dialogue, and hard word wrapping — dfrotz wraps at the terminal width and the engine emits unwrapped text, so a literal comparison would fail on every sentence over 76 characters while saying nothing about behavior. Paragraph breaks are **kept**, because Zork uses blank lines deliberately and a missing one is a real diff.
- **`engine/harness/replay.ts`** — `npm run replay`, exit code = number of failing walkthroughs, so it drops into CI unchanged. A crashed turn is reported as a diff rather than aborting the run, so one bad command does not hide the state of the rest.
- **`engine/test/transcript.test.ts`** — the same comparison wired into the suite so parity cannot regress silently between sessions.

**The normalizer has tests of its own**, and they matter more than they look: it decides what "the same output" means, so one that discarded too much would make every transcript pass and the harness worthless. There is also a guard asserting a minimum number of compared turns, because a normalizer bug that emptied both sides would otherwise read as perfect parity.

This deliberately does not go through `verification/run-transcripts.sh`: that script drives a Z-machine story file and the engine is not one. Both sides compare against the same goldens, which is the only thing that has to be shared.

### Four defects the harness caught immediately

The first run reported 70%, with diffs legible enough to diagnose on sight.

1. **Object-tree insertion order was backwards — and this closes a long-standing open issue.** HANDOFF has carried "Kitchen object order (sack/bottle swapped) — decide for engine parity" since stage 0.2, framed as a question about which behavior to prefer. It was not a judgement call: the Z-machine builds its object tree with `insert_obj`, which **prepends**, so a container's children end up in reverse declaration order. The Kitchen lists the bottle before the sack and the Living Room the sword before the lantern, both the reverse of `1dungeon.zil`. Loading in document order produced plausible output — every object present, stable order, simply not the original's. `load.ts` now prepends, the same rule the runtime `move` already used; there is one insertion order in the object tree, not one for loading and another for play.
2. **Room action routines were never called with `M-ENTER`.** This is where Zork puts the consequences of arriving. Without it the Cellar is entered in silence — the trap door never slams shut, and the game becomes winnable in a way it should not be. It also runs **before** the description, not after: running it later still prints every word, in an order that reads as though the door closed on the way out.
3. **A spurious engine fallback message.** Dispatch printed "You can't do that." whenever the verb default returned false, but a `V-*` routine that returns false has usually already printed its own refusal — so the engine appended a second, contradictory sentence. It surfaced as a stray line after a perfectly good LOOK.
4. **A harness bug, not an engine bug.** `quit` produces no status line, so its output lands inside the previous turn's block, making the last real turn of every walkthrough appear to print the score summary. Worth recording because the fix belonged in the normalizer: had it been "fixed" in the engine, the engine would have grown code to emit interpreter dialogue it has no business emitting.

### Status

Stage 4.4 ✅ — exit criteria exceeded. The criterion was "first golden transcript replays with acceptable diff"; all three replay with **no** diff.

79 engine tests (11 new), IR 184/184, typecheck clean.

Next: stage 4.5 — daemons, scoring, save/load, death, and ⚑ **Gate C**. Note that Gate C's own criterion ("all golden transcripts pass") is already met on the current three; the remaining 4.5 work is the systems those three walkthroughs do not exercise, and the honest next step is **more walkthroughs** covering the thief, combat, the lamp countdown, and death — parity on three short transcripts is a real result but a narrow one.

---

## v0.6.2 — Engine Core: Action Dispatch & Events (Milestone 4, stage 4.3)

**Date:** 2026-07-20

### Changes

The engine now plays Zork I. `createEngine(doc).command("open mailbox")` returns the right events, and a walkthrough from West of House into the Living Room reproduces the original's prose.

- **`src/runtime.ts`** — the per-turn context. The POC threaded a bare world and appended prose to a string array; the engine adds PRSA/PRSO/PRSI, the seeded RNG, and an **event sink** in place of a transcript buffer. Text is buffered rather than emitted per `TELL`, since one ZIL routine prints a sentence across many calls and one event per fragment would be unusable. Structural events flush the buffer first, so prose printed *before* a move stays before it in the stream.
- **`src/interpreter.ts`** — the ADR 0001 evaluator, ported from `ir/poc/interpreter.ts` (already proven over 346 routines). Substance unchanged; what changed is the surroundings — output goes to events, `move`/`remove` emit `object-moved`, and routine resolution tries the document's own routines *before* engine builtins so a game can legitimately override a utility.
- **`src/builtins.ts`** — ZIL's Group A utility layer: the clock (QUEUE/INT/ENABLE/DISABLE/CLOCKER), the light rule, GOTO, PICK-ONE, PROB, GLOBAL-IN?, FLAMING?, OPENABLE?, OTHER-SIDE. Per ADR 0002's portability rule these implement the **ZIL library**, not Zork I's call sites: no `zork1` identifier appears in `engine/`.
- **`src/engine.ts`** — `createEngine`, the turn loop, and ZIL's four-step dispatch chain (pre-action → PRSI action → PRSO action → room action → verb default), plus `snapshot`/`restore` over a fully JSON-serializable save.

**The engine delegates room description to the game's own `DESCRIBE-ROOM`/`DESCRIBE-OBJECTS`** when the document carries them. Those routines already implement verbose/brief modes, the light rule, and the first-visit distinction; reimplementing that in the engine would be a second, competing answer to questions the IR has already answered — exactly what ADR 0001's Group A/B split exists to prevent. A fallback describer remains for partial documents.

### Six bugs, every one of which produced a plausible wrong answer rather than a crash

This is the stage where "it runs" and "it is correct" diverge, and each of these is now a named regression test.

1. **`verb?` resolves against PRSA, not the typed verb word.** ZIL's `<VERB? WALK BOARD THROUGH>` compares against the *action*, with the `V-` prefix dropped. The difference is invisible wherever a verb and its action agree — "TAKE" → V-TAKE — which is what makes it dangerous. It surfaced on "ENTER WINDOW": verb ENTER, action V-THROUGH, and the window's routine tests THROUGH. The window simply could not be entered while every ordinary verb worked.
2. **Room action contexts are numbers, not names.** `M-LOOK` is 3 (gmain.zil); the extracted AST compares `RARG` against `{op:"const", value:3}`. Passing the string `"M-LOOK"` is a type error nowhere — the comparison just never matches, and rooms whose description is computed lose it while rooms with a static LDESC read correctly.
3. **`PERFORM`'s first argument is a verb name.** `DO-WALK` calls `<PERFORM ,V?WALK .DIR>`, which extraction reduces to `"WALK"`. Using it verbatim as the action dispatched to nothing.
4. **ZIL property defaults (`PROPDEF`) were missing.** The player object declares no SIZE, so `V-TAKE`'s weight check read `false` and the arithmetic threw — *every* take failed. SIZE defaults to 5, CAPACITY/VALUE/TVALUE to 0.
5. **Rooms had no properties in state.** `load.ts` populated objects only, so `<GETP ,HERE ,P?ACTION>` always returned the default and `DESCRIBE-ROOM` printed nothing for computed rooms.
6. **`GOTO` set TOUCHBIT to mark a visit.** TOUCHBIT belongs to `DESCRIBE-ROOM`, which sets it itself and reads it as "already described" — so marking the visit made the room's description vanish. First-visit scoring now uses the engine's own `visited` set.

**`PICK-ONE` was also rewritten** against the real algorithm. It is a *rotating* choice, not a plain random one: the table carries a cursor and each pick swaps the winner to the front of the unused region, so every message is seen once before any repeats. The layout in IR element terms is `[cursor, ...messages]` — an LTABLE's length word is synthesized rather than stored — and ZIL's `<REST .FROB 2>` skips two *bytes*, i.e. one element. Reading it as two shifts the window and returns the cursor as a message. A plain random pick would also have drifted from the transcripts within a few turns even under an identical seed.

### Known tension, recorded rather than papered over

Delegating to the game's `DESCRIBE-ROOM` costs the **`room-title` channel**: Zork prints the room name with its own `<TELL D ,HERE>`, so the engine cannot separate it without parsing prose, which the contract forbids. A UI wanting the title should read `player-moved`.to and look the name up in the world document. Revisit in 4.4/5.2 — see Open Issues.

### Tests

68 engine tests (22 new), IR 184/184, both typecheck clean. Two are deliberately broad: determinism (same seed + same commands ⇒ identical events, and a JSON save round-trip), and a crude fuzz applying **every one of the 135 verbs** to a visible object, asserting that no command throws whatever it does — behavior is data, and an unhandled AST shape must surface as a refusal, never as an exception escaping into the host.

### Status

Stage 4.3 ✅ — exit criteria met: LOOK/TAKE/DROP/inventory all produce correct events.

Next: stage 4.4, the transcript replay harness — diff engine output against the dfrotz goldens in `verification/`.

---

## v0.6.1 — Engine Core: Command Parser (Milestone 4, stage 4.2)

**Date:** 2026-07-20

### Changes

- **`engine/src/vocabulary.ts` — the lexicon.** The IR splits vocabulary the way ZIL does: the `vocabulary` section holds words belonging to the *language* (135 verbs, prepositions, 13 directions, 21 noise words, 75 synonym groups), while nouns and adjectives live on the objects that answer to them. Both halves fold into one lookup structure at load time, so the parser never has to know which half a word came from. Two details are parity requirements rather than conveniences: words are truncated to **six characters**, because the Z-machine dictionary does and a golden transcript may well contain "MAILBO"; and direction abbreviations (N, NE) arrive as ordinary synonyms, so they are resolved into the direction table eagerly rather than looked up twice.
- **Syntax rules are pre-sorted most-specific-first** (slot count, then preposition count) so the first structural match is the right one and no scoring pass is needed. This is what makes `PUT DOWN LAMP` reach V-DROP instead of matching plain `PUT`.
- **`engine/src/scope.ts` — what the player can refer to.** All four ZIL sources: carried (recursively), the room (recursively), the room's scenery pool in LOCAL-GLOBALS, and GLOBAL-OBJECTS. Containers are permeable when OPEN, TRANS, or SURFACE — the rule that makes the glass bottle behave. `INVISIBLE` is honoured as what it actually is, the parser's "cannot see this yet" bit, which is how the thief stays unmentionable until he appears. Scope order is deliberate and doubles as the disambiguation preference: held things before floor things.
- The parser and action dispatch share **one** definition of scope. A parser that finds an object the action layer then refuses is how IF engines end up with two different ideas of "here".
- **`engine/src/parser.ts`** produces ZIL's three parser globals — PRSA, PRSO, PRSI — and nothing else. Whether taking the object is sensible, permitted, or fatal is the action's business. Failures are a **discriminated union**, not one error, because ZIL prints a different refusal for each and transcripts show the difference: `unknown-word` (never heard of it) is not `no-verb`, and neither is `not-here` or `ambiguous`. When several rules fit structurally, the parser reports why the *best-fitting* one failed — a "not-here" from a rule that nearly worked tells the player far more than a generic refusal from a worse rule.

### Tests

24 new tests (46 total, all passing). The standing check is **"parses every command the golden transcripts use"** — 39 commands drawn from `verification/transcripts`, so stage 4.4 cannot arrive to discover the parser never handled its input. That test counts only *grammar* failures: `not-here` is a successful parse of a command whose object is simply elsewhere.

**One real bug, found by the tests and worth recording because the shape of it recurs.** ZIL's search-option list mixes two unrelated ideas: `HELD`/`CARRIED`/`ON-GROUND`/`IN-ROOM` say *where to look*, while `MANY`, `HAVE`, and `TAKE` constrain what the **action** may do. Treating the list uniformly as a location filter was silently wrong in one direction only — `EXAMINE`'s sole option is `MANY`, so its search narrowed to nothing and `EXAMINE MAILBOX` failed while `TAKE MAILBOX` kept working. `originAllowed` now partitions the list and treats a slot with no location option as accepting anything in scope, which is ZIL's default.

Two further initial failures were **wrong test assumptions**: `PUT X IN Y` dispatches to `V-PUT` (ZIL distinguishes IN from ON at the rule level, where ON is `V-PUT-ON`, but both IN-forms share one action), and `TAKE` searching `ON-GROUND`/`IN-ROOM` only — an object already in hand is deliberately out of its reach, which is how ZIL produces "You already have that". Both are now tests in their own right.

- `ir/src/index.ts` gained the vocabulary type exports (`Vocabulary`, `SyntaxRule`, `SyntaxObjectSlot`, `SyntaxSearchOption`, `DirectionWord`, `WordSynonym`). They existed in `schema.ts` but had never been re-exported, so no consumer could name them. IR tests unchanged: 184/184.

### Status

Stage 4.2 ✅ — exit criteria met. Engine 46/46, IR 184/184, both typecheck clean.

Next: stage 4.3, action dispatch — port the ADR 0001 behavior-AST evaluator from `ir/poc/interpreter.ts` into `engine/` and drive it from the parser, emitting the ADR 0002 events.

---

## v0.6.0 — Engine Core: State & World Runtime (Milestone 4, stage 4.1)

**Date:** 2026-07-20

### Changes

- **New `engine/` module** — `@grues-in-comic/engine`, the first code written against ADR 0002's Gate B decision. Zero runtime dependencies: `@grues-in-comic/ir` is consumed through `import type` only (resolved by a tsconfig path to `../ir/src`), so the IR contributes types at compile time and nothing at all to emitted JS. No DOM, no timers, no I/O.
- **`src/events.ts` — the ADR 0002 contract as code.** The `EngineEvent` union, `TurnResult`, and `CONTRACT_VERSION` ("1.0.0"). Also `transcriptText()`, which defines *once* what "the text the player saw this turn" means (the `narration`/`speech`/`question`/`game-over` text, concatenated) so the stage 4.4 harness and the stage 5.2 text UI cannot drift apart on the question parity is measured by.
- **`src/state.ts` — `GameState` and the object tree.** The split that matters: the IR document is immutable input (it *is* the compiled game) and `GameState` is everything that changes, which is what makes the state a complete save file on its own. Primitives mirror ZIL's semantics rather than convenience: `isIn` is a *direct* containment test (one level, ZIL `IN?`) with `isWithin` offered separately for the transitive question, and `move` inserts at the FRONT of the child list per the Z-machine `insert_obj` opcode, because room-listing order depends on it. `isWithin` bounds its walk at 64 hops — the tree is data, and data lies.
- **`src/load.ts` — booting a document into state.** Every relationship the schema calls "derived" is materialised here exactly once, so no later stage has to special-case an implicit container: rooms parent under the `rooms` meta entity in document order, `global`/`local-globals` objects under theirs, and LOCAL-GLOBALS nests inside GLOBAL-OBJECTS as the parser's scope walk requires. Flags, mutable properties, and table storage are **copied** out of the document, so a world shared between two engines cannot be corrupted by play (tested directly). Load-time linking appends rather than prepending — ZIL declaration order is the listing order — which is deliberately the opposite of runtime `move`.
- **`src/movement.ts` — exit resolution split from performing the move.** `resolveExit` answers "where does this direction lead, and may I go?" without touching state, returning a discriminated `ExitResolution` (`go` / `blocked` with the authored message / `refused` / `routine` / `none`). The split exists because the parser, a vehicle, a daemon's forced move, and the thief all need to ask without committing, and because stage 4.3 needs the *reason* for a refusal to pick the right narration event. `PER` exits resolve to `{kind: "routine"}` — deferred until the behavior interpreter lands in 4.3.
- **`src/rng.ts` — the only source of randomness.** mulberry32, seeded, with the whole generator state round-tripping through one number so it saves and restores with the game. Determinism is a contract term (ADR 0002), not an implementation detail: golden-transcript replay in 4.4 is meaningless without it. `random(n)` returns 1..n inclusive, matching the Z-machine `random` opcode rather than 0-based indexing.

### Tests

22 tests, all against the **real** extracted Zork I world (110 rooms, 137 objects) rather than fixtures, so a regression shows up at full scale. Two are load-bearing beyond their own assertions:

- **No exit points at a nonexistent room** — a whole-document sweep. A dangling exit is exactly the extraction defect that would otherwise surface in stage 4.4 as an unexplainable crash.
- **Unconditional-exit reachability from the start is exactly 16 rooms** — the entire surface world and no more. Everything underground sits behind the kitchen window (a door exit) or the trap door (a `PER` routine), so the number is a real statement about Zork I's topology: if it grows, an exit that should be gated has stopped being gated.

One genuine bug was caught by the tests rather than by review: the start room was not marked visited at load, so walking out and back read as a first visit — which would have mis-scored first-entry room values in 4.3.

Three other initial failures were **wrong test assumptions, not wrong code**, and are worth recording because each is a trap for the next reader: the leaflet's id is `ADVERTISEMENT`, not `LEAFLET`; "Behind House" is the *display name* of the room whose id is `EAST-OF-HOUSE` (the engine must never conflate id and `name`); and the 16-room reachability figure that looked too low is correct.

### Status

Stage 4.1 ✅ — the exit criteria ("can walk the map; state transitions correct") are met against the full Zork I document. `npm test` 22/22, `npm run typecheck` clean.

Next: stage 4.2, the command parser (tokenization, vocabulary lookup, syntax matching, disambiguation) against the `vocabulary` section — 267 extracted parser rules.

---

## v0.5.18 — Project Scope, Trademark Notices, `.avb` Format (Milestone 5, stage 5.1 partial)

**Date:** 2026-07-20

### Changes

- **ADR 0002 amended — "Scope of Portability: source frontends, not story files".** Prompted by asking whether the project should eventually run any Z-machine-compatible interactive fiction. The ambition widens to an **IR-native engine with pluggable source frontends** (ZIL is frontend #1; the rest of the ZIL family — Zork II/III, Enchanter, Planetfall — is the cheap expansion, reachable through the existing importer; Inform 6 is a plausible frontend #2). **Compiled story files stay explicitly out of scope**: executing a memory image re-raises the ADR's existing ZLR/ZVM objection verbatim, since `speech.speaker` and `player-moved` room ids are unrecoverable from `zork1.z3`, and it would be a second engine sharing nothing with the IR evaluator but the event contract. Three consequences bind M4: builtins implement the Z-Machine Standard rather than Zork I's call sites; no `zork1` identifier appears in `engine/`; and the first portability test is **importing Zork II after M4 works**, not a speculative abstraction layer built in advance.
- **Trademark notices added** to `README.md` and `NOTICE`. Copyright and trademark are separate regimes and the project had already solved both without recording it: the MIT grants cover the ZIL source *including the prose in its string literals*, so plot, puzzles, and room text are all licensed for reuse — the storyline was never the exposure. Trademark risk is branding, handled by the v0.1.1 rename. The notices attribute ZORK/INFOCOM to Activision and MICROSOFT/COMIC CHAT to Microsoft, disclaim affiliation, state that no trademark licence is implied by MIT, Apache-2.0, or any file in the repo, and record that trademark names appear nominatively — identifying the historical works and reproducing the `ZORK I` status banner that golden-transcript parity requires.
- **README de-staled.** WebAssembly references removed: Gate B dropped WASM in ADR 0002 (v0.4.x) and the README had never caught up, still describing "a modern browser-native architecture powered by WebAssembly" and a `WebAssembly Runtime` pipeline stage. The architecture diagram now shows the TypeScript engine emitting the versioned JSON event contract. The repository-structure block was rewritten against the real tree — it had listed `importers/`, `zork/`, `wasm/`, `graph/`, `wiki/`, `tests/`, `scripts/`, `assets/`, and `renderer/`, most of which have never existed, and showed `engine/`/`web/` as present rather than planned.
- **`.avb` avatar format decoded — new `art/` module.** `art/poc/avbdec.py` (stdlib only) parses Comic Chat avatar files and writes PNGs named by part, emotion, and intensity. Verified against the whole corpus: **191/191 files parse, 4656/4656 images decode.** Image storage splits three ways — 2906 embedded BMP, 1364 zlib + masked-mono, 386 zlib + local palette — so a browser port needs BMP parsing (including BI_RLE4), native `DecompressionStream`, and 2bpp unpacking, with no exotic dependencies.
- **`docs/AVB_FORMAT.md`** is the normative spec. It exists chiefly to record five behaviours that a reader written from the historical header alone gets wrong, **four of them silently**: (1) `AK_OFFSET_ADJUSTMENT` is a 32-bit read — the "signed 2-bit integer" comment is a typo — and accumulates across records, applying only to non-zero offsets; (2) body, face, and torso carry *different field sets*, torso having no `x`/`y`, so a shared layout misaligns every torso record into plausible-looking garbage rather than an exception; (3) `MaskedMonoPalette` is the DIB colour table for the Win32 three-DIB split, **not** the render palette — the real semantics are `00=blank 01=aura 10=black 11=white`, and using the array yields a correctly-shaped but dark-red/navy figure; (4) intensity is `byte/255` per `avatario.cpp:158`, while the `/10` + `IndexToByte` path in that same file is the network protocol; (5) four images are BI_RLE4-compressed BMPs, duplicated across four version directories.
- **Asset inventory established.** 31 distinct characters (5 are single-pose stubs), 18–43 poses each, every pose tagged with an 8-point emotion wheel plus intensity, and `AT_COMPLEX` avatars compositing face and torso separately — so effective variety far exceeds raw pose counts. Against Zork I's five NPCs (`GHOSTS`, `BAT`, `CYCLOPS`, `THIEF`, `TROLL`) characters are abundant. **Backdrops are not**: the format defines `AT_BACKDROP` but no instance exists in the corpus, leaving three 315×315 `.bmp` files against 110 rooms.

### Status

Documentation and tooling only — **no engine, IR, or artifact changes; M4 remains the next actual work.**

Stage 5.1 is partly started ahead of schedule: `.avb` decoding is solved and specified, which de-risks the M5 art pipeline. Remaining 5.1 work is face/torso compositing (`GetHeadAndBodyFromEmotion`), mask and aura planes for DIB-format poses, and the TypeScript port of the decoder.

Two M5 questions are now open and recorded in HANDOFF rather than settled here: the backdrop gap (3 available, 110 needed), and panel grammar — Comic Chat assumes dialogue between peers, while Zork is second-person narration whose turns mostly emit `narration` with no speaker, so caption boxes must be first-class and "who is on screen when nobody speaks" needs an answer.

---

## v0.5.17 — Licensing, Provenance, Public-Repo Prep

**Date:** 2026-07-19

*Backfilled in v0.6.8: this entry lived only in HANDOFF.md and was never written to the WORKLOG.*

### Changes

Documentation and repo hygiene only. No engine, IR, or artifact changes. Triggered by a question about whether ZILF/ZLR make this project redundant — they do not, and the reasoning is now written down instead of being tribal knowledge.

- **ADR 0002 gained an "Alternatives Considered" section.** The ADR argued TypeScript vs. C++/WASM but never recorded why an engine is written at all rather than reusing an interpreter. A compiled story file is an opaque memory image; `speech.speaker` and `player-moved` room ids are recoverable from the IR and not from `zork1.z3`. **The Z-Machine Standards Document 1.1 is now the normative source for M4 Group A builtin semantics** — read `reference/z-machine-standards-1.1.md`, not an interpreter's source.
- **ZLR ships no license** (verified: no LICENSE/COPYING, no headers in `ZLR.VM/*.cs`; the Gargoyle licenses in the tree cover a vendored dependency). Default copyright applies — stricter than GPL. Last-resort reference only; if consulted, describe observed *behavior*, not implementation, and record it in ADR 0002.
- **Build tools attributed**: ZILF/ZAPF 0.11.1 (GPL-3.0), Frotz 2.55 (GPL-2.0-or-later) in `NOTICE` + `THIRD_PARTY.md`. Invoked as external executables — not vendored, so no copyleft reach into Apache-2.0 source. Both upstream imports verified to carry genuine Microsoft MIT grants.
- **`reference/`** created and gitignored: Z-Machine Standard, Comic Chat paper (moved from `docs/`), ZILF/ZLR sources. See `reference/README.md` — it warns that `reference/zilf/AGENTS.md` is ZILF's own agent guide and has **no authority here**.
- **299 Comic Chat build outputs untracked** (~33 MB: `.exe`/`.dll`/`.ocx`/`.lib`/`.class`/`.map`/`.sym`, plus a vendored Sun JDK). Source, docs, and 661 comic art files kept — the `.avb` art is an M5 input. `original-projects/zork1/` untouched.
- **`original-projects/` stays version-controlled** — MIT permits redistribution, `AGENTS.md` requires it, and `importer/`/`ir/`/`verification/` read from it. Gitignoring it was considered and rejected.
- Commit authorship moved to `11153426+dkdev24@users.noreply.github.com`; history rewritten.

### Status

Repo prepared for public release but not made public. Nothing further blocks it.

---

## v0.5.16 — World-Document Gap 3: Nested Table Elements + ITABLE (stage 3.5)

**Date:** 2026-07-19

### Changes

- **IR schema 0.13.0 — a table element may be a `{table, offset}` pointer; no new behavior ops.** ZIL nests tables inside tables (`VILLAINS` is an LTABLE of three anonymous `<TABLE …>` rows, one per villain). The slot holds an *address* in ZIL, which is exactly what `TableRef` already models from batch (h) — so the faithful lowering reuses the runtime's existing pointer value rather than inventing inline storage. `<GET ,VILLAINS .CNT>` hands HERO-BLOW a pointer it indexes straight through with `<GET .OO ,V-VILLAIN>`, unchanged.
- **Nested tables get a derived `parent#index` id** and are emitted as ordinary top-level entries. They carry **no pointer variable** — unlike v0.5.15's named tables, ZIL never gave them a name, so the flat-id exception does not widen. `test/nested-tables.test.ts` asserts both halves of that (derived ids have a table parent; no global claims one).
- **Two element forms the extractor also had to learn**, both found only after the nesting worked: a bare `<>` slot (the cyclops has no weapon — was denied as an unsupported `Form`), and an atom naming a table-valued global or a numeric `CONSTANT`. The latter two matter for the melee message tables: each villain row's `V-MSGS` slot names `TROLL-MELEE`/`THIEF-MELEE`/`CYCLOPS-MELEE`, and those are deeply nested `(PURE)` LTABLEs whose leaf rows interleave string chunks with the `F-WEP`/`F-DEF` marker constants the renderer compares numerically. Declaring the atom pulls the whole tree into the closure — **tables 19 → 132**, globals 86 → 103.
- **`<ITABLE NONE n>` extracts as zero-filled `itable` storage** (P-PRSO/P-PRSI, 50 words each). The `itable` kind already existed in the schema but nothing produced it. It addresses exactly like `table` — the length is baked into `elements`, so only the initializer ever differed; `RuntimeTable` gains the kind and needs no other change. The byte-addressed `(LEXV)`/`(BYTE LENGTH)` ITABLEs in `gparser.zil` stay **denied by design**: they are READ's parser buffers (ADR 0001 Group A), not world state, and are not element-addressable.
- **Validator** accepts a `{table, offset}` element and resolves it through the existing `tableRefs` pass, so a pointer at a missing table fails with `unknown table "…"` like any other.
- **Unlocked NOT-HERE-OBJECT-F** (345 → 346 routines). **HERO-BLOW advanced past the document gap to `operator RANDOM`** — a Group A engine builtin by design, so it is no longer a world-doc blocker; the catalog holds at 32 because NOT-HERE-PRINT (`PRINTB`) entered as the closure widened. Unresolved refs steady at 39/292.
- 184 tests pass (9 new in `test/nested-tables.test.ts`): the VILLAINS row layout by V-* constant, the cyclops' false slot, the melee tree walked to its leaves, derived-id invariants, P-PRSO's shape, an end-to-end runtime read of a villain row through the stored pointer, and the validator's accept/reject pair. The v0.5.15 "every table has a pointer" sweep is now scoped to named tables.

### Status

Stage 3.5 world-document unit **complete** — all three gaps (meta entities, table-valued globals, nested tables) closed. The document now loads and boots a world without hand-seeding, which was the precondition for M4.

Remaining catalog is Group A engine builtins by design plus the one-off tail (`NEXTP`, `NTH`, String-in-statement-position, bare `,ONBIT`/`,ACTORBIT`, non-atom `FSET?` flag). Next: **M4 engine core** against the Group A builtin contract.

---

## v0.5.15 — World-Document Gap 2: Table-Valued Globals (stage 3.5)

**Date:** 2026-07-19

### Changes

- **IR schema 0.12.0 — a global may hold a `{table, offset}` pointer; no new behavior ops.** ZIL's `<GLOBAL X <TABLE …>>` declares *two* things, table storage and a variable pointing at it, but extraction emitted only the table. `resolveName` still returned `{op:"global", id}` — the name is in `globalForms` — against a binding the document never contained. `needGlobal` now emits both
- **The gap was 6× wider than batch (h) reported.** It surfaced as a LAMP-TABLE observation; an audit of the artifact found **29 unbound reads across all 19 table-valued globals** (YUKS, INDENTS, DUMMY, RIVER-SPEEDS, HELLOS, …). Globals 66 → 86
- **The pointer has to be a variable, not a constant.** The tempting fix — a `{op:"table", id}` constant expr parallel to `entity` — is wrong: I-LANTERN ends `<SETG LAMP-TABLE <REST .TBL 4>>` and I-CANDLES the same, so the countdowns advance precisely by *retargeting the binding*. A constant reference would have been unwritable. Keeping it a global also meant zero changes to the behavior vocabulary — `,LAMP-TABLE` and `<SETG LAMP-TABLE …>` already lowered correctly, they just had nothing to resolve against
- **Table and pointer share the one ZIL name** — the single exception to the flat-id rule, enforced narrowly in `claimId` (a `tables` id may reuse a `globals` id only when that global's value points at that table). The runtime already keeps variables and table storage in separate namespaces (`poc/world.ts` has distinct `globals` and `tables` records), so the collision is only in the validator's bookkeeping, and synthesizing a second id would cost the traceability the IR's ids exist for
- **Validator tightened**: the `global` reference kind was `global-or-table`, which accepted `{op:"global"}` naming a table — that looseness is what let 29 unbound reads validate cleanly for five batches. Now that every read is bound, it resolves strictly against `globals`, and the artifact still validates. New checks: a global's pointer target must be a declared table, offsets must be non-negative integers
- 175 tests pass (10 new in `test/table-globals.test.ts`): both entities emitted, every table carrying its pointer, an artifact-wide sweep asserting no behavior read names a missing global, the retargeting `set-global` shape, five validator cases, and a golden that **boots the lamp daemon from document state alone** — a loader binding `globals` and `tables` straight out of `zork1.world.json`, no hand-seeding, burning through all three dimming messages to the terminator with the PURE table never written. This is the batch (h) golden with its hand-seeded pointer removed, which is the point

### Status

Stage 3.5 world-document gap 2 complete. Routine counts unchanged (345 extracted, 32 catalogued, 39/292 unresolved — this gap blocked no routines, it corrupted the ones already extracted).

Next, last of the world-document unit before M4: **nested table elements** — `VILLAINS` holds `<TABLE …>` forms (HERO-BLOW), and P-PRSO's `<ITABLE …>` initializer (NOT-HERE-OBJECT-F).

---

## v0.5.14 — World-Document Gap 1: Meta Entities (stage 3.5)

**Date:** 2026-07-19

### Changes

- **IR schema 0.11.0 — `metaEntities` section, no new behavior ops.** The 13 routines catalogued on `unknown name ,ROOMS` / `,GLOBAL-OBJECTS` were never blocked by the behavior vocabulary: `resolveName` had nothing to resolve those names *to*, because stage 3.2 dropped ZIL's three world-tree scaffolding objects entirely. They are now emitted as `{id, role, location?}` anchors with the roles `rooms` / `global-objects` / `local-globals`, which puts them in the flat entity namespace — so `,ROOMS` lowers to an ordinary `{op:"entity"}` and the existing `in?` / `first` / `next` / `equal?` ops work against them with no change
- **Deliberately not entities-with-properties.** GLOBAL-OBJECTS' 13-flag FLAGS list and LOCAL-GLOBALS' DESCFCN/FDESC/SYNONYM are ZIL compile-time property-slot allocation, not game state; carrying them would import noise the game never reads. A meta entity holds a role and a tree position, nothing else
- **Membership stays derived, never duplicated.** An engine parents rooms under the `rooms` anchor (document order) and objects under the anchor matching their `location.kind`; the rooms list and the `global`/`local-globals` location kinds remain the single place membership is written down. Only the anchors' own nesting is stored, because gglobals.zil puts LOCAL-GLOBALS *inside* GLOBAL-OBJECTS and gparser.zil's scope walk climbs that edge. Validation enforces one anchor per role, meta-only parents, and no cycles — a cycle would leave the object tree rootless
- **Extraction: 324 → 345 routines, catalog 43 → 32.** Unlocked DESCRIBE-ROOM, FIRSTER, HACK-HACK, I-THIEF (the batch (h)/(i) prediction), PRE-TURN, ROPE-FUNCTION, TREE-ROOM, V-DISEMBARK, V-EAT, V-EXIT, V-FIND; RANDOMIZE-OBJECTS and V-CLIMB-UP advanced to their real blockers (RANDOM, GETPT). Unresolved refs 29 → 39/292 (90% → 87%) — the widened closure reached more Group A builtin references, so the ratio moved while nothing regressed
- 165 tests pass (15 new in `test/meta-entities.test.ts`): the emitted anchors and their nesting, that they appear in neither `rooms` nor `objects`, that all 13 blocked routines cleared, that `,ROOMS` lowers to `entity` and not `global`, six validator rejections (unknown role, duplicate role, id collision, non-meta parent, cycle), and a FIRSTER golden — no header for a room because the room is in ROOMS, a header for a sack because it is not
- `docs/IR_SCHEMA.md` gained a Meta entities section and had its version header and history backfilled through 0.7.0–0.11.0 (it had drifted at 0.6.0 since batch b)

### Status

Stage 3.5 world-document gap 1 complete. Handler coverage 253/292 (87%); catalog down to 32 — Group A engine builtins by design, plus the two remaining world-document gaps and the one-off tail.

Next, finishing the world-document unit before M4: **table-valued globals** (`<GLOBAL LAMP-TABLE <TABLE …>>` declares both a binding and a table; `resolveName` still lowers it to `{op:"global"}` while extraction files it under `tables`, so the read has no target) and **nested table elements** (`VILLAINS` holds `<TABLE …>` forms — HERO-BLOW; plus P-PRSO's `<ITABLE …>` initializer).

---

## v0.5.13 — Complex Behavior Batches i + j: Computed Application and RFATAL (stage 3.5)

**Date:** 2026-07-19

### Changes

- **Batch (i) — IR schema 0.10.0**: expr `apply`, calling a routine named at run time. `routine` evaluates to a routine-name string (batch (d)'s QUEUE-target convention); the corpus form is always `<APPLY <GETP .O ,P?ACTION> …>`, an object's action handler. A false/absent name yields false **without calling**, matching the Z-machine's `call` to address 0 — the corpus depends on this to probe objects with no ACTION property, so it is semantics, not defensiveness. Unlike `call`, `apply` contributes no static call target to the validator: reachability comes from the world document's `action` refs. Unlocked TROLL-FCN (the blocker batch (f) predicted), AWAKEN, DESCRIBE-OBJECT, V-BOARD
- **Batch (j) — RFATAL, no new vocabulary**: the macro is `<PROG () <PUSH 2> <RSTACK>>` — return gmain.zil's `M-FATAL` (2) from the routine. The action-handler protocol is already ordinary values (`M-NOT-HANDLED` = false, `M-HANDLED` = 1, `M-FATAL` = 2) and only the M4 parser loop, a Group A builtin, compares against it — so RFATAL lowers to `return` of the constant 2, an extractor-only lowering like the batch (e)/triage ones and with no schema impact of its own. **The RSTACK detail is load-bearing**: JIGS-UP ends `<PROG () … <RFATAL>)>`, so lowering RFATAL like ZIL's `<RETURN>` would have produced a `break` that merely left the PROG and let the routine run on past the player's death. Unlocked CANDLES-FCN, ITAKE, JIGS-UP, PRE-BOARD, V-TELL
- **Extraction: 312 → 324 routines, catalog 50 → 43, unresolved refs 34 → 29/292 (88% → 90%).** The world document grew to 66 globals and 19 tables (from 64/17) as the widened closure reached FUMBLE-NUMBER/FUMBLE-PROB and the ABOVE-GROUND/INDENTS tables — world extraction emits what the closure references
- 150 tests pass (9 new in `test/behavior-35i.test.ts`, 6 in `test/behavior-35j.test.ts`): apply dispatch by name and via a property, the call-to-0 rule with a non-call assertion, a non-routine target rejected, the AWAKEN golden both ways (revives an unconscious villain applying F-CONSCIOUS; leaves a conscious one untouched), RFATAL's lowering shape, that JIGS-UP's fatal return really is nested inside a PROG, and that a fatal return inside a loop exits the routine rather than the loop

### Status

**Stage 3.5 Group B is complete** — every named future batch (f)–(j) has landed. Handler coverage 263/292 (90%); catalog down to 43, which is now Group A engine builtins by design (GETPT/GETB, BAND/BOR, RANDOM, READ, DIROUT/DIRIN, SAVE/RESTORE/RESTART/VERIFY/QUIT), the world-document gaps, and a short tail of one-offs: `<NEXTP …>` (I-SWORD, OTHER-SIDE), `<NTH …>` (I-CYCLOPS), a String in statement position (GRATE-FUNCTION), `,ONBIT`/`,ACTORBIT` as bare names (LIT?, V-SAY), a non-atom FSET? flag (GOTO), P-PRSO's `<ITABLE …>` initializer.

Next: the world-document gaps as one unit before M4 — the meta entities ROOMS/GLOBAL-OBJECTS/LOCAL-GLOBALS (13 catalogued routines, the largest single remaining group, and what blocks I-THIEF), nested VILLAINS table elements, and the table-valued globals from batch (h). M4 (engine core) is the first consumer that loads the document and boots a world, which is exactly what those gaps break.

---

## v0.5.12 — Complex Behavior Batch h: Table Views (stage 3.5)

**Date:** 2026-07-19

### Changes

- **IR schema 0.9.0** (ADR 0001 appendix): expr `table-rest` — ZIL `<REST tbl bytes>`, an interior pointer into a table's storage. Runtime values gain a table pointer: `BehaviorValue` splits into `BehaviorLiteral` (what a document may hold — `const` and table elements stay scalar, so the document's value domain is unchanged) and the runtime union adding `TableRef` = `{table, offset}`. A bare table id is the same pointer at offset 0, so views compose and `table-get`/`table-set` read through them. The offset counts **elements, not bytes**: the extractor halves ZIL's byte count and denies an odd or non-literal one, byte addressing being exactly what the IR's platform-independence rule excludes. LTABLEs are not viewable (the count word sits in the slot a view skips) — extractor and interpreter both say so rather than mis-index. Table pointers compare structurally, matching the Z-machine address compare
- **Extraction: 309 → 312 routines, catalog 52 → 50, unresolved refs 34/292 (88%, unchanged).** Unlocked I-LANTERN, I-CANDLES and their shared helper LIGHT-INT. The ref ratio is flat because all three are reached by direct call and QUEUE name string rather than by a world-document reference — the gain shows in the catalog, not the refs
- **Batch (d) countdown goldens complete**: the extracted lamp daemon walks its PURE table through all three dimming messages ("a bit dimmer" → "definitely dimmer now" → "nearly out") and burns out at the 0 terminator, clearing ONBIT and setting RMUNGBIT — advancing the pointer 2 elements per stage and never writing the table
- 135 tests pass (11 new in `test/behavior-35h.test.ts`): extraction shapes (the `<REST .TBL 4>` → offset-2 halving, nothing left catalogued on `<REST …>`), op semantics (offset reads, view composition, bare-id equivalence, ltable refusal), and the countdown golden

### Status

Stage 3.5 batch (h) complete. Handler coverage 258/292 (88%); catalog down to 50. Next per ADR 0001 Group B: (i) apply (TROLL-FCN, AWAKEN, DESCRIBE-OBJECT, V-BOARD), (j) RFATAL, and the world-document meta entities that unblock I-THIEF.

**Surfaced, not fixed:** ZIL declares the countdown tables as `<GLOBAL LAMP-TABLE <TABLE …>>` — both a global binding and a table — but stage 2.1 world extraction emits only the table. `,LAMP-TABLE` therefore has no initial value in the document and an engine cannot bind the pointer at load time; the batch (h) golden seeds it explicitly. The fix belongs to world extraction, not the behavior vocabulary.

---

## v0.5.11 — Complex Behavior Batch g: Expression-Position Cond + Deterministic Arithmetic (stage 3.5)

**Date:** 2026-07-19

### Changes

- **IR schema 0.8.0** (ADR 0001 appendix): expr `cond` — a conditional in expression position (ZIL COND inside AND/OR or as an argument), the same shape as the statement op and yielding the taken clause's last value (predicate value on an empty body, false when no clause fires), so the stage 3.4 expression-oriented semantics now hold in both positions. Plus the deterministic arithmetic ops `mod` (truncating remainder, sign of the dividend as on the Z-machine), `min` (n-ary source forms → left folds, per batch (a)), and `abs` (−32768 wraps to itself under the shared 16-bit signed wrap). `RANDOM` stays denied — randomness remains an engine builtin per the determinism rule — as do the bit ops. Validator threads the enclosing loop/block depth into expression position so a `cond` clause body's `break`/`continue` is still checked
- **Extraction: 305 → 309 routines, catalog 56 → 52, unresolved refs 37 → 34 (88% handler coverage).** Unlocked CANARY-OBJECT, SHAKE-LOOP, SAILOR-FCN (the corpus's only `MOD`), CYCLOPS-FCN (its only `MIN`). The remaining batch (g) candidates advanced past ABS/cond to their real blockers: I-CYCLOPS → `<NTH …>`, I-THIEF → the `,ROOMS` meta entity (a world-document gap, not a behavior op), GRATE-FUNCTION → a String in statement position. `ABS` is lowerable but currently unexercised by the corpus, since its only user I-CYCLOPS still catalogs on `<NTH …>`
- 124 tests pass (11 new in `test/behavior-35g.test.ts`): artifact shapes (`mod` in SAILOR-FCN, `min` in CYCLOPS-FCN), the advanced catalog reasons, and op semantics — mod's dividend sign, min, abs's −32768 wrap, and expr-position cond's taken-clause / empty-body / no-clause-fires / nested-in-`and` cases
- **Session note:** the batch was interrupted mid-flight by a usage limit. Source work was already complete and typechecking; the resume finished the `irVersion` fixture bumps (sample + regenerated artifact), corrected a stale `I-CYCLOPS`-fails-on-`ABS` assertion in `behavior-35d.test.ts` to the new `<NTH` frontier, and added the batch (g) tests. No source logic changed on resume

### Status

Stage 3.5 batch (g) complete. Handler coverage 258/292 (88%). Next per ADR 0001 Group B: (h) table-rest (completes the I-LANTERN/I-CANDLES countdown goldens), (i) apply, (j) RFATAL, and the world-document meta entities that unblock I-THIEF. Newly surfaced and not yet assigned to a batch: `<NTH …>` and String-in-statement-position.

---

## v0.5.10 — Complex Behavior Batch f: Expression-Position Statement Ops (stage 3.5)

**Date:** 2026-07-19

### Changes

- **IR schema 0.7.0** (ADR 0001 appendix): exprs `tell`, `set-flag`, `clear-flag` — output and flag mutation in expression position (ZIL TELL/CRLF/PRINTN/FSET/FCLEAR inside AND/OR predicates), same shapes as the statement ops, yielding true (batch (c) precedent). PRINTN off the deny list in both positions → TELL number part; PRINT/PRINTB/PRINC/PRINTD stay denied (builtin I/O). Validator shares one tell-parts checker across statement and expression position; reference interpreter implements the three ops
- **Extraction: 298 → 305 routines, catalog 61 → 56, unresolved refs 40 → 37 (87% handler coverage).** Unlocked the whole batch (f) target list: I-XB, RUSTY-KNIFE-FCN, I-RFILL, SAND-FUNCTION, V-DIAGNOSE, plus FIGHT-STRENGTH and the I-CURE healing daemon via V-DIAGNOSE's closure. TROLL-FCN advanced from the TELL-CR symptom to its real blocker, `APPLY` (batch (i))
- 113 tests pass (8 new in `test/behavior-35f.test.ts`): artifact shapes (tell inside `and` in RUSTY-KNIFE-FCN, set-flag inside `and` in I-RFILL, PRINTN part in V-DIAGNOSE), op semantics, and an extracted-corpus golden — I-XB warns the wraiths at the Entrance to Hades and clears XB

### Status

Stage 3.5 batch (f) complete. Handler coverage 255/292 (87%). Next per ADR 0001 Group B: batch (g) expression-position cond + abs/mod/min, then (h) table-rest, (i) apply, (j) RFATAL.

---

## v0.5.9 — Stage 3.5 Builtin Triage: Deliberate Engine-Builtin List

**Date:** 2026-07-19

### Changes

- **Complete triage of the 61 catalogued routines into ADR 0001's new "Deliberate engine-builtin list" section.** Group A stays catalogued by design — Z-machine I/O and persistence meta verbs (SAVE/RESTORE/RESTART/QUIT/VERIFY/SCRIPT/UNSCRIPT/RECORD/UNRECORD/COMMAND-FILE/ECHO/VERSION), randomness (V-RANDOM, PICK-ONE), and parser/scope/movement machinery (LIT?, GOTO, V-WALK, V-LEAP, GLOBAL-IN?, PRE-FILL, OTHER-SIDE, NOT-HERE-OBJECT-F, V-SAY). Group B is missing IR vocabulary with named future batches: (f) expression-position tell/set-flag/clear-flag + PRINTN, (g) expression-position cond + abs/mod/min, (h) table-rest views (unlocks I-LANTERN/I-CANDLES countdowns), (i) apply over routine-name values, (j) RFATAL fatal return, plus world-document gaps (ROOMS/GLOBAL-OBJECTS/LOCAL-GLOBALS meta entities, nested VILLAINS tables) and two M4-protocol deferrals (LOUD-ROOM-FCN's inline READ, I-SWORD's exit reflection)
- **Three extractor-only lowerings that fell out of the triage** (no schema change): Number in statement position → value statement (GO-NEXT's per-turn codes); bare room/object atom in expression position → entity (TRAP-DOOR-FCN's `LIVING-ROOM`, an original missing-comma quirk ZIL compiles identically); `,NAME` GVal naming a routine → routine-name string joining the extraction closure (BELL-F's `,LLD-ROOM`, whose routine-vs-room compare stays always-false as on the Z-machine)
- **Extraction: 295 → 298 routines, catalog 64 → 61, unresolved refs 42 → 40 (86% handler coverage).** Unlocked BELL-F, GO-NEXT, TRAP-DOOR-FCN. 105 tests pass (4 new in `test/behavior-35-triage.test.ts`: Group A stays catalogued; each lowering verified in the artifact)

### Status

Stage 3.5 triage complete: every catalogued routine now has a written disposition (engine builtin vs named future batch). Next: batch (f) expression-position statement ops, or Stage 5.1 (Comic Chat) as filler; M4 engine core can start against the Group A builtin contract.

---

## v0.5.8 — Complex Behavior Batch d: Daemons/Timers (stage 3.5)

**Date:** 2026-07-19

### Changes

- **Daemon protocol decided (ADR 0001 appendix): the gclock.zil clock is an engine builtin, not extracted IR.** `QUEUE`/`INT`/`CLOCKER` join the DEFMAC builtins (`ENABLE`, `DISABLE`) — calls lower to `call`, bodies are never extracted (their C-TABLE `REST`/`APPLY` vector arithmetic is Z-machine plumbing). Protocol: an interrupt record is a 3-slot table `[C-ENABLED?, C-TICK, C-RTN]` addressed by the gclock constants 0/1/2; `QUEUE`/`INT` return the record, so extracted `<GET <INT I-THIEF> ,C-ENABLED?>` code works unchanged via `table-get`/`table-set`. `CLOCKER` iterates newest-first, skips tick 0, decrements, fires when the pre-decrement tick was ≤ 1 (−1 = demon, every turn), honors `CLOCK-WAIT`, increments `MOVES`. `P-WON` demon-region gating deferred to engine stage 4.5. Reference implementation in `ir/poc/world.ts`
- **QUEUE name-string targets wired into the worklist**: routine names passed by atom (`<QUEUE I-MATCH 2>`) now join the extraction closure — CLOCKER applies them at run time, so they are as reachable as direct call targets. Also added `<VALUE X>` expr → global read (identical to `,X`)
- **Extraction: 288 → 295 routines, catalog 59 → 64, unresolved refs 65 → 42 (86% handler coverage).** Unlocked daemons: I-MATCH, I-XC, I-REMPTY, I-MAINT-ROOM, I-RIVER, I-FOREST-ROOM (+ helpers FOREST-ROOM?, MUNG-ROOM); QUEUE left the extracted set (now builtin, its old extraction leaned on catalogued INT)
- **Countdown golden**: the extracted I-MATCH daemon runs end-to-end through reference CLOCKER ticks — silent at tick 2→1, "The match has gone out." + FLAMEBIT/ONBIT cleared at 1→0, dormant after; demon (−1) fires every turn; `CLOCK-WAIT` skips exactly one tick. 101 tests pass (9 new; 2 stale batch-b/e assertions updated to the builtin decision)
- Remaining daemons catalog on the true builtin frontier: I-LANTERN/I-CANDLES (`<REST …>` countdown-table pointer advance over LAMP-TABLE/CANDLE-TABLE), I-CYCLOPS (ABS), I-SWORD (NEXTP), I-THIEF (expression-position `<COND …>`), I-XB (TELL `CR` as argument), I-RFILL (FSET form shape)

### Status

Stage 3.5 batch (d) complete. Handler coverage 250/292 (86%). Next: extract-vs-builtin triage of the long tail (`,ROOMS`/`,GLOBAL-OBJECTS` iteration, RFATAL, GETPT/PTSIZE, SAVE/RESTORE/QUIT/VERIFY, DIROUT/DIRIN, RANDOM/MOD/MIN, `<REST …>`, expression-position `<COND …>`) and write the deliberate builtin list.

---

## v0.5.7 — Complex Behavior Batch e: Compile-Time Macro Resolution (stage 3.5)

**Date:** 2026-07-19

### Changes

- **No schema change** — extractor-only deterministic lowerings (ADR 0001 appendix): `%<COND …>` MacroEval resolved in statement/expression/COND-clause position via the stage 3.3 ZORK-NUMBER gate machinery (`==?`/`N==?`, `OR` of gates, `T`/`ELSE`); the selected clause's quoted form is unquoted and substituted; no-live-clause macros yield ZIL `<>` (false). `#DECL` Chtype nodes filtered like comments; empty `<>` forms in statement position lower to false-valued expression statements
- **Extraction: 247 → 288 routines, catalog 88 → 59, unresolved refs 94 → 65.** Cleared clusters: MacroEval-in-statement (16), quoted COND clauses (15), Chtype/DECL (8), empty-form heads (7). Unlocked: V-PRAY, V-ATTACK, V-SCORE, V-LOOK-INSIDE, V-TREASURE, ROBBER-FUNCTION, QUEUE, PRINT-CONT, SCORE-UPD, AXE-F, CRETIN-FCN, RBOAT-FUNCTION, and 23 more
- Verified the gate selection end-to-end: extracted V-PRAY contains the Zork I clause (SOUTH-TEMPLE → GOTO FOREST-1) and not the Zork II/III `NULL-F` variant; AXE-F's `<>` clause body executes to false in the interpreter. 92 tests pass (3 new; 1 batch-b assertion updated — PRINT-CONT now extracts)
- Remaining 59 catalogued routines are dominated by the deliberate engine-builtin frontier: `,ROOMS`/`,GLOBAL-OBJECTS` scope iteration (11), RFATAL/parser dispatch (5), GETPT/PTSIZE (4), SAVE/RESTORE/RESTART/QUIT/VERIFY meta verbs, DIROUT/DIRIN, RANDOM/MOD/MIN, plus a few stragglers (`<REST …>`, expression-position `<COND …>`, TELL `CR` as argument — TROLL-FCN)

### Status

Stage 3.5 batch (e) complete. Handler coverage 227/292 (78%). Next: batch (d) daemons/timers (CLOCKER protocol, QUEUE name-string targets into the worklist: I-THIEF, I-LANTERN, I-CANDLES, …), then triage the long tail into "extract" vs "engine builtin" and write the deliberate builtin list.

---

## v0.5.6 — Complex Behavior Batch b: Loops + Object-Tree Iteration (stage 3.5)

**Date:** 2026-07-19

### Changes

- **IR schema 0.6.0** (ADR 0001 appendix): stmts `loop` (ZIL `REPEAT ()`), `block` (`PROG ()` — runs once, yields last value), `break` (exits nearest loop/block with value), `continue` (`AGAIN`); exprs `first`/`next` (object-tree iteration). Exact ZIL activation semantics: `RETURN` inside REPEAT/PROG lowers to `break`, outside to routine `return`; `RTRUE`/`RFALSE` always exit the routine. Validator statically rejects `break`/`continue` outside a container. All corpus REPEAT/PROG binding lists are empty; non-empty ones denied
- **POC world gains ordered child lists** (`children`, kept consistent with `locations`): `move` inserts at the FRONT (Z-machine `insert_obj`), `remove` unlinks; `first`/`next` walk sibling order. Initial order = world-document order; the Kitchen sack/bottle ordering question (Open Issues) becomes relevant when stage 4.4 parity starts
- **Extraction: 228 → 247 routines, catalog 104 → 88, unresolved refs 110 → 94.** Unlocked: V-OPEN, V-INVENTORY, V-WAIT, ROB, OTVAL-FROB, TOUCH-ALL, WEIGHT, FIND-WEAPON, THIEF-IN-TREASURE, DESCRIBE-OBJECTS, WATER-F, MACHINE-F, MIRROR-MIRROR, HELD?, and more. `defaults` gets its first corpus users (OTVAL-FROB → TROPHY-CASE, V-WAIT → 3). New call targets catalogued: CLOCKER (daemon dispatcher, batch d), PRINT-CONT
- **Historical quirks preserved, not fixed**: OTVAL-FROB discards its recursive call's value in the original ZIL, so nested treasure never scores — asserted by test (mini trophy-case world: egg 5 + coffin 15 = 20; sceptre-in-coffin uncounted)
- Diagnosis of the "COND clause is not a list" cluster (15 routines: V-PRAY, V-LOOK-INSIDE, PRE-PUT, …): compile-time `%<COND (ZORK-NUMBER gates)>` producing quoted clauses — batch (e) will reuse the stage 3.3 gate-resolution machinery (ZORK-NUMBER=1)
- Corpus routines executed by the reference interpreter in tests: FIND-WEAPON over a mini troll/thief tree, OTVAL-FROB recursion via a test builtin shim, TOUCH-ALL subtree flagging. 89 tests pass (12 new)

### Status

Stage 3.5 batch (b) complete. Remaining catalog clusters: MacroEval bodies + quoted COND clauses (batch e, 31 first-blockers), daemons/timers (batch d: CLOCKER/QUEUE machinery), parser/scope machinery destined for engine builtins (,ROOMS / ,GLOBAL-OBJECTS iteration, GETPT/PTSIZE, DIROUT/DIRIN, RFATAL, SAVE/RESTORE/QUIT). End state is a deliberate builtin list, not an empty catalog.

---

## v0.5.5 — Complex Behavior Batches a+c (stage 3.5 begins)

**Date:** 2026-07-19

### Changes

- **IR schema 0.5.0** — governed vocabulary growth (ADR 0001 appendix): exprs `prop` (ZIL GETP), `table-get` (GET), `add`/`sub`/`mul`/`div` (16-bit signed, truncating `/`; n-ary → left folds, unary `-` → `0 − x`), expression-position `set-local`/`set-global` (ZIL SET/SETG inside predicates); stmts `set-prop` (PUTP, yields its entity) and `table-set` (PUT, yields its table); routine `defaults` (ZIL `"OPT" (NAME <init>)`, applied by arity as in Z-code — passed false does not trigger the default; `<>` defaults lowered away)
- **Property keys are IR field names**, never raw ZIL atoms: closed `BEHAVIOR_PROPERTY_KEYS` map (`P?LDESC` → `description`, `P?TVALUE` → `treasureValue`, all 11 corpus-used properties); unmapped atoms denied. Absent properties read as false. LTABLE index 0 answers the element count (element n at index n−1)
- **Extraction: 213 → 228 routines, catalog 113 → 104, unresolved refs 117 → 110.** Batch a unlocked BAD-EGG, CHALICE-FCN, LARGE-BAG-F, PAINTING-FCN, TREASURE-ROOM-FCN, V-EXAMINE, V-READ; batch c unlocked BASKET-F, CAVE2-ROOM, SCORE-OBJ, V-CLOSE, V-STAB; arithmetic unlocked LIVING-ROOM-FCN, MATCH-FUNCTION, V-PUT. New worklist targets catalogued: THIEF-IN-TREASURE, FIND-WEAPON, SCORE-UPD, OTVAL-FROB, TOUCH-ALL, WEIGHT (all loop-blocked)
- Catalog reasons are **first-blocker only** (all-or-nothing deny throws on first hit), so batch sizes are discovered iteratively: re-extraction after each vocabulary growth surfaces the next blocker (e.g. V-OPEN: GETP → FIRST?). Remaining clusters: FIRST?/REPEAT/PROG loops + object-tree iteration (batch b, the dominant blocker incl. all 15 former opt-default routines), MacroEval bodies (batch e), COND-clause forms, GETPT/PTSIZE and bit ops (deliberately excluded: PRE-FILL's Z-machine property-table scan and V-SCRIPT's Z-header transcript-bit poke are engine-builtin territory; RANDOM stays a builtin for transcript-replay determinism)
- **Verified against golden transcripts**: extracted V-READ executed by the reference interpreter on the leaflet reproduces the frotz golden output (01-west-of-house.txt) with wrapping normalized; refusal path and V-EXAMINE default path asserted; unit semantics for every new op (wraparound at ±32768, ltable length slot, arity-based defaults). 77 tests pass (12 new)

### Status

Stage 3.5 in progress — batches a (property/table access) and c (optional-param defaults + SET-as-expression) complete, plus arithmetic. Next: batch b (loops/object-tree iteration — unlocks the most routines), then d (daemons/timers), e (MacroEval bodies).

---

## v0.5.4 — Behavior Extraction Batch 1 (stage 3.4)

**Date:** 2026-07-18

### Changes

- **IR schema 0.4.0**: optional `routines` section — the ADR 0001 behavior AST ships inside world documents. Governed vocabulary growth (logged in the ADR appendix): exprs `in?`, `loc`, expression-position `call`; stmts `set-local`, `move`, `remove`, `value` (expression statement); TELL part `{name}` (ZIL `D`); routine `locals` with AUX-initializer preludes. **ADR 0001's deferred implicit-return question resolved**: expression-oriented value semantics (a routine returns its last executed statement's value; `cond` yields the taken clause's last value; documented per-op). Reference interpreter implements the semantics and new ops; the hand-transpiled POC variant was corrected to match real ZIL returns
- **Deterministic ROUTINE→AST transformer** (`ir/src/extract-behavior.ts`): all-or-nothing per routine — full mapping or catalogued with exact reasons, never guessed. Worklist closure from the world's 292 routine refs through `call` targets: **213 routines extracted (197/292 referenced handlers = 67%)**, 113 catalogued (`ir/artifacts/zork1.behavior-catalog.json`). Deterministic lowerings: `,P?DIR` → direction word, `,V?VERB` → verb word, numeric CONSTANTs → literals, bare routine-name atoms → strings, `(ELSE …)` → T clauses, `(ACTION 0)`-style dead code preserved as-is. DEFMAC macro names (ENABLE, PROB, FLAMING?, …) and the compile-time-macro-gated PERFORM are legal call targets destined for the engine-builtin layer
- World doc grew accordingly: 45 globals (+ behavior-referenced), 10 tables (table-valued globals as Table entities), 31 flags; validator enforces the closed op vocabulary, validates locals/entities/flags/globals referentially, and reports 117 `unresolvedRoutineRefs` (builtins + catalogued)
- **Verified**: extracted TRAP-DOOR-EXIT and KITCHEN-WINDOW-F byte-match the stage 2.2 hand-written POC ASTs (the strongest possible check of the transformer against human transcription); differential interpreter runs match POC goldens; 65 tests pass (5 new); both CLIs report routine/unresolved counts

### Status

Stage 3.4 complete — majority of handlers represented, complex ones catalogued with actionable reasons. Next: stage 3.5 works through the catalog in batches (properties/tables, loops, daemons, macro-gated parser machinery).

---

## v0.5.3 — Vocabulary & Syntax Extraction (stage 3.3)

**Date:** 2026-07-18

### Changes

- **IR schema 0.3.0** (additive): optional `vocabulary` section — `directions` (ZIL DIRECTIONS words mapped to IR direction ids), `buzzwords` (ZIL BUZZ, incl. punctuation tokens), `synonyms` (ZIL SYNONYM word/alias sets), and `syntax` (ZIL SYNTAX rules: verb, 0–2 object slots with optional preposition / `(FIND flag)` / search-option list, action, optional pre-action). Search options are a closed enum (HELD/CARRIED/IN-ROOM/ON-GROUND/MANY/HAVE/TAKE); `find` flags validate against the flag registry; action/preAction join `routineRefs`
- **Extraction** (`extract-world.ts`): full Zork I parser vocabulary from `gsyntax.zil` — **267 syntax rules, 75 synonym sets, 21 buzzwords, 13 direction words**. ZIL compile-time `<COND (<==? ,ZORK-NUMBER n> …)>` gates are resolved exactly (`ZORK-NUMBER=1` read from zork1.zil): the live `N==? 3` clause contributes GIVE→HAND, dead Zork II/III clauses (FROTZ/OZMOO buzzwords, short ATTACK/KILL syntaxes) are dropped. COND expansion now feeds every extraction pass; RMUNGBIT (a `(FIND …)` flag) joins the registry (29 flags); routine refs grow to 292 (V-*/PRE-* verbs — the stage 3.4 worklist)
- **Verified against source**: independent jq mirror of all 267 SYNTAX parses diffs clean against the generated IR; top-level SYNONYMs likewise (COND-derived GIVE→HAND asserted separately); ATTACK/KILL two-slot rules spot-checked against raw ZIL
- 4 new tests (60 total pass); validator/CLI summaries report syntax-rule counts; `docs/IR_SCHEMA.md` documents the section and version history

### Status

Stage 3.3 complete — rooms, objects, and parser vocabulary are all in IR and source-verified. The declarative world is done; next is behavior: stage 3.4 (simple action routines into the ADR 0001 AST).

---

## v0.5.2 — OpenWiki Not Adopted (⚑ Gate A semantic half finalized)

**Date:** 2026-07-18

### Changes

- **OpenWiki decision finalized: not adopted** (closes the deferred semantic half of Gate A). In-repo validation (`openwiki` v0.2.0 via OpenRouter): the `openrouter/free` model router produced an empty wiki with a silent "success" — each request routes to a random free community model, and on repository-scale prompts most return null content with `finish_reason: "length"` (reasoning tokens exhaust the budget), which the agent loop reads as completion. A retry with a pinned 1M-context free model (`nvidia/nemotron-3-ultra-550b-a55b:free`) ran a genuine 45-message tool-calling session, then aborted on OpenRouter's free-tier rate limit (16 req/min across all `:free` models; OpenWiki has no backoff/retry). Reliable operation requires a paid model (OpenWiki's own CI pins `z-ai/glm-5.2`) — **no budget for this side project at present**
- Repo cleanup: removed `openwiki/` (empty scaffold), `.github/workflows/openwiki-update.yml` (+ empty `.github/`), and the generated OpenWiki snippet in AGENTS.md; CLAUDE.md deduplicated to `@AGENTS.md` only (graphify rules live in AGENTS.md)
- Docs: `AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md` OpenWiki section rewritten (DEFERRED → NOT ADOPTED, with findings) and Final Decision table amended (semantic knowledge = hand-authored `wiki/`); AGENTS.md Knowledge Separation rules finalized; DEVELOPMENT_PLAN Gate A note updated; HANDOFF Open Issue moved to Resolved
- Out of scope, untouched: Daniel's global `~/.openwiki/` (whatifclassics ingestion source, 02:00 launchd job, 01:58 pmset wake, API keys)

### Status

Gate A fully closed: Graphify for structural knowledge, hand-authored `wiki/` for semantic knowledge. Revisit OpenWiki only if budget appears or upstream adds rate-limit backoff. Next: stage 3.3 vocabulary & syntax.

---

## v0.5.1 — Object Extraction (stage 3.2)

**Date:** 2026-07-18

### Changes

- **Full object extraction** in `ir/src/extract-world.ts`: all **137 objects** (140 OBJECT forms across `1dungeon.zil`/`gglobals.zil`, minus the 3 ZIL world-tree scaffolding objects GLOBAL-OBJECTS/LOCAL-GLOBALS/ROOMS, which the IR represents structurally) with properties, flags, containment, and initial locations (73 in rooms, 20 in objects, 20 local-globals, 14 global, 10 nowhere). Replaces the stage 3.1 stub entries; `ir/artifacts/zork1.world.json` now carries 110 rooms + 137 objects, 132 routine refs, 28 registered flags
- **IR schema 0.2.0** (additive; `ir/src/schema.ts`, validator, `docs/IR_SCHEMA.md`, sample updated): new location kind `"global"` (ZIL GLOBAL-OBJECTS — object in scope in every room, semantically distinct from local-globals), `vehicleType` (ZIL VTYPE — room-flag id the vehicle travels on; boat → NONLANDBIT, validated against the flag registry), `descriptionRoutine` (ZIL DESCFCN — opaque routine ref, collected into routineRefs). ADVENTURER's `(ACTION 0)` maps to absent action
- **ZIL string semantics implemented** (`decodeZilString`, applied to every extracted string): `|` is a hard newline, source line wraps become spaces, indentation after hard newlines is preserved — matches golden-transcript rendering (leaflet, boat label, dam guidebook). Also corrects stage 3.1 room descriptions, which had kept raw source line wraps
- **Verified against source**: an independent jq mirror of the complete object mapping (including string decoding) diffs clean against the generated IR (137/137); the three fully-transcribed sample objects (MAILBOX, ADVERTISEMENT, KITCHEN-WINDOW) are byte-identical to the extraction; INFLATED-BOAT checked against raw ZIL
- 5 new extraction tests (56 total pass); typecheck clean; both IR documents validate

### Status

Stage 3.2 complete — the declarative world of Zork I (rooms + objects) is fully in IR and source-verified. Next: stage 3.3 vocabulary & syntax (needs a schema decision for vocabulary representation).

---

## v0.5.0 — World Model Extraction (stage 3.1, Milestone 3 begins)

**Date:** 2026-07-18

### Changes

- **Deterministic ZIL→IR world extraction** (`ir/src/extract-world.ts` + `extract-cli.ts`, `npm run extract`): consumes the committed importer AST artifacts (`importer/artifacts/ast/`), emits `ir/artifacts/zork1.world.json` — **all 110 Zork I rooms, 352 exits** (277 plain / 37 blocked / 25 conditional / 6 door / 7 routine), room flags, scenery/pseudo references, 47 opaque routine refs, and the 12 exit-condition globals (all `<>` → `false`). Objects referenced by rooms (scenery + doors) are emitted as 20 `stub: true` identity entries so references resolve; full objects are stage 3.2. Any AST shape outside the known ZIL grammar is a hard error — no guessing; ZIL comment nodes (e.g. TREASURE-ROOM's `;"CANT-HAVE-ONBIT"`) are skipped
- **Connectivity verified against source** (exit criterion): independent jq-derived (room, direction, kind:target) edge list from the AST diffs clean against the generated IR — 352/352 identical; the three hand-transcribed stage 2.1 sample rooms (WEST-OF-HOUSE, KITCHEN, LIVING-ROOM) match the generated versions field-for-field; raw-ZIL spot checks (RESERVOIR, MAZE-2) match
- Extraction test suite (`ir/test/extract.test.ts`, 8 tests): validity, room/exit counts, exit-kind histogram, sample agreement, comment skipping, condition-global registry, DOORBIT door stubs, determinism. 51 tests total pass; validator CLI now also covers `ir/artifacts/`
- `.graphifyignore`: `ir/artifacts/` excluded (generated); `ir/` graph regenerated (123 nodes / 288 edges / 8 communities); `ir/README.md` layout/usage updated; `extractWorld` exported from the package API

### Status

Stage 3.1 complete — all Zork I rooms in IR with connectivity matching source. Next: stage 3.2 objects/properties/flags/containment (140 OBJECT forms).

---

## v0.4.3 — Knowledge Tooling Validation, ⚑ Gate A Resolved (stage 2.4, Milestone 2 complete)

**Date:** 2026-07-18

### Changes

- **Graphify adopted** (Gate A, structural half): validated in the field (Daniel, separate project) and in-repo — per-module knowledge graphs committed for `importer/` (83 nodes / 202 edges / 6 labeled communities) and `ir/` (94 / 210 / 13), each with `GRAPH_REPORT.md`, `graph.html`, `graph.json`; all edges EXTRACTED via the deterministic AST pass, health checks clean, communities/god nodes verified against the real architecture
- Adopted configuration: `.graphifyignore` code-only corpus (excludes `original-projects/`, docs/images, generated artifacts, verification, and package/tsconfig metadata — measured at ~30% node noise); per-module `<module>/graphify-out/` supersedes the planned `graph/` directory; agent integration installed (hook guards, CLAUDE.md/AGENTS.md rules, `graphify update .` post-change)
- Validation finding: IR world JSON yields zero AST nodes (upstream graphify #1666) — Graphify covers modernized source; a deterministic IR→graph exporter is the sanctioned path if an IR world graph is wanted later
- **OpenWiki deferred** (LLM-provider integration issue in off-project testing): `wiki/` stays hand-authored; revisit tracked in HANDOFF Open Issues; not blocking
- Docs updated: `AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md` gains "Stage 2.4 Validation" section; AGENTS.md Knowledge Separation rewritten; DEVELOPMENT_PLAN Gate A marked resolved (split)

### Status

**Milestone 2 complete** (stages 2.1–2.4; Gates A and B resolved). IR schema + behavior representation + engine runtime + knowledge tooling all decided with working evidence. Next: Milestone 3 — Semantic Extraction ZIL→IR (v0.5.x), starting with 3.1 world model.

---

## v0.4.2 — Engine Runtime ADR, ⚑ Gate B Resolved (stage 2.3)

**Date:** 2026-07-18

### Changes

- **ADR 0002** (`docs/adr/0002-engine-runtime.md`, Accepted): the Grues in Comic Engine will be a zero-dependency **TypeScript** package (`engine/`); WebAssembly dropped as a target. Rationale: TypeScript frictionless across all three existing subsystems, behavior-as-data (ADR 0001) removes any performance case for native code, Node-based transcript verification, and one language for one (human or AI) contributor. Portability is preserved in the artifacts — IR and serialized contract — not the implementation
- **Engine↔UI contract defined interface-first** in the same ADR: pure deterministic synchronous state machine; `command() → TurnResult{events}`, `snapshot()/restore()`; seeded RNG for golden-transcript parity; versioned JSON event union (narration/speech/player-moved/object-moved/score-changed/game-over/question); events semantic, never presentational; additive growth under `contractVersion`
- WASM assumption removed per exit criteria: PORTING_STRATEGY.md (overview, pipeline diagram, Phase 4 → Browser Integration, long-term vision) and AGENTS.md objectives updated; IR independence lists intentionally retain WebAssembly
- DEVELOPMENT_PLAN revised per Gate B: gate marked resolved, Milestone 4 goal names `engine/` + ADRs 0001/0002; Milestones 3 and 5 stand structurally
- HANDOFF Open Issue "engine implementation language undecided" resolved

### Status

Stage 2.3 complete — **⚑ Gate B resolved** (both decisions: behavior representation + runtime). Milestone 2 has one stage left: 2.4 knowledge-tooling validation (⚑ Gate A). After that, Milestone 3 extraction begins.

---

## v0.4.1 — Behavior Representation ADR + POC (stage 2.2)

**Date:** 2026-07-18

### Changes

- **ADR 0001** (`docs/adr/0001-behavior-representation.md`, Accepted): imperative game logic is represented as a structured behavior AST — plain JSON with a closed vocabulary of IF-domain operations — interpreted by the engine; generic ZIL utility routines become engine builtins invoked by name; engines may compile the AST to closures at load time; transpiling to TypeScript as the canonical form was rejected (IR independence, extraction validatability, runtime-choice reversibility)
- Added `ir/src/behavior.ts`: behavior AST types (12 expression ops, 6 statement ops) covering the constructs the POC corpus needs — COND/predicates/TELL/global+flag mutation/return/call
- POC compared both candidate representations on two nontrivial routines (TRAP-DOOR-EXIT, KITCHEN-WINDOW-F): hand-written ASTs + ~130-line reference interpreter vs. hand-transpiled TypeScript, executing over a shared world/builtin substrate (`ir/poc/`)
- 12 differential scenarios assert outcome equality; 10 golden tests pin both variants to the ZIL source's expected transcripts; suite now 43 tests, typecheck clean

### Status

Stage 2.2 complete: behavior representation decided with working evidence — ⚑ Gate B input delivered. Next: stage 2.3 (engine runtime ADR + engine↔UI contract), where Gate B resolves and Milestones 3–5 get revised.

---

## v0.4.0 — IR Schema: Declarative World (stage 2.1)

**Date:** 2026-07-18

### Changes

- Created the `ir/` package — the IR is now a concrete artifact, not a concept: `src/schema.ts` (TypeScript types as schema source of truth, `irVersion` 0.1.0), `src/validate.ts` (strict validator: structural pass rejecting unknown keys + referential pass resolving every id, with a flag registry and DOORBIT enforcement on door exits), `src/cli.ts` (`npm run validate`)
- Exit representation mirrors the five ZIL variants 1:1 (`to`, `blocked`, `conditional` IF/ELSE, `door` IF-IS-OPEN, `routine` PER); all behavior references are opaque routine-name strings deferred to stage 2.2, surfaced by the validator as `summary.routineRefs`
- Hand-wrote `ir/samples/west-of-house.world.json` from `1dungeon.zil`: WEST-OF-HOUSE, KITCHEN, LIVING-ROOM in full (every exit kind exercised), MAILBOX / ADVERTISEMENT / KITCHEN-WINDOW objects, IN-HOUSE-AROUND ltable, four boolean globals; `"stub": true` placeholders keep partial worlds referentially closed
- Wrote the normative spec `docs/IR_SCHEMA.md` (design principles, ZIL→IR mapping tables, validation rules, versioning, deferrals)
- 21 tests (validator rules + sample integration), typecheck clean, validator CLI green

### Status

Stage 2.1 complete: declarative-world IR schema documented, validated, and pinned against hand-transcribed source. Next: stage 2.2 (behavior representation, ⚑ Gate B input) — the sample's seven routine refs are the candidate POC targets.

---

## v0.3.2 — AST Artifacts (Milestone 1 complete)

**Date:** 2026-07-18

### Changes

- Added `src/stats.ts` (per-file/corpus statistics) and `src/cli.ts` (artifact generator); `npm run artifacts` re-runs the full pipeline in one command with deterministic output
- Committed `importer/artifacts/`: `ast/*.json` — full typed ASTs with source positions for all 10 files (6.3 MB), `stats.json`, and human-readable `STATS.md`
- Corpus statistics (parser truth): 11,899 lines → 52,569 AST nodes; 110 ROOM / 140 OBJECT / 439 ROUTINE / 152 GLOBAL / 101 CONSTANT / 267 SYNTAX / 74 SYNONYM / 15 DEFMAC top-level; 28 TABLE / 147 LTABLE / 16 ITABLE at any depth
- Test suite grown to 47 (stats unit tests caught a markdown-separator rendering bug)

### Status

**Milestone 1 complete.** Deterministic ZIL parser with committed AST artifacts — the grounding input for all later LLM-based extraction. Next: Milestone 2 (IR schema + runtime ADR), stage 2.1.

---

## v0.3.1 — Full-Corpus Parse Validation (Milestone 1, stage 1.2)

**Date:** 2026-07-18

### Changes

- Fixed the one real lexer defect the corpus surfaced: `!-` (MDL oblist trailer) now continues an atom — `RETURN!-` in `gmacros.zil` was previously split into `RETURN` + segment silently
- Added `src/printer.ts` (AST → canonical ZIL text) and a round-trip invariant: `parse(print(ast))` is structurally identical to `ast` for all 10 corpus files
- Added `test/parse-corpus.test.ts`: per-file ground-truth top-level counts, corpus totals (110 ROOM / 140 OBJECT / 442 ROUTINE forms, 439 at top level), and edge-case assertions; suite now 44 tests
- Catalogued corpus edge cases in `importer/README.md`: three page-break spellings (`\`+form-feed, literal `^L`, `/^L`), `%<COND …>` reader macro in `gmain.zil` conditionally defining routines (incl. quoted `'<ROUTINE PERFORM …>`), escaped `\#RANDOM` debug verbs, `#DECL`/`#BYTE` chtypes only, and three column-1 nested forms in `1actions.zil` proving grep counts aren't structural ground truth

### Status

Stage 1.2 complete: 100% of the corpus parses with validated structure. Next: stage 1.3 (AST → JSON + statistics) closes Milestone 1.

---

## v0.3.0 — ZIL Parser POC (Milestone 1, stage 1.1)

**Date:** 2026-07-18

### Changes

- New `importer/` package (TypeScript, vitest): deterministic ZIL S-expression lexer (`src/lexer.ts`), recursive-descent parser (`src/parser.ts`), and typed AST (`src/ast.ts`) with line/column spans on every node
- Syntax coverage driven by the corpus: `\` escapes in atoms/strings, octal `*777*` literals, prefix operators `;` `'` `,` `.` `%` `%%` `!` `#`, char literals `!\c`, `!>` form closers, `<>`-as-FALSE, top-level header/SUBTITLE strings, `\`+form-feed page-break atoms
- 26 tests: per-feature unit tests plus a full-file integration test on `1dungeon.zil` asserting exact definition counts (110 ROOM / 122 OBJECT / 17 GLOBAL / 4 ROUTINE / 1 DIRECTIONS; 254 top-level forms)
- Smoke test: all 10 `.zil` files in the corpus parse without error — stage 1.2 shifts to AST validation and edge-case cataloguing

### Status

Stage 1.1 complete. TypeScript proved frictionless for the parser workload (Gate B data point). Next: stage 1.2 (full-corpus parse validation).

---

## v0.2.1 — Repo Hygiene (Milestone 0 complete)

**Date:** 2026-07-18

### Changes

- Comic Chat compiled binaries (`v2.5-beta-1/base/objd/`, 4.1 MB) kept tracked: part of the faithful upstream historical import
- Annotated the truncated fourth recommendation in `docs/gemini-analysis-on-plan-and-strategy.md` (unrecoverable; items 1–3 complete and adopted)
- Consolidated the AI knowledge pipeline description: `docs/AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md` is canonical; AGENTS.md keeps only operational rules, PORTING_STRATEGY.md keeps a summary — both reference the canonical doc
- Pruned HANDOFF Open Issues; added one new issue: Kitchen object-listing order difference between ZILF and shipped builds (decide ground-truth ordering before stage 4.4)

### Status

**Milestone 0 complete.** Verification ground truth and clean repo baseline established. Next: Milestone 1 (deterministic ZIL parser), stage 1.1.

---

## v0.2.0 — Verification Harness (Milestone 0, stages 0.1–0.2)

**Date:** 2026-07-18

### Changes

- Installed toolchain: ZILF/ZAPF 0.11.1 (native macOS arm64), frotz 2.55 (dfrotz)
- `verification/build.sh`: reproducible out-of-tree compile of the unmodified historical ZIL source to `verification/build/zork1.z3` — compiles clean (28 tab-printing warnings, no errors, no source patches needed)
- `verification/run-transcripts.sh`: golden transcript harness — runs `walkthroughs/*.cmd` under `dfrotz -m -p -s 1234` against the shipped reference build (Release 119 / Serial 880429), diffs against `golden/*.txt`; capture and check modes; `STORY=` override for testing other builds (later: the engine itself)
- Captured three deterministic golden transcripts: west-of-house, house-entry, cellar-descent
- Cross-validated: ZILF build matches shipped build behaviorally except version banner and Kitchen object-listing order — preserved source confirmed faithful

### Status

Verification ground truth established. Stage 0.3 (repo hygiene) remains to close Milestone 0.

---

## v0.1.2 — Licensing Files and Development Plan

**Date:** 2026-07-18

### Changes

- Added root `LICENSE` (canonical Apache 2.0 text) and `NOTICE` (Apache statement, Zork I / Comic Chat MIT attribution, full MIT text); README license section updated to reference both
- Confirmed license compatibility: MIT-licensed imports may live inside an Apache-2.0 project with original license files preserved
- Created `docs/DEVELOPMENT_PLAN.md`: Milestones 0–6 in session-sized stages with status markers and four decision gates (A: knowledge-tooling validation, B: runtime ADR, C: transcript parity, D: comic-presentation POC)
- Decided Graphify/OpenWiki install timing: validate hands-on early (stage 0.3), install for real only once the IR exists
- HANDOFF Next Actions now delegate to the development plan's Session Protocol

### Status

Planning complete. Next up: Milestone 0 (verification harness and ground truth). No engine code yet.

---

## v0.1.1 — Project Renamed to Grues in Comic

**Date:** 2026-07-18

### Changes

- Renamed project from Comic-Zork to **Grues in Comic** to avoid the "Zork" trademark (Activision); "grue" predates Zork (Jack Vance) and is copyright/trademark-safe
- Renamed GitHub repository to `dkdev24/grues-in-comic` (old URL redirects; local remote updated)
- Applied rename across `README.md`, `AGENTS.md`, `HANDOFF.md`, `docs/PORTING_STRATEGY.md`, `docs/SOLOPRENEUR_STRATEGY.md`, `docs/AI_KNOWLEDGE_INFRASTRUCTURE_DECISION.md`
- Left past WORKLOG entries and `docs/gemini-analysis-on-plan-and-strategy.md` untouched as historical records
- Verified upstream licenses via GitHub API: `historicalsource/zork1` and `microsoft/comic-chat` are both MIT
- Strategy decisions recorded in HANDOFF: WASM no longer mandatory (engine runtime ADR pending), golden-transcript verification via ZILF + dfrotz, deterministic ZIL S-expression parser before LLM extraction

### Status

Docs and repo renamed. Local directory rename pending. No engine code yet.

---

## v0.1.0 — Repository Initialization

**Date:** 2026-07-18

### Changes

- Initialized Git repository at `/Users/daniel/Sites/comic-zork`
- Created private GitHub repository `dkdev24/comic-zork`
- Imported historical reference source:
  - `original-projects/zork1/` — Zork I ZIL source (Infocom, 1977–1981)
  - `original-projects/comic-chat/v1.0/` — Microsoft Comic Chat 1.0
  - `original-projects/comic-chat/v2.1b/` — Microsoft Comic Chat 2.1b
  - `original-projects/comic-chat/v2.5-beta-1/` — Microsoft Comic Chat 2.5 beta 1 (original)
  - `original-projects/comic-chat/v2.5-beta-1-modern/` — Microsoft Comic Chat 2.5 beta 1 (modernized)
- Added `AGENTS.md`, `CLAUDE.md`, `README.md`, `THIRD_PARTY.md`, `.gitignore`
- Fixed `.gitignore.md` → `.gitignore`; re-applied ignore rules, removed incorrectly tracked build artifacts
- Added `HANDOFF.md` and `WORKLOG.md`

### Status

Foundation only. No engine code, no IR schema, no browser runtime.
