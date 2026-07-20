# Web

The browser shell over the engine's event stream — stage 5.2.

**Status:** complete. Zork I is playable in a browser: type commands, read the transcript,
watch the status line, save and restore. Beside it runs an event inspector showing the
event types a text UI drops, which are the ones stage 5.3 renders as panels.

This is the **console pane** of the two-pane shell in `docs/adr/0004-presentation-mapping.md`
§4, built subordinate-from-the-start so 5.3 adds a comic pane rather than a rewrite.

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
| `src/main.ts` | Bootstrap: fetch world, wire input, `save`/`restore` |
| `tools/serve.ts` | Zero-dependency static server |

## No bundler, and why

`tsc` alone emits browser-native ES modules here. It works because the engine has zero
runtime dependencies and imports the IR for **types only** (ADR 0002) — nothing survives
into the emitted JS, and every internal import already carries a `.js` extension. The
build config roots at the repo so `web/dist/` holds `web/src/` and `engine/src/` side by
side, and the browser resolves between them natively.

A shell that needed a toolchain to demonstrate the contract is consumable would have
weakened the claim it exists to make. If 5.3 needs asset pipelines or code splitting, add
a bundler then, on that evidence.

(`tsc` also emits `dist/ir/` from the type-only import graph. Those files are never
fetched — nothing in `dist/web/` or `dist/engine/` references them.)

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
