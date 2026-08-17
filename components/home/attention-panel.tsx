'use client'

import { CheckCircle2, Lock } from 'lucide-react'
import { useMemo } from 'react'

import { kybProgress } from '@/data/org'
import { count } from '@/lib/format'
import { ROUTES } from '@/lib/routes'

import { EmptyState, Meter, Panel, StatusBadge } from '@/components/ui/primitives'
import { attentionItems } from '@/components/business/business-status'

import { ModuleLink } from './pieces'

/**
 * WHAT IS STOPPING YOU SHIPPING
 * ══════════════════════════════════════════════════════════════════════════
 * The outstanding verification checks and lapsed company documents, worst
 * first, with what each one blocks.
 *
 * This reuses `attentionItems()` from the business module rather than reading
 * `ORGANISATION.kyb` and `documentsNeedingAttention()` and merging them again
 * here. The merge carries real judgement — a lapsed licence outranks a check
 * sitting with onboarding, and the two lists are ranked against each other on
 * one number line — and a second implementation of that ordering is a second
 * chance to get it wrong. The home screen shows the head of that list; the
 * business profile shows all of it with the full record behind each row.
 *
 * Nothing here is persisted: `data/org.ts` is authored, so unlike every other
 * store-backed block on this page there is no hydration gate and no skeleton.
 */

/** Enough to make the case; the rest are one click away. */
const ITEMS_SHOWN = 3

export function AttentionPanel() {
  const items = useMemo(() => attentionItems(), [])
  const progress = kybProgress()
  const shown = items.slice(0, ITEMS_SHOWN)

  if (items.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon={<CheckCircle2 className="h-6 w-6 text-signal" />}
          title="Nothing outstanding on the company profile"
          description="Every verification check has cleared and no company document is out of date."
        />
      </Panel>
    )
  }

  return (
    <Panel className="overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline px-5 py-3.5">
        <div className="min-w-0">
          <h3 className="text-data font-semibold text-text">
            {count(items.length)} item{items.length === 1 ? '' : 's'} outstanding
          </h3>
          <p className="mt-0.5 text-[11px] text-text-faint">
            Verification and company documents, ranked by what each one is holding up
          </p>
        </div>
        <div className="w-full max-w-[220px] shrink-0">
          <Meter
            label={`${count(progress.verified)} of ${count(progress.total)} verified`}
            value={progress.verified}
            max={progress.total}
            tone={progress.complete ? 'signal' : 'amber'}
          />
        </div>
      </header>

      <ul className="divide-y divide-hairline">
        {shown.map((item) => (
          <li key={item.id} className="px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-data font-medium text-text">{item.title}</span>
              <StatusBadge tone={item.tone}>{item.statusLabel}</StatusBadge>
            </div>
            <p className="mt-1.5 flex items-start gap-2 text-[12px] leading-relaxed text-text-muted">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-faint" aria-hidden />
              <span>
                <span className="font-medium text-text">Blocks</span> — {item.blocks}
              </span>
            </p>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-hairline bg-raised-2/40 px-5 py-2.5">
        <p className="text-[11px] leading-relaxed text-text-muted">
          {items.length > ITEMS_SHOWN
            ? `${count(items.length - ITEMS_SHOWN)} more on the company profile, with what each one needs next.`
            : 'The full record behind each of these sits on the company profile.'}
        </p>
        <ModuleLink href={ROUTES.business}>Open the company profile</ModuleLink>
      </div>
    </Panel>
  )
}
