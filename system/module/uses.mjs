/**
 * Lenient parser for an ability's `uses` string -> {max, period} or null.
 *
 * NO Foundry imports (node-testable, same rationale as rolls.mjs). `uses` is
 * LLM-generated TEXT: "3/day", "1 per encounter", "once per short rest", or
 * garbage. A finite, countable use returns {max, period}; anything unbounded
 * ("at will", "unlimited") or unparseable returns null, and the sheet renders
 * it display-only instead of a spend counter.
 */

const WORD_NUM = { once: 1, twice: 2, thrice: 3 };

export function parseUses(raw) {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,;:]+$/, "");
  if (!s) return null;
  // Unbounded uses aren't a countable resource — no spend counter.
  if (/\b(at ?will|unlimited|infinite|any number|as needed)\b/.test(s)) return null;
  // "<count> [/|per|x] [period]" — count is a digit or once/twice/thrice; the
  // separator and trailing period are both optional (bare "3" is valid).
  const m = s.match(/^(\d+|once|twice|thrice)\s*(?:\/|per|x)?\s*([a-z][a-z ]*)?$/);
  if (!m) return null;
  const max = WORD_NUM[m[1]] ?? parseInt(m[1], 10);
  if (!Number.isInteger(max) || max <= 0) return null;
  const period = (m[2] ?? "").trim() || null;
  return { max, period };
}
