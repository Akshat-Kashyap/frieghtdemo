'use client'

import { motion, type MotionValue } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

import { useMediaQuery, useMotionSafe } from '@/hooks/use-motion-safe'
import { cn } from '@/lib/utils'

/**
 * THE HARBOUR PLATE
 * ══════════════════════════════════════════════════════════════════════════
 * Real footage of a container vessel coming alongside, used as the face of
 * the first view.
 *
 * Load order matters more than it looks. The poster frame is a plain <img>
 * that ships with the HTML, so the composition is correct on the first paint
 * and stays correct if the video never arrives — blocked by a corporate
 * proxy, a data-saver setting, or `prefers-reduced-motion`. The video mounts
 * only after hydration, and only fades over the poster once it has enough
 * frames to play, so there is never a black rectangle between the two.
 *
 * The clip is cut to loop: its last frame is a cross-dissolve back into its
 * first, so nothing jumps at the wrap.
 *
 * ── Three layers, three depths ────────────────────────────────────────────
 * The footage, the scrim and the grain are separate boxes on purpose, and the
 * media is the only one that moves. Parallax is only convincing when the thing
 * that shifts is the thing that is FURTHER AWAY: if the wash travelled with
 * the picture, the clearing would slide off the headline it was cut for, which
 * is the whole reason the clearing exists. So the caller drives `driftY` from
 * scroll and `pointerX`/`pointerY` from the cursor, both applied here to the
 * media alone, and both optional — with none of them passed this is a plain
 * still plate and every other layer is unchanged.
 *
 * The media box is oversized by 4% so a translation of a dozen pixels can
 * never pull an edge of the footage into view.
 */

const POSTER = '/media/port-approach-poster.jpg'
const SRC_LG = '/media/port-approach.mp4'
const SRC_SM = '/media/port-approach-sm.mp4'

/**
 * The one filter both media layers share, so poster and video never mismatch.
 *
 * The horizontal crop is not the same at both ends and it is not a taste call.
 * A portrait plate on a phone keeps barely a third of the frame's width, and
 * at 70% across that third is open water. At 86% it is the quay, the crane
 * legs and the vessel's flank — the same footage, framed for the window it
 * actually has. The vertical half of the same problem is solved on the media
 * box below.
 */
const MEDIA =
  'absolute inset-0 h-full w-full object-cover object-[86%_center] [filter:saturate(1.02)_contrast(1.02)] sm:object-[70%_center]'

export function HarbourPlate({
  className,
  driftY,
  pointerX,
  pointerY,
}: {
  className?: string
  driftY?: MotionValue<number>
  pointerX?: MotionValue<number>
  pointerY?: MotionValue<number>
}) {
  const motionSafe = useMotionSafe()
  const isSmall = useMediaQuery('(max-width: 700px)')
  const saveData = useSaveData()

  const [mounted, setMounted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => setMounted(true), [])

  const showVideo = mounted && motionSafe && !saveData

  useEffect(() => {
    if (!showVideo) return
    const el = videoRef.current
    if (!el) return
    // Autoplay can still be refused (low power mode, tab policy). Failing
    // quietly leaves the poster in place, which is a perfectly good hero.
    const attempt = el.play()
    if (attempt && typeof attempt.catch === 'function') attempt.catch(() => setPlaying(false))
  }, [showVideo])

  return (
    // `.pw-grain` rides on the root rather than on the media, so its 2% tooth
    // falls over the wash as well as over the picture. That is the point of it
    // here: the quiet field the headline sits on is a large flat fill of one
    // colour, and a large flat fill is exactly where an 8-bit gradient bands.
    <div className={cn('pw-grain absolute inset-0 overflow-hidden', className)} aria-hidden>
      {/* On a phone the media box is deliberately half again as tall as the
          plate and anchored to its top. A portrait window fits the frame's
          full height and crops its width, which put the only part of the
          picture the copy does not cover — the bottom quarter — on open water.
          Overshooting the height pushes the vessel's hull and the quay down
          into that band and throws away the empty sky above it instead. */}
      <motion.div className="absolute -inset-[4%] h-[150%] lg:h-[108%]" style={{ y: driftY }}>
        <motion.div className="absolute inset-0" style={{ x: pointerX, y: pointerY }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={POSTER} alt="" className={MEDIA} fetchPriority="high" decoding="async" />

          {showVideo && (
            <motion.video
              ref={videoRef}
              src={isSmall ? SRC_SM : SRC_LG}
              poster={POSTER}
              muted
              loop
              playsInline
              preload="auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: playing ? 1 : 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              onPlaying={() => setPlaying(true)}
              className={MEDIA}
            />
          )}
        </motion.div>
      </motion.div>

      {/* The clearing. Static, because it is cut to fit the copy. */}
      <div className="pw-footage-scrim absolute inset-0" />
    </div>
  )
}

/** Respect an explicit data-saver preference before pulling 2 MB of video. */
function useSaveData(): boolean {
  const [saveData, setSaveData] = useState(false)
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    setSaveData(Boolean(connection?.saveData))
  }, [])
  return saveData
}
