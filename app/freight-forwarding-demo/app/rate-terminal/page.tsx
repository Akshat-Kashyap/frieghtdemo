import type { Metadata } from 'next'

import { RateTerminal } from '@/components/rate-terminal/rate-terminal'

export const metadata: Metadata = { title: 'Rate terminal' }

export default function RateTerminalPage() {
  return <RateTerminal />
}
