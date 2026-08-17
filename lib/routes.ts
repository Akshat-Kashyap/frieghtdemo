/**
 * ROUTES
 * ══════════════════════════════════════════════════════════════════════════
 * Every internal path in one place.
 *
 * This file exists because the previous route base was written as a literal
 * string in seven components, a selector and a data file — TypeScript cannot
 * see inside a template literal, so moving the application meant grepping and
 * hoping. A link that 404s in front of an audience is the most avoidable
 * failure this demo has, and `tests/nav.test.ts` asserts every route here
 * resolves to a real page.
 */

const APP = '/freight-forwarding-demo/app'

export const ROUTES = {
  /** The marketing surface. */
  landing: '/freight-forwarding-demo',

  /** The customer application. */
  home: APP,

  search: `${APP}/search`,

  rfqs: `${APP}/rfqs`,
  rfq: (id: string) => `${APP}/rfqs/${id}`,

  contracts: `${APP}/contracts`,
  contract: (id: string) => `${APP}/contracts/${id}`,

  rateTerminal: `${APP}/rate-terminal`,

  zeno: `${APP}/zeno`,

  bookings: `${APP}/bookings`,
  booking: (id: string) => `${APP}/bookings/${id}`,
  bookingTab: (id: string, tab: string) => `${APP}/bookings/${id}?tab=${tab}`,

  finance: `${APP}/finance`,
  financeTab: (tab: string) => `${APP}/finance?tab=${tab}`,

  business: `${APP}/business`,

  hsCodes: `${APP}/tools/hs-codes`,
  hsCode: (code: string) => `${APP}/tools/hs-codes?code=${code}`,

  ports: `${APP}/tools/ports`,
  port: (code: string) => `${APP}/tools/ports/${code}`,

  insights: `${APP}/insights`,
  article: (slug: string) => `${APP}/insights/${slug}`,

  profile: `${APP}/profile`,
} as const

/** Prefix used by the app shell to decide which nav item is active. */
export const APP_BASE = APP
