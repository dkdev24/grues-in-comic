/**
 * Pose selection — mapping a requested emotion onto the poses an avatar owns.
 *
 * Comic Chat models emotion as a point on a wheel: an **angle** (which emotion)
 * plus an **intensity** 0.0–1.0 (how much). Selection is nearest-neighbour on
 * that wheel, which is why an avatar never needs a pose for every emotion — a
 * request lands on whatever the artist actually drew.
 *
 * Ported from `CAvatarSimple::GetBodyFromEmotion`,
 * `CAvatarComplex::GetBodyFromEmotion` and `GetHeadAndBodyFromEmotion`
 * (`v2.1b/cchat/avatar.cpp:200-330`). Divergences from the original are marked.
 */
import { NEMOTIONS, isGesture, type PoseRecord } from "./format.js";

export interface Emotion {
  /** Radians on the wheel, or a gesture sentinel above 2π. */
  angle: number;
  /** 0.0–1.0. */
  intensity: number;
}

/** One weighted candidate in a `CEmotionOpts` set. Higher priority wins. */
export interface EmotionOption extends Emotion {
  priority: number;
}

/** `value_to_angle` (`vector2d.cpp:181`) — normalise into (-π, π]. */
export function normalizeAngle(value: number): number {
  if (value > -Math.PI && value <= Math.PI) return value;
  let t = value / (2 * Math.PI);
  t = (t - Math.trunc(t)) * 2 * Math.PI;
  if (t > Math.PI) return t - 2 * Math.PI;
  if (t <= -Math.PI) return t + 2 * Math.PI;
  return t;
}

export function subtractAngles(a: number, b: number): number {
  return normalizeAngle(a - b);
}

/**
 * How far a pose may sit from the request and still be considered: half a
 * wheel segment in each direction, so the eight segments tile the circle.
 */
const ANGLE_TOLERANCE = Math.PI / NEMOTIONS;

const isNeutral = (rec: PoseRecord) => rec.angle === 0 && rec.intensity === 0;

/**
 * Nearest pose by angle, then by intensity. Used for faces, which always
 * resolve to *something*: an avatar with one face still has to render.
 */
export function nearestByAngle(
  records: readonly PoseRecord[], want: Emotion,
): PoseRecord | undefined {
  let best: PoseRecord | undefined;
  let bestAngle = 3 * Math.PI;
  let bestIntensity = 2.0;

  for (const rec of records) {
    const angle = Math.abs(subtractAngles(rec.angle, want.angle));
    if (angle > bestAngle) continue;
    const intensity = Math.abs(want.intensity - rec.intensity);
    if (angle === bestAngle && intensity >= bestIntensity) continue;
    bestAngle = angle;
    bestIntensity = intensity;
    best = rec;
  }
  return best;
}

/**
 * Nearest torso or body: a *gated* search — a candidate must fall inside the
 * wheel segment, or be a resting neutral, to be considered at all. Bodies
 * therefore can fail to match, and the caller falls back to neutral.
 *
 * `start` implements the original's `m_lastTorso + 1` round-robin: the scan
 * begins after the pose used last, so repeated identical emotions cycle through
 * whatever variants exist instead of freezing on one drawing. It is the reason
 * a Comic Chat conversation does not look like a row of clones, and it is worth
 * preserving.
 */
export function nearestGated(
  records: readonly PoseRecord[], want: Emotion, start = 0,
): PoseRecord | undefined {
  let best: PoseRecord | undefined;
  let bestIntensity = 2.0;
  const n = records.length;

  for (let i = 0; i < n; i++) {
    const rec = records[(start + i) % n]!;
    // Gestures are sentinels above 2π; the angular metric cannot reach them.
    if (isGesture(rec.angle)) continue;
    const angle = Math.abs(subtractAngles(rec.angle, want.angle));
    const firstNeutral = isNeutral(rec) && best === undefined;
    if (angle >= ANGLE_TOLERANCE && !firstNeutral) continue;
    // A resting neutral standing in for a felt emotion is a weak match, but a
    // legal one — rank it behind anything that actually matched.
    const intensity = firstNeutral && want.intensity > 0
      ? 1.5
      : Math.abs(want.intensity - rec.intensity);
    if (intensity >= bestIntensity) continue;
    bestIntensity = intensity;
    best = rec;
  }
  return best;
}

export function firstNeutral(records: readonly PoseRecord[]): PoseRecord | undefined {
  return records.find(isNeutral) ?? records[0];
}

/**
 * `GetHeadAndBodyFromEmotion` — resolve one emotion to a face *or* a torso.
 *
 * The split is the interesting part. An emotion on the wheel is a **facial
 * expression** and resolves against faces; a gesture (WAVE, SHRUG, the walks)
 * is a **body posture** and resolves against torsos by exact match, because no
 * angular metric applies to a sentinel. One request therefore constrains one
 * half of the figure and leaves the other free — which is what lets a character
 * wave while looking sad.
 */
export function headAndTorsoFor(
  faces: readonly PoseRecord[], torsos: readonly PoseRecord[], want: Emotion,
): { face?: PoseRecord; torso?: PoseRecord } {
  if (!isGesture(want.angle)) {
    const face = nearestByAngle(faces, want);
    return face ? { face } : {};
  }
  const torso = torsos.find((rec) => rec.angle === want.angle);
  return torso ? { torso } : {};
}

/**
 * Resolve a *set* of weighted candidate emotions to a face and a torso.
 *
 * Ported from `CAvatarComplex::GetBodyFromEmotion(CEmotionOpts&)`. Options are
 * consumed highest-priority first; the first that yields a face fixes the face,
 * the first that yields a torso fixes the torso, and the scan stops once both
 * are filled. Anything still unfilled falls back to neutral.
 *
 * This is how Comic Chat reconciled competing signals — an emoticon, a
 * detected gesture phrase, and a sentence-level mood could all be offered at
 * once, and each got to claim the half of the figure it spoke to.
 */
export function selectComplexPose(
  faces: readonly PoseRecord[], torsos: readonly PoseRecord[],
  options: readonly EmotionOption[],
): { face?: PoseRecord; torso?: PoseRecord } {
  const remaining = options.map((o) => ({ ...o }));
  let face: PoseRecord | undefined;
  let torso: PoseRecord | undefined;

  for (;;) {
    let best: (typeof remaining)[number] | undefined;
    for (const option of remaining) {
      if (option.priority > (best?.priority ?? 0)) best = option;
    }
    if (!best) break;
    best.priority = 0;
    const found = headAndTorsoFor(faces, torsos, best);
    face ??= found.face;
    torso ??= found.torso;
    if (face && torso) break;
  }

  face ??= firstNeutral(faces);
  torso ??= firstNeutral(torsos);
  const out: { face?: PoseRecord; torso?: PoseRecord } = {};
  if (face) out.face = face;
  if (torso) out.torso = torso;
  return out;
}

/**
 * Resolve a single emotion to a face and a torso — the common path.
 *
 * Divergence from the original, deliberate: `CAvatarComplex::GetBodyFromEmotion`
 * reuses one `nearestI` variable across the face and torso loops, so a request
 * whose torso search matches nothing silently draws *the face's index as a
 * torso*. Here an unmatched torso falls back to neutral, which is what the
 * `CEmotionOpts` path already does.
 */
export function selectPose(
  faces: readonly PoseRecord[], torsos: readonly PoseRecord[], want: Emotion,
  lastTorso = -1,
): { face?: PoseRecord; torso?: PoseRecord } {
  const face = nearestByAngle(faces, want);
  const torso = nearestGated(torsos, want, (lastTorso + 1) % Math.max(1, torsos.length))
    ?? firstNeutral(torsos);
  const out: { face?: PoseRecord; torso?: PoseRecord } = {};
  if (face) out.face = face;
  if (torso) out.torso = torso;
  return out;
}

/** Simple avatars have one image per pose; the same gated search applies. */
export function selectBody(
  bodies: readonly PoseRecord[], want: Emotion, lastBody = -1,
): PoseRecord | undefined {
  if (isGesture(want.angle)) {
    return bodies.find((rec) => rec.angle === want.angle) ?? firstNeutral(bodies);
  }
  return nearestGated(bodies, want, (lastBody + 1) % Math.max(1, bodies.length))
    ?? firstNeutral(bodies);
}
