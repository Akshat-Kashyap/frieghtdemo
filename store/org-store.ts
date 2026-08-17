'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { DEFAULT_MEMBER_ID, ORGANISATION, orgMember, roleCan } from '@/data/org'
import type { CustomerRole, CustomerRoleId, OrgMember } from '@/types'

/**
 * WHO IS ACTING
 * ══════════════════════════════════════════════════════════════════════════
 * There is no authentication in this demo, so "who you are" is a choice made
 * in the top bar rather than a session. It exists for one reason: an RFQ
 * award commits the company to money, and showing that the person who raises
 * a request is not always the person who can approve it is the difference
 * between a form and a procurement flow.
 *
 * Persisted under its own key. Note the key carries a version suffix — the
 * older `portwhizz-freight-session` blob holds an internal role id that no
 * longer exists in any union, and rehydrating it would leave the app with an
 * acting role it cannot resolve.
 */

export interface OrgState {
  memberId: string
  /** Saved lanes for the rate terminal watchlist. */
  watchlist: string[]

  setMember: (memberId: string) => void
  toggleWatchlist: (laneId: string) => void
  isWatched: (laneId: string) => boolean
  reset: () => void
}

const DEFAULT_WATCHLIST = [
  'CNSHA-INNSA-FCL',
  'CNSHA-INMUN-FCL',
  'CNSHA-INMAA-FCL',
  'CNNGB-INNSA-FCL',
  'SGSIN-INNSA-FCL',
]

export const useOrgStore = create<OrgState>()(
  persist(
    (set, get) => ({
      memberId: DEFAULT_MEMBER_ID,
      watchlist: [...DEFAULT_WATCHLIST],

      setMember: (memberId) => set({ memberId }),

      toggleWatchlist: (laneId) =>
        set((s) => ({
          watchlist: s.watchlist.includes(laneId)
            ? s.watchlist.filter((id) => id !== laneId)
            : [...s.watchlist, laneId],
        })),

      isWatched: (laneId) => get().watchlist.includes(laneId),

      reset: () => set({ memberId: DEFAULT_MEMBER_ID, watchlist: [...DEFAULT_WATCHLIST] }),
    }),
    {
      name: 'portwhizz-customer-org-v2',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ memberId: state.memberId, watchlist: state.watchlist }),
    },
  ),
)

/* ══════════════════════════════════════════════════════════════════════════
   SELECTORS — components ask "may I?", never "which role is it?"
   ══════════════════════════════════════════════════════════════════════════ */

export function useActingMember(): OrgMember {
  const memberId = useOrgStore((s) => s.memberId)
  return orgMember(memberId)
}

export function useActingRole(): CustomerRoleId {
  return useActingMember().role
}

/**
 * Capability check for the acting member.
 *
 * Returning the reason alongside the verdict is deliberate: a disabled
 * button with no explanation is indistinguishable from a broken one, and
 * "why can't I click this" is the entire point of the roles in this demo.
 */
export function useCan(capability: keyof CustomerRole['can']): { allowed: boolean; reason: string | null } {
  const member = useActingMember()
  const allowed = roleCan(member.role, capability)
  if (allowed) return { allowed: true, reason: null }

  const holders = ORGANISATION.members.filter((m) => roleCan(m.role, capability))
  const who = holders.length ? holders.map((m) => m.name).join(' or ') : 'nobody in this organisation'
  return { allowed: false, reason: `${member.title} cannot do this. ${who} can.` }
}
