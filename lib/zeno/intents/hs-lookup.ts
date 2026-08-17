import {
  HS_DISCLAIMER,
  POLICY_DETAIL,
  POLICY_LABEL,
  findHsCode,
  searchHsCodes,
  type HsCode,
} from '@/data/hs-codes'
import { ROUTES } from '@/lib/routes'
import type { ZenoIntent } from '@/lib/zeno'
import type { ZenoBlock } from '@/lib/zeno/types'

/**
 * ZENO — CLASSIFICATION LOOKUP
 * ══════════════════════════════════════════════════════════════════════════
 * A reference lookup, and deliberately nothing else.
 *
 * It returns the eight-digit line, the official wording, the published rate
 * percentages exactly as `data/hs-codes.ts` stores them, the import policy
 * status, and any separate clearance a consignment needs — the last two kept
 * apart on purpose, because a freely importable item can still need a product
 * certification, and reading those two as one is how a container ends up held
 * at the port.
 *
 * What it must never do: multiply a rate by a value, total anything, or take
 * a shipment figure as an input. The moment an answer works out what a
 * consignment owes, this stops being a freight forwarding product. See
 * `lib/boundaries.ts`, which is enforced by a test rather than by memory.
 */

const CLASSIFICATION_KEYWORDS =
  /(^|[^a-z0-9])(hs code|hs codes|hscode|tariff|tariff line|classification|classify|classified|chapter|heading|subheading|import policy|policy status)([^a-z0-9]|$)/

/** 8481.80.30, 84818030, 8481 80 30 — however it was typed. */
const CODE_PATTERN = /(^|[^0-9])(\d{4}[.\s]?\d{2}[.\s]?\d{2})([^0-9]|$)/

/** Offered as a next question, minus whichever one was just answered. */
const OTHER_LOOKUPS = [
  'What is the HS code for polymer resin?',
  'What is the HS code for industrial valves?',
  'What is the HS code for cotton garments?',
]

export const hsLookupIntent: ZenoIntent = {
  id: 'hs-lookup',
  // A classification word or a code. A bare commodity name is not enough:
  // "my valves are stuck at Nhava Sheva" is an operations question.
  matches: (q) => (CLASSIFICATION_KEYWORDS.test(q) || CODE_PATTERN.test(q)) && Boolean(resolveEntry(q)),

  answer: (q) => {
    const entry = resolveEntry(q)
    if (!entry) return null

    const blocks: ZenoBlock[] = [
      {
        kind: 'list',
        items: [
          { label: 'Code', value: entry.code, hint: 'eight digit' },
          { label: 'Description', value: entry.description },
          { label: 'Heading', value: `${entry.heading} — ${entry.headingTitle}` },
          { label: 'Chapter', value: `${entry.chapter} — ${entry.chapterTitle}` },
        ],
      },
      {
        kind: 'table',
        columns: ['Published rate', 'As published', 'What it applies to'],
        rows: [
          ['Basic customs duty', `${entry.rates.basicDutyPct}%`, 'the customs value of the goods'],
          [
            'Social Welfare Surcharge',
            `${entry.rates.socialWelfareSurchargePctOfBasic}%`,
            'the basic duty — a levy on the levy, not on the goods',
          ],
          ['Integrated GST', `${entry.rates.igstPct}%`, 'generally creditable for a registered importer'],
        ],
      },
      {
        kind: 'note',
        tone: 'neutral',
        text: 'Percentages as published. Zeno reports them; it does not work out what a consignment owes.',
      },
      {
        kind: 'list',
        items: [
          { label: 'Import policy', value: POLICY_LABEL[entry.policy.status] },
          {
            label: 'Required clearances',
            value:
              entry.clearances.length > 0
                ? entry.clearances.map((c) => c.authority).join(' · ')
                : 'None recorded for this line',
          },
        ],
      },
      { kind: 'note', tone: 'neutral', text: POLICY_DETAIL[entry.policy.status] },
    ]

    if (entry.policy.note) blocks.push({ kind: 'note', tone: 'amber', text: entry.policy.note })

    for (const clearance of entry.clearances) {
      blocks.push({ kind: 'note', tone: 'neutral', text: `${clearance.authority}: ${clearance.what}.` })
    }

    if (entry.rates.note) blocks.push({ kind: 'note', tone: 'amber', text: entry.rates.note })
    if (entry.rates.compound) {
      blocks.push({
        kind: 'note',
        tone: 'amber',
        text: 'This line carries a compound rate — a percentage or a fixed amount per piece, whichever is higher. The percentage alone does not describe it.',
      })
    }

    blocks.push({ kind: 'note', tone: 'amber', text: HS_DISCLAIMER })

    return {
      intent: 'hs-lookup',
      headline: `${entry.code} — ${entry.description}.`,
      blocks,
      citations: [{ label: `Code ${entry.code}`, href: ROUTES.hsCode(entry.code) }],
      followUps: [
        // Never offer the lookup that was just answered.
        ...OTHER_LOOKUPS.filter((prompt) => resolveEntry(prompt.toLowerCase())?.code !== entry.code).slice(0, 1),
        'Explain the difference between FOB and DDP',
        'Show me my shipments',
      ],
    }
  },
}

/* ══════════════════════════════════════════════════════════════════════════
   FINDING THE LINE
   ══════════════════════════════════════════════════════════════════════════ */

/** Words that carry no commodity meaning, stripped before a phrase is searched. */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'at', 'be', 'code', 'codes', 'do', 'does', 'for', 'from', 'give', 'hs',
  'hscode', 'i', 'if', 'in', 'is', 'it', 'its', 'me', 'my', 'of', 'on', 'or', 'please', 'policy',
  'show', 'status', 'tariff', 'tell', 'that', 'the', 'their', 'there', 'this', 'to', 'us', 'what',
  'whats', 'when', 'which', 'with', 'would',
])

/**
 * The record behind the question.
 *
 * `searchHsCodes` is built for a search box holding a term, so handing it a
 * whole sentence returns nothing. This feeds it the phrases a sentence
 * actually contains — longest first, so "industrial valves" is tried before
 * "valves" — and takes the first that resolves. If nothing resolves the
 * intent declines rather than returning the first entry in the table, which
 * would be a confident answer about the wrong commodity.
 */
function resolveEntry(q: string): HsCode | null {
  const digits = CODE_PATTERN.exec(q)
  if (digits) {
    const byCode = findHsCode(digits[2])
    if (byCode) return byCode
  }

  const words = q
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w) && !/^\d+$/.test(w))

  // Phrases of three words, then two, then one — a longer phrase is a more
  // specific classification and should win.
  for (let size = Math.min(3, words.length); size >= 1; size--) {
    for (let start = 0; start + size <= words.length; start++) {
      const phrase = words.slice(start, start + size).join(' ')
      const hits = searchHsCodes(phrase, 1)
      if (hits.length > 0) return hits[0]
    }
  }

  return null
}
