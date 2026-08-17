'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Anchor, Building2, MapPin, Plane, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { requirePort } from '@/data/ports'
import { flagEmoji } from '@/lib/flag'
import { ROUTE_COPY, gatewayFor, modeGroup, popularLanesFor, searchLocations } from '@/lib/mode-locations'
import { fastTween } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { Port, TransportMode } from '@/types'

/**
 * THE LOCATION CELL
 * ══════════════════════════════════════════════════════════════════════════
 * A cell inside the search bar rather than a form field with a border of its
 * own — the panel is the object, the cells are divisions of it. Materially it
 * is a recess: a channel milled into the glass panel, lit from the top lip.
 *
 * It only ever offers places the SELECTED MODE can actually be booked from.
 * Air is airport to airport, ocean port to port, road city to city, and the
 * list changes accordingly — a seaport offered in an air search is the detail
 * that tells a freight person nobody who books cargo was in the room. The
 * identity shown changes too, because the same place has two names and two
 * codes: Shanghai is CNSHA to a shipping line and PVG to an airline.
 *
 * Freight people type three different things for the same place: the code
 * ("INNSA", "BOM"), the gateway ("pudong"), or the city ("navi mumbai"). All
 * three have to land on the same option, and all three have to be reachable
 * from the keyboard — arrows to move, Enter to take, Escape to back out.
 */

const KIND_ICON = { Seaport: Anchor, Airport: Plane, City: Building2, ICD: MapPin } as const

export function LocationField({
  label,
  value,
  onChange,
  onClear,
  placeholder = 'Port or city',
  /** Decides which places exist at all, and what they are called. */
  mode,
  /** Which end of the lane this cell is, so the suggestions match it. */
  endpoint,
  error,
  className,
}: {
  label: string
  value?: string
  onChange: (portId: string) => void
  onClear?: () => void
  placeholder?: string
  mode: TransportMode
  endpoint: 'ORIGIN' | 'DESTINATION'
  error?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const shouldReduce = useReducedMotion()

  const reactId = useId()
  const inputId = `loc-${reactId}`
  const listboxId = `loc-list-${reactId}`

  const copy = ROUTE_COPY[modeGroup(mode)]
  const selected = value ? requirePort(value) : undefined
  const selectedGateway = gatewayFor(value, mode)

  const results = useMemo(() => searchLocations(query, mode, 8), [query, mode])

  /**
   * Suggested only on an empty query, and only lanes this mode actually runs
   * — offering a Shanghai sailing under an air search would put back exactly
   * the confusion the mode split removed.
   */
  const suggested = useMemo(() => {
    if (query.trim()) return []
    // Anything already in the list above is not a suggestion, it is a
    // duplicate — and a duplicate here would put two elements on one DOM id,
    // which breaks `aria-activedescendant` for the whole listbox.
    const seen = new Set<string>(results.map((p) => p.id))
    const out: Array<{ port: Port; lane: string }> = []
    for (const lane of popularLanesFor(mode, 6)) {
      const portId = endpoint === 'ORIGIN' ? lane.originId : lane.destinationId
      if (seen.has(portId) || portId === value) continue
      seen.add(portId)
      out.push({
        port: requirePort(portId),
        lane: `${requirePort(lane.originId).name} → ${requirePort(lane.destinationId).name}`,
      })
      if (out.length >= 3) break
    }
    return out
  }, [query, value, mode, endpoint, results])

  /** Arrowing has to reach the suggestions too, or half the list is mouse-only. */
  const navigable = useMemo(() => [...results, ...suggested.map((s) => s.port)], [results, suggested])

  // The list is rebuilt whenever the mode changes; the cursor must not point
  // past the end of it.
  useEffect(() => {
    setActiveIndex(0)
  }, [mode])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  function select(port: Port) {
    onChange(port.id)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % Math.max(1, navigable.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + navigable.length) % Math.max(1, navigable.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const port = navigable[activeIndex]
      if (port) select(port)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  const showSelection = Boolean(selected) && !query
  const activeId = open && navigable[activeIndex] ? `${listboxId}-${navigable[activeIndex]!.id}` : undefined

  return (
    <div ref={containerRef} className={cn('relative min-w-0', className)}>
      <div
        className="pw-field group relative flex h-[68px] items-center gap-3 rounded-card px-3.5 sm:px-4"
        data-invalid={error ? 'true' : undefined}
      >
        <MapPin
          className={cn('h-4 w-4 shrink-0 transition-colors', open ? 'text-signal' : 'text-text-faint')}
          aria-hidden
        />

        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className="block truncate text-[11px] leading-none text-text-muted">
            {label}
          </label>

          <div className="relative mt-1.5">
            <input
              ref={inputRef}
              id={inputId}
              role="combobox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-describedby={error ? `${inputId}-error` : undefined}
              aria-activedescendant={activeId}
              className="w-full bg-transparent text-[17px] font-medium leading-tight text-text placeholder:font-normal placeholder:text-text-faint focus:outline-none"
              placeholder={showSelection ? '' : placeholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveIndex(0)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
            />

            {/* The selection sits under the caret so the cell reads as filled
                while staying immediately typeable over. It shows the name the
                MODE uses, which is the name that will appear on the booking. */}
            {showSelection && selected && (
              <span className="pointer-events-none absolute inset-0 flex items-center gap-2 truncate">
                <span aria-hidden className="text-[15px] leading-none">
                  {flagEmoji(selected.countryCode)}
                </span>
                <span className="truncate text-[17px] font-medium leading-tight text-text">
                  {selectedGateway?.name ?? selected.name}
                </span>
              </span>
            )}
          </div>
        </div>

        {selected && (
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="hidden rounded-chip border border-route/25 bg-route/8 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-route sm:inline-block">
              {selectedGateway?.code ?? selected.code}
            </span>
            {onClear && (
              <button
                type="button"
                onClick={() => {
                  onClear()
                  setQuery('')
                  inputRef.current?.focus()
                }}
                className="flex h-11 w-9 items-center justify-center rounded-chip text-text-faint transition-colors hover:bg-raised-2 hover:text-text"
                aria-label={`Clear ${label}`}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <p id={`${inputId}-error`} role="alert" className="mt-1 px-1 text-micro text-critical">
          {error}
        </p>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={fastTween}
            className="pw-overlay absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-card sm:min-w-[340px]"
          >
            <ul ref={listRef} id={listboxId} role="listbox" aria-label={label} className="max-h-[300px] overflow-y-auto p-1.5">
              {results.length === 0 && (
                <li className="px-3 py-6 text-center text-data leading-relaxed text-text-muted">
                  {query.trim() ? `Nothing in this mode matches “${query}”.` : 'No gateway available.'}
                  <span className="mt-1 block text-micro text-text-faint">{copy.emptyHint}</span>
                </li>
              )}

              {results.map((port, i) => {
                const gateway = gatewayFor(port.id, mode)!
                const Icon = KIND_ICON[gateway.kindLabel as keyof typeof KIND_ICON] ?? MapPin
                const active = i === activeIndex
                const isSelected = port.id === value
                return (
                  <li
                    key={port.id}
                    id={`${listboxId}-${port.id}`}
                    role="option"
                    aria-selected={isSelected}
                    data-active={active}
                    onPointerEnter={() => setActiveIndex(i)}
                    onClick={() => select(port)}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center gap-3 rounded-chip px-2.5 py-2 transition-colors',
                      active ? 'bg-raised-2' : 'bg-transparent',
                    )}
                  >
                    <span aria-hidden className="w-5 shrink-0 text-center text-[15px] leading-none">
                      {flagEmoji(port.countryCode)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-data font-medium text-text">{gateway.name}</span>
                      <span className="block truncate text-micro text-text-faint">
                        {gateway.detail} · {port.country}
                      </span>
                    </span>
                    <Icon className="h-3.5 w-3.5 shrink-0 text-text-faint" aria-hidden />
                    <span className="shrink-0 font-mono text-micro text-text-faint">{gateway.code}</span>
                  </li>
                )
              })}

              {suggested.length > 0 && (
                <>
                  <li
                    className="px-2.5 pb-1 pt-3 text-[10px] font-medium uppercase tracking-[0.12em] text-text-faint"
                    role="presentation"
                  >
                    Lanes we run in this mode
                  </li>
                  {suggested.map(({ port, lane }, i) => {
                    const index = results.length + i
                    const active = index === activeIndex
                    return (
                      <li
                        key={`sugg-${port.id}`}
                        id={`${listboxId}-${port.id}`}
                        role="option"
                        aria-selected={false}
                        data-active={active}
                        onPointerEnter={() => setActiveIndex(index)}
                        onClick={() => select(port)}
                        className={cn(
                          'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-chip px-2.5 py-2 transition-colors',
                          active ? 'bg-raised-2' : 'bg-transparent',
                        )}
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-route/60" aria-hidden />
                        <span className="flex-1 truncate text-data text-text-muted">{lane}</span>
                        <span className="shrink-0 font-mono text-micro text-text-faint">
                          {gatewayFor(port.id, mode)?.code ?? port.code}
                        </span>
                      </li>
                    )
                  })}
                </>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
