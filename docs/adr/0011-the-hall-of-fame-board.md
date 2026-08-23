# ADR 0011 — The Hall of Fame Board: the site records runs, not only victories

- **Status:** Accepted (2026-08-23). Building as `docs/DEVELOPMENT_PLAN.md` §6.8, substages 6.8a–6.8e.
- **Date:** 2026-08-23
- **Supersedes:** `docs/FUTURE_WORK.md` F2 *as a proposal* — F2's winners-only board (2026-08-22) and its 2026-08-23 amendment are both folded in here, and F2 leaves that file when 6.8 starts. Nothing in F2 that this document does not restate survives as binding.
- **Preserves (non-negotiable):** the **engine, IR and importer stay platform-independent and stay out of this** — no game logic runs in the Worker, and no rule here may be satisfied by teaching the engine about the network (`AGENTS.md`); the **comic pane and the ADR 0008 pixel gate are untouched** — this stage adds no panel, no sheet and no canvas call; the site stays **static plus one function directory** (no bundler, `web/README.md`); **no paid tier, ever** — a design that needs one is rejected rather than budgeted for.
- **Related:** `docs/DEVELOPMENT_PLAN.md` §6.8 (schema, endpoint contract, substages), §6.5-beta (the Pages deploy this depends on), `docs/PITFALLS.md` → Tooling & platform, `docs/DESIGN.md` §3 (the landing page this lands on), `web/src/cast-picker.ts` (ADR 0004 §11 / F16, the screen the name is collected on)

## Context

The v0.27.5 ending fix made the win visible, and the user proposed an arcade high-score board the
same week. The board was deferred once, deliberately: it is the first thing in this project that
stores data from a visitor, and both halves of it — storage and moderation — are decisions to be made
rather than inherited from whatever the first implementation happened to do. This document makes
them.

One fact reshaped the feature between proposal and decision, and it is the reason this ADR exists in
the form it does:

| | |
|---|---|
| Visitors, on the beta deploy | rare |
| Play sessions | rarer |
| Runs that have reached the Stone Barrow, ever | **0** |

A winners-only board renders **empty** on every page load, indefinitely, and an empty board on a
landing page does not read as "nobody has won yet" — it reads as a dead site. The feature was
proposed to encourage play; built as proposed, it would have discouraged it. The correction is to
widen what counts as a record: **a run is worth showing before it is finished.**

The enabling platform fact was already true and is what makes any of this possible without a
backend: the site is on **Cloudflare Pages** (§6.5-beta), which serves Pages Functions from the same
origin. One function directory, one database, the existing free tier — no new host, no CORS, no
third-party form service. The cost was measured before this was written: a ~420-move run is ~42
heartbeats, each an UPSERT of **one** row, against a budget of 100k writes and 5M reads per day.

## Decision

### 1. The board records every run, not only every victory

Every run that starts is a row. The board shows three tiers, in this order, capped at **20 rows**:

| Tier | Sort | Slots |
|---|---|---|
| Finished (`won`) | `moves ASC` — every winner scores 350, so moves is the only arcade metric the game has | up to 10 |
| Live (`playing`, `last_seen` < 2 min) — badged **`PLAYING NOW`** | `last_seen DESC` | up to 5 |
| Recent (`playing`, `last_seen` older) | `last_seen DESC` | the remainder |

Tiers borrow unused slots **upward**. With no winners — today's state — the board is one live row and
nineteen recent runs, and that is correct rather than degraded.

**The live tier sorts by time and not by score**, and this is a decision, not a default. The unfinished
tier's job is *proof of life*: "someone was here 40 seconds ago" is the message. Score-sorting it goes
stale and stays stale — one lucky run pins itself to the top and the board stops moving, which is the
dead-site failure this ADR exists to avoid — and an early score is mostly a clock, since a run's first
fifty moves sit near zero. **`BEST SO FAR`** carries the "somebody is getting close" signal instead:
a badge on the highest-scoring unfinished row, which does **not** move the row.

**Progress shows score and moves, never the room name.** A live feed of where the current player is
standing is a map of the game, leaking one visitor at a time.

### 2. D1, one row per run, keyed by a value the client mints

**D1, not KV.** The board is a sorted top-N query; KV would make it a full scan and re-sort on every
read. The schema is in §6.8 and is this ADR's.

Identity is a **random `run_id` minted client-side** on a new game and stored with the save. It is
never a user id and is never derived from the visitor. It is the UPSERT key, and that is what keeps a
420-move run **one row** rather than 42 — the property the whole cost argument rests on. A resumed
game re-uses its `run_id`; it is a *run*, not a session, and a mid-game reload must not produce a
second row.

**`abandoned` is a derived tier and must never become a stored state.** The column holds `playing` or
`won`; the third tier is `playing` with a stale `last_seen`, computed on read. This is what makes a
closed tab self-reporting and what removes any need for a sweeper, a cron or an unload handler — a
stored state would need something to write it at the exact moment nothing is running.

### 3. The name is collected at the start, optional, `Anonymous` by default

A board that shows runs in progress needs a name for a row that does not exist yet when the run ends,
so the prompt moves to the **cast picker** — the screen a new game already opens on (F16). One
optional text field beside the cast columns, defaulting to `Anonymous`, which is what an untouched
field submits. **Leaving it alone must cost the player nothing and must never block Begin.**

This inverts the consent shape of the original proposal, and the inversion is the real price of the
feature: a run is now recorded because the player pressed Begin, not because they chose to be listed
after winning. Three requirements follow, and they are binding:

1. The row is **non-identifying by construction** — a random `run_id`, a name the player typed or
   `Anonymous`, a country code, a score, a move count, timestamps. Nothing else, ever.
2. The picker **says in one line** what appears publicly.
3. There is an **opt-out that is not "type Anonymous"** — a checkbox that suppresses the row entirely,
   honoured by **never sending the request**, not by filtering server-side.

### 4. The country comes from the edge; the code is stored and the address is not

Players stay anonymous apart from the name they type, **plus** a country, from Cloudflare's
`request.cf.country` (equivalently `CF-IPCountry`) — resolved at the edge and attached server-side, so
the client neither sends it nor can spoof it, and no geo-IP library is involved.

**Store the two-letter code and never the IP address.** The address is what the country is derived
from in flight; writing it would turn a decoration into a personal-data column for no gain. If per-IP
rate limiting is ever wanted it is a salted hash in KV with a short TTL, never a column. `T1` (Tor),
`XX` and absent all render as an explicit unknown rather than a wrong flag. VPN users will be filed
under the wrong country: this is a decoration, not a claim.

### 5. An arcade cabinet, not a ledger

**The client cannot be trusted, and no part of this design may pretend otherwise.** A static page can
POST any score. Verifying honestly would mean replaying the submitted command log in the Worker — the
engine *is* platform-independent enough to run there, and this would have been the first place that
property paid off — but a winning run is ~420 turns and blows the free tier's **10ms CPU per
invocation**, and there is no paid budget for this project.

So the board ships with **plausibility checks only**, all server-side: the name allowlist, `moves`
monotonic per `run_id` and inside a sane range, `score` in `0..350`, a win requiring exactly 350, and
one accepted write per `run_id` per 20 seconds. These bound the damage; they prove nothing. Anyone
who wants a fake entry can have one — which was also true of the machines this imitates.

**Moderation is part of the feature, not a follow-up, and the name is checked on the way in.** It is
public from move 0 now, before anyone has invested 420 turns in behaving, so validation happens at
`POST` and not at render.

### 6. Deletion is operator-side, and the public site grows no admin surface

The user must be able to delete any row. That capability is exercised with `wrangler d1 execute`
from the user's machine — **no authenticated admin route, no moderation UI, no session cookie on a
static site.** A public page that can delete rows is a larger security surface than the entire rest
of this project, bought for a task that runs a handful of times a year.

## Consequences

- **The project now stores data from visitors.** That is a threshold, not a feature detail: from 6.8
  onward the repo has a privacy story, and §3.1 and §4 are it. Any later field added to `runs` is an
  amendment to this ADR, not a schema change.
- **The landing page gains a section that can be empty on day one** — before the first visitor, the
  board has no rows. It must render as a cabinet awaiting its first player, never as a broken table.
- **A local-only test cannot cover this stage.** `request.cf.country` and the edge cache are
  Cloudflare's, not `web/tools/serve.ts`'s. 6.8 is the first stage that must be exercised on the
  beta deploy — which §6.5-beta closed, so it is unblocked rather than blocked.
- **The free tier is not close to binding** and the cap is a reading limit rather than a cost one.
  If traffic ever changes that, the lever is the edge cache TTL, not the schema.
- **No engine change, no IR change, no comic-pane change, no pixel-gate risk.** The heartbeat reads
  `turn.status`, which the shell already holds.

## Alternatives considered

- **A winners-only board** (the original F2). Rejected on the measurement in Context: zero winners
  means zero rows, indefinitely. It is not gone — it is the top tier of this board.
- **localStorage-only personal board** ("your runs") with a shareable brag URL. No backend, no
  moderation surface, no shared board — and no reason for a visitor to believe anyone else plays,
  which is the whole point. Kept as the fallback if the storage decision is ever reversed.
- **KV instead of D1.** Rejected in §2: a sorted top-N over a scan.
- **Replay verification in the Worker.** Rejected in §5 on the 10ms ceiling, not on principle. If
  this project ever has a paid tier, this is the first thing to revisit.
- **Collecting the name at the end, as originally proposed.** Cleaner consent, and incompatible with
  showing a run while it is in progress. §3 takes the harder consent obligation instead of dropping
  the feature.
- **Storing an `abandoned` state, written by a `beforeunload` handler.** Rejected in §2: the handler
  is unreliable exactly when it matters, and a derived tier needs no handler at all.

## Slices

1. **6.8a** — this ADR, and the two operational traps into `docs/PITFALLS.md`.
2. **6.8b** — the D1 database, the schema, the binding.
3. **6.8c** — `functions/api/hof.ts` and every check in §5, tested against a local D1. Exercisable
   with `curl` before any board exists.
4. **6.8d** — the picker's name field and opt-out (§3), and the client's three writes.
5. **6.8e** — the board on the landing page (§1), read on a phone against the beta deploy.

6.8c is the shippable midpoint: the endpoint can be correct, rate-limited and deployed while the
landing page still shows nothing.
