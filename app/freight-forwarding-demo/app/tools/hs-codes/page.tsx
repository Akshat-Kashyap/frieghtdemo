import type { Metadata } from 'next'

import { HsFinder } from '@/components/hs-codes/hs-finder'

export const metadata: Metadata = { title: 'HS code finder' }

export default function HsCodesPage() {
  return <HsFinder />
}
