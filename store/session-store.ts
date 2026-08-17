'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Session and UI state — who I am, what I have open, what I have filtered.
 * Persisted separately from the job file so "Reset demo data" can restore
 * the pipeline without also throwing the viewer back to a different role
 * mid-presentation.
 */

export interface SessionState {

  sidebarCollapsed: boolean
  toggleSidebar: () => void

  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void

  /** Exception queue filters, kept across navigation. */
  exceptionSeverityFilter: string[]
  setExceptionSeverityFilter: (severities: string[]) => void

  /** Which globe layers are on. */
  networkFilters: { ocean: boolean; air: boolean; domestic: boolean }
  toggleNetworkFilter: (key: 'ocean' | 'air' | 'domestic') => void

  /** Suppresses the intro flourish on repeat visits within a session. */
  hasSeenIntro: boolean
  markIntroSeen: () => void

  /** Set when the viewer creates an enquiry, so the pipeline can highlight it. */
  lastCreatedEnquiryId: string | null
  setLastCreatedEnquiryId: (id: string | null) => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({

      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      paletteOpen: false,
      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),

      exceptionSeverityFilter: [],
      setExceptionSeverityFilter: (exceptionSeverityFilter) => set({ exceptionSeverityFilter }),

      networkFilters: { ocean: true, air: true, domestic: true },
      toggleNetworkFilter: (key) =>
        set((s) => ({ networkFilters: { ...s.networkFilters, [key]: !s.networkFilters[key] } })),

      hasSeenIntro: false,
      markIntroSeen: () => set({ hasSeenIntro: true }),

      lastCreatedEnquiryId: null,
      setLastCreatedEnquiryId: (lastCreatedEnquiryId) => set({ lastCreatedEnquiryId }),
    }),
    {
      name: 'portwhizz-freight-session-v2',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        exceptionSeverityFilter: state.exceptionSeverityFilter,
        networkFilters: state.networkFilters,
        hasSeenIntro: state.hasSeenIntro,
        lastCreatedEnquiryId: state.lastCreatedEnquiryId,
      }),
    },
  ),
)
