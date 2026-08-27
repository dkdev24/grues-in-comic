-- ADR 0011 §2 — the Hall of Fame board's only table.
--
-- One row per run, upserted on `run_id`. A ~420-move run is ~42 heartbeats and
-- ~42 writes to THIS ONE ROW — that is the property the whole cost argument
-- rests on, and it is why `run_id` is the primary key rather than a rowid.
--
-- `state` holds 'playing' or 'won' and NOTHING ELSE. The board's third tier
-- (abandoned) is DERIVED on read from a stale `last_seen`, never stored: a
-- stored state would need something to write it at the exact moment nothing is
-- running, and `beforeunload` is unreliable precisely then. See ADR 0011 §2.
--
-- A `playing` row is swept only once the `playing` count exceeds `PLAYING_CAP`
-- (`functions/api/hof-core.ts`) — never on age alone, so a quiet site does not
-- age its own board down to empty (ADR 0011 §2, amended 2026-08-27).
--
-- Every column here is non-identifying by construction (ADR 0011 §3.1).
-- Adding a column is an amendment to that ADR, not a schema change. The IP
-- address in particular is never stored — `country` is derived from it at the
-- edge and the address itself is dropped (ADR 0011 §4).

CREATE TABLE IF NOT EXISTS runs (
  run_id      TEXT    PRIMARY KEY,          -- random, client-minted; never derived from the visitor
  name        TEXT    NOT NULL,             -- validated on the way in; 'ANONYMOUS' is the default
  score       INTEGER NOT NULL DEFAULT 0,
  moves       INTEGER NOT NULL DEFAULT 0,
  state       TEXT    NOT NULL DEFAULT 'playing' CHECK (state IN ('playing', 'won')),
  country     TEXT,                         -- two-letter code from request.cf.country; NULL = unknown
  started_at  INTEGER NOT NULL,             -- epoch seconds, server-assigned
  last_seen   INTEGER NOT NULL,             -- epoch seconds, server-assigned
  finished_at INTEGER
);

-- The won tier: `ORDER BY moves ASC`, partial so it indexes only the rows the
-- top tier can ever contain.
CREATE INDEX IF NOT EXISTS runs_won ON runs (moves) WHERE state = 'won';

-- The live and recent tiers, and the 24h sweep, all read this one.
CREATE INDEX IF NOT EXISTS runs_recent ON runs (last_seen DESC);
