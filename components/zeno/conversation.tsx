'use client'

import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, ArrowUpRight, Search, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { ZENO_SUGGESTIONS, answerQuestion, type ZenoAnswer } from '@/lib/zeno'
import type { ZenoBlock } from '@/lib/zeno/types'
import { useSafeReducedMotion } from '@/hooks/use-safe-reduced-motion'
import { fastTween, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * THE ZENO CONVERSATION
 * ══════════════════════════════════════════════════════════════════════════
 * One component, rendered both in the slide-over and on the full page, so a
 * question cannot get two different answers depending on where it was asked.
 *
 * The transcript is deliberately session-only. A persisted conversation
 * would need a hydration gate, and a demo that opens with yesterday's chat
 * history is worse than one that opens clean.
 *
 * WHAT THIS SCREEN IS ARGUING
 * ──────────────────────────────────────────────────────────────────────────
 * Every assistant over a freight book looks the same in a screenshot. The
 * difference this product is claiming is that Zeno never answers from a
 * guess — it reads a record and tells you which one. So the answer is built
 * as an instrument output rather than a chat bubble:
 *
 *   · the headline is the reading, set in the display face on a plate;
 *   · the blocks are the working, milled into channels underneath it;
 *   · the citation is not a footnote. It is its own region of the plate with
 *     its own stencil, because "which record did this come from" is the
 *     product's whole honesty argument and a row of small grey chips at the
 *     bottom of a card is where an argument goes to be ignored.
 *
 * The answer contract in `lib/zeno` is untouched: this file renders it and
 * decides nothing about what it says.
 */

interface Turn {
  id: number
  question: string
  answer: ZenoAnswer
}

export function ZenoConversation({ compact = false }: { compact?: boolean }) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const reduce = useSafeReducedMotion()

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reduce ? 'auto' : 'smooth' })
  }, [turns, thinking, reduce])

  async function ask(question: string) {
    const q = question.trim()
    if (!q || thinking) return
    setDraft('')
    setThinking(true)
    // A short beat. The lookup is synchronous, and an answer that appears in
    // the same frame as the question reads as a canned string rather than a
    // search over the account.
    await new Promise((r) => setTimeout(r, reduce ? 0 : 420))
    setTurns((prev) => [...prev, { id: prev.length, question: q, answer: answerQuestion(q) }])
    setThinking(false)
    inputRef.current?.focus()
  }

  const empty = turns.length === 0

  return (
    <div className={cn('flex min-h-0 min-w-0 flex-col', compact ? 'h-full' : 'h-[calc(100dvh-14rem)]')}>
      <div ref={scrollRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        {empty ? (
          <div className={cn('flex flex-col', compact ? 'gap-4 py-2' : 'gap-6 py-8')}>
            <div>
              {/* The mark sits in a recess: Zeno is part of the instrument,
                  not a badge stuck on top of it. */}
              <span className="pw-rail inline-flex h-10 w-10 items-center justify-center rounded-full">
                <Sparkles className="h-5 w-5 text-signal" aria-hidden />
              </span>
              <h3 className={cn('pw-plate-title mt-3 leading-tight', compact ? 'text-[18px]' : 'text-[24px]')}>
                How can Zeno help you?
              </h3>
              <p className="mt-1.5 max-w-prose text-data leading-relaxed text-text-muted">
                Zeno answers from your own freight records — never from a guess. Ask about a lane, a shipment, a port
                or a term you want explained.
              </p>
            </div>

            <ul className="grid gap-2 sm:grid-cols-2">
              {ZENO_SUGGESTIONS.map((s) => (
                <li key={s.label} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => ask(s.prompt)}
                    className="pw-tactile flex w-full flex-col items-start gap-1 rounded-card px-3.5 py-3 text-left"
                  >
                    <span className="pw-stencil text-signal">{s.label}</span>
                    <span className="text-data leading-snug text-text">{s.prompt}</span>
                    <span className="text-micro text-text-faint">{s.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          /* Answers arrive after an artificial beat, so the transcript is the
             live region: without it the whole output of this module — the
             headline, the blocks, the citations — lands silently for a screen
             reader, since focus stays in the input. Polite, and not atomic:
             only the turn just appended is announced, not the whole thread. */
          <ol className="flex flex-col gap-6 py-2" aria-live="polite" aria-atomic="false">
            {turns.map((turn) => (
              <li key={turn.id} className="flex min-w-0 flex-col gap-3">
                <p className="pw-elev-0 max-w-[85%] self-end rounded-card rounded-br-sm bg-signal px-3.5 py-2 text-data font-medium text-on-accent">
                  {turn.question}
                </p>
                <ZenoAnswerCard answer={turn.answer} onFollowUp={ask} reduce={reduce} />
              </li>
            ))}
          </ol>
        )}

        <AnimatePresence>{thinking && <ThinkingRail reduce={reduce} />}</AnimatePresence>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void ask(draft)
        }}
        className="pw-field mt-3 flex min-w-0 shrink-0 items-center gap-2 rounded-card px-3 py-2"
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about a lane, shipment, port or term…"
          aria-label="Ask Zeno"
          className="min-w-0 flex-1 bg-transparent text-body text-text placeholder:text-text-faint focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim() || thinking}
          className="pw-elev-0 flex h-9 w-9 shrink-0 items-center justify-center rounded-chip bg-signal text-on-accent transition-opacity active:translate-y-px disabled:opacity-35"
          aria-label="Send"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>

      <p className="mt-2 shrink-0 text-micro leading-relaxed text-text-faint">
        Zeno reads the simulated records in this demo. It has no model behind it and cannot access live carrier,
        terminal or customs systems.
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   THE THINKING STATE
   ══════════════════════════════════════════════════════════════════════════
   A spinner says "the software is busy". This is meant to say something more
   specific and more true: the machine is running along your records looking
   for the answer. So it is a slug of light travelling a milled channel — the
   same channel every reading in this product sits in — and it is the only
   loop on the screen.

   Under reduced motion the slug stops and fills the channel instead: the
   state is still legible as "working", and nothing moves.
   ══════════════════════════════════════════════════════════════════════════ */

function ThinkingRail({ reduce }: { reduce: boolean }) {
  return (
    <motion.p
      role="status"
      initial={{ opacity: 0, y: reduce ? 0 : 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={fastTween}
      className="flex items-center gap-3 py-3 text-data text-text-muted"
    >
      <span className="pw-rail relative h-1.5 w-20 shrink-0 overflow-hidden rounded-full" aria-hidden>
        {reduce ? (
          <span className="absolute inset-0 rounded-full bg-signal/40" />
        ) : (
          <motion.span
            className="absolute inset-y-0 left-0 w-6 rounded-full bg-signal"
            animate={{ x: [0, 56, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
          />
        )}
        <span aria-hidden className="pw-ticks pointer-events-none absolute inset-0 opacity-30" />
      </span>
      Checking your records…
    </motion.p>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   ANSWER RENDERING
   ══════════════════════════════════════════════════════════════════════════ */

function ZenoAnswerCard({
  answer,
  onFollowUp,
  reduce,
}: {
  answer: ZenoAnswer
  onFollowUp: (q: string) => void
  reduce: boolean
}) {
  return (
    // The answer arrives as one object settling onto the page, and its working
    // follows a beat behind — the order a reader takes it in anyway. Transform
    // and opacity only, and the whole thing collapses to a fade when the
    // viewer has asked for less motion.
    <motion.div
      className="pw-plate min-w-0 overflow-hidden"
      variants={stagger(reduce ? 0 : 0.05)}
      initial="hidden"
      animate="show"
    >
      <motion.div
        variants={
          reduce
            ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.12 } } }
            : { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: fastTween } }
        }
        className="pw-groove-b flex items-start gap-2.5 border-b border-hairline px-4 py-3.5"
      >
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
        <p className="pw-plate-title min-w-0 text-panel leading-snug">{answer.headline}</p>
      </motion.div>

      {answer.blocks.length > 0 && (
        <div className="flex flex-col gap-3 px-4 py-3.5">
          {answer.blocks.map((block, i) => (
            <motion.div
              key={i}
              className="min-w-0"
              variants={
                reduce
                  ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.12 } } }
                  : { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: fastTween } }
              }
            >
              <ZenoBlockView block={block} />
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Where it read this ─────────────────────────────────────────── */}
      {answer.citations.length > 0 && (
        <motion.div
          variants={
            reduce
              ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.12 } } }
              : { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: fastTween } }
          }
          className="pw-groove bg-raised-2/45 px-4 py-3"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="pw-stencil flex items-center gap-1.5">
              <Search className="h-3 w-3" aria-hidden />
              Read from
            </span>
            {answer.citations.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="pw-tactile inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-chip px-2.5 py-1 text-micro font-medium text-text"
              >
                <span className="min-w-0 truncate">{c.label}</span>
                <ArrowUpRight className="h-3 w-3 shrink-0 text-signal" aria-hidden />
              </Link>
            ))}
          </div>
          <p className="mt-2 text-micro leading-relaxed text-text-faint">
            Every figure above was read off these records. Where a record does not hold the answer, Zeno says so
            rather than filling the gap.
          </p>
        </motion.div>
      )}

      {answer.followUps.length > 0 && (
        <div className="pw-groove flex flex-wrap gap-1.5 px-4 py-3">
          {answer.followUps.slice(0, 3).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFollowUp(f)}
              className="max-w-full rounded-full border border-hairline px-2.5 py-1 text-micro text-text-muted transition-colors hover:border-signal/40 hover:text-signal"
            >
              <span className="block truncate">{f}</span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}

/**
 * One block of the working.
 *
 * A figure is set in mono because every figure in this product is; a
 * definition is not. The contract does not label which is which, so the test
 * is whether the value carries a digit — the cheapest honest signal available
 * without changing `lib/zeno`, which is not this file's to change.
 */
function ZenoBlockView({ block }: { block: ZenoBlock }) {
  if (block.kind === 'note') {
    return (
      <p
        className={cn(
          'rounded-card px-3.5 py-2.5 text-[12px] leading-relaxed text-text-muted',
          block.tone === 'amber' ? 'pw-elev-0 border border-amber/30 bg-amber/8' : 'pw-rail',
        )}
      >
        {block.text}
      </p>
    )
  }

  if (block.kind === 'list') {
    return (
      <dl className="pw-rail flex flex-col gap-2 rounded-card px-3.5 py-3">
        {block.items.map((item) => {
          const isFigure = Boolean(item.value && /\d/.test(item.value))

          return (
            <div key={item.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
              <dt className="pw-stencil shrink-0">{item.label}</dt>
              <dd className="min-w-0 text-data text-text sm:text-right">
                <span className={cn(isFigure && 'pw-readout')}>{item.value}</span>
                {item.hint && <span className="ml-1.5 text-micro text-text-faint">{item.hint}</span>}
              </dd>
            </div>
          )
        })}
      </dl>
    )
  }

  return (
    // Wide tables scroll inside their own box; the page never does.
    <div className="pw-table-wrap">
      <table className="pw-table">
        <thead>
          <tr>
            {block.columns.map((c, i) => (
              <th key={c} className={cn(block.numericColumns?.includes(i) && 'text-right')}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className={cn(block.numericColumns?.includes(ci) && 'pw-readout text-right')}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
