'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowRight, FileText, Loader2 } from 'lucide-react'

import { DEMO, TOASTS } from '@/data/copy'
import { requirePort } from '@/data/ports'
import { ROUTES } from '@/lib/routes'
import { cargoUnitsFor } from '@/lib/indicative-options'
import { formatDate, money, transitRange } from '@/lib/format'
import { DOCUMENT_TYPE_LABEL, MODE_LABEL, SERVICE_SCOPE_LABEL } from '@/lib/lifecycle'
import { useFreightStore } from '@/store/freight-store'
import { useIntakeStore } from '@/store/intake-store'
import { useSessionStore } from '@/store/session-store'
import type { IndicativeOption } from '@/types'

import { Button, Chip, DataRow, DemoNotice, MotionButton } from '@/components/ui/primitives'
import { LanePill } from '@/components/ui/freight'
import { Drawer } from '@/components/ui/overlays'

/**
 * QUOTE → ENQUIRY → THE SHIPMENT FILE
 * ══════════════════════════════════════════════════════════════════════════
 * The moment the search surface becomes the product, and the single most
 * important navigation in the demo.
 *
 * "Create the request" is not a form submission — it is one store transaction
 * that creates the JOB, mints the enquiry id, writes a timeline event, writes
 * activity, writes audit and pre-populates the quotation.
 *
 * WHERE IT LANDS. This used to push `ROUTES.rfq(enquiryId)`, which resolves to
 * `/rfqs/ENQ-2026-00342` — a request-for-quotation id space that an enquiry id
 * has never been in. There is no RFQ with that id, so the most important click
 * in the demo landed on "No request with id ENQ-2026-00342". It now goes to the
 * shipment file for the job that was just created, which is the record that
 * actually exists, carries the enquiry, the quotation, the timeline entry and
 * the next action, and is where the rest of the journey continues from.
 */

/**
 * The relay, named before the click.
 *
 * Freight is handed between parties, and a viewer who does not know that reads
 * the first screen they land on as "nothing happened". Each line says who holds
 * the step, so the shipment file they arrive on is legible immediately.
 */
const NEXT_STEPS = [
  { title: 'The shipment file opens', who: 'You land on it. The enquiry, the quotation and the timeline are already on it.' },
  { title: 'PortWhizz issues the quotation', who: 'The freight desk. Simulated here so the journey keeps moving.' },
  { title: 'You accept it', who: 'Anyone on the account who books freight. That is what commits the charges.' },
  { title: 'Carrier space, cutoffs, documents, invoice', who: 'Carrier and terminal events land on the shipment as they happen.' },
] as const

/** Documents this shipment will need — derived from the actual scope. */
function requiredDocumentsFor(mode: string, scope: string, insurance: boolean, clearance: boolean): string[] {
  const docs = ['CUSTOMER_ENQUIRY', 'QUOTE', 'BOOKING_CONFIRMATION', 'SHIPPING_INSTRUCTION', 'PACKING_LIST']

  if (mode.startsWith('OCEAN')) docs.push('VGM_RECORD', 'BILL_OF_LADING', 'ARRIVAL_NOTICE', 'DELIVERY_ORDER')
  if (scope.includes('DOOR')) docs.push('TRANSPORT_ORDER', 'PROOF_OF_DELIVERY')
  if (insurance) docs.push('VENDOR_INVOICE')
  docs.push('CUSTOMER_INVOICE')

  return docs.map((d) => DOCUMENT_TYPE_LABEL[d] ?? d)
}

export function EnquiryDrawer({
  option,
  open,
  onOpenChange,
  onModify,
}: {
  option: IndicativeOption | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onModify: () => void
}) {
  const router = useRouter()
  const draft = useIntakeStore((s) => s.draft)
  const createEnquiryFromIntake = useFreightStore((s) => s.createEnquiryFromIntake)
  const setLastCreatedEnquiryId = useSessionStore((s) => s.setLastCreatedEnquiryId)
  const [creating, setCreating] = useState(false)

  if (!option) return null

  const origin = draft.originId ? requirePort(draft.originId) : undefined
  const destination = draft.destinationId ? requirePort(draft.destinationId) : undefined
  const units = cargoUnitsFor(draft)
  const documents = requiredDocumentsFor(
    draft.mode,
    draft.serviceScope,
    draft.insuranceRequired,
    draft.clearanceCoordinationRequired,
  )

  const quoted = option.chargeCategories.filter((c) => !c.exposureOnly)

  function handleCreate() {
    setCreating(true)

    const { enquiryId, jobId, quoteId } = createEnquiryFromIntake(draft, option!)
    setLastCreatedEnquiryId(enquiryId)

    setCreating(false)
    onOpenChange(false)

    /* ONE toast, not two. Two stacked toasts with two different actions is a
       coin toss in front of an audience — the second covers the first, and
       whichever the presenter reaches for, the other one was the point. This
       says exactly what was created and where the viewer now is; the shipment
       file they land on carries the next action itself. */
    toast.success(TOASTS.enquiryCreated.title, {
      description: `${enquiryId} · job ${jobId} · quotation ${quoteId}. ${TOASTS.enquiryCreated.body} Opening the shipment file — the next step is on it.`,
      duration: 12_000,
      action: {
        label: 'Open shipment',
        onClick: () => router.push(ROUTES.booking(jobId)),
      },
    })

    router.push(ROUTES.booking(jobId))
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Raise this as a freight request?"
      description="One write, six records: the shipment, the enquiry, a pre-priced quotation, the first timeline event, the activity entry and the audit entry. You land on the shipment file it creates."
      width="md"
      footer={
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <MotionButton variant="primary" size="lg" onClick={handleCreate} disabled={creating} className="flex-1">
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  Create the request
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </MotionButton>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => {
                onOpenChange(false)
                onModify()
              }}
            >
              Modify Request
            </Button>
          </div>
          <DemoNotice>{DEMO.intakeLabel}</DemoNotice>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* ── Identity ────────────────────────────────────────────────── */}
        <section className="pw-card px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="pw-eyebrow">Enquiry ID</p>
              <p className="pw-id mt-1 text-[15px] font-semibold text-text">Generated on creation</p>
            </div>
            <Chip>Selected: {option.label}</Chip>
          </div>
        </section>

        {/* ── Request ─────────────────────────────────────────────────── */}
        <section>
          <p className="pw-eyebrow mb-2">The request</p>
          <div className="pw-card divide-y divide-hairline/60 px-4 py-1">
            <DataRow label="Customer" value={draft.companyName} />
            <DataRow
              label="Route"
              value={origin && destination ? <LanePill origin={origin.name} destination={destination.name} size="sm" /> : '—'}
            />
            <DataRow label="Mode" value={MODE_LABEL[draft.mode]} />
            <DataRow label="Cargo" value={units.summary} />
            <DataRow label="Incoterm" value={draft.incoterm} />
            <DataRow label="Service scope" value={SERVICE_SCOPE_LABEL[draft.serviceScope]} />
            <DataRow
              label="Transit"
              value={transitRange(option.transitMinDays, option.transitMaxDays)}
            />
            <DataRow label="Validity" value={formatDate(option.validUntil)} />
          </div>
        </section>

        {/* ── Charges ─────────────────────────────────────────────────── */}
        <section>
          <p className="pw-eyebrow mb-2">Indicative charge summary</p>
          <div className="pw-card px-4 py-3">
            <table className="w-full">
              <tbody>
                {quoted.map((cat) => (
                  <tr key={cat.family}>
                    <td className="py-1 pr-2 text-data text-text-muted">{cat.label}</td>
                    <td className="tnum whitespace-nowrap py-1 text-right font-mono text-data text-text">
                      {money(cat.amountUsd, option.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-hairline">
                  <td className="pt-2 text-data font-medium text-text">Indicative total</td>
                  <td className="tnum whitespace-nowrap pt-2 text-right font-mono text-body font-semibold text-signal">
                    {money(option.totalUsd, option.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* ── Documents this job will need ────────────────────────────── */}
        <section>
          <p className="pw-eyebrow mb-2">Required freight documents</p>
          <div className="flex flex-wrap gap-1.5">
            {documents.map((doc) => (
              <Chip key={doc} className="gap-1.5">
                <FileText className="h-2.5 w-2.5" aria-hidden />
                {doc}
              </Chip>
            ))}
          </div>
        </section>

        {/* ── Ownership ───────────────────────────────────────────────── */}
        <section>
          <p className="pw-eyebrow mb-2">Ownership</p>
          <div className="pw-card divide-y divide-hairline/60 px-4 py-1">
            <DataRow label="Assigned owner" value="Sales Desk" />
            <DataRow label="Raised by" value={draft.contactPerson} />
            {draft.clearanceCoordinationRequired && (
              <DataRow label="Clearance" value="External customs partner required" />
            )}
          </div>
        </section>

        {/* ── Where this goes next ─────────────────────────────────────
            The drawer used to end on a single "Next action" row, which told
            the viewer what SOMEONE would do but not where they themselves
            were about to land. The whole journey from here is four steps and
            they all live on the shipment file this creates, so it is worth
            four lines to say so before the click rather than after it. */}
        <section>
          <p className="pw-eyebrow mb-2">What happens after this</p>
          <ol className="pw-rail flex flex-col divide-y divide-hairline/50 rounded-card px-4 py-1">
            {NEXT_STEPS.map((s, i) => (
              <li key={s.title} className="flex items-baseline gap-3 py-2">
                <span className="pw-readout shrink-0 text-micro text-text-faint">{String(i + 1).padStart(2, '0')}</span>
                <span className="min-w-0">
                  <span className="block text-data font-medium text-text">{s.title}</span>
                  <span className="block text-micro leading-relaxed text-text-muted">{s.who}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <DemoNotice variant="block">{DEMO.optionsDisclaimer}</DemoNotice>
      </div>
    </Drawer>
  )
}
