'use client'

import Link from 'next/link'
import { AlertTriangle, Boxes, FileText, Ship, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

import { CLEARANCE, DEMO } from '@/data/copy'
import { getParty } from '@/data/parties'
import { computeTotals, lineMargin } from '@/data/quotes'
import { formatDate, formatStamp, moneyShortInr, volumeCbm, weightKg } from '@/lib/format'
import {
  APPLICABILITY_LABEL,
  CHARGE_BASIS_LABEL,
  CHARGE_SOURCE_LABEL,
  DOCUMENT_TYPE_LABEL,
  MODE_LABEL,
  PAYER_LABEL,
  RELEASE_TYPE_LABEL,
  SERVICE_SCOPE_LABEL,
  TAX_TREATMENT_LABEL,
  VGM_METHOD_LABEL,
} from '@/lib/lifecycle'
import { cn } from '@/lib/utils'
import { useFreightStore } from '@/store/freight-store'
import { useClosureChecklist } from '@/store/hooks'
import type { Booking, JobFile } from '@/types'

import {
  Button,
  Card,
  DataRow,
  DemoNotice,
  EmptyState,
  Panel,
  SectionHeader,
  StatPlate,
  StatusBadge,
} from '@/components/ui/primitives'
import {
  BookingStateBadge,
  ContainerStatusBadge,
  CountdownPill,
  DocStatusBadge,
  ExceptionStatusBadge,
  LanePill,
  MoneyCell,
  SeverityBadge,
} from '@/components/ui/freight'
import { CardHeading, FigureRail, RecordPanel } from '@/components/finance/pieces'
import { ROUTES } from '@/lib/routes'
import { ShipmentTimeline } from './timeline'

/**
 * THE SHIPMENT RECORD, TAB BY TAB
 * ══════════════════════════════════════════════════════════════════════════
 * Every panel here is the shared account-module kit (`components/finance/
 * pieces.tsx`) rather than a private copy of it: a plate with a groove under
 * its heading, readings sunk into a milled channel, and a basis strip along
 * the bottom saying what the figures above it are computed from. Eleven
 * panels in this file had each drawn their own header rule and their own
 * figure size, which is precisely how one product ends up looking like four.
 *
 * Nothing here picks its own shadow, and every figure is mono — this screen
 * is mostly tabular data, and numbers that shift width between two panels are
 * the fastest way to look unfinished.
 */

/** The four cutoffs, oldest first — the order they actually have to be met in. */
function cutoffList(booking: Booking): Array<{ label: string; at: string; why: string }> {
  return [
    {
      label: 'Shipping instruction',
      at: booking.cutoffs.shippingInstruction,
      why: 'What goes on the bill of lading',
    },
    { label: 'VGM', at: booking.cutoffs.vgm, why: 'No verified mass, no loading' },
    { label: 'Gate-in', at: booking.cutoffs.gateIn, why: 'The box has to be inside the terminal' },
    { label: 'Documentation', at: booking.cutoffs.documentation, why: 'Originals with the carrier' },
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
}

/* ══════════════════════════════════════════════════════════════════════════
   OVERVIEW
   ══════════════════════════════════════════════════════════════════════════ */

export function OverviewTab({ file }: { file: JobFile }) {
  const { job, booking, containers, cargo, costSummary, openExceptions, owner, origin, destination } = file

  const containerSummary =
    containers.length > 0
      ? `${containers.length} × ${containers[0]!.isoType}`
      : cargo
        ? `${cargo.packageCount} packages`
        : '—'

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-3">
      <RecordPanel
        className="lg:col-span-2"
        icon={<Ship className="h-4 w-4 shrink-0 text-route" aria-hidden />}
        title="Shipment"
        meta={job.reference}
        bodyClassName="grid gap-x-6 px-5 py-2 sm:grid-cols-2"
        footnote="What was agreed and who is running it. The commercial detail is on the Invoice tab; the events are on the Timeline."
      >
        <div className="divide-y divide-hairline/60">
          <DataRow label="Route" value={<LanePill origin={origin.name} destination={destination.name} size="sm" />} />
          <DataRow label="Mode" value={MODE_LABEL[job.mode]} />
          <DataRow label="Service scope" value={SERVICE_SCOPE_LABEL[job.serviceScope]} />
          <DataRow label="Incoterm" value={job.incoterm} mono />
          <DataRow label="Cargo" value={containerSummary} mono />
        </div>
        <div className="divide-y divide-hairline/60">
          <DataRow label="Vessel" value={booking ? `${booking.vessel ?? '—'} · ${booking.voyage ?? ''}` : '—'} mono />
          <DataRow label="ETA" value={booking ? formatDate(booking.eta) : '—'} mono />
          <DataRow label="Free time" value={booking ? `${booking.freeTimeDays} days` : '—'} mono />
          <DataRow label="Operations owner" value={owner.name} />
          <DataRow
            label="Open exceptions"
            value={
              openExceptions.length > 0 ? (
                <StatusBadge tone="critical">{openExceptions.length}</StatusBadge>
              ) : (
                <StatusBadge tone="signal">None</StatusBadge>
              )
            }
          />
        </div>
      </RecordPanel>

      {/* ── What this shipment is billed at ───────────────────────────
          This tab is mounted on the customer's own shipment file
          (components/bookings/booking-detail.tsx), whose header states the
          rule: a customer sees what was agreed and what has happened, and
          buy rates and partner margin are not theirs. So the panel shows the
          sell side and the basis it is calculated on — `costSummary` also
          carries `actualCostInr`, `marginInr` and `marginPct`, and none of
          those three belong on a screen the buyer opens. */}
      <RecordPanel
        title="Charges"
        meta={DEMO.valueSuffix}
        footnote={
          costSummary.basis === 'FINAL'
            ? 'Final — every partner bill behind this shipment has arrived, so the figure will not move.'
            : 'Accrued — some partner bills are still outstanding, so the figure can still move.'
        }
      >
        <FigureRail
          columns={2}
          figures={[
            {
              label: 'Agreed total',
              value: moneyShortInr(costSummary.sellInr),
              strong: true,
              sub: 'What you are billed, from the accepted quotation',
            },
            {
              label: 'Basis',
              value: costSummary.basis.toLowerCase(),
              tone: costSummary.basis === 'FINAL' ? 'signal' : 'amber',
              sub: 'Whether the figure can still change',
            },
          ]}
        />
        <div className="px-5 pb-4">
          <div className="divide-y divide-hairline/60">
            <DataRow label="Service scope" value={SERVICE_SCOPE_LABEL[job.serviceScope]} />
            <DataRow label="Mode" value={MODE_LABEL[job.mode]} />
          </div>
        </div>
      </RecordPanel>

      {/* ── The cutoffs, which are what actually costs a sailing ──────── */}
      {booking && (
        <RecordPanel
          className="lg:col-span-3"
          title="Cutoffs"
          meta="Counting against the demo clock"
          footnote="A cutoff is the carrier's, not ours. Miss one and the box rolls to the next sailing — which is a week, not a day."
          bodyClassName="grid gap-3 px-5 py-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {cutoffList(booking).map((cutoff) => (
            <div key={cutoff.label} className="pw-rail min-w-0 rounded-card px-3.5 py-3">
              <p className="pw-stencil truncate">{cutoff.label}</p>
              <p className="pw-readout mt-1.5 text-data">{formatStamp(cutoff.at)}</p>
              <div className="mt-2">
                <CountdownPill deadline={cutoff.at} live />
              </div>
              <p className="mt-2 text-micro leading-snug text-text-faint">{cutoff.why}</p>
            </div>
          ))}
        </RecordPanel>
      )}

      {/* ── External customs coordination — status ONLY ───────────────── */}
      <RecordPanel
        className="lg:col-span-3"
        icon={<ShieldCheck className="h-4 w-4 shrink-0 text-violet" aria-hidden />}
        title={CLEARANCE.sectionLabel}
        bodyClassName="px-5 py-4"
      >
        <p className="max-w-3xl text-data leading-relaxed text-text-muted">{CLEARANCE.explainer}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <StatusBadge tone="violet">{job.clearanceCoordination ?? 'No clearance dependency'}</StatusBadge>
          {job.clearancePartnerId && (
            <span className="text-micro text-text-faint">
              Partner: {getParty(job.clearancePartnerId)?.name ?? '—'}
            </span>
          )}
          {job.clearanceUpdatedAt && (
            <span className="pw-readout text-micro text-text-faint">
              Updated {formatStamp(job.clearanceUpdatedAt)}
            </span>
          )}
        </div>
      </RecordPanel>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   TIMELINE
   ══════════════════════════════════════════════════════════════════════════ */

export function TimelineTab({ file }: { file: JobFile }) {
  const setMilestoneVisibility = useFreightStore((s) => s.setMilestoneVisibility)

  return (
    <Panel className="min-w-0 px-4 py-4 sm:px-5">
      <ShipmentTimeline
        milestones={file.milestones}
        onToggleVisibility={(id, visible) => {
          setMilestoneVisibility(id, visible)
          toast.success(visible ? 'Shared with customer' : 'Hidden from customer', {
            description: 'The change is recorded in the shipment audit trail.',
          })
        }}
      />
    </Panel>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   BOOKING
   ══════════════════════════════════════════════════════════════════════════ */

export function BookingTab({ file }: { file: JobFile }) {
  const { booking } = file

  if (!booking) {
    return (
      <Panel className="p-8">
        <EmptyState
          title="No booking yet"
          description="A booking is raised once the customer accepts the quotation."
        />
      </Panel>
    )
  }

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <RecordPanel title="Carriage" action={<BookingStateBadge state={booking.state} />} bodyClassName="px-5 py-1">
        <div className="divide-y divide-hairline/60">
          <DataRow label="Carrier" value={booking.carrierName} />
          <DataRow label="Booking number" value={booking.bookingNumber} mono />
          <DataRow label="Vessel" value={booking.vessel ?? booking.flightNumber ?? '—'} />
          <DataRow label="Voyage" value={booking.voyage ?? '—'} mono />
          <DataRow label="Service" value={booking.service} />
          <DataRow label="MBL" value={booking.mbl ?? '—'} mono />
          <DataRow label="HBL" value={booking.hbl ?? '—'} mono />
          <DataRow label="Release type" value={RELEASE_TYPE_LABEL[booking.releaseType]} />
        </div>
      </RecordPanel>

      <RecordPanel title="Schedule" bodyClassName="px-5 py-1">
        <div className="divide-y divide-hairline/60">
          <DataRow label="ETD" value={formatDate(booking.etd)} mono />
          <DataRow label="ETA" value={formatDate(booking.eta)} mono />
          <DataRow
            label="Original ETA"
            value={
              booking.eta !== booking.originalEta ? (
                <span className="text-amber">{formatDate(booking.originalEta)} — revised</span>
              ) : (
                formatDate(booking.originalEta)
              )
            }
            mono
          />
          <DataRow label="Origin terminal" value={booking.originTerminal} />
          <DataRow label="Destination terminal" value={booking.destinationTerminal} />
          <DataRow label="Empty pickup depot" value={booking.emptyPickupDepot ?? '—'} />
          <DataRow label="Free time" value={`${booking.freeTimeDays} days`} mono />
          <DataRow label="Free time expiry" value={formatDate(booking.freeTimeExpiry)} mono />
        </div>
      </RecordPanel>

      <RecordPanel
        className="lg:col-span-2"
        title="Cutoffs"
        meta="Counting against the demo clock"
        bodyClassName="grid gap-3 px-5 py-4 sm:grid-cols-2 xl:grid-cols-4"
        footnote="A cutoff is the carrier's, not ours. Miss one and the box rolls to the next sailing."
      >
        {cutoffList(booking).map((cutoff) => (
          <div key={cutoff.label} className="pw-rail min-w-0 rounded-card px-3.5 py-3">
            <p className="pw-stencil truncate">{cutoff.label}</p>
            <p className="pw-readout mt-1.5 text-data">{formatStamp(cutoff.at)}</p>
            <div className="mt-2">
              <CountdownPill deadline={cutoff.at} live />
            </div>
          </div>
        ))}
      </RecordPanel>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   CARGO
   ══════════════════════════════════════════════════════════════════════════ */

export function CargoTab({ file }: { file: JobFile }) {
  const { containers, cargo } = file
  const submitVgm = useFreightStore((s) => s.submitVgm)
  const advanceContainer = useFreightStore((s) => s.advanceContainer)

  const vgmPendingCount = containers.filter((c) => c.vgmKg == null).length

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {cargo && (
        <RecordPanel
          title="Cargo declaration"
          meta="As declared on the enquiry"
          bodyClassName="grid gap-x-6 px-5 py-2 sm:grid-cols-2"
          footnote="What was declared is what the rate was built on. A commodity or a weight that changes changes the price."
        >
          <div className="divide-y divide-hairline/60">
            <DataRow label="Commodity" value={cargo.commodity} />
            <DataRow label="Packages" value={cargo.packageCount.toLocaleString('en-IN')} mono />
            <DataRow label="Gross weight" value={weightKg(cargo.grossWeightKg)} mono />
            <DataRow label="Volume" value={volumeCbm(cargo.volumeCbm)} mono />
          </div>
          <div className="divide-y divide-hairline/60">
            <DataRow label="Dangerous goods" value={cargo.dangerousGoods ? 'Yes' : 'No'} />
            <DataRow
              label="Temperature controlled"
              value={cargo.temperatureControlled ? cargo.temperatureSetPoint ?? 'Yes' : 'No'}
            />
            <DataRow label="Special handling" value={cargo.specialHandling.join(', ').toLowerCase()} />
            <DataRow label="Marks and numbers" value={cargo.marksAndNumbers ?? '—'} mono />
          </div>
        </RecordPanel>
      )}

      {containers.length === 0 ? (
        <Panel className="p-8">
          <EmptyState icon={<Boxes className="h-5 w-5" />} title="No containers allocated yet" />
        </Panel>
      ) : (
        <>
          {vgmPendingCount > 0 && (
            <div className="pw-card flex items-start gap-3 border-amber/30 bg-amber/8 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden />
              <p className="text-data leading-relaxed text-text-muted">
                <span className="font-medium text-text">
                  {vgmPendingCount} container{vgmPendingCount === 1 ? '' : 's'} without a verified gross mass.
                </span>{' '}
                A box with no VGM does not get loaded — it is the cutoff that most often costs a sailing.
              </p>
            </div>
          )}

          <div className="grid min-w-0 gap-3 md:grid-cols-2">
            {containers.map((container) => {
              const vgmPending = container.vgmKg == null
              return (
                <Card key={container.number} className="min-w-0 overflow-hidden">
                  <div className="pw-groove-b flex items-start justify-between gap-3 border-b border-hairline px-4 py-3">
                    <div className="min-w-0">
                      <p className="pw-id text-[15px] font-semibold text-text">{container.number}</p>
                      <p className="pw-readout mt-0.5 text-micro text-text-faint">{container.isoType}</p>
                    </div>
                    <ContainerStatusBadge status={container.status} />
                  </div>

                  <div className="px-4 py-1">
                    <div className="divide-y divide-hairline/60">
                      <DataRow label="Seal number" value={container.sealNumber} mono />
                      <DataRow label="Gross weight" value={weightKg(container.grossWeightKg)} mono />
                      <DataRow
                        label="VGM"
                        value={
                          vgmPending ? (
                            <StatusBadge tone="amber">Pending confirmation</StatusBadge>
                          ) : (
                            weightKg(container.vgmKg!)
                          )
                        }
                        mono={!vgmPending}
                      />
                      <DataRow label="VGM method" value={VGM_METHOD_LABEL[container.vgmMethod]} />
                      <DataRow label="Volume" value={volumeCbm(container.volumeCbm)} mono />
                      <DataRow label="Packages" value={container.packageCount.toLocaleString('en-IN')} mono />
                    </div>
                  </div>

                  <div className="pw-groove flex flex-wrap gap-2 p-3">
                    {vgmPending && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          // A plausible weighbridge figure, derived rather than invented.
                          submitVgm(container.number, container.grossWeightKg + 140)
                          toast.success('VGM SUBMITTED', {
                            description: `${container.number} verified by weighbridge. Recorded against the shipment.`,
                          })
                        }}
                      >
                        Submit VGM
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        advanceContainer(container.number)
                        toast.success('Container status advanced')
                      }}
                    >
                      Advance status
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   DOCUMENTS
   ══════════════════════════════════════════════════════════════════════════ */

export function DocumentsTab({ file }: { file: JobFile }) {
  if (file.documents.length === 0) {
    return (
      <Panel className="p-8">
        <EmptyState icon={<FileText className="h-5 w-5" />} title="No documents yet" />
      </Panel>
    )
  }

  return (
    <RecordPanel
      icon={<FileText className="h-4 w-4 shrink-0 text-route" aria-hidden />}
      title="Freight documents"
      meta={`${file.documents.length} on file`}
      footnote="Every version is retained. A document marked customer-visible is one you can see from your own account."
    >
      <div className="pw-table-wrap min-w-0 rounded-none border-0">
        <table className="pw-table">
          <caption className="sr-only">Documents raised against this shipment</caption>
          <thead>
            <tr>
              <th scope="col">Document</th>
              <th scope="col">Type</th>
              <th scope="col">Version</th>
              <th scope="col">Status</th>
              <th scope="col">Created</th>
              <th scope="col">Updated</th>
              <th scope="col">Customer</th>
            </tr>
          </thead>
          <tbody>
            {file.documents.map((doc) => (
              <tr key={doc.id}>
                <td>
                  <span className="text-text">{doc.title}</span>
                  <span className="pw-id mt-0.5 block text-[10px] text-text-faint">{doc.id}</span>
                </td>
                <td className="whitespace-nowrap text-text-muted">{DOCUMENT_TYPE_LABEL[doc.type]}</td>
                <td className="pw-readout">v{doc.version}</td>
                <td>
                  <DocStatusBadge status={doc.status} />
                </td>
                <td className="pw-readout whitespace-nowrap text-micro text-text-faint">
                  {formatDate(doc.createdAt)}
                </td>
                <td className="pw-readout whitespace-nowrap text-micro text-text-faint">
                  {formatDate(doc.updatedAt)}
                </td>
                <td>
                  {doc.customerVisible ? (
                    <StatusBadge tone="route">Visible</StatusBadge>
                  ) : (
                    <span className="text-text-faint">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </RecordPanel>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   COSTS — operations view only; never mounted on the customer's shipment
   ══════════════════════════════════════════════════════════════════════════ */

export function CostsTab({ file }: { file: JobFile }) {
  const quote = file.acceptedQuote ?? file.quotes[0]
  const totals = quote ? computeTotals(quote.lines) : null

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <SectionHeader
        eyebrow={`${DEMO.quoteBuilderLabel} · ${DEMO.quoteBuilderSubLabel}`}
        title="Job costs"
        description="Accrued from the accepted quotation, matched against what vendors actually billed."
        action={
          quote && (
            <Button variant="outline" size="sm" asChild>
              <Link href={ROUTES.contracts}>View contracts</Link>
            </Button>
          )
        }
      />

      {/* ── Margin waterfall ──────────────────────────────────────────── */}
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatPlate label="Sell" value={moneyShortInr(file.costSummary.sellInr)} hint="What the customer is billed" />
        <StatPlate
          label="Accrued cost"
          value={moneyShortInr(file.costSummary.accruedCostInr)}
          hint="What the quote assumed"
        />
        <StatPlate
          label="Actual cost"
          value={moneyShortInr(file.costSummary.actualCostInr)}
          tone="amber"
          hint="What vendors have billed"
        />
        <StatPlate
          label={`Margin · ${file.costSummary.basis.toLowerCase()}`}
          value={moneyShortInr(file.costSummary.marginInr)}
          tone={file.costSummary.marginInr >= 0 ? 'signal' : 'critical'}
          hint="Sell less actual cost"
        />
      </div>

      {/* ── Charge lines ──────────────────────────────────────────────── */}
      {quote && (
        <RecordPanel
          title="Charge lines"
          meta={`${quote.id} · version ${quote.version}`}
          footnote="Exposure lines are shown but excluded from the total — they are a risk carried, not a charge raised."
        >
          <div className="pw-table-wrap min-w-0 rounded-none border-0">
            <table className="pw-table">
              <caption className="sr-only">Charge lines on the accepted quotation</caption>
              <thead>
                <tr>
                  <th scope="col">Code</th>
                  <th scope="col">Description</th>
                  <th scope="col">Basis</th>
                  <th scope="col" className="text-right">
                    Qty
                  </th>
                  <th scope="col" className="text-right">
                    Buy
                  </th>
                  <th scope="col" className="text-right">
                    Sell
                  </th>
                  <th scope="col" className="text-right">
                    Margin
                  </th>
                  <th scope="col">Payer</th>
                  <th scope="col">Source</th>
                  <th scope="col">Applicability</th>
                  <th scope="col">Tax</th>
                </tr>
              </thead>
              <tbody>
                {quote.lines.map((line) => {
                  const exposure = line.applicability === 'EXPOSURE_ONLY'
                  return (
                    <tr key={line.id} className={cn(exposure && 'opacity-70')}>
                      <td className="pw-id text-micro">{line.code}</td>
                      <td className="max-w-[220px] truncate">{line.description}</td>
                      <td className="whitespace-nowrap text-micro text-text-faint">{CHARGE_BASIS_LABEL[line.basis]}</td>
                      <td className="pw-readout text-right">{line.quantity}</td>
                      <td className="text-right">
                        <MoneyCell amount={line.buyRate} currency={line.currency} />
                      </td>
                      <td className="text-right">
                        <MoneyCell amount={line.sellRate} currency={line.currency} />
                      </td>
                      <td className="text-right">
                        {exposure ? (
                          <span className="text-micro text-amber">exposure</span>
                        ) : (
                          <MoneyCell amount={lineMargin(line)} currency={line.currency} signed />
                        )}
                      </td>
                      <td className="whitespace-nowrap text-micro text-text-faint">{PAYER_LABEL[line.payer]}</td>
                      <td className="whitespace-nowrap text-micro text-text-faint">{CHARGE_SOURCE_LABEL[line.source]}</td>
                      <td className="whitespace-nowrap text-micro">
                        <StatusBadge
                          tone={exposure ? 'amber' : line.applicability === 'CONDITIONAL' ? 'violet' : 'neutral'}
                        >
                          {APPLICABILITY_LABEL[line.applicability]}
                        </StatusBadge>
                      </td>
                      <td className="whitespace-nowrap text-micro text-text-faint">
                        {TAX_TREATMENT_LABEL[line.taxTreatment]}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {totals && (
                <tfoot>
                  <tr className="border-t border-hairline-strong">
                    <td colSpan={4} className="font-medium text-text">
                      Quoted total
                    </td>
                    <td className="text-right">
                      <MoneyCell amount={totals.buy} currency={quote.currency} />
                    </td>
                    <td className="text-right">
                      <MoneyCell amount={totals.sell} currency={quote.currency} />
                    </td>
                    <td className="text-right">
                      <MoneyCell amount={totals.margin} currency={quote.currency} signed />
                    </td>
                    <td colSpan={4} className="text-micro text-text-faint">
                      {totals.marginPct.toFixed(1)}% · {moneyShortInr(totals.marginInr)} at line FX
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </RecordPanel>
      )}

      {/* ── Vendor bills ──────────────────────────────────────────────── */}
      <VendorBillsPanel file={file} />

      {/* ── Closure ───────────────────────────────────────────────────── */}
      <ClosurePanel jobId={file.job.id} />

      <DemoNotice variant="block">{DEMO.financialNotice}</DemoNotice>
    </div>
  )
}

/**
 * JOB CLOSURE
 * ══════════════════════════════════════════════════════════════════════════
 * Closure is derived, never a button.
 *
 * Each check reads from the job file, so the product cannot claim a job is
 * ready to close while an exception is open or a vendor bill is unmatched.
 * A "Close job" button that ignores those is how a forwarder discovers an
 * unbilled cost three months later.
 */
function ClosurePanel({ jobId }: { jobId: string }) {
  const checks = useClosureChecklist(jobId)
  const done = checks.filter((c) => c.done).length
  const ready = done === checks.length

  return (
    <RecordPanel
      title="Closure checklist"
      meta="Derived from the job file"
      emphasis={ready ? 'signal' : undefined}
      action={
        <StatusBadge tone={ready ? 'signal' : 'amber'}>
          {done} of {checks.length} satisfied
        </StatusBadge>
      }
      footnote={
        ready
          ? 'Every condition is satisfied — this job can be closed and its margin is final.'
          : `${checks.length - done} condition${checks.length - done === 1 ? '' : 's'} outstanding. The job stays open until they clear — closure is a consequence of the work being finished, not a button.`
      }
    >
      <ul className="divide-y divide-hairline/60">
        {checks.map((check) => (
          <li key={check.label} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5">
            <span
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border',
                check.done
                  ? 'border-signal bg-signal text-on-accent shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.28)]'
                  : 'pw-recess border-hairline-strong bg-raised-2',
              )}
              aria-hidden
            >
              {check.done && (
                <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none">
                  <path
                    d="M1.5 5.2 3.8 7.5 8.5 2.5"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span className={cn('min-w-0 flex-1 text-data', check.done ? 'text-text' : 'text-text-muted')}>
              {check.label}
            </span>
            <span className="min-w-0 text-micro text-text-faint">{check.detail}</span>
          </li>
        ))}
      </ul>
    </RecordPanel>
  )
}

function VendorBillsPanel({ file }: { file: JobFile }) {
  const matchVendorBill = useFreightStore((s) => s.matchVendorBill)
  const disputeVendorBill = useFreightStore((s) => s.disputeVendorBill)

  if (file.vendorBills.length === 0) {
    return (
      <Panel className="p-8">
        <EmptyState title="No vendor bills recorded" />
      </Panel>
    )
  }

  return (
    <RecordPanel
      title="Vendor bills"
      meta={`${file.vendorBills.length} on this job`}
      footnote="Accrued is what the quote assumed. Billed is what arrived. The gap is the job’s real margin risk."
    >
      <div className="pw-table-wrap min-w-0 rounded-none border-0">
        <table className="pw-table">
          <caption className="sr-only">Vendor bills recorded against this job</caption>
          <thead>
            <tr>
              <th scope="col">Vendor</th>
              <th scope="col">Bill</th>
              <th scope="col" className="text-right">
                Accrued
              </th>
              <th scope="col" className="text-right">
                Billed
              </th>
              <th scope="col" className="text-right">
                Variance
              </th>
              <th scope="col">Status</th>
              <th scope="col" className="text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {file.vendorBills.map((bill) => {
              const variance = bill.billedAmount != null ? bill.billedAmount - bill.accruedAmount : null
              const settled = ['MATCHED', 'APPROVED', 'PAID'].includes(bill.status)
              return (
                <tr key={bill.id}>
                  <td className="whitespace-nowrap">{bill.vendorName}</td>
                  <td className="pw-id text-micro text-text-faint">{bill.billNumber}</td>
                  <td className="text-right">
                    <MoneyCell amount={bill.accruedAmount} currency={bill.currency} />
                  </td>
                  <td className="text-right">
                    {bill.billedAmount != null ? (
                      <MoneyCell amount={bill.billedAmount} currency={bill.currency} />
                    ) : (
                      <span className="text-text-faint">awaited</span>
                    )}
                  </td>
                  <td className="text-right">
                    {variance != null && Math.abs(variance) > 0.5 ? (
                      <MoneyCell amount={variance} currency={bill.currency} signed />
                    ) : (
                      <span className="text-text-faint">—</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge
                      tone={
                        bill.status === 'DISPUTED'
                          ? 'critical'
                          : settled
                            ? 'signal'
                            : bill.status === 'AWAITED'
                              ? 'neutral'
                              : 'amber'
                      }
                    >
                      {bill.status.replace(/_/g, ' ').toLowerCase()}
                    </StatusBadge>
                  </td>
                  <td className="text-right">
                    {!settled && bill.billedAmount != null && (
                      <span className="inline-flex gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            matchVendorBill(bill.id, 'Finance User')
                            toast.success('Vendor bill matched', {
                              description: `${bill.vendorName} · ${bill.billNumber}`,
                            })
                          }}
                        >
                          Match
                        </Button>
                        {bill.status !== 'DISPUTED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              disputeVendorBill(
                                bill.id,
                                'Variance above tolerance — supporting proof requested.',
                                'Finance User',
                              )
                              toast('Vendor bill disputed', {
                                description: `${bill.vendorName} · ${bill.billNumber}`,
                              })
                            }}
                          >
                            Dispute
                          </Button>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {file.vendorBills.some((b) => b.varianceNote) && (
        <div className="pw-groove px-5 py-3">
          <CardHeading className="mb-1.5">Variance notes</CardHeading>
          <ul className="flex flex-col gap-1">
            {file.vendorBills
              .filter((b) => b.varianceNote)
              .map((b) => (
                <li key={b.id} className="flex items-start gap-1.5 text-micro leading-relaxed text-text-muted">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber" aria-hidden />
                  <span>
                    <span className="text-text">{b.vendorName}:</span> {b.varianceNote}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </RecordPanel>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   EXCEPTIONS
   ══════════════════════════════════════════════════════════════════════════ */

export function ExceptionsTab({ file }: { file: JobFile }) {
  // `file.exceptions` is the whole queue on the job, internal ones included —
  // a vendor invoice mismatch names the job margin, a gate-in chase names the
  // partner being chased. This is a customer's own shipment file, so only the
  // records flagged for them reach it. Same rule as the milestone timeline.
  const exceptions = file.exceptions.filter((exc) => exc.customerVisible)

  if (exceptions.length === 0) {
    return (
      <Panel className="p-8">
        <EmptyState title="No exceptions on this shipment" description="Nothing has gone wrong here." />
      </Panel>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {exceptions.map((exc) => (
        <RecordPanel
          key={exc.id}
          title={exc.title}
          meta={exc.id}
          emphasis={exc.status === 'RESOLVED' ? undefined : exc.severity === 'CRITICAL' ? 'critical' : 'amber'}
          bodyClassName="px-5 py-4"
          action={
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <SeverityBadge severity={exc.severity} />
              <ExceptionStatusBadge status={exc.status} />
              {exc.deadline && exc.status !== 'RESOLVED' && <CountdownPill deadline={exc.deadline} />}
            </div>
          }
        >
          <p className="text-data leading-relaxed text-text-muted">{exc.businessImpact}</p>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-data text-text">
            <span className="pw-stencil">Recommended</span>
            {exc.recommendedAction}
          </p>
          {exc.resolutionNote && (
            <p className="pw-card mt-3 border-signal/25 bg-signal/8 px-3 py-2 text-micro leading-relaxed text-text-muted">
              <span className="font-medium text-signal">Resolved:</span> {exc.resolutionNote}
            </p>
          )}
        </RecordPanel>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   AUDIT
   ══════════════════════════════════════════════════════════════════════════ */

export function AuditTab({ file }: { file: JobFile }) {
  const entries = file.audit

  if (entries.length === 0) {
    return (
      <Panel className="p-8">
        <EmptyState
          title="No changes recorded in this session"
          description="Resolve an exception, submit a VGM or advance a document, and the change will be logged here."
        />
      </Panel>
    )
  }

  return (
    <RecordPanel
      title="Audit trail"
      meta={`${entries.length} event${entries.length === 1 ? '' : 's'}`}
      footnote="Every mutation in this product writes an audit event. Entries appear here as you work the shipment."
    >
      <div className="pw-table-wrap min-w-0 rounded-none border-0">
        <table className="pw-table">
          <caption className="sr-only">Audit events recorded against this shipment</caption>
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Entity</th>
              <th scope="col">Action</th>
              <th scope="col">Before</th>
              <th scope="col">After</th>
              <th scope="col">Actor</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="pw-readout whitespace-nowrap text-micro text-text-faint">{formatStamp(entry.at)}</td>
                <td className="whitespace-nowrap">
                  <span className="pw-stencil">{entry.entityType}</span>
                  <span className="pw-id ml-1.5 text-micro">{entry.entityId}</span>
                </td>
                <td>{entry.action}</td>
                <td className="max-w-[160px] truncate text-micro text-text-faint">{entry.before ?? '—'}</td>
                <td className="max-w-[160px] truncate text-micro text-text-muted">{entry.after ?? '—'}</td>
                <td className="whitespace-nowrap text-micro text-text-muted">{entry.actor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </RecordPanel>
  )
}
