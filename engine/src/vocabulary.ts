/**
 * The lexicon (stage 4.2) — every word the parser will accept, indexed once at
 * load time.
 *
 * The IR splits vocabulary in two, mirroring ZIL: `vocabulary` holds the words
 * that belong to the *language* (verbs, prepositions, directions, noise words),
 * while nouns and adjectives live on the objects that answer to them. Both
 * halves are folded into one lookup structure here so the parser never has to
 * know which half a word came from.
 *
 * Words keep their upper-case ZIL spelling throughout — that is the IR's
 * traceability rule, and it makes the tokenizer's job simply "upper-case it".
 */

import type { Direction, SyntaxRule, WorldDocument } from "@grues-in-comic/ir";

/**
 * ZIL's parser only distinguishes words by their first six characters (the
 * Z-machine dictionary truncates), which is why "MAILBO" matches "MAILBOX" in
 * the original. Reproducing that is a parity requirement, not a nicety: golden
 * transcripts may well contain a truncated word.
 */
const DICTIONARY_WIDTH = 6;

export interface Lexicon {
  /** Alias → canonical word (GET → TAKE). Canonical words map to themselves. */
  canonical: Map<string, string>;
  /** Words the parser discards entirely (ZIL BUZZ) plus punctuation. */
  buzzwords: Set<string>;
  /** Direction word → direction (canonical spelling, so "N" resolves first). */
  directions: Map<string, Direction>;
  /** Canonical verb word → its syntax rules, most specific first. */
  verbs: Map<string, SyntaxRule[]>;
  /** Noun → ids of every object answering to it. */
  nouns: Map<string, string[]>;
  /** Adjective → ids of every object carrying it. */
  adjectives: Map<string, string[]>;
  /** Prepositions any syntax rule uses — the parser's phrase separators. */
  prepositions: Set<string>;
}

export function buildLexicon(doc: WorldDocument): Lexicon {
  const vocab = doc.vocabulary;
  const canonical = new Map<string, string>();
  const buzzwords = new Set<string>();
  const directions = new Map<string, Direction>();
  const verbs = new Map<string, SyntaxRule[]>();
  const nouns = new Map<string, string[]>();
  const adjectives = new Map<string, string[]>();
  const prepositions = new Set<string>();

  if (vocab === undefined) {
    return { canonical, buzzwords, directions, verbs, nouns, adjectives, prepositions };
  }

  for (const s of vocab.synonyms) {
    canonical.set(truncate(s.word), s.word);
    for (const alias of s.synonyms) canonical.set(truncate(alias), s.word);
  }
  for (const b of vocab.buzzwords) buzzwords.add(truncate(b));

  for (const d of vocab.directions) directions.set(d.word, d.direction);
  // A direction's aliases (N, NE, …) are ordinary synonyms, so they reach the
  // direction table only through the canonical map — resolve them eagerly.
  for (const [alias, word] of canonical) {
    const dir = directions.get(word);
    if (dir !== undefined) directions.set(alias, dir);
  }

  for (const rule of vocab.syntax) {
    const key = rule.verb;
    (verbs.get(key) ?? verbs.set(key, []).get(key)!).push(rule);
    canonical.set(truncate(key), key);
    for (const slot of rule.objects) {
      if (slot.preposition !== undefined) prepositions.add(slot.preposition);
    }
  }
  // Most specific first: a rule with more filled slots, or with prepositions,
  // must be tried before the bare form, or "PUT DOWN LAMP" matches plain PUT.
  for (const rules of verbs.values()) rules.sort(specificityFirst);

  for (const obj of doc.objects) {
    for (const noun of obj.synonyms) index(nouns, truncate(noun), obj.id);
    for (const adj of obj.adjectives ?? []) index(adjectives, truncate(adj), obj.id);
  }

  return { canonical, buzzwords, directions, verbs, nouns, adjectives, prepositions };
}

/** Z-machine dictionary truncation — see {@link DICTIONARY_WIDTH}. */
export function truncate(word: string): string {
  return word.slice(0, DICTIONARY_WIDTH);
}

/** Resolve an input word to its canonical spelling, or leave it as typed. */
export function resolveWord(lexicon: Lexicon, word: string): string {
  return lexicon.canonical.get(truncate(word)) ?? word;
}

/**
 * Is this word known at all? An unknown word gets ZIL's "I don't know the word"
 * refusal, which is a *different* failure from a word the parser knows but
 * cannot use here — the distinction is visible in transcripts.
 */
export function isKnownWord(lexicon: Lexicon, word: string): boolean {
  const w = truncate(word);
  return (
    lexicon.canonical.has(w) ||
    lexicon.buzzwords.has(w) ||
    lexicon.directions.has(resolveWord(lexicon, word)) ||
    lexicon.nouns.has(w) ||
    lexicon.adjectives.has(w) ||
    lexicon.prepositions.has(resolveWord(lexicon, word))
  );
}

function index(map: Map<string, string[]>, key: string, id: string): void {
  const list = map.get(key);
  if (list === undefined) map.set(key, [id]);
  else list.push(id);
}

/**
 * Order syntax rules from most to least specific. Slot count dominates (a
 * two-object rule beats a one-object rule), then prepositions — "TAKE OUT X"
 * must be tried before plain "TAKE X".
 */
function specificityFirst(a: SyntaxRule, b: SyntaxRule): number {
  if (a.objects.length !== b.objects.length) return b.objects.length - a.objects.length;
  return prepCount(b) - prepCount(a);
}

function prepCount(rule: SyntaxRule): number {
  return rule.objects.filter((slot) => slot.preposition !== undefined).length;
}
