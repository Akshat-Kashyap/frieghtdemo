'use client'

import { useEffect, useState } from 'react'
import { primeIdCounter, useFreightStore } from '@/store/freight-store'
import { useOrgStore } from '@/store/org-store'
import { useSessionStore } from '@/store/session-store'

/**
 * Rehydrates the persisted stores after mount.
 *
 * Both stores are created with `skipHydration: true`, so on the server and on
 * the first client render they hold the seed — identical HTML, no mismatch.
 * Only once this effect runs does localStorage get read and the viewer's own
 * state applied.
 *
 * Without this, every reload of a demo where someone had created an enquiry
 * would throw a hydration error into the console mid-presentation.
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void Promise.all([
      useFreightStore.persist.rehydrate(),
      useSessionStore.persist.rehydrate(),
      useOrgStore.persist.rehydrate(),
    ]).finally(() => {
      // Must run AFTER rehydration: the id counter has to clear whatever the
      // previous session already wrote, or newly created records collide with
      // persisted ones. See primeIdCounter().
      primeIdCounter()
      setReady(true)
    })
  }, [])

  // Render children immediately either way — components that depend on
  // persisted state gate themselves with useHydrated() and show skeletons.
  // Blocking the whole tree here would trade a hydration bug for a blank flash.
  void ready
  return <>{children}</>
}
