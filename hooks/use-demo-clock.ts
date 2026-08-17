'use client'

import { useEffect, useState } from 'react'
import { DEMO_NOW_MS } from '@/lib/demo-clock'

/**
 * A ticking clock that starts at the fixed DEMO_NOW.
 *
 * Countdowns need to move — a cutoff rail frozen at "2h 18m" looks like a
 * screenshot. But they must start from the pinned instant so SSR and the
 * first client render produce identical HTML. So: return DEMO_NOW_MS exactly
 * until mounted, then advance from it in real time.
 *
 * @param intervalMs how often to tick. 1000 for second-precision countdowns,
 *                   60000 for anything showing only minutes — a per-second
 *                   re-render of a dense board is wasted work.
 */
export function useDemoClock(intervalMs = 1000): number {
  const [now, setNow] = useState(DEMO_NOW_MS)

  useEffect(() => {
    const startedAt = Date.now()
    const id = setInterval(() => {
      // Advance by elapsed wall time rather than by intervalMs, so a
      // backgrounded tab that throttles timers doesn't fall behind.
      setNow(DEMO_NOW_MS + (Date.now() - startedAt))
    }, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}

/**
 * The non-ticking variant, for anything that only needs "when is now" once —
 * age columns, date grouping, "arriving today" filters. Avoids subscribing a
 * whole table to a 1Hz re-render.
 */
export function useDemoNow(): number {
  return DEMO_NOW_MS
}
