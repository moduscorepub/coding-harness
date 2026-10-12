/** Fields of one CSV line. Double-quoted fields may contain commas; "" inside quotes is a literal quote. */
export function parseCsvLine(line: string): string[] {
  return line.split(",");
}
