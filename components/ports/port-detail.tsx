'use client'

import Link from 'next/link'
import { ArrowRight, Container, Info, Ship, Warehouse } from 'lucide-react'

import { portProfile, type ChargeBand, type FreeTimeSlab } from '@/data/port-profiles'
import { requirePort } from '@/data/ports'
import { flagEmoji } from '@/lib/flag'
import { formatDate, money, moneyUsd, transitRange } from '@/lib/format'
import { MODE_LABEL } from '@/lib/lifecycle'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { PROFILE_REVIEWED_AT } from '@/data/port-profiles'

import { PageShell } from '@/components/app/app-shell'
import {
  Button,
  Card,
  DataRow,
  DemoNotice,
  EmptyState,
  Panel,
  SectionHeader,
  StatusBadge,
} from '@/components/ui/primitives'
import { CardHeading, FigureRail, NoteList, RecordPanel } from '@/components/finance/pieces'
import { lanesThrough } from './port-index'

/**
 * A port profile.
 *
 * Ordered by what a customer with cargo arriving actually needs, in order:
 * how long they have before charges start, what those charges are, where the
 * box will be handled, and what runs through here.
 *
 * THE TWO CLOCKS ARE THE PAGE
 * ══════════════════════════════════════════════════════════════════════════
 * Detention and storage are the figures that change behaviour, and they are
 * routinely conflated — so they are drawn as two separate plates sitting on
 * the ground rather than as two halves of one panel. That is not decoration:
 * they run on different day counts, they are payable to DIFFERENT PARTIES, and
 * a shipment held at destination runs both at once. Two objects, each naming
 * its own counterparty, is the only layout that cannot be misread as one bill.
 *
 * And the escalation is drawn rather than written. "₹1,450 a day, then ₹2,900
 * from day 11" asks the reader to picture a ratio; the slab ladder shows it —
 * a graduated channel with the bands drawn to scale against the top band, so
 * the step up is visible from across a desk. The bar length is the reading and
 * the draft marks are the scale it is read against.
 */
export function PortDetail({ code }: { code: string }) {
  const port = (() => {
    try {
      return requirePort(code.toUpperCase())
    } catch {
      return null
    }
  })()

  const profile = port ? portProfile(port.id) : undefined

  if (!port || !profile) {
    return (
      <PageShell title="Port information">
        <Panel className="p-8">
          <EmptyState
            title={`No profile for “${code}”`}
            description="This location is not on your network, or its profile has not been written yet."
            action={
              <Link href={ROUTES.ports} className="text-data font-medium text-signal hover:underline">
                Back to all ports
              </Link>
            }
          />
        </Panel>
      </PageShell>
    )
  }

  const lanes = lanesThrough(port.id)

  return (
    <PageShell
      width="wide"
      title={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span aria-hidden className="shrink-0 text-[24px] leading-none">
            {flagEmoji(port.countryCode)}
          </span>
          <span className="min-w-0">{port.name}</span>
          <span className="pw-id text-[15px] font-normal text-text-faint">{port.code}</span>
        </span>
      }
      description={profile.overview}
      actions={
        <Button asChild variant="primary" size="md">
          <Link href={ROUTES.search}>
            Price a shipment here
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      }
      notice={`Charges and free-time slabs are indicative bands reviewed ${formatDate(PROFILE_REVIEWED_AT)}. They vary by carrier, terminal and direction — confirm against your own booking before relying on a figure.`}
    >
      <div className="flex flex-col gap-8">
        {/* ══════════════════════════════════════════════════════════════
            THE TWO CLOCKS
            Full width, above the fold and above everything else on the
            page, because this is the only section a customer with cargo
            already on the water opens the page for.
            ══════════════════════════════════════════════════════════════ */}
        <section aria-labelledby="port-free-time" className="flex flex-col gap-4">
          <SectionHeader
            eyebrow="Free time"
            title={<span id="port-free-time">Free time, then what it costs</span>}
            description="Calendar days, holidays included. A box landing before a long weekend loses three of its free days to days nobody works."
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <ClockPlate
              icon={<Ship className="h-4 w-4 text-signal" aria-hidden />}
              title="Detention"
              party="Shipping line"
              subtitle="The container is outside the terminal and has not been returned empty. The clock runs on the carrier’s equipment, wherever the box is."
              freeDays={profile.freeTime.detentionFreeDays}
              slabs={profile.freeTime.detentionSlabs}
              payableTo="Payable to the shipping line"
            />
            <ClockPlate
              icon={<Warehouse className="h-4 w-4 text-signal" aria-hidden />}
              title="Storage / demurrage"
              party="Terminal or line"
              subtitle="The container is still inside the terminal after its free period. The clock runs on the ground the box is standing on."
              freeDays={profile.freeTime.storageFreeDays}
              slabs={profile.freeTime.storageSlabs}
              payableTo="Payable to the terminal or line"
            />
          </div>

          <DemoNotice variant="block">
            These are two separate clocks, payable to two different parties, and a shipment held up at destination can
            run both at once — which is why the combined exposure is usually larger than people expect. Your own booking
            may grant more free time than the bands above; where the two differ, the booking governs.
          </DemoNotice>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-5">
            {/* ── Handling ───────────────────────────────────────────── */}
            <RecordPanel
              icon={<Container className="h-4 w-4 text-signal" aria-hidden />}
              title="Handling charges"
              meta="Indicative bands"
              footnote="Terminal handling is billed by the terminal through your forwarder and is separate from the freight rate. A band is a range because it moves with the carrier, the terminal and the direction of the box."
            >
              <ul>
                {profile.handling.map((band) => (
                  <li
                    key={band.label}
                    className="pw-groove flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3 first:border-t-0 first:shadow-none"
                  >
                    <span className="min-w-0">
                      <span className="block text-data text-text">{band.label}</span>
                      <span className="block text-micro text-text-faint">{band.basis}</span>
                      {band.note && <span className="mt-1 block text-micro text-text-muted">{band.note}</span>}
                    </span>
                    <span className="pw-readout shrink-0 text-data font-medium">{bandLabel(band)}</span>
                  </li>
                ))}
              </ul>
            </RecordPanel>

            {/* ── Lanes ──────────────────────────────────────────────── */}
            <RecordPanel
              title={`Lanes through ${port.name}`}
              meta={`${lanes.length} on your network`}
              footnote="Transit is port to port and excludes the time a box spends waiting for a slot at either end."
            >
              {lanes.length === 0 ? (
                <p className="px-5 py-6 text-data text-text-muted">No lanes on your network run through this port.</p>
              ) : (
                // Wide content scrolls inside its own box; the page never does.
                <div className="pw-table-wrap border-0">
                  <table className="pw-table">
                    <thead>
                      <tr>
                        <th>Lane</th>
                        <th>Mode</th>
                        <th className="text-right">Transit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lanes.map(({ lane, origin, destination }) => (
                        <tr key={lane.id}>
                          <td>
                            <span className="font-medium text-text">
                              {origin.name} → {destination.name}
                            </span>
                          </td>
                          <td className="text-text-muted">{MODE_LABEL[lane.mode]}</td>
                          <td className="pw-readout text-right text-text-muted">
                            {transitRange(lane.transitMinDays, lane.transitMaxDays)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </RecordPanel>
          </div>

          {/* ── Sidebar ──────────────────────────────────────────────── */}
          <div className="flex min-w-0 flex-col gap-5">
            <Card className="p-5">
              <CardHeading>Port authority</CardHeading>
              <p className="pw-plate-title mt-2 text-panel">{profile.authority}</p>
              <dl className="mt-3">
                <DataRow label="Type" value={profile.typeLabel} />
                <DataRow label="First port of entry" value={profile.firstPortOfEntry ? 'Yes' : 'No'} />
                <DataRow
                  label="Direct port delivery"
                  value={profile.directPortDelivery ? 'Available to eligible importers' : 'Not applicable'}
                />
                {profile.cfsCount && <DataRow label="Linked CFS" value={`~${profile.cfsCount}`} />}
                <DataRow label="Coordinates" mono value={`${port.lat.toFixed(3)}, ${port.lng.toFixed(3)}`} />
                <DataRow label="Local time zone" mono value={port.timezone} />
              </dl>
            </Card>

            <Card className="overflow-hidden p-0">
              <CardHeading className="pw-groove-b border-b border-hairline px-5 py-3">Terminals</CardHeading>
              <ul>
                {profile.terminals.map((t) => (
                  <li key={t.name} className="pw-groove px-5 py-2.5 first:border-t-0 first:shadow-none">
                    <p className="text-data font-medium text-text">{t.name}</p>
                    <p className="text-micro text-text-faint">{t.operator}</p>
                    {t.note && <p className="mt-0.5 text-micro text-text-muted">{t.note}</p>}
                  </li>
                ))}
              </ul>
            </Card>

            {profile.statistics.length > 0 && (
              <Card className="overflow-hidden p-0">
                <CardHeading className="pw-groove-b border-b border-hairline px-5 py-3">At a glance</CardHeading>
                {/* Readings sit in a milled channel: a figure in a recess reads
                    as taken off the instrument, the same figure on a raised chip
                    reads as typed in by hand. */}
                <FigureRail
                  columns={2}
                  figures={profile.statistics.map((s) => ({ label: s.label, value: s.value, sub: s.note }))}
                />
              </Card>
            )}

            {profile.advisories.length > 0 && (
              <Card className="p-5">
                <CardHeading icon={<Info className="h-3.5 w-3.5" aria-hidden />}>Worth knowing</CardHeading>
                <NoteList className="mt-3" tone="amber" items={profile.advisories} />
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   ONE CLOCK
   ══════════════════════════════════════════════════════════════════════════
   A plate of its own, on the ground, naming the party it is payable to on its
   face. Nested inside a shared panel these two read as one bill with two
   columns, which is precisely the mistake the data file was written to stop.
   ══════════════════════════════════════════════════════════════════════════ */

function ClockPlate({
  icon,
  title,
  party,
  subtitle,
  freeDays,
  slabs,
  payableTo,
}: {
  icon: React.ReactNode
  title: string
  /** Who the money goes to. The reason these are two objects and not one. */
  party: string
  subtitle: string
  freeDays: number
  slabs: FreeTimeSlab[]
  payableTo: string
}) {
  const basis = slabs[0]?.basis

  return (
    <RecordPanel
      // Side by side these two plates are rarely the same height — one port
      // publishes three detention bands and two storage ones. The body takes
      // the slack so both basis strips sit on the floor of their own plate
      // rather than one of them floating in the middle of it.
      className="flex flex-col"
      bodyClassName="flex-1"
      icon={icon}
      title={title}
      // Violet is the external party in this palette, and that is exactly what
      // a counterparty is. Colour is state; it is not here to tell the two
      // clocks apart — the words do that.
      meta={
        <StatusBadge tone="violet" dot={false}>
          {party}
        </StatusBadge>
      }
      footnote={basis ? `${payableTo}, quoted ${basis}.` : `${payableTo}.`}
    >
      <div className="flex flex-col gap-3.5 px-5 py-4">
        <p className="text-data leading-relaxed text-text-muted">{subtitle}</p>
        <SlabLadder freeDays={freeDays} slabs={slabs} />
      </div>
    </RecordPanel>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   THE SLAB LADDER
   ══════════════════════════════════════════════════════════════════════════
   Every band on one scale, in a milled channel, with draft marks running the
   full length of every track — filled and empty alike, because a real gauge
   graduates its whole scale and ticks only under the unfilled part is the
   giveaway that it is a progress bar wearing a costume.

   The free band is drawn as an empty track on purpose. Zero is a reading, and
   showing it on the same scale as the paid bands is what makes the first step
   up land as a step rather than as the start of the chart.

   Bar lengths are relative to the top band of THIS clock only. The two clocks
   are quoted in different currencies against different units, so a shared
   scale would invite exactly the comparison the page is trying to prevent.
   ══════════════════════════════════════════════════════════════════════════ */

/** Colour is state: the first paid band is attention, the top band is a problem. */
function slabTone(index: number, total: number): { text: string; fill: string } {
  const top = index === total - 1 && total > 1
  return top ? { text: 'text-critical', fill: 'bg-critical/80' } : { text: 'text-amber', fill: 'bg-amber/80' }
}

function SlabLadder({ freeDays, slabs }: { freeDays: number; slabs: FreeTimeSlab[] }) {
  const peak = Math.max(...slabs.map((s) => s.amount), 1)

  return (
    <div className="pw-rail rounded-card px-3.5 py-3.5">
      <ol className="flex flex-col gap-3">
        <li>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="pw-stencil">Days 1–{freeDays}</span>
            <span className="pw-readout shrink-0 text-data font-medium text-signal">No charge</span>
          </div>
          <Track pct={0} fill="" />
          <p className="mt-1 text-micro leading-snug text-text-faint">
            {freeDays} free day{freeDays === 1 ? '' : 's'} before this clock starts
          </p>
        </li>

        {slabs.map((slab, index) => {
          const tone = slabTone(index, slabs.length)
          // A floor of 14% so the cheapest band is still a mark on the scale
          // rather than a hairline the eye reads as nothing.
          const pct = Math.max(14, Math.round((slab.amount / peak) * 100))

          return (
            <li key={slab.fromDay}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="pw-stencil">
                  {slab.toDay ? `Days ${slab.fromDay}–${slab.toDay}` : `Day ${slab.fromDay} onward`}
                </span>
                <span className={cn('shrink-0 whitespace-nowrap', tone.text)}>
                  <span className="pw-readout text-data font-medium">
                    {slab.currency === 'USD' ? moneyUsd(slab.amount) : money(slab.amount, 'INR')}
                  </span>
                  <span className="ml-1 font-mono text-micro opacity-80">/day</span>
                </span>
              </div>
              <Track pct={pct} fill={tone.fill} />
              <p className="mt-1 text-micro leading-snug text-text-faint">
                {slab.toDay
                  ? `${slab.toDay - slab.fromDay + 1} day${slab.toDay - slab.fromDay === 0 ? '' : 's'} at this band`
                  : 'No upper band — it stays at this rate'}
              </p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/**
 * One graduated track. Purely a picture of the figure printed beside it, so it
 * is hidden from assistive technology rather than given a duplicate label.
 */
function Track({ pct, fill }: { pct: number; fill: string }) {
  return (
    <div aria-hidden className="relative mt-1.5 h-[5px] w-full overflow-hidden rounded-full">
      <span className="pw-ticks absolute inset-0 opacity-45" />
      {pct > 0 && <span className={cn('absolute inset-y-0 left-0 rounded-full', fill)} style={{ width: `${pct}%` }} />}
    </div>
  )
}

function bandLabel(band: ChargeBand): string {
  if (band.currency === 'USD') return `USD ${band.low}–${band.high}`
  return `${money(band.low, 'INR')} – ${money(band.high, 'INR')}`
}
