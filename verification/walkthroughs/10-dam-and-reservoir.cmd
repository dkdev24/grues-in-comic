# Flood Control Dam #3: the bubble, the yellow button, the bolt, the sluice gates.
#
# This walkthrough verifies strictly. It was informational until ADR 0003
# landed: I-SWORD was the last blocker, and the four turns that carry a "Your
# sword is glowing / has begun to glow / is no longer glowing" sentence were the
# only diffs left once combat started working.
#
# The fight turns below stay quarantined per-turn, because their *text* is a
# random draw even when the outcome is right (verified instead by membership,
# in engine/test/combat.test.ts) — and so do the two turns after them, which
# read the fight's *outcome* back out through the sword's glow.
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
# informational: troll combat output is chosen by a random draw; the engine's seeded generator is not the Z-machine's (see stage 4.5)
kill troll with sword
kill troll with sword
kill troll with sword
kill troll with sword
# informational: the sword's glow reports whether a villain is in or next to the room, so these two turns inherit the fight's randomness — the reference knocked the troll unconscious and it is still in the adjacent Troll Room ("faint blue glow", then no glow once the player leaves), while this run killed it outright. The glow itself is verified directly in engine/test/engine.test.ts.
east
down
# strict:
northeast
east
examine bubble
examine bolt
turn bolt with wrench
north
north
take wrench
press yellow button
south
south
turn bolt with wrench
examine bubble
look
quit
y
