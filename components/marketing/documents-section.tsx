'use client'

import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react'

import { DEMO } from '@/data/copy'
import { fadeUp, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * DOCUMENT CONFIDENCE
 * ══════════════════════════════════════════════════════════════════════════
 * The part of forwarding that customers actually chase.
 *
 * The claim being made is narrow and checkable: every document has an
 * identity, a version and a status, and superseding one does not delete the
 * one it replaced. What is deliberately *not* claimed is that any of this
 * copy is operative legal text — the notice under the table says so, and it
 * is the same notice stamped on every generated document body in the demo.
 *
 * ── The moment ───────────────────────────────────────────────────────────
 * The section used to make that claim in prose and then show a flat list,
 * which is the shape of an argument nobody checks. The lineage strip at the
 * head of the vault shows it instead: v1 sitting in a recess, still legible,
 * still carrying its own status, with v2 raised beside it. Superseded is a
 * STATE, not a deletion, and the two versions being physically different
 * heights is the fastest way to say so.
 */

interface DocRow {
  name: string
  appears: string
  status: string
  tone: 'issued' | 'accepted' | 'pending'
}

const DOCUMENTS: DocRow[] = [
  { name: 'Quotation', appears: 'After the freight request is priced', status: 'Superseded by v2', tone: 'issued' },
  { name: 'Quote acceptance', appears: 'When you accept a version', status: 'Accepted', tone: 'accepted' },
  { name: 'Booking confirmation', appears: 'Once the carrier confirms space', status: 'Issued', tone: 'issued' },
  { name: 'Bill of lading', appears: 'After the vessel loads', status: 'Issued', tone: 'issued' },
  { name: 'Arrival notice', appears: 'Ahead of vessel arrival', status: 'Expected 18 Aug', tone: 'pending' },
  { name: 'Delivery order', appears: 'Once the cargo can be released', status: 'Expected 20 Aug', tone: 'pending' },
  { name: 'Proof of delivery', appears: 'On signed delivery at your site', status: 'Expected 23 Aug', tone: 'pending' },
  { name: 'Customer invoice', appears: 'With the settled charge lines', status: 'Draft', tone: 'pending' },
]

const TONE_CLASS: Record<DocRow['tone'], string> = {
  accepted: 'border-signal/30 bg-signal/12 text-signal',
  issued: 'border-route/30 bg-route/12 text-route',
  pending: 'border-hairline-strong bg-raised-2 text-text-muted',
}

/** A finished document is a seated stud; one that has not happened yet is an
 *  empty hole in the plate. Same rule as the shipment timeline, so the two
 *  surfaces are speaking one language. */
const TONE_NODE: Record<DocRow['tone'], string> = {
  accepted: 'pw-stud text-signal',
  issued: 'pw-stud text-route/80',
  pending: 'pw-socket',
}

const ACCEPTANCE: [string, string][] = [
  ['Accepted by', 'Apex Industrial Systems Pvt. Ltd.'],
  ['Quote version', 'QT-2026-00291 · v2'],
  ['Recorded', '07 Aug 2026 · 16:40 IST'],
  ['Method', 'Electronic acceptance (simulated)'],
]

export function DocumentsSection() {
  return (
    <section id="documents" className="relative border-t border-hairline bg-ink py-20 lg:py-28">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          {/* ── The argument ─────────────────────────────────────────── */}
          <motion.div
            variants={stagger(0.035)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
          >
            <motion.p variants={fadeUp} className="flex items-center gap-2">
              <span aria-hidden className="h-[3px] w-3 shrink-0 rounded-full bg-signal/60" />
              <span className="pw-stencil">Documents</span>
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="mt-3 text-[clamp(1.75rem,3.6vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-text"
            >
              Every document, with a version and a status.
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-[16px] leading-[1.65] text-text-muted">
              A freight document is only useful if you can tell which version you are looking at and whether it is
              still the current one. Each document here carries an ID, a version, a status and the record of what it
              replaced — so a superseded quotation stays readable instead of disappearing.
            </motion.p>

            {/* Acceptance record — the concrete instance of the claim. */}
            <motion.div variants={fadeUp} className="pw-plate mt-8 p-5">
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-signal" aria-hidden />
                <span className="pw-stencil">Acceptance record</span>
              </p>
              <dl className="mt-4 flex flex-col gap-2.5">
                {ACCEPTANCE.map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-4">
                    <dt className="shrink-0 text-[11px] uppercase tracking-[0.08em] text-text-faint">{label}</dt>
                    <dd className="pw-readout min-w-0 text-right text-data text-text">{value}</dd>
                  </div>
                ))}
              </dl>
              {/* Full-bleed groove: the rule runs edge to edge like a joint in
                  the plate rather than stopping short like a rule in a document. */}
              <p className="pw-groove -mx-5 -mb-5 mt-4 px-5 pb-4 pt-3 text-[11px] leading-relaxed text-text-faint">
                Simulated acceptance record. Production acceptance, trading conditions and liability terms require
                review by a qualified legal professional.
              </p>
            </motion.div>
          </motion.div>

          {/* ── The vault ────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="pw-panel overflow-hidden">
              <VersionLineage />

              <motion.ul
                variants={stagger(0.035)}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-40px' }}
                className="divide-y divide-hairline"
              >
                {DOCUMENTS.map((doc) => (
                  <motion.li
                    variants={fadeUp}
                    key={doc.name}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-5 py-3.5 transition-colors hover:bg-raised-2/60"
                  >
                    <span className="flex min-w-0 items-start gap-3">
                      <span className={cn('mt-[7px] h-2 w-2 shrink-0', TONE_NODE[doc.tone])} aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-data font-medium text-text">{doc.name}</span>
                        <span className="block text-[11px] text-text-faint">{doc.appears}</span>
                      </span>
                    </span>
                    <span
                      className={cn(
                        'ml-auto shrink-0 rounded-chip border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em]',
                        'shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.5)]',
                        TONE_CLASS[doc.tone],
                      )}
                    >
                      {doc.status}
                    </span>
                  </motion.li>
                ))}
              </motion.ul>
            </div>

            <div className="pw-card mt-5 flex items-start gap-3 px-4 py-3.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" aria-hidden />
              <p className="text-[12px] leading-relaxed text-text-muted">
                {DEMO.legalNotice} Statutory customs documents remain the responsibility of the licensed clearance
                partner and are not replaced by anything shown here.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   VERSION LINEAGE
   ══════════════════════════════════════════════════════════════════════════
   The one place on this page where two surfaces are deliberately at different
   heights next to each other. v1 is a recess: still in the plate, still
   readable, but sunk. v2 is a sheet sitting on the plate with a signal edge.
   The claim in the paragraph opposite ("a superseded quotation stays readable
   instead of disappearing") is a sentence; this is the same claim you can see.

   A three-column grid rather than a wrapping flex row, so at 360px the arrow
   stays between the two versions instead of dropping onto its own line.
   ══════════════════════════════════════════════════════════════════════════ */
function VersionLineage() {
  return (
    <div className="pw-groove-b border-b border-hairline px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="pw-stencil">Version lineage</p>
        <p className="pw-id text-[10px] text-text-faint">QT-2026-00291</p>
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
        <div className="pw-rail min-w-0 px-3 py-2">
          <p className="pw-readout text-[13px] font-medium leading-none text-text-muted">v1</p>
          <p className="mt-1 truncate text-[10px] uppercase tracking-[0.08em] text-text-faint">Superseded</p>
        </div>

        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-faint" aria-hidden />

        <div className="pw-card min-w-0 border-signal/30 bg-signal/8 px-3 py-2">
          <p className="pw-readout text-[13px] font-medium leading-none text-text">v2</p>
          <p className="mt-1 truncate text-[10px] uppercase tracking-[0.08em] text-signal">Accepted · current</p>
        </div>
      </div>
    </div>
  )
}
