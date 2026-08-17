import type { Metadata } from 'next'

import { ZenoWorkspace } from '@/components/zeno/zeno-workspace'

export const metadata: Metadata = { title: 'Zeno AI' }

export default function ZenoPage() {
  return <ZenoWorkspace />
}
