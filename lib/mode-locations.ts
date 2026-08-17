import { LANES } from '@/data/lanes'
import { PORTS, requirePort } from '@/data/ports'
import type { Lane, Port, TransportMode } from '@/types'

/**
 * MODE ↔ LOCATION RESOLUTION
 * ══════════════════════════════════════════════════════════════════════════
 * The mode is the first choice on the page and it decides WHERE a shipment
 * can start and end, not merely how it is priced. Air moves airport to
 * airport, ocean port to port, domestic road city to city — and those are
 * three different sets of places, quoted with three different codes.
 *
 * Offering Nhava Sheva in an air search, or Shanghai in a domestic road
 * search, is the detail that tells a freight person the tool was built by
 * someone who has never booked anything. So the servable set is data, and the
 * same table also supplies the name and code the trade actually quotes for
 * that node under that mode: Shanghai is CNSHA to a shipping line and PVG to
 * an airline, and the Netherlands is Rotterdam by sea but Schiphol by air.
 *
 * The node ids stay the ones in `data/ports.ts` — a location is one place with
 * several gateways, not several records — so a mode switch never invalidates
 * a lane, a rate, or anything a downstream screen has already stored.
 */

export type ModeGroup = 'OCEAN' | 'AIR' | 'DOMESTIC'

const GROUP_OF: Record<TransportMode, ModeGroup> = {
  OCEAN_FCL: 'OCEAN',
  OCEAN_LCL: 'OCEAN',
  AIR: 'AIR',
  DOMESTIC_FTL: 'DOMESTIC',
  DOMESTIC_LTL: 'DOMESTIC',
}

export function modeGroup(mode: TransportMode): ModeGroup {
  return GROUP_OF[mode]
}

/** How a node is identified and described under one mode. */
export interface Gateway {
  /** What this place is called on a booking in this mode. */
  name: string
  /** The code quoted: UN/LOCODE by sea and road, IATA by air. */
  code: string
  /** The facility, so two gateways in one city are told apart. */
  detail: string
  /** 'Seaport' · 'Airport' · 'ICD' · 'City' — the badge in the list. */
  kindLabel: string
}

/* ══════════════════════════════════════════════════════════════════════════
   THE GATEWAY TABLE
   ══════════════════════════════════════════════════════════════════════════
   Absence is meaningful. Ningbo has an airport and Pune has one too, but no
   forwarder consolidates air freight out of either — that cargo trucks to
   Shanghai Pudong and to Mumbai. Listing every airport that exists would be
   more data and less truth, and it is exactly the sort of completeness that
   makes a demo unfalsifiable rather than convincing.
   ══════════════════════════════════════════════════════════════════════════ */

const GATEWAYS: Record<ModeGroup, Record<string, Gateway>> = {
  OCEAN: {
    CNSHA: { name: 'Shanghai', code: 'CNSHA', detail: 'Yangshan · Waigaoqiao', kindLabel: 'Seaport' },
    CNNGB: { name: 'Ningbo', code: 'CNNGB', detail: 'Ningbo-Zhoushan', kindLabel: 'Seaport' },
    SGSIN: { name: 'Singapore', code: 'SGSIN', detail: 'Transhipment hub', kindLabel: 'Seaport' },
    AEJEA: { name: 'Jebel Ali', code: 'AEJEA', detail: 'Dubai', kindLabel: 'Seaport' },
    INNSA: { name: 'Nhava Sheva', code: 'INNSA', detail: 'JNPT · Navi Mumbai', kindLabel: 'Seaport' },
    INMUN: { name: 'Mundra', code: 'INMUN', detail: 'Gujarat', kindLabel: 'Seaport' },
    INMAA: { name: 'Chennai', code: 'INMAA', detail: 'Chennai Port', kindLabel: 'Seaport' },
    INDEL: { name: 'ICD Tughlakabad', code: 'INTKD', detail: 'Delhi inland container depot', kindLabel: 'ICD' },
    NLRTM: { name: 'Rotterdam', code: 'NLRTM', detail: 'Maasvlakte', kindLabel: 'Seaport' },
  },
  AIR: {
    CNSHA: { name: 'Shanghai Pudong', code: 'PVG', detail: 'Shanghai', kindLabel: 'Airport' },
    SGSIN: { name: 'Singapore Changi', code: 'SIN', detail: 'Singapore', kindLabel: 'Airport' },
    AEJEA: { name: 'Dubai International', code: 'DXB', detail: 'United Arab Emirates', kindLabel: 'Airport' },
    INBOM: { name: 'Mumbai', code: 'BOM', detail: 'Chhatrapati Shivaji Maharaj', kindLabel: 'Airport' },
    INDEL: { name: 'Delhi', code: 'DEL', detail: 'Indira Gandhi', kindLabel: 'Airport' },
    INMAA: { name: 'Chennai', code: 'MAA', detail: 'Chennai', kindLabel: 'Airport' },
    NLRTM: { name: 'Amsterdam Schiphol', code: 'AMS', detail: 'Netherlands air gateway', kindLabel: 'Airport' },
  },
  DOMESTIC: {
    INNSA: { name: 'Nhava Sheva', code: 'INNSA', detail: 'JNPT gate · Navi Mumbai', kindLabel: 'City' },
    INBOM: { name: 'Mumbai', code: 'INBOM', detail: 'Maharashtra', kindLabel: 'City' },
    INPNQ: { name: 'Pune', code: 'INPNQ', detail: 'Chakan · Maharashtra', kindLabel: 'City' },
    INDEL: { name: 'Delhi NCR', code: 'INDEL', detail: 'Delhi · Haryana · Uttar Pradesh', kindLabel: 'City' },
    INMUN: { name: 'Mundra', code: 'INMUN', detail: 'Gujarat', kindLabel: 'City' },
    INMAA: { name: 'Chennai', code: 'INMAA', detail: 'Tamil Nadu', kindLabel: 'City' },
  },
}

/**
 * Where a place sends its cargo when it cannot serve the mode itself.
 *
 * These are the real feeder relationships on this network, not a nearest-
 * neighbour calculation: Pune's air freight goes to Mumbai and its boxes go to
 * Nhava Sheva, and no distance formula knows that.
 */
const FEEDS_INTO: Record<ModeGroup, Record<string, string>> = {
  OCEAN: { INBOM: 'INNSA', INPNQ: 'INNSA' },
  AIR: { CNNGB: 'CNSHA', INNSA: 'INBOM', INPNQ: 'INBOM', INMUN: 'INBOM' },
  DOMESTIC: { CNSHA: 'INNSA', CNNGB: 'INNSA', SGSIN: 'INNSA', AEJEA: 'INNSA', NLRTM: 'INDEL' },
}

/** Where a mode lands when the previous route has nothing to feed it. */
const MODE_DEFAULT: Record<ModeGroup, { originId: string; destinationId: string }> = {
  OCEAN: { originId: 'CNSHA', destinationId: 'INNSA' },
  AIR: { originId: 'CNSHA', destinationId: 'INBOM' },
  DOMESTIC: { originId: 'INNSA', destinationId: 'INPNQ' },
}

/* ══════════════════════════════════════════════════════════════════════════
   QUERIES
   ══════════════════════════════════════════════════════════════════════════ */

export function gatewayFor(portId: string | undefined, mode: TransportMode): Gateway | undefined {
  if (!portId) return undefined
  return GATEWAYS[modeGroup(mode)][portId]
}

export function servesMode(portId: string | undefined, mode: TransportMode): boolean {
  return Boolean(gatewayFor(portId, mode))
}

/** Every node this mode can actually be booked from, most-used first. */
export function locationsFor(mode: TransportMode): Port[] {
  const table = GATEWAYS[modeGroup(mode)]
  return PORTS.filter((p) => table[p.id]).sort((a, b) => b.popularity - a.popularity)
}

/**
 * Search inside the mode's own set.
 *
 * Deliberately not `searchPorts(...).filter(...)`: that truncates to a limit
 * first and filters after, so an air search for "del" could return eight
 * seaports and then show nothing. It also has to match on the mode's own
 * vocabulary — typing "BOM" or "PVG" is how an air desk searches, and neither
 * string appears anywhere in the port record.
 */
export function searchLocations(query: string, mode: TransportMode, limit = 8): Port[] {
  const pool = locationsFor(mode)
  const q = query.trim().toLowerCase()
  if (!q) return pool.slice(0, limit)

  const scored: Array<{ port: Port; score: number }> = []
  for (const port of pool) {
    const gateway = gatewayFor(port.id, mode)!
    const haystack = [port.name, port.city, port.country, port.code, gateway.name, gateway.code, gateway.detail]
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(q)) continue

    const starts = (value: string, weight: number) => (value.toLowerCase().startsWith(q) ? weight : 0)
    scored.push({
      port,
      score:
        starts(gateway.code, 1200) +
        starts(gateway.name, 1000) +
        starts(port.name, 900) +
        starts(port.code, 800) +
        starts(port.city, 400) +
        port.popularity,
    })
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.port)
}

/** The lanes this desk runs in this mode, most-used first. */
export function popularLanesFor(mode: TransportMode, limit = 4): Lane[] {
  const group = modeGroup(mode)
  return LANES.filter((l) => modeGroup(l.mode) === group)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit)
}

/* ══════════════════════════════════════════════════════════════════════════
   RESOLUTION — what a mode switch does to the route
   ══════════════════════════════════════════════════════════════════════════ */

function resolveEndpoint(portId: string | undefined, mode: TransportMode, fallback: string): string {
  if (servesMode(portId, mode)) return portId!
  const fed = portId ? FEEDS_INTO[modeGroup(mode)][portId] : undefined
  if (fed && servesMode(fed, mode)) return fed
  return fallback
}

/**
 * Re-resolve a route for a new mode.
 *
 * Switching to air with Shanghai → Nhava Sheva on screen must not leave a
 * seaport in the destination cell; it becomes Shanghai Pudong → Mumbai, which
 * is the lane that cargo genuinely flies. The endpoints are also forced apart
 * afterwards, because feeding both ends into the same gateway (Shanghai and
 * Nhava Sheva both feed Nhava Sheva for a domestic move) would otherwise
 * produce a shipment from a place to itself.
 */
export function resolveRouteForMode(
  originId: string | undefined,
  destinationId: string | undefined,
  mode: TransportMode,
): { originId: string; destinationId: string } {
  const fallback = MODE_DEFAULT[modeGroup(mode)]
  const resolvedOrigin = resolveEndpoint(originId, mode, fallback.originId)
  let resolvedDestination = resolveEndpoint(destinationId, mode, fallback.destinationId)

  if (resolvedDestination === resolvedOrigin) {
    const alternative =
      (resolvedOrigin !== fallback.destinationId ? fallback.destinationId : undefined) ??
      locationsFor(mode).find((p) => p.id !== resolvedOrigin)?.id
    if (alternative) resolvedDestination = alternative
  }

  return { originId: resolvedOrigin, destinationId: resolvedDestination }
}

/* ══════════════════════════════════════════════════════════════════════════
   COPY — the labels the cells wear, per mode
   ══════════════════════════════════════════════════════════════════════════ */

export const ROUTE_COPY: Record<
  ModeGroup,
  {
    fromLabel: string
    toLabel: string
    fromPlaceholder: string
    toPlaceholder: string
    /** Shown when a search matches nothing in this mode's set. */
    emptyHint: string
    /** One line under the route row explaining the mode's geography. */
    geography: string
  }
> = {
  OCEAN: {
    fromLabel: 'From port',
    toLabel: 'Deliver to port',
    fromPlaceholder: 'Origin seaport',
    toPlaceholder: 'Destination seaport',
    emptyHint: 'Try a UN/LOCODE such as INNSA, or a port name.',
    geography: 'Ocean freight is quoted port to port. Inland legs are priced separately.',
  },
  AIR: {
    fromLabel: 'From airport',
    toLabel: 'Deliver to airport',
    fromPlaceholder: 'Origin airport',
    toPlaceholder: 'Destination airport',
    emptyHint: 'Try an IATA code such as BOM, or a city name.',
    geography: 'Air freight is quoted airport to airport. Only gateways we consolidate through are listed.',
  },
  DOMESTIC: {
    fromLabel: 'Pickup city',
    toLabel: 'Delivery city',
    fromPlaceholder: 'Pickup city',
    toPlaceholder: 'Delivery city',
    emptyHint: 'Domestic road runs between Indian cities — try Pune or Delhi.',
    geography: 'Domestic road is quoted city to city, within India.',
  },
}

/** "Shanghai Pudong (PVG)" — the one-line identity used in summaries. */
export function gatewayLabel(portId: string | undefined, mode: TransportMode): string {
  const gateway = gatewayFor(portId, mode)
  if (gateway) return `${gateway.name} (${gateway.code})`
  return portId ? requirePort(portId).name : '—'
}
