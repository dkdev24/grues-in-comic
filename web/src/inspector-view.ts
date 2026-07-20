/**
 * The event inspector: the running mix, and the last turn's raw events.
 *
 * Not player-facing furniture. It exists because 5.2's job is to prove the
 * ADR 0002 contract is consumable from outside the engine, and a transcript
 * alone proves only that `narration` works. The inspector shows the four event
 * types the console pane drops — which are precisely the ones 5.3 renders.
 */

import type { Turn } from "./session.js";
import { ALL_EVENT_KINDS, describeEvent, type EventMix } from "./event-mix.js";

export interface InspectorView {
  update(turn: Turn): void;
}

export function createInspectorView(root: HTMLElement): InspectorView {
  const mixList = required(root, ".mix");
  const lastList = required(root, ".last-events");

  return {
    update(turn) {
      renderMix(mixList, turn.mix);
      renderLast(lastList, turn);
    },
  };
}

function renderMix(list: HTMLElement, mix: EventMix): void {
  list.replaceChildren();
  for (const kind of ALL_EVENT_KINDS) {
    const count = mix.counts.get(kind) ?? 0;
    const row = document.createElement("div");
    row.className = count === 0 ? "mix-row mix-zero" : "mix-row";
    const name = document.createElement("span");
    name.className = "mix-kind";
    name.textContent = kind;
    const value = document.createElement("span");
    value.className = "mix-count";
    // Per-turn rate is the comparable figure — ADR 0004's census is quoted as
    // "187 object-moved over 189 turns", i.e. ~1 per turn.
    value.textContent = mix.turns > 0 ? `${count} (${(count / mix.turns).toFixed(2)}/turn)` : `${count}`;
    row.append(name, value);
    list.appendChild(row);
  }
}

function renderLast(list: HTMLElement, turn: Turn): void {
  list.replaceChildren();
  if (turn.events.length === 0) {
    const row = document.createElement("div");
    row.className = "event-row event-empty";
    row.textContent = "(no events)";
    list.appendChild(row);
    return;
  }
  for (const e of turn.events) {
    const row = document.createElement("div");
    row.className = `event-row event-${e.type}`;
    const kind = document.createElement("span");
    kind.className = "event-kind";
    kind.textContent = e.type;
    const detail = document.createElement("span");
    detail.className = "event-detail";
    detail.textContent = describeEvent(e);
    row.append(kind, detail);
    list.appendChild(row);
  }
}

function required(root: HTMLElement, selector: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`inspector is missing ${selector}`);
  return el;
}
