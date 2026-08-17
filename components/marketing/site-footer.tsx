import Link from 'next/link'
import { ArrowUp } from 'lucide-react'

import { BOUNDARY, BRAND, DEMO } from '@/data/copy'
import { HERO_JOB_ID } from '@/data/jobs'
import { ROUTES } from '@/lib/routes'
import { PortWhizzLogo } from '@/components/brand/logo'

/**
 * The footer of the customer-facing page.
 *
 * The link groups are what a customer came for — booking, their shipments,
 * their rates, their money. Everything here lands inside the customer
 * application; there is no operations surface to link to.
 *
 * Materially this is the last plate: the page ground runs the whole way down
 * and stops against a near-white face, joined with a machined groove rather
 * than a drawn line — one dark pixel with one lit pixel under it, which is
 * what makes an edge read as a joint between two thicknesses instead of a
 * rule someone put there. It stays a server component; a footer that ships
 * JavaScript to fade itself in is spending the reader's battery on nothing,
 * and "back to top" is an anchor the browser can already animate now that the
 * viewport scrolls again.
 */
const LINKS = [
  {
    heading: 'Book',
    items: [
      { label: 'Search freight options', href: '#search' },
      { label: 'How it works', href: '#journey' },
      { label: 'What you see', href: '#visibility' },
      { label: 'Documents', href: '#documents' },
    ],
  },
  {
    heading: 'Your shipments',
    items: [
      { label: 'Track a shipment', href: ROUTES.booking(HERO_JOB_ID) },
      { label: 'All bookings', href: ROUTES.bookings },
      { label: 'Requests for quotation', href: ROUTES.rfqs },
      { label: 'Contracts', href: ROUTES.contracts },
    ],
  },
  {
    heading: 'Rates & tools',
    items: [
      { label: 'Rate terminal', href: ROUTES.rateTerminal },
      { label: 'HS code finder', href: ROUTES.hsCodes },
      { label: 'Port information', href: ROUTES.ports },
      { label: 'Insights', href: ROUTES.insights },
    ],
  },
  {
    heading: 'Your account',
    items: [
      { label: 'Finance', href: ROUTES.finance },
      { label: 'Business profile', href: ROUTES.business },
      { label: 'Profile & demo reset', href: ROUTES.profile },
    ],
  },
]

/* 44px minimum on every target, and the rows carry no gap because the target
   IS the spacing. A 13px link with 8px of margin looks identical and is half
   the size under a thumb. */
const LINK_CLASS =
  'flex min-h-11 items-center rounded-chip text-data text-text-muted transition-colors hover:text-signal'

export function SiteFooter() {
  return (
    <footer className="pw-groove pw-noise relative bg-surface">
      <div className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
          <div>
            <PortWhizzLogo subtitle="Freight Forwarding" />
            <p className="mt-4 max-w-sm text-data leading-relaxed text-text-muted">{BOUNDARY.statement}</p>
            <p className="mt-3 text-data font-medium text-text">{BRAND.secondaryMessage}</p>

            {/* An in-page anchor, so the browser's own smooth scroll does the
                work — no handler, no client bundle. */}
            <a
              href="#main"
              className="pw-tactile mt-6 inline-flex h-11 items-center gap-2 rounded-chip px-4 text-data font-medium text-text"
            >
              <ArrowUp className="h-3.5 w-3.5 text-signal" aria-hidden />
              Back to top
            </a>
          </div>

          <nav className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4" aria-label="Footer">
            {LINKS.map((group) => (
              <div key={group.heading}>
                <p className="pw-stencil mb-1.5">{group.heading}</p>
                <ul className="flex flex-col">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      {item.href.startsWith('#') ? (
                        <a href={item.href} className={LINK_CLASS}>
                          {item.label}
                        </a>
                      ) : (
                        <Link href={item.href} className={LINK_CLASS}>
                          {item.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="pw-groove mt-12 flex flex-wrap items-start justify-between gap-4 pt-6">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-amber/30 bg-amber/10 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-amber shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.5)]">
            <span className="pw-stud h-1 w-1 text-amber" aria-hidden />
            {DEMO.badge}
          </p>
          <p className="max-w-2xl text-[11px] leading-relaxed text-text-faint">
            All rates, schedules, documents and invoices in this environment are simulated. PortWhizz is the digital
            operating layer for a freight forwarder — not a carrier, transporter, warehouse, customs broker, lender,
            government platform or live freight marketplace.
          </p>
        </div>
      </div>
    </footer>
  )
}
