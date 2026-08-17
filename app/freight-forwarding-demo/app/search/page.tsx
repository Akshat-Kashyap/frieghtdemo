import type { Metadata } from 'next'

import { SearchWorkspace } from '@/components/search/search-workspace'

export const metadata: Metadata = { title: 'Search rates' }

export default function SearchPage() {
  return <SearchWorkspace />
}
