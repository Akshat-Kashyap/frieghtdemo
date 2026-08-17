import type { Metadata } from 'next'

import { FinanceWorkspace } from '@/components/finance/finance-workspace'

export const metadata: Metadata = { title: 'Finance' }

export default function FinancePage() {
  return <FinanceWorkspace />
}
