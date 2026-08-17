import { findGlossaryEntry, glossaryEntry } from '@/data/glossary'

import { INTENT_REGISTRY } from './intents'
import type { ZenoAnswer, ZenoBlock } from './types'

export type { ZenoAnswer, ZenoBlock, ZenoIntentId } from './types'

/**
 * ZENO — intent routing
 * ══════════════════════════════════════════════════════════════════════════
 * A question is matched against a short list of intents, each of which reads
 * the seeded records and returns a structured answer. There is no model and
 * no network call: if nothing matches, Zeno says so rather than improvising,
 * which is the only honest behaviour for an assistant sitting on top of a
 * freight book.
 *
 * Intent handlers are registered rather than chained through if/else so each
 * one can be tested on its own — see `tests/zeno.test.ts`.
 */

export interface ZenoIntent {
  id: string
  /** Cheap test: does this question look like mine? */
  matches: (q: string) => boolean
  answer: (q: string) => ZenoAnswer | null
}

/* ── Suggested openers, shown before anything is typed ───────────────── */

export const ZENO_SUGGESTIONS: Array<{ label: string; prompt: string; hint: string }> = [
  {
    label: 'Sailing schedules',
    prompt: 'Show me sailings from Shanghai to Mundra next week',
    hint: 'Departures on a lane',
  },
  {
    label: 'Port charges',
    prompt: 'Give me port charges of Nhava Sheva for a 20ft container',
    hint: 'Handling and free time',
  },
  { label: 'Rates', prompt: 'What is the 40HC rate from Shanghai to Nhava Sheva?', hint: 'This week on your lanes' },
  { label: 'Explain concepts', prompt: 'Explain the difference between FOB and DDP', hint: 'Freight terms in plain words' },
]

/* ── Intents ─────────────────────────────────────────────────────────── */

const explainIntent: ZenoIntent = {
  id: 'explain',
  matches: (q) =>
    /\b(explain|what is|what's|whats|difference between|meaning of|define)\b/.test(q) && Boolean(findGlossaryEntry(q)),
  answer: (q) => {
    const entry = findGlossaryEntry(q)
    if (!entry) return null

    const contrast = entry.contrastWith ? glossaryEntry(entry.contrastWith) : undefined
    const asksForDifference = /\bdifference|versus|vs\.?\b/.test(q)

    const blocks: ZenoBlock[] = [
      { kind: 'list', items: [{ label: entry.term, value: entry.short }] },
      { kind: 'note', tone: 'neutral', text: entry.detail },
    ]

    // "What is the difference between X and Y" gets both sides; "what is X"
    // gets one. Answering a narrow question with two definitions is noise.
    if (asksForDifference && contrast) {
      blocks.push(
        { kind: 'list', items: [{ label: contrast.term, value: contrast.short }] },
        { kind: 'note', tone: 'neutral', text: contrast.detail },
      )
    }

    return {
      intent: 'explain',
      headline: asksForDifference && contrast ? `${entry.term} and ${contrast.term}` : entry.term,
      blocks,
      citations: [],
      followUps: contrast
        ? [`Explain ${contrast.term.split(' — ')[0]}`, 'What is free time?', 'Explain detention and demurrage']
        : ['Explain detention and demurrage', 'What is VGM?'],
    }
  },
}

/* ── Routing order ───────────────────────────────────────────────────── */

/**
 * The specific intents, each requiring its own entity before it will claim a
 * question. Ordered in `./intents/index.ts`, which explains why.
 *
 * Fixed and readonly. There is no plugin path: every intent is registered
 * statically in `./intents/index.ts`, and the routing table being a constant
 * is what makes the order above a guarantee rather than a convention.
 */
const SPECIFIC_INTENTS: readonly ZenoIntent[] = [...INTENT_REGISTRY]

/**
 * `explain` is always last.
 *
 * It matches on "what is", which opens half the questions anyone types —
 * including "What is the 40HC rate from Shanghai to Nhava Sheva?". Ahead of
 * the specific intents it would answer a rate question with a definition and
 * a lane question with a glossary card. Behind them it still catches "What is
 * free time?", which is the question it exists for.
 */
function orderedIntents(): ZenoIntent[] {
  return [...SPECIFIC_INTENTS, explainIntent]
}

const FALLBACK: ZenoAnswer = {
  intent: 'fallback',
  headline: 'I could not match that to anything in your account.',
  blocks: [
    {
      kind: 'note',
      tone: 'neutral',
      text: 'Zeno answers from your own records — shipments, rates, contracts, invoices, ports and HS codes — and does not guess. Try naming a lane, a port, a shipment number, or a freight term you want explained.',
    },
  ],
  citations: [],
  followUps: ZENO_SUGGESTIONS.map((s) => s.prompt),
}

export function answerQuestion(question: string): ZenoAnswer {
  const q = question.trim().toLowerCase()
  if (!q) return FALLBACK

  // An intent that matches but cannot find its record returns null, and the
  // question carries on down the list. That is the whole contract: nothing
  // here improvises a number to avoid an empty answer.
  for (const intent of orderedIntents()) {
    if (!intent.matches(q)) continue
    const answer = intent.answer(q)
    if (answer) return answer
  }
  return FALLBACK
}
