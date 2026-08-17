import type { Metadata } from 'next'

import { RfqDetail } from '@/components/rfq/rfq-detail'

export const metadata: Metadata = { title: 'Request' }

export default async function RfqPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <RfqDetail id={id} />
}
