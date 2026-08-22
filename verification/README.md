# verification/

**The parity oracle.** Nothing in this project claims the engine "plays Zork" on its own authority —
it is measured against the 1980s original, turn by turn, and this folder is where that measurement
lives.

## How parity is established

1. `original-projects/zork1/COMPILED/zork1.z3` — the shipped historical build (Release 119 / Serial
   880429) is the **behavioral ground truth**. Not a rebuild of it: the original binary.
2. `walkthroughs/*.cmd` — twelve command lists, from `01-west-of-house.cmd` (the opening) to
   `12-full-game.cmd` (a complete 350-point win).
3. `run-transcripts.sh` replays each walkthrough against that story file under `dfrotz` at a fixed
   seed and writes `golden/*.txt`.
4. The engine's own test suite replays the same command lists and diffs its output against those
   golden transcripts. Current state: **143/143 strict**.

```sh
./run-transcripts.sh          # check mode — diff against golden, fail on drift
./run-transcripts.sh capture  # (re)write the golden transcripts
STORY=path ./run-transcripts.sh   # check a different build against the same goldens
```

## What "strict" does and does not mean

Two of the game's systems draw their output with `<RANDOM …>` — combat and the thief — and ADR 0002
declined to reproduce the Z-machine's PRNG, so those turns **cannot** be compared by text. They are
verified by a different and deliberately stricter method: output must be a member of the set of
messages the original could have produced, **plus** assertions on the resulting world state, **plus**
a positive control of real `dfrotz` output. Membership alone is one-sided; that is why the other two
halves exist. `05-troll-combat.cmd` is informational for the same reason — by method, not by defect.

## `build.sh` — a different question

`build.sh` compiles the historical ZIL source with ZILF/ZAPF into `build/` (gitignored). It exists to
prove the source still compiles and to catch source-level drift, **not** to produce the story file
parity is measured against — that ZILF build reports "Release 0" and is not the historical binary.

## Tools

ZILF/ZAPF and `dfrotz` are invoked as external executables and are installed separately by the
developer; no source or binary from either is vendored here. See `THIRD_PARTY.md` for versions and
licenses.
