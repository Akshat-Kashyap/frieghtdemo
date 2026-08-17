import { describe, expect, it } from 'vitest'

import { findHsCode } from '@/data/hs-codes'
import { rateCell, type RateEquipment } from '@/data/rate-grid'
import { findForbiddenTerms } from '@/lib/boundaries'
import { count } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { ZENO_SUGGESTIONS, answerQuestion } from '@/lib/zeno'
import { INTENT_REGISTRY } from '@/lib/zeno/intents'
import type { ZenoAnswer, ZenoIntentId } from '@/lib/zeno/types'

/**
 * ZENO ANSWERS FROM THE RECORDS, OR IT SAYS IT CANNOT
 * ══════════════════════════════════════════════════════════════════════════
 * `lib/zeno/index.ts` promises this file in its own doc comment. It matters
 * more here than almost anywhere else in the product: Zeno is the one surface
 * that answers in sentences, and the failure mode of an assistant over a
 * freight book is not a crash — it is a confident paragraph containing a
 * number nobody can trace.
 *
 * Four things are held here.
 *
 * The routing order, because it is load-bearing and invisible. `intents/index.ts`
 * explains at length why sailing-schedule sits above rate-lookup and why
 * `explain` is last; nothing enforced any of it, and reordering the array is a
 * one-line change that breaks specific questions in ways no type can catch.
 *
 * The honesty contract, because it is the product claim. Every answer built
 * from figures cites the screen those figures are on, a question with no
 * matching record returns the fallback rather than an improvised reply, and
 * every citation is a route this application actually publishes.
 *
 * The rate figure, cell for cell against the grid the Rate Terminal renders.
 * Two screens quoting the same lane at different numbers is the fastest way
 * to lose a room, and it is exactly what happens the first time someone
 * "helpfully" recomputes a rate inside an intent.
 *
 * And the classification boundary. The HS answer reports published reference
 * fields and performs no arithmetic on them — the moment it works out what a
 * consignment owes, this is a different product. See `lib/boundaries.ts`.
 */

/** Intents that read figures out of the seed and must therefore cite them. */
const FIGURE_INTENTS = ['sailing-schedule', 'rate-lookup', 'port-charges', 'shipment-status', 'finance', 'hs-lookup']

/** Every question below is asked of the same pinned lane, so the grid can be checked directly. */
const SHANGHAI_NHAVA_SHEVA = 'CNSHA-INNSA-FCL'

/* ══════════════════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════════════════ */

/** Stand-in for a route parameter: a control character, so no real path can contain it. */
const PARAM = '\u0001'

/**
 * Is this href something ROUTES publishes?
 *
 * `tests/nav.test.ts` owns the filesystem half of the question — that each
 * ROUTES entry has a page behind it — so this only has to establish that a
 * citation was built from ROUTES rather than typed into an intent file. A
 * hand-typed href is the one that survives a change to the route base and
 * sends a viewer to a 404 from inside an answer.
 */
const ROUTE_PATTERNS: RegExp[] = Object.values(ROUTES).map((value) => {
  const built =
    typeof value === 'function'
      ? (value as (...args: string[]) => string)(...Array<string>(value.length).fill(PARAM))
      : value
  const escaped = built.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped.split(PARAM).join('[^/?&]+')}$`)
})

function isPublishedRoute(href: string): boolean {
  return ROUTE_PATTERNS.some((pattern) => pattern.test(href))
}

/** The value of a labelled row in any of an answer's list blocks. */
function listValue(answer: ZenoAnswer, label: string): string | undefined {
  for (const block of answer.blocks) {
    if (block.kind !== 'list') continue
    const item = block.items.find((entry) => entry.label === label)
    if (item) return item.value
  }
  return undefined
}

/** Every string a reader actually sees in an answer. */
function answerStrings(answer: ZenoAnswer): string[] {
  const strings: string[] = [answer.headline, ...answer.followUps, ...answer.citations.map((c) => c.label)]

  for (const block of answer.blocks) {
    switch (block.kind) {
      case 'note':
        strings.push(block.text)
        break
      case 'list':
        for (const item of block.items) strings.push(item.label, item.value ?? '', item.hint ?? '')
        break
      case 'table':
        strings.push(...block.columns)
        for (const row of block.rows) strings.push(...row.map(String))
        break
    }
  }

  return strings
}

/* ══════════════════════════════════════════════════════════════════════════
   ROUTING
   ══════════════════════════════════════════════════════════════════════════ */

describe('zeno routing', () => {
  it('sends each kind of question to the intent that owns it', () => {
    expect(answerQuestion('What is the 40HC rate from Shanghai to Nhava Sheva?').intent).toBe('rate-lookup')
    expect(answerQuestion('Show me sailings from Shanghai to Mundra next week').intent).toBe('sailing-schedule')
    expect(answerQuestion('Give me port charges of Nhava Sheva for a 20ft container').intent).toBe('port-charges')
    expect(answerQuestion('show me my shipments').intent).toBe('shipment-status')
    expect(answerQuestion('what do I owe').intent).toBe('finance')
    expect(answerQuestion('HS code for cotton t-shirts').intent).toBe('hs-lookup')
    expect(answerQuestion('What is free time?').intent).toBe('explain')
  })

  /**
   * The collision the registry comment is written about. "Cost" is a rate
   * word, so with the two intents swapped this question is answered with a
   * price when what was asked for was departures.
   */
  it('reads a schedule question as a schedule question even when it says "cost"', () => {
    expect(answerQuestion('what do sailings from Shanghai to Mundra cost').intent).toBe('sailing-schedule')
  })

  /**
   * `explain` matches on "what is", which opens half of all questions. Ahead
   * of the specific intents it answers a rate question with a definition.
   */
  it('does not let the glossary swallow a question that names a lane', () => {
    const answer = answerQuestion('What is the 40HC rate from Shanghai to Nhava Sheva?')
    expect(answer.intent).not.toBe('explain')
    expect(answer.headline).toContain('USD')
  })

  it('keeps the registry unambiguous', () => {
    const ids = INTENT_REGISTRY.map((intent) => intent.id)
    expect(ids.length).toBeGreaterThanOrEqual(6)
    expect(new Set(ids).size).toBe(ids.length)
    // `explain` is appended by the router, never registered here — listing it
    // in the specific intents would put it ahead of something.
    expect(ids).not.toContain('explain')
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   THE SUGGESTED OPENERS
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * What each chip advertises.
 *
 * A chip labelled "Rates" that returns a glossary card is a lie told in one
 * click, and it is the most likely thing anyone will click: the openers are
 * the first thing on an empty Zeno screen. Written as a map keyed by label so
 * a new suggestion cannot be added without deciding which intent owns it —
 * the coverage assertion below fails until it is listed.
 */
const ADVERTISED: Record<string, ZenoIntentId> = {
  'Sailing schedules': 'sailing-schedule',
  'Port charges': 'port-charges',
  Rates: 'rate-lookup',
  'Explain concepts': 'explain',
}

describe('suggested openers', () => {
  it('classifies every chip that ships', () => {
    const unclassified = ZENO_SUGGESTIONS.filter((s) => !(s.label in ADVERTISED)).map((s) => s.label)
    expect(unclassified, `Suggestions with no advertised intent: ${unclassified.join(', ')}`).toEqual([])
    expect(ZENO_SUGGESTIONS.length).toBeGreaterThanOrEqual(4)
  })

  it('answers every opener with the intent it advertises', () => {
    for (const suggestion of ZENO_SUGGESTIONS) {
      const answer = answerQuestion(suggestion.prompt)
      // A dead chip is worse than no chip: it demonstrates the failure mode
      // to an audience at the exact moment they are told the feature works.
      expect(answer.intent, `suggestion "${suggestion.label}" fell through to the fallback`).not.toBe('fallback')
      expect(answer.intent, `suggestion "${suggestion.label}" answered as ${answer.intent}`).toBe(
        ADVERTISED[suggestion.label],
      )
      expect(answer.headline.length).toBeGreaterThan(0)
      expect(answer.blocks.length, `suggestion "${suggestion.label}" returned prose alone`).toBeGreaterThan(0)
    }
  })

  /**
   * The demo clock is pinned and nothing in this path may call `Math.random`
   * or `Date.now`, so the same question asked twice must produce the same
   * answer — including on a reload mid-presentation.
   */
  it('answers identically every time it is asked', () => {
    for (const suggestion of ZENO_SUGGESTIONS) {
      const first = answerQuestion(suggestion.prompt)
      const second = answerQuestion(suggestion.prompt)
      expect(second).toEqual(first)
    }
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   HONESTY
   ══════════════════════════════════════════════════════════════════════════ */

describe('zeno honesty', () => {
  it('refuses a lane it has no record for instead of inventing one', () => {
    const answer = answerQuestion('what is the rate to the moon')
    expect(answer.intent).toBe('fallback')
    expect(answer.citations).toEqual([])
    // No figure of any kind in a fallback: an improvised number is the one
    // failure this surface must not have.
    expect(answer.headline).not.toMatch(/\d/)
  })

  it('falls back on an empty or unreadable question', () => {
    expect(answerQuestion('').intent).toBe('fallback')
    expect(answerQuestion('   ').intent).toBe('fallback')
    expect(answerQuestion('asdfghjkl').intent).toBe('fallback')
    expect(answerQuestion('who won the cricket last night').intent).toBe('fallback')
  })

  it('cites a real screen for every answer built from figures', () => {
    const questions = [
      'What is the 40HC rate from Shanghai to Nhava Sheva?',
      'Show me sailings from Shanghai to Mundra next week',
      'Give me port charges of Nhava Sheva for a 20ft container',
      'show me my shipments',
      'what is the status of PW-2026-004281',
      'what do I owe',
      'HS code for cotton t-shirts',
    ]

    for (const question of questions) {
      const answer = answerQuestion(question)
      expect(FIGURE_INTENTS, `${question} routed to ${answer.intent}`).toContain(answer.intent)
      expect(answer.citations.length, `${question} cited nothing`).toBeGreaterThan(0)

      for (const citation of answer.citations) {
        // Built from ROUTES, so it lands inside the application rather than
        // on a path assembled by hand in an intent file.
        expect(isPublishedRoute(citation.href), `${question} cited ${citation.href}, which ROUTES does not publish`).toBe(
          true,
        )
        expect(citation.label.length).toBeGreaterThan(0)
      }
    }
  })

  it('never renders an unresolved figure', () => {
    // Every intent composes its sentences from records that may be missing.
    // "USD undefined" or "NaN days" on the one surface that answers in prose
    // is the most quotable bug this product could ship.
    for (const suggestion of ZENO_SUGGESTIONS) {
      for (const text of answerStrings(answerQuestion(suggestion.prompt))) {
        expect(text, `"${suggestion.prompt}" rendered: ${text}`).not.toMatch(/undefined|NaN|\[object/)
      }
    }
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   THE RATE CANNOT DRIFT FROM THE GRID
   ══════════════════════════════════════════════════════════════════════════ */

describe('rate lookup reads the grid', () => {
  const CASES: Array<{ equipment: RateEquipment; question: string }> = [
    { equipment: '40HC', question: 'What is the 40HC rate from Shanghai to Nhava Sheva?' },
    { equipment: '20FT', question: 'What is the 20ft rate from Shanghai to Nhava Sheva?' },
  ]

  it.each(CASES)('quotes the published $equipment cell, to the dollar', ({ equipment, question }) => {
    const cell = rateCell(SHANGHAI_NHAVA_SHEVA, equipment)
    expect(cell, `the grid publishes no ${equipment} cell for ${SHANGHAI_NHAVA_SHEVA}`).toBeDefined()

    const answer = answerQuestion(question)
    expect(answer.intent).toBe('rate-lookup')
    expect(answer.headline).toContain('Nhava Sheva')

    // The figure the intent shows and the figure the Rate Terminal renders
    // are the same cell, formatted by the same helper. If an intent ever
    // recomputes or rounds one of them, these two screens start disagreeing
    // about the price of the same box in the same week.
    expect(listValue(answer, 'Spot this week')).toBe(`USD ${count(cell!.amountUsd)}`)
    expect(answer.headline).toContain(`USD ${count(cell!.amountUsd)}`)
  })

  it('states the basis beside the figure and points at the terminal', () => {
    const answer = answerQuestion('What is the 40HC rate from Shanghai to Nhava Sheva?')

    // An all-in port-to-port number looks expensive beside a base ocean-freight
    // number. A rate quoted without its basis is not a smaller answer — it is
    // an answer someone will compare against the wrong thing.
    expect(answer.blocks.some((b) => b.kind === 'note' && b.text.includes('All-in, port to port'))).toBe(true)
    expect(answer.citations.some((c) => c.href === ROUTES.rateTerminal)).toBe(true)
  })

  it('declines a lane the grid does not publish rather than interpolating one', () => {
    // There is no rate for this pairing. The honest answer is the fallback,
    // not a figure borrowed from a neighbouring lane.
    expect(answerQuestion('what is the 40HC rate from Chennai to Rotterdam').intent).not.toBe('rate-lookup')
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   CLASSIFICATION IS A REFERENCE LOOKUP
   ══════════════════════════════════════════════════════════════════════════ */

describe('hs lookup reports, it does not calculate', () => {
  const answer = answerQuestion('what is the hs code for cotton t-shirts?')

  it('answers with a published eight-digit line', () => {
    expect(answer.intent).toBe('hs-lookup')
    expect(answer.headline).toMatch(/^\d{4}\.\d{2}\.\d{2} — /)
  })

  it('passes the published percentages through untouched', () => {
    const code = answer.headline.split(' — ')[0]!
    const entry = findHsCode(code)
    expect(entry, `the answer quoted ${code}, which is not in the reference set`).toBeDefined()

    const table = answer.blocks.find((block) => block.kind === 'table')
    expect(table, 'the classification answer showed no rate table').toBeDefined()
    if (table?.kind !== 'table') throw new Error('unreachable')

    // Each published rate is shown exactly as `data/hs-codes.ts` stores it.
    // This is the assertion that fails the moment somebody multiplies one of
    // them by anything — the rate column stops being a passthrough.
    const shown = table.rows.map((row) => String(row[1]))
    expect(shown).toEqual([
      `${entry!.rates.basicDutyPct}%`,
      `${entry!.rates.socialWelfareSurchargePctOfBasic}%`,
      `${entry!.rates.igstPct}%`,
    ])

    // And no number appears in that table that is not one of those three.
    const numbers = new Set(
      table.rows.flatMap((row) => row.flatMap((cell) => String(cell).match(/\d+(?:\.\d+)?/g) ?? [])),
    )
    expect([...numbers].sort()).toEqual(
      [
        String(entry!.rates.basicDutyPct),
        String(entry!.rates.socialWelfareSurchargePctOfBasic),
        String(entry!.rates.igstPct),
      ]
        .filter((value, index, all) => all.indexOf(value) === index)
        .sort(),
    )
  })

  it('quotes no money at all, because it has no consignment to quote it on', () => {
    // A percentage is reference information. A currency figure is a working —
    // it can only exist if the answer took a value as an input, which is the
    // line this product does not cross.
    for (const text of answerStrings(answer)) {
      expect(text, `classification answer rendered a money figure: ${text}`).not.toMatch(/(?:USD|INR|₹|\$)\s?[\d]/i)
    }
  })

  it('stays inside the product boundary in the words it uses', () => {
    // The static guard in `tests/boundaries.test.ts` walks source files. This
    // walks the sentence a customer is actually shown, which is assembled at
    // runtime from three different modules.
    const hits = findForbiddenTerms(answerStrings(answer).join(' '))
    expect(hits, `Classification answer used: ${hits.join(', ')}`).toEqual([])
  })

  it('separates import policy from the clearances a consignment needs', () => {
    // A freely importable line can still require a product certification.
    // Folding the two together is how a container gets held at the port, so
    // the answer keeps them as two labelled fields.
    expect(listValue(answer, 'Import policy')).toBeDefined()
    expect(listValue(answer, 'Required clearances')).toBeDefined()
  })

  it('cites the reference screen for the line it quoted', () => {
    const code = answer.headline.split(' — ')[0]!
    expect(answer.citations.map((c) => c.href)).toContain(ROUTES.hsCode(code))
  })
})
