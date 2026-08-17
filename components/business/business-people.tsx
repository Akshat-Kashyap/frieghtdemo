'use client'

import { Mail, Phone, Users } from 'lucide-react'

import { CUSTOMER_ROLES, ORGANISATION } from '@/data/org'
import { count } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useHydrated } from '@/hooks/use-hydrated'
import { useActingMember } from '@/store/org-store'

import { Chip, Skeleton } from '@/components/ui/primitives'
import { CardHeading, RecordPanel } from '@/components/finance/pieces'

import { capabilitiesOf } from './business-status'

/**
 * The people on the account.
 *
 * Four cards, and the only thing that distinguishes them is what they are
 * allowed to commit the company to — which is why the capability chips are
 * derived from `CustomerRole.can` rather than written under each person.
 * Typing "can award" beside a name is how a profile ends up disagreeing with
 * the button that is actually disabled two screens away.
 *
 * The acting member is marked here because the role switcher in the top bar
 * changes what the rest of this page will let you do, and a viewer who has
 * not noticed the switcher needs to be able to find out why the buttons are
 * grey without leaving the module.
 *
 * MATERIAL: the four people were `gap-px` over a hairline fill, which paints
 * a grid of dividers rather than building one. They are sheets on the plate
 * now — flush, at --elev-0 — and the person you are acting as is the single
 * raised object among them: their initials sit on a filled signal disc while
 * everybody else's are stamped into a recess. That is the same distinction
 * the whole product uses for "live" versus "on file", and it means the card
 * that matters is findable without reading a word.
 */
export function BusinessPeople() {
  const hydrated = useHydrated()
  const acting = useActingMember()

  return (
    <RecordPanel
      icon={<Users className="h-4 w-4 shrink-0 text-signal" aria-hidden />}
      title="People on this account"
      meta={
        /* Reads persisted state, so it holds a matched-height placeholder
           until rehydration rather than flipping name mid-paint. */
        hydrated ? (
          <span>
            Acting as <span className="font-medium text-text-muted">{acting.name}</span> ·{' '}
            {count(ORGANISATION.members.length)} people
          </span>
        ) : (
          <Skeleton className="h-4 w-[200px]" />
        )
      }
      footnote="Roles change what a person may approve, never what they may see. Switch person in the top bar to watch the actions on this page open and close."
    >
      <ul className="grid gap-3 p-5 sm:grid-cols-2">
        {ORGANISATION.members.map((member) => {
          const role = CUSTOMER_ROLES[member.role]
          const capabilities = capabilitiesOf(member.role)
          // Gated on hydration: before the persisted member id arrives, no
          // card is highlighted. Highlighting the default one and moving the
          // ring a moment later is the flicker this avoids.
          const isActing = hydrated && member.id === acting.id

          return (
            <li key={member.id} className={cn('pw-card p-4', isActing && 'border-signal/30 bg-signal/5')}>
              <div className="flex items-start gap-3">
                {/* Raised for the person you are, stamped into the plate for
                    everybody else — the same recess the party chips use. */}
                <span
                  aria-hidden
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-mono text-data font-medium',
                    isActing ? 'pw-elev-0 bg-signal text-on-accent' : 'pw-rail text-text-muted',
                  )}
                >
                  {member.initials}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="pw-plate-title truncate text-body">{member.name}</p>
                  <p className="truncate text-micro text-text-faint">{member.title}</p>
                  {/* Always rendered, empty or not: reserving the line keeps
                      all four cards the same height whichever person the
                      switcher lands on. */}
                  <p className={cn('pw-stencil h-4', isActing && 'text-signal')}>
                    {isActing ? 'Acting as you' : ''}
                  </p>
                </div>
              </div>

              <div className="pw-rail mt-3 rounded-card px-3 py-2.5">
                <CardHeading>{role.label}</CardHeading>
                <p className="mt-1 text-[12px] leading-relaxed text-text-muted">{role.summary}</p>
              </div>

              <ul className="mt-3 flex flex-wrap gap-1.5">
                {capabilities.length > 0 ? (
                  capabilities.map((capability) => (
                    <li key={capability}>
                      <Chip>{capability}</Chip>
                    </li>
                  ))
                ) : (
                  <li>
                    <Chip className="text-text-faint">Read-only · approves nothing</Chip>
                  </li>
                )}
              </ul>

              {member.authorityScope && (
                <p className="mt-3 text-[12px] leading-relaxed text-text-muted">{member.authorityScope}</p>
              )}

              <div className="pw-groove mt-3 flex flex-col gap-1 pt-2.5">
                <a
                  href={`mailto:${member.email}`}
                  className="inline-flex min-w-0 items-center gap-1.5 rounded-chip text-micro text-route hover:underline"
                >
                  <Mail className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">{member.email}</span>
                </a>
                {member.phone && (
                  <a
                    href={`tel:${member.phone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-1.5 rounded-chip text-micro text-route hover:underline"
                  >
                    <Phone className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="pw-readout">{member.phone}</span>
                  </a>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </RecordPanel>
  )
}
