'use client'

import { ArrowUp, X } from 'lucide-react'

interface NewPostsBubbleProps {
  count: number
  onLoad: () => void
  onDismiss: () => void
}

export function NewPostsBubble({ count, onLoad, onDismiss }: NewPostsBubbleProps) {
  if (count === 0) return null

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-lg shadow-primary/25 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      <button
        onClick={onLoad}
        className="flex items-center gap-2 px-4 py-2.5 hover:bg-white/10 transition-colors"
      >
        <ArrowUp size={14} className="shrink-0" />
        {count} new {count === 1 ? 'post' : 'posts'} — click to load
      </button>
      <div className="w-px h-5 bg-white/25 shrink-0" />
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss() }}
        className="px-3 py-2.5 hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  )
}
