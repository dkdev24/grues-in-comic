import { describe, expect, it } from "vitest";
import { parse } from "../src/parser.js";
import { corpusStats, fileStats, statsMarkdown } from "../src/stats.js";

describe("stats", () => {
  const src = `"header"
<ROOM A (DESC "a") (EAST TO B)>
<ROOM B (DESC "b")>
<OBJECT LAMP (IN A) (DESC "lamp")>
<GLOBAL SCORE 0>
<GLOBAL WALKS <LTABLE 1 2 3>>
;<ROUTINE DEAD () <RTRUE>>
`;
  const stats = fileStats(parse(src, "sample.zil"), src);

  it("counts top-level heads and types", () => {
    expect(stats.topLevelHeads).toEqual({ GLOBAL: 2, OBJECT: 1, ROOM: 2 });
    expect(stats.topLevelTypes).toEqual({ Comment: 1, Form: 5, String: 1 });
    expect(stats.pageBreaks).toBe(0);
  });

  it("counts deep heads including table constructors and commented forms", () => {
    expect(stats.deepHeads["LTABLE"]).toBe(1);
    expect(stats.deepHeads["ROUTINE"]).toBe(1); // inside the ;comment — still a form
    expect(stats.deepHeads["TO"]).toBeUndefined(); // (EAST TO B) is a List, not a Form
  });

  it("aggregates corpus totals and renders valid markdown tables", () => {
    const corpus = corpusStats([stats, stats], "test");
    expect(corpus.totals.topLevelHeads["ROOM"]).toBe(4);
    const md = statsMarkdown(corpus);
    const rows = md.split("\n").filter((l) => l.startsWith("|"));
    // every row of a table must have the same column count as its header
    const cols = (l: string) => l.split("|").length;
    expect(cols(rows[1]!)).toBe(cols(rows[0]!)); // separator row matches header
  });
});
