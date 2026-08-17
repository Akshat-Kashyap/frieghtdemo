import { PORTS, getPort } from '@/data/ports'
import type { RateEquipment } from '@/data/rate-grid'
import type { Port } from '@/types'

/**
 * ZENO — ENTITY RESOLUTION
 * ══════════════════════════════════════════════════════════════════════════
 * Turning a typed sentence into the records an intent can read: which ports,
 * which equipment, which shipment.
 *
 * This is shared rather than repeated per intent for one reason. Each intent
 * declines a question by failing to resolve its own entity — "port charges of
 * Nhava Sheva" must not reach the rate lookup, and "the 40HC rate from
 * Shanghai to Nhava Sheva" must not reach the port profile. If two intents
 * resolved locations by slightly different rules, the routing between them
 * would depend on which rule was looser, and questions would land in the
 * wrong place for reasons nobody could see.
 *
 * Note that `answerQuestion` lower-cases and trims the question before an
 * intent sees it, so everything here matches against lower case.
 */

/* ══════════════════════════════════════════════════════════════════════════
   PORTS
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Names that are not in `data/ports.ts` but that customers actually type.
 *
 * `searchPorts()` cannot be used here: it asks whether a port contains the
 * query, which is right for a search box holding one term and useless against
 * a whole sentence. This works the other way round — which known names appear
 * in the sentence.
 */
const PORT_ALIASES: Array<[term: string, portId: string]> = [
  ['nhava', 'INNSA'],
  ['jnpt', 'INNSA'],
  ['navi mumbai', 'INNSA'],
  ['jawaharlal nehru', 'INNSA'],
  ['jebel ali', 'AEJEA'],
  ['yangshan', 'CNSHA'],
  ['waigaoqiao', 'CNSHA'],
  ['beilun', 'CNNGB'],
  ['maasvlakte', 'NLRTM'],
  ['madras', 'INMAA'],
  ['bombay', 'INBOM'],
  ['tughlakabad', 'INDEL'],
]

interface PortTerm {
  portId: string
  term: string
  /** A name or a UN/LOCODE outranks a city, which several ports share. */
  weight: number
}

const PORT_TERMS: PortTerm[] = (() => {
  const terms: PortTerm[] = []
  for (const port of PORTS) {
    terms.push({ portId: port.id, term: port.name.toLowerCase(), weight: 3 })
    terms.push({ portId: port.id, term: port.code.toLowerCase(), weight: 3 })
    if (port.city.toLowerCase() !== port.name.toLowerCase()) {
      terms.push({ portId: port.id, term: port.city.toLowerCase(), weight: 1 })
    }
  }
  for (const [term, portId] of PORT_ALIASES) terms.push({ portId, term, weight: 3 })
  // Longest first, so "nhava sheva" is tested before "nhava".
  return terms.sort((a, b) => b.term.length - a.term.length)
})()

const isWordChar = (c: string) => /[a-z0-9]/.test(c)

/**
 * Index of `term` in `haystack` as a whole word.
 *
 * The boundary check is manual rather than a `\b` regex because port names
 * contain spaces and hyphens, and because this mirrors the guard in
 * `lib/boundaries.ts` — "pune" must not match inside "puneet".
 */
function indexOfWord(haystack: string, term: string): number {
  let from = 0
  for (;;) {
    const at = haystack.indexOf(term, from)
    if (at === -1) return -1
    const before = haystack[at - 1] ?? ' '
    const after = haystack[at + term.length] ?? ' '
    if (!isWordChar(before) && !isWordChar(after)) return at
    from = at + 1
  }
}

export interface PortMention {
  port: Port
  at: number
  end: number
  weight: number
}

/**
 * Every port named in the question, in the order they were typed.
 *
 * `filter` lets an intent narrow to the ports it can actually answer for —
 * the port-charges intent only recognises a port that has a written profile,
 * so "port charges for Pune" declines and falls through instead of opening a
 * page with nothing on it.
 */
export function portMentions(q: string, filter?: (port: Port) => boolean): PortMention[] {
  const best = new Map<string, PortMention>()

  for (const candidate of PORT_TERMS) {
    const port = getPort(candidate.portId)
    if (!port || (filter && !filter(port))) continue

    const at = indexOfWord(q, candidate.term)
    if (at === -1) continue

    const existing = best.get(port.id)
    if (existing && (existing.weight > candidate.weight || (existing.weight === candidate.weight && existing.at <= at))) {
      continue
    }
    best.set(port.id, { port, at, end: at + candidate.term.length, weight: candidate.weight })
  }

  const mentions = [...best.values()].sort((a, b) => a.at - b.at || b.weight - a.weight)

  /**
   * One word, two ports: "Mumbai" is the name of the inland location and the
   * city of Nhava Sheva. Where two mentions cover the same span, the stronger
   * match wins and the weaker is dropped — otherwise a single word would read
   * as a lane.
   */
  return mentions.filter((mention, i) =>
    mentions.every((other, j) => {
      if (i === j) return true
      const overlaps = mention.at < other.end && other.at < mention.end
      if (!overlaps) return true
      return other.weight < mention.weight || (other.weight === mention.weight && j > i)
    }),
  )
}

const ORIGIN_MARKERS = new Set(['from', 'ex', 'leaving', 'departing', 'out'])
const DESTINATION_MARKERS = new Set(['to', 'into', 'toward', 'towards', 'arriving', 'inbound'])

/** The last direction word before a mention, which is the one that governs it. */
function directionMarker(text: string): 'origin' | 'destination' | undefined {
  const words = text.split(/[^a-z0-9]+/).filter(Boolean)
  for (let i = words.length - 1; i >= 0; i--) {
    if (ORIGIN_MARKERS.has(words[i])) return 'origin'
    if (DESTINATION_MARKERS.has(words[i])) return 'destination'
  }
  return undefined
}

export interface ResolvedLane {
  origin: Port
  destination: Port
}

/**
 * Two ports in the right order.
 *
 * Order of appearance is the default and is right for "Shanghai to Mundra".
 * It is wrong for "rate to Nhava Sheva from Shanghai", which is why the
 * prepositions are read: a lane resolved backwards would return a real rate
 * for a lane the customer did not ask about, which is worse than declining.
 */
export function resolveLane(q: string, filter?: (port: Port) => boolean): ResolvedLane | null {
  const mentions = portMentions(q, filter)
  if (mentions.length < 2) return null

  const [first, second] = mentions
  const firstRole = directionMarker(q.slice(0, first.at))
  const secondRole = directionMarker(q.slice(first.end, second.at))

  if (firstRole === 'destination' && secondRole === 'origin') {
    return { origin: second.port, destination: first.port }
  }
  return { origin: first.port, destination: second.port }
}

/** Exactly one port named — the shape a port question takes. */
export function resolveSinglePort(q: string, filter?: (port: Port) => boolean): Port | null {
  const mentions = portMentions(q, filter)
  return mentions.length === 1 ? mentions[0].port : null
}

/* ══════════════════════════════════════════════════════════════════════════
   EQUIPMENT
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The rate grid publishes two columns, 20ft and 40HC. Everything a customer
 * types for a forty — 40HC, 40', 40ft, high cube — reads the 40HC column,
 * and the answer states which column it read so the mapping is visible
 * rather than assumed.
 */
const FORTY = /(^|[^a-z0-9])(40\s?['’]?\s?(hc|hq|ft|foot|feet|gp|dv|high cube)|40['’]|forty[- ]?(foot|feet)|high cube)([^a-z0-9]|$)/
const TWENTY = /(^|[^a-z0-9])(20\s?['’]?\s?(ft|foot|feet|gp|dv)|20['’]|twenty[- ]?(foot|feet))([^a-z0-9]|$)/

export interface ResolvedEquipment {
  equipment: RateEquipment
  /** False when the question never said, and 40HC was assumed. */
  stated: boolean
}

export function resolveEquipment(q: string): ResolvedEquipment {
  if (FORTY.test(q)) return { equipment: '40HC', stated: true }
  if (TWENTY.test(q)) return { equipment: '20FT', stated: true }
  // 40HC is the default because it is what this account ships: every lane on
  // the active contract is priced per 40HC.
  return { equipment: '40HC', stated: false }
}

export const EQUIPMENT_LABEL: Record<RateEquipment, string> = {
  '20FT': '20ft',
  '40HC': '40HC',
}

/* ══════════════════════════════════════════════════════════════════════════
   SHIPMENTS
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * A job reference, however it was typed: PW-2026-004281, pw 2026 004281,
 * PW2026004281. Returned in the canonical form so the caller can look it up
 * directly rather than normalising again.
 */
const JOB_REFERENCE = /(^|[^a-z0-9])pw[-\s]?(\d{4})[-\s]?(\d{6})([^0-9]|$)/

export function resolveJobReference(q: string): string | null {
  const match = JOB_REFERENCE.exec(q)
  return match ? `PW-${match[2]}-${match[3]}` : null
}
