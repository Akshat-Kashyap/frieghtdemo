import type { Metadata } from 'next'

import { BusinessProfile } from '@/components/business/business-profile'

export const metadata: Metadata = { title: 'Business profile' }

export default function BusinessPage() {
  return <BusinessProfile />
}
