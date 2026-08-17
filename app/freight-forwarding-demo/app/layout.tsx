import type { Metadata } from 'next'

import { BRAND } from '@/data/copy'
import { AppShell } from '@/components/app/app-shell'

export const metadata: Metadata = {
  title: { default: 'Freight workspace', template: `%s · ${BRAND.name}` },
}

export default function CustomerAppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
