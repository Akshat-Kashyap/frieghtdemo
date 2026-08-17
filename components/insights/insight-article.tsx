'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, ArrowUpRight, Lightbulb } from 'lucide-react'

import {
  INSIGHT_CATEGORY_LABEL,
  INSIGHT_CATEGORY_TONE,
  INSIGHT_DISCLAIMER,
  relatedInsights,
  type InsightArticle,
  type InsightBlock,
} from '@/data/insights'
import { formatDate } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'

import { PageShell } from '@/components/app/app-shell'
import { Card, Chip, Panel, StatusBadge } from '@/components/ui/primitives'
import { CardHeading, RecordPanel } from '@/components/finance/pieces'

/**
 * The reading column, in rem.
 *
 * `max-w-prose` is 65ch, and `ch` is resolved against the element's OWN font
 * size — so a 16px paragraph and a 14px plate wearing the same class come out
 * 120px apart, and the page ends up with three different right edges. This is
 * that same measure expressed once, in absolute units, so every surface in the
 * column lines up with the prose whatever size it is set at.
 */
const MEASURE = 'max-w-[39rem]'

/**
 * One article.
 *
 * Three things make this readable rather than merely rendered.
 *
 * THE MEASURE. Prose is held to one column of roughly 65 characters (see
 * `MEASURE` above) while tables are allowed to run the full width of the page,
 * because a five-column rate board squeezed into a reading measure is a
 * scrollbar nobody uses. This is the one screen in the product where the line
 * length is chosen for the eye rather than for density: everywhere else the
 * job is to fit forty rows above the fold, and here the job is to be read to
 * the end.
 *
 * THE SIZE AND THE LEADING. Body copy runs at 16px on 1.75 rather than the
 * 13px on 1.5 the operations screens use, and headings are set in the display
 * face. That pairing — Archivo signage over Plex Sans prose — is the same one
 * the rest of the product uses on its plates, so an article reads as a
 * different KIND of page rather than as a different product.
 *
 * THE BLOCKS. The body is a closed union of block kinds rather than markup or
 * markdown. `renderBlock` switches exhaustively and its default case assigns
 * to `never`, so adding a block kind to `data/insights.ts` fails the build
 * here until it has actually been drawn. A blog that silently drops an
 * unrecognised block is the kind of failure nobody notices until a customer
 * does.
 */
export function InsightArticleView({ article }: { article: InsightArticle }) {
  const related = relatedInsights(article.slug)

  return (
    <PageShell width="narrow" notice={INSIGHT_DISCLAIMER}>
      <article>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header>
          <Link
            href={ROUTES.insights}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-chip text-data font-medium text-text-muted transition-colors hover:text-signal"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            All insights
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-2">
            <StatusBadge tone={INSIGHT_CATEGORY_TONE[article.category]} dot={false}>
              {INSIGHT_CATEGORY_LABEL[article.category]}
            </StatusBadge>
            <time dateTime={article.publishedAt} className="font-mono text-micro text-text-faint">
              {formatDate(article.publishedAt)}
            </time>
            <span className="text-micro text-text-faint" aria-hidden>
              ·
            </span>
            <span className="font-mono text-micro text-text-faint">{article.readMinutes} min read</span>
          </div>

          {/* The one place in the product where a heading is allowed to be
              large. A 30ch measure on a display face is roughly two lines for
              a working headline, which is what a headline wants. */}
          <h2 className="pw-plate-title mt-4 max-w-[30ch] text-[27px] leading-[1.12] tracking-[-0.025em] sm:text-[36px]">
            {article.title}
          </h2>
          <p className={cn('mt-4 text-[17px] leading-[1.6] text-text-muted', MEASURE)}>{article.dek}</p>

          <p className={cn('pw-groove mt-5 pt-4 text-data leading-relaxed text-text-muted', MEASURE)}>
            <span className="font-medium text-text">{article.author.name}</span>
            <span className="text-text-faint"> · {article.author.title}</span>
          </p>
        </header>

        {/* ── What this changes ───────────────────────────────────────── */}
        <Panel className={cn('mt-7 p-5 sm:p-6', MEASURE)}>
          <CardHeading icon={<Lightbulb className="h-3.5 w-3.5 text-signal" aria-hidden />}>
            What this changes
          </CardHeading>
          {/* Deliberately not `NoteList` from the shared kit: that component is
              fixed at 12px, which is right for a footnote under an instrument
              panel and wrong for the three sentences this article exists to
              deliver. The bullet is still `.pw-stud` — the material is shared,
              the type size is the editorial call. */}
          <ul className="mt-3.5 flex flex-col gap-3">
            {article.summary.map((point) => (
              <li key={point} className="flex gap-3 text-[15px] leading-[1.7] text-text">
                <span aria-hidden className="pw-stud mt-[10px] h-1 w-1 shrink-0 bg-signal" />
                {point}
              </li>
            ))}
          </ul>
        </Panel>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="mt-9">
          {article.body.map((block, index) => (
            <div key={index} className={cn(index === 0 ? 'mt-0' : BLOCK_SPACING[block.kind])}>
              {renderBlock(block)}
            </div>
          ))}
        </div>

        {article.tags.length > 0 && (
          <ul className="pw-groove mt-12 flex flex-wrap gap-1.5 pt-5">
            {article.tags.map((tag) => (
              <li key={tag}>
                <Chip>{tag}</Chip>
              </li>
            ))}
          </ul>
        )}
      </article>

      {/* ── Deep links: the whole point of writing this inside the app ── */}
      <section className="mt-8" aria-labelledby="insight-links">
        <RecordPanel
          title={<span id="insight-links">Open this in your account</span>}
          meta="Every figure above is live on these screens"
        >
          <ul>
            {article.links.map((link) => (
              <li key={link.href} className="pw-groove first:border-t-0 first:shadow-none">
                <Link
                  href={link.href}
                  className="group flex min-h-[44px] items-center justify-between gap-4 px-5 py-3 text-data text-text transition-colors hover:bg-raised-2/60"
                >
                  {link.label}
                  <ArrowUpRight
                    className="h-3.5 w-3.5 shrink-0 text-text-faint transition-colors group-hover:text-signal"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </RecordPanel>
      </section>

      {/* ── Related ─────────────────────────────────────────────────────── */}
      {related.length > 0 && (
        <section className="mt-8" aria-labelledby="insight-related">
          <h3 id="insight-related" className="pw-stencil mb-3 flex items-center gap-2">
            <span aria-hidden className="h-[3px] w-3 shrink-0 rounded-full bg-signal/60" />
            Read next
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {related.map((next) => (
              <li key={next.slug} className="flex">
                <Link
                  href={ROUTES.article(next.slug)}
                  className="pw-card group flex w-full flex-col gap-2.5 p-4 hover:border-signal/40"
                >
                  <StatusBadge tone={INSIGHT_CATEGORY_TONE[next.category]} dot={false} className="self-start">
                    {INSIGHT_CATEGORY_LABEL[next.category]}
                  </StatusBadge>
                  <span className="pw-plate-title text-panel leading-[1.3]">{next.title}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-1 font-mono text-micro text-text-faint">
                    {next.readMinutes} min read
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageShell>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   BLOCKS
   ══════════════════════════════════════════════════════════════════════════
   The vertical rhythm lives in one table rather than in each block's own
   classes, so the spacing between a heading and the paragraph under it is a
   decision made once and visible in a single place.

   The gaps are larger than the rest of the product uses because the leading is
   larger: white space between blocks has to out-measure the space between
   lines or the page reads as one undifferentiated column.
   ══════════════════════════════════════════════════════════════════════════ */

const BLOCK_SPACING: Record<InsightBlock['kind'], string> = {
  paragraph: 'mt-6',
  heading: 'mt-11',
  list: 'mt-6',
  callout: 'mt-7',
  table: 'mt-7',
  quote: 'mt-8',
}

function renderBlock(block: InsightBlock): React.ReactNode {
  switch (block.kind) {
    case 'paragraph':
      return <p className={cn('text-[16px] leading-[1.75] text-text', MEASURE)}>{block.text}</p>

    case 'heading':
      // Signage, in the display face, at a size that reads as a new section
      // without shouting. A heading left in the body face is the migration
      // miss that makes an article look like a form.
      return <h3 className={cn('pw-plate-title text-[20px] leading-[1.25]', MEASURE)}>{block.text}</h3>

    case 'list':
      return block.ordered ? (
        <ol className={cn('flex flex-col gap-3.5', MEASURE)}>
          {block.items.map((item, index) => (
            <li key={item} className="flex gap-3.5 text-[16px] leading-[1.75] text-text">
              {/* The number sits in a milled socket rather than on a chip: a
                  step in a sequence is a position on the instrument, not a
                  badge stuck on top of it. */}
              <span className="pw-rail mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-chip">
                <span className="pw-readout text-micro font-medium text-text-muted">{index + 1}</span>
              </span>
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className={cn('flex flex-col gap-3.5', MEASURE)}>
          {block.items.map((item) => (
            <li key={item} className="flex gap-3.5 text-[16px] leading-[1.75] text-text">
              <span aria-hidden className="pw-stud mt-[11px] h-1 w-1 shrink-0 bg-signal" />
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      )

    case 'callout':
      // A sheet, flush to the page: a note ON the article, not an object the
      // article is built from. Giving it a cast would float an aside above the
      // prose it is commenting on.
      return (
        <aside
          className={cn(
            'pw-card px-5 py-4',
            MEASURE,
            block.tone === 'amber' ? 'border-amber/30 bg-amber/6' : 'bg-raised-2/50',
          )}
        >
          {block.title && (
            <p className={cn('pw-stencil', block.tone === 'amber' && 'text-amber')}>{block.title}</p>
          )}
          <p className={cn('text-[15px] leading-[1.7] text-text-muted', block.title && 'mt-2')}>{block.text}</p>
        </aside>
      )

    case 'table': {
      // Tables break out of the reading measure on purpose — a rate board
      // squeezed to 65 characters is unreadable, and the wrap scrolls in its
      // own box so the page body never moves sideways.
      const numeric = new Set(block.numericColumns ?? [])
      return (
        <figure className="min-w-0">
          <div className="pw-table-wrap">
            <table className="pw-table">
              <thead>
                <tr>
                  {block.columns.map((column, index) => (
                    <th key={column} scope="col" className={cn(numeric.has(index) && 'text-right')}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={cn(
                          cellIndex === 0 && 'font-medium text-text',
                          cellIndex > 0 && 'text-text-muted',
                          numeric.has(cellIndex) && 'pw-readout text-right text-text',
                        )}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {block.caption && (
            <figcaption className={cn('mt-2.5 text-micro leading-relaxed text-text-faint', MEASURE)}>
              {block.caption}
            </figcaption>
          )}
        </figure>
      )
    }

    case 'quote':
      return (
        <Card className={cn('border-l-2 border-l-signal/40 p-5 sm:p-6', MEASURE)}>
          <blockquote className="text-[18px] leading-[1.6] text-text">{block.text}</blockquote>
          <p className="pw-stencil mt-3">— {block.attribution}</p>
        </Card>
      )

    default: {
      // Exhaustiveness guard: a new block kind is a compile error here, not a
      // silently missing paragraph in production.
      const unhandled: never = block
      return unhandled
    }
  }
}
