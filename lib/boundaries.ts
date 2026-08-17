/**
 * PRODUCT BOUNDARY — FREIGHT FORWARDING ONLY
 * ══════════════════════════════════════════════════════════════════════════
 * This demo is strictly PortWhizz *Freight Forwarding*. The customs checklist
 * product is a separate demo with a separate story, and must not appear here
 * in any form.
 *
 * Keeping that boundary by memory across ~20 modules is not a plan — someone
 * adds a plausible-looking "duty" column to a cost table six weeks from now
 * and the demo quietly starts telling the wrong story. So the boundary is
 * enforced mechanically: `tests/boundaries.test.ts` walks the source tree and
 * fails the build if any term below appears.
 *
 * Customs exists here as exactly one thing: an operational dependency called
 * "External customs coordination", expressing partner status and nothing more.
 */

/**
 * Terms that must never appear in app/, components/, data/ or store/.
 * Matched case-insensitively as whole phrases.
 */
export const FORBIDDEN_TERMS: readonly string[] = [
  // Checklist product surface
  'customs checklist',
  'checklist review',
  'checklist upload',
  'customs review workspace',
  'customs compliance dashboard',
  'customs ai assistant',
  'customs assistant',

  // Document extraction / provenance
  'field extraction',
  'document extraction',
  'bounding box',
  'field provenance',
  'evidence box',

  // Classification & duty
  'hsn',
  'ceth',
  'duty calculation',
  'duty amount',
  'assessable value',
  'customs exchange rate',
  'exchange-rate calculation',

  // Declarations & filing
  'declaration audit',
  'bill of entry',
  'shipping bill',
  'e-sanchit',
  'esanchit',
  'icegate',
]

/**
 * The ONLY customs-shaped vocabulary permitted in this product.
 * `types/index.ts` constrains `ClearanceCoordinationStatus` to exactly these,
 * and the boundary test asserts that union has not grown.
 */
export const ALLOWED_CLEARANCE_STATUSES = [
  'External customs partner required',
  'Customs partner assigned',
  'Clearance status pending partner update',
  'Clearance dependency open',
  'Partner clearance update received',
] as const

export type AllowedClearanceStatus = (typeof ALLOWED_CLEARANCE_STATUSES)[number]

/**
 * Positioning guardrail. PortWhizz is the digital operating layer — the
 * record of what happened and what must happen next. Partners execute.
 * These are the claims the product must never make about itself.
 */
export const FORBIDDEN_POSITIONING: readonly string[] = [
  'we are a carrier',
  'our vessels',
  'our fleet',
  'our warehouse',
  'we clear customs',
  'our customs brokers',
  'we lend',
  'live carrier rates',
  'live marketplace',
  'government portal',
]

/**
 * Directories the boundary test walks. Anything user-visible lives in one
 * of these; `lib/boundaries.ts` and the test itself are excluded, since they
 * necessarily contain the forbidden terms in order to police them.
 *
 * `lib` is on this list because prose stopped being a components-only
 * concern. Zeno composes its answers in `lib/zeno/intents/*` — sentences a
 * customer reads on screen, written a long way from any `.tsx` file — and a
 * guard that walks `components` but not the module that writes the product's
 * most-read paragraphs is a guard with a hole in exactly the wrong place.
 */
export const GUARDED_DIRS = ['app', 'components', 'data', 'store', 'hooks', 'types', 'lib'] as const

export const GUARD_EXEMPT_FILES = ['lib/boundaries.ts', 'tests/boundaries.test.ts'] as const

/** Returns every forbidden term found in `source`. Empty array = clean. */
export function findForbiddenTerms(source: string): string[] {
  const haystack = source.toLowerCase()
  return FORBIDDEN_TERMS.filter((term) => {
    const idx = haystack.indexOf(term)
    if (idx === -1) return false
    // Guard against substring false-positives on short acronyms: "hsn" must
    // not match inside an identifier like "useHsnLikeThing" or a hash.
    if (term.length <= 4) {
      const before = haystack[idx - 1] ?? ' '
      const after = haystack[idx + term.length] ?? ' '
      const isWordChar = (c: string) => /[a-z0-9_]/.test(c)
      if (isWordChar(before) || isWordChar(after)) return false
    }
    return true
  })
}

/**
 * Returns every forbidden positioning claim found in `source`.
 *
 * Separate from `findForbiddenTerms` because the failure is a different one.
 * A forbidden term means the wrong *product* leaked in; a forbidden claim
 * means the right product described itself wrongly — "our fleet" in a footer
 * is a sentence a lawyer cares about, not a stray column heading. Both fail
 * the build, and the test names which kind so the fix is obvious.
 *
 * No short-phrase guard here: every entry is multi-word, so a substring hit
 * is a genuine hit.
 */
export function findForbiddenPositioning(source: string): string[] {
  const haystack = source.toLowerCase()
  return FORBIDDEN_POSITIONING.filter((claim) => haystack.includes(claim))
}
