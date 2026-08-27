/**
 * Generates the public changelog (DESIGN.md §3.5) from `CHANGELOG.md` — the
 * hand-curated, player-facing "Keep a Changelog" file, not `WORKLOG.md` (the
 * verbose internal history). Using `WORKLOG.md` put engineering-level detail
 * on a public page; `CHANGELOG.md`'s own version headers are already a
 * one-line, public-appropriate summary. Writes `changelog.html` (full list)
 * and rewrites the CHANGELOG:START…END block in `index.html` (latest 3). It also
 * writes the newest version into the comic pane's title label
 * (`play/index.html`, VERSION:START…END) — same source, so the gameplay screen
 * cannot disagree with the changelog about what the player is running.
 *
 * Usage:  tsx tools/build-changelog.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const WEB_ROOT = fileURLToPath(new URL("..", import.meta.url));
const REPO_ROOT = join(WEB_ROOT, "..");
const CHANGELOG = join(REPO_ROOT, "CHANGELOG.md");

interface Section {
  title: string;
  items: string[]; // each item is one bullet's raw markdown text, unwrapped to one line
}

interface Entry {
  version: string;
  date: string;
  summary: string;
  month: string; // YYYY-MM, for grouping on the full changelog page
  intro: string | null;
  sections: Section[];
}

const HEADER_RE = /^## \[v(\S+)\] - (\d{4}-\d{2}-\d{2}) — (.+)$/gm;

function parseBody(body: string): { intro: string | null; sections: Section[] } {
  const parts = body.trim().split(/^### (.+)$/m);
  // parts[0] is intro text (may be empty); then alternating [title, sectionBody, title, sectionBody, ...]
  const intro = parts[0]!.trim() || null;
  const sections: Section[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i]!.trim();
    const sectionBody = parts[i + 1] ?? "";
    // Bullets start with "- "; wrapped continuation lines are indented and belong to the
    // previous bullet, so join them back into one line before rendering.
    const items: string[] = [];
    for (const line of sectionBody.split("\n")) {
      if (/^- /.test(line)) {
        items.push(line.slice(2).trim());
      } else if (line.trim() && items.length > 0) {
        items[items.length - 1] += " " + line.trim();
      }
    }
    if (items.length > 0) sections.push({ title, items });
  }
  return { intro, sections };
}

function parseChangelog(text: string): Entry[] {
  const entries: Entry[] = [];
  const headers = [...text.matchAll(HEADER_RE)];
  for (let i = 0; i < headers.length; i++) {
    const m = headers[i]!;
    const bodyStart = m.index! + m[0].length;
    const bodyEnd = headers[i + 1]?.index ?? text.length;
    const body = text.slice(bodyStart, bodyEnd).replace(/\n---\s*$/, "");
    const { intro, sections } = parseBody(body);
    entries.push({
      version: m[1]!,
      date: m[2]!,
      summary: m[3]!,
      month: m[2]!.slice(0, 7),
      intro,
      sections,
    });
  }
  return entries;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Minimal inline markdown for changelog prose: `code`, **bold**, *italics*. Order matters —
// code spans are protected first so bold/italic markers inside them aren't touched.
function inlineMarkdown(s: string): string {
  const escaped = escapeHtml(s);
  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
}

function row(e: Entry): string {
  return (
    `            <div class="changelog-row reveal-item">\n` +
    `              <span class="version">${e.version}</span>\n` +
    `              <span class="date">${e.date}</span>\n` +
    `              <span class="summary">${escapeHtml(e.summary)}</span>\n` +
    `            </div>`
  );
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthLabel(month: string): string {
  const [y, mo] = month.split("-");
  return `${MONTH_NAMES[Number(mo) - 1]} ${y}`;
}

function entryDetail(e: Entry): string {
  const intro = e.intro ? `        <p>${inlineMarkdown(e.intro)}</p>\n` : "";
  const sections = e.sections
    .map(
      (s) =>
        `        <h4>${escapeHtml(s.title)}</h4>\n` +
        `        <ul>\n` +
        s.items.map((it) => `          <li>${inlineMarkdown(it)}</li>`).join("\n") +
        `\n        </ul>\n`,
    )
    .join("");
  return (
    `      <article class="changelog-entry" id="v${e.version}">\n` +
    `        <h3><a href="#v${e.version}"><span class="version">v${e.version}</span> ` +
    `<span class="date">${e.date}</span> — ${escapeHtml(e.summary)}</a></h3>\n` +
    intro +
    sections +
    `      </article>`
  );
}

// Growing history handled by grouping into <details> per month: the newest month renders open,
// every earlier month starts collapsed. Content stays in the DOM (so in-page/browser search still
// finds it) without asking a visitor to scroll past years of releases to reach the page footer.
function changelogBody(entries: Entry[]): string {
  const groups: { month: string; entries: Entry[] }[] = [];
  for (const e of entries) {
    const last = groups[groups.length - 1];
    if (last && last.month === e.month) last.entries.push(e);
    else groups.push({ month: e.month, entries: [e] });
  }
  return groups
    .map((g, i) => {
      const count = g.entries.length;
      const label = `${monthLabel(g.month)} <span class="count">(${count} release${count === 1 ? "" : "s"})</span>`;
      return (
        `        <details class="changelog-month"${i === 0 ? " open" : ""}>\n` +
        `          <summary>${label}</summary>\n` +
        g.entries.map(entryDetail).join("\n") +
        `\n        </details>`
      );
    })
    .join("\n");
}

const text = readFileSync(CHANGELOG, "utf8");
const entries = parseChangelog(text);
if (entries.length === 0) {
  throw new Error(`No "## [vX.Y.Z] - DATE — summary" entries found in ${CHANGELOG}`);
}

// index.html preview: latest 3, file order (CHANGELOG.md is newest-first, Keep a Changelog convention)
const preview = entries.slice(0, 3).map(row).join("\n");
const indexPath = join(WEB_ROOT, "index.html");
const indexHtml = readFileSync(indexPath, "utf8");
const marker = /<!-- CHANGELOG:START.*?-->[\s\S]*?<!-- CHANGELOG:END -->/;
const replacement =
  `<!-- CHANGELOG:START — generated by tools/build-changelog.ts from CHANGELOG.md. Do not hand-edit. -->\n` +
  `${preview}\n` +
  `            <!-- CHANGELOG:END -->`;
if (!marker.test(indexHtml)) {
  throw new Error("index.html is missing the CHANGELOG:START…END marker block");
}
writeFileSync(indexPath, indexHtml.replace(marker, replacement));

/*
 * The comic pane's title label: the version the player is actually looking at,
 * and whether it is still a beta.
 *
 * Generated from the same newest entry the preview above reads, because the
 * alternative — a hand-typed version on the gameplay screen — is a claim that
 * silently rots at the next release. **`BETA` is derived, not written**: the
 * project's own rule is that `1.0.0` is public launch (`AGENTS.md`), so the
 * label drops it exactly when the tag says the launch happened, with nobody
 * having to remember this file at that moment.
 */
const latest = entries[0]!;
const beta = Number(latest.version.split(".")[0]) < 1 ? " BETA" : "";
const playPath = join(WEB_ROOT, "play", "index.html");
const playHtml = readFileSync(playPath, "utf8");
const versionMarker = /<!-- VERSION:START -->[\s\S]*?<!-- VERSION:END -->/;
if (!versionMarker.test(playHtml)) {
  throw new Error("play/index.html is missing the VERSION:START…END marker block");
}
writeFileSync(
  playPath,
  playHtml.replace(versionMarker, `<!-- VERSION:START -->v${latest.version}${beta}<!-- VERSION:END -->`),
);

// changelog.html: full detail, grouped by month
const changelogPath = join(WEB_ROOT, "changelog.html");
const template = readFileSync(join(WEB_ROOT, "tools", "changelog.template.html"), "utf8");
writeFileSync(changelogPath, template.replace("<!-- CHANGELOG:ROWS -->", changelogBody(entries)));

process.stdout.write(
  `wrote ${entries.length} entries → index.html (top 3) + changelog.html (all)\n` +
  `wrote v${latest.version}${beta} → play/index.html (comic pane title)\n`,
);
