/** Sum of the numbers. */
export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** `value` limited to [min, max]; min above max is a RangeError. */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) throw new RangeError("min must not exceed max");
  return Math.min(max, Math.max(min, value));
}
