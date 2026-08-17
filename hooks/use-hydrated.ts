'use client'

import { useEffect, useState } from 'react'

/**
 * True only after the client has mounted.
 *
 * The store persists to localStorage, which the server cannot see. Any
 * component that renders persisted state must gate on this and show a
 * matched-height skeleton until it flips — otherwise the server HTML and the
 * first client render disagree and React throws a hydration mismatch on
 * every single reload. This is the single most likely way this demo breaks
 * in front of an audience, so the gate is a first-class primitive rather
 * than something each screen improvises.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}
