'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'

interface RealtimeStatusContextValue {
  isConnected: boolean
  reportStatus: (channelKey: string, status: string) => void
}

const RealtimeStatusContext = createContext<RealtimeStatusContextValue>({
  isConnected: true,
  reportStatus: () => {},
})

export function RealtimeStatusProvider({ children }: { children: React.ReactNode }) {
  const errorChannels = useRef(new Set<string>())
  const [isConnected, setIsConnected] = useState(true)

  const reportStatus = useCallback((channelKey: string, status: string) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      errorChannels.current.add(channelKey)
      setIsConnected(false)
    } else if (status === 'SUBSCRIBED' || status === 'CLOSED') {
      errorChannels.current.delete(channelKey)
      if (errorChannels.current.size === 0) setIsConnected(true)
    }
  }, [])

  return (
    <RealtimeStatusContext.Provider value={{ isConnected, reportStatus }}>
      {children}
    </RealtimeStatusContext.Provider>
  )
}

export function useRealtimeStatus() {
  return useContext(RealtimeStatusContext)
}
