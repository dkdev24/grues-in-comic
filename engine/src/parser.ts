/**
 * The command parser (stage 4.2): text in, a matched syntax rule and resolved
 * objects out.
 *
 * The parser's whole job is to produce ZIL's three parser globals — PRSA (the
 * action), PRSO (the direct object), PRSI (the indirect object) — which is
 * exactly what action dispatch in stage 4.3 consumes. It resolves *references*
 * and nothing else: whether taking the object is sensible, permitted, or fatal
 * is the action's business, not the parser's.
 *
 * Failures are a discriminated union rather than one error, because ZIL prints
 * a different refusal for each and transcripts show the difference.
 */

import type { Direction, SyntaxRule } from "@grues-in-comic/ir";
import { hasFlag, here, PLAYER_ID, type GameState, type WorldIndex } from "./state.js";
import { originAllowed, scope, type ScopeEntry } from "./scope.js";
import { isKnownWord, resolveWord, truncate, type Lexicon } from "./vocabulary.js";

/**
 * Words meaning "every eligible object" (ZIL P-ALL). They sit in the BUZZ list
 * because the parser strips them once it has understood them — so they must be
 * recognised *before* buzzword filtering, or "TAKE ALL" reduces to a bare
 * "TAKE" with no object and is rejected as ungrammatical.
 */
const ALL_WORDS = new Set(["ALL", "EVERYTHING"]);

/**
 * Pronouns standing in for the last object referred to (ZIL P-IT-OBJECT).
 *
 * These are *not* in the IR vocabulary: ZIL keeps them in the Z-machine
 * dictionary but resolves them in the parser rather than through any object's
 * synonym list, so extraction has nothing to hang them on. They are recognised
 * here, ahead of the unknown-word check, for the same reason ALL is — otherwise
 * "READ IT" is refused with "I don't know the word".
 */
const PRONOUN_WORDS = new Set(["IT", "THEM"]);

/**
 * Words that end one sentence and begin another (ZIL's P-ANDS plus the period).
 *
 * They are buzzwords, so the parser proper discards them; sentence splitting
 * has to happen before that, and before the verb lookup, because whether "AND"
 * separates two commands or joins two objects depends on what follows it.
 */
const SEPARATOR_WORDS = new Set(["AND", "THEN"]);

export interface ParsedCommand {
  kind: "command";
  /** ZIL PRSA — the action routine the rule names. */
  action: string;
  /** ZIL pre-action routine, run before the action proper. */
  preAction?: string;
  /** The canonical verb word, for `verb?` tests in behavior. */
  verb: string;
  /** ZIL PRSO. */
  directObject?: string;
  /**
   * Every object a `MANY` slot matched, when the player said "all". Dispatch
   * runs the action once per entry, so this is set *instead of* iterating in
   * the parser — whether taking six things is six turns or one is the action's
   * business.
   */
  directObjects?: string[];
  /** ZIL PRSI. */
  indirectObject?: string;
  /** The rule that matched, so 4.3 can read its search options. */
  rule: SyntaxRule;
  /**
   * Set when the parser filled an empty slot itself. ZIL echoes its choice in
   * parentheses before the action's own output — "(leaflet)" — so the player
   * can see what it assumed.
   */
  suppliedNoun?: string;
}

/** A bare direction ("NORTH", "N") — ZIL's most common command, handled apart. */
export interface ParsedTravel {
  kind: "travel";
  direction: Direction;
}

export type ParseFailure =
  /** Nothing but noise words. */
  | { kind: "empty" }
  /** A word the dictionary has never heard of. */
  | { kind: "unknown-word"; word: string }
  /** Known words, but no verb among them. */
  | { kind: "no-verb" }
  /** The verb exists but not in this shape ("You can't use multiple objects"). */
  | { kind: "no-syntax"; verb: string }
  /** A noun phrase that matches nothing reachable from here. */
  | { kind: "not-here"; words: string[] }
  /** A noun phrase that matches several reachable objects. */
  | { kind: "ambiguous"; words: string[]; candidates: string[] }
  /**
   * A slot the player must be *holding* for ("You don't have that!").
   *
   * ZIL marks such slots HAVE, and the distinction from `not-here` is visible:
   * "OPEN MAILBOX WITH SWORD" with the sword three rooms away answers "You
   * don't have that!", not "You can't see any sword here!" — the game is
   * telling you the slot's requirement, not reporting on your surroundings.
   */
  | { kind: "not-held"; words: string[] }
  /**
   * The verb was understood but a slot is empty, and the parser is asking
   * rather than refusing. `pending` is the sentence so far, to be prepended to
   * whatever the player types next.
   */
  | { kind: "orphan"; question: string; pending: string[] }
  /** "IT" with nothing to refer back to. */
  | { kind: "no-antecedent"; word: string };

export type ParseResult = ParsedCommand | ParsedTravel | ParseFailure;

/**
 * Split raw input into the sentences it actually contains.
 *
 * "TAKE THE LEAFLET AND READ IT" is two commands and costs two moves — the
 * reference build's move counter goes 1 → 3 across that single line — whereas
 * "TAKE THE LAMP AND THE SWORD" is one command with two objects. What
 * distinguishes them is only what follows the separator: a verb starts a new
 * sentence, anything else continues the object list.
 */
export function splitSentences(lexicon: Lexicon, input: string): string[] {
  const parts: string[] = [];
  let current: string[] = [];

  const isVerb = (word: string): boolean => lexicon.verbs.has(resolveWord(lexicon, word));

  for (const token of input.toUpperCase().split(/([^A-Z0-9]+)/)) {
    const word = token.replace(/[^A-Z0-9]/g, "");
    if (word.length === 0) {
      // A period always separates, whatever follows it.
      if (token.includes(".") && current.length > 0) {
        parts.push(current.join(" "));
        current = [];
      }
      continue;
    }
    current.push(word);
  }
  if (current.length > 0) parts.push(current.join(" "));

  // Now break each part again at AND/THEN, but only where a verb follows.
  const sentences: string[] = [];
  for (const part of parts) {
    const words = part.split(" ");
    let start = 0;
    for (let i = 0; i < words.length; i++) {
      if (!SEPARATOR_WORDS.has(words[i]!)) continue;
      const next = words[i + 1];
      if (next === undefined || !isVerb(next)) continue;
      if (i > start) sentences.push(words.slice(start, i).join(" "));
      start = i + 1;
    }
    if (start < words.length) sentences.push(words.slice(start).join(" "));
  }
  return sentences.length > 0 ? sentences : [input];
}

export function parse(
  world: WorldIndex,
  state: GameState,
  lexicon: Lexicon,
  input: string,
): ParseResult {
  let raw = input
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((w) => w.length > 0);

  /*
   * A pronoun becomes one of its antecedent's own nouns before anything else
   * looks at the words. Substituting the *word* rather than the object id keeps
   * every later stage — scope, adjectives, the find flag — on one code path,
   * and it inherits ZIL's behaviour of refusing "it" once the referent is out of
   * scope, because the noun then resolves to nothing.
   */
  const pronoun = raw.find((w) => PRONOUN_WORDS.has(w));
  if (pronoun !== undefined) {
    const antecedent = state.parser.it;
    const noun = antecedent === undefined ? undefined : world.objects.get(antecedent)?.synonyms[0];
    if (noun === undefined) return { kind: "no-antecedent", word: pronoun };
    raw = raw.map((w) => (PRONOUN_WORDS.has(w) ? noun : w));
  }

  /*
   * An unfinished question owns the next input unless that input starts a
   * sentence of its own. "PUT" / "MAILBOX" continues; "PUT" / "OPEN MAILBOX
   * WITH SWORD" abandons the question and is parsed fresh — which is why the
   * reference build answers the second with a refusal about the sword rather
   * than trying to put something in it.
   */
  const orphan = state.parser.orphan;
  if (orphan !== undefined && raw.length > 0 && !lexicon.verbs.has(resolveWord(lexicon, raw[0]!))) {
    raw = [...orphan, ...raw];
  }

  for (const word of raw) {
    if (!isKnownWord(lexicon, word)) return { kind: "unknown-word", word };
  }

  // "ALL" is understood here and stripped afterwards, in that order.
  const wantsAll = raw.some((w) => ALL_WORDS.has(w));
  const words = raw.filter((w) => !lexicon.buzzwords.has(truncate(w)) && !ALL_WORDS.has(w));
  if (words.length === 0 && !wantsAll) return { kind: "empty" };

  // A bare direction is a command in its own right; ZIL rewrites it to WALK.
  if (words.length === 1) {
    const dir = lexicon.directions.get(resolveWord(lexicon, words[0]!));
    if (dir !== undefined) return { kind: "travel", direction: dir };
  }

  const verb = resolveWord(lexicon, words[0]!);
  const rules = lexicon.verbs.get(verb);
  if (rules === undefined) return { kind: "no-verb" };

  // "WALK NORTH" and friends: the verb is real, the object is a direction.
  const rest = words.slice(1);
  if (rest.length === 1) {
    const dir = lexicon.directions.get(resolveWord(lexicon, rest[0]!));
    if (dir !== undefined) return { kind: "travel", direction: dir };
  }

  const visible = scope(world, state);

  /*
   * "TAKE ALL" — find the verb's rule whose object slot allows MANY, and match
   * every object in scope that the slot would have accepted individually.
   */
  if (wantsAll && rest.length === 0) {
    const rule = rules.find(
      (r) => r.objects.length === 1 && r.objects[0]!.options?.includes("MANY"),
    );
    if (rule === undefined) return { kind: "no-syntax", verb };

    const slot = rule.objects[0]!;
    const eligible = new Set(allEligible(world, state));
    const matched = visible
      .filter((entry) => eligible.has(entry.id))
      .filter((entry) => originAllowed(entry.origin, slot.options))
      /*
       * TRYTAKEBIT widens the slot's find flag here, and only here. "TAKE ALL"
       * in the Living Room answers for the rug and the trophy case too — "The
       * rug is extremely heavy and cannot be carried." — because ZIL includes
       * objects flagged "try to take me and I will explain why not", then lets
       * their action routines do the refusing. The wooden door, which carries
       * neither flag, is silently absent from the list.
       *
       * So the parser must *not* filter these out: the refusal is gameplay, and
       * dropping them would replace six answers with four.
       */
      .filter(
        (entry) =>
          slot.find === undefined ||
          hasFlag(state, entry.id, slot.find) ||
          hasFlag(state, entry.id, "TRYTAKEBIT"),
      )
      .map((entry) => entry.id);

    if (matched.length === 0) return { kind: "not-here", words: ["ALL"] };

    const command: ParsedCommand = {
      kind: "command",
      action: rule.action,
      verb,
      rule,
      directObjects: matched,
    };
    if (rule.preAction !== undefined) command.preAction = rule.preAction;
    return command;
  }

  const phrases = splitPhrases(lexicon, rest);

  // Rules are pre-sorted most-specific-first, so the first structural match is
  // the right one — no scoring pass needed.
  let sawStructuralMatch = false;
  let lastFailure: ParseFailure | undefined;

  for (const rule of rules) {
    if (!prepositionsAgree(rule, phrases)) continue;
    sawStructuralMatch = true;

    const resolved: string[] = [];
    let failure: ParseFailure | undefined;

    for (let i = 0; i < rule.objects.length; i++) {
      const slot = rule.objects[i]!;
      const phrase = phrases[i];
      if (phrase === undefined || phrase.words.length === 0) {
        failure = { kind: "no-syntax", verb };
        break;
      }
      const match = resolveNoun(world, state, lexicon, visible, phrase.words, slot);
      if (match.kind !== "ok") {
        // A HAVE slot reports its own requirement instead of the surroundings.
        failure =
          match.kind === "not-here" && slot.options?.includes("HAVE")
            ? { kind: "not-held", words: phrase.words }
            : match;
        break;
      }
      resolved.push(match.id);
    }

    if (failure === undefined) {
      const command: ParsedCommand = {
        kind: "command",
        action: rule.action,
        verb,
        rule,
      };
      if (rule.preAction !== undefined) command.preAction = rule.preAction;
      if (resolved[0] !== undefined) command.directObject = resolved[0];
      if (resolved[1] !== undefined) command.indirectObject = resolved[1];
      return command;
    }
    // Remember *why* the best structural candidate failed. A "not-here" from a
    // rule that otherwise fit is far more useful to the player than the generic
    // "you can't do that" a later, worse-fitting rule would produce.
    lastFailure ??= failure;
  }

  // Nothing matched as typed. Before refusing, see whether the player simply
  // stopped early — ZIL asks for the missing piece rather than rejecting.
  if (!sawStructuralMatch) {
    const incomplete = completeOrAsk(world, state, lexicon, visible, verb, rules, phrases);
    if (incomplete !== undefined) return incomplete;
    return { kind: "no-syntax", verb };
  }
  return lastFailure ?? { kind: "no-syntax", verb };
}

/**
 * Handle a sentence that ran out of words: supply the missing object if only
 * one thing could possibly be meant, otherwise ask for it.
 *
 * The auto-supply case needs a `find` flag to be safe. Bare "TAKE" answers
 * "(leaflet) You already have that!" because the leaflet is the only TAKEBIT
 * object in scope — note that it does so even though the leaflet is *held* and
 * TAKE's slot searches ON-GROUND/IN-ROOM, so this search deliberately ignores
 * the slot's location options and honours only its find flag. Bare "PUT" has no
 * find flag to narrow with and asks instead, even though the same two objects
 * are in scope.
 */
function completeOrAsk(
  world: WorldIndex,
  state: GameState,
  lexicon: Lexicon,
  visible: ScopeEntry[],
  verb: string,
  rules: readonly SyntaxRule[],
  phrases: Phrase[],
): ParseResult | undefined {
  const rule = ruleToComplete(rules, phrases);
  if (rule === undefined) return undefined;

  const slot = rule.objects[phrases.length]!;
  const remaining = rule.objects.length - phrases.length;

  /*
   * Only ever supply the *last* missing object. Inventing two would be guessing
   * at a sentence rather than completing one — and bare "WAKE", whose rule takes
   * an indirect object too, would reach the action with a half-built command.
   */
  if (remaining === 1 && slot.find !== undefined) {
    const candidates = visible.filter((e) => hasFlag(state, e.id, slot.find!));
    const resolved = resolveFilled(world, state, lexicon, visible, phrases, rule);
    if (candidates.length === 1 && resolved !== undefined) {
      const id = candidates[0]!.id;
      /*
       * The command is built here rather than by re-parsing the completed
       * sentence, because the object the parser just chose need not satisfy the
       * slot's *location* options: TAKE searches ON-GROUND/IN-ROOM, yet bare
       * "TAKE" answers for the leaflet in your hand. The find flag decides what
       * was meant; where it sits is the action's problem, and V-TAKE is what
       * produces "You already have that!".
       */
      const command: ParsedCommand = {
        kind: "command",
        action: rule.action,
        verb,
        rule,
        suppliedNoun: (world.objects.get(id)?.name ?? id).toLowerCase(),
      };
      if (rule.preAction !== undefined) command.preAction = rule.preAction;
      const slots = [...resolved, id];
      if (slots[0] !== undefined) command.directObject = slots[0];
      if (slots[1] !== undefined) command.indirectObject = slots[1];
      return command;
    }
  }

  const pending = [verb, ...phraseWords(phrases, rule)];
  if (slot.preposition !== undefined) pending.push(slot.preposition);
  return { kind: "orphan", question: askFor(verb, phrases, slot), pending };
}

/**
 * Which rule the unfinished sentence is heading for.
 *
 * Preferring the *most specific* rule, as the main loop does, is wrong here:
 * bare "PUT" would land on `PUT DOWN …` and ask "What do you want to put down?"
 * when the reference build asks "What do you want to put?". A slot introduced by
 * a preposition can't be what the player left out — they never typed the
 * particle — so those are skipped, and the shortest completion wins among the
 * rest.
 */
function ruleToComplete(rules: readonly SyntaxRule[], phrases: Phrase[]): SyntaxRule | undefined {
  const usable = rules.filter((r) => isPrefixOf(r, phrases));
  const open = usable.filter((r) => r.objects[phrases.length]!.preposition === undefined);
  const preferred = open.length > 0 ? open : usable;
  // `usable` is still in specificity order, so a stable sort keeps that as the
  // tie-break among rules needing equally many more objects.
  return [...preferred].sort((a, b) => a.objects.length - b.objects.length)[0];
}

/** Resolve the objects the player *did* name, for a sentence we are completing. */
function resolveFilled(
  world: WorldIndex,
  state: GameState,
  lexicon: Lexicon,
  visible: ScopeEntry[],
  phrases: Phrase[],
  rule: SyntaxRule,
): string[] | undefined {
  const ids: string[] = [];
  for (let i = 0; i < phrases.length; i++) {
    const match = resolveNoun(world, state, lexicon, visible, phrases[i]!.words, rule.objects[i]!);
    if (match.kind !== "ok") return undefined;
    ids.push(match.id);
  }
  return ids;
}

/** Are the phrases typed so far a valid opening for this rule? */
function isPrefixOf(rule: SyntaxRule, phrases: Phrase[]): boolean {
  if (phrases.length >= rule.objects.length) return false;
  for (let i = 0; i < phrases.length; i++) {
    if (rule.objects[i]!.preposition !== phrases[i]!.preposition) return false;
    if (phrases[i]!.words.length === 0) return false;
  }
  return true;
}

/** The words of the phrases already filled, prepositions included. */
function phraseWords(phrases: Phrase[], rule: SyntaxRule): string[] {
  const out: string[] = [];
  for (let i = 0; i < phrases.length; i++) {
    const preposition = rule.objects[i]!.preposition;
    if (preposition !== undefined) out.push(preposition);
    out.push(...phrases[i]!.words);
  }
  return out;
}

/**
 * ZIL's orphan question: "What do you want to put the mailbo in?"
 *
 * The objects already given are echoed as the player's *own truncated words*,
 * not as the object's display name — "the mailbo", not "the small mailbox".
 * That is the Z-machine dictionary's six-character limit showing through, and
 * it is exactly the kind of detail a golden transcript pins down.
 */
function askFor(verb: string, phrases: Phrase[], slot: SyntaxRule["objects"][number]): string {
  const parts = [`What do you want to ${verb.toLowerCase()}`];
  for (const phrase of phrases) {
    parts.push(`the ${phrase.words.map((w) => truncate(w).toLowerCase()).join(" ")}`);
  }
  if (slot.preposition !== undefined) parts.push(slot.preposition.toLowerCase());
  return `${parts.join(" ")}?`;
}

interface Phrase {
  /** The preposition introducing this phrase, if any. */
  preposition?: string;
  words: string[];
}

/**
 * Split the words after the verb into noun phrases at preposition boundaries.
 *
 * A leading preposition attaches to the *first* phrase ("PUT DOWN LAMP" → one
 * phrase, preposition DOWN), which is what lets ZIL's particle verbs share a
 * verb word with their plain forms.
 */
function splitPhrases(lexicon: Lexicon, words: string[]): Phrase[] {
  const phrases: Phrase[] = [];
  let current: Phrase | undefined;

  for (const word of words) {
    const canonical = resolveWord(lexicon, word);
    if (lexicon.prepositions.has(canonical)) {
      current = { preposition: canonical, words: [] };
      phrases.push(current);
      continue;
    }
    if (current === undefined) {
      current = { words: [] };
      phrases.push(current);
    }
    current.words.push(canonical);
  }
  return phrases;
}

/** Do the rule's prepositions line up with the phrases the player typed? */
function prepositionsAgree(rule: SyntaxRule, phrases: Phrase[]): boolean {
  if (rule.objects.length !== phrases.length) return false;
  for (let i = 0; i < rule.objects.length; i++) {
    if (rule.objects[i]!.preposition !== phrases[i]!.preposition) return false;
  }
  return true;
}

type NounMatch = { kind: "ok"; id: string } | ParseFailure;

/**
 * Resolve one noun phrase against what is in scope.
 *
 * Adjectives narrow; the noun decides. When several objects still qualify, the
 * rule's `find` flag breaks the tie before we give up and ask — that is how
 * "ATTACK TROLL WITH SWORD" picks the weapon rather than asking which sword-ish
 * thing was meant.
 */
function resolveNoun(
  world: WorldIndex,
  state: GameState,
  lexicon: Lexicon,
  visible: ScopeEntry[],
  words: string[],
  slot: SyntaxRule["objects"][number],
): NounMatch {
  const nounWord = words[words.length - 1]!;
  const adjectiveWords = words.slice(0, -1);

  const byNoun = new Set(lexicon.nouns.get(truncate(nounWord)) ?? []);
  if (byNoun.size === 0) return { kind: "not-here", words };

  let candidates = visible.filter(
    (entry) => byNoun.has(entry.id) && originAllowed(entry.origin, slot.options),
  );

  for (const adjective of adjectiveWords) {
    const withAdjective = new Set(lexicon.adjectives.get(truncate(adjective)) ?? []);
    // An adjective that is also a noun for the object ("BRASS LANTERN" where
    // LANTERN is itself listed) must not eliminate it.
    const alsoNoun = new Set(lexicon.nouns.get(truncate(adjective)) ?? []);
    candidates = candidates.filter((e) => withAdjective.has(e.id) || alsoNoun.has(e.id));
  }

  if (candidates.length === 0) return { kind: "not-here", words };
  if (candidates.length === 1) return { kind: "ok", id: candidates[0]!.id };

  if (slot.find !== undefined) {
    const preferred = candidates.filter((e) => hasFlag(state, e.id, slot.find!));
    if (preferred.length === 1) return { kind: "ok", id: preferred[0]!.id };
    if (preferred.length > 1) candidates = preferred;
  }

  // Scope order is the preference order (held before on the ground), so a tie
  // among *equally* reachable objects is the only genuine ambiguity.
  const best = candidates[0]!;
  if (candidates.every((e) => e.origin === best.origin)) {
    return {
      kind: "ambiguous",
      words,
      candidates: candidates.map((e) => e.id),
    };
  }
  return { kind: "ok", id: best.id };
}

/**
 * What "all" ranges over: things lying in the room, things on a surface in the
 * room, and things the player holds.
 *
 * The surface case is the one worth stating, and it was settled by asking the
 * reference build rather than by reasoning. "TAKE ALL" in the Kitchen takes the
 * bottle and the sack — both sitting *on the table* — so a rule of "direct
 * children of the room only" is too narrow. But it does **not** take the water
 * inside the bottle, even though the bottle is transparent and the water is
 * plainly in scope. So the rule is not "everything visible" either.
 *
 * A surface is furniture: its contents read as being in the room. An ordinary
 * container's contents do not, open or not — they come along inside it.
 */
function allEligible(world: WorldIndex, state: GameState): string[] {
  const room = here(state);
  const ids: string[] = [];

  for (const id of state.children[room] ?? []) {
    if (id === PLAYER_ID) continue;
    ids.push(id);
    if (hasFlag(state, id, "SURFACEBIT")) {
      ids.push(...(state.children[id] ?? []));
    }
  }
  ids.push(...(state.children[PLAYER_ID] ?? []));

  return ids.filter((id) => world.objects.has(id));
}

/**
 * The noun a UI should print when asking "Which do you mean?" — the object's
 * display name, never its id.
 */
export function describeCandidates(world: WorldIndex, ids: readonly string[]): string[] {
  return ids.map((id) => world.objects.get(id)?.name ?? id);
}
