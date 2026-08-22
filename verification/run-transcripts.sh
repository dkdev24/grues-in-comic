#!/bin/sh
# Golden transcript harness.
#
# Runs each walkthrough in verification/walkthroughs/*.cmd against the shipped
# reference build (original-projects/zork1/COMPILED/zork1.z3, Release 119 /
# Serial 880429 — the behavioral ground truth) under dfrotz with a fixed
# random seed, and compares the output to the golden transcripts in
# verification/golden/.
#
#   ./run-transcripts.sh          check mode: diff against golden, fail on drift
#   ./run-transcripts.sh capture  (re)write the golden transcripts
#   STORY=path ./run-transcripts.sh
#                                 check a different build (e.g. the ZILF build,
#                                 or later the Grues in Comic engine CLI) against
#                                 the same golden transcripts
#
# Requires dfrotz (brew install frotz). Transcripts are pinned to dfrotz's
# rendering (status line, prompts) and seed 1234; regenerate goldens only when
# that is a deliberate decision.

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STORY="${STORY:-$ROOT/original-projects/zork1/COMPILED/zork1.z3}"
SEED=1234
MODE="${1:-check}"

command -v dfrotz >/dev/null || { echo "error: dfrotz not found (brew install frotz)" >&2; exit 1; }
[ -f "$STORY" ] || { echo "error: story file not found: $STORY" >&2; exit 1; }

fail=0
for cmd in "$ROOT"/verification/walkthroughs/*.cmd; do
    name="$(basename "$cmd" .cmd)"
    golden="$ROOT/verification/golden/$name.txt"
    actual="$(mktemp)"
    # Strip `#` directives and blank lines: walkthroughs may carry parity
    # metadata for the engine harness (see engine/harness/golden.ts), and
    # feeding those lines to dfrotz would execute them as commands.
    commands="$(mktemp)"
    grep -v '^[[:space:]]*#' "$cmd" | grep -v '^[[:space:]]*$' > "$commands"
    # `Loading <path>` is dfrotz chrome, not game output, and it echoes whatever
    # path the harness was handed — so it pinned the *capturing machine* into the
    # golden. Two of the twelve files carried a relative path and the other ten an
    # absolute one under a developer's home directory, which meant `check` had been
    # failing on those two for anyone but the machine that wrote them, and the repo
    # was carrying a home directory into a release that is going public. Normalized
    # to the story file's name, which is the only part of that line that is a fact
    # about the *build* being verified.
    dfrotz -m -p -s "$SEED" "$STORY" < "$commands" 2>&1 \
        | sed "s|^Loading .*|Loading $(basename "$STORY").|" > "$actual" || true
    rm -f "$commands"

    case "$MODE" in
        capture)
            cp "$actual" "$golden"
            echo "captured: $name ($(wc -l < "$golden" | tr -d ' ') lines)"
            ;;
        check)
            if [ ! -f "$golden" ]; then
                echo "MISSING golden: $name (run capture first)"; fail=1
            elif diff -u "$golden" "$actual" > "$actual.diff"; then
                echo "PASS: $name"
            else
                echo "FAIL: $name"; cat "$actual.diff"; fail=1
            fi
            rm -f "$actual.diff"
            ;;
        *)
            echo "usage: $0 [check|capture]" >&2; exit 2
            ;;
    esac
    rm -f "$actual"
done

exit $fail
