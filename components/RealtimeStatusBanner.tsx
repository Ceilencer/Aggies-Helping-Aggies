'use client'

import { useEffect, useRef, useState } from 'react'
import { WifiOff } from 'lucide-react'
import { useRealtimeStatus } from '@/lib/realtime/RealtimeStatusContext'

export function RealtimeStatusBanner() {
  const { isConnected } = useRealtimeStatus()
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const el = document.getElementById('main-scroll-container')
    if (!el) return

    const onScroll = () => {
      const current = el.scrollTop
      const delta = current - lastScrollY.current
      // Ignore tiny jitter
      if (Math.abs(delta) < 4) return
      setVisible(delta < 0 || current < 10)
      lastScrollY.current = current
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  if (isConnected) return null

  return (
    <div
      className={`
        flex items-center justify-center gap-2 bg-amber-50 border-b border-amber-200
        px-4 text-sm text-amber-800
        dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300
        overflow-hidden transition-all duration-300 ease-in-out
        lg:max-h-16 lg:opacity-100 lg:py-2 lg:border-b
        ${visible ? 'max-h-16 opacity-100 py-2' : 'max-h-0 opacity-0 py-0 border-b-0'}
      `}
    >
      <WifiOff size={14} className="shrink-0" />
      Live updates unavailable — refresh to see the latest content.
    </div>
  )
}
