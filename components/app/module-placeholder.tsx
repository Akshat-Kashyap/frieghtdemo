import { Construction } from 'lucide-react'

/**
 * Scaffold marker.
 *
 * Every route in the customer application exists from the first commit so
 * that no navigation link can 404 while the modules are being filled in —
 * `tests/nav.test.ts` asserts exactly that. This component is what an
 * unbuilt route renders, and it says so plainly rather than faking content.
 *
 * It should have no importers by the time the build is finished.
 */
export function ModulePlaceholder({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col items-start gap-3 px-4 py-16 sm:px-6 lg:px-8">
      <span className="inline-flex items-center gap-2 rounded-chip border border-hairline bg-raised-2 px-2.5 py-1 text-micro font-medium uppercase tracking-[0.1em] text-text-faint">
        <Construction className="h-3.5 w-3.5" aria-hidden />
        Not built yet
      </span>
      <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-text">{title}</h1>
      {detail && <p className="pw-id text-data text-text-muted">{detail}</p>}
      <p className="max-w-prose text-data leading-relaxed text-text-muted">
        This route is scaffolded so the navigation is complete and nothing links into a dead end. The module lands
        later in the build.
      </p>
    </div>
  )
}
