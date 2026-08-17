import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { INSIGHTS, insightBySlug } from '@/data/insights'

import { InsightArticleView } from '@/components/insights/insight-article'

/**
 * The articles are authored data, not records — the whole set is known at
 * build time, so every slug is pre-rendered rather than resolved on request.
 * It also means a slug that is not on this list genuinely does not exist,
 * which is why the page can call `notFound()` with a clear conscience.
 */
export function generateStaticParams() {
  return INSIGHTS.map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = insightBySlug(slug)
  if (!article) return { title: 'Insight' }
  return { title: article.title, description: article.dek }
}

export default async function InsightPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = insightBySlug(slug)
  if (!article) notFound()

  return <InsightArticleView article={article} />
}
