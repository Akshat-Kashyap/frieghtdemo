import { describe, expect, it } from 'vitest'

import { DEMO } from '@/data/copy'
import {
  INSIGHTS,
  INSIGHT_CATEGORY_LABEL,
  INSIGHT_CATEGORY_TONE,
  INSIGHT_DISCLAIMER,
  insightBySlug,
  relatedInsights,
  type InsightArticle,
  type InsightBlock,
} from '@/data/insights'
import { DEMO_NOW_MS } from '@/lib/demo-clock'
import { ROUTES } from '@/lib/routes'

/**
 * THE EDITORIAL SURFACE HOLDS TOGETHER
 * ══════════════════════════════════════════════════════════════════════════
 * `data/insights.ts` is the one module in this product where prose and data
 * are the same thing. Every figure in an article is read out of the rate
 * grid, the port profiles, the contracts and the requests, and the claim the
 * module makes about itself is that a reader can follow a link at the foot of
 * a piece and land on the screen showing the identical number.
 *
 * That claim has three ways of failing quietly, and none of them throws.
 *
 * A link can point at a route that no longer exists — the article still
 * renders, the reader still clicks, and the demo 404s in front of an
 * audience. A related-reading slug can name an article that was renamed, and
 * the "related" rail simply comes back one item shorter than intended. And a
 * derived figure can resolve to `undefined`, which prints as the word
 * "undefined" inside an otherwise immaculate sentence — the module's own doc
 * comment names that as the failure it exists to prevent, and a `require*`
 * helper only catches it at the point of lookup, not after interpolation.
 *
 * So: every link, every relation, every string, checked against the same
 * ROUTES and the same demo clock the rest of the product uses.
 */

/** Slugs are URL segments and route parameters. Lower case, hyphen separated, nothing else. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/* ══════════════════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════════════════ */

/** Stand-in for a route parameter: a control character, so no real path can contain it. */
const PARAM = '\u0001'

/**
 * Is this href something ROUTES publishes?
 *
 * The same shape as the check in `tests/zeno.test.ts`, and for the same
 * reason: `tests/nav.test.ts` proves each ROUTES entry has a page behind it,
 * so all that remains here is proving the deep link was built from ROUTES
 * rather than typed into an article by hand.
 */
const ROUTE_PATTERNS: RegExp[] = Object.values(ROUTES).map((value) => {
  const built =
    typeof value === 'function'
      ? (value as (...args: string[]) => string)(...Array<string>(value.length).fill(PARAM))
      : value
  const escaped = built.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped.split(PARAM).join('[^/?&]+')}$`)
})

function isPublishedRoute(href: string): boolean {
  return ROUTE_PATTERNS.some((pattern) => pattern.test(href))
}

/** Every string in a block that a reader's eye actually crosses. */
function blockStrings(block: InsightBlock): string[] {
  switch (block.kind) {
    case 'paragraph':
    case 'heading':
      return [block.text]
    case 'list':
      return block.items
    case 'callout':
      return [block.title ?? '', block.text]
    case 'quote':
      return [block.text, block.attribution]
    case 'table':
      return [
        ...block.columns,
        ...block.rows.flatMap((row) => row.map(String)),
        block.caption ?? '',
      ]
  }
}

/** Everything rendered for one article: standfirst, takeaways, body, links. */
function articleStrings(article: InsightArticle): string[] {
  return [
    article.title,
    article.dek,
    article.author.name,
    article.author.title,
    ...article.tags,
    ...article.summary,
    ...article.body.flatMap(blockStrings),
    ...article.links.map((link) => link.label),
  ]
}

/* ══════════════════════════════════════════════════════════════════════════
   THE COLLECTION
   ══════════════════════════════════════════════════════════════════════════ */

describe('the insights collection', () => {
  it('publishes the articles it claims to publish', () => {
    // A collection that came back empty would pass every assertion below it,
    // which is the failure mode `tests/boundaries.test.ts` was bitten by.
    expect(INSIGHTS.length).toBeGreaterThanOrEqual(8)
  })

  it('gives every article a unique, URL-safe slug that resolves', () => {
    const slugs = INSIGHTS.map((article) => article.slug)
    expect(new Set(slugs).size, `Duplicate slugs: ${slugs.join(', ')}`).toBe(slugs.length)

    for (const article of INSIGHTS) {
      // The slug is the dynamic segment of `ROUTES.article()`. A capital or a
      // space here is a link that breaks on the address bar rather than in a
      // component, which is the kind that survives review.
      expect(article.slug, `"${article.title}" has an unusable slug`).toMatch(SLUG)
      expect(insightBySlug(article.slug)?.title).toBe(article.title)
    }
  })

  it('orders the collection newest first, which the featured lead depends on', () => {
    // `INSIGHTS[0]` is rendered as the lead on the list screen. If the sort
    // were dropped the lead would silently become whichever article happened
    // to be authored first, and the market note would stop leading.
    const times = INSIGHTS.map((article) => new Date(article.publishedAt).getTime())
    for (let i = 1; i < times.length; i++) {
      expect(times[i]!, `${INSIGHTS[i]!.slug} is newer than the one before it`).toBeLessThanOrEqual(times[i - 1]!)
    }
  })

  it('covers every category it uses with a label and a tone', () => {
    for (const article of INSIGHTS) {
      expect(INSIGHT_CATEGORY_LABEL[article.category]).toBeTruthy()
      expect(INSIGHT_CATEGORY_TONE[article.category]).toBeTruthy()
    }

    // Amber and critical mean "needs attention" and "something has failed" in
    // this product. A reading category must never borrow a state colour.
    const tones = Object.values(INSIGHT_CATEGORY_TONE)
    expect(tones).not.toContain('amber')
    expect(tones).not.toContain('critical')
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   DATES COME FROM THE DEMO CLOCK
   ══════════════════════════════════════════════════════════════════════════ */

describe('publication dates', () => {
  it('stamps every article from the pinned clock, never the wall clock', () => {
    for (const article of INSIGHTS) {
      const parsed = new Date(article.publishedAt)
      expect(Number.isFinite(parsed.getTime()), `${article.slug} has an unparseable date`).toBe(true)

      // `daysFromNow()` returns exactly what `toISOString()` produces, so a
      // round-trip that differs means someone typed a date by hand — and a
      // hand-typed date is one that stops making sense the moment the demo
      // clock moves.
      expect(parsed.toISOString(), `${article.slug} was not stamped by the demo clock`).toBe(article.publishedAt)
    }
  })

  it('publishes nothing dated after the demo clock', () => {
    // An article dated in the future renders as "in 3d" on a list of things
    // that have supposedly already been written.
    const future = INSIGHTS.filter((article) => new Date(article.publishedAt).getTime() > DEMO_NOW_MS).map(
      (article) => `${article.slug} → ${article.publishedAt}`,
    )

    expect(future, `Articles published in the future:\n${future.join('\n')}`).toEqual([])
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   LINKS AND RELATIONS
   ══════════════════════════════════════════════════════════════════════════ */

describe('every link lands somewhere real', () => {
  it('builds every deep link from ROUTES', () => {
    const broken: string[] = []

    for (const article of INSIGHTS) {
      // The links are the whole argument of the module: an article that
      // quotes a figure and cannot show you the screen it came from is just a
      // blog with numbers in it.
      expect(article.links.length, `${article.slug} links to nothing`).toBeGreaterThan(0)

      for (const link of article.links) {
        expect(link.label.trim().length, `${article.slug} has an unlabelled link`).toBeGreaterThan(0)
        if (!isPublishedRoute(link.href)) broken.push(`${article.slug} → ${link.href}`)
      }
    }

    expect(broken, `Article links that ROUTES does not publish:\n${broken.join('\n')}`).toEqual([])
  })

  it('names only articles that exist in its related reading', () => {
    const broken: string[] = []

    for (const article of INSIGHTS) {
      for (const slug of article.relatedSlugs) {
        if (slug === article.slug) broken.push(`${article.slug} → itself`)
        else if (!insightBySlug(slug)) broken.push(`${article.slug} → ${slug}`)
      }
    }

    expect(broken, `Related slugs that resolve to nothing:\n${broken.join('\n')}`).toEqual([])
  })

  it('always fills the related rail, even when the relations run out', () => {
    // `relatedInsights` pads from the same category and then from the most
    // recent, because an empty "related" block reads as a dead end at exactly
    // the moment a reader wanted somewhere else to go.
    for (const article of INSIGHTS) {
      const related = relatedInsights(article.slug)
      expect(related.length, `${article.slug} has an empty related rail`).toBe(3)
      expect(related.map((r) => r.slug)).not.toContain(article.slug)
      expect(new Set(related.map((r) => r.slug)).size).toBe(related.length)
    }
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   THE SHAPE THE RENDERER RELIES ON
   ══════════════════════════════════════════════════════════════════════════ */

describe('every article is renderable', () => {
  it('carries a headline, a standfirst and a byline', () => {
    for (const article of INSIGHTS) {
      expect(article.title.trim().length, `${article.slug} has no title`).toBeGreaterThan(0)
      expect(article.dek.trim().length, `${article.slug} has no standfirst`).toBeGreaterThan(0)
      expect(article.author.name.trim().length, `${article.slug} has no byline`).toBeGreaterThan(0)
      expect(article.author.title.trim().length, `${article.slug} has an unattributed byline`).toBeGreaterThan(0)
      expect(article.tags.length, `${article.slug} has no tags`).toBeGreaterThan(0)
      // Computed from the body rather than typed in, and floored at one:
      // "0 min read" is worse than useless.
      expect(article.readMinutes, `${article.slug} has an implausible read time`).toBeGreaterThanOrEqual(1)
    }
  })

  it('carries exactly three takeaways, which is what both screens render', () => {
    for (const article of INSIGHTS) {
      // The type calls these "three 'what this changes' takeaways" and both
      // the list lead and the article header lay them out as a set of three.
      // A fourth would overflow the lead card; two would leave a gap.
      expect(article.summary.length, `${article.slug} has ${article.summary.length} takeaways`).toBe(3)
      for (const point of article.summary) {
        expect(point.trim().length, `${article.slug} has an empty takeaway`).toBeGreaterThan(0)
      }
    }
  })

  it('has a body with substance in every block', () => {
    for (const article of INSIGHTS) {
      expect(article.body.length, `${article.slug} has no body`).toBeGreaterThan(3)

      for (const block of article.body) {
        if (block.kind === 'paragraph' || block.kind === 'heading') {
          expect(block.text.trim().length, `${article.slug} has an empty ${block.kind}`).toBeGreaterThan(0)
        }

        if (block.kind === 'list') {
          expect(block.items.length, `${article.slug} has an empty list`).toBeGreaterThan(0)
        }

        if (block.kind === 'quote') {
          expect(block.attribution.trim().length, `${article.slug} has an unattributed quote`).toBeGreaterThan(0)
        }

        if (block.kind === 'table') {
          // A ragged row is the one shape that breaks the table renderer
          // rather than merely reading oddly, because the header count and
          // the cell count stop agreeing.
          expect(block.columns.length, `${article.slug} has a table with no columns`).toBeGreaterThan(0)
          expect(block.rows.length, `${article.slug} has a table with no rows`).toBeGreaterThan(0)

          for (const row of block.rows) {
            expect(row.length, `${article.slug} has a ragged table row: ${row.join(' | ')}`).toBe(block.columns.length)
          }

          for (const index of block.numericColumns ?? []) {
            expect(index, `${article.slug} aligns a column that does not exist`).toBeLessThan(block.columns.length)
          }
        }
      }
    }
  })

  /**
   * The failure the module was written to prevent.
   *
   * Every figure in these articles is interpolated from seeded records. A
   * lookup that returns undefined does not throw once it is inside a template
   * literal — it prints the word, and "USD undefined" in a published market
   * note is worse than having no market note at all.
   */
  it('never renders an unresolved figure', () => {
    for (const article of INSIGHTS) {
      for (const text of articleStrings(article)) {
        expect(text, `${article.slug} rendered: ${text}`).not.toMatch(/undefined|NaN|\[object Object\]/)
      }
    }
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   HONESTY
   ══════════════════════════════════════════════════════════════════════════ */

describe('the standing disclaimer', () => {
  it('is composed from the shared copy rather than written fresh', () => {
    // This surface quotes rates, charges and contract terms. A disclaimer
    // that drifts from the one under the rate terminal is a disclaimer nobody
    // can audit, so it is assembled from `data/copy.ts`.
    expect(INSIGHT_DISCLAIMER).toContain(DEMO.simulatedValues)
    expect(INSIGHT_DISCLAIMER).toContain(DEMO.financialNotice)
    expect(INSIGHT_DISCLAIMER).toMatch(/[Bb]ylines are illustrative/)
  })
})
