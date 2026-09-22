# Third-Party Components

## Zork

- Repository: https://github.com/historicalsource/zork1
- License: MIT
- Imported: 2026-07-18
- Purpose: Gameplay logic reference

---

## Microsoft Comic Chat

- Repository: https://github.com/microsoft/comic-chat
- License: MIT
- Imported: 2026-07-18
- Purpose: Comic presentation reference — the panel/balloon algorithms are ported from its
  source (see `docs/adr/0007` and `0008`), and its avatar art is **decoded and redistributed**
  (below).
- **Art redistributed, not merely referenced.** The character sheets shipped under
  `web/assets/comic/` (`dan.png`, `tiki.png`) and under `web/assets/comic/roster/` (the fifteen
  choosable characters the cast picker offers, `art/src/roster.ts`) are decoded from Comic Chat's
  own `.avb` avatar files by this project's `art/` pipeline and packed into sprite sheets; the
  browser draws from them at runtime. Since v0.28.0 the art is a **foreground feature** — players
  choose a character by name on a screen of their own — rather than an implementation detail, which
  is why the roster is named here as well as the default cast. They are a format conversion of Microsoft's MIT-licensed art, which the MIT
  license permits, and they carry its copyright. The `.avb` originals are preserved unmodified in
  `original-projects/comic-chat/`; the format itself is documented in `docs/AVB_FORMAT.md`.
- **Comic Chat's own backdrops (`.bgb`) are decoded for reference only, and are not
  redistributed.** `art/tools/bgbdump.ts` (`pnpm -C art run dump:bgb`) decodes the nine
  shipped backdrops — Jim Woodring's art — into `reference/backdrops-original/`, which is
  **gitignored**: the decoded PNGs are never committed and never ship. They exist so this
  project's own backdrop art can be calibrated against the real thing. The `.bgb` originals are
  preserved unmodified in `original-projects/comic-chat/` like the `.avb` files.

---

## Generated backdrops — original assets, no third-party source

The 30 room backdrops under `web/assets/comic/` (`cellar.png`, `maze.png`, `barrow-interior.png`
and the rest) are **not** Comic Chat art and are not derived from any third-party asset. They were
generated for this project from the prompts recorded in `docs/backdrop-generation-plan.md`, in a
1-bit hatch idiom chosen to sit beside the Comic Chat figures, and are covered by this
repository's own Apache-2.0 license.

The same applies to the **vector backdrop generators** under `art/vector/` (`woodring.mjs` and its
scenes). They emit original SVG; nothing is traced, sampled or copied from Comic Chat's art. The
originals are used only as a *reference to look at* while tuning — the way an artist works from a
model — and one scene (`gen_field.mjs`) is an exercise that reproduces the composition of Comic
Chat's `field` backdrop in this project's own code. **Its output is a study, not a shipped asset**;
if anything of that kind is ever shipped it needs its own provenance note here, since a close copy
of someone's composition is a different question from a shared idiom.

Listed here rather than left unsaid because the file they ship in is the same folder as the
redistributed avatar sheets above, and the two have different provenance.

---

## Comic Neue

- Source: Google Fonts (https://fonts.google.com/specimen/Comic+Neue), designed by Craig Rozynski
- License: SIL Open Font License 1.1
- Imported: 2026-08-02
- Purpose: Self-hosted balloon/title font for the comic pane (`web/assets/fonts/`).
  The real Comic Sans MS is a proprietary Microsoft core font and cannot be
  vendored; Comic Neue is an open, freely redistributable redraw and was
  already second in the code's font fallback chain (`web/src/comic/balloon.ts`,
  `render.ts`). Self-hosting fixes canvas text rendering on platforms — Android
  Chrome, notably — that have neither Comic Sans MS nor Comic Neue installed
  as a system font.
- Files vendored: `comic-neue-400.woff2`, `comic-neue-700.woff2` (regular +
  bold, Latin subset only), and `OFL.txt` — the license text, which OFL-1.1
  requires be distributed with the font. Copyright 2014 The Comic Neue Project
  Authors (https://github.com/crozynski/comicneue). The font stays under OFL-1.1
  whatever this project's own license is; the subset files are unmodified
  conversions and carry no Reserved Font Name of their own.

---

# Build-Time Libraries

## Rough.js

- Repository: https://github.com/rough-stuff/rough
- Version: 4.6.6 (`art/vector/package.json`)
- License: MIT
- Copyright: Preet Shihn
- Imported: 2026-08-24
- Purpose: Evaluated as a drawing engine for the vector backdrop generators
  (`art/vector/gen_rough.mjs`). Its `hachure` / `cross-hatch` fills and its
  `roughness` / `bowing` parameters were a good fit for a wood-engraving idiom.
- Status: **Superseded and not used by the current generator.** Once Comic
  Chat's own backdrops were decoded and looked at, the target idiom turned out
  to be controlled line work rather than sketchy line work, and rough.js's
  wobble is the wrong texture for it. `gen_rough.mjs` is kept as a labelled
  dead end (see `art/vector/README.md`).
- Distribution: **Not vendored and not redistributed.** It is an npm dependency
  of the gitignored `art/vector/node_modules/`, invoked at authoring time only.
  No rough.js code is linked into the engine, the web bundle or any shipped
  asset, and the SVG it produced contains no rough.js source.

---

# Build & Verification Tools

The following are **external tools invoked by the verification pipeline**. No
source or binary from these projects is vendored into this repository or
redistributed with it; they are installed separately by the developer and run
as standalone executables (see `verification/build.sh` and
`verification/run-transcripts.sh`). Their copyleft terms therefore do not
extend to this project's own Apache-2.0 source.

## ZILF / ZAPF

- Repository: https://foss.heptapod.net/zilf/zilf
- Version pinned: 0.11.1 (macOS arm64 package)
- License: GPL-3.0 (`COPYING.txt` in the distributed package)
- Copyright: Tara McGrew and contributors
- Purpose: Compiles `original-projects/zork1/` ZIL to `verification/build/zork1.z3`
- Usage: Invoked as external executables by `verification/build.sh`; not vendored, not linked, not redistributed
- Note: The package also ships the ZILF game library (`zillib/`, BSD-style,
  Copyright (c) 2010-2025 Tara McGrew and Josh Lawrence). **This project does
  not use zillib** — Zork I carries its own historical library, so only the
  compiler and assembler are exercised.

## Frotz (dfrotz)

- Repository: https://gitlab.com/DavidGriffith/frotz
- Version pinned: 2.55
- License: GPL-2.0-or-later
- Copyright: Stefan Jokisch (original author), David Griffith (current maintainer), and contributors
- Purpose: Replays walkthroughs against the reference story file to produce the golden transcripts that engine output is diffed against
- Usage: Invoked as an external executable by `verification/run-transcripts.sh`; not vendored, not linked, not redistributed

---

# Referenced, Not Used

## ZLR

- Repository: https://foss.heptapod.net/zilf/zlr
- Copyright: Tara McGrew
- Purpose: Z-machine interpreter for .NET, kept as a **last-resort reading
  reference** for builtin semantics per ADR 0002's "Alternatives Considered".
  The primary source for those semantics is the Z-Machine Standards Document
  1.1, not this implementation.
- License: **None found — treat as all rights reserved.** Inspection of the
  full source tree (2026-07-19) turned up no LICENSE or COPYING file for ZLR's
  own code and no copyright headers in `ZLR.VM/*.cs`. The only license files in
  the tree belong to a vendored copy of Gargoyle (GPL) and its dependencies
  (libpng, SDL, FreeType, Luxi fonts) under `Demona/Gargoyle/`, which cover
  those components, not ZLR. Absent an explicit grant, default copyright
  applies — which is **more** restrictive than GPL, not less.
- Usage: **None.** No code is used, linked, adapted, or distributed. Listed
  here only so the reference relationship is documented.
- Local copies of this and ZILF's source, if present, live in the gitignored
  `reference/` directory and are never committed.
