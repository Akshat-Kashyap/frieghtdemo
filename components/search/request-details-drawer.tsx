'use client'

import { Check, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { DEMO } from '@/data/copy'
import { MODE_LABEL, SERVICE_SCOPE_LABEL } from '@/lib/lifecycle'
import { cn } from '@/lib/utils'
import { useIntakeStore } from '@/store/intake-store'

import { Drawer } from '@/components/ui/overlays'
import { Button, MotionButton } from '@/components/ui/primitives'
import { IntakeStepContent } from '@/components/intake/steps'

/**
 * FULL REQUEST DETAILS
 * ══════════════════════════════════════════════════════════════════════════
 * Progressive disclosure for the search bar.
 *
 * The bar itself asks the four things almost every request needs — lane,
 * cargo, equipment, ready date. Everything that only *some* requests need
 * (incoterm, service scope, insurance, special handling, who to send the
 * quote to) lives behind this, so the common case stays a three-field form
 * and the complete case is still reachable without leaving the page.
 *
 * The panels are the same step components the quote intake uses, so the two
 * routes into a request cannot drift apart.
 *
 * "Save details" writes nothing of its own — the step components are bound
 * straight to the intake draft, so every keystroke is already saved. What it
 * DOES owe the viewer is confirmation that the change landed and a reminder
 * that the search has to be re-run to see it, because a drawer that closes in
 * silence is indistinguishable from one that threw the input away.
 */

const SECTIONS = [
  { step: 1 as const, title: 'Cargo', hint: 'What is moving, and when it is ready' },
  { step: 2 as const, title: 'Commercial scope', hint: 'Terms, services and handling' },
  { step: 3 as const, title: 'Where to send it', hint: 'Who receives the quote' },
]

export function RequestDetailsDrawer({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const draft = useIntakeStore((s) => s.draft)

  function save() {
    setOpen(false)
    toast.success('REQUEST DETAILS SAVED', {
      description: `${MODE_LABEL[draft.mode]} · ${draft.incoterm} · ${SERVICE_SCOPE_LABEL[draft.serviceScope]}${draft.insuranceRequired ? ' · insurance requested' : ''}. Search again to price the lane on these terms.`,
      duration: 7_000,
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex min-h-[32px] items-center gap-1.5 rounded-chip text-micro font-medium text-text-muted transition-colors hover:text-signal',
          className,
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
        Add cargo &amp; service details
      </button>

      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Freight request details"
        description="Everything beyond the lane and the equipment. Nothing here is required to see indicative options — but incoterm, scope and handling all change what gets quoted."
        width="lg"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-micro text-text-faint">{DEMO.intakeLabel}</p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="md" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <MotionButton variant="primary" size="md" onClick={save}>
                <Check className="h-3.5 w-3.5" aria-hidden />
                Save details
              </MotionButton>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-8">
          {SECTIONS.map((section) => (
            <section key={section.step}>
              <div className="mb-4">
                <h3 className="pw-plate-title text-panel">{section.title}</h3>
                <p className="mt-0.5 text-data text-text-muted">{section.hint}</p>
              </div>
              <IntakeStepContent step={section.step} />
            </section>
          ))}
        </div>
      </Drawer>
    </>
  )
}
