import type { Port } from '@/types'

/**
 * Locations used across the intake search, the 3D network and every lane.
 * Coordinates are real (the globe has to look right); everything operational
 * attached to them is simulated.
 */
export const PORTS: Port[] = [
  /* ── China ─────────────────────────────────────────────────────────── */
  {
    id: 'CNSHA',
    code: 'CNSHA',
    name: 'Shanghai',
    city: 'Shanghai',
    country: 'China',
    countryCode: 'CN',
    kind: 'SEAPORT',
    lat: 31.2304,
    lng: 121.4737,
    hint: 'Yangshan / Waigaoqiao',
    popularity: 100,
    timezone: 'Asia/Shanghai',
  },
  {
    id: 'CNNGB',
    code: 'CNNGB',
    name: 'Ningbo',
    city: 'Ningbo',
    country: 'China',
    countryCode: 'CN',
    kind: 'SEAPORT',
    lat: 29.8683,
    lng: 121.544,
    hint: 'Ningbo-Zhoushan',
    popularity: 88,
    timezone: 'Asia/Shanghai',
  },

  /* ── South-east Asia & Middle East ─────────────────────────────────── */
  {
    id: 'SGSIN',
    code: 'SGSIN',
    name: 'Singapore',
    city: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    kind: 'SEAPORT',
    lat: 1.2644,
    lng: 103.822,
    hint: 'Transhipment hub',
    popularity: 95,
    timezone: 'Asia/Singapore',
  },
  {
    id: 'AEJEA',
    code: 'AEJEA',
    name: 'Dubai',
    city: 'Dubai',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    kind: 'SEAPORT',
    lat: 25.0159,
    lng: 55.0619,
    hint: 'Jebel Ali',
    popularity: 82,
    timezone: 'Asia/Dubai',
  },

  /* ── India — seaports ──────────────────────────────────────────────── */
  {
    id: 'INNSA',
    code: 'INNSA',
    name: 'Nhava Sheva',
    city: 'Mumbai',
    country: 'India',
    countryCode: 'IN',
    kind: 'SEAPORT',
    lat: 18.9490,
    lng: 72.9525,
    hint: 'JNPT · Navi Mumbai',
    popularity: 99,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'INMUN',
    code: 'INMUN',
    name: 'Mundra',
    city: 'Mundra',
    country: 'India',
    countryCode: 'IN',
    kind: 'SEAPORT',
    lat: 22.8394,
    lng: 69.7219,
    hint: 'Gujarat',
    popularity: 86,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'INMAA',
    code: 'INMAA',
    name: 'Chennai',
    city: 'Chennai',
    country: 'India',
    countryCode: 'IN',
    kind: 'SEAPORT',
    lat: 13.0827,
    lng: 80.2707,
    hint: 'Tamil Nadu',
    popularity: 78,
    timezone: 'Asia/Kolkata',
  },

  /* ── India — inland & metro ────────────────────────────────────────── */
  {
    id: 'INBOM',
    code: 'INBOM',
    name: 'Mumbai',
    city: 'Mumbai',
    country: 'India',
    countryCode: 'IN',
    kind: 'INLAND',
    hint: 'Metro · door delivery',
    lat: 19.076,
    lng: 72.8777,
    popularity: 90,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'INPNQ',
    code: 'INPNQ',
    name: 'Pune',
    city: 'Pune',
    country: 'India',
    countryCode: 'IN',
    kind: 'INLAND',
    hint: 'Maharashtra · industrial belt',
    lat: 18.5204,
    lng: 73.8567,
    popularity: 74,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'INDEL',
    code: 'INDEL',
    name: 'Delhi',
    city: 'Delhi',
    country: 'India',
    countryCode: 'IN',
    kind: 'ICD',
    hint: 'ICD Tughlakabad / NCR',
    lat: 28.6139,
    lng: 77.209,
    popularity: 84,
    timezone: 'Asia/Kolkata',
  },

  /* ── Europe ────────────────────────────────────────────────────────── */
  {
    id: 'NLRTM',
    code: 'NLRTM',
    name: 'Rotterdam',
    city: 'Rotterdam',
    country: 'Netherlands',
    countryCode: 'NL',
    kind: 'SEAPORT',
    lat: 51.9244,
    lng: 4.4777,
    hint: 'Maasvlakte',
    popularity: 80,
    timezone: 'Europe/Amsterdam',
  },
]

const PORT_INDEX = new Map(PORTS.map((p) => [p.id, p]))

export function getPort(id: string): Port | undefined {
  return PORT_INDEX.get(id)
}

/** Throws rather than rendering "undefined → undefined" on a lane label. */
export function requirePort(id: string): Port {
  const port = PORT_INDEX.get(id)
  if (!port) throw new Error(`Unknown port id: ${id}`)
  return port
}

/** "Shanghai → Nhava Sheva" */
export function laneLabel(originId: string, destinationId: string): string {
  return `${requirePort(originId).name} → ${requirePort(destinationId).name}`
}

/**
 * Intake search. Matches name, city, country and UN/LOCODE so someone can
 * type "INNSA", "nhava" or "navi mumbai" and land in the same place.
 */
export function searchPorts(query: string, limit = 7): Port[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...PORTS].sort((a, b) => b.popularity - a.popularity).slice(0, limit)

  return PORTS.map((port) => {
    const haystack = [port.name, port.city, port.country, port.code, port.hint ?? ''].join(' ').toLowerCase()
    if (!haystack.includes(q)) return null
    // Prefix matches on the name outrank a hit buried in the hint text.
    const score =
      (port.name.toLowerCase().startsWith(q) ? 1000 : 0) +
      (port.code.toLowerCase().startsWith(q) ? 800 : 0) +
      (port.city.toLowerCase().startsWith(q) ? 400 : 0) +
      port.popularity
    return { port, score }
  })
    .filter((r): r is { port: Port; score: number } => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.port)
}
