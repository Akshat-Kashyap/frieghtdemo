'use client'

import Link from 'next/link'
import {
  ArrowUpRight,
  Bell,
  Check,
  Lock,
  Mail,
  Minus,
  Phone,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { DEMO } from '@/data/copy'
import { CUSTOMER_ROLES, ORGANISATION } from '@/data/org'
import { requirePort } from '@/data/ports'
import { RATE_BASIS, RATE_GRID, rateCell } from '@/data/rate-grid'
import { count, moneyUsd, transitRange } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { useHydrated } from '@/hooks/use-hydrated'
import { useActingMember, useCan, useOrgStore } from '@/store/org-store'
import type { CustomerRole, PreferredContactMethod } from '@/types'

import { PageShell } from '@/components/app/app-shell'
import { LanePill, RateTrendMark } from '@/components/ui/freight'
import {
  Card,
  DemoNotice,
  EmptyState,
  Panel,
  SegmentedControl,
  Skeleton,
  StatusBadge,
} from '@/components/ui/primitives'
import { CardHeading, RecordPanel } from '@/components/finance/pieces'

import { ResetDemoCard } from './reset-demo'

/**
 * YOUR PROFILE
 * ══════════════════════════════════════════════════════════════════════════
 * The account the viewer is currently acting as, the lanes they have saved,
 * and the reset that puts the demo back.
 *
 * The middle section is the one that earns the page. Every other screen shows
 * a role gate at the moment it bites — an Award button that will not press,
 * a reason underneath it — which teaches the mechanic one refusal at a time.
 * This lays the whole permission set out at once so the viewer can see that
 * the person who raises a request is deliberately not the person who can
 * commit the company's money, and can predict what will happen before they
 * switch person in the top bar rather than discovering it.
 *
 * MATERIAL: the matrix has one job, which is to be readable at a glance, so
 * the state is carried by DEPTH before it is carried by colour — a capability
 * you hold sits on a raised disc, a capability you do not is a hole drilled in
 * the plate. That is the same language the shipment rail uses for a leg that
 * has run versus one that has not, and it survives being looked at from the
 * back of a room in a way that two shades of green do not. The saved lanes
 * carry their rate the same way every other figure in this product is carried:
 * mono, in a channel, with its basis attached.
 *
 * Everything drawn here reads from persisted state, so every panel that does
 * is gated on `useHydrated()` behind a height-matched skeleton. Without the
 * gate the page renders the default member on the server, then the viewer's
 * real choice a frame later, and the whole layout jumps on every reload.
 */

/* ══════════════════════════════════════════════════════════════════════════
   CAPABILITIES
   ══════════════════════════════════════════════════════════════════════════
   The four flags on CustomerRole['can'], each with the sentence a customer
   would use for it. The flags themselves are the source of truth — this only
   supplies the English, so a role gaining a capability in data/org.ts shows
   up here without anything being edited.
   ══════════════════════════════════════════════════════════════════════════ */

interface CapabilityCopy {
  key: keyof CustomerRole['can']
  label: string
  sentence: string
}

const CAPABILITIES: readonly CapabilityCopy[] = [
  {
    key: 'request',
    label: 'Raise requests',
    sentence: 'Search rates, raise a request for quotation with partners, and start a booking.',
  },
  {
    key: 'award',
    label: 'Award and commit',
    sentence: 'Pick a partner response and commit the company to a freight contract at those terms.',
  },
  {
    key: 'finance',
    label: 'Open the money',
    sentence: 'See credit limits, invoices, payment status and factoring advances.',
  },
  {
    key: 'manageProfile',
    label: 'Manage the company profile',
    sentence: 'Change company details, upload licences and answer verification requests.',
  },
]

/* ══════════════════════════════════════════════════════════════════════════
   PREFERENCES
   ══════════════════════════════════════════════════════════════════════════ */

type DigestFrequency = 'DAILY' | 'WEEKLY' | 'OFF'

const CONTACT_OPTIONS: Array<{ value: PreferredContactMethod; label: string }> = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
]

const DIGEST_OPTIONS: Array<{ value: DigestFrequency; label: string }> = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'OFF', label: 'Off' },
]

/* ══════════════════════════════════════════════════════════════════════════
   THE PAGE
   ══════════════════════════════════════════════════════════════════════════ */

export function ProfileWorkspace() {
  const hydrated = useHydrated()
  const member = useActingMember()
  const role = CUSTOMER_ROLES[member.role]

  /**
   * One `useCan` per capability, in a fixed order.
   *
   * Written out rather than mapped over CAPABILITIES because these are hooks:
   * a loop would make the call order depend on the array, which is exactly
   * the rule React counts on. The verdicts also carry the reason string —
   * "who can do this instead" — so nothing here recomputes the holders.
   */
  const verdicts: Record<keyof CustomerRole['can'], ReturnType<typeof useCan>> = {
    request: useCan('request'),
    award: useCan('award'),
    finance: useCan('finance'),
    manageProfile: useCan('manageProfile'),
  }

  const allowedCount = CAPABILITIES.filter((capability) => verdicts[capability.key].allowed).length

  const watchlist = useOrgStore((s) => s.watchlist)
  const toggleWatchlist = useOrgStore((s) => s.toggleWatchlist)

  // Filtered against RATE_GRID rather than read straight off the watchlist:
  // only a lane with a published rate row has anything to show, and a saved
  // id with no row behind it would render an empty line with no explanation.
  const watched = useMemo(() => RATE_GRID.filter((r) => watchlist.includes(r.laneId)), [watchlist])
  const available = useMemo(() => RATE_GRID.filter((r) => !watchlist.includes(r.laneId)), [watchlist])

  /* Preferences are local, and stay local. See the notice on the panel. */
  const [milestoneAlerts, setMilestoneAlerts] = useState(true)
  const [rateAlerts, setRateAlerts] = useState(true)
  const [exceptionAlerts, setExceptionAlerts] = useState(true)
  const [contact, setContact] = useState<PreferredContactMethod>('EMAIL')
  const [digest, setDigest] = useState<DigestFrequency>('WEEKLY')

  return (
    <PageShell
      title="Your profile"
      description="The account you are acting as, what it is allowed to do, and the lanes you have saved."
      notice={`${DEMO.financialNotice} No sign-in is used in this demo — the acting person is chosen in the top bar and every permission below is simulated.`}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* ══ 1 · ACCOUNT ══════════════════════════════════════════════ */}
          {!hydrated ? (
            <Skeleton className="h-[268px] rounded-panel" />
          ) : (
            <Panel className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start gap-4">
                {/* Initials stamped into the plate — the same recessed disc the
                    party chips use, so "a person" is one object across the
                    product rather than a coloured circle per module. */}
                <span
                  className="pw-rail flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-mono text-[18px] font-medium text-text-muted"
                  aria-hidden
                >
                  {member.initials}
                </span>

                <div className="min-w-0 flex-1">
                  <h2 className="pw-plate-title text-[19px] leading-tight">{member.name}</h2>
                  <p className="mt-0.5 text-data text-text-muted">
                    {member.title} · {ORGANISATION.shortName}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge tone="signal">{role.label}</StatusBadge>
                    <span className="pw-id text-micro text-text-faint">{member.id}</span>
                  </div>
                </div>
              </div>

              <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <ContactRow icon={<Mail className="h-3 w-3" aria-hidden />} label="Email" value={member.email} />
                <ContactRow
                  icon={<Phone className="h-3 w-3" aria-hidden />}
                  label="Phone"
                  value={member.phone ?? 'Not on file'}
                  mono={Boolean(member.phone)}
                />
              </dl>

              {/* A joint in the plate, not a rule in a document. */}
              <div className="pw-groove mt-5 pt-3.5">
                <CardHeading>Authority</CardHeading>
                <p className="mt-1.5 text-data leading-relaxed text-text">{member.authorityScope ?? role.summary}</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-text-muted">{role.summary}</p>
              </div>
            </Panel>
          )}

          {/* ══ 2 · WHAT YOU CAN DO ══════════════════════════════════════ */}
          {!hydrated ? (
            <Skeleton className="h-[392px] rounded-panel" />
          ) : (
            <RecordPanel
              icon={<ShieldCheck className="h-4 w-4 shrink-0 text-signal" aria-hidden />}
              title="What you can do"
              meta={
                <span>
                  As {role.label} · <span className="pw-readout">{allowedCount}</span> of{' '}
                  <span className="pw-readout">{CAPABILITIES.length}</span> allowed
                </span>
              }
              footnote={
                <>
                  <span className="font-medium text-text">Change person in the top bar</span> — the avatar beside the
                  search field lists all {count(ORGANISATION.members.length)} people at {ORGANISATION.shortName}.
                  Switching changes what you may approve, never what you may see, and no screen disappears.
                </>
              }
            >
              <ul>
                {CAPABILITIES.map((capability) => {
                  const verdict = verdicts[capability.key]

                  return (
                    <li
                      key={capability.key}
                      className="pw-groove flex items-start gap-3 px-5 py-3.5 first:border-t-0 first:shadow-none"
                    >
                      {/* Depth carries the state before colour does: a raised
                          disc for a capability you hold, a drilled socket for
                          one you do not. */}
                      <span
                        className={cn(
                          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                          verdict.allowed ? 'pw-elev-0 bg-signal/14 text-signal' : 'pw-rail text-text-faint',
                        )}
                        aria-hidden
                      >
                        {verdict.allowed ? <Check className="h-3.5 w-3.5" /> : <Lock className="h-3 w-3" />}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span
                            className={cn(
                              'pw-plate-title text-data',
                              !verdict.allowed && 'text-text-muted',
                            )}
                          >
                            {capability.label}
                          </span>
                          <StatusBadge tone={verdict.allowed ? 'signal' : 'muted'}>
                            {verdict.allowed ? 'Allowed' : 'Not yours'}
                          </StatusBadge>
                        </div>

                        <p className="mt-1 text-[12px] leading-relaxed text-text-muted">{capability.sentence}</p>

                        {/* The reason comes from useCan, which already knows
                            who in the organisation holds the capability. A
                            refusal with no name attached just reads broken. */}
                        {verdict.reason && (
                          <p className="pw-rail mt-2 flex items-start gap-2 rounded-chip px-2.5 py-1.5 text-micro leading-relaxed text-text-muted">
                            <ShieldCheck className="mt-px h-3 w-3 shrink-0 text-amber" aria-hidden />
                            {verdict.reason}
                          </p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </RecordPanel>
          )}

          {/* ══ 3 · SAVED LANES ══════════════════════════════════════════ */}
          {!hydrated ? (
            <Skeleton className="h-[520px] rounded-panel" />
          ) : (
            <RecordPanel
              title="Saved lanes"
              meta={`${count(watched.length)} on your rate terminal · this week, per 40HC`}
              action={
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <DemoNotice variant="badge">{DEMO.simulatedValues}</DemoNotice>
                  <Link
                    href={ROUTES.rateTerminal}
                    className="inline-flex items-center gap-1 rounded-chip text-micro font-medium text-signal hover:underline"
                  >
                    Open rate terminal
                    <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden />
                  </Link>
                </div>
              }
              /* A rate without its basis is the most misread number in this
                 product: an all-in port-to-port figure looks expensive next to
                 a base ocean-freight quote, and the two are not the same
                 thing. The basis travels with the figures, always. */
              footnote={
                <>
                  <span className="font-medium text-text">Basis</span> · {RATE_BASIS}.
                </>
              }
            >
              {watched.length === 0 ? (
                <EmptyState
                  title="No saved lanes"
                  description="Save the pairs you move regularly and their weekly rate lands here and on the rate terminal."
                  action={
                    <Link href={ROUTES.rateTerminal} className="text-data font-medium text-signal hover:underline">
                      Go to the rate terminal
                    </Link>
                  }
                />
              ) : (
                <ul>
                  {watched.map((row) => {
                    const origin = requirePort(row.originId)
                    const destination = requirePort(row.destinationId)
                    const cell = rateCell(row.laneId, '40HC')

                    return (
                      <li
                        key={row.laneId}
                        className="pw-groove flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-5 py-3.5 first:border-t-0 first:shadow-none"
                      >
                        <div className="min-w-0">
                          <LanePill origin={origin.name} destination={destination.name} />
                          <p className="mt-1 text-micro text-text-faint">
                            {transitRange(row.transitMinDays, row.transitMaxDays)} ·{' '}
                            {row.sailingsPerWeek === 1
                              ? 'weekly departure'
                              : `${count(row.sailingsPerWeek)} departures a week`}{' '}
                            · <span className="pw-id">{origin.code}</span> →{' '}
                            <span className="pw-id">{destination.code}</span>
                          </p>
                        </div>

                        {/* Nothing in this cluster is `shrink-0`: at 360 the
                            reading, its basis and the remove control simply
                            wrap onto the next line. A row that refuses to
                            shrink is how a page ends up scrolling sideways. */}
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          {/* The reading, in a channel. A rate on the plate
                              face reads as a price somebody typed; the same
                              figure milled in reads as this week's number. */}
                          <span className="pw-rail flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-chip px-3 py-1.5">
                            <span className="pw-readout text-[15px] font-medium leading-none text-text">
                              {cell ? moneyUsd(cell.amountUsd) : '—'}
                            </span>
                            <span className="pw-stencil">40HC</span>
                            {cell && <RateTrendMark cell={cell} />}
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleWatchlist(row.laneId)}
                            className="inline-flex h-9 min-w-11 items-center justify-center gap-1 rounded-chip px-2 text-micro font-medium text-text-faint transition-colors hover:text-critical"
                            aria-label={`Remove ${origin.name} to ${destination.name} from your saved lanes`}
                          >
                            <Minus className="h-3 w-3 shrink-0" aria-hidden />
                            Remove
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              {available.length > 0 && (
                <div className="pw-groove px-5 py-4">
                  <CardHeading>Lanes you could add</CardHeading>
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {available.map((row) => {
                      const origin = requirePort(row.originId)
                      const destination = requirePort(row.destinationId)
                      const cell = rateCell(row.laneId, '40HC')

                      return (
                        <li key={row.laneId} className="min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleWatchlist(row.laneId)}
                            className="pw-tactile inline-flex min-h-9 max-w-full items-center gap-2 rounded-chip px-2.5 py-1.5 text-micro text-text"
                            aria-label={`Save ${origin.name} to ${destination.name} to your lanes`}
                          >
                            <Plus className="h-3 w-3 shrink-0 text-signal" aria-hidden />
                            <span className="min-w-0 truncate font-medium">
                              {origin.name} → {destination.name}
                            </span>
                            {cell && (
                              <span className="pw-readout shrink-0 text-text-muted">{moneyUsd(cell.amountUsd)}</span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </RecordPanel>
          )}
        </div>

        {/* ── Sidebar: preferences, then the dangerous one ──────────────── */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* ══ 4 · PREFERENCES ══════════════════════════════════════════ */}
          <Card className="p-5">
            <CardHeading icon={<Bell className="h-3.5 w-3.5" aria-hidden />}>Notifications</CardHeading>

            <div className="mt-4 flex flex-col gap-4">
              <PreferenceSwitch
                id="pref-milestones"
                label="Shipment milestones"
                description="Gate-in, sailed, arrived, delivered — the events that move a job forward."
                checked={milestoneAlerts}
                onChange={setMilestoneAlerts}
              />
              <PreferenceSwitch
                id="pref-exceptions"
                label="Exceptions on your shipments"
                description="Raised the moment a cutoff, a hold or a delay puts a shipment at risk."
                checked={exceptionAlerts}
                onChange={setExceptionAlerts}
              />
              <PreferenceSwitch
                id="pref-rates"
                label="Rate movement on saved lanes"
                description="When this week's figure moves against the lanes above."
                checked={rateAlerts}
                onChange={setRateAlerts}
              />
            </div>

            <div className="pw-groove mt-5 flex flex-col gap-4 pt-4">
              <div className="min-w-0">
                <p className="pw-stencil mb-1.5">How we reach you</p>
                <SegmentedControl<PreferredContactMethod>
                  size="sm"
                  ariaLabel="Preferred contact method"
                  options={CONTACT_OPTIONS}
                  value={contact}
                  onChange={setContact}
                  className="max-w-full"
                />
              </div>

              <div className="min-w-0">
                <p className="pw-stencil mb-1.5">Rate digest</p>
                <SegmentedControl<DigestFrequency>
                  size="sm"
                  ariaLabel="Rate digest frequency"
                  options={DIGEST_OPTIONS}
                  value={digest}
                  onChange={setDigest}
                  className="max-w-full"
                />
              </div>
            </div>

            {/* Said out loud rather than implied. A control that looks like it
                saved and did not is worse than no control at all. */}
            <p className="pw-groove mt-4 pt-2.5 text-micro leading-relaxed text-text-faint">
              These controls are live but not persisted in this demo — they hold their setting while you are on the
              page and return to these defaults on reload. Nothing is sent anywhere.
            </p>
          </Card>

          {/* ══ 5 · RESET ════════════════════════════════════════════════ */}
          <ResetDemoCard />
        </div>
      </div>
    </PageShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   PIECES
   ══════════════════════════════════════════════════════════════════════════ */

function ContactRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="pw-stencil flex items-center gap-1.5">
        {icon}
        {label}
      </dt>
      <dd className={cn('mt-1 truncate text-data text-text', mono && 'pw-readout')}>{value}</dd>
    </div>
  )
}

/**
 * A real switch: a button with `role="switch"`, not a styled div.
 *
 * The label is associated rather than decorative so the hit target includes
 * the words, and the motion is a CSS transition — globals.css already zeroes
 * every transition under `prefers-reduced-motion`, so this needs no JS gate.
 *
 * The track is a milled channel and the knob is the one raised object in it,
 * which is the same physics as the segmented control and the meter: off is a
 * hole, on is the channel filled and the knob riding at the far end.
 */
function PreferenceSwitch({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-data font-medium text-text">{label}</span>
        <span className="mt-0.5 block text-micro leading-relaxed text-text-muted">{description}</span>
      </label>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full px-[3px] transition-colors',
          checked ? 'pw-elev-0 border border-signal bg-signal' : 'pw-rail',
        )}
      >
        <span
          className={cn(
            'h-3.5 w-3.5 rounded-full transition-transform',
            checked ? 'pw-stud translate-x-4 text-on-accent' : 'pw-stud translate-x-0 text-text-faint',
          )}
          aria-hidden
        />
      </button>
    </div>
  )
}
