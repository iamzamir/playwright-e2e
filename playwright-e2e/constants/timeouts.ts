export const TIMEOUTS = {
  TINY: 2000,
  SHORT: 5000,
  MEDIUM: 10000,
  LONG: 15000,
  XLARGE: 30000,
  EXTREME: 60000,
  ACTION: 60000,
  TEST: 900000,
  EXTENDED: 1800000,
  POLL_INTERVAL: 500,
  TYPE_CHAR_DELAY: 50,
  POST_INPUT_SETTLE: 200,
} as const;

export type TimeoutKey = keyof typeof TIMEOUTS;

export function getTimeout(key: TimeoutKey): number {
  const raw = process.env.PW_TIMEOUT_MULTIPLIER;
  const multiplier = raw ? Number(raw) : 1;
  const safeMultiplier = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  return Math.ceil(TIMEOUTS[key] * safeMultiplier);
}
