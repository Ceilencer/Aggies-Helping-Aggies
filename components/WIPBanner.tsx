'use client'

import { useEffect, useState } from 'react'

export default function WIPBanner() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const el = document.getElementById('main-scroll-container')
    if (!el) return

    // Track the scroll position where the last direction change happened.
    // Only flip visibility once the user has moved a significant distance in
    // one direction — this prevents iOS momentum-bounce jitter from toggling
    // the banner back and forth.
    const HIDE_THRESHOLD = 40   // px scrolled down before hiding
    // Must exceed the banner's own height (~80px / 5rem) so that the iOS
    // scroll-position compensation fired when the banner collapses (which
    // shifts the container by the banner height) cannot re-trigger a show.
    const SHOW_THRESHOLD = 100  // px scrolled up before showing
    // The banner may only reappear when the user is in the top portion of the
    // scroll range. iOS momentum bounce at the bottom sits at ~95-100% of
    // scroll depth and can never reach this threshold, making the gate
    // immune to bounce regardless of how long deceleration takes.
    const SHOW_MAX_FRACTION = 0.35

    let directionAnchor = el.scrollTop

    const onScroll = () => {
      if (window.innerWidth >= 1024) {
        setVisible(true)
        return
      }
      const current = el.scrollTop
      const scrollMax = el.scrollHeight - el.clientHeight
      const delta = current - directionAnchor

      if (delta > HIDE_THRESHOLD && current > 10) {
        setVisible(false)
        directionAnchor = current
      } else if (delta < -SHOW_THRESHOLD && (scrollMax <= 0 || current / scrollMax < SHOW_MAX_FRACTION)) {
        setVisible(true)
        directionAnchor = current
      }
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      style={{
        overflow: 'hidden',
        maxHeight: visible ? '5rem' : '0px',
        transition: 'max-height 0.25s ease',
      }}
    >
      <div className="w-full flex-shrink-0 bg-yellow-400 text-yellow-900 text-center text-sm font-medium px-4 py-2">
        This site is currently a work in progress and is not yet deployed.{' '}
        Found a bug or have a suggestion?{' '}
        <a
          href="mailto:cobyrafalik@aggieshelpingaggies.org"
          className="underline font-semibold hover:text-yellow-950"
        >
          cobyrafalik@aggieshelpingaggies.org
        </a>
      </div>
    </div>
  )
}
