'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Newspaper } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  INSIGHTS,
  INSIGHT_CATEGORY_LABEL,
  INSIGHT_CATEGORY_TONE,
  INSIGHT_DISCLAIMER,
  type InsightArticle,
  type InsightCategory,
} from '@/data/insights'
import { fadeUp, reduce, stagger } from '@/lib/motion'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { useSafeReducedMotion } from '@/hooks/use-safe-reduced-motion'

import { PageShell } from '@/components/app/app-shell'
import { EmptyState, Panel, SegmentedControl, StatusBadge } from '@/components/ui/primitives'
import { DateStamp, RelativeTime } from '@/components/ui/freight'

/**
 * Insights — the reading list.
 *
 * Everything here is authored content held in `data/insights.ts`, so unlike
 * every other module in this product there is nothing persisted to wait for:
 * no `useHydrated()` gate, no skeleton, no store. The only client state is the
 * category filter.
 *
 * The lead article is given real space rather than being the first cell of a
 * uniform grid. Eight items shown identically is a directory; one item shown
 * larger is an editor telling you where to start, and the most recent piece is
 * the one most likely to be about this week's board.
 *
 * THIS SCREEN IS ALLOWED TO BREATHE, and it is the only one that is.
 * ══════════════════════════════════════════════════════════════════════════
 * Every other surface in the product is an instrument: dense, tabular, 11 and
 * 13px, packed because an operations screen that makes you scroll for the next
 * figure is a worse screen. Prose set to those rules is unreadable — a
 * standfirst at 13px running the full 1400px of the shell is a measure of
 * about 190 characters, roughly three times what the eye can track back to the
 * start of the next line.
 *
 * So the rules here are the ones typesetting has used for a century and the
 * dashboard cannot afford: a measure held near 65 characters, leading opened
 * to 1.7, and headings set in the display face at sizes that let the eye rest.
 * The material is unchanged — the same plates, the same one light, the same
 * stencils — which is what stops "different" turning into "somewhere else".
 */

type Filter = 'ALL' | InsightCategory

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'MARKET', label: INSIGHT_CATEGORY_LABEL.MARKET },
  { value: 'OPERATIONS', label: INSIGHT_CATEGORY_LABEL.OPERATIONS },
  { value: 'COMMERCIAL', label: INSIGHT_CATEGORY_LABEL.COMMERCIAL },
  { value: 'GUIDE', label: INSIGHT_CATEGORY_LABEL.GUIDE },
]

export function InsightList() {
  const shouldReduce = useSafeReducedMotion()
  const [filter, setFilter] = useState<Filter>('ALL')

  // INSIGHTS is already newest-first; filtering preserves that order, so the
  // lead is always the most recent piece in whatever the reader has selected.
  const visible = useMemo(
    () => (filter === 'ALL' ? INSIGHTS : INSIGHTS.filter((article) => article.category === filter)),
    [filter],
  )

  const [lead, ...rest] = visible
  const card = reduce(fadeUp, shouldReduce)

  return (
    <PageShell
      title="Insights"
      description="Notes on the lanes, ports and charges this account actually trades on. Every figure is the one the application is showing you elsewhere."
      actions={
        <SegmentedControl
          options={FILTERS}
          value={filter}
          onChange={setFilter}
          size="sm"
          ariaLabel="Filter insights by category"
        />
      }
      notice={INSIGHT_DISCLAIMER}
    >
      {!lead ? (
        <Panel className="p-8">
          <EmptyState
            icon={<Newspaper className="h-6 w-6" />}
            title="Nothing filed under that heading yet"
            description="Clear the filter to see everything that has been written so far."
            action={
              <button
                type="button"
                onClick={() => setFilter('ALL')}
                className="min-h-[44px] rounded-chip px-2 text-data font-medium text-signal hover:underline"
              >
                Show all insights
              </button>
            }
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-6">
          <LeadCard article={lead} />

          {rest.length > 0 && (
            <motion.ul
              // Re-keying on the filter replays the entrance, so a filter
              // change reads as new content arriving rather than as a silent
              // swap the eye can miss.
              key={filter}
              variants={stagger(0.04)}
              initial="hidden"
              animate="show"
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              {rest.map((article) => (
                <motion.li key={article.slug} variants={card} className="flex">
                  <ArticleCard article={article} />
                </motion.li>
              ))}
            </motion.ul>
          )}
        </div>
      )}
    </PageShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   CARDS
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The lead is a plate and the anchor IS the plate, so it lifts a pixel under
 * the cursor with its cast growing — `a.pw-plate` in `app/globals.css` handles
 * that for every card-shaped link in the product. Wrapping a link inside a
 * Panel, as this did, gave a plate that never answered the pointer and a
 * hover that was only a background wash.
 */
function LeadCard({ article }: { article: InsightArticle }) {
  return (
    <Link
      href={ROUTES.article(article.slug)}
      className="pw-plate group flex flex-col gap-5 p-6 sm:p-8"
      aria-label={`Read: ${article.title}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={INSIGHT_CATEGORY_TONE[article.category]} dot={false}>
          {INSIGHT_CATEGORY_LABEL[article.category]}
        </StatusBadge>
        <span className="pw-stencil">Latest</span>
      </div>

      <div className="min-w-0">
        <h3 className="pw-plate-title max-w-[30ch] text-[23px] leading-[1.15] tracking-[-0.02em] sm:text-[30px]">
          {article.title}
        </h3>
        {/* 62ch, not max-w-2xl: a measure is counted in characters, and a
            672px box holds a very different number of them at 15px than the
            13px the rest of the product is set in. */}
        <p className="mt-3 max-w-[62ch] text-[15px] leading-[1.7] text-text-muted">{article.dek}</p>
      </div>

      {/* The takeaways are the reason to open it — showing them on the lead
          is a better use of the space than a longer excerpt. */}
      <ul className="pw-groove flex flex-col gap-2.5 pt-4">
        {article.summary.map((point) => (
          <li key={point} className="flex max-w-[68ch] gap-3 text-data leading-[1.7] text-text-muted">
            <span aria-hidden className="pw-stud mt-[9px] h-1 w-1 shrink-0 bg-signal" />
            {point}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Byline article={article} />
        <span className="inline-flex items-center gap-1.5 text-data font-medium text-signal">
          Read
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  )
}

function ArticleCard({ article }: { article: InsightArticle }) {
  return (
    <Link
      href={ROUTES.article(article.slug)}
      className="pw-card flex w-full flex-col gap-3 p-5 hover:border-signal/40"
    >
      <StatusBadge tone={INSIGHT_CATEGORY_TONE[article.category]} dot={false} className="self-start">
        {INSIGHT_CATEGORY_LABEL[article.category]}
      </StatusBadge>

      <h3 className="pw-plate-title text-[17px] leading-[1.3]">{article.title}</h3>
      <p className="line-clamp-3 text-data leading-[1.65] text-text-muted">{article.dek}</p>

      <div className="pw-groove mt-auto -mx-5 -mb-5 px-5 pb-4 pt-3">
        <Byline article={article} />
      </div>
    </Link>
  )
}

/** Author, publication date and read time — the same line on every surface. */
function Byline({ article, className }: { article: InsightArticle; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-micro text-text-faint', className)}>
      <span className="text-text-muted">{article.author.name}</span>
      <span aria-hidden>·</span>
      <DateStamp iso={article.publishedAt} className="text-micro text-text-faint" />
      <span aria-hidden>·</span>
      <RelativeTime iso={article.publishedAt} />
      <span aria-hidden>·</span>
      <span>{article.readMinutes} min read</span>
    </div>
  )
}
