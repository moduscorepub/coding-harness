/** "First Last", with surrounding whitespace removed from each part. */
export function fullName(first: string, last: string): string {
  return `${first.trim()} ${last.trim()}`;
}
