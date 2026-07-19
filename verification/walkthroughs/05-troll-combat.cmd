# parity: informational
# reason: this walkthrough cannot reach turn-for-turn parity, for two reasons
#   that are worth keeping distinct.
#
#   1. I-SWORD is catalogued, not extracted (`unknown form <NEXTP …>`). It walks
#      the room's exits as numbered Z-machine properties to decide whether a
#      villain is near — a memory layout the IR deliberately abstracts away, so
#      the extractor cannot translate it mechanically. Expressing its *semantics*
#      over the IR's structured exits is an IR decision, not an engine one.
#
#   2. Combat messages are chosen by random draw, and the engine's seeded
#      generator is not the Z-machine's. Identical seeds give different
#      sequences, so these turns can never match text-for-text unless the engine
#      reproduces frotz's generator exactly. That is a deliberate open question,
#      not a defect: see HANDOFF.
#
#   The walkthrough is kept because turns 1-10 are deterministic and do verify,
#   and because it documents precisely where the parity method stops working.
north
east
open window
enter house
west
take lamp
take sword
move rug
open trap door
turn on lamp
down
north
attack troll with sword
attack troll with sword
attack troll with sword
attack troll with sword
look
score
quit
y
