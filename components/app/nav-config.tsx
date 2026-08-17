import {
  Anchor,
  Blocks,
  Building2,
  FileSignature,
  Gauge,
  Newspaper,
  Receipt,
  Search,
  Ship,
  Sparkles,
  TableProperties,
  Tags,
  UserRound,
  type LucideIcon,
} from 'lucide-react'

import { ROUTES } from '@/lib/routes'

/**
 * THE CUSTOMER NAVIGATION
 * ══════════════════════════════════════════════════════════════════════════
 * One array, and everything reads from it: the sidebar, the mobile drawer,
 * the command palette, the page title in the top bar, and `tests/nav.test.ts`
 * which asserts every href resolves to a real page.
 *
 * `MODULE_KEYS` is also what the product-boundary test inspects. It asserts
 * the list is non-empty *before* checking that no key looks like a customs
 * module — a guard that passes because the list vanished is not a guard.
 */

export const MODULE_KEYS = [
  'home',
  'search',
  'rate-terminal',
  'contracts',
  'rfqs',
  'bookings',
  'finance',
  'hs-codes',
  'ports',
  'business',
  'profile',
  'insights',
  'zeno',
] as const

export type ModuleKey = (typeof MODULE_KEYS)[number]

export interface NavItem {
  key: ModuleKey
  label: string
  href: string
  icon: LucideIcon
  /** Shown in the command palette to disambiguate similar names. */
  hint?: string
}

export interface NavGroup {
  label: string | null
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ key: 'home', label: 'Home', href: ROUTES.home, icon: Gauge, hint: 'Your freight at a glance' }],
  },
  {
    label: 'Rates',
    items: [
      { key: 'search', label: 'Search rates', href: ROUTES.search, icon: Search, hint: 'Price a lane now' },
      {
        key: 'rate-terminal',
        label: 'Rate terminal',
        href: ROUTES.rateTerminal,
        icon: TableProperties,
        hint: 'Weekly rates on your saved lanes',
      },
      {
        key: 'contracts',
        label: 'Contracts',
        href: ROUTES.contracts,
        icon: FileSignature,
        hint: 'Agreed rates and validity',
      },
    ],
  },
  {
    label: 'Requests',
    items: [
      { key: 'rfqs', label: 'Requests for quotation', href: ROUTES.rfqs, icon: Blocks, hint: 'Compare partner responses' },
    ],
  },
  {
    label: 'Shipments',
    items: [{ key: 'bookings', label: 'Bookings', href: ROUTES.bookings, icon: Ship, hint: 'Track every shipment' }],
  },
  {
    label: 'Money',
    items: [
      { key: 'finance', label: 'Finance', href: ROUTES.finance, icon: Receipt, hint: 'Invoices, credit and advances' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { key: 'hs-codes', label: 'HS code finder', href: ROUTES.hsCodes, icon: Tags, hint: 'Classification reference' },
      { key: 'ports', label: 'Port information', href: ROUTES.ports, icon: Anchor, hint: 'Terminals, handling, free time' },
      { key: 'zeno', label: 'Zeno AI', href: ROUTES.zeno, icon: Sparkles, hint: 'Ask about your freight' },
    ],
  },
  {
    label: 'Company',
    items: [
      { key: 'business', label: 'Business profile', href: ROUTES.business, icon: Building2, hint: 'Verification and documents' },
      { key: 'profile', label: 'Profile', href: ROUTES.profile, icon: UserRound, hint: 'Your account and demo reset' },
    ],
  },
  {
    label: 'Learn',
    items: [
      { key: 'insights', label: 'Insights', href: ROUTES.insights, icon: Newspaper, hint: 'Market notes and guides' },
    ],
  },
]

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)

export function navItemFor(key: ModuleKey): NavItem | undefined {
  return ALL_NAV_ITEMS.find((item) => item.key === key)
}

/**
 * The nav item a pathname belongs to.
 *
 * Longest-prefix rather than exact match, so `/bookings/PW-2026-004281`
 * still highlights Bookings. Home is exact-only or it would win everything.
 */
export function activeNavItem(pathname: string): NavItem | undefined {
  const candidates = ALL_NAV_ITEMS.filter((item) =>
    item.href === ROUTES.home ? pathname === ROUTES.home : pathname.startsWith(item.href),
  )
  return candidates.sort((a, b) => b.href.length - a.href.length)[0]
}
