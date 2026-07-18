#!/bin/sh
# Compile the historical Zork I ZIL source to a Z-machine v3 story file.
#
# Toolchain: ZILF + ZAPF 0.11.1 (https://foss.heptapod.net/zilf/zilf/-/releases)
#   macOS arm64: extract the osx-arm64 tarball and put bin/zilf, bin/zapf on PATH
#   (this script also looks in ~/.local/bin).
# The historical source in original-projects/zork1/ is never modified; sources
# are copied into verification/build/ (gitignored) and compiled there.
#
# Output: verification/build/zork1.z3
# Note: this build reports "Release 0" with today's date as serial number. The
# shipped reference build original-projects/zork1/COMPILED/zork1.z3 is
# "Release 119 / Serial 880429" and is the behavioral ground truth for golden
# transcripts; the ZILF build exists to prove the source compiles and to catch
# source-level drift.

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/original-projects/zork1"
BUILD="$ROOT/verification/build"

PATH="$HOME/.local/bin:$PATH"
command -v zilf >/dev/null || { echo "error: zilf not found on PATH" >&2; exit 1; }
command -v zapf >/dev/null || { echo "error: zapf not found on PATH" >&2; exit 1; }

mkdir -p "$BUILD"
cp "$SRC"/*.zil "$SRC/zork1freq.xzap" "$BUILD/"

cd "$BUILD"
zilf zork1.zil
zapf zork1.zap

echo "Built: $BUILD/zork1.z3"
