import type { Metadata } from 'next'

import { PortDetail } from '@/components/ports/port-detail'

export const metadata: Metadata = { title: 'Port profile' }

export default async function PortPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return <PortDetail code={code} />
}
