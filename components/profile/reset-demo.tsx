'use client'

import { useRouter } from 'next/navigation'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { DEMO } from '@/data/copy'
import { ROUTES } from '@/lib/routes'
import { useFreightStore } from '@/store/freight-store'
import { useOrgStore } from '@/store/org-store'
import { useSessionStore } from '@/store/session-store'

import { Card, MotionButton } from '@/components/ui/primitives'
import { Modal } from '@/components/ui/overlays'
import { CardHeading, NoteList } from '@/components/finance/pieces'

/**
 * RESET DEMO DATA
 * ══════════════════════════════════════════════════════════════════════════
 * The only destructive control in the customer application, and the reason
 * this demo can be given twice in a row.
 *
 * Three stores hold session state and all three have to go back together.
 * Resetting the job file alone leaves the viewer acting as whoever the last
 * presenter switched to, looking at a watchlist somebody else edited — the
 * pipeline says "fresh demo" and the top bar disagrees. So this is the one
 * place that knows about all three, kept out of the workspace file because a
 * destructive action deserves to be read on its own.
 *
 * What each reset actually does, since the wording on screen has to be true:
 *   · useFreightStore.resetDemo()  — replaces the whole job file with a new
 *     seed and rewinds the id counter. Persist writes the seed straight back
 *     over the stored blob, so a reload does not resurrect the old records.
 *   · useOrgStore.reset()          — acting person back to the default member,
 *     saved lanes back to the five seeded lanes.
 *   · the session store            — no reset action exists on it, so this
 *     clears what its own setters expose. See resetSessionPreferences().
 */

/**
 * Clears the session store through the setters it publishes.
 *
 * Deliberately not `setState` and deliberately not a new action on the store:
 * `hasSeenIntro` is write-once by design (`markIntroSeen` has no counterpart),
 * so it survives a reset. That is a fair outcome — it suppresses an intro
 * flourish, not data — and it is the one thing this function cannot undo.
 */
function resetSessionPreferences(): void {
  const session = useSessionStore.getState()

  session.setExceptionSeverityFilter([])
  session.setLastCreatedEnquiryId(null)

  // The globe layers and the sidebar only expose togglers, so "restore the
  // default" means toggling back anything that is currently off the default.
  for (const layer of ['ocean', 'air', 'domestic'] as const) {
    if (!session.networkFilters[layer]) session.toggleNetworkFilter(layer)
  }
  if (session.sidebarCollapsed) session.toggleSidebar()
}

/** What the viewer loses, said plainly before they click rather than after. */
const DISCARDED = [
  'Enquiries and shipments you created from the intake flow',
  'Requests you awarded and the contracts they became',
  'Exceptions you resolved, invoices you raised and documents you moved on',
  'Every activity and audit entry written during this session',
]

const RESTORED = [
  'The acting person returns to the account the demo opens as',
  'Your saved lanes return to the five seeded trade lanes',
]

export function ResetDemoCard() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)

  function confirmReset() {
    useFreightStore.getState().resetDemo()
    useOrgStore.getState().reset()
    resetSessionPreferences()

    setConfirming(false)

    toast('DEMO DATA RESET', {
      description: 'The seeded job pipeline is back. Everything created during this session has been discarded.',
      duration: 8_000,
    })

    // Home, not this page: the viewer has just been handed a different acting
    // person and an untouched pipeline, and the dashboard is where that reads.
    router.push(ROUTES.home)
  }

  return (
    <>
      <Card className="border-critical/25 p-5">
        <CardHeading
          className="text-critical"
          icon={<AlertTriangle className="h-3.5 w-3.5" aria-hidden />}
        >
          {DEMO.resetTitle}
        </CardHeading>

        <p className="mt-3 text-data leading-relaxed text-text-muted">{DEMO.resetBody}</p>

        {/* The bullet is a seated stud rather than a flat dot: against a lit
            surface a plain circle reads as a full stop. */}
        <NoteList className="mt-3" tone="critical" items={DISCARDED} />

        <MotionButton variant="danger" size="md" className="mt-4 w-full" onClick={() => setConfirming(true)}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          {DEMO.resetTitle}
        </MotionButton>

        <p className="pw-groove mt-4 pt-2.5 text-micro leading-relaxed text-text-faint">
          A demo control rather than a product feature. Nothing here leaves your browser — the whole environment is
          held in local storage on this device.
        </p>
      </Card>

      {/* ── Confirmation ──────────────────────────────────────────────── */}
      <Modal
        open={confirming}
        onOpenChange={setConfirming}
        title={`${DEMO.resetTitle}?`}
        description="This cannot be undone from inside the demo."
        footer={
          <div className="flex items-center justify-end gap-2">
            <MotionButton variant="ghost" size="md" onClick={() => setConfirming(false)}>
              Cancel
            </MotionButton>
            <MotionButton variant="danger" size="md" onClick={confirmReset}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reset everything
            </MotionButton>
          </div>
        }
      >
        <p className="text-data leading-relaxed text-text-muted">{DEMO.resetBody}</p>

        {/* Both lists sit in milled channels: what the machine is about to
            throw away, and what it will put back. */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <section className="pw-rail min-w-0 rounded-card px-3.5 py-3">
            <CardHeading>Discarded</CardHeading>
            <NoteList className="mt-2" tone="critical" items={DISCARDED} />
          </section>

          <section className="pw-rail min-w-0 rounded-card px-3.5 py-3">
            <CardHeading>Put back as seeded</CardHeading>
            <NoteList className="mt-2" tone="signal" items={RESTORED} />
          </section>
        </div>
      </Modal>
    </>
  )
}
