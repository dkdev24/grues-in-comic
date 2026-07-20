/**
 * `.avb` record-stream parser.
 *
 * A header, then tagged records until `AK_STARTDATA`, then a blob section the
 * records point into by byte offset. Tags >= 256 carry a size, so an unknown
 * one is skippable; tags below 256 predate that and are unrecoverable.
 */
import { Reader } from "./reader.js";
import {
  AF_MAGIC, AF_MAGIC_NEW, AIF_DIB, AIP_NOPALETTE, AK_COLORPALETTE, AK_COPYRIGHT,
  AK_FLAGS, AK_ICON, AK_ICON_NEW, AK_NAME, AK_NBODIES, AK_NBODIES2, AK_NFACES,
  AK_NFACES2, AK_NTORSOS, AK_NTORSOS2, AK_OFFSET_ADJUSTMENT, AK_ORIGINAL_URL,
  AK_OVERRIDE_URL, AK_STARTDATA, AK_STYLE, AK_USAGE_FLAGS, AT_BACKDROP,
  AT_COMPLEX, AT_SIMPLE, EMOTION_NAMES, RECORD_SIZE, emotionAngle,
  type Avatar, type AvatarType, type PartKind, type PoseRecord, type RGB,
} from "./format.js";

const TYPE_NAMES: Record<number, AvatarType> = {
  [AT_SIMPLE]: "SIMPLE",
  [AT_COMPLEX]: "COMPLEX",
  [AT_BACKDROP]: "BACKDROP",
};

function readPalette(r: Reader): RGB[] {
  const n = r.i16();
  const out: RGB[] = [];
  for (let i = 0; i < n; i++) out.push([r.u8(), r.u8(), r.u8()]);
  return out;
}

export function parseAvatar(bytes: Uint8Array, path = "<memory>"): Avatar {
  const r = new Reader(bytes);
  const magic = r.u16();
  const type = r.u16();
  const version = r.u16();
  if (magic !== AF_MAGIC && magic !== AF_MAGIC_NEW) {
    throw new Error(`bad magic 0x${magic.toString(16)} in ${path}`);
  }

  const av: Avatar = {
    path,
    type: TYPE_NAMES[type] ?? "SIMPLE",
    version,
    flags: 0,
    offsetAdjustment: 0,
    records: [],
    bytes,
  };

  for (;;) {
    const tag = r.u16();
    const size = tag >= AK_ICON_NEW ? r.u16() : 0;
    if (tag === AK_STARTDATA) break;

    switch (tag) {
      case AK_NAME: av.name = r.cstr(); break;
      case AK_COPYRIGHT: av.copyright = r.cstr(); break;
      case AK_ORIGINAL_URL:
      case AK_OVERRIDE_URL: r.cstr(); break;
      case AK_USAGE_FLAGS: av.usageFlags = r.u8(); break;
      case AK_STYLE: av.style = r.i16(); break;
      case AK_FLAGS: av.flags = r.i16(); break;
      case AK_ICON: r.u32(); break;
      case AK_ICON_NEW: r.raw(size); break;
      case AK_COLORPALETTE: av.globalPalette = readPalette(r); break;
      case AK_OFFSET_ADJUSTMENT:
        // Read32, signed — the header's "signed 2-bit integer" means 32-bit
        // (gotcha 1). Accumulates across records; applies to non-zero offsets only.
        av.offsetAdjustment += r.i32();
        break;
      case AK_NBODIES: case AK_NBODIES2:
      case AK_NFACES: case AK_NFACES2:
      case AK_NTORSOS: case AK_NTORSOS2:
        readPoseRecords(r, tag, av);
        break;
      default:
        if (tag >= AK_ICON_NEW) r.raw(size);
        else throw new Error(`unknown old tag ${tag} at ${r.pos - 2} in ${path}`);
    }
  }
  return av;
}

function readPoseRecords(r: Reader, tag: number, av: Avatar): void {
  const kind: PartKind =
    tag === AK_NBODIES || tag === AK_NBODIES2 ? "body"
    : tag === AK_NFACES || tag === AK_NFACES2 ? "face"
    : "torso";
  const old = tag === AK_NBODIES || tag === AK_NFACES || tag === AK_NTORSOS;
  const recordSize = RECORD_SIZE[kind][old ? "old" : "new"];
  const count = r.u16();

  for (let i = 0; i < count; i++) {
    const base = r.pos;
    const image = r.u32();
    const mask = r.u32();
    const aura = r.u32();
    const emotion = r.i16();
    // avatario.cpp:158 — the file stores intensity as byte/255. The /10 +
    // IndexToByte scaling elsewhere in that file is the wire protocol (gotcha 4).
    const intensity = r.u8() / 255;

    const rec: PoseRecord = {
      kind,
      index: i,
      image, mask, aura,
      emotion,
      emotionName: EMOTION_NAMES[emotion] ?? String(emotion),
      angle: emotionAngle(emotion),
      intensity,
      imageFormat: AIF_DIB, maskFormat: AIF_DIB, auraFormat: AIF_DIB,
      imagePalette: AIP_NOPALETTE, maskPalette: AIP_NOPALETTE, auraPalette: AIP_NOPALETTE,
    };

    // Field sets differ per part (gotcha 2): torso has cx/cy but no x/y, body
    // has x/y but no cx/cy, only face has all six. Sharing a layout misaligns
    // every torso by four bytes without crashing.
    if (kind === "face") {
      rec.cx = r.i16(); rec.cy = r.i16();
      rec.cxDelta = r.i16(); rec.cyDelta = r.i16();
      rec.x = r.i16(); rec.y = r.i16();
    } else if (kind === "torso") {
      rec.cx = r.i16(); rec.cy = r.i16();
    } else {
      rec.x = r.i16(); rec.y = r.i16();
    }

    if (!old) {
      rec.imageFormat = r.u8();
      rec.maskFormat = r.u8();
      rec.auraFormat = r.u8();
      rec.imagePalette = r.u8();
      rec.maskPalette = r.u8();
      rec.auraPalette = r.u8();
    }

    // Old-layout records carry 16 bytes of trailing padding; seeking past the
    // declared size covers both layouts without special-casing.
    r.pos = base + recordSize;
    av.records.push(rec);
  }
}

/** Apply `AK_OFFSET_ADJUSTMENT` — to non-zero offsets only (`ADJUST_OFFSET`). */
export function adjustOffset(offset: number, av: Avatar): number {
  return offset ? offset + av.offsetAdjustment : 0;
}

export function facesOf(av: Avatar): PoseRecord[] {
  return av.records.filter((rec) => rec.kind === "face");
}

export function torsosOf(av: Avatar): PoseRecord[] {
  return av.records.filter((rec) => rec.kind === "torso");
}

export function bodiesOf(av: Avatar): PoseRecord[] {
  return av.records.filter((rec) => rec.kind === "body");
}
