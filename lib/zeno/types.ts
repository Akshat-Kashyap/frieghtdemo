/**
 * ZENO — the answer contract
 * ══════════════════════════════════════════════════════════════════════════
 * Zeno never returns prose alone. Every answer is a headline sentence plus
 * optional structured blocks and a citation to the record it read, because
 * the one thing an assistant over a freight book must never do is sound
 * confident about a number nobody can trace.
 *
 * There is no model behind this. Questions are matched to intents and
 * answered out of the seeded records, so it cannot invent a rate.
 */

export type ZenoIntentId =
  | 'sailing-schedule'
  | 'rate-lookup'
  | 'port-charges'
  | 'shipment-status'
  | 'finance'
  | 'hs-lookup'
  | 'explain'
  | 'fallback'

export interface ZenoTableBlock {
  kind: 'table'
  columns: string[]
  rows: Array<Array<string | number>>
  /** Right-aligns numeric columns. */
  numericColumns?: number[]
}

export interface ZenoListBlock {
  kind: 'list'
  items: Array<{ label: string; value?: string; hint?: string }>
}

export interface ZenoNoteBlock {
  kind: 'note'
  tone: 'neutral' | 'amber'
  text: string
}

export type ZenoBlock = ZenoTableBlock | ZenoListBlock | ZenoNoteBlock

export interface ZenoCitation {
  label: string
  href: string
}

export interface ZenoAnswer {
  intent: ZenoIntentId
  /** One sentence. The rest is structure. */
  headline: string
  blocks: ZenoBlock[]
  /** Where the numbers came from — always a real route in this app. */
  citations: ZenoCitation[]
  /** Offered as chips under the answer. */
  followUps: string[]
}
