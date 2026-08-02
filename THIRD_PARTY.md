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
- Purpose: Comic presentation reference

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
  bold, Latin subset only)

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
