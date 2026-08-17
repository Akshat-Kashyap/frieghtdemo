import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

import { MODULE_KEYS } from '@/components/app/nav-config'
import {
  ALLOWED_CLEARANCE_STATUSES,
  FORBIDDEN_POSITIONING,
  FORBIDDEN_TERMS,
  GUARDED_DIRS,
  GUARD_EXEMPT_FILES,
  findForbiddenPositioning,
  findForbiddenTerms,
} from '@/lib/boundaries'

/**
 * THE PRODUCT BOUNDARY, ENFORCED
 * ══════════════════════════════════════════════════════════════════════════
 * This demo is freight forwarding only. The customs checklist product is a
 * separate demo and must not appear here in any form.
 *
 * Across ~20 modules that boundary cannot be held by memory — someone adds a
 * plausible "duty" column to a cost table and the demo quietly starts telling
 * the wrong story. So it is a test: if a forbidden term lands anywhere in the
 * source tree, the build fails and says exactly where.
 */

const ROOT = join(__dirname, '..')
const SOURCE_EXT = /\.(ts|tsx|css|md)$/

function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return acc
  }

  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.next' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, acc)
    else if (SOURCE_EXT.test(entry)) acc.push(full)
  }
  return acc
}

function guardedFiles(): string[] {
  const files: string[] = []
  for (const dir of GUARDED_DIRS) files.push(...walk(join(ROOT, dir)))
  return files.filter((f) => {
    const rel = relative(ROOT, f)
    return !GUARD_EXEMPT_FILES.some((exempt) => rel === exempt)
  })
}

describe('product boundary — freight forwarding only', () => {
  it('has a non-empty forbidden-term list (the guard is actually armed)', () => {
    expect(FORBIDDEN_TERMS.length).toBeGreaterThan(10)
  })

  it('finds no customs-checklist vocabulary anywhere in the source tree', () => {
    const violations: string[] = []

    for (const file of guardedFiles()) {
      const source = readFileSync(file, 'utf8')
      const hits = findForbiddenTerms(source)
      if (hits.length > 0) {
        violations.push(`${relative(ROOT, file)} → ${hits.join(', ')}`)
      }
    }

    // Printed in full so a failure names the file and the term, not just a count.
    expect(violations, `Customs-checklist content leaked into the freight demo:\n${violations.join('\n')}`).toEqual([])
  })

  /**
   * The positioning list used to be exported and never read — a guardrail
   * that existed as a comment. PortWhizz is the digital operating layer; the
   * moment a screen says "our fleet" or "we clear customs" the demo is making
   * a claim the company cannot stand behind, and that is a worse failure than
   * a stray column heading because it survives into a sales conversation.
   */
  it('never claims to move the freight or clear the customs itself', () => {
    const violations: string[] = []

    for (const file of guardedFiles()) {
      const hits = findForbiddenPositioning(readFileSync(file, 'utf8'))
      if (hits.length > 0) violations.push(`${relative(ROOT, file)} → ${hits.join(', ')}`)
    }

    expect(
      violations,
      `PortWhizz described itself as something it is not:\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('keeps both guards armed and pointed at the whole source tree', () => {
    expect(FORBIDDEN_POSITIONING.length).toBeGreaterThan(5)

    // `lib` is the one that gets forgotten: Zeno writes its answers there, so
    // the product's most-read prose sits outside `components` entirely.
    expect(GUARDED_DIRS).toContain('lib')
    expect(GUARDED_DIRS).toContain('data')

    // A walk that returns nothing passes every assertion above it. Assert it
    // actually found files before trusting that it found no violations.
    expect(guardedFiles().length).toBeGreaterThan(50)
  })

  it('restricts clearance vocabulary to the five permitted coordination statuses', () => {
    expect(ALLOWED_CLEARANCE_STATUSES).toEqual([
      'External customs partner required',
      'Customs partner assigned',
      'Clearance status pending partner update',
      'Clearance dependency open',
      'Partner clearance update received',
    ])
  })

  it('keeps ClearanceCoordinationStatus bound to that allow-list', () => {
    // The type is declared as `AllowedClearanceStatus`, so widening the union
    // in types/index.ts without widening the allow-list is a compile error.
    // This asserts the wiring is still in place.
    const types = readFileSync(join(ROOT, 'types', 'index.ts'), 'utf8')
    expect(types).toContain('export type ClearanceCoordinationStatus = AllowedClearanceStatus')
  })

  /**
   * This assertion used to read `data/roles.ts` with a regex and check that
   * no module key looked like a customs surface. When that file was deleted
   * the regex matched nothing and the test went green — a guard that cannot
   * tell "clean" from "absent" is not a guard at all.
   *
   * It now imports the navigation and asserts the list is populated *before*
   * filtering it, so deleting the nav fails the test instead of passing it.
   */
  it('exposes no navigation route for a customs module', () => {
    expect(MODULE_KEYS.length).toBeGreaterThanOrEqual(12)

    const customsish = MODULE_KEYS.filter((key) => /customs|duty|declaration|entry|classification/i.test(key))
    expect(customsish).toEqual([])
  })

  it('keeps the HS code module a reference lookup, not a duty calculator', () => {
    // The HS module is permitted because it classifies and cites published
    // rates. The moment it starts computing what is owed on a shipment it
    // becomes the other product, so the vocabulary that implies arithmetic
    // stays on the forbidden list and this asserts the module key with it.
    expect(MODULE_KEYS).toContain('hs-codes')
    expect(FORBIDDEN_TERMS).toContain('duty calculation')
    expect(FORBIDDEN_TERMS).toContain('assessable value')
  })
})
