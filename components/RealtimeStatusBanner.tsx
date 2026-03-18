'use client'

import { WifiOff } from 'lucide-react'
import { useRealtimeStatus } from '@/lib/realtime/RealtimeStatusContext'

export function RealtimeStatusBanner() {
  const { isConnected } = useRealtimeStatus()

  if (isConnected) return null

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300">
      <WifiOff size={14} className="shrink-0" />
      Live updates unavailable — refresh to see the latest content.
    </div>
  )
}
