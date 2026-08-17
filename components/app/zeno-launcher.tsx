'use client'

import { Drawer } from '@/components/ui/overlays'
import { ZenoConversation } from '@/components/zeno/conversation'

/**
 * Zeno in a slide-over.
 *
 * The same conversation component the full page renders, so a question asked
 * from the drawer and one asked from `/zeno` cannot answer differently.
 */
export function ZenoLauncher({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Zeno"
      description="Ask about your rates, shipments, ports and documents."
      width="md"
    >
      <ZenoConversation compact />
    </Drawer>
  )
}
