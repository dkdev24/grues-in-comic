/**
 * The affect-marker table (ADR 0004 §10), transcribed as code.
 *
 * A turn's narration and events select **one** marker — the highest-priority
 * one that fires — and that marker emits a *weighted `CEmotionOpts` set* rather
 * than a single winning emotion. `selectComplexPose` (`art/src/pose.ts`) then
 * lets the first option that yields a face fix the face while the first that
 * yields a torso fixes the torso, so a marker outranked on the face can still
 * claim the body: the Hero shrugs while looking annoyed.
 *
 * Two things here are load-bearing and are the ones most likely to be "fixed":
 *
 * 1. **The ordering is locked; the measured frequencies are not.** The ADR's
 *    percentages come from 189 opening-heavy turns across 11 walkthroughs that
 *    all replay the same first moves. Assert on ordering, never on rates.
 * 2. **No match is the correct answer 51% of the time.** Room descriptions and
 *    inventory listings want a neutral Hero. Raising coverage here flattens the
 *    comic — it is what keeps the 5.8% death reaction from becoming wallpaper.
 *
 * The regexes are the weakest joint in ADR 0004 (its own Consequences say so):
 * this is pattern-matching on English prose in a project that exists to avoid
 * exactly that. The mitigation is the failure mode — a marker miss degrades to
 * NEUTRAL, which is the 51% default anyway, so a miss is bland, never wrong.
 */

// Imported from `art/` by path, the way `web/` already imports `engine/`: the
// build has `rootDir: ".."`, so a cross-package relative import compiles into
// `dist/art/src/…` and resolves natively in the browser with no bundler.
//
// Only `format` and `pose` are reachable from here, and that is the asset
// strategy in one line: **the browser runs the selector, never the decoder.**
// `art/src/inflate.ts` is Node-only, and every module that touches pixels leads
// back to it. Faces and torsos arrive as PNGs from the build-time pipeline; the
// pure emotion-wheel maths comes across as source.
import { EMOTION_NAMES, emotionAngle } from "../../../art/src/format.js";
import type { EmotionOption } from "../../../art/src/pose.js";

/** Build an option from an ADR-table emotion name, priority and intensity. */
function emotion(name: string, intensity: number, priority: number): EmotionOption {
  const index = EMOTION_NAMES.indexOf(name as (typeof EMOTION_NAMES)[number]);
  if (index < 0) throw new Error(`unknown emotion ${name}`);
  return { angle: emotionAngle(index), intensity, priority };
}

/**
 * What a marker matched against, beyond the narration text. Kept narrow on
 * purpose: a marker may read the turn's *events*, never engine internals.
 */
export interface AffectInput {
  /** Concatenated player-visible narration for the turn. */
  text: string;
  gameOver: boolean;
  /** Sum of the turn's `score-changed` deltas. */
  scoreDelta: number;
  /**
   * The turn carried a `narration` on the **`system`** channel.
   *
   * This is the one marker input that is not a regex, and it is the most
   * valuable one here. Every parser refusal the engine issues — "I beg your
   * pardon?", `I don't know the word "…"`, "That sentence isn't one I
   * recognize.", "You don't have that!" — goes out on `system`, which is
   * precisely the channel ADR 0002 added so a UI could style without parsing
   * text. Reading it turns the largest marker in §10 from prose-matching into a
   * contract read, and it catches refusals no listed pattern does: the unknown
   * word message interpolates the word and matched none of them.
   */
  systemChannel: boolean;
}

export interface AffectMarker {
  name: string;
  priority: number;
  /** The prose pattern, or `null` for markers that fire on events alone. */
  pattern: RegExp | null;
  fires(input: AffectInput): boolean;
  /** Priority-descending `CEmotionOpts` set. */
  options: readonly EmotionOption[];
}

const prose = (
  name: string, priority: number, pattern: RegExp, options: readonly EmotionOption[],
): AffectMarker => ({
  name, priority, pattern, options,
  // Trimmed, not multiline. `routine-ack`'s pattern is anchored at both ends
  // because it means "the *whole* turn was an acknowledgement"; matching it
  // per-line instead lets it fire on any turn that happens to contain a bare
  // "Taken.", which measurably overtakes `parser-miss` as the largest marker
  // and quietly contradicts §10.
  fires: (input) => pattern.test(input.text.trim()),
});

/**
 * ADR 0004 §10, priority descending. `selectComplexPose` consumes each marker's
 * own option list by its internal priorities, which is why the gesture in a
 * two-option marker sits just below its expression: the expression claims the
 * face first, and the gesture — a sentinel no angular metric reaches — can then
 * only claim a torso, which is exactly the intent.
 */
/**
 * The face every refusal wears — one set, so the family splits by *what was
 * refused* and never by how the Hero looks about it (§11 as amended at 5.3).
 */
const REFUSAL_FACE = [emotion("BORED", 0.5, 30), emotion("SHRUG", 1.0, 29)];

/**
 * The part of a marker name before the slash — `parser-miss/not-here` →
 * `parser-miss` (M6.1e).
 *
 * Variants exist so the *dialogue* can answer the right refusal; every other
 * consumer wants the family. `panelKind`'s refusal rung, the read-aloud
 * suppression and the affect tests all ask this rather than matching the name,
 * so adding a fourth variant is a table edit and nothing more.
 */
export function markerFamily(marker: string | null): string | null {
  return marker === null ? null : (marker.split("/")[0] ?? marker);
}

/**
 * Is this turn a refusal — the parser's or the map's (M6.1e)?
 *
 * The two families are separate markers because they are different jokes, but
 * every *structural* rule about a refusal covers both: it is `refusal` in the
 * beat taxonomy, and the DM does not read its text aloud, because ADR 0009 §2
 * makes the "no" the Hero's to voice and not the module's boxed text.
 */
export function isRefusal(marker: string | null): boolean {
  const family = markerFamily(marker);
  return family === "parser-miss" || family === "blocked-exit";
}

export const AFFECT_MARKERS: readonly AffectMarker[] = [
  {
    name: "death", priority: 100, pattern: null,
    fires: (input) => input.gameOver,
    options: [emotion("SCARED", 1.0, 100)],
  },
  prose("grue-threat", 90, /pitch black|grue/i, [emotion("SCARED", 0.9, 90)]),
  prose("combat-victory", 80, /fatal blow|slumps to the floor|breathes his last/i,
    [emotion("SHOUT", 0.9, 80)]),
  prose("combat-threat", 70, /sword (is|has) glow/i, [emotion("ANGRY", 0.7, 70)]),
  {
    name: "scored", priority: 60, pattern: null,
    fires: (input) => input.scoreDelta > 0,
    // §11: no shortlist avatar owns a HAPPY torso, so a scoring turn draws a
    // smiling face over a neutral body. That is the corpus, not a tuning bug.
    options: [emotion("HAPPY", 0.8, 60)],
  },
  prose("reveal", 50, /reveal(s|ing)|sluice gates open/i,
    [emotion("HAPPY", 0.6, 50), emotion("POINTOTHER", 1.0, 49)]),
  prose("effort", 45, /great effort|reluctantly|crashes shut/i, [emotion("SHOUT", 0.5, 45)]),
  prose("uncanny", 40, /hollow voice|strange gothic|nothing special/i, [emotion("COY", 0.6, 40)]),
  /*
   * **The world's "no", which is not the parser's** (M6.1e). 114 turns of the
   * corpus say exactly "You can't go that way." and until this slice not one of
   * them carried a marker, which made them the largest silent class left after
   * 6.1d. The parser understood perfectly here — the *map* refused — so it is its
   * own marker rather than a `parser-miss` variant, and it reads as the Hero
   * walking into a wall rather than fighting the vocabulary. It sits just above
   * the parser family because the two never co-occur and the order is then a
   * statement about which "no" is more specific.
   *
   * **Widened at M6.1e session 2** by the same method that found it: a census of
   * the turns still carrying no marker turned up 10 more refusals in the map's
   * voice rather than the parser's — "You would need a machete to go further
   * west" and "There is no tree here suitable for climbing". Both are the world
   * declining a move it understood perfectly, so they belong to this family and
   * not to a new one. Two singletons were left alone deliberately ("There's no
   * room", a full container; "That's difficult unless your eyes are prehensile"):
   * one turn each in the whole corpus is not a beat, it is a coincidence.
   */
  prose("blocked-exit", 35,
    /can't go that way|is impassable|are impassable|becomes impenetrable|block your way|would need a machete|no tree here suitable/i,
    [emotion("BORED", 0.5, 35), emotion("SHRUG", 1.0, 34)]),
  /*
   * **The parser family, split three ways at M6.1e.** It was one marker until
   * then, and the largest in the game — 160 turns of the corpus, 139 of them in a
   * single playthrough. One marker meant one voice answering three different
   * refusals, so the beat could only ever be generic; measured, the family is
   * `not-here` ~95, `not-carried` 54 and `unknown-word` 11, and each of those is
   * a different joke. Splitting also divides the firing count that
   * {@link BeatCycle} has to cover.
   *
   * All three keep the family's emotion options, which is why the Hero must own
   * both a BORED face and a SHRUG torso (§11 as amended at 5.3) — arguing with
   * the parser is the 1977 experience, it is funnier than neutral, and it still
   * fires more than anything else. `markerFamily` is what everything downstream
   * asks; nothing outside this table should test the variant names.
   */
  prose("parser-miss/not-here", 32, /can't see any|don't see what you are referring to/i,
    REFUSAL_FACE),
  prose("parser-miss/not-carried", 31, /don't have that|aren't holding/i, REFUSAL_FACE),
  {
    /*
     * Fires on the `system` **channel** first and the ADR's patterns second.
     * The channel is the reliable half: the patterns are a prose match that the
     * engine's own `I don't know the word "…"` never satisfied, and the shape of
     * that miss — a refusal drawn as a neutral Hero — is invisible unless you go
     * looking. It is last in the family so the two prose refusals above claim
     * their own turns first; whatever the channel flags and they did not is a
     * vocabulary miss by elimination.
     */
    name: "parser-miss/unknown-word", priority: 30,
    pattern: /I beg your pardon|isn't one I recognize|don't know the word/i,
    fires(input) {
      return input.systemChannel || this.pattern!.test(input.text.trim());
    },
    options: REFUSAL_FACE,
  },
  prose("routine-ack", 10, /^(Taken|Dropped|Opened|Click)\.$/, [emotion("NEUTRAL", 0.0, 10)]),
];

export interface Affect {
  /** `null` when nothing fired — the correct answer for ~51% of turns. */
  marker: string | null;
  options: readonly EmotionOption[];
  /**
   * The narration sentence the marker matched, when it matched prose. The
   * caption prefers it (see `pullQuote`), which is what ties §10 to §2: the
   * panel quotes the line its Hero is reacting to.
   */
  matched: string | null;
}

const NEUTRAL: readonly EmotionOption[] = [emotion("NEUTRAL", 0.0, 1)];

export function affectFor(input: AffectInput): Affect {
  for (const marker of AFFECT_MARKERS) {
    if (!marker.fires(input)) continue;
    return {
      marker: marker.name,
      options: marker.options,
      matched: marker.pattern ? matchedSentence(input.text, marker.pattern) : null,
    };
  }
  return { marker: null, options: NEUTRAL, matched: null };
}

/** The first sentence of `text` that the marker's pattern hits. */
function matchedSentence(text: string, pattern: RegExp): string | null {
  for (const sentence of sentences(text)) {
    if (pattern.test(sentence)) return sentence;
  }
  return null;
}

/**
 * Split narration into sentences. Deliberately crude — it feeds a *pull-quote*,
 * where a bad split costs a slightly long caption, not a wrong one. It must
 * never rewrite: §2 makes the caption verbatim.
 */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
