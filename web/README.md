# Web

The browser shell over the engine's event stream — stages 5.2 and 5.3.

**Status:** both panes of `docs/adr/0004-presentation-mapping.md` §4 are built. Zork I is
playable in a browser, and every turn draws a comic panel beside the transcript: Comic Chat
figures, Woodring balloons, the §7 camera ladder and the §10 affect table, over the
original `.avb` art. The event inspector 5.2 built is now collapsed inside the console
pane; it renders exactly the event types the console drops, which are the ones the comic
draws.

## Running

```sh
npm --prefix web install
npm --prefix web run dev      # build, then http://localhost:8080/
```

`tools/serve.ts` mounts `web/` and, at `/world/`, the real `ir/artifacts/` — the page
fetches the same 1.8 MB world document the parity harness replays, so the shell cannot
drift from a copy.

## Layout

| Path | Purpose |
|---|---|
| `src/session.ts` | Engine + derived state, **no DOM** — what 5.3's comic pane will also consume |
| `src/status.ts` | The Infocom status line, derived from events alone |
| `src/event-mix.ts` | Running event census; `describeEvent` |
| `src/console-view.ts` | The terminal pane (ADR 0004 §4) |
| `src/inspector-view.ts` | The event inspector |
| `src/comic-view.ts` | The comic pane: the panel strip, and the Guide script seam |
| `src/comic/mapper.ts` | **Events → panels.** The §7 ladder, the salience filter, the three channels |
| `src/comic/affect.ts` | The §10 affect-marker table |
| `src/comic/figure.ts` | Pose selection and the face-onto-torso join, against the sprite sheet |
| `src/comic/balloon.ts` | The three Woodring balloon classes, and `AddLine`'s wrap |
| `src/comic/render.ts` | A panel, drawn: camera presets as framing |
| `src/main.ts` | Bootstrap: fetch world, wire input, `save`/`restore` |
| `tools/serve.ts` | Zero-dependency static server |

## No bundler, and why

`tsc` alone emits browser-native ES modules here. It works because the engine has zero
runtime dependencies and imports the IR for **types only** (ADR 0002) — nothing survives
into the emitted JS, and every internal import already carries a `.js` extension. The
build config roots at the repo so `web/dist/` holds `web/src/` and `engine/src/` side by
side, and the browser resolves between them natively.

A shell that needed a toolchain to demonstrate the contract is consumable would have
weakened the claim it exists to make. **5.3 was the evidence test for this, and it did not
need one**: the comic pane is canvas plus five static asset requests, so there was nothing
to bundle. The bundler question stays open for whatever needs it; it is still not this.

(`tsc` also emits `dist/ir/` from the type-only import graph. Those files are never
fetched — nothing in `dist/web/` or `dist/engine/` references them.)

## The comic layer, and where the asset line is drawn (⚑ Gate D)

**The browser runs the selector; it never runs the decoder.** `art/` reads `.avb` files at
build time and emits, per avatar, one sprite sheet plus a manifest (`npm --prefix art run
pack`). At run time the shell imports two `art/` modules as source — `format.ts` and
`pose.ts`, the emotion wheel, which is pure arithmetic — and nothing else. Everything that
touches a pixel in `art/` leads back to `inflate.ts` and Node's zlib.

That line is load-bearing and easy to erase by accident: a **type-only** import of a module
that itself imports the decoder still drags `node:zlib` into the browser program, because
TypeScript erases the import at emit but not at type-check. Hence `art/src/cast-manifest.ts`
is a types-only leaf that imports nothing. If `dist/art/src/` ever contains more than
`format.js`, `pose.js` and `cast-manifest.js`, that line has been crossed.

Two consequences worth knowing before touching the renderer:

- **Parts are packed, not figures.** A complex avatar composites faces × torsos at draw
  time — dan's 187 figures are 28 drawings — so the join happens in the browser. The
  arithmetic is duplicated between `art/src/composite.ts` and `src/comic/figure.ts`, which
  is the kind of duplication that drifts silently; `test/figure.test.ts` runs both over the
  real cast and asserts they agree pose for pose, and that is the only reason it is allowed.
- **A panel is re-rendered on resize, never rescaled.** Panel width is an input to the
  Layout Manager (§4a), so balloon line breaks are a function of the current width.
  Stretching the canvas would leave them wrapped for a width the reader no longer has. The
  pose round-robin is therefore frozen per panel: a resize must not redraw the strip with
  different bodies.

## What 5.2 found out about the ADR 0002 contract

Everything before this stage consumed the event stream from the harness, which was written
alongside it. Three things only show up from outside, all pinned by tests in
`test/status.test.ts`:

1. **`room-title` never arrives.** Room description is delegated to Zork's own
   `DESCRIBE-ROOM`, which prints the name inside a `prose` line. The status line looks the
   name up in the world document by room id instead. This confirms the standing `HANDOFF.md`
   open issue from the consumer side, and ADR 0004 §4's decision to keep the channel.
2. **`start()` emits no `player-moved`.** The opening turn reports the player's placement
   as an `object-moved` of `ADVENTURER` whose `from` and `to` are both the starting room. A
   shell watching `player-moved` alone has an empty status line until the player first
   walks.
3. **`restore()` emits no events**, so any UI state *derived* from the stream has nothing
   to fold and must be rebuilt from `SaveState` — which carries `locations` and
   `globals.SCORE` for the purpose.

None of the three needs a contract change; all three need a consumer to know them.

## Conventions worth keeping

- **Style by channel, never by parsing text** (ADR 0002). There is no regex over narration
  anywhere in this package, and adding one is the failure mode.
- **`textContent`, never `innerHTML`.** Narration is world-document data; the transcript is
  the one place a document could inject markup into the page.
- **The console renders four event types and drops three.** The dropped ones are 5.3's
  material, which is why the inspector exists rather than a `console.log`.
- **`speech` is rendered even though the engine emits none.** ADR 0004 §Context measured
  zero across all 11 walkthroughs; a shell that silently dropped the type is how a change
  in the engine would go unnoticed here. `test/session.test.ts` asserts the zero.
- **The comic pane has no engine handle.** `main.ts` hands one `Turn` to both panes. That
  is what makes §2's "narration is accompanied, never replaced" a property of the wiring
  rather than something to keep in sync — and it is why `session.ts` is DOM-free.
- **The mapper is pure and testable without a canvas.** It decides *what shot this is*;
  `render.ts` decides what that looks like at the current width. `test/mapper.test.ts`
  replays all 11 walkthroughs through it — the parity harness's own oracle — and asserts
  orderings and invariants, never the ADR's measured percentages, which are
  opening-sequence-shaped.
