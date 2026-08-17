'use client'

import { AlertTriangle, Building2, CheckCircle2, Lock, Route, ShieldCheck } from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'

import { DEMO } from '@/data/copy'
import { ORGANISATION, activePortPairs, kybProgress } from '@/data/org'
import { requirePort } from '@/data/ports'
import { count } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useHydrated } from '@/hooks/use-hydrated'
import { useCan } from '@/store/org-store'

import { PageShell } from '@/components/app/app-shell'
import {
  Chip,
  DataRow,
  EmptyState,
  InstrumentRail,
  Meter,
  MotionButton,
  Skeleton,
  StatusBadge,
} from '@/components/ui/primitives'
import { DateStamp, LanePill } from '@/components/ui/freight'
// The account-module layout kit. It lives in `components/finance/` because
// that is where five of its callers already import it from, and it is
// module-neutral: this profile is one of the screens it was extracted for.
import { GateNotice, RecordPanel } from '@/components/finance/pieces'

import { BusinessDocuments } from './business-documents'
import { BusinessPeople } from './business-people'
import { BusinessRewards } from './business-rewards'
import { ExpiryClock } from './expiry-clock'
import {
  KYB_STATUS_LABEL,
  KYB_STATUS_TONE,
  PORT_PAIR_LABEL,
  PORT_PAIR_MEANING,
  PORT_PAIR_TONE,
  attentionItems,
  blockingKybItem,
  membersWhoCan,
  portPairsByStatus,
} from './business-status'

/**
 * THE BUSINESS PROFILE
 * ══════════════════════════════════════════════════════════════════════════
 * Apex Industrial's own record: who it is, what has been verified, which
 * lanes it may book on, who works here, what it has earned and which
 * licences are running out.
 *
 * The section order is the argument, and it changed with this pass. The page
 * used to open on the registered address and a progress meter — a settings
 * page, and settings pages are read once. It opens on what is WRONG now: the
 * outstanding items, and what each of them stops. Identity and the full
 * verification record follow, because they are the evidence behind that list
 * rather than the reason anyone came.
 *
 * MATERIAL: the attention plate is the one surface on this page that is
 * raised — `RecordPanel emphasis="amber"` puts it at --elev-2 with a tinted
 * hairline while every other plate stays at --elev-1. Elevation is the
 * emphasis; the tint only says which kind of problem it is. Everything that
 * has already cleared stays deliberately quiet, because a page where the
 * verified rows shout as loudly as the broken ones has not prioritised
 * anything.
 *
 * Without this module the two facts that actually cost the customer — an AD
 * code still in review, holding the proceeds on every export from that
 * gateway, and a lapsed product licence — live nowhere in the product, and
 * the first anyone hears of either is on the day the money does not arrive.
 */
export function BusinessProfile() {
  const hydrated = useHydrated()
  const manage = useCan('manageProfile')

  const attention = useMemo(() => attentionItems(), [])
  const progress = kybProgress()
  const active = activePortPairs()
  const laneGroups = useMemo(() => portPairsByStatus(), [])
  const profileOwners = useMemo(() => membersWhoCan('manageProfile'), [])

  function chaseOutstanding() {
    toast.success('OUTSTANDING ITEMS CHASED', {
      description: `${count(attention.length)} item${attention.length === 1 ? '' : 's'} flagged to PortWhizz onboarding for ${ORGANISATION.shortName}. Simulated in this demo — nothing was sent.`,
      duration: 8_000,
    })
  }

  return (
    <PageShell
      title={
        <span className="flex flex-wrap items-center gap-3">
          {ORGANISATION.name}
          <StatusBadge tone={progress.complete ? 'signal' : 'amber'}>
            {count(progress.verified)} of {count(progress.total)} verified
          </StatusBadge>
        </span>
      }
      description={
        <>
          <span className="pw-id">{ORGANISATION.id}</span> · {ORGANISATION.shortName} · {ORGANISATION.industry}
        </>
      }
      actions={
        /* Reads the acting member out of persisted state, so it holds a
           button-sized placeholder rather than rendering an enabled control
           that turns disabled a frame later. */
        hydrated ? (
          <MotionButton
            variant={manage.allowed ? 'primary' : 'outline'}
            size="md"
            disabled={!manage.allowed}
            title={manage.reason ?? undefined}
            onClick={chaseOutstanding}
          >
            {manage.allowed ? 'Chase outstanding items' : 'Profile rights needed'}
          </MotionButton>
        ) : (
          <Skeleton className="h-9 w-[188px]" />
        )
      }
      notice={`${DEMO.simulatedValues} Verification states, lane enablement, licence dates and reward balances are illustrative — a production profile would show what an onboarding check actually returned, and when.`}
    >
      <div className="flex flex-col gap-5">
        {/* ══ 1 · WHO MAY ACT ═══════════════════════════════════════════ */}
        {/* A disabled button with no explanation is indistinguishable from a
            broken one, and "why can't I click this" is the whole point of the
            roles. `GateNotice` is the shared shape — its min-height matches
            this skeleton, so rehydration never nudges the plate below it. */}
        {hydrated ? (
          <GateNotice allowed={manage.allowed}>
            {manage.allowed ? (
              <>
                <span className="font-medium text-text">This profile is yours to change.</span> Verification details,
                company documents and the people on the account all sit with the finance role.
              </>
            ) : (
              <>
                <span className="font-medium text-text">Changing this profile is not yours to do.</span>{' '}
                {manage.reason} Switch person in the top bar to continue — everything on this page stays readable
                either way.
              </>
            )}
          </GateNotice>
        ) : (
          <Skeleton className="h-16 rounded-card" />
        )}

        {/* ══ 2 · WHAT IS WRONG ═════════════════════════════════════════ */}
        {/* The one raised plate on the page. Everything below it is at rest. */}
        <RecordPanel
          emphasis={attention.length > 0 ? 'amber' : undefined}
          icon={<AlertTriangle className="h-4 w-4 shrink-0 text-amber" aria-hidden />}
          title="Needs attention"
          meta={`${count(attention.length)} outstanding · worst first`}
          footnote={
            <>
              This is verification and company documents merged into one list, because the question behind both is the
              same — what is stopping a shipment. {profileOwners.map((m) => m.name).join(' or ')} can act on these; the
              full record for each sits in the sections below.
            </>
          }
        >
          {attention.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-6 w-6 text-signal" />}
              title="Nothing outstanding"
              description="Every verification check has cleared and no company document is out of date."
            />
          ) : (
            <ul>
              {attention.map((item) => (
                // The joint between rows is a groove — one dark pixel with one
                // lit pixel under it — rather than a hairline, which inside a
                // plate is a line drawn on a picture of a plate.
                <li key={item.id} className="pw-groove px-5 py-4 first:border-t-0 first:shadow-none">
                  <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="pw-plate-title text-panel leading-tight">{item.title}</span>
                        <StatusBadge tone={item.tone}>{item.statusLabel}</StatusBadge>
                        <Chip>{item.kindLabel}</Chip>
                      </div>
                      {item.reference && <p className="pw-id mt-1 text-micro text-text-faint">{item.reference}</p>}
                    </div>
                    {/* A measurement, in its own channel. */}
                    {item.expiresAt && <ExpiryClock expiresAt={item.expiresAt} className="shrink-0" />}
                  </div>

                  {/* The consequence and the next move, milled into the plate.
                      They are the reason the row is on this list at all, and
                      set as loose prose they read as a caption under a title. */}
                  <div className="pw-rail mt-3 rounded-card px-3.5 py-3">
                    <p className="flex items-start gap-2 text-[12px] leading-relaxed text-text-muted">
                      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" aria-hidden />
                      <span className="min-w-0">
                        <span className="pw-stencil">Blocks</span>{' '}
                        <span className="text-text-muted">{item.blocks}</span>
                      </span>
                    </p>
                    <p className="mt-1.5 pl-[22px] text-micro leading-relaxed text-text-faint">{item.nextStep}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </RecordPanel>

        {/* ══ 3 · THE RECORD ITSELF ═════════════════════════════════════ */}
        <RecordPanel
          icon={<Building2 className="h-4 w-4 shrink-0 text-signal" aria-hidden />}
          title="Registered identity"
          meta={<span className="pw-id">{ORGANISATION.id}</span>}
          footnote="The identity every booking, invoice and customs entry on this account is raised in. Changing it is a verification event rather than an edit — the checks below re-run against the new details."
        >
          {/* The four counts that describe the account, in a channel. Ticks
              off: these are four unrelated tallies, not a continuous scale,
              and draft marks under them would claim a graduation that is not
              being measured. */}
          <div className="px-5 pb-1 pt-4">
            <InstrumentRail
              ticks={false}
              ariaLabel="This account at a glance"
              readings={[
                {
                  label: 'Checks verified',
                  value: count(progress.verified),
                  unit: `of ${count(progress.total)}`,
                  tone: progress.complete ? 'signal' : 'amber',
                  hint: progress.complete ? 'All cleared' : 'Listed above',
                },
                {
                  label: 'Lanes bookable',
                  value: count(active.length),
                  unit: `of ${count(ORGANISATION.portPairs.length)}`,
                  tone: 'route',
                  hint: 'Documentation on file',
                },
                {
                  label: 'People',
                  value: count(ORGANISATION.members.length),
                  hint: 'On the account',
                },
                {
                  label: 'Documents',
                  value: count(ORGANISATION.documents.length),
                  hint: 'Licences, cover, registrations',
                },
              ]}
            />
          </div>

          <dl className="grid gap-x-8 px-5 py-3 sm:grid-cols-2">
            <DataRow label="Trading as" value={ORGANISATION.shortName} />
            <DataRow label="Industry" value={ORGANISATION.industry} />
            <DataRow label="Country" value={ORGANISATION.country} />
            <DataRow label="Account id" value={ORGANISATION.id} mono />
            <DataRow
              label="Registered address"
              value={ORGANISATION.registeredAddress}
              className="sm:col-span-2"
            />
          </dl>

          <div className="pw-groove px-5 pb-4 pt-3.5">
            <Meter
              label={`${count(progress.verified)} of ${count(progress.total)} checks verified`}
              value={progress.verified}
              max={progress.total}
              tone={progress.complete ? 'signal' : 'amber'}
            />
            <p className="mt-2.5 text-micro leading-relaxed text-text-muted">
              {progress.complete
                ? 'Every check on this account has cleared.'
                : `${count(progress.total - progress.verified)} check${
                    progress.total - progress.verified === 1 ? '' : 's'
                  } outstanding. Each one is listed above with what it is holding up.`}
            </p>
          </div>
        </RecordPanel>

        {/* ══ 4 · VERIFICATION ══════════════════════════════════════════ */}
        <RecordPanel
          icon={<ShieldCheck className="h-4 w-4 shrink-0 text-signal" aria-hidden />}
          title="Verification"
          meta="Checks held against the account, and what each one opens up"
        >
          <ul>
            {ORGANISATION.kyb.map((item) => (
              <li
                key={item.id}
                className="pw-groove flex flex-wrap items-start justify-between gap-x-6 gap-y-2.5 px-5 py-3.5 first:border-t-0 first:shadow-none"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className="pw-plate-title text-data">{item.label}</span>
                    <span className="pw-id text-micro text-text-faint">{item.value}</span>
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-text-muted">
                    <span className="pw-stencil">Unlocks</span> {item.unlocks}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {item.verifiedAt ? (
                    <span className="text-right">
                      <DateStamp iso={item.verifiedAt} className="text-text-muted" />
                      <span className="pw-stencil block">Verified</span>
                    </span>
                  ) : (
                    <span className="text-micro text-text-faint">No date yet</span>
                  )}
                  <StatusBadge tone={KYB_STATUS_TONE[item.status]}>{KYB_STATUS_LABEL[item.status]}</StatusBadge>
                </div>
              </li>
            ))}
          </ul>
        </RecordPanel>

        {/* ══ 5 · TRADING LANES ═════════════════════════════════════════ */}
        <RecordPanel
          icon={<Route className="h-4 w-4 shrink-0 text-signal" aria-hidden />}
          title="Trading lanes"
          meta={`${count(active.length)} of ${count(ORGANISATION.portPairs.length)} open for booking`}
          footnote="A lane is documentation, not a schedule — PortWhizz coordinates the booking, carriers and terminals move the cargo. Rates for a lane that is not yet open can still be searched; only the booking is held."
        >
          {laneGroups.map((group, groupIndex) => (
            <section key={group.status}>
              {/* The group heading is a recessed band across the plate: it
                  names a region of the instrument rather than starting a new
                  document section. The first band sits directly under the
                  panel header, which already carries that joint — cutting a
                  second one there would draw the line twice. */}
              <h4
                className={cn(
                  'pw-groove flex flex-wrap items-center gap-2.5 bg-raised-2/50 px-5 py-2',
                  groupIndex === 0 && 'border-t-0 shadow-none',
                )}
              >
                <StatusBadge tone={PORT_PAIR_TONE[group.status]}>{PORT_PAIR_LABEL[group.status]}</StatusBadge>
                <span className="text-micro text-text-muted">{PORT_PAIR_MEANING[group.status]}</span>
              </h4>

              <ul>
                {group.pairs.map((pair) => {
                  const blocker = blockingKybItem(pair)

                  return (
                    <li
                      key={pair.id}
                      className="pw-groove flex flex-wrap items-start justify-between gap-x-6 gap-y-2 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <LanePill
                          origin={requirePort(pair.originId).name}
                          destination={requirePort(pair.destinationId).name}
                        />
                        {pair.note && (
                          <p className="mt-1 max-w-xl text-micro leading-relaxed text-text-muted">{pair.note}</p>
                        )}
                        {blocker && (
                          <p className="pw-elev-0 mt-1.5 inline-flex items-center gap-1.5 rounded-chip border border-amber/30 bg-amber/10 px-2 py-1 text-micro text-amber">
                            <Lock className="h-3 w-3 shrink-0" aria-hidden />
                            Held by {blocker.label} · {KYB_STATUS_LABEL[blocker.status].toLowerCase()}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 text-right">
                        {pair.enabledAt ? (
                          <>
                            <DateStamp iso={pair.enabledAt} className="text-text-muted" />
                            <span className="pw-stencil block">Enabled</span>
                          </>
                        ) : (
                          <span className="text-micro text-text-faint">Not enabled</span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </RecordPanel>

        {/* ══ 6 · PEOPLE ════════════════════════════════════════════════ */}
        <BusinessPeople />

        {/* ══ 7 · REWARDS ═══════════════════════════════════════════════ */}
        <BusinessRewards />

        {/* ══ 8 · COMPANY DOCUMENTS ═════════════════════════════════════ */}
        <BusinessDocuments />
      </div>
    </PageShell>
  )
}
