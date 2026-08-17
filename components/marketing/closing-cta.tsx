'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Radar } from 'lucide-react'

import { BRAND } from '@/data/copy'
import { HERO_JOB_ID } from '@/data/jobs'
import { ROUTES } from '@/lib/routes'
import { Button } from '@/components/ui/primitives'
import { fadeUp, stagger } from '@/lib/motion'

/**
 * The close.
 *
 * The poster frame returns here at low contrast — the page opened on the
 * harbour and it ends there, which is the cheapest way to make a long scroll
 * feel like one piece rather than a stack of sections.
 *
 * Both controls come from the Button primitive rather than being drawn here.
 * They were hand-rolled, and the hand-rolled version had drifted a long way
 * off: a blue ambient cast and a warm-brown contact cast, neither of which
 * exists anywhere else in this product. A closing CTA that is lit differently
 * from every other button on the page is precisely the inconsistency that
 * reads as machine-assembled.
 */
export function ClosingCta() {
  return (
    <section className="relative overflow-hidden border-t border-hairline bg-ink">
      <div className="pw-grain absolute inset-0" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/port-approach-poster.jpg"
          alt=""
          className="h-full w-full object-cover object-[60%_65%] opacity-[0.28] [filter:saturate(0.75)]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/78 to-ink" />
      </div>

      <motion.div
        variants={stagger(0.04)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-100px' }}
        className="relative mx-auto max-w-[1280px] px-4 py-24 text-center sm:px-6 lg:px-8 lg:py-32"
      >
        {/* Draft marks. The direction is named after them and this is the one
            place they get to be purely a signature — a graduated rule under a
            closing line, the way a hull is marked. */}
        <motion.p variants={fadeUp} className="mx-auto flex max-w-[420px] items-center gap-3">
          <span aria-hidden className="pw-ticks h-1.5 flex-1 opacity-40" />
          <span className="pw-stencil shrink-0">{BRAND.module}</span>
          <span aria-hidden className="pw-ticks h-1.5 flex-1 opacity-40" />
        </motion.p>

        <motion.h2
          variants={fadeUp}
          className="mx-auto mt-6 max-w-[18ch] text-[clamp(2rem,4.6vw,3rem)] font-semibold leading-[1.06] tracking-[-0.035em] text-text"
        >
          Move freight with more clarity.
        </motion.h2>

        <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-[52ch] text-[16px] leading-[1.65] text-text-muted">
          One shipment. One customer view. Every update that matters, in the place you already look.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          {/* `#search` is an in-page jump, and it only glides now that the
              viewport is the scrolling element again. */}
          <Button asChild variant="primary" size="lg" className="h-12 rounded-full px-7 text-[15px] font-semibold">
            <a href="#search">
              Book freight
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </Button>

          <Button asChild variant="secondary" size="lg" className="h-12 rounded-full px-7 text-[15px] font-semibold">
            <Link href={ROUTES.booking(HERO_JOB_ID)}>
              <Radar className="h-4 w-4 text-signal" aria-hidden />
              Track an existing shipment
            </Link>
          </Button>
        </motion.div>

        <motion.p variants={fadeUp} className="mt-7 text-micro text-text-faint">
          Demo environment · No account, payment or real cargo is involved.
        </motion.p>
      </motion.div>
    </section>
  )
}
