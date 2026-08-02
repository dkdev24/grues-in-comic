/**
 * Static dev server for the browser shell (stage 5.2).
 *
 * `node:http` and nothing else, for the same reason the shell has no bundler:
 * the engine is dependency-free by decision (ADR 0002), and a shell that needs
 * a toolchain to prove the contract is consumable has weakened the claim.
 *
 *   npm --prefix web run dev     build, then serve on http://localhost:8080
 *
 * Two roots are mounted: `web/` itself, and `ir/artifacts/` at `/world/`, so
 * the page fetches the real 1.8 MB world document rather than a copy that can
 * drift from the one the parity harness replays.
 */

import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const WEB_ROOT = fileURLToPath(new URL("..", import.meta.url));
const REPO_ROOT = resolve(WEB_ROOT, "..");
const WORLD_ROOT = join(REPO_ROOT, "ir", "artifacts");
const PORT = Number(process.env["PORT"] ?? 8080);

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const pathname = decodeURIComponent(url.pathname);

  // The game's HTML uses relative paths (`./style.css`, `../dist/…`); at `/play`
  // (no trailing slash) those resolve one level too high and the page loads
  // unstyled (DESIGN.md §6 gotcha 1).
  if (pathname === "/play") {
    res.writeHead(301, { location: "/play/" + url.search }).end();
    return;
  }

  let target = resolvePath(pathname);

  if (target === null) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  let stats;
  try {
    stats = statSync(target);
  } catch {
    // Extensionless pages (`/about`, `/changelog`) are served from their
    // `.html` file — DESIGN.md §6 writes them without an extension.
    const withHtml = extname(target) === "" ? `${target}.html` : null;
    try {
      stats = withHtml === null ? undefined : statSync(withHtml);
    } catch {
      stats = undefined;
    }
    if (stats === undefined) {
      res.writeHead(404).end("Not found");
      return;
    }
    target = withHtml as string;
  }
  if (stats.isDirectory()) {
    res.writeHead(404).end("Not found");
    return;
  }

  res.writeHead(200, {
    "content-type": CONTENT_TYPES[extname(target)] ?? "application/octet-stream",
    "content-length": stats.size,
    // The world document is a build artifact that changes when `ir` re-extracts;
    // no caching keeps a stale copy from outliving a regeneration.
    "cache-control": "no-store",
  });
  createReadStream(target).pipe(res);
});

/**
 * Maps a URL path to a file under one of the two mounts, or `null` if it
 * escapes them. Normalizing *before* joining is what makes `../` traversal fail
 * rather than resolve.
 *
 * The mount is matched on the raw URL path, which is always `/`-separated, and
 * only the remainder is normalized. `normalize` is platform-native: on Windows
 * it rewrites `/world/x` to `\world\x`, so normalizing first made the `/world`
 * mount never match (404 on the world document) and `/` never resolve to
 * `index.html`.
 *
 * Any path ending in `/` — not just the root — resolves to that directory's
 * `index.html` (needed for `/play/`, DESIGN.md §6 gotcha 1).
 */
function resolvePath(pathname: string): string | null {
  const [root, raw] =
    pathname === "/world" || pathname.startsWith("/world/")
      ? [WORLD_ROOT, pathname.slice("/world".length)]
      : [WEB_ROOT, pathname];
  const rest = normalize(raw).replace(/^(\.\.[/\\])+/, "");
  const withIndex =
    rest === "" || rest === "/" || rest === sep || rest.endsWith(sep) ? join(rest, "index.html") : rest;
  const file = join(root, withIndex);
  return file === root || file.startsWith(root.endsWith(sep) ? root : root + sep) ? file : null;
}

// A bare `listen` failure surfaces as an unhandled 'error' event: a stack trace
// after a *successful* build, which reads as a broken shell rather than a taken
// port. The common cause is a previous `dev` still running.
server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    process.stderr.write(
      `port ${PORT} is already in use — another dev server is probably still running.\n` +
        `Stop it, or pick another port:  PORT=${PORT + 1} npm --prefix web run serve\n`,
    );
  } else {
    process.stderr.write(`dev server failed to start: ${err.message}\n`);
  }
  process.exitCode = 1;
});

server.listen(PORT, () => {
  process.stdout.write(`grues-in-comic shell: http://localhost:${PORT}/\n`);
});
