'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { INSIGHTS, INSIGHT_CATEGORY_LABEL, INSIGHT_CATEGORY_TONE } from '@/data/insights'
import { ROUTES } from '@/lib/routes'

import { StatusBadge } from '@/components/ui/primitives'
import { DateStamp } from '@/components/ui/freight'

/**
 * The three most recent pieces from Insights.
 *
 * `INSIGHTS` is already newest-first — the list module and this card row both
 * depend on that order, so neither re-sorts it and they cannot disagree about
 * what "latest" means.
 *
 * Every figure quoted inside those articles is read out of the same seeded
 * data the rest of the application renders, which is why they belong on the
 * home screen at all: a reader can follow one from here and land on the
 * screen showing the identical number.
 */

const ARTICLES_SHOWN = 3

export function LatestInsights() {
  const latest = INSIGHTS.slice(0, ARTICLES_SHOWN)

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {latest.map((article) => (
        <li key={article.slug} className="flex">
          <Link
            href={ROUTES.article(article.slug)}
            className="group flex w-full min-w-0 flex-col gap-2.5 rounded-card border border-hairline bg-surface p-4 transition-colors hover:border-signal/40"
          >
            <StatusBadge tone={INSIGHT_CATEGORY_TONE[article.category]} dot={false} className="self-start">
              {INSIGHT_CATEGORY_LABEL[article.category]}
            </StatusBadge>

            <h3 className="text-data font-semibold leading-snug text-text">{article.title}</h3>
            <p className="line-clamp-2 text-[12px] leading-relaxed text-text-muted">{article.dek}</p>

            <p className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-micro text-text-faint">
              <DateStamp iso={article.publishedAt} className="text-micro text-text-faint" />
              <span aria-hidden>·</span>
              <span>{article.readMinutes} min read</span>
              <ArrowRight
                className="ml-auto h-3.5 w-3.5 text-text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-signal"
                aria-hidden
              />
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
