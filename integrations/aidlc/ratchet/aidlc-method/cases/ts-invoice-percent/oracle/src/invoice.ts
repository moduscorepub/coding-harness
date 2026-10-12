export type Line = { priceCents: number; qty: number };

export function subtotal(lines: Line[]): number {
  return lines.reduce((sum, line) => sum + line.priceCents * line.qty, 0);
}

/** Total in cents after a whole-number percentage discount. */
export function total(lines: Line[], discountPct = 0): number {
  const amount = subtotal(lines);
  return amount - Math.floor((amount * discountPct) / 100);
}
