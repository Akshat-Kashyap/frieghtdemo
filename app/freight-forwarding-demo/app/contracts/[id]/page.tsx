import type { Metadata } from 'next'

import { ContractDetail } from '@/components/contracts/contract-detail'

export const metadata: Metadata = { title: 'Contract' }

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ContractDetail id={id} />
}
