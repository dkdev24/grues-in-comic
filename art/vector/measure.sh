#!/bin/zsh
# rasterize -> 260px -> 1-bit threshold -> ink ratio, the objective style check
set -e
f=${1:-31-coal-mine}
if command -v rsvg-convert >/dev/null; then rsvg-convert -w 1040 -h 1040 $f.svg -o _hi.png
else qlmanage -t -s 1040 -o . $f.svg >/dev/null 2>&1; mv -f $f.svg.png _hi.png; fi
sips -z 260 260 _hi.png --out _sm.png >/dev/null
sips -s format bmp _sm.png --out _sm.bmp >/dev/null
python3 - "$f" <<'PY'
import struct, sys
def ink(path, thr=140):
    d=open(path,'rb').read(); off=struct.unpack_from('<I',d,10)[0]
    w,h=struct.unpack_from('<ii',d,18); bpp=struct.unpack_from('<H',d,28)[0]
    h=abs(h); bx=bpp//8; row=((w*bpp+31)//32)*4
    n=dark=0
    for y in range(h):
        base=off+y*row
        for x in range(w):
            p=base+x*bx; lum=0.299*d[p+2]+0.587*d[p+1]+0.114*d[p]
            n+=1; dark+= lum<thr
    return dark/n
print(f"{sys.argv[1]} ink={ink('_sm.bmp'):.3f}   (originals: field .261  room .381  pastoral .526)")
PY
rm -f _hi.png _sm.bmp _sm.png
