'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface NotificationCountContextValue {
  unreadCount: number
  setUnreadCount: (n: number | ((prev: number) => number)) => void
}

const NotificationCountContext = createContext<NotificationCountContextValue>({
  unreadCount: 0,
  setUnreadCount: () => {},
})

export function NotificationCountProvider({
  userId,
  initialUnreadCount,
  children,
}: {
  userId: string
  initialUnreadCount: number
  children: ReactNode
}) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`notifications-count-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setUnreadCount((c) => c + 1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false)
            .then(({ count }) => setUnreadCount(count ?? 0))
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [userId])

  return (
    <NotificationCountContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </NotificationCountContext.Provider>
  )
}

export function useNotificationCount() {
  return useContext(NotificationCountContext)
}
