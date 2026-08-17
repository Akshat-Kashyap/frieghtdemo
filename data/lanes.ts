import type { Lane, TransportMode } from '@/types'

/**
 * Lanes drive three things: the "Popular lanes" list on intake, the transit
 * bands quoted in indicative options, and the arcs drawn on the 3D network.
 *
 * Transit bands are ranges rather than single numbers on purpose — a freight
 * ETA is never one number, and a demo that quotes "19 days" flat is the first
 * thing an operations person stops believing.
 */
export const LANES: Lane[] = [
  /* ── Far East → India (the demo's spine) ───────────────────────────── */
  {
    id: 'CNSHA-INNSA-FCL',
    originId: 'CNSHA',
    destinationId: 'INNSA',
    mode: 'OCEAN_FCL',
    transitMinDays: 18,
    transitMaxDays: 22,
    indicativeSellUsd: 1350,
    popularity: 100,
  },
  {
    id: 'CNNGB-INNSA-FCL',
    originId: 'CNNGB',
    destinationId: 'INNSA',
    mode: 'OCEAN_FCL',
    transitMinDays: 19,
    transitMaxDays: 23,
    indicativeSellUsd: 1310,
    popularity: 88,
  },
  {
    id: 'CNSHA-INMUN-FCL',
    originId: 'CNSHA',
    destinationId: 'INMUN',
    mode: 'OCEAN_FCL',
    transitMinDays: 19,
    transitMaxDays: 24,
    indicativeSellUsd: 1290,
    popularity: 76,
  },
  {
    id: 'CNSHA-INMAA-FCL',
    originId: 'CNSHA',
    destinationId: 'INMAA',
    mode: 'OCEAN_FCL',
    transitMinDays: 16,
    transitMaxDays: 20,
    indicativeSellUsd: 1240,
    popularity: 70,
  },
  {
    id: 'CNSHA-INNSA-LCL',
    originId: 'CNSHA',
    destinationId: 'INNSA',
    mode: 'OCEAN_LCL',
    transitMinDays: 22,
    transitMaxDays: 28,
    indicativeSellUsd: 62,
    popularity: 64,
  },

  /* ── Transhipment & Gulf ───────────────────────────────────────────── */
  {
    id: 'SGSIN-INNSA-FCL',
    originId: 'SGSIN',
    destinationId: 'INNSA',
    mode: 'OCEAN_FCL',
    transitMinDays: 9,
    transitMaxDays: 12,
    indicativeSellUsd: 780,
    popularity: 72,
  },
  {
    id: 'AEJEA-INNSA-FCL',
    originId: 'AEJEA',
    destinationId: 'INNSA',
    mode: 'OCEAN_FCL',
    transitMinDays: 5,
    transitMaxDays: 8,
    indicativeSellUsd: 540,
    popularity: 68,
  },
  {
    id: 'AEJEA-INMUN-FCL',
    originId: 'AEJEA',
    destinationId: 'INMUN',
    mode: 'OCEAN_FCL',
    transitMinDays: 4,
    transitMaxDays: 7,
    indicativeSellUsd: 505,
    popularity: 58,
  },

  /* ── India → Europe (export side) ──────────────────────────────────── */
  {
    id: 'INNSA-NLRTM-FCL',
    originId: 'INNSA',
    destinationId: 'NLRTM',
    mode: 'OCEAN_FCL',
    transitMinDays: 24,
    transitMaxDays: 30,
    indicativeSellUsd: 1580,
    popularity: 74,
  },
  {
    id: 'INMUN-NLRTM-FCL',
    originId: 'INMUN',
    destinationId: 'NLRTM',
    mode: 'OCEAN_FCL',
    transitMinDays: 23,
    transitMaxDays: 29,
    indicativeSellUsd: 1540,
    popularity: 60,
  },
  {
    id: 'INMAA-SGSIN-FCL',
    originId: 'INMAA',
    destinationId: 'SGSIN',
    mode: 'OCEAN_FCL',
    transitMinDays: 6,
    transitMaxDays: 9,
    indicativeSellUsd: 620,
    popularity: 52,
  },

  /* ── Air ───────────────────────────────────────────────────────────── */
  {
    id: 'CNSHA-INBOM-AIR',
    originId: 'CNSHA',
    destinationId: 'INBOM',
    mode: 'AIR',
    transitMinDays: 2,
    transitMaxDays: 4,
    indicativeSellUsd: 4.2,
    popularity: 66,
  },
  {
    id: 'AEJEA-INDEL-AIR',
    originId: 'AEJEA',
    destinationId: 'INDEL',
    mode: 'AIR',
    transitMinDays: 1,
    transitMaxDays: 3,
    indicativeSellUsd: 3.1,
    popularity: 56,
  },
  {
    id: 'INBOM-NLRTM-AIR',
    originId: 'INBOM',
    destinationId: 'NLRTM',
    mode: 'AIR',
    transitMinDays: 2,
    transitMaxDays: 4,
    indicativeSellUsd: 4.8,
    popularity: 44,
  },

  /* ── Domestic road — the last mile off Nhava Sheva ─────────────────── */
  {
    id: 'INNSA-INPNQ-FTL',
    originId: 'INNSA',
    destinationId: 'INPNQ',
    mode: 'DOMESTIC_FTL',
    transitMinDays: 1,
    transitMaxDays: 2,
    indicativeSellUsd: 210,
    popularity: 80,
  },
  {
    id: 'INNSA-INBOM-FTL',
    originId: 'INNSA',
    destinationId: 'INBOM',
    mode: 'DOMESTIC_FTL',
    transitMinDays: 1,
    transitMaxDays: 1,
    indicativeSellUsd: 120,
    popularity: 84,
  },
  {
    id: 'INNSA-INDEL-FTL',
    originId: 'INNSA',
    destinationId: 'INDEL',
    mode: 'DOMESTIC_FTL',
    transitMinDays: 3,
    transitMaxDays: 5,
    indicativeSellUsd: 620,
    popularity: 62,
  },
  {
    id: 'INBOM-INPNQ-LTL',
    originId: 'INBOM',
    destinationId: 'INPNQ',
    mode: 'DOMESTIC_LTL',
    transitMinDays: 1,
    transitMaxDays: 2,
    indicativeSellUsd: 34,
    popularity: 48,
  },
]

/** The list the intake panel shows under "Popular lanes". */
export const POPULAR_LANES = [...LANES].sort((a, b) => b.popularity - a.popularity).slice(0, 6)

export function findLane(originId: string, destinationId: string, mode: TransportMode): Lane | undefined {
  return LANES.find((l) => l.originId === originId && l.destinationId === destinationId && l.mode === mode)
}

/**
 * Transit band for any pair, falling back to a great-circle estimate when the
 * lane is not in the table. The intake panel must always be able to show a
 * duration — an empty transit field on a quote form reads as broken, and
 * customers type lane combinations no seed table can fully enumerate.
 */
export function transitBandFor(
  originId: string,
  destinationId: string,
  mode: TransportMode,
  distanceKm: number,
): { min: number; max: number; estimated: boolean } {
  const lane = findLane(originId, destinationId, mode)
  if (lane) return { min: lane.transitMinDays, max: lane.transitMaxDays, estimated: false }

  // Rough average speeds including port/terminal dwell, by mode.
  const kmPerDay: Record<TransportMode, number> = {
    OCEAN_FCL: 620,
    OCEAN_LCL: 480,
    AIR: 2400,
    DOMESTIC_FTL: 520,
    DOMESTIC_LTL: 380,
  }
  const fixedDwellDays: Record<TransportMode, number> = {
    OCEAN_FCL: 6,
    OCEAN_LCL: 10,
    AIR: 1,
    DOMESTIC_FTL: 0,
    DOMESTIC_LTL: 1,
  }

  const base = distanceKm / kmPerDay[mode] + fixedDwellDays[mode]
  const min = Math.max(1, Math.round(base * 0.88))
  const max = Math.max(min + 1, Math.round(base * 1.18))
  return { min, max, estimated: true }
}

/** Great-circle distance in km — also used to shape the globe's arcs. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}
