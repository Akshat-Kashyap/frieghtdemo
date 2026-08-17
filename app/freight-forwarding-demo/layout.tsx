import { TooltipProvider } from '@/components/ui/overlays'
import { StoreProvider } from '@/components/providers/store-provider'

export default function FreightForwardingDemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <TooltipProvider delayDuration={200} skipDelayDuration={300}>
        {children}
      </TooltipProvider>
    </StoreProvider>
  )
}
