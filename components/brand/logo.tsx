import { cn } from '@/lib/utils'

/**
 * The PortWhizz mark.
 *
 * Reads two ways on purpose: a container box seen in plan (the "port" half)
 * with a route chevron accelerating out of it (the "whizz" half), anchored by
 * a node dot at the origin corner. Drawn on a 24-unit grid with 2px strokes so
 * it stays crisp at 16px in the sidebar and at 40px in the nav.
 */
export function PortWhizzMark({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn('h-6 w-6', className)}
      {...props}
    >
      {/* Container / port boundary — deliberately open on the right so the
          route reads as leaving the port rather than sitting inside it. */}
      <path
        d="M15.5 3.5H5.5A2 2 0 0 0 3.5 5.5v13a2 2 0 0 0 2 2h10"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        className="text-signal"
      />
      {/* Route chevrons — the acceleration. */}
      <path
        d="M11.5 8.25 15.75 12l-4.25 3.75"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-route"
      />
      <path
        d="M17 8.25 21.25 12 17 15.75"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-route opacity-45"
      />
      {/* Origin node. */}
      <circle cx="7.25" cy="12" r="1.6" fill="currentColor" className="text-signal" />
    </svg>
  )
}

/** Mark + wordmark. `subtitle` carries the module name in product chrome. */
export function PortWhizzLogo({
  className,
  subtitle,
  compact = false,
}: {
  className?: string
  subtitle?: string
  compact?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <PortWhizzMark className={compact ? 'h-5 w-5' : 'h-[26px] w-[26px]'} />
      {!compact && (
        <span className="flex flex-col leading-none">
          {/* The wordmark is signage — the display face, condensed a touch and
              set tight, so it reads as painted on the chrome rather than typed
              into it. The subtitle is the stencilled module identification. */}
          <span className="font-display text-[15px] font-semibold tracking-[-0.02em] text-text [font-variation-settings:'wdth'_94]">
            Port<span className="text-signal">Whizz</span>
          </span>
          {subtitle && <span className="pw-stencil mt-1.5 block">{subtitle}</span>}
        </span>
      )}
    </span>
  )
}
