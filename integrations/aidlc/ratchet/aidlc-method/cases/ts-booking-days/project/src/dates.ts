const DAY_MS = 24 * 60 * 60 * 1000;

/** Days in a booking from `start` to `end` (YYYY-MM-DD), counting the first and the last day. */
export function bookingDays(start: string, end: string): number {
  return Math.round((Date.parse(end) - Date.parse(start)) / DAY_MS);
}
