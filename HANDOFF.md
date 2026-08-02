# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Adding to this file is the
exception; adding to one of those three is the rule.** If it will still be true in a year, it does
not belong here.

---

## Current Version
**0.25.3** · Platform: **macOS only** (2026-07-28)

## Project Status

**Grues in Comic** (was Comic-Zork) — repo `dkdev24/grues-in-comic`, not yet public. Zork I (ZIL)
modernized to a browser-native comic adventure via an IR the engine executes.

- **M1–M4 ✅** `importer/` (ZIL parser) · `ir/` (schema, validator, extraction — 110 rooms, 137
  objects, 267 parser rules, 360 routines) · `engine/` (world runtime, parser, dispatch,
  save/restore, combat + thief). **Parity 143/143 strict** over 11 walkthroughs. Gates A and C
  cleared.
- **M5 ✅** (closed 2026-07-28) Comic presentation. **The game is completable in the browser** —
  350/350, ends in `STONE-BARROW`, pinned by `engine/test/completion.test.ts` (seed 1234). Gate D
  cleared. ADRs 0004–0008 all built; 0008 is a cited port of the Comic Chat layout stack with a
  pixel gate.
- **M6 ◐** — the road to 1.0.0 (repo public + website ships). Stages and the decision table are in
  `docs/DEVELOPMENT_PLAN.md` §6. **6.1a–6.1d and 6.1f–6.1k are done; 6.2 is done (v0.25.0); 6.1e is
  paused, the only open item under M6.1.** The corpus is repaired, so **D5 and the two-shot are both
  met over a game that is actually won** — every M6.1 figure quoted before v0.24.0 was measured over a
  losing replay and is void. **ADR 0010 is Built (v0.24.9) — all four slices done.** The Hero declares
  his command as table-talk on 98.3% of turns, that declaration answers the DM's still-open frame
  across the turn boundary, a collapsed traversal run of two or more speaks its destination as one
  journey line, and **D5′ (the share of emitted panels carrying both speakers) has a band, 25–60%, set
  from today's 43.7% measurement** and asserted in `density.test.ts`. This closes M6.1's stated purpose
  — the remaining M6.1 work is 6.1e's authoring volume, which was always open-ended.
- **M6.6 ✅** (closed v0.25.2) `HINT`/`HELP` in-fiction commands, for players unfamiliar with
  text-adventure trial-and-error. Console pane only, by the user's explicit choice.

**Tests:** 292 web · 142 engine · 198 IR · parity 143/143 strict.

---

## Last Session — 6.3 unblocked: `docs/DESIGN.md` written, site glyph built (v0.25.3)

**No code shipped — this was the specification session.** M6.3 had been blocked since 2026-07-28 on
a user-supplied `DESIGN.md` plus mockups. Both halves are resolved: the document is written, and the
mockup requirement is **withdrawn**.

**The one rule that drives the whole design:** *the terminal is the page's substrate; the comic is
what is pinned to it.* Text on black in monospace (Zork's register); anything showing the game is a
Comic Chat window on top, grey chrome and cream interior. Never mixed inside one box. The token
block reuses `web/style.css`'s `:root` verbatim so site and game screen cannot drift; two accents
only, green for interactive text, amber reserved so the single CTA is the warmest thing on the page.

**Every §7 question is decided** — wordmark (terminal text + one original glyph), footer (`A project
by Daniel Kim` → `danielkimdev24.com`), feature cards, H1 (`Play Zork I as a comic strip.`), and
`/play` on the same origin. Two decisions worth carrying forward: the 143/143 **parity claim was cut
from the feature cards** as a developer's line a visitor cannot parse, and relocated to §3.4 and the
about page; and the user's own proposed H1 was **relocated, not dropped**, to the deck opener / meta
description / OG subtitle.

**§8's old rule was itself a hazard.** It said a mockup outranks the document. A generated page
mockup came back as a generic enterprise-SaaS page ("REHOST YOUR LEGACY VAX/VMS APPLICATIONS") with
none of the design in it, and the old rule would have let that overwrite the spec. Replaced: a later
mockup wins only where the document is silent, never against a dated decision.

**The glyph is built** — `site/assets/{glyph.svg, favicon-32.png, apple-touch-180.png, og-card.png,
og-card.source.html}`. The SVG is a *trace* of the user's raster (hull extraction, mirrored about
x=192), which snapped colours to the tokens, dropped the generator watermark, and tightened the crop
66% → 88%. **Verified at 16px**; the untightened raster was a blob at that size.

**`docs/grues-favicon/` is committed as the user's backup and must not be wired in** — a different,
earlier mark with lettering, a border frame and >2 tones, illegible at 16px, with an unfilled
white-themed manifest. Reasons recorded in `DESIGN.md` §3.7.

Full detail in `WORKLOG.md` v0.25.3. No tests affected — nothing executable changed.

## Next Actions

**We are in M6.** Stage detail, the D1–D5 decision table and the 6.1 slices live in
`docs/DEVELOPMENT_PLAN.md` §6 — this is the index, not the plan.

1. **M6.1 — the comic pane becomes a cartoon.** ◐ Mechanics closed (ADR 0010 fully built, v0.24.9).
   **6.1e ◐ is the only open item**: authored dialogue across 110 rooms, committed as data (D1
   sanctions the volume). The gazetteer is at 88 rooms; `BEAT_SCRIPT` at 12 beats / 70 authored
   exchanges. No exit criterion beyond "the user says the product is ready" — pick up when there's
   appetite for more authoring.

   **Pick this up only if there's authoring appetite; 6.3 is now the default next item.**
2. **M6.3 — the static site** (landing, about, public changelog as separate static pages). ☐
   **Unblocked 2026-08-02 — and this is where the next session should start.** `docs/DESIGN.md` is
   the sole visual reference; every §7 question is decided and **no mockup is required** (§8).

   **⇒ NEXT SESSION STARTS HERE.** Build order: (a) extract the §2 token block to a file both
   stylesheets import; (b) `site/index.html` + `site.css` — the six sections of §3, glyph already in
   `site/assets/`; (c) route `/` and `/play` in `web/tools/serve.ts`; (d) about + changelog pages,
   the changelog **generated, not hand-written** (§3.5). Iterate in the browser at real viewport
   sizes — §8 is explicit that the remaining decisions (line length, wrap points, bevel weight, hero
   air) are not visible in a still image.
3. **M6.4 asset separation & neutral branding** (☐, independent of everything) · **M6.5 public
   release** → tag `1.0.0` (☐, needs the rest).
4. **ADR 0006 Slice 5 — session-recap PDF export.** ☐ The only open ADR slice, schedulable whenever.
   **The PDF is deliberately not WYSIWYG.**

**The M6 list is open.** More items land as work proceeds; absence is not a scoping decision. **M6.1
ends when the user says the product is ready, not when a list empties.**

---

## Standing Rules

Three that apply to most sessions. Everything else is in `docs/PITFALLS.md`.

- **Read `docs/PITFALLS.md` for the subsystem you are about to change, before you change it.** Each
  entry was paid for by a bug or a wrong released build.
- **Measure before proposing rules.** Five plausible panel-grammar proposals died that way. The
  harness replay and the `art/` corpus answer questions cheaply.
- **New mechanical-layer code reads the C++ first and cites it** (ADR 0007). Canonical source is
  `original-projects/comic-chat/v2.5-beta-1-modern/`; the offline navigation graph is at
  `reference/comic-chat-v2.5-beta-1-modern/graphify-out/` (gitignored, rebuild *inside* that copy
  with `graphify extract . --code-only --no-label`).

---

## Key Paths
| Path | Purpose |
|---|---|
| `importer/`, `ir/` | ZIL parser → AST; IR schema, validator, extraction → `ir/artifacts/zork1.world.json` |
| `engine/` | Engine core. Zero-dep TS; `src/events.ts` is the ADR 0002 contract as code |
| `engine/harness/` | `replay.ts` (parity oracle), `golden.ts` (normalizer + directives), `complete.ts` (`runFullGame`) |
| `verification/` | `walkthroughs/*.cmd` + `golden/*.txt` from dfrotz |
| `web/` | Browser shell + comic renderer. `npm --prefix web run dev` → :8080. No bundler, by decision (`web/README.md`) |
| `web/tools/` | `gate.ts` (pixel gate), `density.ts` (M6.1 dialogue-density report), `cast-fixture.ts` (N≥3 bodies), `render-panel.ts`, `serve.ts` |
| `web/src/comic/script.ts` | The authored dialogue as data — DOM-free so the corpus replay can measure it |
| `art/` | Comic Chat art tooling (decode, pose, pack). Format spec: `docs/AVB_FORMAT.md` (**normative**) |
| `site/` | The public static site (6.3). `assets/` holds the built glyph set; pages not written yet |
| `docs/DESIGN.md` | **Look & feel for the static site and the gameplay screen — the sole visual reference, no mockup** |
| `docs/DEVELOPMENT_PLAN.md` | Milestones, stages, gates — **the authority on what to do next** |
| `docs/PITFALLS.md` | Durable cautions by subsystem — read the relevant section before changing code |
| `docs/FUTURE_WORK.md` | The deferred backlog + the pre-1.0.0 iteration protocol |
| `docs/adr/` | ADRs 0001–0010. **0009 governs the comic pane from 6.1c on; 0010 (Accepted) governs the Hero's channel and the panel's unit from 6.1h on** |
| `original-projects/`, `reference/` | Historical sources (tracked) · third-party reference (**gitignored**) |
| `wiki/` | Hand-authored semantic notes (`the-hero.md`, `the-guide.md`, …) |
| `WORKLOG.md` | Persistent history, one entry per version, never edited |
