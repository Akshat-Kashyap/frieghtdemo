import type { Metadata } from 'next'

import { InsightList } from '@/components/insights/insight-list'

export const metadata: Metadata = { title: 'Insights' }

export default function InsightsPage() {
  return <InsightList />
}
