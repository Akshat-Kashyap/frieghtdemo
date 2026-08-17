'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Anchor, Building2, Check, MapPin, Plane, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { requirePort } from '@/data/ports'
import { ROUTE_COPY, gatewayFor, modeGroup, popularLanesFor, searchLocations } from '@/lib/mode-locations'
import { fastTween } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { Port, TransportMode } from '@/types'

/**
 * Gateway search for the intake wizard.
 *
 * Bound to the mode, exactly as the search bar is: a wizard that offers Nhava
 * Sheva under an air request would let a customer submit an enquiry no
 * airline can fly, and it would arrive on an operator's queue as somebody
 * else's problem. The wizard and the search bar therefore resolve locations
 * from the same table — two front doors onto one enquiry cannot disagree
 * about where cargo can start.
 *
 * Freight people type the code ("INNSA", "BOM"), the gateway ("pudong"), or
 * the city ("navi mumbai") — all three land in the same place. Keyboard
 * complete: arrows to move, Enter to select, Escape to dismiss. A combobox
 * that only works with a mouse is unusable at an ops desk.
 */

const KIND_ICON = { Seaport: Anchor, Airport: Plane, City: Building2, ICD: MapPin } as const

export function PortCombobox({
  value,
  onChange,
  placeholder = 'Port or city',
  label,
  error,
  /** Decides which gateways exist, and what they are called. */
  mode,
  /** Which end of the lane this field is, so the suggestions match it. */
  endpoint,
  id,
}: {
  value?: string
  onChange: (portId: string) => void
  placeholder?: string
  label: string
  error?: string
  mode: TransportMode
  endpoint: 'ORIGIN' | 'DESTINATION'
  id?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const shouldReduce = useReducedMotion()

  const copy = ROUTE_COPY[modeGroup(mode)]
  const selected = value ? requirePort(value) : undefined
  const selectedGateway = gatewayFor(value, mode)
  const results = useMemo(() => searchLocations(query, mode, 7), [query, mode])

  /** Lanes this mode actually runs, on an empty query only. */
  const popular = useMemo(() => {
    if (query.trim()) return []
    const seen = new Set<string>(results.map((p) => p.id))
    const out: Array<{ port: Port; laneLabel: string }> = []
    for (const lane of popularLanesFor(mode, 6)) {
      const portId = endpoint === 'ORIGIN' ? lane.originId : lane.destinationId
      if (seen.has(portId) || portId === value) continue
      seen.add(portId)
      out.push({
        port: requirePort(portId),
        laneLabel: `${requirePort(lane.originId).name} → ${requirePort(lane.destinationId).name}`,
      })
      if (out.length >= 3) break
    }
    return out
  }, [query, value, mode, endpoint, results])

  /** Arrowing has to reach the suggestions too, or half the list is mouse-only. */
  const navigable = useMemo(() => [...results, ...popular.map((p) => p.port)], [results, popular])

  useEffect(() => {
    setActiveIndex(0)
  }, [mode])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Keep the active option scrolled into view when arrowing through a long list.
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

  const listboxId = `${id ?? label.toLowerCase()}-listbox`
  const activeId = open && navigable[activeIndex] ? `${listboxId}-${navigable[activeIndex]!.id}` : undefined

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="pw-stencil mb-1.5 block">
        {label}
      </label>

      <div
        className="pw-field group relative flex h-[52px] items-center gap-2.5 rounded-card px-3"
        data-invalid={error ? 'true' : undefined}
      >
        <Search className="h-4 w-4 shrink-0 text-text-faint" aria-hidden />

        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-describedby={error ? `${id}-error` : undefined}
            aria-activedescendant={activeId}
            className="w-full bg-transparent text-body text-text placeholder:text-text-faint focus:outline-none"
            placeholder={selected ? '' : placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
          {/* The selection sits under the input so the field reads as filled
              while still being immediately typeable over. It carries the name
              and code THIS MODE books under, not the record's default. */}
          {selected && !query && (
            <div className="pointer-events-none absolute inset-y-0 left-9 right-3 flex flex-col justify-center">
              <span className="truncate text-body font-medium leading-tight text-text">
                {selectedGateway?.name ?? selected.name}
              </span>
              <span className="truncate font-mono text-micro leading-tight text-text-faint">
                {selectedGateway?.code ?? selected.code} · {selected.country}
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-micro text-critical">
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
            className="pw-overlay absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-card"
          >
            <ul ref={listRef} id={listboxId} role="listbox" aria-label={label} className="max-h-[280px] overflow-y-auto p-1">
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
                      'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-chip px-2.5 py-2 transition-colors',
                      active ? 'bg-raised-2' : 'bg-transparent',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-text-faint" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-data font-medium text-text">{gateway.name}</span>
                      <span className="block truncate text-micro text-text-faint">
                        {gateway.detail} · {port.country}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-micro text-text-faint">{gateway.code}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-signal" aria-hidden />}
                  </li>
                )
              })}

              {popular.length > 0 && (
                <>
                  <li className="pw-eyebrow px-2.5 pb-1 pt-3" role="presentation">
                    Lanes we run in this mode
                  </li>
                  {popular.map(({ port, laneLabel }, i) => {
                    const index = results.length + i
                    const active = index === activeIndex
                    return (
                      <li
                        key={`popular-${port.id}`}
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
                        <span className="h-1 w-1 shrink-0 rounded-full bg-route" aria-hidden />
                        <span className="flex-1 truncate text-data text-text-muted">{laneLabel}</span>
                        <span className="font-mono text-micro text-text-faint">
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
