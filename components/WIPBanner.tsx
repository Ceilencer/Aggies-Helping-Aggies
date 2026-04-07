'use client'

import { useEffect, useRef, useState } from 'react'

export default function WIPBanner() {
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const el = document.getElementById('main-scroll-container')
    if (!el) return

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const onScroll = () => {
      if (window.innerWidth >= 1024) {
        setVisible(true)
        return
      }
      const current = el.scrollTop
      const delta = current - lastScrollY.current
      if (Math.abs(delta) < 4) return
      lastScrollY.current = current

      const next = delta < 0 || current < 10
      // Debounce so rapid micro-fluctuations (iOS momentum bounce) don't jitter
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => setVisible(next), 50)
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  }, [])

  return (
    <div
      style={{
        overflow: 'hidden',
        maxHeight: visible ? '3rem' : '0px',
        transition: 'max-height 0.25s ease',
      }}
    >
      <div className="w-full flex-shrink-0 bg-yellow-400 text-yellow-900 text-center text-sm font-medium px-4 py-2">
        This site is currently a work in progress and is not yet deployed.{' '}
        Found a bug?{' '}
        <a
          href="mailto:support@aggieshelpingaggies.org"
          className="underline font-semibold hover:text-yellow-950"
        >
          support@aggieshelpingaggies.org
        </a>
      </div>
    </div>
  )
}
