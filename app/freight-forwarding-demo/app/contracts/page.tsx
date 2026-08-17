import type { Metadata } from 'next'

import { ContractList } from '@/components/contracts/contract-list'

export const metadata: Metadata = { title: 'Contracts' }

export default function ContractsPage() {
  return <ContractList />
}
