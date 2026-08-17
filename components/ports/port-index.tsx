'use client'

import Link from 'next/link'
import { Anchor, ArrowRight, Building2, MapPin, Plane, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { PORT_PROFILES, portProfile } from '@/data/port-profiles'
import { PORTS, requirePort } from '@/data/ports'
import { LANES } from '@/data/lanes'
import { flagEmoji } from '@/lib/flag'
import { count } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import type { LocationKind } from '@/types'

import { PageShell } from '@/components/app/app-shell'
import { EmptyState, InstrumentRail, Panel } from '@/components/ui/primitives'
import { CardHeading } from '@/components/finance/pieces'

const KIND_ICON: Record<LocationKind, typeof Anchor> = {
  SEAPORT: Anchor,
  AIRPORT: Plane,
  INLAND: Building2,
  ICD: MapPin,
}

/**
 * Port index.
 *
 * Ports with a written profile are listed first and are the only ones that
 * link anywhere. Listing a location whose page is empty is how a reference
 * tool loses trust on the first click.
 *
 * MATERIAL: the coverage of the reference set is a reading, not a sentence, so
 * it opens on an instrument rail rather than on a paragraph — three figures a
 * reader can check the tool against before trusting a single port page. The
 * cards are sheets (`--elev-0`), because a grid of twenty plates each casting
 * its own shadow is a wall of cards, which is the exact thing this direction
 * exists to stop. They lift to a plate under the cursor for free: `a.pw-card`
 * in `app/globals.css` answers the pointer, so no call site hand-rolls it.
 */
export function PortIndex() {
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return PORTS.map((port) => {
      const profile = portProfile(port.id)
      const laneCount = LANES.filter((l) => l.originId === port.id || l.destinationId === port.id).length
      return { port, profile, laneCount }
    })
      .filter(({ port }) =>
        q ? `${port.name} ${port.code} ${port.city} ${port.country}`.toLowerCase().includes(q) : true,
      )
      .sort((a, b) => {
        if (Boolean(a.profile) !== Boolean(b.profile)) return a.profile ? -1 : 1
        return b.port.popularity - a.port.popularity
      })
  }, [query])

  const profiled = rows.filter((r) => r.profile)
  const unprofiled = rows.filter((r) => !r.profile)

  return (
    <PageShell
      title="Port information"
      description="Terminals, handling charges, free time and the trade lanes running through each port on your network."
      notice={`Handling charges and free-time slabs are indicative bands, not tariffs — they vary by carrier, terminal and direction, and are revised once or twice a year. ${PORT_PROFILES.length} ports have a full profile.`}
    >
      <div className="flex flex-col gap-6">
        {/* Ticks off: three unrelated counts are not a continuous scale, and
            draft marks under figures that do not share one is decoration. */}
        <InstrumentRail
          ariaLabel="Coverage of this reference set"
          ticks={false}
          readings={[
            {
              label: 'Locations on your network',
              value: count(PORTS.length),
              hint: 'Seaports, airports and inland terminals',
            },
            {
              label: 'With a full profile',
              value: count(PORT_PROFILES.length),
              tone: 'signal',
              hint: 'Terminals, charges and free time written up',
            },
            {
              label: 'Lanes mapped',
              value: count(LANES.length),
              hint: 'Origin–destination pairs priced on this account',
            },
          ]}
        />

        <label className="pw-field flex h-11 w-full max-w-md items-center gap-2.5 rounded-card px-3">
          <Search className="h-4 w-4 shrink-0 text-text-faint" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by port, city, country or UN/LOCODE"
            className="min-w-0 flex-1 bg-transparent text-body text-text placeholder:text-text-faint focus:outline-none"
            aria-label="Search ports"
          />
        </label>

        {rows.length === 0 ? (
          <Panel>
            <EmptyState
              icon={<Anchor className="h-6 w-6" />}
              title={`No port matches “${query}”`}
              description="Try a UN/LOCODE such as INNSA, or a city name."
            />
          </Panel>
        ) : (
          <div className="flex flex-col gap-8">
            {profiled.length > 0 && (
              <section>
                {/* The rule in front of a stencil is a registration mark — it is
                    what makes the label read as painted onto the surface rather
                    than typed above it. Signal here, faint below, because the
                    two groups differ by whether the work is done. */}
                <CardHeading
                  className="mb-3"
                  icon={<span aria-hidden className="h-[3px] w-3 shrink-0 rounded-full bg-signal/60" />}
                >
                  Full profiles
                </CardHeading>

                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {profiled.map(({ port, profile, laneCount }) => {
                    const Icon = KIND_ICON[port.kind]
                    return (
                      <li key={port.id}>
                        <Link
                          href={ROUTES.port(port.code)}
                          className="pw-card group flex h-full flex-col gap-3 p-4 hover:border-signal/40"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="flex items-center gap-2">
                                <span aria-hidden className="shrink-0 text-[15px] leading-none">
                                  {flagEmoji(port.countryCode)}
                                </span>
                                <span className="pw-plate-title truncate text-panel">{port.name}</span>
                              </p>
                              <p className="mt-1 flex items-baseline gap-1.5 text-micro text-text-faint">
                                <span className="truncate">{port.country}</span>
                                <span aria-hidden>·</span>
                                <span className="pw-id shrink-0">{port.code}</span>
                              </p>
                            </div>
                            <Icon className="h-4 w-4 shrink-0 text-text-faint" aria-hidden />
                          </div>

                          <p className="line-clamp-2 text-micro leading-relaxed text-text-muted">
                            {profile!.typeLabel} · {profile!.terminals.length} terminal
                            {profile!.terminals.length === 1 ? '' : 's'}
                            {profile!.directPortDelivery ? ' · Direct port delivery' : ''}
                          </p>

                          {/* Full-bleed groove: the rule runs edge to edge like a
                              joint in the sheet rather than stopping short in the
                              padding like a divider in a document. */}
                          <div className="pw-groove -mx-4 -mb-4 mt-auto flex items-center justify-between gap-3 px-4 pb-3 pt-2.5">
                            <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-micro text-text-faint">
                              <span className="pw-readout text-text-muted">{laneCount}</span>
                              <span>lane{laneCount === 1 ? '' : 's'}</span>
                              <span aria-hidden>·</span>
                              <span className="pw-readout text-text-muted">
                                {profile!.freeTime.detentionFreeDays}
                              </span>
                              <span>free days</span>
                            </span>
                            <ArrowRight
                              className="h-3.5 w-3.5 shrink-0 text-text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-signal"
                              aria-hidden
                            />
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {unprofiled.length > 0 && (
              <section>
                <CardHeading
                  className="mb-3"
                  icon={<span aria-hidden className="h-[3px] w-3 shrink-0 rounded-full bg-text-faint/45" />}
                >
                  On your network, profile not yet written
                </CardHeading>

                {/* Recessed rather than raised, and that is the whole message:
                    these are holes in the reference set, not entries in it. A
                    raised chip would look like something to press. */}
                <ul className="flex flex-wrap gap-2">
                  {unprofiled.map(({ port }) => (
                    <li
                      key={port.id}
                      className="pw-rail inline-flex max-w-full items-center gap-2 rounded-chip px-2.5 py-1.5 text-data text-text-muted"
                    >
                      <span aria-hidden className="shrink-0 text-[13px] leading-none">
                        {flagEmoji(port.countryCode)}
                      </span>
                      <span className="min-w-0 truncate">{port.name}</span>
                      <span className="pw-id shrink-0 text-[10px] text-text-faint">{port.code}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </PageShell>
  )
}

/** Shared by the detail page so both agree on what a lane row looks like. */
export function lanesThrough(portId: string) {
  return LANES.filter((l) => l.originId === portId || l.destinationId === portId).map((lane) => ({
    lane,
    origin: requirePort(lane.originId),
    destination: requirePort(lane.destinationId),
  }))
}
