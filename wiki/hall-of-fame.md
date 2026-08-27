# The Hall of Fame

`docs/adr/0011-the-hall-of-fame-board.md` is the decision record — schema, endpoint contract, the
six binding rules. This page is the "why" the ADR compresses into a table: what the board is *for*,
and the one measurement that turned it from the feature proposed into the feature built.

## It is a proof-of-life board, not a leaderboard

The board was proposed as an arcade high-score table: winners, ranked, moves ascending. It shipped
(v0.29.0) as something else, because one fact overturned the premise before a line of it was
written — **zero runs, on this site's traffic, had ever reached the Stone Barrow.** A winners-only
board renders empty on every load, indefinitely, and an empty board on a landing page doesn't read
as "nobody has won yet." It reads as a dead site. A feature meant to encourage play would have
discouraged it, built as proposed.

So the unit stopped being the victory and became the **run**. Every started game is a row from the
moment the player presses Begin — badged `PLAYING NOW` while active, ranked below any finished
winners once it ends. The Hall of Fame is the top tier of a recent-runs board, not the whole of it,
and with no winners yet the board is one live row and nineteen recent ones — which is the *correct*
thing for it to look like right now, not a degraded state waiting for a winner to fix it.

**The live tier proves life by time, not by score, on purpose.** Sorting the unfinished tier by
score would let one lucky early run pin itself to the top and the board would stop moving — the same
dead-site failure under a different cause. "Someone was here 40 seconds ago" is the message the live
tier exists to send; `BEST SO FAR` carries the "somebody is getting close" signal as a badge instead,
one that never moves the row it's pinned to.

## The board learned the site's own traffic the hard way, twice

Both times the fix was the same shape: the board was built for the traffic the feature *implies* a
game like this gets, and had to be corrected against the traffic this particular beta deploy
*actually* gets, which is much thinner.

**First**, the original sweep aged out any unfinished run after 24 hours. On real traffic almost
every row is `playing` — nobody reaches the ending — so the entire board reliably emptied a day
after each play session: the exact failure the run-not-victory redesign existed to avoid, just
delayed by 24 hours instead of avoided (v0.33.3). The fix makes the sweep **capacity-based**: an
unfinished row only ages out once the `playing` count exceeds a cap, and even then only the oldest
excess past 30 days goes. Below the cap, nothing is ever removed by time alone. A `won` row is never
swept, unconditionally, on either design.

**Second** — smaller, but the same lesson — the board's heartbeat timing assumed most sessions would
clear a ten-move threshold quickly; testing on the live page found the common real case is a slower
first heartbeat landing on a sixty-second clause instead. Both corrections came from watching the
deployed board, not from re-deriving the schema at a desk — this project's standing rule that a
feature isn't verified until it's looked at, applied to a feature whose only real environment is a
public deploy this project doesn't get to rehearse locally (`request.cf.country` and the edge cache
are Cloudflare's, not `web/tools/serve.ts`'s).

## The name inverts consent, and that inversion is the actual cost of the feature

A board that shows runs *in progress* needs a name before the run has an ending to ask one at. So
the prompt for "what do you want on the board" isn't a screen the player reaches by winning — it's
the [[the-hero|cast picker]], the screen every new game already opens on (F16). Since v0.33.2 an
untouched name field doesn't submit the literal string `Anonymous`; it submits whichever Hero the
player is about to play as (`DAN`, `Bolo`, …), because the picker already knows that answer and a
name that echoes the character on stage reads less like a form field and more like signing the run.
`Anonymous` survives as the fallback only for the case the picker itself can't answer — the roster
fetch failing outright.

This is the real price paid for a proof-of-life board rather than a leaderboard: **a run is now
recorded because the player pressed Begin, not because they chose to be listed after winning.**
ADR 0011 §3 makes three things binding in exchange, and they're binding rather than aspirational
because the consent shape earns them: the row is non-identifying by construction (a random client-
minted id, a typed name or `Anonymous`, a country code, a score, timestamps — nothing else, ever);
the picker states in one line what becomes public; and opting out is a checkbox that suppresses the
request entirely, never a server-side filter on data already sent.

## An arcade cabinet, not a ledger

The client cannot be trusted, and the board doesn't pretend otherwise. Verifying a run honestly would
mean replaying its command log inside the Worker — the engine is platform-independent enough to do
exactly that, and this would have been the first place that property actually paid for itself — but
a winning run is roughly 420 turns against a 10ms-per-invocation free-tier ceiling, and there's no
paid budget to lift it. So the board ships with plausibility checks only (a win requires exactly 350,
moves monotonic per run, a rate limit, a name allowlist) that bound the damage without proving
anything. Anyone determined to fake an entry can have one — which was also true of the arcade
machines this feature imitates, and is why "arcade cabinet, not ledger" is the frame the ADR settles
on rather than "leaderboard": it says what the numbers are worth before anyone asks.

Moderation is accordingly kept outside the public surface entirely — deletion is an operator running
`wrangler d1 execute` from their own machine, not an admin route on the site. A public page that can
delete rows is a larger security surface than the rest of this project combined, for a task that runs
a handful of times a year.
