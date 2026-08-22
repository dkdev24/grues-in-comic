# The death scene. Zork kills you constantly and no walkthrough had ever died,
# so the comic's death beat (ADR 0004 §7, amended for F18) had no corpus row to
# render — only a synthetic fixture in `web/test/mapper.test.ts`.
#
# **Strict, and built to be.** Two separate things here draw on <RANDOM>, and the
# route avoids both:
#
#   1. *How you die.* Almost every death in Zork I is a random draw — the troll,
#      the thief, the grue, `jump` into a pit (<PICK-ONE ,JUMPLOSS>) — and ADR
#      0002 declined to reproduce the Z-machine's PRNG, so none of them can be
#      compared turn-for-turn. Canyon View is the exception: `CANYON-VIEW-F`
#      (1dungeon.zil:2406) answers a bare LEAP with one fixed string and
#      <JIGS-UP>, no draw in it.
#
#   2. *What dying costs you.* `RANDOMIZE-OBJECTS` (1actions.zil:4101) scatters
#      what you were carrying — a treasure into a random dark room, anything else
#      into `<GET ,ABOVE-GROUND <RANDOM .L>>`. So the Hero deliberately carries
#      **nothing**: an earlier draft took the leaflet for the "death costs you
#      what you held" beat and the two interpreters dropped it in different
#      forests one turn later. Carrying anything into a death forfeits strictness.
#
# `inventory` at the end is the point of the scene rather than a checksum: it is
# the turn the Hero looks at his own empty hands.
open mailbox
north
east
east
east
jump
look
inventory
quit
y
