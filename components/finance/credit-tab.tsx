'use client'

import Link from 'next/link'
import { ArrowRight, Building2, Handshake, Landmark, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'

import {
  LIMIT_LEVERS,
  PAYLATER,
  UTILISATION_BAND_NOTE,
  creditUtilisationPct,
  facilityForAccount,
  utilisationBand,
  type UtilisationBand,
} from '@/data/customer-finance'
import { ORGANISATION } from '@/data/org'
import { daysUntil } from '@/lib/demo-clock'
import { formatDate, money, percent } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { useCreditFacilities } from '@/store/hooks'
import type { CreditFacility } from '@/types'

import { Card, DataRow, EmptyState, Meter, Panel, StatusBadge, type Tone } from '@/components/ui/primitives'
// The same KYB item is rendered here and on the business profile this tab
// deep-links into, so the label and the tone come from the module that owns
// them. Two copies are two chances for one check to read 'Action needed' in
// amber here and something else there.
import { KYB_STATUS_LABEL, KYB_STATUS_TONE } from '@/components/business/business-status'

import { CardHeading, FigureRail, NoteList, RecordPanel, TabIntro } from './pieces'

/**
 * Credit and PayLater.
 *
 * Two things have to come across, and the second one matters more than the
 * first. One: how much of the limit is left, and when it is reviewed. Two:
 * that the money is a financing partner's, coordinated by PortWhizz — a
 * forwarding platform that lets a customer believe it is the lender has
 * mis-described a regulated product, and `lib/boundaries.ts` fails the build
 * on the claim precisely because it is the easy sentence to write.
 *
 * The section that earns the tab is the last one: an outstanding
 * verification item on the company profile is not administrative housekeeping
 * — it is the reason the limit is what it is. Naming that consequence, and
 * linking straight to the item, is the whole argument for holding credit and
 * company profile in the same product.
 */

const FACILITY_STATUS_LABEL: Record<CreditFacility['status'], string> = {
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  REVIEW_DUE: 'Review due',
  SUSPENDED: 'Suspended',
}

const FACILITY_STATUS_TONE: Record<CreditFacility['status'], Tone> = {
  ACTIVE: 'signal',
  ON_HOLD: 'amber',
  REVIEW_DUE: 'amber',
  SUSPENDED: 'critical',
}

/**
 * Utilisation tones, inverted against the contract-volume meter elsewhere in
 * the product. Hitting 95% of a committed volume is the goal; hitting 95% of
 * a credit limit means the next booking may not go through.
 */
const UTILISATION_TONE: Record<UtilisationBand, Tone> = {
  HEADROOM: 'signal',
  STEADY: 'route',
  TIGHT: 'amber',
  AT_LIMIT: 'critical',
}

export function CreditTab() {
  const facilities = useCreditFacilities()
  // One facility, resolved through one function. The seed carries six because
  // the forwarder has six customers; five of them belong to other companies
  // and must never reach this screen.
  const facility = useMemo(() => facilityForAccount(facilities), [facilities])

  if (!facility) {
    return (
      <Panel className="p-8">
        <EmptyState
          icon={<Landmark className="h-6 w-6" />}
          title="No credit facility on this account"
          description="Bookings on this account are settled at the point of booking. A facility can be arranged with a financing partner through your account team."
        />
      </Panel>
    )
  }

  const used = creditUtilisationPct(facility)
  const band = utilisationBand(used)
  const reviewInDays = daysUntil(facility.reviewDue)

  return (
    <div className="flex flex-col gap-5">
      <TabIntro>{PAYLATER.summary}</TabIntro>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          {/* ── The facility ─────────────────────────────────────────── */}
          <RecordPanel
            icon={<Landmark className="h-4 w-4 shrink-0 text-signal" aria-hidden />}
            title={PAYLATER.name}
            meta={
              <span className="flex items-center gap-2">
                <span className="pw-id">{facility.id}</span>
                <StatusBadge tone={FACILITY_STATUS_TONE[facility.status]}>
                  {FACILITY_STATUS_LABEL[facility.status]}
                </StatusBadge>
              </span>
            }
            footnote={UTILISATION_BAND_NOTE[band]}
          >
            {/* The three figures sit in a milled channel rather than floating
                on the plate face. A reading in a recess reads as taken by the
                instrument; the same figure on a raised chip reads as typed in
                by hand, which is exactly the wrong impression for a limit. */}
            <FigureRail
              columns={3}
              figures={[
                { label: 'Limit', value: money(facility.limitInr) },
                { label: 'Drawn', value: money(facility.utilisedInr), tone: 'amber' },
                {
                  label: 'Available to book against',
                  value: money(facility.availableInr),
                  strong: true,
                  tone: 'signal',
                },
              ]}
            />

            <div className="px-5 pb-4">
              <Meter
                label={`Utilisation · ${money(facility.utilisedInr)} of ${money(facility.limitInr)}`}
                value={used}
                tone={UTILISATION_TONE[band]}
              />
            </div>

            {/* `DataRow` from the primitives. This was a private `Row` — the
                same pair without the dotted leader — and the leader is not
                decoration: four label/value rows stacked is a ladder of
                floating pairs, and printed schedules have solved that with a
                leader for a century. */}
            <dl className="flex flex-col border-t border-hairline px-5 py-3 shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.8)]">
              <DataRow label="Credit period" value={`${facility.creditDays} days from the invoice date`} />
              <DataRow
                label="Review due"
                value={`${formatDate(facility.reviewDue)} · in ${reviewInDays} day${reviewInDays === 1 ? '' : 's'}`}
              />
              <DataRow label="Provided by" value={PAYLATER.partnerName} />
              <DataRow label="Coordinated by" value="PortWhizz" />
            </dl>
          </RecordPanel>

          {/* ── How it works ─────────────────────────────────────────── */}
          <RecordPanel
            icon={<Handshake className="h-4 w-4 shrink-0 text-signal" aria-hidden />}
            title="How PayLater works"
            meta="Four steps, start to settlement"
          >
            <ol className="divide-y divide-hairline">
              {PAYLATER.steps.map((step, i) => (
                <li key={step.id} className="flex gap-3.5 px-5 py-3.5">
                  {/* The step number is stamped into the plate, not printed on
                      it: a drilled socket with the figure sitting in it. */}
                  <span
                    className="pw-rail mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] text-text-muted"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-data font-medium text-text">{step.title}</span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-text-muted">{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </RecordPanel>

          {/* ── What would raise the limit ───────────────────────────── */}
          <RecordPanel
            icon={<TrendingUp className="h-4 w-4 shrink-0 text-signal" aria-hidden />}
            title="What would raise the limit"
            meta="Read live from the company profile"
            footnote="The limit is the financing partner's decision. These are the inputs to it that this company controls."
          >
            <ul className="divide-y divide-hairline">
              {LIMIT_LEVERS.map((lever) => {
                const item = lever.kybItemId
                  ? ORGANISATION.kyb.find((k) => k.id === lever.kybItemId)
                  : undefined

                return (
                  <li key={lever.id} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <p className="text-data font-medium text-text">{lever.title}</p>
                      {item && (
                        <StatusBadge tone={KYB_STATUS_TONE[item.status]}>
                          {KYB_STATUS_LABEL[item.status]}
                        </StatusBadge>
                      )}
                    </div>
                    <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-text-muted">{lever.body}</p>

                    {item && (
                      <div className="pw-rail mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-chip px-3 py-2">
                        <span className="text-micro text-text-muted">
                          <span className="font-medium text-text">{item.label}</span> · {item.value} — unlocks{' '}
                          {item.unlocks.charAt(0).toLowerCase() + item.unlocks.slice(1)}
                        </span>
                        <Link
                          href={ROUTES.business}
                          className="ml-auto inline-flex items-center gap-1 rounded-chip text-micro font-medium text-signal hover:underline"
                        >
                          <Building2 className="h-3 w-3" aria-hidden />
                          Open in the business profile
                          <ArrowRight className="h-3 w-3" aria-hidden />
                        </Link>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </RecordPanel>
        </div>

        {/* ── Who carries what ───────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          <Card className="p-5">
            <CardHeading>Who carries the money</CardHeading>
            <NoteList className="mt-3" tone="violet" items={PAYLATER.boundaries} />
            <p className="mt-4 border-t border-hairline pt-3 text-micro leading-relaxed text-text-faint shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.7)]">
              PortWhizz is the digital operating layer. Carriers, terminals, transporters, clearance partners and
              financiers execute the physical, regulated and funded work.
            </p>
          </Card>

          <Card className="p-5">
            <CardHeading>What utilisation means here</CardHeading>
            <p className="mt-2.5 text-[12px] leading-relaxed text-text-muted">
              The drawn figure is every booking raised on terms and not yet settled — not a balance carried at a bank.
              It falls as invoices are paid, which is why an invoice sitting past its due date shows up twice: once as
              an overdue balance, and again as headroom this account does not currently have.
            </p>
            <dl className="mt-4 flex flex-col border-t border-hairline pt-2 shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.7)]">
              <DataRow label="Utilisation" value={percent(used)} mono />
              <DataRow label="Headroom" value={money(facility.availableInr)} mono />
            </dl>
          </Card>
        </div>
      </div>
    </div>
  )
}
