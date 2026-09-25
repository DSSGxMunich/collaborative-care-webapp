import type { Session } from "./session";

/** Excludes 0/O and 1/I, which are easy to misread when handwritten or read off a small screen. */
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Small non-cryptographic string hash (FNV-1a, 32-bit) — good enough to turn answers into a code, not a security primitive. */
function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * A short, human-typeable code derived deterministically from the patient's
 * answers. This is the waiting-room unlock ritual, not access control: the
 * patient reads the code off their own screen and the GP types it back in
 * once they're both together (see WaitingBlocker) — anyone with the device
 * already has the underlying data. Deterministic on {completedAt, phq,
 * safety, profile} means the code changes automatically if any of those
 * change, so a code copied down earlier can't unlock a since-edited session.
 */
export function computeUnlockCode(session: Session, length = 5): string {
  const canonical = JSON.stringify({
    completedAt: session.completedAt,
    phq: session.phq,
    safety: session.safety,
    profile: session.profile,
  });
  let hash = fnv1a(canonical);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[hash % CODE_ALPHABET.length];
    hash = Math.floor(hash / CODE_ALPHABET.length);
  }
  return code;
}

/** Normalizes GP input for comparison against computeUnlockCode's output — case/whitespace/dash-insensitive. */
export function normalizeUnlockCode(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}
