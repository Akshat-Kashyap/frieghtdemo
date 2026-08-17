'use client'

import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { HERO_JOB_ID } from '@/data/jobs'
import { ROUTES } from '@/lib/routes'
import { fastTween } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { PortWhizzLogo } from '@/components/brand/logo'
import { Button } from '@/components/ui/primitives'

/**
 * THE MARKETING HEADER
 * ══════════════════════════════════════════════════════════════════════════
 * At rest it is nothing at all: the harbour plate starts below it now, so the
 * bar sits on the page ground and the nav labels are read against the ground
 * they were contrast-checked against. That deleted a hand-rolled wash of
 * ground colour that used to be painted behind the labels to rescue them from
 * landing on crane steel — a fix for a problem the layout no longer has.
 *
 * Once the page has moved, the plate slides underneath the bar and the bar is
 * genuinely floating over the footage. That is what `.pw-glass` is for, and
 * this is one of the three places in the product that qualifies: real
 * saturation and blur, three lit edges so the glass has thickness, and the
 * elevation from the scale rather than a shadow invented here.
 */

const NAV_LINKS = [
  { label: 'Book freight', href: '#search' },
  { label: 'How it works', href: '#journey' },
  { label: 'What you see', href: '#visibility' },
  { label: 'Documents', href: '#documents' },
]

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const shouldReduce = useReducedMotion()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300',
        // Open, the bar is not a bar any more: it is a sheet carrying five
        // destinations, dropped over a photograph of a container terminal. The
        // dense glass is the rule for that — a menu you cannot read through is
        // the effect winning over the content, which is the one trade this
        // material system never makes.
        mobileOpen
          ? 'pw-glass-panel border-x-0 border-t-0 border-b-hairline'
          : scrolled
            ? 'pw-glass border-x-0 border-t-0 border-b-hairline'
            : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="relative mx-auto flex h-[68px] max-w-[1280px] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/freight-forwarding-demo" className="shrink-0 rounded-chip" aria-label="PortWhizz home">
          <PortWhizzLogo subtitle="Freight Forwarding" />
        </Link>

        <nav className="ml-2 hidden min-w-0 items-center gap-1 lg:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-chip px-3 py-2.5 text-data font-medium text-text-muted transition-colors hover:bg-surface/70 hover:text-text"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button asChild variant="ghost" className="hidden h-10 md:inline-flex">
            <Link href={ROUTES.booking(HERO_JOB_ID)}>Track a shipment</Link>
          </Button>

          {/* The one filled control on the page ground, lit by the Button
              primitive. It used to carry a hand-written cast in a blue that
              exists nowhere else in this product. */}
          <Button asChild variant="primary" className="hidden h-10 rounded-full px-5 font-semibold sm:inline-flex">
            <a href="#search">Book freight</a>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={shouldReduce ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={shouldReduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={fastTween}
            className="pw-groove overflow-hidden lg:hidden"
            aria-label="Mobile"
          >
            <div className="flex flex-col gap-0.5 px-4 py-3">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-11 items-center rounded-chip px-3 text-body text-text-muted transition-colors hover:bg-raised-2 hover:text-text"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href={ROUTES.booking(HERO_JOB_ID)}
                onClick={() => setMobileOpen(false)}
                className="flex min-h-11 items-center rounded-chip px-3 text-body text-text-muted transition-colors hover:bg-raised-2 hover:text-text"
              >
                Track a shipment
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
