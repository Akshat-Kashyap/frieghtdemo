import type { TransportMode } from '@/types'

/**
 * THE FREIGHT NETWORK
 * ──────────────────────────────────────────────────────────────────────────
 * What the globe draws: the lanes PortWhizz coordinates, the ports on them,
 * and the live activity sitting at each node.
 *
 * Deliberately a separate table from `data/lanes.ts` — lanes are commercial
 * (rates, transit bands), this is topological (what to render, how busy, what
 * is going wrong). Merging them would couple the pricing engine to the visual.
 */

export type NetworkLayer = 'ocean' | 'air' | 'domestic'

export interface NetworkLink {
  id: string
  originId: string
  destinationId: string
  mode: TransportMode
  layer: NetworkLayer
  /** 0–1: drives arc opacity and particle density. */
  intensity: number
  /** Live shipments currently on this lane. */
  activeShipments: number
  /** Set when a job on this lane has an open high/critical exception. */
  hasException: boolean
  /** Links a lane to the hero shipment so it can be highlighted and flown. */
  jobId?: string
}

export const NETWORK_LINKS: NetworkLink[] = [
  /* ── Ocean: Far East → India ───────────────────────────────────────── */
  {
    id: 'NL-SHA-NSA',
    originId: 'CNSHA',
    destinationId: 'INNSA',
    mode: 'OCEAN_FCL',
    layer: 'ocean',
    intensity: 1,
    activeShipments: 9,
    hasException: true,
    jobId: 'PW-2026-004281',
  },
  {
    id: 'NL-NGB-NSA',
    originId: 'CNNGB',
    destinationId: 'INNSA',
    mode: 'OCEAN_FCL',
    layer: 'ocean',
    intensity: 0.82,
    activeShipments: 6,
    hasException: true,
  },
  {
    id: 'NL-SHA-MUN',
    originId: 'CNSHA',
    destinationId: 'INMUN',
    mode: 'OCEAN_FCL',
    layer: 'ocean',
    intensity: 0.7,
    activeShipments: 5,
    hasException: false,
  },
  {
    id: 'NL-SHA-MAA',
    originId: 'CNSHA',
    destinationId: 'INMAA',
    mode: 'OCEAN_FCL',
    layer: 'ocean',
    intensity: 0.62,
    activeShipments: 4,
    hasException: false,
  },

  /* ── Ocean: transhipment & Gulf ────────────────────────────────────── */
  {
    id: 'NL-SIN-NSA',
    originId: 'SGSIN',
    destinationId: 'INNSA',
    mode: 'OCEAN_FCL',
    layer: 'ocean',
    intensity: 0.68,
    activeShipments: 5,
    hasException: false,
  },
  {
    id: 'NL-SIN-MAA',
    originId: 'SGSIN',
    destinationId: 'INMAA',
    mode: 'OCEAN_FCL',
    layer: 'ocean',
    intensity: 0.55,
    activeShipments: 3,
    hasException: false,
  },
  {
    id: 'NL-JEA-NSA',
    originId: 'AEJEA',
    destinationId: 'INNSA',
    mode: 'OCEAN_FCL',
    layer: 'ocean',
    intensity: 0.64,
    activeShipments: 4,
    hasException: false,
  },
  {
    id: 'NL-JEA-MUN',
    originId: 'AEJEA',
    destinationId: 'INMUN',
    mode: 'OCEAN_FCL',
    layer: 'ocean',
    intensity: 0.5,
    activeShipments: 3,
    hasException: false,
  },
  {
    id: 'NL-SHA-SIN',
    originId: 'CNSHA',
    destinationId: 'SGSIN',
    mode: 'OCEAN_FCL',
    layer: 'ocean',
    intensity: 0.58,
    activeShipments: 3,
    hasException: false,
  },

  /* ── Ocean: India → Europe ─────────────────────────────────────────── */
  {
    id: 'NL-NSA-RTM',
    originId: 'INNSA',
    destinationId: 'NLRTM',
    mode: 'OCEAN_FCL',
    layer: 'ocean',
    intensity: 0.76,
    activeShipments: 6,
    hasException: true,
  },
  {
    id: 'NL-MUN-RTM',
    originId: 'INMUN',
    destinationId: 'NLRTM',
    mode: 'OCEAN_FCL',
    layer: 'ocean',
    intensity: 0.6,
    activeShipments: 4,
    hasException: true,
  },

  /* ── Air ───────────────────────────────────────────────────────────── */
  {
    id: 'NL-BOM-RTM-AIR',
    originId: 'INBOM',
    destinationId: 'NLRTM',
    mode: 'AIR',
    layer: 'air',
    intensity: 0.54,
    activeShipments: 2,
    hasException: false,
  },
  {
    id: 'NL-SHA-BOM-AIR',
    originId: 'CNSHA',
    destinationId: 'INBOM',
    mode: 'AIR',
    layer: 'air',
    intensity: 0.48,
    activeShipments: 2,
    hasException: false,
  },
  {
    id: 'NL-JEA-DEL-AIR',
    originId: 'AEJEA',
    destinationId: 'INDEL',
    mode: 'AIR',
    layer: 'air',
    intensity: 0.42,
    activeShipments: 1,
    hasException: false,
  },

  /* ── Domestic road — the last mile off Nhava Sheva ─────────────────── */
  {
    id: 'NL-NSA-PNQ',
    originId: 'INNSA',
    destinationId: 'INPNQ',
    mode: 'DOMESTIC_FTL',
    layer: 'domestic',
    intensity: 0.8,
    activeShipments: 7,
    hasException: false,
    jobId: 'PW-2026-004281',
  },
  {
    id: 'NL-NSA-BOM',
    originId: 'INNSA',
    destinationId: 'INBOM',
    mode: 'DOMESTIC_FTL',
    layer: 'domestic',
    intensity: 0.74,
    activeShipments: 6,
    hasException: false,
  },
  {
    id: 'NL-NSA-DEL',
    originId: 'INNSA',
    destinationId: 'INDEL',
    mode: 'DOMESTIC_FTL',
    layer: 'domestic',
    intensity: 0.56,
    activeShipments: 3,
    hasException: false,
  },
  {
    id: 'NL-BOM-PNQ',
    originId: 'INBOM',
    destinationId: 'INPNQ',
    mode: 'DOMESTIC_LTL',
    layer: 'domestic',
    intensity: 0.44,
    activeShipments: 2,
    hasException: false,
  },
]

/**
 * Per-port operational readout for the hover panel.
 * Simulated, and labelled as such wherever it is shown.
 */
export interface PortActivity {
  portId: string
  activeJobs: number
  containers: number
  openExceptions: number
  /** Local time at that port, formatted for display. */
  nextDeparture: string
  timezoneLabel: string
  /** Marks the ports where PortWhizz has a physical operational presence. */
  isHub: boolean
}

export const PORT_ACTIVITY: PortActivity[] = [
  {
    portId: 'INNSA',
    activeJobs: 24,
    containers: 182,
    openExceptions: 3,
    nextDeparture: '08:40',
    timezoneLabel: 'IST',
    isHub: true,
  },
  { portId: 'CNSHA', activeJobs: 18, containers: 141, openExceptions: 2, nextDeparture: '11:15', timezoneLabel: 'CST', isHub: true },
  { portId: 'CNNGB', activeJobs: 11, containers: 88, openExceptions: 1, nextDeparture: '14:30', timezoneLabel: 'CST', isHub: false },
  { portId: 'SGSIN', activeJobs: 14, containers: 96, openExceptions: 0, nextDeparture: '06:20', timezoneLabel: 'SGT', isHub: true },
  { portId: 'AEJEA', activeJobs: 12, containers: 74, openExceptions: 1, nextDeparture: '19:45', timezoneLabel: 'GST', isHub: true },
  { portId: 'INMUN', activeJobs: 16, containers: 118, openExceptions: 2, nextDeparture: '10:05', timezoneLabel: 'IST', isHub: true },
  { portId: 'INMAA', activeJobs: 9, containers: 61, openExceptions: 1, nextDeparture: '16:50', timezoneLabel: 'IST', isHub: false },
  { portId: 'INBOM', activeJobs: 21, containers: 0, openExceptions: 2, nextDeparture: '09:30', timezoneLabel: 'IST', isHub: true },
  { portId: 'INPNQ', activeJobs: 8, containers: 0, openExceptions: 0, nextDeparture: '07:00', timezoneLabel: 'IST', isHub: false },
  { portId: 'INDEL', activeJobs: 13, containers: 0, openExceptions: 1, nextDeparture: '05:40', timezoneLabel: 'IST', isHub: false },
  { portId: 'NLRTM', activeJobs: 10, containers: 67, openExceptions: 1, nextDeparture: '13:10', timezoneLabel: 'CET', isHub: false },
]

const ACTIVITY_INDEX = new Map(PORT_ACTIVITY.map((a) => [a.portId, a]))

export function portActivity(portId: string): PortActivity | undefined {
  return ACTIVITY_INDEX.get(portId)
}

/** Ports that appear on the globe — everything referenced by a link. */
export const NETWORK_PORT_IDS = Array.from(
  new Set(NETWORK_LINKS.flatMap((l) => [l.originId, l.destinationId])),
)

export function linksForLayers(layers: { ocean: boolean; air: boolean; domestic: boolean }): NetworkLink[] {
  return NETWORK_LINKS.filter((link) => layers[link.layer])
}
