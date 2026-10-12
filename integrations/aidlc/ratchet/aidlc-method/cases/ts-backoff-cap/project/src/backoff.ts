/** Delay in ms before retry `attempt` (0-based): `baseMs` doubled per attempt, never more than `maxMs`. */
export function backoffDelay(attempt: number, baseMs = 100, maxMs = 5000): number {
  return baseMs * 2 ** attempt;
}
