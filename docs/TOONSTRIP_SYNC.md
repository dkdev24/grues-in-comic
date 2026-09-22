# TOONSTRIP_SYNC.md

`toonstrip` (`/Users/daniel/Sites/toonstrip`, published as `@toonstrip/*` on npm) is a
generalized extraction of this repo's `web/src/comic/*` mechanical layer, stripped of
Zork/game/AI-inference coupling (see its `AGENTS.md`, `TOONSTRIP_DEV_PLAN.md`). It is a
**separate repo with its own copy of the shared logic, not a package dependency of this
one** — the two drift apart unless a fix is manually ported each way. Read this before
changing `web/src/comic/{balloon,balloon-layout,figure,layout,render}.ts` (the pose-wheel
selection inside `figure.ts` counts too), and follow it whenever such a change ships.

Full cross-repo picture, including the downstream npm chain into
`danielkimdev-astro`: toonstrip's `UPSTREAM_SYNC.md`.

## File map (grues-in-comic → toonstrip)

| Here | There |
|---|---|
| `web/src/comic/balloon.ts` | `packages/core/src/balloon.ts` |
| `web/src/comic/balloon-layout.ts` | `packages/core/src/balloon-layout.ts` |
| `web/src/comic/figure.ts` (compositing + pose/emotion-wheel) | `packages/core/src/figure.ts` + `packages/core/src/pose.ts` |
| `web/src/comic/layout.ts` | `packages/core/src/layout.ts` |
| `web/src/comic/render.ts` (also carries N-participant/mob code toonstrip lacks — don't expect a 1:1 match there) | `packages/core/src/render.ts` |

**Not shared:** `mapper.ts`, `page.ts`, `director.ts`, `script.ts`, `affect.ts`,
`backdrop.ts` — Zork/game/AI-inference coupling toonstrip intentionally does not carry.

## When a fix lands here (or you're about to port one in from there)

1. **Check whether toonstrip has the same code** (table above) before assuming a fix is
   portable — only the mechanical layer is shared.
2. **A change to a ported routine here is still bound by ADR 0008**: write it up as a
   **named divergence** (cite the `panel.cpp`/`balloon.cpp`/`avatar.cpp` line it diverges
   from and why), then:
   - `pnpm -C web run gate` — dumps actual PNGs to `web/tools/out/gate-actual/` for
     the changed cases. **Eyeball them before accepting** — this is not optional, per
     `docs/PITFALLS.md`'s pixel-gate operating notes.
   - `pnpm -C web run density` — same discipline for the dialogue-density baseline.
   - Only then `gate:accept` / `density:accept`.
   - Update `docs/PITFALLS.md`'s "Still-live decisions" list if the divergence changes
     something documented there as locked/faithful.
3. **Bump the patch version, update `HANDOFF.md`/`WORKLOG.md`** here, per this repo's own
   convention (see `AGENTS.md`'s System documents table).
4. **Port the same fix into toonstrip** (or confirm it already originated there and you're
   porting it *in*). Toonstrip has no historical-fidelity constraint — the port there is
   direct, no ADR/gate ceremony needed on that side.
5. **If the fix touches `packages/core`, toonstrip must republish its whole npm chain**
   (`@toonstrip/core` → `@toonstrip/element` → `@toonstrip/astro`, in that order —
   `workspace:*` resolves per-package at publish time, not retroactively) and
   `danielkimdev-astro` must bump its `@toonstrip/astro` dependency and rebuild. That's
   toonstrip's `UPSTREAM_SYNC.md` to drive, not this repo's.

## Precedent

- **v0.33.5** (2026-09-01): narrow first-balloon width roll, found on a live `toonstrip`
  strip, ported in as a named divergence. `WORKLOG.md` v0.33.5, ADR 0008 "Named divergence
  (2026-09-01)".
- The reverse direction (toonstrip missing this repo's collision-safe `panelSeed`
  delimiter) needed no change here — grues-in-comic was already correct — but is the
  worked example of the *other* direction; see toonstrip's `WORKLOG.md` v0.7.7.
