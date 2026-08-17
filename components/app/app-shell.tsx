'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { ROUTES } from '@/lib/routes'
import { baseTween, overlayFade, panelSpring } from '@/lib/motion'
import { cn } from '@/lib/utils'

/** The shared drawer variant slides from the right; this nav is on the left. */
const leftDrawerSlide = {
  hidden: { x: '-100%' },
  show: { x: 0, transition: panelSpring },
  exit: { x: '-100%', transition: { duration: 0.24, ease: [0.65, 0, 0.35, 1] as const } },
}

import { PortWhizzLogo } from '@/components/brand/logo'
import { AppSidebar } from './sidebar'
import { AppTopbar } from './topbar'
import { CommandPalette } from './command-palette'
import { ZenoLauncher } from './zeno-launcher'
import { NAV_GROUPS, activeNavItem } from './nav-config'

/**
 * THE APPLICATION SHELL
 * ══════════════════════════════════════════════════════════════════════════
 * Sidebar, top bar, command palette and the Zeno slide-over. Everything the
 * customer app renders lives inside this.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [zenoOpen, setZenoOpen] = useState(false)

  // Navigating should always dismiss the mobile drawer, or it covers the page
  // the viewer just asked for.
  useEffect(() => setMobileOpen(false), [pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const openZeno = useCallback(() => setZenoOpen(true), [])

  return (
    // The ground carries the 56px draft grid — faint enough to read as a
    // machined surface rather than a pattern, and the reason the plates look
    // like they are sitting *on* something.
    <div className="pw-grid-bg flex min-h-dvh bg-ink">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenMobileNav={() => setMobileOpen(true)}
          onOpenZeno={openZeno}
        />
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      {/* ── Mobile navigation ──────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              variants={overlayFade}
              initial="hidden"
              animate="show"
              exit="exit"
              onClick={() => setMobileOpen(false)}
              className="pw-scrim fixed inset-0 z-40 lg:hidden"
              aria-hidden
            />
            <motion.nav
              variants={leftDrawerSlide}
              initial="hidden"
              animate="show"
              exit="exit"
              // The drawer is the same ground as the desktop rail, so the
              // product does not change material when the viewport narrows.
              className="pw-grid-bg fixed inset-y-0 left-0 z-50 w-[280px] overflow-y-auto border-r border-hairline bg-ink lg:hidden"
              aria-label="Main"
            >
              <div className="flex h-16 items-center justify-between border-b border-hairline px-4">
                <Link href={ROUTES.home} className="rounded-chip">
                  <PortWhizzLogo subtitle="Freight" />
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-chip text-text-muted transition-colors hover:bg-surface hover:text-text"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-2 py-3">
                {NAV_GROUPS.map((group, i) => (
                  <div key={group.label ?? `g-${i}`} className={cn(i > 0 && 'mt-4')}>
                    {group.label && <p className="pw-stencil mb-1.5 px-3">{group.label}</p>}
                    <ul className="flex flex-col gap-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon
                        const isActive = activeNavItem(pathname)?.key === item.key
                        return (
                          <li key={item.key}>
                            <Link
                              href={item.href}
                              aria-current={isActive ? 'page' : undefined}
                              className={cn(
                                'relative flex min-h-[44px] items-center gap-2.5 rounded-chip px-3 py-2.5 text-body transition-colors',
                                isActive
                                  ? 'font-display font-semibold tracking-[-0.005em] text-text'
                                  : 'text-text-muted hover:bg-surface/70 hover:text-text',
                              )}
                            >
                              {/* Plain plate, no layoutId: the desktop rail is
                                  display:none rather than unmounted at this
                                  width, and two elements sharing one layoutId
                                  make framer animate between a visible item
                                  and a hidden one. */}
                              {isActive && (
                                <span
                                  className="pw-plate absolute inset-0 overflow-hidden rounded-chip"
                                  aria-hidden
                                >
                                  <span className="absolute inset-y-1 left-0 w-[3px] rounded-r-full bg-signal" />
                                </span>
                              )}
                              <Icon
                                className={cn('relative h-4 w-4', isActive ? 'text-signal' : 'text-text-faint')}
                                aria-hidden
                              />
                              <span className="relative">{item.label}</span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <ZenoLauncher open={zenoOpen} onOpenChange={setZenoOpen} />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   PAGE SHELL
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Standard page frame: width, padding, and a header every module fills in.
 *
 * The predecessor took no props at all, so all 24 screens hand-rolled their
 * own heading block and drifted apart. Making the title part of the frame is
 * what keeps twelve modules looking like one product.
 *
 * The title is set in the display face because that single change is what
 * makes a screen identifiable from across a room — the body face at 26px is
 * just large prose. The header arrives with one short rise; the plates below
 * it are the modules' own to stagger, and two orchestrations fighting on one
 * screen is worse than either.
 */
export function PageShell({
  title,
  description,
  actions,
  notice,
  children,
  className,
  width = 'default',
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  /** Small print under the header — usually the simulated-data disclaimer. */
  notice?: React.ReactNode
  children: React.ReactNode
  className?: string
  width?: 'default' | 'wide' | 'narrow'
}) {
  const max = { default: 'max-w-[1400px]', wide: 'max-w-[1680px]', narrow: 'max-w-[860px]' }[width]

  return (
    <div className={cn('mx-auto px-4 py-6 sm:px-6 lg:py-8', max, className)}>
      {(title || actions) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={baseTween}
          className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3"
        >
          {/* The title column asks for 22rem and grows into whatever is left.
              A basis rather than `flex-1` is what makes the pair WRAP instead
              of squeezing: below 22rem the basis resolves to 100%, the column
              takes the whole line and the actions drop underneath it. */}
          <div className="min-w-0 grow basis-[min(100%,22rem)]">
            {title && (
              <h2 className="pw-plate-title text-[22px] leading-[1.1] tracking-[-0.025em] sm:text-[26px]">{title}</h2>
            )}
            {description && (
              <p className="mt-2 max-w-3xl text-data leading-relaxed text-text-muted">{description}</p>
            )}
          </div>
          {/* This row used to be `shrink-0`, which was protecting it from the
              title column squeezing it on a wide screen. The title column has
              carried `min-w-0` for a while, so it gives way first anyway — and
              `shrink-0` bought that protection at the price of the whole page:
              a control row wider than the viewport could not shrink, so it
              pushed the document sideways on every screen that had one. It now
              shrinks and wraps like everything else; `min-w-0` lets a scroll
              box inside an action actually scroll. */}
          {actions && (
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div>
          )}
        </motion.div>
      )}

      {children}

      {notice && (
        <p className="mt-8 font-mono text-[11px] leading-relaxed tracking-[0.02em] text-text-faint">{notice}</p>
      )}
    </div>
  )
}
