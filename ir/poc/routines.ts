/**
 * Stage 2.2 POC — hand-written behavior AST for two nontrivial Zork I
 * routines, transcribed 1:1 from the historical source.
 *
 * TRAP-DOOR-EXIT (1actions.zil:567) — an exit routine (`PER`): nested COND,
 * flag test, returns a room or refuses with narration + pronoun binding.
 *
 * KITCHEN-WINDOW-F (1actions.zil:241) — an object action: verb dispatch,
 * global mutation, builtin helper call, location-dependent branching,
 * explicit RTRUE.
 */

import type { BehaviorRoutine, Expr } from "../src/behavior.js";

const T: Expr = { op: "const", value: true };

export const TRAP_DOOR_EXIT: BehaviorRoutine = {
  id: "TRAP-DOOR-EXIT",
  source: { file: "1actions.zil", line: 567 },
  body: [
    {
      op: "cond",
      clauses: [
        {
          when: { op: "global", id: "RUG-MOVED" },
          do: [
            {
              op: "cond",
              clauses: [
                {
                  when: { op: "flag?", entity: { op: "entity", id: "TRAP-DOOR" }, flag: "OPENBIT" },
                  do: [{ op: "return", value: { op: "entity", id: "CELLAR" } }],
                },
                {
                  when: T,
                  do: [
                    { op: "tell", parts: [{ text: "The trap door is closed." }, { newline: true }] },
                    { op: "call", routine: "THIS-IS-IT", args: [{ op: "entity", id: "TRAP-DOOR" }] },
                    { op: "return", value: { op: "const", value: false } },
                  ],
                },
              ],
            },
          ],
        },
        {
          when: T,
          do: [
            { op: "tell", parts: [{ text: "You can't go that way." }, { newline: true }] },
            { op: "return", value: { op: "const", value: false } },
          ],
        },
      ],
    },
  ],
};

export const KITCHEN_WINDOW_F: BehaviorRoutine = {
  id: "KITCHEN-WINDOW-F",
  source: { file: "1actions.zil", line: 241 },
  body: [
    {
      op: "cond",
      clauses: [
        {
          when: { op: "verb?", verbs: ["OPEN", "CLOSE"] },
          do: [
            { op: "set-global", id: "KITCHEN-WINDOW-FLAG", value: T },
            {
              op: "call",
              routine: "OPEN-CLOSE",
              args: [
                { op: "entity", id: "KITCHEN-WINDOW" },
                { op: "const", value: "With great effort, you open the window far enough to allow entry." },
                { op: "const", value: "The window closes (more easily than it opened)." },
              ],
            },
          ],
        },
        {
          when: {
            op: "and",
            args: [
              { op: "verb?", verbs: ["EXAMINE"] },
              { op: "not", arg: { op: "global", id: "KITCHEN-WINDOW-FLAG" } },
            ],
          },
          do: [
            {
              op: "tell",
              parts: [
                { text: "The window is slightly ajar, but not enough to allow entry." },
                { newline: true },
              ],
            },
          ],
        },
        {
          when: { op: "verb?", verbs: ["WALK", "BOARD", "THROUGH"] },
          do: [
            {
              op: "cond",
              clauses: [
                {
                  when: { op: "equal?", args: [{ op: "global", id: "HERE" }, { op: "entity", id: "KITCHEN" }] },
                  do: [{ op: "call", routine: "DO-WALK", args: [{ op: "const", value: "east" }] }],
                },
                { when: T, do: [{ op: "call", routine: "DO-WALK", args: [{ op: "const", value: "west" }] }] },
              ],
            },
            { op: "return", value: T },
          ],
        },
        {
          when: { op: "verb?", verbs: ["LOOK-INSIDE"] },
          do: [
            { op: "tell", parts: [{ text: "You can see " }] },
            {
              op: "cond",
              clauses: [
                {
                  when: { op: "equal?", args: [{ op: "global", id: "HERE" }, { op: "entity", id: "KITCHEN" }] },
                  do: [
                    {
                      op: "tell",
                      parts: [{ text: "a clear area leading towards a forest." }, { newline: true }],
                    },
                  ],
                },
                {
                  when: T,
                  do: [
                    { op: "tell", parts: [{ text: "what appears to be a kitchen." }, { newline: true }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
