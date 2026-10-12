/** Number of pages needed to show `total` items, `perPage` at a time. */
export function pageCount(total: number, perPage: number): number {
  if (perPage <= 0) throw new RangeError("perPage must be positive");
  return Math.floor(total / perPage);
}
