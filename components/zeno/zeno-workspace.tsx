'use client'

import { PageShell } from '@/components/app/app-shell'

import { ZenoConversation } from './conversation'

/**
 * ZENO, FULL PAGE
 * ══════════════════════════════════════════════════════════════════════════
 * The page frame for the standalone Zeno route, and the reason it is a file
 * of its own rather than three lines inside `app/.../zeno/page.tsx`.
 *
 * `ZenoConversation` is shared with the slide-over in the top bar, so it
 * cannot own a page frame — a conversation rendered inside a Drawer must not
 * bring a page header with it. Every other module in this product resolves
 * that by having the route page render exactly one component from its own
 * folder, and the frame live in that component. This file keeps Zeno to the
 * same shape, so a reader scanning `app/` sees thirteen pages that are
 * identical in structure rather than twelve and an exception.
 *
 * Narrow on purpose: this is a column of questions and answers, and a
 * conversation stretched across 1,400px is unreadable.
 *
 * No `notice` prop. The conversation carries its own standing disclaimer at
 * the foot of the input, where it sits beside the thing it qualifies — two
 * disclaimers on one screen read as boilerplate and stop being read at all.
 */
export function ZenoWorkspace() {
  return (
    <PageShell
      width="narrow"
      title="Zeno AI"
      description="Ask about a lane, a shipment, a port, an invoice or a term you want explained. Every answer is read from the records in this account and cites the screen the figures came from."
    >
      <ZenoConversation />
    </PageShell>
  )
}
