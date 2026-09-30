import {
  treatmentAnswered,
  type Profile,
  type SafetyAnswers,
  type Session,
  type Sex,
  type YesNo,
} from "./session";

/** Excludes 0/O and 1/I, which are easy to misread when handwritten or read off a small screen. */
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const BASE = CODE_ALPHABET.length;

/**
 * The waiting-room code *is* the patient's answers, packed into a short
 * string: the patient reads it off their phone or the waiting-room tablet,
 * and the GP types it into "Practice" on any device (see GpUnlockCard) to
 * rebuild the session there. Nothing is sent over the network.
 *
 * Packing is mixed-radix: each answer is a "digit" with its own base (4 for
 * a PHQ-9 item, 2 for yes/no, …), so the whole answer set becomes one
 * integer, which is then written in base 32. Every value fits in
 * 3 × 4⁹ × 2⁴ × 3 × 6 × 2⁴ × 2⁴ × 2¹⁷ ≈ 2^53.8 < 32^11, i.e. 11 characters,
 * plus one check character.
 *
 * The order of FIELDS below, and of the option lists, IS the format. Changing
 * either silently changes what old codes decode to, so bump CODE_VERSION
 * instead (and decode older versions if still needed).
 */
const CODE_VERSION = 2;
const VERSION_RADIX = 3;
const DATA_LENGTH = 11;
export const CODE_LENGTH = DATA_LENGTH + 1;

const YES_NO: YesNo[] = ["no", "yes"];
const SEX_ORDER: Sex[] = ["female", "male", "other", "intersex", "unsure", "preferNotToSay"];
/** One bit per treatment, once for "now" and once for "before"; no bits set at all means "none". */
const TREATMENT_ORDER = ["antidepressant", "psychotherapy", "inpatient", "selfhelp"];
const TREATMENT_RADIX = 2 ** TREATMENT_ORDER.length;
const treatmentBits = (ids: string[]) =>
  TREATMENT_ORDER.reduce((bits, id, i) => (ids.includes(id) ? bits | (1 << i) : bits), 0);
const treatmentIds = (bits: number) => TREATMENT_ORDER.filter((_, i) => bits & (1 << i));

/** Birth date as whole days since 1900-01-01 (UTC); 2^17 days reaches 2258. */
const EPOCH_MS = Date.UTC(1900, 0, 1);
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAY_RADIX = 2 ** 17;

const daysFromIso = (iso: string) =>
  Math.round((Date.parse(`${iso}T00:00:00Z`) - EPOCH_MS) / MS_PER_DAY);
const isoFromDays = (days: number) =>
  new Date(EPOCH_MS + days * MS_PER_DAY).toISOString().slice(0, 10);

/** The answers a code carries — everything the results and the Practice summary need. */
export type EncodedAnswers = Pick<Session, "phq" | "safety" | "profile">;

/** Luhn mod N: catches every single-character typo and most swapped neighbours. */
function checkChar(data: string): string {
  let sum = 0;
  for (let i = data.length - 1, double = true; i >= 0; i--, double = !double) {
    let v = CODE_ALPHABET.indexOf(data[i]!) * (double ? 2 : 1);
    v = Math.floor(v / BASE) + (v % BASE);
    sum += v;
  }
  return CODE_ALPHABET[(BASE - (sum % BASE)) % BASE]!;
}

/**
 * Packs completed answers into a 12-character code, or returns null if any
 * answer is still missing (the waiting-room screen only shows once complete).
 */
export function encodeAnswers({ phq, safety, profile }: EncodedAnswers): string | null {
  let n = 0n;
  const push = (value: number, radix: number) => {
    if (!Number.isInteger(value) || value < 0 || value >= radix)
      throw new RangeError("out of range");
    n = n * BigInt(radix) + BigInt(value);
  };
  const yesNo = (v: YesNo | null) => {
    if (v === null) throw new RangeError("missing");
    return YES_NO.indexOf(v);
  };

  try {
    push(CODE_VERSION, VERSION_RADIX);
    for (const v of phq) push(v ?? -1, 4);
    push(yesNo(safety.past), 2);
    push(yesNo(safety.plan), 2);
    push(safety.probability ?? -1, 3);
    push(yesNo(safety.preventive), 2);
    push(yesNo(safety.familyHistory), 2);
    push(profile.sex ? SEX_ORDER.indexOf(profile.sex) : -1, SEX_ORDER.length);
    if (!treatmentAnswered(profile.treatment)) return null;
    push(treatmentBits(profile.treatment.current), TREATMENT_RADIX);
    push(treatmentBits(profile.treatment.past), TREATMENT_RADIX);
    push(profile.birthDate ? daysFromIso(profile.birthDate) : -1, DAY_RADIX);
  } catch {
    return null;
  }

  let data = "";
  for (let i = 0; i < DATA_LENGTH; i++) {
    data = CODE_ALPHABET[Number(n % BigInt(BASE))] + data;
    n /= BigInt(BASE);
  }
  return data + checkChar(data);
}

/** Normalizes GP input — case/whitespace/dash-insensitive. */
export function normalizeUnlockCode(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/** "7K3MQ9XA4TRB" → "7K3M-Q9XA-4TRB", easier to read aloud and copy. */
export function formatUnlockCode(code: string): string {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

/**
 * Reverses encodeAnswers. Returns null for anything that isn't a valid code:
 * wrong length, unknown characters, a failed check character (typo), an
 * unknown version, or values out of range.
 */
export function decodeAnswers(input: string): EncodedAnswers | null {
  const code = normalizeUnlockCode(input);
  if (code.length !== CODE_LENGTH) return null;
  const data = code.slice(0, DATA_LENGTH);
  if (checkChar(data) !== code[DATA_LENGTH]) return null;

  let n = 0n;
  for (const ch of data) {
    const d = CODE_ALPHABET.indexOf(ch);
    if (d < 0) return null;
    n = n * BigInt(BASE) + BigInt(d);
  }

  // Digits come back out in reverse order of encodeAnswers' pushes.
  const pop = (radix: number) => {
    const d = Number(n % BigInt(radix));
    n /= BigInt(radix);
    return d;
  };
  const days = pop(DAY_RADIX);
  const past = treatmentIds(pop(TREATMENT_RADIX));
  const current = treatmentIds(pop(TREATMENT_RADIX));
  const sex = SEX_ORDER[pop(SEX_ORDER.length)]!;
  const familyHistory = YES_NO[pop(2)]!;
  const preventive = YES_NO[pop(2)]!;
  const probability = pop(3) as 0 | 1 | 2;
  const plan = YES_NO[pop(2)]!;
  const pastHarm = YES_NO[pop(2)]!;
  const phq = Array.from({ length: 9 }, () => pop(4)).reverse();
  const version = pop(VERSION_RADIX);
  if (version !== CODE_VERSION || n !== 0n) return null;

  const birthDate = isoFromDays(days);
  if (birthDate > new Date().toISOString().slice(0, 10)) return null;

  const safety: SafetyAnswers = { past: pastHarm, plan, probability, preventive, familyHistory };
  const profile: Profile = {
    birthDate,
    sex,
    treatment: { current, past, none: current.length === 0 && past.length === 0 },
  };
  return { phq, safety, profile };
}
