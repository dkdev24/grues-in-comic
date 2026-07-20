/**
 * Constants and record types for the Comic Chat `.avb` avatar format.
 *
 * The normative prose specification is `docs/AVB_FORMAT.md`. Names here mirror
 * the historical enums in `original-projects/comic-chat/artifacts/avtools/avbfile.h`
 * so the two can be read side by side.
 */

export const AF_MAGIC = 0x81;
export const AF_MAGIC_NEW = 0x8181;

/** `AVATARTYPE` — how a file's poses are assembled. */
export const AT_SIMPLE = 1;
export const AT_COMPLEX = 2;
export const AT_BACKDROP = 3;

export type AvatarType = "SIMPLE" | "COMPLEX" | "BACKDROP";

/** Record codes. Tags >= 256 carry an explicit size and are safely skippable. */
export const AK_NAME = 1;
export const AK_FLAGS = 2;
export const AK_ICON = 3;
export const AK_NFACES = 4;
export const AK_NTORSOS = 5;
export const AK_STARTDATA = 6;
export const AK_STYLE = 8;
export const AK_NBODIES = 9;
export const AK_NFACES2 = 10;
export const AK_NTORSOS2 = 11;
export const AK_NBODIES2 = 12;
export const AK_ICON_NEW = 256;
export const AK_COLORPALETTE = 257;
export const AK_COPYRIGHT = 259;
export const AK_ORIGINAL_URL = 260;
export const AK_OVERRIDE_URL = 261;
export const AK_USAGE_FLAGS = 262;
export const AK_OFFSET_ADJUSTMENT = 263;

/** `AVATARIMAGEFORMAT` — how pixels are stored at an offset. */
export const AIF_DIB = 0;
export const AIF_LZDEFLATE = 1;

/** `AVATARIMAGEPALETTE` — how to interpret the indices those pixels carry. */
export const AIP_NOPALETTE = 0;
export const AIP_GLOBALPALETTE = 1;
export const AIP_LOCALPALETTE = 2;
export const AIP_MONOCHROME = 3;
export const AIP_MASKEDMONO = 4;
export const AIP_DUALMASK = 5;

/** Avatar `AK_FLAGS` bits (`avatar.h:136`). Drive the compositing draw order. */
export const HEADMASK = 1;
export const TORSOMASK = 2;
export const TORSOFIRST = 4;
export const OTHERMAPPED = 8;

export const BI_RGB = 0;
export const BI_RLE8 = 1;
export const BI_RLE4 = 2;

/**
 * Emotion names by file index. The file stores a raw index into this table;
 * the runtime converts it to an angle (see {@link emotionAngle}).
 */
export const EMOTION_NAMES = [
  null, "HAPPY", "COY", "BORED", "SCARED", "SAD", "ANGRY", "SHOUT", "LAUGH",
  "NEUTRAL", "WAVE", "POINTOTHER", "POINTSELF", "DOUBLEPOINT", "SHRUG",
  "3QRWALK", "SIDEWALK", "3QFWALK",
] as const;

export type EmotionName = Exclude<(typeof EMOTION_NAMES)[number], null>;

/** Points on the emotion wheel — the eight that have an angle (`avatar.h:247`). */
export const NEMOTIONS = 8;

/**
 * `emFloats` (`avatario.cpp:255`) — file emotion index to runtime value.
 *
 * Indices 1–8 are angles around a wheel; 9 (NEUTRAL) is **0.0, the same angle
 * as HAPPY**, and is distinguished only by carrying intensity 0. The eight
 * gestures (10–17) are sentinels above 2π, deliberately outside the metric.
 */
export const EMOTION_ANGLES: readonly number[] = [
  0, // index 0 unused
  (0 * 2 * Math.PI) / 8, // HAPPY
  (1 * 2 * Math.PI) / 8, // COY
  (2 * 2 * Math.PI) / 8, // BORED
  (3 * 2 * Math.PI) / 8, // SCARED
  (4 * 2 * Math.PI) / 8, // SAD
  (5 * 2 * Math.PI) / 8, // ANGRY
  (6 * 2 * Math.PI) / 8, // SHOUT
  (7 * 2 * Math.PI) / 8, // LAUGH
  0.0, // NEUTRAL — same angle as HAPPY by design
  1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, // gesture sentinels
];

export function emotionAngle(index: number): number {
  return EMOTION_ANGLES[index] ?? 0;
}

/** True for the gesture sentinels, which no angular metric can reach. */
export function isGesture(angle: number): boolean {
  return angle > 2 * Math.PI;
}

export type PartKind = "body" | "face" | "torso";

/** Packed record sizes, `#pragma pack(1)`: no padding, old layout / new layout. */
export const RECORD_SIZE: Record<PartKind, { old: number; new: number }> = {
  body: { old: 35, new: 25 },
  face: { old: 43, new: 33 },
  torso: { old: 35, new: 25 },
};

/**
 * One pose record. Field availability differs by part — `body` has `x`/`y`,
 * `torso` has `cx`/`cy`, only `face` has all six (gotcha 2).
 */
export interface PoseRecord {
  kind: PartKind;
  index: number;
  /** Byte offsets of the three planes, already offset-adjusted. 0 = absent. */
  image: number;
  mask: number;
  aura: number;
  emotion: number;
  emotionName: string;
  /** Runtime angle, or a gesture sentinel above 2π. */
  angle: number;
  /** 0.0–1.0. The file stores `byte / 255` (gotcha 4). */
  intensity: number;
  /** Composition anchor on this part, present on face and torso. */
  cx?: number;
  cy?: number;
  /** Face-only nudge applied to the anchor when mounting onto a torso. */
  cxDelta?: number;
  cyDelta?: number;
  /** Body/face only. `faceX` on a face — the balloon-tail attach point. */
  x?: number;
  y?: number;
  imageFormat: number;
  maskFormat: number;
  auraFormat: number;
  imagePalette: number;
  maskPalette: number;
  auraPalette: number;
}

export interface Avatar {
  path: string;
  type: AvatarType;
  version: number;
  name?: string;
  copyright?: string;
  usageFlags?: number;
  style?: number;
  flags: number;
  globalPalette?: RGB[];
  /** Accumulated `AK_OFFSET_ADJUSTMENT`, already applied to record offsets. */
  offsetAdjustment: number;
  records: PoseRecord[];
  bytes: Uint8Array;
}

export type RGB = readonly [number, number, number];
