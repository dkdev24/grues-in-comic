/**
 * Generates `/sitemap.xml` from the canonical URL each public page already declares
 * in its own `<link rel="canonical">` — one source of truth, so the sitemap can't list
 * a URL a page itself disagrees with. `lastmod` comes from that file's last commit
 * date, not the build time, so re-running this without content changes doesn't
 * bump every page's date.
 *
 * gallery.html is a QA tool with no canonical tag (not public site content) and is
 * skipped for that reason, not by a hardcoded exclusion list.
 *
 * Usage:  tsx tools/build-sitemap.ts
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const WEB_ROOT = fileURLToPath(new URL("..", import.meta.url));
const REPO_ROOT = join(WEB_ROOT, "..");

const PAGES = ["index.html", "about.html", "changelog.html", "play/index.html"];

function canonicalUrl(html: string): string | null {
  const m = html.match(/<link rel="canonical" href="([^"]+)"/);
  return m ? m[1]! : null;
}

function lastCommitDate(relPath: string): string {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", relPath], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
    if (out) return out;
  } catch {
    // fall through — uncommitted file
  }
  return new Date().toISOString().slice(0, 10);
}

const entries = PAGES.map((page) => {
  const abs = join(WEB_ROOT, page);
  const html = readFileSync(abs, "utf8");
  const loc = canonicalUrl(html);
  if (!loc) throw new Error(`${page} has no <link rel="canonical"> — cannot list it in the sitemap`);
  const relPath = join("web", page).replace(/\\/g, "/");
  return { loc, lastmod: lastCommitDate(relPath) };
});

const body = entries
  .map((e) => `  <url>\n    <loc>${e.loc}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n  </url>`)
  .join("\n");

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

writeFileSync(join(WEB_ROOT, "sitemap.xml"), xml);
process.stdout.write(`wrote ${entries.length} URLs → sitemap.xml\n`);
