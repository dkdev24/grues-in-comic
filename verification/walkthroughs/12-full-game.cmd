# parity: informational
# oracle: completion
# reason: the complete game, West of House to the Stone Barrow — 405 commands,
#   all nineteen treasures in the trophy case, 350/350, "Master Adventurer".
#   This is the stage 5.5 completion oracle: proof the world document drives a
#   full winning playthrough, not a turn-for-turn parity check.
#
#   It cannot be strict, for the reasons stage 4.5 already documented and this
#   route only multiplies:
#     1. Two fights (troll with the sword, thief with the nasty knife) pick
#        their messages by random draw; the engine's seeded generator is not
#        the Z-machine's, so combat text never matches turn-for-turn.
#     2. The thief *relocates a treasure*. Under dfrotz seed 1234 he lifts the
#        ivory torch off the Shaft Room floor while the coal mine is run, so the
#        torch is recovered from his corpse at the end rather than cased from the
#        mine — a world-state fork, not just a text one, and the engine's draw
#        may fork the other way.
#   Membership and the win-state are verified in engine/test instead; see the
#   completion test that replays this file and asserts score 350 / barrow.
#
# Route notes worth keeping (each cost a death or a dead-end to find):
#   - The lantern stays lit the whole game. LAMP-OFF disables I-LANTERN
#     (1actions.zil:2247), so the ~385 on-turn budget (200+100+70+15) only
#     drains while lit; 411 moves with the opening above-ground and the barrow
#     finish unlit stays comfortably under it. The torch is a treasure here, not
#     the light source — which is why the coal-mine gas never touches it.
#   - Sharp objects (screwdriver, sceptre) puncture the boat, and the sack only
#     holds both once the lunch is eaten and the garlic carried in hand — the
#     garlic then wards the vampire bat on the way into the mine.
#   - Drop the torch at the Shaft Room before the Gas Room: an open flame there
#     is "** BOOOOOOOOOOOM **". The lantern is electric and safe.
open mailbox
take leaflet
read leaflet
drop leaflet
n
n
climb tree
take egg
d
s
e
open window
enter house
take sack
take bottle
open sack
w
take sword
take lantern
move rug
open trap door
turn on lantern
d
drop egg
n
kill troll with sword
kill troll with sword
kill troll with sword
kill troll with sword
drop sword
w
w
w
u
take coins
take key
sw
e
s
se
odysseus
e
e
open case
put coins in case
drop key
drop bottle
open trap door
d
s
e
take painting
w
n
u
put painting in case
d
n
e
e
e
echo
take bar
w
w
w
s
u
put bar in case
d
n
e
e
e
u
e
n
take matchbook
n
take wrench
take screwdriver
push yellow button
s
s
turn bolt with wrench
drop wrench
w
wait
wait
n
take trunk
s
sw
sw
w
s
u
put trunk in case
d
n
e
n
ne
n
n
take pump
n
take trident
u
n
n
w
d
u
put trident in case
e
u
take rope
d
w
d
n
e
e
se
e
tie rope to railing
d
take torch
s
drop pump
drop screwdriver
drop sack
drop matchbook
e
take coffin
open coffin
take sceptre
w
s
pray
e
s
e
in
w
put coffin in case
put sceptre in case
d
n
e
e
se
e
d
s
take matchbook
take bell
open matchbook
s
take candles
take black book
put out candles
d
d
ring bell
take candles
light match
light candles with match
read black book
put out candles
drop black book
s
take skull
n
u
n
n
n
w
w
s
u
put skull in case
take sceptre
d
n
e
e
se
e
d
s
take all
s
d
n
n
n
e
u
e
e
inflate plastic with pump
drop pump
take lunch
eat lunch
take garlic
put screwdriver in sack
put sceptre in sack
enter boat
launch
wait
wait
wait
wait
take buoy
e
get out of boat
open buoy
take emerald
drop buoy
take shovel
ne
dig sand with shovel
dig sand with shovel
dig sand with shovel
dig sand with shovel
drop shovel
take scarab
sw
take sceptre
s
s
wave sceptre
w
w
sw
u
u
nw
w
w
w
put scarab in case
put emerald in case
put sceptre in case
e
e
e
e
d
d
n
take pot
sw
u
u
nw
w
w
w
put pot in case
d
n
e
e
s
s
touch mirror
n
w
n
w
n
take figurine
e
drop torch
take screwdriver
put candles in basket
put screwdriver in basket
n
d
take bracelet
e
ne
se
sw
d
d
s
take coal
n
u
u
n
e
s
n
u
s
put coal in basket
take candles
light match
light candles with match
put candles in basket
lower basket
n
d
e
ne
se
sw
d
d
w
drop all
w
take coal
take screwdriver
take candles
s
open machine
put coal in machine
close machine
turn switch with screwdriver
open machine
take diamond
drop screwdriver
n
put candles in basket
put diamond in basket
e
take all
e
u
u
n
e
s
n
u
s
raise basket
take diamond
take candles
put out candles
w
s
e
s
d
u
put diamond in case
put bracelet in case
put figurine in case
e
u
take knife
d
w
w
w
u
kill thief with knife
kill thief with knife
take knife
kill thief with knife
kill thief with knife
kill thief with knife
kill thief with knife
kill thief with knife
take chalice
take egg
take torch
d
e
e
turn off lantern
put chalice in case
put torch in case
open egg
take canary
put egg in case
e
e
n
n
wind canary
take bauble
s
e
w
w
put canary in case
put bauble in case
look in case
take map
read map
e
e
s
w
sw
w
