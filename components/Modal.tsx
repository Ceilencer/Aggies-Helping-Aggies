'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  headerExtra?: React.ReactNode
  size?: 'md' | 'lg' | 'xl'
  contentClassName?: string
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
}

export default function Modal({
  isOpen,
  onClose,
  children,
  title,
  headerExtra,
  size = 'lg',
  contentClassName,
}: ModalProps) {
  const [isMounted, setIsMounted] = useState(false)
  const mouseDownTargetRef = useRef<EventTarget | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  if (!isOpen || !isMounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 sm:p-4"
      onMouseDown={(e) => { mouseDownTargetRef.current = e.target }}
      onClick={(e) => { if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full ${sizeClasses[size]} h-[95dvh] sm:h-auto sm:max-h-[min(90vh,56rem)] overflow-hidden sm:overflow-y-auto rounded-t-2xl sm:rounded-lg bg-background shadow-xl flex flex-col`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground shadow hover:bg-muted"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>
        {title && (
          <div className="border-b border-border px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between gap-3 pr-12">
              <h2 className="text-lg font-semibold text-card-header-text">
                {title}
              </h2>
              {headerExtra ? <div className="flex-shrink-0">{headerExtra}</div> : null}
            </div>
          </div>
        )}
        <div
          className={`modal-scroll flex-1 min-h-0 ${contentClassName ?? 'p-6'}`}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
