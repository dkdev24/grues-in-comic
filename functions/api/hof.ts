/**
 * `GET|POST /api/hof` — the Hall of Fame board's endpoint (ADR 0011, stage 6.8c).
 *
 * **This file must live at the repo root's `functions/`, not under `web/`.**
 * Pages resolves `functions/` against the project root directory, which is the
 * repo root here, while the build output directory is `web`. Move this under
 * `web/` and it is served as a static asset: the route 404s, the build still
 * succeeds, and nothing reports an error (`docs/PITFALLS.md` → Tooling).
 *
 * The rules live in `hof-core.ts`, which is pure and tested. What stays here is
 * only what needs a database, a request or a clock — and the three things the
 * client is never allowed to supply: the country, the timestamps, and the tier.
 *
 * **Nothing here burns CPU**, which is what keeps it inside the free tier's 10ms
 * per invocation: one UPSERT or one 40-row query, both of them I/O (ADR 0011 §5).
 */

import {
  buildBoard, readCountry, readSubmission, type RunRow,
  FRESH_SECONDS, MAX_SCORE, PLAYING_CAP, QUERY_LIMIT, RATE_LIMIT_SECONDS, SWEEP_SECONDS,
} from "./hof-core.js";

/**
 * The slice of D1 this file uses. Declared locally rather than pulled from
 * `@cloudflare/workers-types`: the project has no bundler and no Worker types
 * dependency, and this is the whole surface (`web/README.md`).
 */
interface D1Result<T> { results: T[] }
interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<T>(): Promise<D1Result<T>>;
  run(): Promise<{ meta: { changes: number } }>;
}
interface D1Database { prepare(query: string): D1Statement }

interface Env { HOF_DB: D1Database }

interface PagesContext {
  request: Request & { cf?: { country?: string } };
  env: Env;
}

const json = (body: unknown, status = 200, cacheSeconds = 0): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheSeconds > 0 ? `public, max-age=${cacheSeconds}` : "no-store",
    },
  });

export async function onRequestGet({ env }: PagesContext): Promise<Response> {
  const now = Math.floor(Date.now() / 1000);

  // Swept on read, so the board needs no cron and no sweeper (ADR 0011 §2). A
  // `won` row is never swept — it is the point of the feature. An unfinished
  // row is not swept on age alone either: only once `playing` rows exceed
  // `PLAYING_CAP` do the oldest of the excess, if also past `SWEEP_SECONDS`,
  // get removed — a low-traffic board must never age itself down to empty.
  await env.HOF_DB.prepare(
    `DELETE FROM runs WHERE state = 'playing' AND last_seen < ?1
       AND run_id NOT IN (
         SELECT run_id FROM runs WHERE state = 'playing' ORDER BY last_seen DESC LIMIT ?2
       )`,
  ).bind(now - SWEEP_SECONDS, PLAYING_CAP).run();

  // The tier order is the index's business; the cap and the badge are
  // `buildBoard`'s. `LIMIT` is generous because slots borrow upward and the
  // query cannot know how many rows each tier will end up entitled to.
  const { results } = await env.HOF_DB.prepare(
    `SELECT run_id, name, score, moves, state, country, last_seen
       FROM runs
      ORDER BY CASE WHEN state = 'won' THEN 0 WHEN last_seen > ?1 THEN 1 ELSE 2 END ASC,
               CASE WHEN state = 'won' THEN moves ELSE -last_seen END ASC
      LIMIT ?2`,
  ).bind(now - FRESH_SECONDS, QUERY_LIMIT).all<RunRow>();

  // 30s at the edge: a spike cannot reach the read budget, and the board is
  // never more than half a minute stale — well inside the 2-minute live window.
  return json({ rows: buildBoard(results, now) }, 200, 30);
}

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }

  const parsed = readSubmission(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const run = parsed.value;

  const now = Math.floor(Date.now() / 1000);
  // Server-assigned, always. The client may not send a country, a timestamp or
  // a tier, and none of the three is read from the body anywhere in this file.
  const country = readCountry(request.cf?.country);

  // One statement does the whole write. The `WHERE` clauses are the rate limit
  // and the monotonic-moves check, and putting them here rather than in a
  // read-then-write keeps the handler to a single round trip — and free of the
  // race a read-then-write would have.
  //
  // `name` is deliberately absent from the SET list: it is chosen once, at the
  // cast picker, and a later heartbeat may not rewrite it (ADR 0011 §3).
  const upsert = await env.HOF_DB.prepare(
    `INSERT INTO runs (run_id, name, score, moves, state, country, started_at, last_seen, finished_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7, ?8)
     ON CONFLICT(run_id) DO UPDATE SET
       score       = excluded.score,
       moves       = excluded.moves,
       state       = excluded.state,
       last_seen   = excluded.last_seen,
       finished_at = COALESCE(runs.finished_at, excluded.finished_at)
     WHERE excluded.moves   >= runs.moves
       AND excluded.last_seen - runs.last_seen >= ?9
       AND runs.state = 'playing'`,
  ).bind(
    run.runId, run.name, run.score, run.moves, run.done ? "won" : "playing",
    country, now, run.done ? now : null, RATE_LIMIT_SECONDS,
  ).run();

  // A refused update is not an error the player should ever see: it is a
  // too-soon heartbeat, a run that moved backwards, or a run already won. The
  // client fires and forgets either way.
  return json({ ok: true, recorded: upsert.meta.changes > 0, max_score: MAX_SCORE });
}
