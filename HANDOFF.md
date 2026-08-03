# HANDOFF.md

Cross-session state. **Read in full at session start; update at session end.**

**Scope rule — this file is a cost paid every session, so it holds only three things:** where the
project is, what to do next, and what is still undecided. Session narrative → `WORKLOG.md`. Durable
cautions → `docs/PITFALLS.md`. Deferred work → `docs/FUTURE_WORK.md`. **Adding to this file is the
exception; adding to one of those three is the rule.** If it will still be true in a year, it does
not belong here.

---

## Current Version
**0.26.6** · Platform: **macOS only** (2026-07-28)

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
- **M6.6 ✅** (closed v0.25.2, revised v0.26.2) `/hint`/`/help` for players unfamiliar with
  text-adventure trial-and-error. **Shell commands now, not game verbs** — `/hint` is
  `Engine.hint()`, a non-turn query; plain `hint`/`help` typed in the transcript are unknown words.
  Console pane only, by the user's explicit choice.
- **M6.3 ✅** (closed v0.26.0, corrected v0.26.1, mobile-UX revisions v0.26.3) The static site —
  landing, about, generated changelog — built per `docs/DESIGN.md`, verified in the browser at real
  viewport sizes. `web/` is now the website root; the game moved to `web/play/`. Recorded origin is
  `https://grues.danielkimdev.com` (corrected from a wrong domain in v0.26.0).
- **M6.5-beta ✅** (closed 2026-08-02, v0.26.3) Private Cloudflare Pages beta live at
  `grues.danielkimdev.com` — repo stays private, not the 1.0.0 launch. First real-device (Android
  phone) test surfaced five mobile-UX issues, all fixed and deployed: the masthead's blinking cursor
  read as a stray input prompt (removed everywhere); `/play`'s static "New to text adventures?" note
  wasted vertical space (removed); `/play`'s masthead header wasted a fixed 2.5rem strip (removed —
  its home link folded into the comic pane's own title bar); comic balloon text fell back to a
  generic font on Android, which has neither Comic Sans MS nor Comic Neue installed (fixed by
  self-hosting Comic Neue as a woff2 web font, loaded explicitly before the first canvas draw since
  `@font-face` alone never fires for canvas-only text); and the on-screen keyboard covered both panes
  while typing (fixed v0.26.4 — `main.ts`'s submit handler now blurs `#command`, deferred one tick via
  `setTimeout` since Android Chrome ignores a synchronous `blur()` inside the submit handler). Detail
  in `WORKLOG.md` v0.26.3 and v0.26.4. **All five phone-test issues are now closed.**

**Tests:** 296 web · 142 engine · 198 IR · parity 143/143 strict. Pixel gate 17/17 clean.

---

## Last Session — Virtualized strip (v0.26.5) + one jump control for both panes (v0.26.6)

### v0.26.6 — Jump to beginning / Jump to latest

**One control, moving both panes, overlaying the comic pane's bottom-right** (`web/src/jump.ts`,
wired in `main.ts` because it is the only place that knows both panes). Manual scrolling stays
unsynchronized, by the user's decision: the transcript↔panel mapping is not monotonic (a turn yields
0..N panels), while "the top" and "the end" need no mapping at all.

**Revealed by a reader gesture, faded after `IDLE_MS` (2s).** Shown-when-useful alone would have put
"Jump to beginning" permanently over the newest panel — there is history above from turn 2. Two rules
compose: *useful* (some pane is off that edge) and *awake* (recent gesture, or holds focus).

**Slash commands were considered and rejected** for this — typing one raises the on-screen keyboard
over both panes to perform a scroll, and the user ruled out a secondary path since desktop has a
mouse.

**`ScrollPane.onReaderScroll` is separate from `onScroll` on purpose**: both panes scroll themselves
on every turn, so waking on `scroll` would flash the control once per command. And **the jump is
instant, never smooth** — a smooth scroll across the strip would paint every panel it passes.

Tests: 296 web, unchanged (`jump.ts` is DOM-only; the web suite runs in Node and is DOM-free).
Verified in Chrome at 390×844 over a 57-panel game.

### v0.26.5 — The comic strip is virtualized

**Resuming a long save was slow on a phone, and the real ceiling was memory.** Every emitted panel got
a canvas of its own on arrival, and a canvas costs `w × h × dpr² × 4` bytes on or off screen. Measured
in Chrome over a real 68-panel autosave: **28.15 MB of backing store before, 2.48 MB after** (6 panels
resident, not 68). Flat in the length of the game now; it was linear, and a completed game is a few
hundred panels.

`comic-view.ts` now paints a panel when an `IntersectionObserver` puts it within `SCROLL_HEADROOM`
(one screen) of the strip and zeroes its intrinsic size when it leaves. **Elements, CSS sizes and
`aria-label`s are never virtualized** — only bitmaps are, so scroll height, grid flow and the
screen-reader reading of the strip are unchanged. No `IntersectionObserver` ⇒ paint everything, which
is the old behaviour.

**The pose round-robin moved from first-draw to strip-join**, because lazy painting is out of order
and a round-robin cannot survive that. `renderPanel`'s width-free body-selection step is exported as
`selectFigures`; the view runs it as each panel joins and freezes the cycle state it chose from, so
every repaint is idempotent. `web/test/select-figures.test.ts` pins it, including a back-to-front
repaint. Detail in `WORKLOG.md` v0.26.5; the durable rule is in `docs/PITFALLS.md` → Web & the comic
pane.

Tests: 296 web (3 new), pixel gate 17/17 clean. Engine, IR and parity untouched.

**Not done, and deliberately separate:** the jump control reaches the two *ends*; finding a *moment*
in the middle (room markers, paged history, panel→transcript linking via `Panel.turn`) is untouched,
as is the `Turn[]` autosave growing without bound against a ~5 MB quota. Both are in
`docs/FUTURE_WORK.md`.

## Next Actions

**We are in M6.** Stage detail, the D1–D5 decision table and the 6.1 slices live in
`docs/DEVELOPMENT_PLAN.md` §6 — this is the index, not the plan.

1. **Mobile UX.** ✅ All five issues from the v0.26.3 phone pass are closed (the last, the on-screen
   keyboard, in v0.26.4). **v0.26.5 closes the sixth, found later: the strip is virtualized**, so
   resuming a long save no longer scales its canvas memory with the panel count, and **v0.26.6 adds
   the jump control** — one overlay, both panes, revealed by scrolling. What that leaves is finding a
   *moment* rather than an end (room markers, paged history, `Panel.turn` linking), which is in
   `docs/FUTURE_WORK.md` rather than scheduled here.
2. **M6.3 — the static site.** ✅ Closed v0.26.0, mobile-UX revised v0.26.3–v0.26.4. Landing, about and a
   generated changelog are built and verified in the browser; the game lives at `/play/`.
3. **M6.1 — the comic pane becomes a cartoon.** ◐ Mechanics closed (ADR 0010 fully built, v0.24.9).
   **6.1e ◐ is the only open item**: authored dialogue across 110 rooms, committed as data (D1
   sanctions the volume). The gazetteer is at 88 rooms; `BEAT_SCRIPT` at 12 beats / 70 authored
   exchanges. No exit criterion beyond "the user says the product is ready" — pick up when there's
   appetite for more authoring.
4. **M6.4 asset separation & neutral branding** (☐, independent of everything) · **M6.5 public
   release** → tag `1.0.0` (☐, needs the rest — 6.3's deliverable is now part of what it packages).
   **6.5-beta ✅ closed 2026-08-02**: private-repo Cloudflare Pages beta live at
   `grues.danielkimdev.com` — Git-linked `grues-in-comic` Pages project, custom domain resolving,
   confirmed working on a phone. Repo stays private; not the 1.0.0 launch. Setup detail in
   `docs/DEVELOPMENT_PLAN.md` §6.5-beta and the `/world/`-copy gotcha in `docs/PITFALLS.md` →
   Tooling & platform.
5. **ADR 0006 Slice 5 — session-recap PDF export.** ☐ The only open ADR slice, schedulable whenever.
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
| `web/assets/brand/` | The §3.7 glyph set — favicon, touch icon, OG card, and the card's source |
| `docs/DESIGN.md` | **Look & feel for the static site and the gameplay screen — the sole visual reference, no mockup** |
| `docs/DEVELOPMENT_PLAN.md` | Milestones, stages, gates — **the authority on what to do next** |
| `docs/PITFALLS.md` | Durable cautions by subsystem — read the relevant section before changing code |
| `docs/FUTURE_WORK.md` | The deferred backlog + the pre-1.0.0 iteration protocol |
| `docs/adr/` | ADRs 0001–0010. **0009 governs the comic pane from 6.1c on; 0010 (Accepted) governs the Hero's channel and the panel's unit from 6.1h on** |
| `original-projects/`, `reference/` | Historical sources (tracked) · third-party reference (**gitignored**) |
| `wiki/` | Hand-authored semantic notes (`the-hero.md`, `the-guide.md`, …) |
| `WORKLOG.md` | Persistent history, one entry per version, never edited |
