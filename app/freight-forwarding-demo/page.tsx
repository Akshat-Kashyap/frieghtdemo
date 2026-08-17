import type { Metadata } from 'next'

import { BRAND } from '@/data/copy'
import { ClosingCta } from '@/components/marketing/closing-cta'
import { DocumentsSection } from '@/components/marketing/documents-section'
import { Hero } from '@/components/marketing/hero'
import { JourneySection } from '@/components/marketing/journey-section'
import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteHeader } from '@/components/marketing/site-header'
import { VisibilitySection } from '@/components/marketing/visibility-section'
import { WorkflowSection } from '@/components/marketing/workflow-section'

export const metadata: Metadata = {
  title: `${BRAND.module} — ${BRAND.primaryMessage}`,
}

export default function FreightForwardingDemoPage() {
  return (
    <div className="min-h-dvh bg-ink text-text">
      <SiteHeader />
      <main id="main">
        <Hero />
        <JourneySection />
        <WorkflowSection />
        <VisibilitySection />
        <DocumentsSection />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  )
}
