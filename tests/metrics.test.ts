import { describe, expect, it } from 'vitest'

import { createSeed } from '@/data'
import { computeTotals } from '@/data/quotes'
import { DEMO_NOW, DEMO_NOW_MS, countdown } from '@/lib/demo-clock'
import { BookingLifecycle, DocumentLifecycle, JobLifecycle, isExceptionOpen } from '@/lib/lifecycle'
import { moneyShortInr } from '@/lib/format'
import { selectClosureChecklist, selectCutoffRail, selectDashboardMetrics, selectJobCost, selectJobFile } from '@/store/selectors'
import type { FreightState } from '@/store/freight-store'

/**
 * Locks the headline dashboard numbers to the seed data.
 *
 * The metrics are computed, not typed — which is the right design, but it
 * means a careless edit to the seed silently changes what the dashboard
 * claims. These tests are the tripwire: change the seed and you must
 * consciously change the expected figure too.
 */

/** The selectors only read data, so a plain seed satisfies the state shape. */
function seedState(): FreightState {
  return { ...createSeed(), revision: 0 } as unknown as FreightState
}

describe('demo clock', () => {
  it('is pinned to 16 Aug 2026, 09:20 IST', () => {
    expect(DEMO_NOW.toISOString()).toBe('2026-08-16T03:50:00.000Z')
  })

  it('renders the hero shipping-instruction cutoff as 2h 18m', () => {
    const state = seedState()
    const hero = state.bookings.find((b) => b.jobId === 'PW-2026-004281')!
    expect(countdown(hero.cutoffs.shippingInstruction, DEMO_NOW_MS).label).toBe('2h 18m')
  })
})

/**
 * The figures a *customer* sees.
 *
 * This block used to assert the forwarder's own book — 128 active jobs, the
 * branch's pending vendor bills, its estimated margin. Those tiles no longer
 * exist: the product is one importer's account, and 128 active shipments
 * would be a lie about the size of it. What survives from the old block is
 * the invariant that mattered, which is that a headline count never exceeds
 * the records behind it.
 */
describe('customer metrics reconcile to the seed', () => {
  const metrics = selectDashboardMetrics(seedState())

  it('counts only shipments on this account', () => {
    const state = seedState()
    const own = state.jobs.filter((j) => j.customerId === 'CUST-APEX' && j.status !== 'CLOSED')
    expect(metrics.myShipments).toBe(own.length)
    expect(metrics.myShipments).toBeGreaterThan(0)
  })

  it('every counted open exception is a real, clickable record', () => {
    const state = seedState()
    const open = state.exceptions.filter((e) => isExceptionOpen(e.status))
    // No phantom rows: the tile count equals the number of authored records.
    expect(open.length).toBe(metrics.openExceptions)
    for (const exc of open) {
      expect(state.jobs.some((j) => j.id === exc.jobId)).toBe(true)
    }
  })

  it('shows an arrival count that has bookings behind it', () => {
    expect(metrics.arrivingToday).toBeGreaterThan(0)
  })

  it('renders money in Indian short form', () => {
    expect(moneyShortInr(842000)).toBe('₹8.42L')
    expect(moneyShortInr(12400000)).toBe('₹1.24Cr')
  })
})

describe('the hero job file', () => {
  const file = selectJobFile(seedState(), 'PW-2026-004281')!

  it('assembles every part of the shipment in one call', () => {
    expect(file.job.id).toBe('PW-2026-004281')
    expect(file.customer.name).toBe('Apex Industrial Systems Pvt. Ltd.')
    expect(file.origin.name).toBe('Shanghai')
    expect(file.destination.name).toBe('Nhava Sheva')
    expect(file.booking?.vessel).toBe('MSC Aurora')
    expect(file.booking?.voyage).toBe('626E')
  })

  it('has the full 15-event timeline', () => {
    expect(file.milestones).toHaveLength(15)
    expect(file.milestones[0]!.title).toBe('Enquiry created')
    expect(file.milestones.at(-1)!.title).toBe('Proof of delivery expected')
  })

  it('carries both containers, one with VGM outstanding', () => {
    expect(file.containers).toHaveLength(2)
    const [first, second] = file.containers
    expect(first!.number).toBe('MSCU1234567')
    expect(first!.vgmKg).toBe(18550)
    expect(second!.number).toBe('MSCU1234568')
    expect(second!.vgmKg).toBeUndefined()
    expect(second!.vgmMethod).toBe('PENDING')
  })

  it('shows clearance as partner coordination status only', () => {
    expect(file.job.clearanceCoordination).toBe('Clearance status pending partner update')
  })
})

describe('quote structure', () => {
  it('matches the worked example margins', () => {
    const state = seedState()
    const quote = state.quotes.find((q) => q.id === 'QT-2026-00291-V2')!

    const ocean = quote.lines.find((l) => l.code === 'OFR')!
    expect((ocean.sellRate - ocean.buyRate) * ocean.quantity).toBe(300)

    const origin = quote.lines.find((l) => l.code === 'OHC')!
    expect((origin.sellRate - origin.buyRate) * origin.quantity).toBe(80)

    const doc = quote.lines.find((l) => l.code === 'DOC')!
    expect((doc.sellRate - doc.buyRate) * doc.quantity).toBe(25)
  })

  it('excludes exposure-only lines from the quoted total', () => {
    const state = seedState()
    const quote = state.quotes.find((q) => q.id === 'QT-2026-00291-V2')!
    const totals = computeTotals(quote.lines)

    const exposureLines = quote.lines.filter((l) => l.applicability === 'EXPOSURE_ONLY')
    expect(exposureLines.length).toBeGreaterThan(0)

    // Storage and detention are risks the customer carries, not revenue.
    // Counting them would overstate both the quote and the margin.
    const withExposure = quote.lines.reduce((s, l) => s + l.sellRate * l.quantity * l.fx, 0)
    expect(totals.sellInr).toBeLessThan(Math.round(withExposure))
  })
})

describe('margin basis firms up as reality lands', () => {
  it('is provisional while bills are still in flight', () => {
    const cost = selectJobCost(seedState(), 'PW-2026-004281')
    expect(cost.basis).toBe('PROVISIONAL')
    expect(cost.sellInr).toBeGreaterThan(0)
  })

  it('reports variance where a vendor billed above accrual', () => {
    const cost = selectJobCost(seedState(), 'PW-2026-004241')
    expect(cost.varianceCount).toBeGreaterThan(0)
    // The ₹48,500 Westline dispute, plus FX on the matched carrier bill.
    expect(cost.varianceInr).toBeGreaterThanOrEqual(48500)
  })
})

describe('cutoff rail', () => {
  it('lists live cutoffs soonest first and keeps recently missed ones visible', () => {
    const rail = selectCutoffRail(seedState())
    expect(rail.length).toBeGreaterThan(0)

    for (let i = 1; i < rail.length; i++) {
      expect(rail[i]!.countdown.totalMs).toBeGreaterThanOrEqual(rail[i - 1]!.countdown.totalMs)
    }

    const heroSi = rail.find((c) => c.jobId === 'PW-2026-004281' && c.kind === 'shippingInstruction')
    expect(heroSi?.countdown.label).toBe('2h 18m')
    expect(heroSi?.countdown.band).toBe('critical')
  })
})

describe('closure is derived, not a button', () => {
  it('refuses to call a live job ready to close', () => {
    const checks = selectClosureChecklist(seedState(), 'PW-2026-004281')
    expect(checks.every((c) => c.done)).toBe(false)
    expect(checks.find((c) => c.label === 'All exceptions resolved')?.done).toBe(false)
  })

  it('reports a settled job as materially complete', () => {
    const checks = selectClosureChecklist(seedState(), 'PW-2026-004218')
    expect(checks.find((c) => c.label === 'Invoice settled')?.done).toBe(true)
  })
})

describe('lifecycle machines', () => {
  it('only permits legal job transitions', () => {
    expect(JobLifecycle.canTransition('IN_TRANSIT', 'ARRIVING')).toBe(true)
    expect(JobLifecycle.canTransition('IN_TRANSIT', 'CLOSED')).toBe(false)
    expect(JobLifecycle.isTerminal('CLOSED')).toBe(true)
  })

  it('only permits legal document transitions', () => {
    expect(DocumentLifecycle.canTransition('DRAFT', 'ISSUED')).toBe(true)
    expect(DocumentLifecycle.canTransition('DRAFT', 'ACCEPTED')).toBe(false)
    expect(DocumentLifecycle.canTransition('ARCHIVED', 'DRAFT')).toBe(false)
  })

  it('models a cancelled booking as terminal', () => {
    expect(BookingLifecycle.isTerminal('CANCELLED')).toBe(true)
    expect(BookingLifecycle.canTransition('CANCELLED', 'CONFIRMED')).toBe(false)
  })
})

describe('seed integrity', () => {
  const state = seedState()

  it('gives every job a timeline', () => {
    for (const job of state.jobs) {
      expect(state.milestones.some((m) => m.jobId === job.id), `${job.id} has no milestones`).toBe(true)
    }
  })

  it('gives every job a quote', () => {
    for (const job of state.jobs) {
      expect(state.quotes.some((q) => q.jobId === job.id), `${job.id} has no quote`).toBe(true)
    }
  })

  it('populates every job status so no board column is empty', () => {
    const statuses = new Set(state.jobs.map((j) => j.status))
    for (const status of JobLifecycle.order) {
      expect(statuses.has(status), `no job in status ${status}`).toBe(true)
    }
  })

  it('returns an independent copy each time, so reset really resets', () => {
    const a = createSeed()
    const b = createSeed()
    a.jobs[0]!.status = 'CLOSED'
    expect(b.jobs[0]!.status).not.toBe('CLOSED')
  })

  /**
   * A job carrying an open CRITICAL or HIGH exception but flagged merely
   * WATCH is the exact inconsistency that would let the "At Risk" tile
   * disagree with the exception queue sitting next to it on the same screen.
   */
  it('keeps job risk level consistent with its open exceptions', () => {
    const inconsistent = state.jobs.filter((job) => {
      const severe = state.exceptions.some(
        (e) => e.jobId === job.id && isExceptionOpen(e.status) && (e.severity === 'CRITICAL' || e.severity === 'HIGH'),
      )
      return severe && job.riskLevel !== 'AT_RISK'
    })

    expect(
      inconsistent.map((j) => j.id),
      'jobs with an open high/critical exception must be flagged AT_RISK',
    ).toEqual([])
  })

  it('points every exception at a job that exists', () => {
    for (const exc of state.exceptions) {
      expect(state.jobs.some((j) => j.id === exc.jobId), `${exc.id} → missing job ${exc.jobId}`).toBe(true)
    }
  })

  it('points every booking and container at a job that exists', () => {
    for (const booking of state.bookings) {
      expect(state.jobs.some((j) => j.id === booking.jobId), `${booking.id} → missing job`).toBe(true)
    }
    for (const container of state.containers) {
      expect(state.jobs.some((j) => j.id === container.jobId), `${container.number} → missing job`).toBe(true)
    }
  })
})
