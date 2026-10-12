/** URL slug: lowercase ASCII letters and digits, words joined by single hyphens. */
export function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
