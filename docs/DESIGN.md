# DESIGN.md

The look & feel specification for the public static site (`docs/DEVELOPMENT_PLAN.md` §6.3) and, by
extension, for the gameplay screen it has to sit next to.

**Status:** Draft for the user's approval. §6.3 is blocked until this is accepted; accepting it
unblocks the landing page, the about page and the public changelog.

**Scope:** the landing page in full, plus the tokens and rules the other static pages inherit. Page
copy is specified as intent and slot, not as final wording.

---

## 1. The premise

Two artifacts, seventeen years apart, both released as open source by Microsoft under MIT — Zork I's
ZIL sources and Microsoft Comic Chat's C++ — are joined here so that one narrates and the other
draws. **The site is the seam between them, and it should look like a seam, not like a blend.**

Two eras, both real, neither mocked:

| | **1977–1980** | **1996** |
|---|---|---|
| Artifact | Zork I, Infocom, ZIL on a TOPS-20 mainframe | Microsoft Comic Chat, IRC client, Win32 |
| Surface | DEC VT-series terminal — phosphor on black, fixed grid, no images | Windows 95 — grey beveled chrome, title bars, MS Sans Serif |
| Voice | Terse second person. "It is pitch black. You are likely to be eaten by a grue." | Speech balloons, gesture, exaggeration |
| Typography | Monospace, one weight, one size | Proportional UI sans, bold small caps for chrome |

**The rule that resolves every conflict below:** *the terminal is the page's substrate; the comic is
what is pinned to it.* Text lives on black in monospace. Anything showing the game — panels, figures,
screenshots, the CTA — is a Comic Chat window sitting on top of that, with its own chrome and its own
paper-white interior. Never mix the two inside one box.

**Not permitted:** ironic 90s pastiche (no marquee, no visitor counter, no "under construction"
GIF), fake CRT scanline overlays, skeuomorphic Windows 95 widgets used for site controls that were
never widgets (headings, links, body text). The retro is *cited*, in the same sense ADR 0007 uses:
this is reconstruction, not costume.

---

## 2. Tokens

The site reuses the gameplay screen's variables verbatim where they exist (`web/style.css` `:root`)
so the two never drift. Site-only additions are marked ✚.

```css
:root {
  /* substrate — the terminal (existing) */
  --console-bg:   #000;
  --console-fg:   #d8d8d8;
  --console-dim:  #8a8a8a;
  --accent:       #6fc36f;   /* phosphor green — the one saturated colour */
  --rule:         #3a3a42;
  --page-bg:      #0c0c0e;   /* body, one step off black (existing `body`) */

  /* the pinned artifact — a Comic Chat window (existing) */
  --comic-chrome: #c0c0c0;
  --comic-edge:   #808080;
  --comic-paper:  #efece2;
  --titlebar:     linear-gradient(90deg, #1c2f6b, #4a6bbd);

  /* ✚ site-only */
  --ink:          #14140f;   /* text on --comic-paper; never pure black */
  --amber:        #e8b04b;   /* second-era accent: used ONLY for CTA + focus */
  --halftone:     rgba(0,0,0,0.06);
  --measure:      68ch;      /* max line length for prose */
}
```

**Colour discipline.** Two accents total: `--accent` green belongs to the terminal era and marks
interactive text (links, prompts). `--amber` belongs to nothing historical in particular and exists
solely so the primary CTA is the single warmest thing on the page. Never use amber for a second
purpose; the moment two things are amber, neither is the CTA.

**Type.**

| Role | Family | Notes |
|---|---|---|
| Everything on the substrate | `--mono` (existing stack) | 15–16px body, 1.45 line-height, one weight |
| Comic-window chrome | `system-ui, "Segoe UI", Tahoma, sans-serif` | 0.85rem, 700, letter-spacing 0.02em — matches `#comic h2` |
| Balloon / dialogue text | `--mono` at 0.95rem, on `--comic-paper` | Comic Chat's own balloons were sans; monospace here keeps the game's voice legible and avoids shipping a webfont |

**No webfonts.** `web/` has no bundler by decision; the site adds no font loading, no CDN, no build
step. Everything is system stacks and hand-written CSS.

**Spacing** is a 4px scale (4 / 8 / 12 / 16 / 24 / 40 / 64). **Radius is 0** everywhere — neither era
had rounded corners. Depth is expressed by 1px borders and the two-tone bevel (`--comic-chrome`
light edge top-left, `--comic-edge` dark edge bottom-right), never by blur shadows.

---

## 3. Page structure

One scrolling column, sections stacked in this order. Section order is normative; a visitor who
reads only the first screen must know what the site is and be able to start.

```
┌──────────────────────────────────────────────────────────┐
│  ▚ masthead: GRUES IN COMIC          about · changelog   │  ← substrate
├──────────────────────────────────────────────────────────┤
│                                                          │
│   1. INTRODUCTION                                        │
│   Zork I, played as a comic strip.          ┌──────────┐ │
│   One paragraph on what this is.            │▓ Comic  ▓│ │  ← pinned window:
│                                             │  strip   │ │    live 3-panel
│   [ ▶ START PLAYING ]  ← amber, only CTA    │  sample  │ │    sample
│   secondary: read the background ↓          └──────────┘ │
│                                                          │
├──────────────────────────────────────────────────────────┤
│   2. FEATURES — 4 cards, 2×2                             │
├──────────────────────────────────────────────────────────┤
│   3. BACKGROUND — two-column: Zork | Comic Chat          │
│      then the joining paragraph, full width              │
├──────────────────────────────────────────────────────────┤
│   4. CHANGELOG — latest 3 versions, link to full page    │
├──────────────────────────────────────────────────────────┤
│   5. FOOTER — copyright, licences, attribution           │
└──────────────────────────────────────────────────────────┘
```

### 3.1 Masthead

Substrate. Wordmark left as terminal text — `GRUES IN COMIC` in mono, letterspaced, `--console-fg`,
with a blinking block cursor after it (CSS `steps()` animation, 1.06s, **disabled under
`prefers-reduced-motion`**). Right: text links `about` · `changelog` · `source` in `--accent`,
underline on hover. **No logo image in the masthead, no sticky bar** — the mark is live text, which
is the thesis of §1 stated in the first forty pixels of the page.

The glyph of §3.7 does **not** appear here. It is a thumbnail-only asset; putting it in the masthead
reopens the mixing rule §1 exists to prevent.

### 3.2 Introduction

**Job:** a visitor who has never heard of either project understands the product in one sentence and
can start in one click.

- **H1**, mono, 2.5rem clamped down to 1.6rem on narrow (**decided 2026-08-02**):

  > **Play Zork I as a comic strip.**

  Verb first, because the H1's job is to make the CTA below it feel like the obvious next motion
  rather than a separate decision. It names the game — *Zork* is the most recognisable word the page
  has — and states the twist in the same breath. Six words, so it holds one line on desktop and two
  on the narrowest supported width. **Any replacement must keep those three properties:** an
  imperative verb, the word *Zork*, and ≤ 8 words.

- **Deck**, ≤ 3 sentences, `--console-dim`, max `--measure`. Opens with the project's own framing,
  which is precise where the H1 is inviting:

  > Reimagining two historical Microsoft open-source projects as a browser-native comic adventure.
  > Zork I's original ZIL sources supply the world; Microsoft Comic Chat's layout engine draws it.
  > It runs in your browser — nothing to install.

  The deck must name both source works and state that nothing needs installing. That first sentence
  is also the page's **`<meta name="description">` and the OG card subtitle** (§3.7) — one line
  maintained in one place, since search results and link previews want the precise framing, not the
  invitation.
- **Primary CTA** — see §4.
- **Secondary link**, plain text, `--accent`: *"Where this came from"* → anchors to §3.4.
- **Right of the copy, or below it on narrow:** a *real* three-panel strip from the engine, in a
  Comic Chat window with title bar and cast strip. Static PNG at first paint; it is the product
  photograph and it must be output the engine actually produced, never a mockup drawn for the site.

### 3.3 Features

Four cards, 2×2 on desktop, 1-up below 720px. Each card is a small comic window: 1px `--comic-edge`
border, `--comic-paper` interior, `--ink` text, a bold sans title bar strip. Body ≤ 30 words.

Proposed four (final wording is the user's):

1. **It draws itself.** Every turn becomes panels — figures, poses, balloons — chosen by the same
   layout logic Comic Chat used, ported and cited.
2. **The whole game, unabridged.** All 110 rooms, 137 objects, the thief and the troll. Completable
   from `WEST OF HOUSE` to `STONE BARROW`.
3. **It remembers where you were.** Close the tab in the middle of the dungeon and come back to the
   same room. Three save slots and an autosave, kept in your browser — no account, no upload.
4. **Kind to newcomers.** Never played a text adventure? `HELP` explains how commands work and
   `HINT` shows what's around you, without spoiling a puzzle.

Cards do not link anywhere. They are claims, not navigation.

**Every card must be true on the day the site ships.** Card 3 describes M6.2 as built in v0.25.0
(autosave on boot plus three named slots, `web/src/persistence.ts`); card 4 describes M6.6, built in
v0.25.2. Do not add a card for anything unbuilt — the session-recap PDF export (ADR 0006 Slice 5) is
the obvious temptation and is still open.

**Where the parity claim went.** An earlier draft used "143 of 143 walkthroughs, byte for byte" as
card 3. It was replaced 2026-08-02 because it is a *developer's* credibility claim, not a player's
reason to click — a visitor who has never played Zork does not know what a reference interpreter is.
It is still the strongest evidence the project is serious, so it moves to §3.4's joining paragraph
and to the about page, where a reader who wants rigour will look for it. It does not disappear.

### 3.4 Project background

Substrate, prose, max `--measure`, centred. Two short columns side by side (stacked on narrow), each
headed by a small monospace rule label:

- **`ZORK I · 1980`** — Infocom, written in ZIL by Marc Blank, Dave Lebling, Bruce Daniels and Tim
  Anderson. Microsoft released the source under the MIT licence (© 2025 Microsoft).
- **`COMIC CHAT · 1996`** — Microsoft's IRC client that rendered conversation as an automatically
  composed comic strip; shipped with Internet Explorer 3.0, discontinued in the early 2000s. Its
  source is likewise MIT (© Microsoft Corporation).

Then one full-width paragraph, the thesis: this is **not** a source port and does not recreate either
historical runtime. The ZIL is understood, its semantics extracted into an intermediate
representation, and the IR executed by a browser-native engine; the comic layer is a cited port of
Comic Chat's layout logic. Link out to both upstream repositories and to this project's own repo.

**Accuracy constraint:** the release dates and licence facts above must be stated only as far as the
`LICENSE` and `README.original.md` files in `original-projects/` support them. Do not assert a
specific release month, a partnership, or a press narrative on the landing page. If richer history is
wanted, it belongs on the about page with citations.

### 3.5 Changelog

Latest three versions only, rendered on the substrate as a terminal listing:

```
0.25.2   2026-08-02   HINT and HELP commands
0.25.0   2026-07-…    Save, restore and restart in the browser shell
0.24.9   2026-07-…    The Hero speaks his own commands
```

Version in `--accent`, date in `--console-dim`, summary in `--console-fg`. Below: `view full
changelog →`.

**Generated, not written.** §6.3 already recommends generating the public changelog from the
repository's own history rather than maintaining a second copy; this section is the first three rows
of that same generated data. Two hand-kept changelogs diverge the first time one is edited in a
hurry.

### 3.6 Footer & copyright

Substrate, `--console-dim`, 0.85rem, one line per item, no columns:

- **`A project by Daniel Kim`** — the name links to `https://danielkimdev.com` (decided
  2026-08-02). This covers the project's own code and authored dialogue, under this repository's
  licence. Phrased as authorship rather than a `©` line: it reads as a person's project, which is
  what it is, and it keeps the one warm human note away from the three licence rows below it.
  The link is `--accent`, `rel="me"`, and opens in the same tab.
- *Zork I source © 2025 Microsoft, MIT licence.* Link.
- *Microsoft Comic Chat source © Microsoft Corporation, MIT licence.* Link.
- *Zork is a trademark of its respective owner. This project is not affiliated with or endorsed by
  Microsoft, Activision or Infocom.*
- Link to `THIRD_PARTY.md` for the full attribution set.

**Ties to §6.4 (neutral branding):** the footer is where the licence and non-affiliation statements
land, and it must survive 6.4's asset separation unchanged. No Microsoft, Infocom or Zork logo or
wordmark is used anywhere on the site — names in plain text only.

### 3.7 The glyph — favicon and social card

**Decided 2026-08-02.** The wordmark stays live text (§3.1); a single small **original** glyph covers
the two places text cannot go.

**Built 2026-08-02.** The subject is **the grue's eyes in the dark** — two angular luminous shapes,
`--accent` green on `--page-bg`, nothing else of the creature visible.

| Surface | Asset | State |
|---|---|---|
| Master | `web/assets/brand/glyph.svg` | ✅ 384×384 viewBox, one `<path>`, `fill-rule="evenodd"` |
| Favicon | `web/assets/brand/favicon-32.png` | ✅ 32×32 |
| Apple touch icon | `web/assets/brand/apple-touch-180.png` | ✅ 180×180 |
| Social preview (OG/Twitter) | `web/assets/brand/og-card.png` | ✅ 1200×630 — glyph + §3.2 H1 + deck sentence, amber rule |
| — its source | `web/assets/brand/og-card.source.html` | ✅ Re-render, don't hand-edit the PNG |

**`og:image` must be an absolute URL** — relative paths are ignored by most scrapers. With the origin
settled (§6) it is `https://grues.danielkimdev.com/assets/brand/og-card.png`. Same for `og:url`.

**How the master was made, and how to redo it.** The user generated a raster candidate; the SVG is a
trace of it, not the raster itself. The green mask was extracted, split into two connected
components, reduced to convex hulls, simplified to 6 outer and 5 inner vertices per eye, then
**mirrored about x=192** — the generated halves already agreed to within one pixel, and mirroring
removes that pixel. Three defects were fixed in the same pass, each one a §3.7 requirement the raster
missed:

- colour snapped to the tokens (the raster measured `#6abf6e` on `#111113`);
- the generator's watermark sparkle removed — it survived downscaling as a visible dot at 16px;
- **crop tightened from 66% to 88% of frame width**, which is what makes the small sizes work.

**Verified at 16px**, the size that actually decides a favicon: the two eyes stay distinct and the
inner slits still read as notches. The untightened raster became a single green blob at the same
size — the crop, not the drawing, was the problem.

**Rasterising.** No `rsvg-convert`/ImageMagick on this machine. Headless Chrome renders the SVG
**inlined into an HTML wrapper** (an `<img src>` screenshots blank — it captures before load) at
1024×1024 with `--virtual-time-budget`, and `sips -z` downscales from that master. Chrome enforces a
minimum window size, so **do not screenshot directly at 32 or 180** — you get an empty frame.

**Constraint on any redraw:** two tones maximum, drawn from the §2 tokens, no gradient, no stroke, no
container shape, no lettering, radius 0.

**`docs/grues-favicon/` is a backup, not a shipping asset.** It is committed at the user's request
and holds an *earlier, different* mark — a pixel-art grue face with "GRUES IN COMIC" lettering inside
a border frame, as `.ico`, 16/32/180/192/512 PNGs and a `site.webmanifest`. **Do not wire it into the
site as it stands.** Four reasons, three of them rules from this section:

1. **It contains lettering.** Illegible below about 64px; at 16px the whole mark is a green smear.
2. **It has a container frame**, and more than two tones (multiple greens plus a glow and a scanline
   texture).
3. **It carries the generator's watermark**, like the raster the master was traced from.
4. Its `site.webmanifest` has empty `name`/`short_name` and white `theme_color`/`background_color` —
   wrong for a dark-substrate site regardless of which mark ships.

Kept because it is a legitimate alternative direction the user may want to revisit, and because the
`.ico` and the 192/512 Android sizes are formats §3.7's own set does not yet cover. **If that
direction is ever chosen, it needs a redraw against this section's constraints, not a rewiring** —
and the manifest fields must be filled in either way.

**The constraint that makes this cheap: it must be original work.** Do not build the glyph from Comic
Chat's bundled character art or from any Infocom asset. Both upstream repositories are MIT over *the
software*; Comic Chat's `README.original.md` §Trademarks separately requires that use of Microsoft
marks "must not cause confusion or imply Microsoft sponsorship" and subjects third-party marks to
their owners' policies. Rendering that art **inside the game** is the project and is what the MIT
release enables. Using it **as the project's identity mark** is a different act and is exactly the
case where sponsorship is arguable. An original glyph sidesteps the question entirely and needs no
`THIRD_PARTY.md` entry.

**Supersession.** The user is preparing a drawn logo. When it lands it replaces the glyph across all
three surfaces and may replace the masthead wordmark — that is a `DESIGN.md` amendment at the time,
not a licence granted in advance. **6.3 does not wait for it**; the glyph ships first and the site is
complete without the logo.

---

## 4. The CTA

There is exactly one primary CTA on the page: **`▶ START PLAYING`**, above the fold, linking to the
game app.

- A Windows-95-style raised button *rendered honestly*: `--amber` face, 2px bevel (light top-left,
  dark bottom-right), square corners, sans-serif label in `--ink`, 700 weight, 0.02em tracking.
- Hover: face lightens 6%. **Active: the bevel inverts** (dark top-left) and the label shifts 1px
  down-right — the 1996 press. Focus-visible: 2px `--amber` outline at 2px offset, never removed.
- Minimum hit area 44×44px. Label is a link (`<a>`), not a `<button>` — it navigates.
- **`href="/play/"`, with the trailing slash** (§6 gotcha 1). Without it the game's relative asset
  paths resolve one level too high and the page loads unstyled.
- It repeats **once** at the end of the page, after the changelog, and nowhere else.
- No "no install required" badge, no counter, no marketing sub-label beyond one line of ≤ 8 words.

---

## 5. Responsive, motion, accessibility

**Breakpoints:** single column below 720px; two columns 720–1100px; max content width 1100px, centred,
with 24px gutters. **The strip sample scales, the figures never distort** — same rule as the gameplay
screen (`style.css` §4a): the window chrome stretches, the panel image keeps aspect ratio.

**Motion:** only two animations exist — the masthead cursor blink and the CTA's press. Both are
removed under `prefers-reduced-motion: reduce`. No scroll-triggered reveals, no parallax.

**Contrast:** every text/background pair meets WCAG AA (4.5:1 body, 3:1 for ≥ 24px). `--console-dim`
on `--console-bg` is 5.6:1 and is the darkest permitted body text; do not dim further. `--ink` on
`--comic-paper` is ~14:1.

**Semantics:** one `<h1>`; sections use `<section>` with `aria-labelledby`. The strip sample carries a
real `alt` describing the panels' content, since it is the only place a screen-reader user learns
what the comic looks like. Skip-to-content link, visible on focus.

**Dark/light:** the site is dark-substrate only, by design — the terminal is the substrate and there
is no light-mode terminal in this fiction. Comic windows already supply the light regions. Do not add
a theme toggle.

---

## 6. Where the files live

**Decided 2026-08-02: one served root, with the game nested inside it.** There is no parallel
top-level site folder. `web/` *is* the website; the landing page sits at its root and the game moves
down one level into `play/`.

```
web/                    ← the website root; serve.ts already mounts this at /
  index.html            landing                     →  /
  about.html                                        →  /about
  changelog.html                                    →  /changelog
  site.css              the static pages' styles
  tokens.css            §2, imported by both stylesheets
  assets/
    brand/              §3.7 — glyph.svg, favicon-32.png,
                        apple-touch-180.png, og-card.png (+ its .source.html)
    strip-sample.png    the §3.2 product photograph
    comic/              (existing) the game's figure art
  play/
    index.html          the game                    →  /play/
    style.css           (existing, moved down)
  dist/ src/ test/ tools/                           (existing, unmoved)

ir/artifacts/           mounted at /world/ (existing)
```

**The directory tree is the URL space.** That is the whole point of this layout: there is no routing
table to keep in sync with a copy script, because the paths are the same object. `serve.ts` needs no
new mount — it already resolves `/` to `index.html` and already serves `/world/`.

### The earlier rationale was wrong, and is withdrawn

An earlier draft of this section put the site in a parallel `site/` folder and gave four reasons.
**Three of them do not survive scrutiny and are struck:**

| Struck reason | Why it fails |
|---|---|
| *"A typo fix would re-run the pixel gate"* | The gate is a manual script and there is no CI. Even with CI, a path filter solves it. |
| *"Load cost — visitors shouldn't download the dungeon"* | An argument for separate **entry points**, not separate folders. A landing page in the same folder loads nothing extra. |
| *"Keeps site CSS off the gated pane"* | An argument for separate **stylesheets**, which this layout still has. |
| *"6.4 asset separation"* | The extractable set is engine, IR and importer. `web/` is not in it. |

The one surviving concern is cosmetic: `web/` is an npm package with a tsconfig, vitest and native
devDependencies, and calling that same folder "the website" reads oddly. That is a **naming** problem,
addressed below, not an architecture one.

### What is actually irreducible

**The assembly step exists because of build outputs, not folder layout.** `dist/` is generated and
gitignored; `ir/artifacts/zork1.world.json` is 1.8 MB, generated, and lives outside `web/` on purpose
(so the page fetches the same document the parity harness replays). Those must be gathered into a
publish tree under any arrangement. This layout makes that script two copies instead of three — it
does not remove it.

### Deployment — deferred to 6.5. Local only until then.

**Decided 2026-08-02: nothing is published, anywhere, until the user calls the 1.0.0 release.** No
GitHub Pages, no custom domain in service, no CI deploy. The site is built and viewed on localhost
through the existing dev server and nothing else.

**This removes work from 6.3, it does not add any.** There is no `build-site.ts` to write, no
`dist-site/` tree, no GitHub Action, and no `CNAME` file — those belong to **6.5 (public release)**,
alongside making the repo public. 6.3's deliverable is the pages themselves, served by
`web/tools/serve.ts` as it stands.

**The origin is recorded, not activated: `https://grues.danielkimdev.com`** (chosen 2026-08-02).
It stays written down here because two decisions already depend on knowing it, and both are cheaper
to get right now than to retrofit:

- **Absolute paths are safe.** A custom domain serves from the origin root, so `/tokens.css`,
  `/world/`, `/play/` and `/assets/…` are correct as written. Had this been a GitHub Pages *project*
  site (`/grues-in-comic/…`), every one of them would need a base path threaded through.
- **`og:image` / `og:url` need the absolute URL** (§3.7). Write them now; they are inert until the
  site is reachable.

**When 6.5 arrives**, deployment is: a script that runs `tsc -p web/tsconfig.build.json`, copies
`web/` to `dist-site/`, copies `ir/artifacts/` to `dist-site/world/`, and writes `dist-site/CNAME`;
a GitHub Action to upload it; a DNS `CNAME` record `grues` → `dkdev24.github.io`; and *Enforce HTTPS*
once the certificate provisions. No bundler, consistent with `web/README.md`. **Do not build any of
this before 6.5** — an unused deploy pipeline rots, and a repo that is not public cannot be tested
against Pages anyway.

**Exclude from the publish tree, when there is one:** `src/`, `test/`, `tools/`, `node_modules/`,
`tsconfig*.json`, `package*.json`, `graphify-out/`, `*.ts`. Only `dist/` ships, not the TypeScript it
was built from — `web/` being both the package and the website root makes this an easy thing to get
wrong. Noted here rather than left to 6.5 because the hazard is created by *this* section's layout
decision, and the person who writes the deploy script months from now will not re-derive it.

### Four things that will bite

1. **`/play` must have a trailing slash.** The game's HTML uses relative paths (`./style.css`,
   `./dist/…`); at `/play` those resolve one level too high. Redirect `/play` → `/play/` in
   `serve.ts`, and **the §4 CTA href is `/play/`**. The move also changes the game's script tag from
   `./dist/web/src/main.js` to `../dist/web/src/main.js`.
2. ~~GitHub Pages project sites serve under `/repo-name/`.~~ **Resolved 2026-08-02 — the origin will
   be `https://grues.danielkimdev.com`, which serves from the domain root, so every absolute path
   in this document is correct as written.** Nothing is deployed until 6.5 (see Deployment above);
   the decision is recorded now only because retrofitting a base path through every stylesheet and
   meta tag later would be far more work than choosing correctly today.
3. **`@import url("/tokens.css")`** in both `site.css` and `play/style.css` keeps §2 single-source.
   Costs one blocking request; assembly can inline it later if that ever matters.
4. **Cache headers invert on deploy.** Dev is deliberately `no-store` so a re-extracted world cannot
   go stale (`serve.ts`). Production wants a long cache on the 1.8 MB world document, with a rename
   on change.

### The `website/` rename is deferred, not rejected

The user's preferred name for this folder is `website/`. **Not done now**: renaming touches
`package.json`, `tsconfig.build.json`, the `dist/web/src/…` output path, test imports and possibly
the pixel-gate golden — mechanical churn against a 292-test, gated package, for a naming win. It is
**separable from this layout decision** and can happen after 6.3 ships and the gate has been run
once. Tracked in `docs/FUTURE_WORK.md` §2.4. Until then, `web/package.json`'s description should say
this package is the website, not only the game shell.

**Gameplay screen restyling.** §6.3 notes this document also governs the game screen. Under this
spec the change there is small and deliberate: the existing screen already *is* the terminal + Comic
Chat window pairing. Adopt only the masthead wordmark treatment and the shared token file; **do not**
restyle the panes. The pixel gate (ADR 0008) covers the comic pane and a cosmetic change there is a
released-build risk for no gain.

---

## 7. Open questions for the user

1. ~~**Wordmark:** terminal text only, or a drawn mark?~~ **Decided 2026-08-02: terminal-text
   wordmark plus one original glyph for favicon/OG card** (§3.1, §3.7). A full drawn logo is coming
   from the user later and will supersede the glyph — tracked in `docs/FUTURE_WORK.md` §2.4, and
   **it must not block 6.3**.
2. ~~**Copyright holder line:** personal name or entity?~~ **Decided 2026-08-02: `A project by
   Daniel Kim`, linking to `https://danielkimdev.com`.** See §3.6.
3. ~~**Feature card titles.**~~ **Partly decided 2026-08-02:** cards 1, 2 and 4 accepted as drafted.
   Card 3 was replaced — the parity claim was a developer's credibility line, not a player's reason
   to click — and is now the save/resume card (§3.3), with the parity claim relocated to §3.4 and
   the about page.
3b. ~~**The §3.2 H1.**~~ **Decided 2026-08-02: "Play Zork I as a comic strip."** The user's proposed
   line — *"Reimagining two historical Microsoft open-source projects as a browser-native comic
   adventure"* — is the project's own framing from `AGENTS.md`, accurate but aimed at a reader who
   already cares: no verb to act on, the two names withheld behind a category label, and 14 words
   that wrap to three lines at H1 size. It was **relocated, not dropped** — it now opens the deck
   and serves as the meta description and OG subtitle (§3.2, §3.7), which is the slot precision
   belongs in.
4. ~~**`/play` vs a subdomain.**~~ **Decided 2026-08-02: `/play`**, same origin, routed by
   `web/tools/serve.ts`. Rationale for keeping the two apps separate at all is in §6.

---

## 8. No mockup — this document is the reference

**Decided 2026-08-02: there is no mockup and none is required.** `docs/DEVELOPMENT_PLAN.md` §6.3
originally listed 6.3 as blocked on `DESIGN.md` *and* mockups; the mockup half of that is now
withdrawn. **This document is the sole visual reference for the static site.** Implementation may
begin from it alone.

An image-generated page mockup was tried and discarded the same day. It returned a generic dark
enterprise-SaaS page — pricing tiers, testimonials, a product that is not this one — with none of
the elements that make this design what it is: no Comic Chat window, no comic strip, no cream panel
interiors, no bevelled amber CTA, no terminal masthead. The cause was traceable to the prompt (the
phrase *"1980s DEC computer terminal"* pulled the model toward VAX/VMS migration marketing), but the
lesson is the general one: **a diffusion model cannot hold a twelve-element page specification, and
prompt-fighting costs more than it saves.** Single-subject generation still works and produced the
§3.7 glyph on the first attempt.

**The rule that replaces the old one.** The previous text said a mockup outranks this document. That
is withdrawn, because it would have let a misfired generation overwrite a considered design. If a
mockup is supplied later:

- It wins **only** where this document is silent or where the user says so explicitly.
- Where it contradicts a section carrying a dated decision (§3.1, §3.2, §3.6, §3.7, §4, §6, §7),
  **this document wins** until the user amends the section.
- Any change is written into the affected section with its date. Never silently.

**Iterate in the browser, not in an image.** Real HTML and CSS at real viewport sizes, with real
type, is where the remaining decisions actually get made — line length, wrap points, the bevel's
weight, how much air the hero needs. Those are not visible in a still image and cannot be resolved
by looking at one.
