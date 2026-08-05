/**
 * Panelization (ADR 0008 Phase 2) — the `CUnitPanelPage::AddLine` port.
 *
 * These are rule tests, not walkthrough tests: each one pins one branch of
 * `panel.cpp:1058-1139` against the cited line, because the whole value of a port
 * is that a future reader can check it against the source rather than against a
 * mental model (the ADR 0007 standing rule). The stream-level consequences —
 * panel counts over a real playthrough — are gated in `mapper.test.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  ALWAYS_FITS, BM_ACTION, BM_SAY, BM_THINK, BM_WHISPER, BRK, CHR,
  addScript, createPage, makeBalloonClass,
  type FitTest, type PageLine, type PanelContext,
} from "../src/comic/page.js";
import type { TurnScript } from "../src/comic/mapper.js";

const CONTEXT: PanelContext = {
  turn: 1, camera: "medium", emphatic: false, room: "WEST-OF-HOUSE",
  focus: null, marker: null, kind: "ambient", roomTitle: null, dark: false,
};

function line(speaker: string, text: string, modes = BM_SAY): PageLine {
  return { speaker, text, modes, emotion: [] };
}

/** A page past the `m_panels.GetCount() < 2` warm-up, so clone-append is reachable. */
function warmPage(fit: FitTest = ALWAYS_FITS) {
  const page = createPage({ fit });
  page.addLine(line("a", "one"), CONTEXT);
  page.addLine(line("b", "two"), CONTEXT);
  return page;
}

describe("MakeBalloon (panel.cpp:1036)", () => {
  it("maps each mode to its Woodring class", () => {
    expect(makeBalloonClass(BM_SAY)).toBe("CBWoodringNormal");
    expect(makeBalloonClass(BM_THINK)).toBe("CBWoodringThink");
    expect(makeBalloonClass(BM_ACTION)).toBe("CBWoodringBox");
  });

  it("draws a box for every combined action mode (`:1046-1050`)", () => {
    expect(makeBalloonClass(BM_ACTION | BM_SAY)).toBe("CBWoodringBox");
    expect(makeBalloonClass(BM_ACTION | BM_THINK)).toBe("CBWoodringBox");
    expect(makeBalloonClass(BM_ACTION | BM_WHISPER)).toBe("CBWoodringBox");
  });

  it("collapses whisper onto speech — `CBWoodringWhisper` has no renderer yet", () => {
    expect(makeBalloonClass(BM_WHISPER)).toBe("CBWoodringNormal");
  });
});

describe("AddLine (panel.cpp:1058)", () => {
  it("starts a fresh panel for the first two lines (`m_panels.GetCount() < 2`, `:1079`)", () => {
    const page = createPage();
    expect(page.addLine(line("a", "one"), CONTEXT)).toMatchObject({ replacedLast: false });
    expect(page.addLine(line("a", "two"), CONTEXT)).toMatchObject({ replacedLast: false });
    expect(page.panels).toHaveLength(2);
  });

  it("clone-appends a new speaker into the previous panel (`:1088`)", () => {
    const page = warmPage();
    const delta = page.addLine(line("c", "three"), CONTEXT);

    expect(delta.replacedLast).toBe(true);
    expect(page.panels).toHaveLength(2);
    const tail = page.panels[1]!;
    expect(tail.speakers.map((l) => l.text)).toEqual(["two", "three"]);
    expect(tail.bodies.map((b) => b.speaker)).toEqual(["b", "c"]);
  });

  it("leaves the panel it cloned from untouched (`CPanel::CPanel(const CPanel &)`, `:562`)", () => {
    const page = warmPage();
    const before = page.panels[1]!;
    page.addLine(line("c", "three"), CONTEXT);

    expect(before.speakers).toHaveLength(1);
    expect(page.panels[1]).not.toBe(before);
  });

  it("starts a new panel when the speaker is already on stage (`AvatarInPanel`, `:1079`)", () => {
    const page = warmPage();
    const delta = page.addLine(line("b", "again"), CONTEXT);

    expect(delta.replacedLast).toBe(false);
    expect(page.panels).toHaveLength(3);
    expect(page.panels[2]!.speakers.map((l) => l.text)).toEqual(["again"]);
  });

  it("starts a new panel once the current one holds 5 balloons (`:1079`)", () => {
    const page = warmPage();
    for (const speaker of ["c", "d", "e", "f"]) page.addLine(line(speaker, speaker), CONTEXT);
    // The tail now holds "two" plus four clone-appends — the cap.
    expect(page.panels[1]!.speakers).toHaveLength(5);

    const delta = page.addLine(line("g", "g"), CONTEXT);
    expect(delta.replacedLast).toBe(false);
    expect(page.panels).toHaveLength(3);
  });

  it("gives a caption its own panel (`uModes == BM_ACTION`, `:1064`)", () => {
    const page = warmPage();
    const delta = page.addLine(
      { speaker: "cap", text: "The door is boarded.", modes: BM_ACTION, emotion: [], bodiless: true },
      CONTEXT,
    );

    expect(delta.replacedLast).toBe(false);
    expect(page.panels).toHaveLength(3);
    const tail = page.panels[2]!;
    expect(tail.speakers[0]!.balloonClass).toBe("CBWoodringBox");
    // A bodiless line stages nobody — the caption channel of ADR 0006 §2.
    expect(tail.bodies).toHaveLength(0);
  });

  it("does not break the panel for an action that is also speech (exact mask, `:1064`)", () => {
    const page = warmPage();
    const delta = page.addLine(line("c", "shouts", BM_ACTION | BM_SAY), CONTEXT);

    expect(delta.replacedLast).toBe(true);
    expect(page.panels[1]!.speakers).toHaveLength(2);
  });

  it("makes a speaker's body requested (`ReplaceBody`, `:634`)", () => {
    const page = createPage();
    page.addLine(line("a", "one"), CONTEXT);

    expect(page.panels[0]!.bodies[0]).toMatchObject({ speaker: "a", requested: true });
  });

  it("takes panel context from the newest line", () => {
    const page = warmPage();
    page.addLine(line("c", "three"), { ...CONTEXT, turn: 9, camera: "close-up", room: "KITCHEN" });

    expect(page.panels[1]).toMatchObject({ turn: 9, camera: "close-up", room: "KITCHEN" });
  });

  it("breaks the panel on `<Brk>` without adding anything (`:1067`)", () => {
    const page = warmPage();
    const delta = page.addLine(line("c", BRK), CONTEXT);

    expect(delta.appended).toHaveLength(0);
    expect(page.panels).toHaveLength(2);
    // The break takes effect on the *next* line.
    page.addLine(line("c", "three"), CONTEXT);
    expect(page.panels).toHaveLength(3);
  });

  it("routes `<Chr>` to AddReaction (`:1073`)", () => {
    const page = warmPage();
    page.addLine(line("c", CHR), CONTEXT);

    const tail = page.panels[1]!;
    expect(tail.speakers).toHaveLength(1); // no balloon added
    expect(tail.bodies.map((b) => b.speaker)).toEqual(["b", "c"]);
  });
});

describe("AddReaction (panel.cpp:1142)", () => {
  it("stages a silent body in the current panel", () => {
    const page = warmPage();
    const delta = page.addReaction("c", [], CONTEXT);

    expect(delta.replacedLast).toBe(true);
    expect(page.panels).toHaveLength(2);
    expect(page.panels[1]!.speakers).toHaveLength(1);
    expect(page.panels[1]!.bodies.map((b) => b.speaker)).toEqual(["b", "c"]);
  });

  it("re-poses a body already on stage instead of breaking the panel (`:1148`)", () => {
    const page = warmPage();
    const emotion = [{ angle: 90, intensity: 1, priority: 1 }];
    page.addReaction("b", emotion, CONTEXT);

    // No `AvatarInPanel` test here — that is the difference from `AddLine`.
    expect(page.panels).toHaveLength(2);
    expect(page.panels[1]!.bodies).toHaveLength(1);
    expect(page.panels[1]!.bodies[0]!.emotion).toBe(emotion);
  });

  it("counts bodies, not balloons, against the cap (`:1148`)", () => {
    const page = warmPage();
    for (const speaker of ["c", "d", "e", "f"]) page.addReaction(speaker, [], CONTEXT);
    expect(page.panels[1]!.bodies).toHaveLength(5);

    page.addReaction("g", [], CONTEXT);
    expect(page.panels).toHaveLength(3);
  });
});

describe("overflow (panel.cpp:1110)", () => {
  it("retries a refused clone-append in a panel of its own", () => {
    // Refuse any panel holding more than one balloon — the "it did not fit" case.
    const fit: FitTest = (panel) => ({ fits: panel.speakers.length <= 1 });
    const page = warmPage(fit);
    const delta = page.addLine(line("c", "three"), CONTEXT);

    expect(delta.replacedLast).toBe(false);
    expect(page.panels).toHaveLength(3);
    expect(page.panels[1]!.speakers.map((l) => l.text)).toEqual(["two"]);
    expect(page.panels[2]!.speakers.map((l) => l.text)).toEqual(["three"]);
  });

  it("keeps a lone balloon that fits nowhere rather than recursing forever (`:1112`)", () => {
    const page = createPage({ fit: () => ({ fits: false }) });
    const delta = page.addLine(line("a", "war and peace"), CONTEXT);

    expect(delta.appended).toHaveLength(1);
    expect(page.panels).toHaveLength(1);
  });

  it("re-adds the split remainder as its own line (`:1128`)", () => {
    let split = true;
    const fit: FitTest = () => {
      if (!split) return { fits: true };
      split = false;
      return { fits: true, leftover: "the rest" };
    };
    const page = createPage({ fit });
    page.addLine(line("a", "a long speech"), CONTEXT);

    expect(page.panels).toHaveLength(2);
    expect(page.panels[0]!.speakers[0]!.text).toBe("a long speech");
    expect(page.panels[1]!.speakers[0]!.text).toBe("the rest");
  });
});

describe("addScript — the orphaned fragment (M6.1g)", () => {
  const script = (lines: PageLine[]): TurnScript =>
    ({ lines, reactions: [], context: CONTEXT }) as unknown as TurnScript;
  /** Refuses any panel holding two balloons — the split exchange, reproduced. */
  const oneBalloonOnly: FitTest = (panel) => ({ fits: panel.speakers.length <= 1 });

  it("does not let a later turn's line join a frame missing one of this turn's speakers", () => {
    // The bug M6.1f found by reading the playthrough: the DM asks in one panel,
    // the Hero's answer will not fit and opens a second, and the *next* turn's
    // DM line then clone-appends into that second panel — so the reader sees the
    // Hero answering a question asked after he spoke. 144 of 300 split exchanges.
    const page = warmPage(oneBalloonOnly);
    addScript(page, script([line("dm", "ask"), line("hero", "answer")]));
    const before = page.panels.length;
    addScript(page, script([line("dm", "a later question")]));

    const orphan = page.panels[before - 1]!;
    expect(orphan.speakers.map((l) => l.text)).toEqual(["answer"]);
    expect(page.panels).toHaveLength(before + 1);
  });

  it("lets a marked line join the fragment it answers (ADR 0010 §2)", () => {
    // No warm-up here, and no restrictive fit test: the split comes from the
    // page's own `m_panels.GetCount() < 2` rule (`panel.cpp:1079`) instead,
    // leaving a DM-only fragment on a fresh page — the Hero spoke first and
    // the page was too young to clone-append beside him yet. That is a
    // fragment missing the Hero, exactly the real shape ADR 0010 §2 answers:
    // a DM-only frame the Hero's declaration joins next turn. The joining
    // line carries `answers: true` — the fact the declaration puts on itself
    // to say "I am not asking, I am replying to what's already on screen" —
    // and must be let through to the ordinary clone-append rules, unlike the
    // previous test's unmarked line.
    const page = createPage();
    addScript(page, script([line("hero", "ask"), line("dm", "answer")]));
    const before = page.panels.length;
    const delta = addScript(page, script([{ ...line("hero", "a later reply"), answers: true }]));

    expect(delta.replacedLast).toBe(true);
    expect(page.panels).toHaveLength(before);
  });

  it("leaves a turn that fits in one panel alone — clone-append still works", () => {
    // The rule must not cost the traversal collapse or the ordinary two-shot: a
    // frame holding every speaker of its turn is complete, not a fragment.
    const page = warmPage();
    addScript(page, script([line("dm", "ask"), line("hero", "answer")]));
    const before = page.panels.length;
    const delta = addScript(page, script([line("mob", "and me")]));

    expect(delta.replacedLast).toBe(true);
    expect(page.panels).toHaveLength(before);
  });

  it("leaves a one-speaker turn alone however many panels it took", () => {
    // A long room description is a panel run by ADR 0009 §4 and every frame of it
    // holds its only speaker. Nothing is orphaned, so the next turn may join.
    const page = warmPage();
    addScript(page, script([line("dm", "one"), line("dm", BRK), line("dm", "two")]));
    const before = page.panels.length;
    const delta = addScript(page, script([line("hero", "answer")]));

    expect(delta.replacedLast).toBe(true);
    expect(page.panels).toHaveLength(before);
  });
});
