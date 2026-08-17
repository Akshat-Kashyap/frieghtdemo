import type { Metadata, Viewport } from 'next'
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google'
import { Toaster } from 'sonner'

/**
 * THREE FACES, THREE JOBS
 * ══════════════════════════════════════════════════════════════════════════
 * Geist did everything here, which is why every screen read the same. These
 * three do not overlap:
 *
 *  · Archivo is a signage grotesque with a width axis. It sets plate
 *    headings and the stencilled module labels — the type you read from
 *    across a room, the way a berth number is painted on a quay.
 *  · Plex Sans carries prose. It was drawn for institutional documents and
 *    holds its counters at 13px, which is where this product actually lives.
 *  · Plex Mono carries every figure. This is a tabular product; digits that
 *    change width mid-count are the fastest way to look unfinished.
 *
 * `display: 'swap'` on all three: a freight desk should read the numbers
 * before the webfont lands, not after.
 */
const display = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
  axes: ['wdth'],
})

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-sans',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
})

import { BRAND, DEMO } from '@/data/copy'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} · ${BRAND.module}`,
    template: `%s · ${BRAND.name}`,
  },
  description: `${BRAND.primaryMessage} ${BRAND.secondaryMessage} — ${DEMO.badge}.`,
  robots: { index: false, follow: false }, // simulated environment: keep it out of indexes
}

export const viewport: Viewport = {
  // The one literal colour in the app. `<meta name="theme-color">` paints the
  // browser's own chrome, outside the document, so it cannot read a CSS custom
  // property — this has to be the resolved value of `--color-ink`. Keep the two
  // in step: a stale value here shows as a seam between the mobile address bar
  // and the page ground.
  themeColor: '#e2e8e6',
  colorScheme: 'light',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${plexSans.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-ink text-text antialiased">
        {/* Keyboard users land here first — this product is operated by keyboard. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-chip focus:border focus:border-signal focus:bg-raised focus:px-3 focus:py-2 focus:text-body focus:text-text"
        >
          Skip to content
        </a>

        {children}

        <Toaster
          position="bottom-right"
          theme="light"
          closeButton
          toastOptions={{
            classNames: {
              toast: 'pw-overlay !rounded-card !bg-surface !border-hairline',
              title: '!text-text !font-mono !text-micro !uppercase !tracking-[0.14em]',
              description: '!text-text-muted !text-data !font-sans !normal-case !tracking-normal',
              actionButton: '!bg-signal !text-on-accent !text-micro !font-medium',
              cancelButton: '!bg-raised-2 !text-text-muted !text-micro',
            },
          }}
        />
      </body>
    </html>
  )
}
