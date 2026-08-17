/**
 * THE DEMO CLOCK
 * ──────────────────────────────────────────────────────────────────────────
 * A demo that reads `Date.now()` rots: countdowns drift, "arriving today"
 * stops being today, and the authored timeline slides into the past. Every
 * relative value in this product resolves through DEMO_NOW instead.
 *
 * DEMO_NOW is pinned to 16 Aug 2026, 09:20 IST. That places the hero
 * shipment PW-2026-004281 mid-ocean: enquiry through ETA-update (06–16 Aug)
 * are behind us, arrival through POD (18–23 Aug) are ahead. It also makes
 * the Shipping Instruction cutoff exception read exactly "2h 18m" rather
 * than approximately.
 *
 * Server and first client render MUST agree, so nothing here reads the wall
 * clock during render. `useDemoClock()` ticks only after mount.
 */

/** The single fixed instant this entire demo is authored around. */
export const DEMO_NOW = new Date('2026-08-16T09:20:00+05:30')

export const DEMO_NOW_MS = DEMO_NOW.getTime()

/** IST — every operational timestamp in this demo is an Indian ops desk's local time. */
export const DEMO_TZ = 'Asia/Kolkata'
export const DEMO_TZ_LABEL = 'IST'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Offset helpers used by the seed data so authored dates stay readable. */
export const minutesFromNow = (n: number) => new Date(DEMO_NOW_MS + n * MINUTE).toISOString()
export const hoursFromNow = (n: number) => new Date(DEMO_NOW_MS + n * HOUR).toISOString()
export const daysFromNow = (n: number) => new Date(DEMO_NOW_MS + n * DAY).toISOString()

/** Milliseconds between an ISO timestamp and the demo clock. Negative = past. */
export function msFromDemoNow(iso: string, now: number = DEMO_NOW_MS): number {
  return new Date(iso).getTime() - now
}

export function isPast(iso: string, now: number = DEMO_NOW_MS): boolean {
  return msFromDemoNow(iso, now) < 0
}

/** True when `iso` falls on the same IST calendar day as the demo clock. */
export function isDemoToday(iso: string, now: number = DEMO_NOW_MS): boolean {
  return istDayKey(new Date(iso)) === istDayKey(new Date(now))
}

/** A stable YYYY-MM-DD key in IST, used for "today" grouping and bucketing. */
export function istDayKey(d: Date): string {
  // en-CA gives ISO-ordered parts, so this sorts and compares as a plain string.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DEMO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/**
 * Countdown parts for a deadline, clamped at zero.
 * `overdue` is what drives the critical styling on cutoff rails.
 */
export interface Countdown {
  totalMs: number
  overdue: boolean
  days: number
  hours: number
  minutes: number
  seconds: number
  /** "2h 18m" · "3d 04h" · "Overdue by 40m" */
  label: string
  /** Coarse urgency band the UI colours from. */
  band: 'overdue' | 'critical' | 'urgent' | 'soon' | 'clear'
}

export function countdown(deadlineIso: string, now: number = DEMO_NOW_MS): Countdown {
  const delta = msFromDemoNow(deadlineIso, now)
  const overdue = delta < 0
  const abs = Math.abs(delta)

  const days = Math.floor(abs / DAY)
  const hours = Math.floor((abs % DAY) / HOUR)
  const minutes = Math.floor((abs % HOUR) / MINUTE)
  const seconds = Math.floor((abs % MINUTE) / 1000)

  let core: string
  if (days > 0) core = `${days}d ${String(hours).padStart(2, '0')}h`
  else if (hours > 0) core = `${hours}h ${String(minutes).padStart(2, '0')}m`
  else core = `${minutes}m ${String(seconds).padStart(2, '0')}s`

  const band: Countdown['band'] = overdue
    ? 'overdue'
    : abs < 3 * HOUR
      ? 'critical'
      : abs < 12 * HOUR
        ? 'urgent'
        : abs < 3 * DAY
          ? 'soon'
          : 'clear'

  return {
    totalMs: delta,
    overdue,
    days,
    hours,
    minutes,
    seconds,
    label: overdue ? `Overdue by ${core}` : core,
    band,
  }
}

/** "3d ago" · "in 6h" · "just now" — used for record age and activity streams. */
export function relativeToDemoNow(iso: string, now: number = DEMO_NOW_MS): string {
  const delta = msFromDemoNow(iso, now)
  const abs = Math.abs(delta)
  const past = delta < 0

  if (abs < MINUTE) return 'just now'

  const value =
    abs >= DAY
      ? `${Math.floor(abs / DAY)}d`
      : abs >= HOUR
        ? `${Math.floor(abs / HOUR)}h`
        : `${Math.floor(abs / MINUTE)}m`

  return past ? `${value} ago` : `in ${value}`
}

/** Whole days a record has been open — the "Age" column on enquiry cards. */
export function ageInDays(iso: string, now: number = DEMO_NOW_MS): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / DAY))
}

/**
 * Whole days from now until `iso`, floored at zero.
 *
 * The mirror of `ageInDays`. Both clamp, which is the point: "how old is
 * this" and "how long is left" are different questions, and negating one to
 * answer the other silently returns zero for every future date.
 */
export function daysUntil(iso: string, now: number = DEMO_NOW_MS): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / DAY))
}
