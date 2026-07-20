# Flood Control Dam #3: the bubble, the yellow button, the bolt, the sluice gates.
#
# parity: informational
# reason: the engine cannot yet resolve combat *outcomes*, so the troll never
# dies. The dam is behind the Troll Room and the Troll Room is a cut vertex —
# there is no route to the dam avoiding it, and no non-combat way past him
# (giving and throwing the sword, and talking, were all tried against the
# reference build; he throws it back and keeps blocking). So the player is stuck
# from turn 13 on and every later turn cascades from that one cause.
#
# This is "fails to verify", not "cannot verify", and it is marked informational
# only so a known-missing subsystem does not sit red in the suite. It is NOT a
# limit of the method: the moment villain combat lands, delete the `# parity:`
# line above and this walkthrough verifies the whole dam sequence strictly —
# the four turns below stay quarantined, because their *text* is a random draw
# even when the outcome is right.
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
# strict:
east
down
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
