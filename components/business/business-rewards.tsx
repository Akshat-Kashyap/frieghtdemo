'use client'

import Link from 'next/link'
import { ArrowRight, Award } from 'lucide-react'

import { DEMO } from '@/data/copy'
import { ORGANISATION } from '@/data/org'
import { count, humanise } from '@/lib/format'
import { cn } from '@/lib/utils'

import { AnimatedNumber, DemoNotice, InstrumentRail, Meter, StatusBadge } from '@/components/ui/primitives'
import { DateStamp } from '@/components/ui/freight'
import { CardHeading, NoteList, RecordPanel } from '@/components/finance/pieces'

import { TIER_TONE, rewardLink } from './business-status'

/**
 * Loyalty standing.
 *
 * The balance on its own is a vanity number, so the panel is built around
 * the two things a customer actually asks: how far to the next tier, and
 * what did the last five movements come from. The ledger deep-links back to
 * the shipment or invoice that earned the points, because a reward line
 * nobody can trace back to a real record reads as invented — which, on a
 * screen that already carries a simulated-data notice, is the exact
 * impression to avoid.
 *
 * MATERIAL: the standing was a 30px figure set in the body face floating on
 * the plate, which is how a number ends up looking typed in rather than
 * measured. Balance, distance to the next tier and the size of the ledger are
 * readings in a channel now, and the ladder underneath them is the shared
 * `Meter` — a recessed gauge with the graduations laid over the fill.
 */
export function BusinessRewards() {
  const { tier, points, pointsToNextTier, nextTier, benefits, ledger } = ORGANISATION.rewards

  // Derived, never authored: the ladder's top is wherever the balance plus
  // the remaining points land, so the meter cannot disagree with the "points
  // to go" line beside it.
  const nextTierAt = points + pointsToNextTier

  return (
    <RecordPanel
      icon={<Award className="h-4 w-4 shrink-0 text-signal" aria-hidden />}
      title="Rewards"
      meta={<StatusBadge tone={TIER_TONE[tier]}>{humanise(tier)} tier</StatusBadge>}
      action={<DemoNotice variant="badge">{DEMO.valueSuffix}</DemoNotice>}
      footnote={`Points accrue on confirmed bookings and on invoices settled inside terms, and come off when a benefit is redeemed. ${DEMO.financialNotice}`}
    >
      {/* ── Standing ───────────────────────────────────────────────────── */}
      <div className="px-5 pb-1 pt-4">
        <InstrumentRail
          ticks={false}
          ariaLabel="Reward standing"
          readings={[
            {
              label: 'Points balance',
              value: <AnimatedNumber value={points} format={count} />,
              unit: 'pts',
              tone: 'signal',
              hint: `${humanise(tier)} tier`,
            },
            nextTier
              ? {
                  label: `To ${humanise(nextTier)}`,
                  value: count(pointsToNextTier),
                  unit: 'pts',
                  hint: `Next tier at ${count(nextTierAt)}`,
                }
              : { label: 'Tier', value: humanise(tier), hint: 'Nothing above this one' },
            { label: 'Ledger entries', value: count(ledger.length), hint: 'Most recent first' },
          ]}
        />
      </div>

      {nextTier && (
        <div className="px-5 pb-4 pt-2">
          <Meter label={`Towards ${humanise(nextTier)}`} value={points} max={nextTierAt} tone="signal" />
          <p className="mt-1.5 text-micro leading-relaxed text-text-muted">
            {count(pointsToNextTier)} points to {humanise(nextTier)}, at {count(nextTierAt)}.
          </p>
        </div>
      )}

      {/* ── What the tier is worth ─────────────────────────────────────── */}
      <div className="pw-groove px-5 py-4">
        <CardHeading>What {humanise(tier)} gives you</CardHeading>
        <NoteList className="mt-2.5" tone="signal" items={benefits} />
      </div>

      {/* ── Ledger ─────────────────────────────────────────────────────── */}
      <div className="pw-groove">
        <h4 className="pw-stencil px-5 pb-2 pt-3.5">Points ledger</h4>
        <div className="pw-table-wrap border-0">
          <table className="pw-table">
            <caption className="sr-only">Reward points earned and redeemed</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Entry</th>
                <th scope="col" className="text-right">
                  Points
                </th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry) => {
                const link = entry.relatedId ? rewardLink(entry.relatedId) : null

                return (
                  <tr key={entry.id}>
                    <td className="align-top">
                      <DateStamp iso={entry.at} className="text-text-muted" />
                    </td>
                    <td>
                      <span className="block text-text">{entry.description}</span>
                      {link && (
                        <Link
                          href={link.href}
                          className="mt-0.5 inline-flex items-center gap-1 rounded-chip text-micro text-route hover:underline"
                        >
                          {link.label}
                          <ArrowRight className="h-3 w-3 shrink-0" aria-hidden />
                        </Link>
                      )}
                    </td>
                    <td className="align-top text-right">
                      <PointsCell points={entry.points} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </RecordPanel>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   PIECES
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Signed points.
 *
 * `MoneyCell` is the reference for the colour logic — an earn is signal, a
 * redemption is critical, zero stays muted — but these are points, not
 * money. Running them through `MoneyCell` would put a ₹ in front of a
 * loyalty balance and quietly imply the two are interchangeable, so the
 * colour rule is copied and the currency formatting deliberately is not.
 */
function PointsCell({ points }: { points: number }) {
  const sign = points > 0 ? '+' : points < 0 ? '−' : ''

  return (
    <span
      className={cn(
        'pw-readout whitespace-nowrap text-data font-medium',
        points > 0 ? 'text-signal' : points < 0 ? 'text-critical' : 'text-text-muted',
      )}
    >
      {sign}
      {count(Math.abs(points))}
    </span>
  )
}
