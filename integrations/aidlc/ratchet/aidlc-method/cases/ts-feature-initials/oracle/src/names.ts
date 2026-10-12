/** "First Last", with surrounding whitespace removed from each part. */
export function fullName(first: string, last: string): string {
  return `${first.trim()} ${last.trim()}`;
}

/** Uppercase first letter of each word; "" for a blank name. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase())
    .join("");
}
