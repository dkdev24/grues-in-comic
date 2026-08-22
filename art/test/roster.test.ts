/**
 * The shipped roster clears the machine-checkable half of ADR 0004 §11.
 *
 * Gates 1 (complex) and 2 (inventory) are assertions; gates 3 (legibility) and
 * 4 (register) are not — they were decided by looking at figures in the survey,
 * and `docs/PITFALLS.md` → Art pipeline is explicit that nothing here can stand
 * in for that. What this pins is the part a re-cast could silently break.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { parseAvatar, facesOf } from "../src/avb.js";
import {
  SHIPPED_ROSTER, DEFAULT_CAST, ROLE_FACE_REQUIREMENTS, type RosterRole,
} from "../src/roster.js";

const SOURCE = new URL("../../original-projects/comic-chat/v2.5-beta-1/", import.meta.url).pathname;
const BUNDLE = new URL("../../web/assets/comic/roster/", import.meta.url).pathname;

describe("the shipped roster", () => {
  it("casts every character into exactly one pool", () => {
    const seen = new Set<string>();
    for (const entry of SHIPPED_ROSTER) {
      expect(entry.roles.length, entry.id).toBe(1);
      expect(seen.has(entry.id), `${entry.id} listed twice`).toBe(false);
      seen.add(entry.id);
    }
  });

  it("offers the default cast in its own pool", () => {
    for (const [role, id] of Object.entries(DEFAULT_CAST)) {
      const entry = SHIPPED_ROSTER.find((e) => e.id === id);
      expect(entry, `${id} missing from the roster`).toBeDefined();
      expect(entry!.roles).toContain(role as RosterRole);
    }
  });

  it.each(SHIPPED_ROSTER)("$id is complex and owns its role's faces", (entry) => {
    const file = `${SOURCE}${entry.pack}/${entry.id}.avb`;
    const av = parseAvatar(new Uint8Array(readFileSync(file)), file);
    expect(av.type, `${entry.id} gate 1`).toBe("COMPLEX");
    const faces = new Set(facesOf(av).map((r) => r.emotionName));
    for (const role of entry.roles)
      for (const need of ROLE_FACE_REQUIREMENTS[role])
        expect(faces.has(need), `${entry.id} gate 2: ${need} face for ${role}`).toBe(true);
  });
});

describe("the packed roster bundle", () => {
  const index = JSON.parse(readFileSync(`${BUNDLE}roster.json`, "utf8")) as {
    version: number;
    defaults: Record<string, string>;
    characters: { id: string; sheet: string; manifest: string; figures: number }[];
  };

  it("holds one packed entry per roster line", () => {
    expect(index.characters.map((c) => c.id).sort()).toEqual(SHIPPED_ROSTER.map((e) => e.id).sort());
  });

  it.each(index.characters)("$id ships its sheet and manifest", (character) => {
    expect(existsSync(`${BUNDLE}${character.sheet}`), character.sheet).toBe(true);
    const avatar = JSON.parse(readFileSync(`${BUNDLE}${character.manifest}`, "utf8"));
    expect(avatar.type).toBe("COMPLEX");
    expect(avatar.faces.length * avatar.torsos.length).toBe(character.figures);
  });
});
