#!/usr/bin/env python3
"""Reference decoder for Microsoft Comic Chat .avb avatar files.

Stage 5.1 POC. This is a *reference implementation documenting the format*,
in the same spirit as `ir/poc/` — the production art pipeline will be
TypeScript (ADR 0002: one language across subsystems). Do not build the M5
asset pipeline on this script; port it.

Normative format notes, including the five undocumented gotchas this script
had to discover empirically, live in `docs/AVB_FORMAT.md`. Read that first.

Source of truth for the format is the historical code, all under
`original-projects/comic-chat/`:
    artifacts/avtools/avbfile.h    - structs, enums, record codes (492 lines)
    artifacts/avtools/avbfile.cpp  - reference reader
    v2.1b/cchat/avatario.cpp       - client-side pose record reader
    v2.1b/cchat/avatar.h           - emotion wheel constants

Verified against the full corpus: 191/191 files parse, 4656/4656 images decode.

Usage:
    python3 avbdec.py <file.avb> <outdir> [limit]

Stdlib only - no third-party dependencies.
"""
import struct, zlib, sys, os, collections

AF_MAGIC, AF_MAGIC_NEW = 0x81, 0x8181
AT = {1: "SIMPLE", 2: "COMPLEX", 3: "BACKDROP"}
AK_NAME, AK_FLAGS, AK_ICON, AK_NFACES, AK_NTORSOS = 1, 2, 3, 4, 5
AK_STARTDATA, AK_STYLE, AK_NBODIES = 6, 8, 9
AK_NFACES2, AK_NTORSOS2, AK_NBODIES2 = 10, 11, 12
AK_ICON_NEW, AK_COLORPALETTE = 256, 257
AK_COPYRIGHT, AK_ORIGINAL_URL, AK_OVERRIDE_URL = 259, 260, 261
AK_USAGE_FLAGS, AK_OFFSET_ADJUSTMENT = 262, 263

AIF_DIB, AIF_LZDEFLATE = 0, 1
(AIP_NOPALETTE, AIP_GLOBALPALETTE, AIP_LOCALPALETTE,
 AIP_MONOCHROME, AIP_MASKEDMONO, AIP_DUALMASK) = range(6)

MONO_PAL = [(255, 255, 255), (0, 0, 0)]
MASKEDMONO_PAL = [(255, 255, 255), (0, 0, 0), (128, 0, 0), (0, 0, 128)]

EMOTION = [None, "HAPPY", "COY", "BORED", "SCARED", "SAD", "ANGRY", "SHOUT",
           "LAUGH", "NEUTRAL", "WAVE", "POINTOTHER", "POINTSELF",
           "DOUBLEPOINT", "SHRUG", "3QRWALK", "SIDEWALK", "3QFWALK"]

# packed record layouts: (size, struct-format-of-prefix)
REC = {
    "body":  {"old": 35, "new": 25},
    "face":  {"old": 43, "new": 33},
    "torso": {"old": 35, "new": 25},
}


class R:
    def __init__(s, b, p=0): s.b, s.p = b, p
    def u8(s):  v = s.b[s.p]; s.p += 1; return v
    def u16(s): v = struct.unpack_from("<H", s.b, s.p)[0]; s.p += 2; return v
    def i16(s): v = struct.unpack_from("<h", s.b, s.p)[0]; s.p += 2; return v
    def u32(s): v = struct.unpack_from("<I", s.b, s.p)[0]; s.p += 4; return v
    def i32(s): v = struct.unpack_from("<i", s.b, s.p)[0]; s.p += 4; return v
    def raw(s, n): v = s.b[s.p:s.p + n]; s.p += n; return v
    def cstr(s):
        e = s.b.index(b"\0", s.p); v = s.b[s.p:e].decode("latin-1"); s.p = e + 1; return v


def read_palette(r):
    """CAvatarPalette::Read - INT16 count, then 3-byte RGB entries."""
    n = r.i16()
    return [tuple(r.raw(3)) for _ in range(n)]


def bmih(r):
    """BITMAPINFOHEADER after biSize (already consumed by caller)."""
    w, h = r.i32(), r.i32()
    planes, bits = r.u16(), r.u16()
    comp, szimg = r.u32(), r.u32()
    r.u32(); r.u32()                      # pels/meter
    clrused, clrimp = r.u32(), r.u32()
    return dict(w=w, h=h, bits=bits, comp=comp, szimg=szimg, clrused=clrused)


BI_RGB, BI_RLE8, BI_RLE4 = 0, 1, 2


def unrle(data, w, h, bits):
    """Decode BI_RLE4 / BI_RLE8 into a flat index bitmap (bottom-up rows)."""
    rows = [[0] * w for _ in range(h)]
    x = y = p = 0
    while p < len(data) - 1:
        n, v = data[p], data[p + 1]
        p += 2
        if n:                                   # encoded run
            for i in range(n):
                if x >= w:
                    break
                rows[y][x] = v if bits == 8 else (v >> 4 if i % 2 == 0 else v & 0xF)
                x += 1
        elif v == 0:                            # end of line
            x, y = 0, y + 1
        elif v == 1:                            # end of bitmap
            break
        elif v == 2:                            # delta
            x += data[p]; y += data[p + 1]; p += 2
        else:                                   # absolute run of v pixels
            if bits == 8:
                for i in range(v):
                    if x < w:
                        rows[y][x] = data[p + i]; x += 1
                p += v + (v & 1)                # pad to word
            else:
                for i in range(v):
                    b = data[p + i // 2]
                    if x < w:
                        rows[y][x] = b >> 4 if i % 2 == 0 else b & 0xF
                        x += 1
                nb = (v + 1) // 2
                p += nb + (nb & 1)              # pad to word
        if y >= h:
            break
    rows.reverse()                              # RLE rows are bottom-up
    return rows


def unpack_rows(data, w, h, bits, top_down=False):
    """DIB rows are 4-byte aligned, bottom-up unless height<0."""
    stride = ((w * bits + 31) // 32) * 4
    rows = []
    for y in range(abs(h)):
        off = y * stride
        row = data[off:off + stride]
        px = []
        if bits == 1:
            for x in range(w):
                px.append((row[x >> 3] >> (7 - (x & 7))) & 1)
        elif bits == 2:
            for x in range(w):
                px.append((row[x >> 2] >> (6 - 2 * (x & 3))) & 3)
        elif bits == 4:
            for x in range(w):
                px.append((row[x >> 1] >> (0 if x & 1 else 4)) & 0xF)
        elif bits == 8:
            px = list(row[:w])
        elif bits == 24:
            px = [(row[x*3+2], row[x*3+1], row[x*3]) for x in range(w)]
        else:
            raise ValueError(f"unsupported bpp {bits}")
        rows.append(px)
    if not top_down and h > 0:
        rows.reverse()
    return rows


def decode_image(buf, offset, fmt, paltype, global_pal):
    """Returns (rows_of_palette_indices_or_rgb, width, height, palette)."""
    r = R(buf, offset)

    if fmt == AIF_DIB:
        # A complete .BMP file embedded at this offset.
        if r.raw(2) != b"BM":
            raise ValueError("not a BMP")
        r.u32(); r.u32()                  # size, reserved
        bits_off = r.u32()
        hdrsize = r.u32()
        if hdrsize != 40:
            raise ValueError(f"unsupported DIB header {hdrsize}")
        info = bmih(r)
        ncol = info["clrused"] or (1 << info["bits"] if info["bits"] <= 8 else 0)
        pal = [(c[2], c[1], c[0]) for c in
               (struct.unpack_from("<4B", buf, r.p + i * 4) for i in range(ncol))]
        data = buf[offset + bits_off:]
        if info["comp"] in (BI_RLE4, BI_RLE8):
            rows = unrle(data, info["w"], abs(info["h"]), info["bits"])
        else:
            rows = unpack_rows(data, info["w"], abs(info["h"]), info["bits"],
                               top_down=info["h"] < 0)
        return rows, info["w"], abs(info["h"]), pal

    # AIF_LZDEFLATE
    pal = None
    if paltype == AIP_LOCALPALETTE:
        tag, _size = r.u16(), r.u16()
        if tag != AK_COLORPALETTE:
            raise ValueError(f"expected palette tag, got {tag}")
        pal = read_palette(r)
    elif paltype == AIP_GLOBALPALETTE:
        pal = global_pal
    elif paltype == AIP_MONOCHROME:
        pal = MONO_PAL
    elif paltype in (AIP_MASKEDMONO, AIP_DUALMASK):
        pal = MASKEDMONO_PAL

    hdrsize = r.u32()
    if not (40 <= hdrsize <= 240):
        raise ValueError(f"bad header size {hdrsize}")
    info = bmih(r)
    r.p += hdrsize - 40                    # skip any extra header bytes
    uncomp, comp = r.u32(), r.u32()
    data = zlib.decompress(r.raw(comp))
    if len(data) != uncomp:
        raise ValueError(f"size mismatch {len(data)} != {uncomp}")
    rows = unpack_rows(data, info["w"], abs(info["h"]), info["bits"],
                       top_down=info["h"] < 0)
    return rows, info["w"], abs(info["h"]), pal


def parse(path):
    buf = open(path, "rb").read()
    r = R(buf)
    magic, typ, ver = r.u16(), r.u16(), r.u16()
    assert magic in (AF_MAGIC, AF_MAGIC_NEW), f"bad magic {magic:#x}"
    av = {"path": path, "type": AT.get(typ, typ), "ver": ver, "buf": buf,
          "global_pal": None, "recs": [], "adjust": 0}
    while True:
        tag = r.u16()
        size = r.u16() if tag >= AK_ICON_NEW else None
        if tag == AK_STARTDATA:
            break
        if tag == AK_NAME:
            av["name"] = r.cstr()
        elif tag == AK_COPYRIGHT:
            av["copyright"] = r.cstr()
        elif tag in (AK_ORIGINAL_URL, AK_OVERRIDE_URL):
            r.cstr()
        elif tag == AK_USAGE_FLAGS:
            av["usage"] = r.u8()
        elif tag in (AK_STYLE, AK_FLAGS):
            av[{AK_STYLE: "style", AK_FLAGS: "flags"}[tag]] = r.i16()
        elif tag == AK_ICON:
            r.u32()
        elif tag == AK_ICON_NEW:
            r.raw(size)
        elif tag == AK_COLORPALETTE:
            av["global_pal"] = read_palette(r)
        elif tag == AK_OFFSET_ADJUSTMENT:
            # Read32, signed. (Header comment says "2-bit"; it means 32-bit.)
            # Accumulates, and applies only to non-zero offsets.
            av["adjust"] += r.i32()
        elif tag in (AK_NBODIES, AK_NBODIES2, AK_NFACES, AK_NFACES2,
                     AK_NTORSOS, AK_NTORSOS2):
            kind = ("body" if tag in (AK_NBODIES, AK_NBODIES2) else
                    "face" if tag in (AK_NFACES, AK_NFACES2) else "torso")
            old = tag in (AK_NBODIES, AK_NFACES, AK_NTORSOS)
            n = r.u16()
            sz = REC[kind]["old" if old else "new"]
            for i in range(n):
                base = r.p
                img, mask, aura = r.u32(), r.u32(), r.u32()
                em, inten = r.i16(), r.u8()
                rec = dict(kind=kind, idx=i, img=img, mask=mask, aura=aura,
                           emotion=EMOTION[em] if 0 < em < len(EMOTION) else em,
                           # avatario.cpp:158 - file stores intensity as byte/255.
                           # (The /10 + IndexToByte path is the wire protocol.)
                           intensity=inten / 255.0)
                # Field sets differ per part (see AVATAR{BODY,FACE,TORSO}DATA):
                #   body  -> x, y          face -> cx, cy, cxDelta, cyDelta, x, y
                #   torso -> cx, cy  (no x/y)
                if kind == "face":
                    rec["cx"], rec["cy"] = r.i16(), r.i16()
                    rec["cxDelta"], rec["cyDelta"] = r.i16(), r.i16()
                    rec["x"], rec["y"] = r.i16(), r.i16()
                elif kind == "torso":
                    rec["cx"], rec["cy"] = r.i16(), r.i16()
                else:
                    rec["x"], rec["y"] = r.i16(), r.i16()
                if not old:
                    (rec["fmtImg"], rec["fmtMask"], rec["fmtAura"],
                     rec["palImg"], rec["palMask"], rec["palAura"]) = r.raw(6)
                else:
                    rec["fmtImg"] = rec["fmtMask"] = rec["fmtAura"] = AIF_DIB
                    rec["palImg"] = rec["palMask"] = rec["palAura"] = AIP_NOPALETTE
                r.p = base + sz
                av["recs"].append(rec)
        elif tag >= AK_ICON_NEW:
            r.raw(size)
        else:
            raise ValueError(f"unknown old tag {tag} at {r.p-2}")
    return av


# ---------- PNG output (stdlib only) ----------

def write_png(path, rgba_rows, w, h):
    def chunk(typ, data):
        c = typ + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c))
    raw = b"".join(b"\0" + bytes(v for px in row for v in px) for row in rgba_rows)
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    open(path, "wb").write(png)


# AIP_MASKEDMONO 2bpp semantics (avbfile.h:98): 00=blank 01=aura 10=black 11=white.
# NB: these are NOT the MaskedMonoPalette entries - that array is the DIB colour
# table used while splitting into image/mask/aura DIBs for Win32 BitBlt raster ops
# (ConvertFromMaskedMono). Rendering straight to RGBA we can use the semantics.
# The aura is the halo drawn behind the figure to lift it off the backdrop.
MASKEDMONO_RGBA = {
    0: (0, 0, 0, 0),          # blank -> transparent
    1: (255, 255, 255, 255),  # aura  -> white halo
    2: (0, 0, 0, 255),        # black -> ink
    3: (255, 255, 255, 255),  # white -> paper
}


def to_rgba(rows, pal, paltype):
    """Map palette indices to RGBA."""
    out = []
    for row in rows:
        o = []
        for v in row:
            if isinstance(v, tuple):
                o.append((*v, 255)); continue
            if paltype in (AIP_MASKEDMONO, AIP_DUALMASK):
                o.append(MASKEDMONO_RGBA[v]); continue
            c = pal[v] if pal and v < len(pal) else (255, 0, 255)
            o.append((*c, 255))
        out.append(o)
    return out


if __name__ == "__main__":
    src, outdir = sys.argv[1], sys.argv[2]
    limit = int(sys.argv[3]) if len(sys.argv) > 3 else 999
    os.makedirs(outdir, exist_ok=True)
    av = parse(src)
    print(f"{av.get('name')} [{av['type']}] v{av['ver']} recs={len(av['recs'])} "
          f"globalpal={len(av['global_pal']) if av['global_pal'] else None} "
          f"adjust={av['adjust']}")
    fmts = collections.Counter((r["fmtImg"], r["palImg"]) for r in av["recs"])
    print("(imgformat, palettetype) ->", dict(fmts))

    ok = fail = 0
    for rec in av["recs"][:limit]:
        tag = f"{rec['kind']}{rec['idx']:02d}_{rec['emotion']}_{rec['intensity']:.1f}"
        try:
            rows, w, h, pal = decode_image(av["buf"], rec["img"] + (av["adjust"] if rec["img"] else 0),
                                           rec["fmtImg"], rec["palImg"],
                                           av["global_pal"])
            rgba = to_rgba(rows, pal, rec["palImg"])
            write_png(os.path.join(outdir, tag + ".png"), rgba, w, h)
            ok += 1
        except Exception as e:
            print(f"  FAIL {tag}: {type(e).__name__}: {e}")
            fail += 1
    print(f"decoded {ok}, failed {fail} -> {outdir}")
