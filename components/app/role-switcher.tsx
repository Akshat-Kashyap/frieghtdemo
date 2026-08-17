'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { CUSTOMER_ROLES, ORGANISATION } from '@/data/org'
import { cn } from '@/lib/utils'
import { useActingMember, useOrgStore } from '@/store/org-store'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlays'

/**
 * ACTING AS
 * ══════════════════════════════════════════════════════════════════════════
 * The demo has no login, so this is how you change who you are. It lists the
 * four people at the customer, not six internal personas — the point being
 * demonstrated is that a shipper's own desk is split between the person who
 * books freight and the person allowed to commit money to it.
 *
 * Switching is instant and affects only what you may *do*: every screen
 * stays visible to every role.
 *
 * MATERIAL: the trigger is the one control on the top bar you press to open
 * something, so it is the machined plate — milled top edge, a millimetre of
 * lift, and a press that genuinely travels. The initials inside are stamped
 * into a recess rather than printed on a sticker, except on the person you are
 * currently acting as, where they sit on the one filled accent face in the
 * menu. Recessed is context; raised and filled is where you are. That is the
 * same argument the nav rail makes, at a twentieth of the size.
 */
export function RoleSwitcher() {
  const [open, setOpen] = useState(false)
  const member = useActingMember()
  const setMember = useOrgStore((s) => s.setMember)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="pw-tactile flex min-h-[44px] items-center gap-2.5 rounded-chip px-2 py-1.5 text-left"
          aria-label={`Acting as ${member.name}. Change person.`}
        >
          <span className="pw-rail flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold text-signal">
            {member.initials}
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate font-display text-[12px] font-semibold leading-tight tracking-[-0.005em] text-text">
              {member.name}
            </span>
            <span className="block truncate text-[10px] leading-tight text-text-faint">{member.title}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-faint" aria-hidden />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[320px] p-1.5">
        <p className="pw-stencil px-2.5 pb-1.5 pt-2">Acting as · {ORGANISATION.shortName}</p>

        <ul className="flex flex-col gap-0.5">
          {ORGANISATION.members.map((m) => {
            const role = CUSTOMER_ROLES[m.role]
            const selected = m.id === member.id
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    setMember(m.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'relative flex min-h-[44px] w-full items-start gap-2.5 rounded-chip px-2.5 py-2 text-left',
                    'transition-[background-color,transform] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
                    selected ? 'bg-signal/10' : 'hover:bg-raised-2 active:translate-y-px',
                  )}
                >
                  {selected && (
                    <span
                      aria-hidden
                      className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-signal shadow-[0_0_6px_0_color-mix(in_oklab,var(--color-signal)_55%,transparent)]"
                    />
                  )}
                  <span
                    className={cn(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold',
                      selected
                        ? // The one filled face in the menu: lit on its top
                          // edge, shaded underneath, and casting in its own
                          // colour rather than in neutral grey.
                          'bg-signal text-on-accent shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.28),inset_0_-1px_0_0_rgb(16_29_26_/_0.18),0_1px_2px_-0.5px_rgb(16_29_26_/_0.28)]'
                        : 'pw-rail text-text-muted',
                    )}
                  >
                    {m.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-display text-data font-semibold tracking-[-0.005em] text-text">
                        {m.name}
                      </span>
                      {selected && <Check className="h-3 w-3 shrink-0 text-signal" aria-hidden />}
                    </span>
                    <span className="mt-0.5 block text-micro leading-snug text-text-muted">{role.summary}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {/* Below the list, so the joint's lit pixel falls inside this note. */}
        <p className="mt-1 border-t border-hairline px-2.5 pb-1 pt-2 text-[10px] leading-relaxed text-text-faint shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.7)]">
          Roles change what you can approve, not what you can see. No sign-in is used in this demo.
        </p>
      </PopoverContent>
    </Popover>
  )
}
