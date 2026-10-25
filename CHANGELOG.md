# Changelog

All notable changes to **Grues in Comic** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**The project stays `0.x` until it goes public.** `1.0.0` is reserved for public launch — the repo
going public and the website (likely a GitHub Page) shipping. (The internal milestone once tagged
`1.0.0`, "Gate C — engine complete", is `v0.9.0`.)

---

## [v0.33.10] - 2026-10-25 — a privacy page and a cookie banner

### Added
- **A privacy page** at `/privacy` explaining what the site collects: analytics, the Hall of Fame
  board, hosting logs, and what stays in your browser.
- **A cookie banner.** Google Analytics now loads only if you press Accept. Declining sets no analytics
  cookies, and you can change your choice from the privacy page.

---

## [v0.33.4] - 2026-08-27 — the homepage now animates in as you scroll

### Changed
- **Each section on the homepage now reveals its contents piece by piece as you scroll to it**,
  rather than all at once — the feature cards, the changelog rows, and similar groups fade and rise
  into place one after another. Plays once per item and never repeats. If you have "reduce motion"
  turned on at the OS level, or if your browser doesn't support the underlying feature, everything
  simply appears normally with no animation and no delay.

---

## [v0.33.3] - 2026-08-27 — Hall of Fame records no longer disappear after a day

### Fixed
- **Unfinished runs stayed on the board instead of being swept a day after your last move.** The
  board's cleanup previously deleted any in-progress run once it was more than 24 hours old — and
  since finishing the game is rare, nearly every run is "in progress," so the whole board would empty
  out roughly a day after each play session. In-progress runs are no longer removed on age alone;
  they stay until the board holds more than 20 of them, and even then only the oldest excess ones,
  older than 30 days, are cleared out. Finished runs were never affected and still stay forever.

---

## [v0.33.2] - 2026-08-25 — the board's default name is the Hero you picked

### Changed
- **An untouched "Name on the board" field now submits your Hero's name, not `Anonymous`.** The
  field's placeholder shows the Hero currently picked and follows the pick live if you switch
  characters before pressing Begin. Typing a name of your own still overrides it, exactly as
  before; reopening the picker (`/cast`, or resuming a save) still shows the field blank rather
  than pre-filled when the stored name is just the Hero's name going unchanged.

---

## [v0.33.1] - 2026-08-25 — the front page cast a comic strip of its own

### Changed
- **"What it does" is now a comic strip, not a card grid.** Six panels, each a two-line exchange
  between Comic Chat roster characters — real face crops from `web/assets/comic/roster/*.png`, not
  illustration — bantering about one feature apiece (art, full-game completeness, save/resume,
  `/hint`/`/help`, the cast picker, the Hall of Fame). Panel count per row is `auto-fit`, so it
  reflows on its own rather than switching at one hand-picked breakpoint.
- **Portraits crop to a fixed circle.** Each character's neutral-face rect is squared to its
  *smaller* dimension, centred, before the circle mask — squaring to the larger dimension instead
  first shipped and bled into whatever the tightly-packed sprite sheet had next to that face (worst
  on Hugh). Every portrait is now the same size and shape, and the second speaker in each exchange
  is mirrored so the two look at each other rather than both facing the same way.
- **The hero sample image is a real screenshot again.** Replaced the old comic-only, single-column,
  portrait-oriented mock with a capture of the actual `/play/` shell — cast bar, a two-column comic
  row (the layout it actually reflows to above one column's width), and the text console beneath it
  with the room name, score/moves, transcript and prompt. Landscape instead of tall, and it can no
  longer disagree with what the game looks like.

---

## [v0.33.0] - 2026-08-24 — full 1:1 backdrops: 110/110 rooms, zero sharing

### Added
- Full 1:1 backdrops: every one of Zork I's 110 rooms now draws its own dedicated piece of art,
  including all fifteen maze rooms and both dead-end sets — no two rooms share a backdrop anymore.
  62 new backdrops wired in across the reservoir, river/rainbow falls, coal mine, temple, dam,
  gallery, cyclops/treasure room, mirror rooms, house exteriors, and the maze.

### Changed
- `art/package.json`'s `pack` script now packs 112 backdrops instead of 50.
- `art/test/polarity.test.ts` backdrop count pin: 50 → 112.

---

## [v0.32.0] - 2026-08-24 — the diversity pass ships: 20 backdrops wired end to end

### Added
- 20 new backdrops wired into `web/src/comic/backdrop.ts` and the AVB pack: the Image 4 diversity
  pass (`coal-mine`, `chasm-cave`, `winding-passage`, `small-cave`, `highlands`, `rainbow-falls`,
  `river`, `shoreline`, `maze-deep`, `maze-twisting`) and Image 5 (`maze-dead-ends`, `forest-dark`,
  `forest-edge`, `forest-path`, `up-a-tree`, `east-clearing`, `canyon-view`, `cliff-middle`,
  `canyon-bottom`, `sandy-beach`). Nine rooms move off shared `pastoral`/`highlands`/`shoreline` art
  onto their own plate.
- `reference/backdrops-bulk-generation-4(5x2)-square.png` — a square-cell contact sheet, cropped from
  the portrait Image 4 source, used as the geometry reference for square-cell generation.

### Changed
- `art/package.json`'s `pack` script now packs 50 backdrops instead of 30.
- `art/test/polarity.test.ts` backdrop count pin: 30 → 50.

---

## [v0.31.0] - 2026-08-24 — ten early-game backdrops, and an A/B that says no

### Added
- `art/vector/kit.mjs` — a scene kit over the `woodring.mjs` engine: a `Scene` to compose into,
  `hatch()` for a line family at any angle, and the shared forms (sky, trunks, clapboard walls,
  boarded openings, tufts, rocks).
- Ten early-game backdrop scenes in `art/vector/scenes/` — the white house from four sides, the
  forest, the path, up a tree, the clearing with the grating, and the stone barrow.
- `art/vector/render.ts` — rasterizes each scene at 4x, downsamples and hard-thresholds to 1-bit at
  512 and 264, and reports the ink ratio against the decoded originals.
- `art/vector/ab.ts` — builds a blind A/B page pairing each vector plate with the image-model
  backdrop it would replace.

### Changed
- `docs/PITFALLS.md` gains the draw-order rule for `bulb`-based forms: a form that stops in
  mid-frame reads as an open pipe, so trunks run long and are buried at both ends.

### Notes
- **Nothing ships from this version.** No asset changed and `web/src/comic/backdrop.ts` is
  untouched; the vector route remains a candidate, not a decision.
- A composition-led retune of the ten scenes was built, judged worse than this set, and reverted.

---

## [v0.30.0] - 2026-08-24 — vector backdrops, and finding the real reference

### Added
- Vector backdrop generators under `art/vector/` — an authoring sandbox exploring SVG as an
  alternative to image generation for the backdrops still missing from
  `docs/backdrop-generation-plan.md` § Image 4. `woodring.mjs` is the engine; `gen_woodring.mjs`
  and `gen_field.mjs` are scenes.
- `art/tools/bgbdump.ts` (`npm --prefix art run dump:bgb`) — decodes Comic Chat's own `.bgb`
  backdrops to PNG. They are reference material only, written to the gitignored
  `reference/backdrops-original/`, and are never redistributed.

### Changed
- `docs/PITFALLS.md` records four durable cautions about backdrop art, including that
  `reference/backdrops/` is an AI-generated approximation and not the idiom to calibrate against.
- `THIRD_PARTY.md` records rough.js as a superseded build-time dependency, and records that
  Comic Chat's backdrops are decoded for reference without being redistributed.

### Note
No shipped asset changed. Nothing in `web/assets/` was regenerated by this work.

---

## [Unreleased]

Toward public launch (`1.0.0`): separation of the reusable assets (engine, IR spec, ZIL importer)
under neutral branding, and the public release itself — repo public + website live.

---

## [v0.29.1] - 2026-08-23 — the board gets column headings

### Changed
- **The Hall of Fame board now says what its columns are** — rank, player, score and moves — so the
  numbers read without being guessed at. On a phone, where the rows stack instead of lining up in
  columns, the headings are left off: they would be labelling nothing.
- **The front page has one "start playing" button per screenful instead of two.** The changelog
  section's copy is gone; the Hall of Fame's is right above it and does the same job.

### Fixed
- **The Hall of Fame button's label sat too high.** It now sits centred, like the one at the top of
  the page always did.

---

## [v0.29.0] - 2026-08-23 — the Hall of Fame

### Added
- **A Hall of Fame board on the front page.** Every run that starts appears on it — how far it got,
  in score and moves — with runs being played right now marked `PLAYING NOW`, and finished runs
  ranked above the rest by move count. Nobody has finished the game yet, so the board is a list of
  attempts for the moment, which is the point: it shows that people are playing.
- **A name of your own, asked for once, on the screen where you choose your characters.** It is
  optional, twelve characters, and an untouched field simply reads `Anonymous`. A checkbox on the
  same screen keeps your run off the board entirely — untick it and nothing about your game is ever
  sent anywhere.
- **A flag beside each name.** It comes from the country the request arrives from and is never more
  than that: no account, no address stored, nothing that identifies a person. A run is a name, a
  country, a score, a move count, and the times it started and was last seen.

### Notes
- The board is an arcade cabinet, not a record book. It cannot tell an honest run from an invented
  one, and it does not pretend to — the machines it imitates could not either.

---

## [v0.28.5] - 2026-08-23 — a walkthrough that dies

### Added
- **The comic can now show a death, because one of the test playthroughs finally dies in one.** The
  death beat shipped last version with nothing in the project that actually reached it — every
  recorded playthrough either quit or won. A new scene walks to the edge of the Great Canyon and
  jumps off it, so the beat is now exercised by a real game rather than a stand-in, and is checked
  against the original 1980s interpreter like every other scene.

### Fixed
- **The reference transcripts no longer record whose computer made them.** They had been storing the
  full path to the game file, which differed between machines, so two of them failed their own check
  for anyone but the person who captured them.

---

## [v0.28.4] - 2026-08-23 — the comic finally notices when you die

### Fixed
- **Dying is now a moment in the comic.** Zork kills you often, and the strip had never once
  reacted: the frame reserved for it was going to the *quit* command instead, so the Hero pulled a
  face when the player left the game and none at all when a troll removed his head. A death now gets
  what it always should have — the killing blow, the "you have died" banner, and then a panel holding
  on the Hero's face, in the room it happened in, before the game drops him somewhere else.
- **Winning is something you can read.** The barrow's closing speech — the reward for the whole game
  — was being drawn as six cramped close-ups of two people talking. The speech is now laid out to be
  read, and the Hero's delighted reaction is the panel that follows it.
- **Quitting is no longer treated as a feeling.** The strip still ends on the Hero when you quit; he
  just no longer emotes about it.

---

## [v0.28.3] - 2026-08-23 — the Hero is not, in fact, mostly annoyed

### Fixed
- **A long-standing claim about the game's own character turned out to be measured wrong.** The
  project had recorded that the Hero's most common expression was exasperation at the parser, and
  built casting around it. It came from replaying the full-game walkthrough, which — because this
  engine rolls its own dice — loses a fight it was written to win, leaving the Hero stranded in a
  forest for 254 commands of walking into walls. Played properly, the Hero almost never argues with
  the parser; what the comic is mostly made of is quiet acknowledgement and the pleasure of scoring.
  The affect table itself is unchanged; only the description of what it produces.

---

## [v0.28.2] - 2026-08-23 — the death frame is its own frame

### Fixed
- **A death now gets a panel of its own.** The game-over shot — the comic's biggest beat, a wordless
  portrait of the Hero — was landing on top of the previous exchange in most endings, so what the
  reader got was the last two people talking, shrunk, with the room washed out behind them. It only
  happened when the line before it was of a particular kind, which is why it had gone unnoticed. The
  ending is also no longer followed by a stray panel of the Hero shrugging at nothing: Zork asks
  "do you wish to leave the game?", and answering it was drawing a frame.
- **Every Hero dies the same size.** The death portrait is framed by the head rather than by the
  body, so picking a different character changes who is in the last panel and not how close the
  camera is.

---

## [v0.28.1] - 2026-08-23 — a close-up means the same thing for everyone

### Fixed
- **The close-up no longer crops half the cast at the chin.** Framing scaled every character by the
  height of their *body*, while what tells a reader how close the camera is, is the size of the
  *head* — and the eight playable Heroes differ far more in head than in height. The result was a
  "close-up" that gave one Hero head and shoulders and the next a head alone with their chin on the
  frame edge. Heads are now held to one size on that shot, so picking a different Hero changes who is
  in the panel and not how the panel is shot. The Dungeon Master, whose mask head used to run off the
  bottom of the frame entirely, is drawn whole.

---

## [v0.28.0] - 2026-08-22 — choose your cast

### Added
- **A "choose your cast" screen opens every new game.** Eight characters can play the Hero and seven
  can play the Dungeon Master, all of them Microsoft Comic Chat's own art. Pick one of each, look at
  them full-size, press Begin. `/cast` re-opens the picker over a game already in progress.
- **The choice is remembered twice, on purpose.** A saved game records the cast it was *drawn* with,
  so resuming re-draws its whole strip with the same characters rather than silently recasting pages
  the player has already read; a separate standing preference survives `/restart` and a cleared save.
- **A validated roster, in code.** `art/src/roster.ts` is the shipped pool per role, and
  `art/tools/rosterpack.ts` refuses to pack a character who is not a complex avatar or who lacks a
  face for an emotion their role's markers fire (ADR 0004 §11, amended for this). Legibility and
  register stay human judgements — the survey behind them is `docs/casting-roster-survey.md`.

### Changed
- **Character art is fetched per cast, not per roster.** The picker's first fetch is names only
  (`roster.json`); a sheet is pulled when a character is previewed or cast. Fifteen sheets are
  ~1.4 MiB; one cast is ~150 KiB.
- **`THIRD_PARTY.md` and `NOTICE` name the roster.** Comic Chat's art is now a foreground feature —
  players choose a character by name — rather than an implementation detail.

### Unchanged, deliberately
- **The pixel gate still renders dan and tiki.** A chosen cast is a runtime skin: `cast.json` is
  untouched, and the 24 accepted goldens are still pictures of the canonical cast (clean across this
  change). Per-cast goldens are explicitly not wanted.

---

## [v0.27.6] - 2026-08-22 — the ending gets its own backdrop

### Added
- **The barrow interior is drawn.** The ending's panels now render against the `barrow-interior`
  backdrop instead of the barrow's outside wall — the art shipped with the post-MVP backdrop pass
  but nothing had ever referenced it, because Zork I has no room *inside* the barrow to key it on.
  The winning frames are keyed on the win itself; the frame the Hero speaks his last line from, at
  the door, is still the exterior. (`FUTURE_WORK.md` F1, now closed.)

### Changed — repository preparation for the public release
- **`docs/` reorganized.** A new `docs/README.md` index says which documents are specifications,
  which are working documents that change every session, and which are history. Four superseded
  planning documents moved to `docs/archive/` with a note on what replaced each — the oldest still
  described a C++/WebAssembly engine that ADR 0002 rejected.
- **The root `README.md` rewritten** for a visitor arriving cold: what the project is, the sample
  comic strip, a link to the live site, a status table, and how to run it locally.
- **`verification/README.md` added** — the only module without one, and it holds the project's
  strongest claim: how parity is established against the original 1980s binary, and what
  "143/143 strict" does and does not mean.
- **The backlog is triaged.** `docs/FUTURE_WORK.md` §2.0 rates every open item by category, size,
  impact and priority; closed items are collected rather than left inline.

### Fixed — licensing and provenance accuracy
- **Comic Chat's art is redistributed, and now says so.** `NOTICE` and `THIRD_PARTY.md` described
  it as a "presentation reference", but the character sheets under `web/assets/comic/` are decoded
  from its `.avb` files and ship with the site. They are now recorded as such, and separated from
  the room backdrops in the same folder, which are original assets under this project's own license.
- **Comic Neue ships with its license.** OFL-1.1 requires the license text be distributed with the
  font; `web/assets/fonts/OFL.txt` was missing and has been added.
- Two stale document statuses corrected: `DESIGN.md` still called itself a draft blocking a stage
  that shipped in v0.26.0, and the AI-knowledge decision record recommended OpenWiki throughout
  without noting it was rejected on 2026-07-18.

The project remains under the **Apache License 2.0** — considered against MIT to match the two
imported projects, and kept for its patent grant and trademark clause.

---

## [v0.27.5] - 2026-08-22 — the ending reaches the comic pane

### Fixed
- **The barrow ending was one balloon.** Playing the walkthrough save to the end showed the comic
  pane closing Zork I on "Inside the Barrow" and nothing else — the cavern, the footbridge, the sign
  and the ZORK II/III sign-off never reached a panel. `STONE-BARROW-FCN` aborts the walk, so the
  winning turn carries no `player-moved`, and the mapper's read-aloud only reads a turn's *whole*
  text when the player moved; the win took the pull-quote path. The ending now reads whole, across
  six panels (`web/src/comic/mapper.ts`).
- **Winning was drawn as dying.** The affect table's `death` marker fired on any `game-over`,
  ignoring the outcome the event has carried since ADR 0002, so the one win in the game staged a
  terrified Hero. New `victory` marker above it — HAPPY face, WAVE gesture (`web/src/comic/affect.ts`).
- **The ending's own frame.** "Inside the Barrow" now goes out on the `room-title` channel
  (`engine/src/game-actions.ts`) instead of running into the sentence after it, a victory always
  draws its location box (the player never moves, so `roomChanged` is false), and the win breaks the
  panel so it cannot relabel the Stone Barrow arrival it clone-appends beside.

Transcript text is unchanged (parity 143/143 strict). Density baseline re-pinned: 675 → 680 panels
on the full game; D5 one exchange every 2.2 turns, D5′ 42.3% — both in band. Pixel gate 24/24 clean.

---

## [v0.27.4] - 2026-08-22 — loading modal on resume, nine more gazetteer rooms

### Added
- **Loading modal** while a saved session resumes: `comic-view.ts`'s render is synchronous, so
  replaying a long save's turn history could block the main thread for a couple of seconds with a
  blank comic pane. A modal (visible by default in `web/play/index.html`, spinner, respects
  `prefers-reduced-motion`) now covers the shell until the resumed session is ready to play.
- **Nine more rooms gazetteered** (6.1e): `MINE-3`, `IN-STREAM`, `SMALL-CAVE`, `TINY-CAVE`,
  `COLD-PASSAGE`, `NARROW-PASSAGE`, `WINDING-PASSAGE`, `TWISTING-PASSAGE`, `DEAD-END-5` — 88/110 →
  97/110 rooms. The 13 remaining (12 maze rooms + `DEAD-END-3`/`DEAD-END-4`) stay silent by design:
  the maze's disorientation is the point. D5 holds at one exchange every 2.2 turns, D5′ at 42.5%
  both-speakers share, both inside band; density baseline re-pinned, pixel gate clean (24/24).

---

## [v0.27.3] - 2026-08-06 — Umami events for game-over and score milestones

### Added
- **Two new Umami events**, on top of the existing "start playing" click. `game-over` fires with
  `outcome` (`victory` / `death` / `quit`), `score`, and `moves` whenever the engine ends the game.
  `score-milestone` fires with `score` and `moves` each time a live turn crosses a quarter of Zork
  I's 350-point max (25/50/75/100%), so drop-off short of a win is visible too. Both fire only for
  turns actually played — a resumed session's replayed history can't double-count on reload.

---

## [v0.27.2] - 2026-08-06 — robots.txt, sitemap.xml, and a real changelog page

### Added
- **`robots.txt`** at the site root: allows normal crawling, keeps build tooling and the internal
  `gallery.html` QA page out, blocks known AI-training crawlers (`GPTBot`, `Google-Extended`,
  `ClaudeBot`, `CCBot`, `Bytespider`, `Applebot-Extended`, `Meta-ExternalAgent`), and allows
  on-demand AI fetches (`OAI-SearchBot`, `ChatGPT-User`, `Claude-User`, `Claude-Web`,
  `Claude-SearchBot`, `PerplexityBot`) — a `Content-Signal: search=yes, ai-input=yes, ai-train=no`
  states the same policy machine-readably.
- **`sitemap.xml`**, generated by `web/tools/build-sitemap.ts` (`npm run sitemap`) from each public
  page's own `<link rel="canonical">` tag, `lastmod` taken from that file's last commit date.
  Referenced from `robots.txt`.
- **The full changelog page (`/changelog`) now shows real detail** instead of a one-line-per-version
  list: each entry's `Added`/`Fixed`/`Changed` bullets from `CHANGELOG.md`, grouped by month in
  collapsible sections (current month open, older months collapsed but still searchable) so the page
  stays readable as the version history grows. The homepage preview is unchanged — still the latest
  three, one line each.

### Changed
- `play/index.html` gained the canonical tag the other public pages already had, so it can be listed
  in the sitemap.

---

## [v0.27.1] - 2026-08-06 — Darkness falls on the right panel

### Fixed
- The panel went black one frame too early on the way into a dark room, and lit up one frame too
  early on the way out. The Hero's "down looks right" is said standing in the lit room he has not
  left yet, and now looks like it.

---

## [v0.27.0] - 2026-08-06 — The dark is dark

### Added
- **A pitch-black room now looks pitch black.** Walk into the cellar without a lamp and the comic
  panel goes black: no room drawn, no figures, just the balloons over the dark. Until now the panel
  cheerfully showed you the cellar while the narration insisted you could not see a thing. Striking
  the lamp is its own panel — the reveal reads as a reveal, and the room finally gets its name box.

### Fixed
- Typing a command on a desktop browser no longer loses the input focus (a regression from the
  mobile keyboard-dismiss fix).
- `inventory` and `look` no longer cut the Dungeon Master's balloon down to its first line.

### Changed
- The comic pane's title now tells you which version you are playing — **Grues in Comic** v0.27.0
  BETA — instead of naming the software it was built from.
- Cookieless visitor analytics on the site pages. No cookies, no personal data.

---

## [v0.26.6] - 2026-08-03 — Jump to either end of a long game

### Added
- **Jump to beginning** and **Jump to latest** buttons, which move the comic and the transcript
  together. They appear over the comic when you start scrolling and fade away when you stop, so they
  take no room from the panel while you are playing. Scrolling a pane by hand still leaves the other
  pane where you left it.

---

## [v0.26.5] - 2026-08-03 — Faster loading for long games

### Changed
- The comic strip now draws only the panels near what you are looking at, and redraws the others as
  you scroll to them. A long game reloads quickly instead of redrawing its whole comic first, and the
  page uses a small, steady amount of memory however far into the game you are — which matters most
  on phones, where the browser could previously drop the tab.

---

## [v0.26.3] - 2026-08-02 — Mobile UX fixes

### Fixed
- The blinking cursor after the site title, which could be mistaken for an input prompt, is gone.
- The gameplay screen no longer shows a redundant "New to text adventures?" note that ate space on
  small screens, and its header has been folded into the comic pane's own title bar to free up more
  vertical room.
- Comic speech balloons now render in the same font on every device — previously they fell back to a
  generic font on some phones.

---

## [v0.26.2] - 2026-08-02 — `/hint` and `/help` as shell commands

### Changed
- `/hint` and `/help` are now shell commands, like `/save`, `/load` and `/restart` — not plain game
  commands. `/hint` shows what's around you without spending a turn; `/help` explains how to play and
  lists the shell commands.

---

## [v0.26.0] - 2026-08-02 — A public website

### Added
- A website: a landing page introducing the project, an about page, and this changelog. The game
  itself now lives at `/play/`.

---

## [v0.25.2] - 2026-08-02 — HINT and HELP commands

### Added
- Two new commands for players unfamiliar with text-adventure trial-and-error: `HINT` lists what's
  currently around you by name, without saying which command helps or what it does; `HELP` explains
  how commands are written. Both are pointed to from the start of the game.

---

## [v0.25.1] - 2026-08-02 — Comic pane dialogue fixes

### Fixed
- The comic pane no longer puts the Hero's reply in the same frame as the *next* turn's line from the
  Dungeon Master, so a split exchange can't read as him answering the wrong question.
- A death is drawn in the room it happened in, rather than the room the player is resurrected into.
- Fewer repeated acknowledgement lines during long item pickup/drop runs.
- More exchanges land in a single panel as a facing two-shot instead of being split across two.

---

## [v0.25.0] - 2026-08-02 — Save, load and restart

### Added
- Three save slots and an autosave, kept in your browser. No account, no upload.

---

## [v0.24.9] - 2026-08-01 — The Hero speaks his own commands

### Changed
- The Hero now says what he's doing as part of the comic dialogue, instead of the Dungeon Master
  narrating his moves for him. He also no longer ends most of his lines the same way — a rotation of
  phrasing replaced the single fixed one.

---

## [v0.17.2] - 2026-07-22 — Comic pane: connected tails, whole panels on mobile

The two comic-pane issues found in live testing are fixed, and every panel is now readable whole
without scrolling on any screen.

### Fixed
- **A speech balloon's tail ended in mid-air instead of on the speaker.** The tail was capped short of
  the figure; it now runs all the way to the head, worst-first on the single-column layout where a tall
  panel put the speaker farthest below the balloon.
- **On a portrait phone a single comic panel was taller than the pane and needed scrolling.** The panel
  is now capped to the pane's visible height (width follows at the native aspect), and the Hero/Guide
  member list is hidden on portrait and on short viewports — including when the on-screen keyboard is
  up — to give the panel that room back.

### Changed
- `README.md` now states that the engine extracts the original's semantics into an IR and is verified
  turn-for-turn against its transcripts (143/143 strict), rather than being "inspired by the original."

---

## [v0.17.1] - 2026-07-22 — Hero thought-balloon fixes, pinned by tests

The Hero's thought balloon is drawn correctly and never lands on a face — and, for the first time,
those properties are held by unit tests.

### Fixed
- **The thought balloon rendered as a chain of overlapping full circles around a visible rectangle.**
  Its outline is now a single continuous scalloped cloud with no interior lines.
- **Balloons could sit on a character's face.** Each on-stage head is now a keep-out box; a balloon
  that would cover a face is slid into the panel's empty margin, and its tail points at the crown.
- **On a tight close-up the figure could crowd out the balloon.** When a panel carries a Guide or Hero
  balloon, the figure is capped to leave a readable column beside it; the full-frame game-over reaction
  shot is deliberately exempt.

### Added
- `web/test/balloon.test.ts` and `web/test/render.test.ts` — 12 tests pinning the three fixes, each
  verified to fail on the original bug. **Web tests 101 → 113.**

---

## [v0.17.0] - 2026-07-22 — The Narrative Director (ADR 0005)

The comic pane now reads as an *edited, past-tense story* rather than a raw play-log, while the console
pane still shows every command live.

### Added
- **A Narrative Director** (`web/src/comic/director.ts`) between the turn stream and the panel stream:
  it drops parser refusals, collapses a run of backtracking moves into a single panel at the
  destination, and lets the Guide reply to what the Hero just did.
- **The Guide converses and the two characters face each other** — the Hero is mirrored in a two-shot
  so it looks toward the Guide (was facing out of frame). An 88-room Guide gazetteer across the full
  main path. The Guide stays deadpan (atmosphere, not hints).

### Notes
- The whole arc is proven by headless tests (web 101/101). In-browser visual verification of the
  facing flip and Guide framing is the next step.

---

## [v0.16.0] - 2026-07-21 — The game is completable

**Zork I can be won in the engine: 350/350, victory at the Stone Barrow, no crashes or deaths.** This
is stage 5.5's core exit criterion.

### Added
- **A resilient completion path** — the magic-boat river leg and coal-mine run (vehicle turn-dispatch),
  the end-of-turn room hook that completes the exorcism, and a driver that handles the thief's random
  thefts by recovering scattered treasure to the trophy case. Locked by `engine/test/completion.test.ts`.
- **Live score updates in the web UI** — treasure scoring now emits a `score-changed` event, so the
  status line climbs as the case fills.

### Fixed
- Treasure scoring no longer wipes room-visit points (a score-accumulator split ZIL relies on).
- The comic pane no longer collapses to a single oversized panel on narrow viewports.

### Changed
- First tuning pass on the camera framing table, by looking at the running page.

---

## [v0.15.0] - 2026-07-21 — Stage 5.4: the comic strip takes shape

### Added
- **Room backdrops** — 30 hand-styled backdrops assigned across all 110 rooms.
- **Session persistence** — the comic strip and transcript survive a reload.
- **Panel sequencing and character portraits** — a uniform panel grid and a cast bar, so the opening
  area is playable in comic form.

---

## [v0.13.0] - 2026-07-20 — Stage 5.3: the comic renderer (⚑ Gate D)

### Added
- **The comic pane** — every turn now draws a Comic Chat panel beside the transcript: composed figures
  from the original avatar art, Woodring-style balloons, and a camera that varies by beat.

### Fixed
- **Every figure had shipped inverted** (masked-mono polarity) — decoded and re-packed correctly.

---

## [v0.12.0] - 2026-07-20 — Browser Shell (stage 5.2)

Zork I is playable in a browser. New package `web/` — the first consumer of the ADR 0002 event contract written **outside** the engine, which was the point of the stage.

### Added
- **`web/` — the console pane of ADR 0004 §4's two-pane shell**, built subordinate-from-the-start so 5.3 adds a comic pane rather than a rewrite. Infocom status line (room, score, moves), channel-styled transcript, prompt, and `save`/`restore` to `localStorage` as shell commands rather than game verbs. A save whose contract *major* differs is refused, not half-applied.
- **An event inspector** showing the running event mix and the last turn's raw events. The console renders four event types and drops three; the three it drops are what 5.3 renders. Contract types are seeded at zero so `speech: 0` (ADR 0004 §Context) is a visible row.
- **`src/session.ts`** — engine plus derived state with no DOM, which is what 5.3's comic pane will consume. One stream, both panes.
- **`tools/serve.ts`** — a `node:http` static server mounting `ir/artifacts/` at `/world/`, so the page fetches the same 1.8 MB world document the parity harness replays.
- 12 tests; `web/graphify-out/` (76 nodes, 120 edges, 8 communities).

### Contract findings
Three things only become visible from outside the engine. None needs a contract change; each is pinned by a test in `web/test/status.test.ts`.
- **`room-title` never arrives** — the standing open issue, confirmed from the consumer side. The name lives inside a `prose` line (`DESCRIBE-ROOM`), so the status line resolves it from the world document by room id. Unknown ids render as the id.
- **`start()` emits no `player-moved`** — the opening placement arrives as an `object-moved` of `ADVENTURER` with `from` === `to`. Must be scoped to the player: the thief's daemon emits ~1 `object-moved` per turn.
- **`restore()` emits no events** — derived UI state must be rebuilt from `SaveState` (`locations`, `globals.SCORE`).

### Notes
- **No bundler and no new dependencies.** `tsc` alone emits browser-native ES modules: the engine has zero runtime dependencies and imports the IR for types only (ADR 0002), and internal imports already carry `.js`. A shell that needed a toolchain to prove the contract is consumable would have weakened the claim.
- **ADR 0004 §4a verified in a real browser** — at 390×844 both panes stay visible with no horizontal scroll.
- Engine, IR and art untouched: parity unchanged at 143/143 strict, 155/161 overall.

---

## [v0.9.0] - 2026-07-20 — ⚑ Gate C: Engine Complete

Zork I runs end to end on the IR, in TypeScript, with no browser code and no dependencies.

### Gate C claimed
- **Stage 4.5 complete.** 11 walkthroughs, **143/143 strict turns**, 155/161 overall. 120 engine tests, 193 IR tests.
- **The exit criterion was amended, not reinterpreted.** "All golden transcripts pass" was unsatisfiable as written: combat and the thief draw their output with `<RANDOM …>`, and ADR 0002 declined to reproduce the Z-machine PRNG, so `05-troll-combat.cmd` is informational **by method, not by defect**. The amendment in `docs/DEVELOPMENT_PLAN.md` states what parity means for randomized turns — deterministic turns strict by text; randomized turns by membership **plus** world-state assertions **plus** a positive control of real `dfrotz` output, because membership alone is one-sided.

### Known limitations
- **`V-CLIMB-UP` remains a stub**, stalling on `GETPT` — the one exit-property idiom ADR 0003's rewrite does not cover. It answers "You can't go that way.", correct in every room without a climbable exit; rooms that have one route through their own exits and never reach it. No walkthrough diverges on it.

---

## [v0.8.3] - 2026-07-20 — Membership Hardened

v0.8.2 verified the thief and exposed that `combat.test.ts` was verified more weakly than the suite it inspired. If Gate C is claimed, membership **is** the parity evidence for walkthrough 05's randomized turns, so it had to be as good as the thing it stands in for. **No engine or IR source changed.**

### Added
- **A reference positive control in `combat.test.ts`** — 24 lines captured from `dfrotz -w 200` against `verification/build/zork1.z3`, spanning `HERO-MELEE` rows, `TROLL-MELEE` rows and routine TELL text. Membership is **one-sided**: a narrower legal set never makes a passing line fail, so a derivation that silently stopped resolving `TROLL-MELEE` would stay green while covering a fraction of the game. Verified to bite — simulating that failure drops all three villain reference lines.
- **World-state assertions** — a narrated kill must remove `TROLL` from the world; a narrated death must set `DEATHS`, resurrect to `FOREST-1` and charge exactly 10 points; `ADVENTURER.strength` and `TROLL.strength` must both move across the sample. Both mutations tested and caught.

### Fixed
- **The fight helper ignored the approach.** Seed 5 dies from the troll's free `I-FIGHT` swing on entry, before a single "kill troll" — the helper read villain blows and score only inside the fight loop, so those seeds had a wounded player with no blow recorded and no score baseline.
- **A trailing `observe()` double-counted**, overwriting `scorePrev` with the post-death score and destroying the delta the penalty check depends on.

### Changed
- Engine tests **117 → 120**. IR 193 and parity (143/143 strict, 155/161) unchanged.

### Notes
- **The remaining Gate C question is definitional, not technical.** The criterion reads "all golden transcripts pass"; walkthrough 05 cannot, by construction, because combat is randomized and ADR 0002 declined to reproduce the Z-machine PRNG.

---

## [v0.8.2] - 2026-07-20 — The Thief Verified

The thief had been queued and running since v0.8.0 with nothing exercising him — no walkthrough stays underground long enough to be robbed. That is the shape of the v0.7.0 combat failure, so it was worth closing. He turned out to work: **no engine or IR source changed in this release.**

### Added
- **`engine/test/thief.test.ts`** — robbery, wander, visibility and melee, verified by membership. Behaviour is asserted on the **world**, not the text: membership alone passes on a thief who wanders and never steals, so the test requires the painting to end up in his possession.
- **A positive control from the reference build** — four lines captured from `dfrotz -w 80 -s 1234` against `verification/build/zork1.z3`, running the same scenario. Membership is one-sided: a *narrower* legal set never makes a passing line fail, so a broken derivation looks green. Real reference output is what makes that narrowing visible.
- **`stringLiterals()`** in the shared membership module, for tables that are interleaved data rather than message rows (`LAMP-TABLE` is `[100, "…dimmer.", 70, …]`).

### Changed
- **The membership machinery moved to `engine/test/membership.ts`**, shared by `combat.test.ts` and `thief.test.ts`. `combat.test.ts` now imports it and is otherwise unchanged.
- Engine tests **110 → 117**. IR 193 and parity (143/143 strict, 155/161) unchanged.

### Notes
- **The thief's wander is deterministic, and correctly so** — `NEXT` through the ROOMS tree rather than a draw, so it is identical across seeds. The randomness is in `ZPROB`: whether he robs, and whether he shows himself.

---

## [v0.8.1] - 2026-07-20 — ADR 0003: Derived Adjacency

`I-SWORD` extracts, and walkthrough 10 verifies strictly. It was the last M4 item ADR 0001 deferred without an answer.

### Added
- **`Room.adjacent`** — the ids a room declares a static exit to, derived at extraction time. `deriveAdjacent()` is the single definition: `extract-world` emits the field and `validate` **re-derives and compares** it, so a stale or hand-edited list fails validation instead of silently disagreeing with the exits beside it.
- **The exit-scan rewrite** (`RoutineTransformer.exitScan`) — structurally matches the ZIL `NEXTP`/`GETPT`/`PTSIZE`/`GETB` idiom and emits an index walk over the adjacency list. Fail-closed: any clause that does not match falls back to the ordinary path and catalogs on `NEXTP`, so a near-miss costs extraction rather than producing a plausible loop over the wrong thing.
- **ADR 0003** (`docs/adr/0003-adjacency-derivation.md`), with the rejected alternatives argued: a general `exits-of` reflection op, a quantifier op, an engine builtin, a villain-side threat field.
- Direct verification of the glow at all three levels *and* the transitions between them (`engine/test/engine.test.ts`), plus perturbation tests for the rewrite's fallback (`ir/test/exit-scan.test.ts`).

### Changed
- The engine **materializes** adjacency as a `pure` `ltable` per room, reached through an ordinary property (`adjacentRooms`); it never computes it, so the document keeps owning the world model (ADR 0002).
- **No new IR ops** — the rewrite is `prop`/`table-get`/`gt?`/`add`/`loop`/`break`, so ADR 0001's growth log is unchanged.
- Walkthrough 10's `# parity:` line is gone. Two turns are still quarantined per-turn, now because the glow reports the *randomized fight's outcome* (the reference stuns the troll and it stays next door; our seed kills it) rather than because `I-SWORD` was missing.
- The combat suite's legal-message set includes `I-SWORD`: killing the last villain in the room is what makes the glow change, so its line lands in combat turns.

### Results
- **360 routines extracted** (was 358), **28 catalogued** (was 29).
- Parity **155/161, 143/143 strict** (was 117/117 — walkthrough 10 is no longer file-level informational); engine **110** tests, IR **193**.

---

## [v0.8.0] - 2026-07-20 — `GO` as an Entry Ref

Villain combat is whole, and the game's five daemons run for the first time.

### Fixed
- **`GO` is now an entry ref.** The game's initialization routine was reachable from nothing, so the daemons it queues and the melee tables it patches were never touched. Adding it extracts `I-FIGHT`, `DO-FIGHT`, `VILLAIN-BLOW` and `WINNER-RESULT`: villains strike back, disarm, knock out and kill, and death and resurrection work.
- **`TABLE_CORRECTIONS` deleted** — `GO` patches `DEF*-RES` at runtime, as the source intended, so the extractor no longer hardcodes it.
- **Flags used as values** (`,NONLANDBIT`, `,ONBIT`) resolve by name, matching the world document's `vehicleType`.
- **`PROB`'s two-argument form** expands to `<ZPROB base>` and discards its second operand, as the DEFMAC does — `VILLAIN-BLOW` passes an undeclared local there, which is legal only because the macro drops it.
- **Extracted routines can shadow engine builtins.** `LIT?` did, replacing the engine's lighting with a call into unmodelled parser scope machinery and breaking every dark-room turn. Engine-implemented routines are now excluded outright.

### Changed
- Initialization runs at **engine construction**, not in `start()`, so a host cannot skip it. An explicit `start:` option still overrides `GO`'s placement.
- `MAIN-LOOP` (the turn loop, the engine's under ADR 0002) and `V-VERSION` (the banner, a sanctioned diff) are builtins; statements after a non-returning builtin are dropped rather than denied.
- Combat tests gained a damage assertion, and derive villains and melee tables from the `VILLAINS` table rather than a hand-written list.

### Results
- **358 routines extracted** (was 352), 29 catalogued, 52 invisible (was 57) — 45 of those by design.
- Parity unchanged at **151/163, 117/117 strict**; engine **108** tests, IR **185**.

---

## [v0.7.1] - 2026-07-20 — Correction to v0.7.0

Documentation only. No code change.

### Fixed
- **v0.7.0's "villain combat landed" was an overstatement.** Only the player's blow resolves; `I-FIGHT`, `DO-FIGHT`, `VILLAIN-BLOW` and `WINNER-RESULT` are unextracted, so villains never strike back and **the player cannot be hurt or killed in a fight**. The v0.7.0 tests pass against this, since a one-sided fight still kills the troll and still prints only legal messages.
- **v0.7.0's `DEF*-RES` "reconstruction defect" was a misreading.** `GO` patches those tables at runtime (`1dungeon.zil:2644`); the zeros are placeholders the game overwrites. `TABLE_CORRECTIONS` holds correct values on a wrong premise and is superseded by extracting `GO`.
- Root cause of both: **`GO` is not an entry ref**, so the game's initialization routine — five daemon queues plus the melee-table patches — is never reached.

---

## [v0.7.0] - 2026-07-20 — Villain Combat

Combat outcomes now resolve: the troll fights, dies, and drops its axe, opening the route past the Troll Room.

### Added
- **IR `random` expression op** (schema **0.14.0**) — ZIL `<RANDOM n>`, a uniform draw in 1..n. The op names the draw; which sequence a seed produces stays an engine concern, so the IR is not pinned to any interpreter's PRNG.
- **`PRINT` and `PRINTD` extraction**, as `tell` parts — unblocking `REMARK`, which renders melee messages.
- **`engine/test/combat.test.ts`** — randomized turns verified by *membership*: every line printed during a fight must be a message the game could have produced, across 40 seeds. The legal set is derived from the IR rather than hand-listed, and a negative control asserts the check can actually fail.

### Fixed
- **Villain combat was an extraction gap, not an engine one.** `HERO-BLOW` was catalogued on `operator RANDOM`; because extraction is reachability-driven, everything it called (`VILLAIN-BLOW`, `VILLAIN-STRENGTH`, `VILLAIN-RESULT`, `WINNER-RESULT`, `REMARK`) was never queued and appeared in neither the IR nor the catalog.
- **Melee result tables `DEF1-RES`/`DEF2-RES`/`DEF3-RES`** — the ZILF reconstruction writes literal zeros where table views belong, keeping the real values only in comments; the corrections restore them, with the reference-build evidence recorded at the site.

### Changed
- `RANDOM` in *statement* position is denied with an accurate reason: there it seeds the generator rather than drawing, which is a different operation.
- Removed the now-dead `HERO-BLOW` and `RANDOMIZE-OBJECTS` builtin stubs.
- Walkthrough 10's `# parity:` directive rewritten — its remaining diffs are `I-SWORD`, not combat.

### Results
- Walkthrough 10: stuck-at-turn-13 → **24/28**. Overall parity **138/163 → 151/163 (93%)**; strict **117/117 (100%)**.
- Engine tests **103 → 108**; IR **184/184**. Routines extracted **346 → 352**.

---

## [v0.5.18] - 2026-07-20 — Project Scope, Trademark Notices, and the `.avb` Format

Documentation and tooling only. No engine, IR, or artifact changes; Milestone 4 remains the next work.

### Added
- **ADR 0002 "Scope of Portability: source frontends, not story files"** — the long-term target is an IR-native engine with pluggable *source* frontends (ZIL is the first; the rest of the ZIL family is the cheap expansion, Inform 6 a plausible second). Compiled story files (`.z3`/`.z5`/`.z8`) are explicitly out of scope: executing a memory image re-raises the ADR's existing ZLR/ZVM objection and would be a second engine, not an extension. Binds three rules on Milestone 4, including that the first portability test is importing Zork II *after* M4 works rather than a speculative abstraction built in advance.
- **Trademark notices** in `README.md` and `NOTICE` — ZORK/INFOCOM attributed to Activision, MICROSOFT/COMIC CHAT to Microsoft, with an explicit non-affiliation statement. Records that the MIT grants convey copyright only and no trademark licence is implied by MIT, Apache-2.0, or any file here, and that trademark names appear nominatively (identifying the historical works; reproducing the `ZORK I` status banner that golden-transcript parity requires).
- **`art/` module** with `art/poc/avbdec.py` — a reference decoder for the Comic Chat `.avb` avatar format, writing PNGs named by part, emotion, and intensity. Stdlib only. Verified across the corpus: 191/191 files parse, 4656/4656 images decode.
- **`docs/AVB_FORMAT.md`** — normative `.avb` specification. Records five behaviours a reader written from the historical header alone gets wrong, four of them silently: the 32-bit `AK_OFFSET_ADJUSTMENT` (its comment says "2-bit"), the differing body/face/torso field sets, `MaskedMonoPalette` not being the render palette, intensity being `byte/255` rather than the wire protocol's scaling, and four BI_RLE4-compressed images.

### Changed
- **`README.md` de-staled.** WebAssembly references removed — Gate B dropped WASM in ADR 0002 and the README still described "a browser-native architecture powered by WebAssembly" and a `WebAssembly Runtime` pipeline stage. The architecture diagram now shows the TypeScript engine emitting the versioned JSON event contract. The repository-structure block was rewritten against the real tree; it had listed `importers/`, `zork/`, `wasm/`, `graph/`, `wiki/`, `tests/`, `scripts/`, `assets/`, and `renderer/`, most of which have never existed.

### Notes
- Comic Chat asset inventory established: 31 characters (5 single-pose stubs), 18–43 poses each, every pose tagged with an 8-point emotion wheel plus intensity. Against Zork I's five NPCs, characters are abundant; **backdrops are not** — the format defines `AT_BACKDROP` but no instance exists, leaving three 315×315 `.bmp` files against 110 rooms. Recorded as an open M5 design question.

---

## [v0.5.17] - 2026-07-20 — Licensing, Provenance, and Public-Repo Preparation

Documentation and repository hygiene only. No engine, IR, or artifact changes.

### Added
- **ADR 0002 "Alternatives Considered"** — records why the project does not reuse an existing Z-machine interpreter (ZLR, ZVM/ifvms.js). A compiled story file is an opaque memory image; the engine↔UI contract needs semantics (`speech.speaker`, `player-moved` room ids) that only the IR preserves. Establishes the **Z-Machine Standards Document 1.1** as the normative source for Milestone 4 Group A builtin semantics.
- **Attribution for build tools** in `NOTICE` and `THIRD_PARTY.md` — ZILF/ZAPF 0.11.1 (GPL-3.0) and Frotz/dfrotz 2.55 (GPL-2.0-or-later), invoked as external executables and neither vendored nor redistributed, so their copyleft terms do not reach this project's Apache-2.0 source.
- **`README.md` "Provenance and Licensing"** — what is imported and under what grant, what is deliberately absent, and how the project relates to existing Z-machine tooling.
- **`reference/`** (gitignored) for third-party reading material, with a local `README.md` recording provenance and warnings.

### Changed
- Comic Chat paper moved `docs/` → `reference/`; references updated in `HANDOFF.md` and `docs/DEVELOPMENT_PLAN.md`.
- Commit authorship switched to a GitHub `users.noreply` address; existing history rewritten to match, ahead of making the repository public.

### Removed
- **Comic Chat build outputs untracked** (299 files, ~33 MB): `.exe`, `.dll`, `.ocx`, `.lib`, `.class`, `.map`, `.sym`, plus a vendored Sun JDK 1.1.4 (`classes.zip`) not covered by Microsoft's MIT grant. All are build products of source that remains tracked. **Source, documentation, and comic art (`.avb`/`.bmp`/`.gif`/`.jpg`/`.ico`, 661 files) are untouched** — the art is a Milestone 5 input. `original-projects/zork1/` is entirely unaffected.

### Notes
- ZLR ships **no license for its own code** (verified 2026-07-19: no LICENSE/COPYING, no copyright headers in `ZLR.VM/*.cs`; the license files under `Demona/Gargoyle/` cover a vendored Gargoyle and its dependencies). Default copyright therefore applies — more restrictive than GPL. It is a last-resort reference only; the Standards Document is the primary source.
- `original-projects/` remains version-controlled by design (`AGENTS.md`). Both imports carry genuine Microsoft MIT grants, and the pipeline reads from them.

---

## [v0.5.4] - 2026-07-18 — Behavior Extraction Complete

### Added
- **213 Zork I action routines** extracted as structured behavior ASTs (ADR 0001) — covers 67% of referenced handlers; complex routines catalogued for deferred extraction.
- IR schema 0.4.0 with `routines` section, new expression/statement operations, implicit-return semantics resolved.

---

## [v0.5.0] - 2026-07-18 — World Model Complete (Rooms + Objects + Vocabulary)

### Added
- **Full declarative world of Zork I in IR**: 110 rooms, 352 exits, 137 objects, 267 syntax rules, 75 synonym sets, 21 buzzwords, 13 direction words — all source-verified.
- ZIL string semantics (hard newlines `|`, line-wrap handling) matching golden transcripts.

### Changed
- IR schema evolved through 0.1.0 → 0.3.0 (additive: world, objects, vocabulary sections).

---

## [v0.4.3] - 2026-07-18 — Knowledge Tooling Decided (Gate A)

### Added
- **Graphify adopted** for structural knowledge graphs (per-module: `importer/`, `ir/`).
- Semantic knowledge remains hand-authored in `wiki/` (OpenWiki not adopted — no budget for paid LLM).

---

## [v0.4.2] - 2026-07-18 — Engine Runtime Decided (Gate B)

### Added
- **ADR 0002**: Engine will be aengine Runtime** — zero-dependency TypeScript package (`engine/`); WebAssembly dropped.
- **Engine↔UI Contract**: pure deterministic synchronous state machine (`command() → TurnResult{events}`), seeded RNG, versioned JSON event union (narration, speech, player-moved, object-moved, score-changed, game-over, question).

### Changed
- Gate B resolved: both behavior representation (ADR 0001) and runtime decisions finalized.

---

## [v0.4.0] - 2026-07-18 — IR Schema: Declarative World

### Added
- **IR Schema 0.1.0** — TypeScript types as source of truth, strict validator with referential integrity, exit representation mirroring ZIL 1:1, hand-authored sample world.

---

## [v0.3.0] - 2026-07-18 — Deterministic ZIL Parser (Milestone 1)

### Added
- **ZIL Parser**: S-expression lexer, recursive-descent parser, typed AST with source positions. All 10 corpus files parse cleanly (254 top-level forms in `1dungeon.zil`).
- Round-trip invariant: `parse(print(ast))` identical to original AST.
- Committed AST artifacts for all 10 files (6.3 MB).

---

## [v0.2.0] - 2026-07-18 — Verification Harness (Milestone 0)

### Added
- **Reproducible ZILF compilation** to `zork1.z3` (28 warnings, no errors, no source patches).
- **Golden transcript harness** with `dfrotz` — 3 deterministic transcripts captured and cross-validated against shipped Infocom Release 119.

---

## [v0.1.2] - 2026-07-18 — Licensing & Development Plan

### Added
- Root `LICENSE` (Apache 2.0) + `NOTICE` with MIT attributions for Zork I and Comic Chat.
- Development Plan: Milestones 0–6 with four decision gates.

---

## [v0.1.1] - 2026-07-18 — Project Renamed

### Changed
- **Renamed** from "Comic-Zork" to **"Grues in Comic"** (avoids Zork trademark; "grue" predates Zork, copyright-safe).
- GitHub repository: `dkdev24/grues-in-comic`.

---

## [v0.1.0] - 2026-07-18 — Repository Initialization

### Added
- Git repo + private GitHub repo `dkdev24/grues-in-comic`.
- Historical reference source imported:
  - Zork I ZIL source (Infocom, 1977–1981)
  - Microsoft Comic Chat v1.0, v2.1b, v2.5-beta-1 (original + modernized)
- Core docs: `AGENTS.md`, `CLAUDE.md`, `README.md`, `THIRD_PARTY.md`, `HANDOFF.md`, `WORKLOG.md`.

---

## Legend

- **Added** — new user-visible capabilities
- **Changed** — changes in existing functionality
- **Fixed** — critical bug fixes only
- **Removed** — removed features