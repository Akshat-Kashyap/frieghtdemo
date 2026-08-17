import type { Metadata } from 'next'

import { RfqList } from '@/components/rfq/rfq-list'

export const metadata: Metadata = { title: 'Requests for quotation' }

export default function RfqsPage() {
  return <RfqList />
}
