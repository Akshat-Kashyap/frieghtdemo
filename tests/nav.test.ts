import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

import { ALL_NAV_ITEMS, MODULE_KEYS, activeNavItem, navItemFor } from '@/components/app/nav-config'
import { createSeed } from '@/data'
import { APP_BASE, ROUTES } from '@/lib/routes'
import { selectSearch } from '@/store/selectors'
import type { FreightState } from '@/store/freight-store'

/**
 * EVERY ROUTE RESOLVES TO A REAL PAGE
 * ══════════════════════════════════════════════════════════════════════════
 * `lib/routes.ts`, `components/app/nav-config.tsx`, `components/app/command-
 * palette.tsx` and `components/app/module-placeholder.tsx` all promise, in
 * their file-top comments, that this test exists — and for most of the build
 * it did not. A link that 404s in front of an audience is the most avoidable
 * failure this demo has, and it is precisely the failure that a comment
 * claiming coverage makes *more* likely, because it stops anyone checking by
 * hand. `tests/boundaries.test.ts` has the same story written in it about a
 * guard that read a deleted file and went silently green.
 *
 * The check is against the filesystem rather than against a list of expected
 * paths. A list would have to be edited alongside every new module, which
 * means it would drift, which means it would pass while the route was broken.
 * Walking `app/` asks the only question that matters: if a viewer clicks this,
 * is there a page there.
 *
 * The last block is the one that closes the build out. `ModulePlaceholder`
 * exists so that no link can 404 while the modules are being filled in, and
 * its own comment says it should have no importers once the build is
 * finished. That sentence is now an assertion, and it names the files still
 * holding a scaffold rather than leaving someone to click every route.
 */

const ROOT = join(__dirname, '..')
const APP_DIR = join(ROOT, 'app')
const SOURCE_EXT = /\.(ts|tsx)$/

/** The scaffold marker itself, which is naturally allowed to name itself. */
const PLACEHOLDER_FILE = join('components', 'app', 'module-placeholder.tsx')

/** Placeholder for a dynamic segment. Must contain no `/` and no `?`. */
const SAMPLE = 'sample-id'

/* ══════════════════════════════════════════════════════════════════════════
   RESOLVING A PATHNAME TO A PAGE
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Resolves a pathname to the directory Next would render it from.
 *
 * Walks one segment at a time, preferring a literal directory and falling
 * back to a dynamic `[param]` one — which is what makes `/bookings/PW-123`
 * resolve to `bookings/[id]/page.tsx` rather than being reported as missing.
 * Returns null when a segment has nowhere to go.
 */
function resolvePageDir(pathname: string): string | null {
  const segments = pathname.split('?')[0]!.split('/').filter(Boolean)

  let dir = APP_DIR
  for (const segment of segments) {
    const literal = join(dir, segment)
    if (existsSync(literal) && statSync(literal).isDirectory()) {
      dir = literal
      continue
    }

    const dynamic = readdirSync(dir).find(
      (entry) => /^\[.+\]$/.test(entry) && statSync(join(dir, entry)).isDirectory(),
    )
    if (!dynamic) return null
    dir = join(dir, dynamic)
  }

  return dir
}

/** True when a pathname has a `page.tsx` behind it. */
function pageExistsFor(pathname: string): boolean {
  const dir = resolvePageDir(pathname)
  return dir !== null && existsSync(join(dir, 'page.tsx'))
}

/**
 * Every entry in ROUTES as a concrete pathname.
 *
 * Route builders are called with a sample argument rather than being skipped,
 * because a detail route is exactly the kind that gets added without its
 * `[id]` directory. `fn.length` supplies the arity so a two-argument builder
 * like `bookingTab` is not called with a stray `undefined` in the path.
 */
function everyRoutePath(): Array<{ key: string; path: string }> {
  return Object.entries(ROUTES).map(([key, value]) => ({
    key,
    path:
      typeof value === 'function'
        ? (value as (...args: string[]) => string)(...Array<string>(value.length).fill(SAMPLE))
        : value,
  }))
}

/** Every `.ts`/`.tsx` file under `dir`, skipping build output and dotfiles. */
function walkSource(dir: string, acc: string[] = []): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return acc
  }

  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.next' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walkSource(full, acc)
    else if (SOURCE_EXT.test(entry)) acc.push(full)
  }
  return acc
}

/** The application's own source: the two trees a customer's click can reach. */
function applicationFiles(): string[] {
  return [...walkSource(APP_DIR), ...walkSource(join(ROOT, 'components'))]
}

/* ══════════════════════════════════════════════════════════════════════════
   ROUTES
   ══════════════════════════════════════════════════════════════════════════ */

describe('routes', () => {
  it('exposes the whole application, not a stub', () => {
    // A resolver that found nothing would pass every assertion below it.
    expect(everyRoutePath().length).toBeGreaterThanOrEqual(15)
  })

  it('resolves every entry in ROUTES to a page that exists', () => {
    const broken = everyRoutePath()
      .filter(({ path }) => !pageExistsFor(path))
      .map(({ key, path }) => `ROUTES.${key} → ${path}`)

    expect(broken, `Routes with no page behind them:\n${broken.join('\n')}`).toEqual([])
  })

  it('builds every path under the one application base', () => {
    // Catches a path assembled by hand instead of from the APP constant —
    // the mistake that survives a rename of the route base.
    const stray = everyRoutePath()
      .filter(({ path }) => path !== ROUTES.landing && !path.startsWith(APP_BASE))
      .map(({ key, path }) => `ROUTES.${key} → ${path}`)

    expect(stray, `Paths outside ${APP_BASE}:\n${stray.join('\n')}`).toEqual([])
  })
})

/**
 * The builders get their own block because they fail differently.
 *
 * A static route is missing or it is not. A builder can resolve to a page and
 * still be wrong: if `bookings/[id]` were renamed to `bookings/[jobId]`, the
 * walk above would still find a dynamic directory and a `page.tsx` inside it,
 * while `const { id } = await params` in that page would quietly read
 * `undefined` and the shipment file would render empty. So the segment name
 * is pinned, not just its existence.
 */
describe('route builders', () => {
  const DYNAMIC = [
    { key: 'rfq', path: ROUTES.rfq(SAMPLE), segment: '[id]' },
    { key: 'contract', path: ROUTES.contract(SAMPLE), segment: '[id]' },
    { key: 'booking', path: ROUTES.booking(SAMPLE), segment: '[id]' },
    { key: 'bookingTab', path: ROUTES.bookingTab(SAMPLE, 'documents'), segment: '[id]' },
    { key: 'port', path: ROUTES.port(SAMPLE), segment: '[code]' },
    { key: 'article', path: ROUTES.article(SAMPLE), segment: '[slug]' },
  ]

  it.each(DYNAMIC)('$key resolves through a $segment directory with a page in it', ({ path, segment }) => {
    const dir = resolvePageDir(path)
    expect(dir, `${path} resolves to nothing`).not.toBeNull()
    expect(basename(dir!), `${path} resolved to ${dir && relative(ROOT, dir)}`).toBe(segment)
    expect(existsSync(join(dir!, 'page.tsx'))).toBe(true)
  })

  /**
   * The tabbed routes are the same page with a query on it, so the only
   * things worth asserting are that they land on their own list page and that
   * the query is well formed. A tab route that resolved somewhere else would
   * mean a deep link out of Zeno or the command palette opened the wrong
   * module with the right-looking address.
   */
  const QUERY = [
    { key: 'bookingTab', path: ROUTES.bookingTab(SAMPLE, 'documents'), base: ROUTES.booking(SAMPLE), param: 'tab' },
    { key: 'financeTab', path: ROUTES.financeTab('invoices'), base: ROUTES.finance, param: 'tab' },
    { key: 'hsCode', path: ROUTES.hsCode('6109.10.00'), base: ROUTES.hsCodes, param: 'code' },
  ]

  it.each(QUERY)('$key deep-links its own page with a ?$param query', ({ path, base, param }) => {
    expect(path.startsWith(`${base}?${param}=`)).toBe(true)
    expect(path.split('?')[1]).not.toBe(`${param}=`)
    expect(resolvePageDir(path)).toBe(resolvePageDir(base))
  })

  /**
   * The other half of a deep link: something has to read the query back.
   * A builder emitting `?tab=` while the workspace reads `?panel=` produces a
   * link that opens the right page on the wrong tab and reports no error at
   * all, which is the kind of thing nobody notices until a demo.
   *
   * This is deliberately a whole-tree check rather than a per-module one —
   * it catches a key renamed on one side only, not a key read by the wrong
   * module.
   */
  it('has a reader for every query key a route builder emits', () => {
    const sources = applicationFiles().map((file) => readFileSync(file, 'utf8'))
    for (const param of new Set(QUERY.map((q) => q.param))) {
      const read = sources.some((source) => source.includes(`params.get('${param}')`))
      expect(read, `no component reads params.get('${param}')`).toBe(true)
    }
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   NAVIGATION
   ══════════════════════════════════════════════════════════════════════════ */

describe('navigation', () => {
  it('points every nav item at a page that exists', () => {
    const broken = ALL_NAV_ITEMS.filter((item) => !pageExistsFor(item.href)).map(
      (item) => `${item.key} → ${item.href}`,
    )

    expect(broken, `Nav items with no page behind them:\n${broken.join('\n')}`).toEqual([])
  })

  /**
   * Stronger than "the page exists": the href must be a value ROUTES itself
   * publishes. A nav item pointing at a hand-typed path that happens to be
   * correct today is a path nothing else in the codebase knows about, and it
   * is the one that gets left behind when the route base moves.
   */
  it('takes every href from ROUTES rather than typing one', () => {
    // `ROUTES` is `as const`, so its values are string *literals* and route
    // builders. A `value is string` predicate is illegal against that union
    // (string is wider than the literals) and a `Set` of the literals cannot
    // be asked about an arbitrary href — so widen on the way in, with a
    // flatMap that drops the builders rather than a cast that hides them.
    const known = new Set<string>(
      Object.values(ROUTES).flatMap((value) => (typeof value === 'string' ? [value] : [])),
    )

    const strangers = ALL_NAV_ITEMS.filter((item) => !known.has(item.href)).map(
      (item) => `${item.key} → ${item.href}`,
    )

    expect(strangers, `Nav hrefs that are not ROUTES values:\n${strangers.join('\n')}`).toEqual([])
  })

  it('gives every module key exactly one nav item, and no orphans', () => {
    const missing = MODULE_KEYS.filter((key) => !navItemFor(key))
    expect(missing, `Module keys with no nav item: ${missing.join(', ')}`).toEqual([])

    // The reverse direction: `NavItem.key` is typed as `ModuleKey`, so the
    // compiler already refuses an unknown key — what it cannot see is a nav
    // item declared twice, or a module key listed with no item beside it.
    const keys = ALL_NAV_ITEMS.map((item) => item.key)
    const orphans = keys.filter((key) => !(MODULE_KEYS as readonly string[]).includes(key))
    expect(orphans, `Nav items with no module key: ${orphans.join(', ')}`).toEqual([])
    expect(keys.length).toBe(MODULE_KEYS.length)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('gives every nav item a distinct href', () => {
    const hrefs = ALL_NAV_ITEMS.map((item) => item.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('labels and describes every item, because the palette renders both', () => {
    for (const item of ALL_NAV_ITEMS) {
      expect(item.label.length, `${item.key} has no label`).toBeGreaterThan(0)
      expect(item.hint?.length ?? 0, `${item.key} has no palette hint`).toBeGreaterThan(0)
    }
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   ACTIVE ITEM
   ══════════════════════════════════════════════════════════════════════════ */

describe('active nav resolution', () => {
  it('keeps a detail page under its list', () => {
    // Longest-prefix, so a shipment still lights up Bookings.
    expect(activeNavItem(ROUTES.booking('PW-2026-004281'))?.key).toBe('bookings')
    expect(activeNavItem(ROUTES.contract('PW-CON-0031'))?.key).toBe('contracts')
    expect(activeNavItem(ROUTES.article('writing-a-request-for-quotation'))?.key).toBe('insights')
    expect(activeNavItem(ROUTES.port('INNSA'))?.key).toBe('ports')

    // A tab query is part of the same shipment, not a different module.
    expect(activeNavItem(ROUTES.bookingTab('PW-2026-004281', 'documents'))?.key).toBe('bookings')
  })

  it('does not let Home win every route', () => {
    // Home is a prefix of literally everything, so it is exact-match only.
    // If that special case is ever dropped, the sidebar highlights Home on
    // every screen in the product and nothing else ever lights up.
    expect(activeNavItem(ROUTES.home)?.key).toBe('home')
    expect(activeNavItem(ROUTES.finance)?.key).toBe('finance')
    expect(activeNavItem(ROUTES.rfqs)?.key).toBe('rfqs')
    expect(activeNavItem(ROUTES.booking('PW-2026-004281'))?.key).not.toBe('home')
    expect(activeNavItem(ROUTES.hsCodes)?.key).not.toBe('home')
  })

  it('prefers the more specific of two overlapping prefixes', () => {
    // `/tools/ports` sits under no other item, but the rate terminal and the
    // rates search share a parent word — assert the longest href wins rather
    // than whichever happens to be declared first.
    expect(activeNavItem(ROUTES.rateTerminal)?.key).toBe('rate-terminal')
    expect(activeNavItem(ROUTES.hsCodes)?.key).toBe('hs-codes')
  })

  it('returns nothing for a path outside the application', () => {
    // The marketing site shares no shell with the app, so a nav item lighting
    // up there would be a sidebar rendered on a page that has none.
    expect(activeNavItem(ROUTES.landing)).toBeUndefined()
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   ⌘K
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The command palette says, in its own comment, that "every hit carries a
 * route, and `tests/nav.test.ts` checks those routes exist". Record hits are
 * built by `selectSearch` from live records rather than from the nav list, so
 * checking the nav alone would leave the busiest links in the product — the
 * ones an operator actually uses to jump between shipments — unguarded.
 */
describe('command palette hits', () => {
  const state = { ...createSeed(), revision: 0 } as unknown as FreightState

  it('routes every record hit to a page that exists', () => {
    const hits = ['pw', 'mscu', 'apex', 'exc'].flatMap((query) => selectSearch(state, query, 12))
    expect(hits.length, 'the search found nothing, so it asserted nothing').toBeGreaterThan(0)

    const broken = hits.filter((hit) => !pageExistsFor(hit.href)).map((hit) => `${hit.kind} ${hit.id} → ${hit.href}`)
    expect(broken, `Search hits with no page behind them:\n${broken.join('\n')}`).toEqual([])
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   THE BUILD IS FINISHED
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * `components/app/module-placeholder.tsx` documents its own end: "It should
 * have no importers by the time the build is finished." A scaffold that says
 * "Not built yet" is honest while a module is in flight and indefensible in a
 * finished demo, and it is invisible from every other test in this repo —
 * the route resolves, the nav item works, the page renders. Only a viewer
 * clicking it finds out.
 */
describe('module completion', () => {
  it('walks the application source it claims to walk', () => {
    // Same reason the boundary test counts its files first: a walk that
    // returns nothing passes the assertion below it without checking a thing.
    expect(applicationFiles().length).toBeGreaterThan(50)
  })

  it('renders no scaffold marker anywhere — every module is built', () => {
    const holdouts = applicationFiles()
      .filter((file) => relative(ROOT, file) !== PLACEHOLDER_FILE)
      .filter((file) => /ModulePlaceholder|module-placeholder/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(ROOT, file))

    expect(
      holdouts,
      [
        'These files still render the "Not built yet" scaffold:',
        ...holdouts.map((file) => `  · ${file}`),
        'Each one is a route a viewer can reach that shows a placeholder instead of a module.',
        'Drop the import when the module lands, and delete components/app/module-placeholder.tsx once this list is empty.',
      ].join('\n'),
    ).toEqual([])
  })
})
