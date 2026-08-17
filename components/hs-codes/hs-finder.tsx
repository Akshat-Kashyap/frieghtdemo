'use client'

import { AlertTriangle, ChevronRight, Search, ShieldCheck, Tags } from 'lucide-react'
import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import {
  HS_CODES,
  HS_DISCLAIMER,
  POLICY_DETAIL,
  POLICY_LABEL,
  POLICY_TONE,
  findHsCode,
  hsChapters,
  searchHsCodes,
  type HsCode,
} from '@/data/hs-codes'
import { count, formatDate } from '@/lib/format'
import { DEMO_NOW } from '@/lib/demo-clock'
import { cn } from '@/lib/utils'

import { PageShell } from '@/components/app/app-shell'
import { Card, EmptyState, Panel, Skeleton, StatusBadge } from '@/components/ui/primitives'
import { Basis, CardHeading, FigureRail, RecordPanel } from '@/components/finance/pieces'

/**
 * HS CODE FINDER
 * ══════════════════════════════════════════════════════════════════════════
 * Search a product, get its classification, the published rates that attach
 * to it, and whether it can be imported freely.
 *
 * There is no calculator here, on purpose. This tool tells you what the
 * percentages *are*; working out what a consignment owes is a customs job
 * with a different set of obligations, and mixing the two is how a reference
 * tool starts being read as advice.
 *
 * WHAT THE MATERIAL IS DOING
 * ══════════════════════════════════════════════════════════════════════════
 * A tariff line is not four facts, it is one number narrowed three times, and
 * the drill is the only part of classification a non-specialist has to feel
 * confident about. So the four levels are drawn as a nested ladder with the
 * digits INHERITED FROM THE LEVEL ABOVE dimmed out — 84 · 8481 · 848180 ·
 * 84818090 — which turns four rows of similar-looking numbers into a visible
 * act of narrowing. The national line is the only raised, tinted row on the
 * ladder because it is the only one you actually declare against.
 */
export function HsFinder() {
  return (
    <Suspense
      fallback={
        <PageShell title="HS code finder">
          <Skeleton className="h-[420px]" />
        </PageShell>
      }
    >
      <HsFinderInner />
    </Suspense>
  )
}

function HsFinderInner() {
  const params = useSearchParams()
  const [query, setQuery] = useState('')
  const [selectedCode, setSelectedCode] = useState<string | null>(params.get('code'))

  const results = useMemo(() => searchHsCodes(query, 12), [query])
  const selected = selectedCode ? findHsCode(selectedCode) : undefined
  const chapters = useMemo(() => hsChapters(), [])

  return (
    <PageShell
      width="wide"
      title="HS code finder"
      description="Classify what you are shipping, and see the published rates and import policy that attach to it."
      notice={`${HS_DISCLAIMER} Rates reviewed ${formatDate(DEMO_NOW.toISOString())}.`}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* ── Search and results ─────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-4">
          <label className="pw-field flex h-11 items-center gap-2.5 rounded-card px-3">
            <Search className="h-4 w-4 shrink-0 text-text-faint" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Product name or code — e.g. industrial valves, 8481"
              aria-label="Search HS codes"
              className="min-w-0 flex-1 bg-transparent text-body text-text placeholder:text-text-faint focus:outline-none"
            />
          </label>

          {results.length === 0 ? (
            <Panel className="p-6">
              <EmptyState
                icon={<Tags className="h-6 w-6" />}
                title={`Nothing matches “${query}”`}
                description="This reference set covers the commodities on your account. Try a broader term, or a chapter below."
              />
            </Panel>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {results.map((entry) => {
                const active = selected?.code === entry.code
                return (
                  <li key={entry.code}>
                    {/* A sheet, not a bordered div: `button.pw-card` answers the
                        pointer with a real one-pixel lift straight out of
                        `app/globals.css`, so no call site invents a hover. */}
                    <button
                      type="button"
                      onClick={() => setSelectedCode(entry.code)}
                      aria-pressed={active}
                      className={cn(
                        'pw-card flex min-h-[44px] w-full items-center gap-3 px-3.5 py-2.5 text-left',
                        active ? 'border-signal/45 bg-signal/8' : 'hover:border-hairline-strong',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn('pw-id block text-data font-semibold', active ? 'text-signal' : 'text-text')}
                        >
                          {entry.code}
                        </span>
                        <span className="block truncate text-micro text-text-muted">{entry.description}</span>
                      </span>
                      <ChevronRight
                        className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-signal' : 'text-text-faint')}
                        aria-hidden
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <Card className="p-4">
            <CardHeading>Chapters in this reference</CardHeading>
            <ul className="mt-2 flex flex-col">
              {chapters.map((c) => (
                <li key={c.chapter}>
                  <button
                    type="button"
                    onClick={() => setQuery(c.title.split(' ')[0]!.toLowerCase())}
                    className="pw-groove flex min-h-[44px] w-full items-center gap-2.5 rounded-chip px-1 py-2 text-left text-data text-text-muted transition-colors first:border-t-0 first:shadow-none hover:text-signal"
                  >
                    <span className="pw-readout shrink-0 text-text">{c.chapter}</span>
                    <span className="min-w-0 flex-1 truncate">{c.title}</span>
                    <span className="pw-readout shrink-0 text-micro text-text-faint">{count(c.count)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="pw-groove mt-2 pt-2.5 text-micro leading-relaxed text-text-faint">
              {count(HS_CODES.length)} codes, chosen to cover the commodities moving on this account. The full tariff
              runs to 97 chapters.
            </p>
          </Card>
        </div>

        {/* ── Detail ─────────────────────────────────────────────────── */}
        <div className="min-w-0">
          {selected ? (
            <HsDetail entry={selected} />
          ) : (
            <Panel className="flex h-full items-center justify-center p-10">
              <EmptyState
                icon={<Tags className="h-6 w-6" />}
                title="Pick a code to see its breakdown"
                description="Search by what you are shipping — the words on your commercial invoice usually work."
              />
            </Panel>
          )}
        </div>
      </div>
    </PageShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   DETAIL
   ══════════════════════════════════════════════════════════════════════════ */

function HsDetail({ entry }: { entry: HsCode }) {
  const national = entry.code.slice(-2)

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {/* ── The hierarchy ────────────────────────────────────────────── */}
      <Panel className="overflow-hidden">
        <header className="pw-groove-b border-b border-hairline px-5 py-4">
          <p className="pw-stencil">National tariff line</p>
          <p className="pw-readout mt-1.5 text-[26px] font-semibold leading-none tracking-[-0.02em]">{entry.code}</p>
          <p className="mt-2.5 max-w-prose text-data leading-relaxed text-text-muted">{entry.description}</p>
        </header>

        <ol>
          <Level
            digits={entry.chapter}
            inherited={0}
            depth={0}
            label="Chapter"
            title={entry.chapterTitle}
            note="2 digits · harmonised worldwide"
          />
          <Level
            digits={entry.heading}
            inherited={2}
            depth={1}
            label="Heading"
            title={entry.headingTitle}
            note="4 digits · harmonised worldwide"
          />
          <Level
            digits={entry.subheading.replace('.', '')}
            inherited={4}
            depth={2}
            label="Subheading"
            title={entry.subheadingTitle}
            note="6 digits · harmonised worldwide by the WCO"
          />
          <Level
            digits={entry.code.replace(/\D/g, '')}
            inherited={6}
            depth={3}
            label="National tariff line"
            title={entry.description}
            note={
              national === '00'
                ? '8 digits · India did not subdivide this subheading further'
                : '8 digits · India’s own subdivision under ITC-HS'
            }
            highlight
          />
        </ol>

        <Basis>
          Each level is the one above it, narrowed. The dimmed digits are inherited; only the last two are India’s own.
          The first six are the same in every country that applies the Harmonised System, which is why a supplier’s
          six-digit code usually travels and their eight-digit one usually does not.
        </Basis>
      </Panel>

      {/* ── Rates ────────────────────────────────────────────────────── */}
      <RecordPanel
        title="Published rates"
        meta="Percentages as published"
        footnote="This tool states the rates that attach to the line. What a specific consignment owes depends on valuation, origin and any exemption in force, and is settled with your customs partner rather than here."
      >
        <FigureRail
          columns={3}
          figures={[
            {
              label: 'Basic customs duty',
              value: `${entry.rates.basicDutyPct}%`,
              sub: 'of the customs value of the goods',
              strong: true,
            },
            {
              label: 'Social Welfare Surcharge',
              value: `${entry.rates.socialWelfareSurchargePctOfBasic}%`,
              sub:
                entry.rates.basicDutyPct === 0
                  ? 'of the basic duty — nil here, because the basic duty is nil'
                  : 'of the basic duty, not of the goods. It is the single most commonly misread figure on an Indian import.',
            },
            {
              label: 'Integrated GST',
              value: `${entry.rates.igstPct}%`,
              sub: 'generally creditable for a registered importer',
            },
          ]}
        />

        {(entry.rates.note || entry.rates.compound) && (
          <div className="pw-groove flex items-start gap-2.5 bg-amber/6 px-5 py-3">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" aria-hidden />
            <p className="text-micro leading-relaxed text-text-muted">
              {entry.rates.compound && <span className="font-medium text-text">This line carries a compound rate. </span>}
              {entry.rates.note}
            </p>
          </div>
        )}
      </RecordPanel>

      {/* ── Policy and clearances, kept separate ─────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <CardHeading>Import policy</CardHeading>
          <div className="mt-2.5">
            <StatusBadge tone={POLICY_TONE[entry.policy.status]}>{POLICY_LABEL[entry.policy.status]}</StatusBadge>
          </div>
          <p className="mt-2.5 text-data leading-relaxed text-text-muted">{POLICY_DETAIL[entry.policy.status]}</p>
          {entry.policy.note && (
            <p className="mt-2 text-data leading-relaxed text-text-muted">{entry.policy.note}</p>
          )}
        </Card>

        <Card className="p-5">
          <CardHeading icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden />}>Clearances required</CardHeading>
          {entry.clearances.length === 0 ? (
            <p className="mt-2.5 text-data leading-relaxed text-text-muted">
              None recorded for this line beyond the standard import formalities.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {entry.clearances.map((c) => (
                <li key={c.authority} className="flex gap-2.5">
                  <span aria-hidden className="pw-stud mt-[7px] h-1 w-1 shrink-0 bg-violet" />
                  <span className="min-w-0">
                    <span className="block text-data font-medium text-text">{c.authority}</span>
                    <span className="block text-micro leading-snug text-text-muted">{c.what}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="pw-groove mt-3 pt-2.5 text-micro leading-relaxed text-text-faint">
            Policy status and clearance are separate things. A freely importable item can still be held at the port for
            want of a certification.
          </p>
        </Card>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   ONE RUNG OF THE DRILL
   ══════════════════════════════════════════════════════════════════════════
   The indent and the dimmed prefix are doing the same job from two directions:
   the row steps in as the code gets longer, and the digits it inherited from
   the row above are held back so the eye lands on what THIS level added.
   Four rows of eight-digit numbers with nothing dimmed is a list of near
   identical figures, which is how a classification gets read off wrongly.
   ══════════════════════════════════════════════════════════════════════════ */

/** Written out rather than computed so Tailwind can see every class it needs. */
const DEPTH_PAD = ['px-5', 'pl-8 pr-5', 'pl-11 pr-5', 'pl-14 pr-5'] as const

function Level({
  digits,
  inherited,
  depth,
  label,
  title,
  note,
  highlight,
}: {
  digits: string
  /** How many leading digits came from the level above, and so are dimmed. */
  inherited: number
  depth: 0 | 1 | 2 | 3
  label: string
  title: string
  note: string
  highlight?: boolean
}) {
  return (
    <li
      className={cn(
        'pw-groove flex gap-3 py-3 first:border-t-0 first:shadow-none',
        DEPTH_PAD[depth],
        highlight && 'bg-signal/6',
      )}
    >
      <span
        className={cn(
          'shrink-0 self-start rounded-chip px-2 py-1',
          highlight ? 'bg-signal/15' : 'pw-rail',
        )}
      >
        <span className="pw-readout text-data font-semibold">
          <span className={highlight ? 'text-signal/45' : 'text-text-faint/70'}>{digits.slice(0, inherited)}</span>
          <span className={highlight ? 'text-signal' : 'text-text'}>{digits.slice(inherited)}</span>
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="pw-stencil block">{label}</span>
        <span className="mt-1 block text-data leading-snug text-text">{title}</span>
        <span className="mt-0.5 block text-micro text-text-faint">{note}</span>
      </span>
    </li>
  )
}
