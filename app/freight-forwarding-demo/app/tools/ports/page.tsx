import type { Metadata } from 'next'

import { PortIndex } from '@/components/ports/port-index'

export const metadata: Metadata = { title: 'Port information' }

export default function PortsPage() {
  return <PortIndex />
}
