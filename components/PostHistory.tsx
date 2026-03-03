'use client'

import { useEffect, useState } from 'react'
import { formatRelativeTime } from '@/lib/utils'

interface HistoryEvent {
  id: string
  event_type: string
  actor_name: string | null
  note: string | null
  created_at: string
}

interface PostHistoryProps {
  postId: string
}

const EVENT_CONFIG: Record<
  string,
  { label: string; icon: string; dotClass: string; textClass: string }
> = {
  created: {
    label: 'Post created',
    icon: '📝',
    dotClass: 'bg-muted-foreground',
    textClass: 'text-muted-foreground',
  },
  approved: {
    label: 'Post approved',
    icon: '✅',
    dotClass: 'bg-green-500',
    textClass: 'text-green-700 dark:text-green-400',
  },
  rejected: {
    label: 'Post rejected',
    icon: '❌',
    dotClass: 'bg-red-500',
    textClass: 'text-red-700 dark:text-red-400',
  },
  edit_submitted: {
    label: 'Edit submitted for review',
    icon: '✏️',
    dotClass: 'bg-blue-500',
    textClass: 'text-blue-700 dark:text-blue-400',
  },
  edit_approved: {
    label: 'Edit approved',
    icon: '✅',
    dotClass: 'bg-green-500',
    textClass: 'text-green-700 dark:text-green-400',
  },
  edit_rejected: {
    label: 'Edit rejected',
    icon: '❌',
    dotClass: 'bg-red-500',
    textClass: 'text-red-700 dark:text-red-400',
  },
}

export default function PostHistory({ postId }: PostHistoryProps) {
  const [events, setEvents] = useState<HistoryEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/posts/${postId}/history`)
        if (!res.ok) return
        const data = await res.json()
        setEvents(data)
      } catch (err) {
        console.error('Failed to load post history:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [postId])

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground py-2">Loading history…</div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-2">No history recorded.</div>
    )
  }

  return (
    <div className="space-y-0">
      {events.map((event, index) => {
        const config = EVENT_CONFIG[event.event_type] ?? {
          label: event.event_type,
          icon: '•',
          dotClass: 'bg-muted-foreground',
          textClass: 'text-muted-foreground',
        }
        const isLast = index === events.length - 1

        return (
          <div key={event.id} className="flex gap-3">
            {/* Timeline spine */}
            <div className="flex flex-col items-center">
              <div className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ${config.dotClass}`} />
              {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
            </div>

            {/* Event content */}
            <div className={`pb-4 min-w-0 ${isLast ? '' : ''}`}>
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className={`text-sm font-medium ${config.textClass}`}>
                  {config.icon} {config.label}
                </span>
                {event.actor_name && (
                  <span className="text-xs text-muted-foreground">
                    by {event.actor_name}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  · {formatRelativeTime(event.created_at)}
                </span>
              </div>
              {event.note && (
                <p className="mt-0.5 text-xs text-muted-foreground italic break-words">
                  "{event.note}"
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
