/**
 * ISO 3166-1 alpha-2 → regional-indicator flag.
 *
 * Always rendered next to the country or UN/LOCODE text, never instead of it:
 * flag glyphs are missing on most Windows builds, and a location field that
 * degrades to a blank square is worse than one that never had a flag.
 */
export function flagEmoji(countryCode: string): string {
  const cc = countryCode.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(cc)) return ''
  return String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0)))
}
