'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  headerExtra?: React.ReactNode
  size?: 'md' | 'lg' | 'xl'
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
}: ModalProps) {
  const [isMounted, setIsMounted] = useState(false)

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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden rounded-lg bg-background shadow-xl`}
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
          <div className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between gap-3 pr-12">
              <h2 className="text-lg font-semibold text-card-header-text">
                {title}
              </h2>
              {headerExtra ? <div className="flex-shrink-0">{headerExtra}</div> : null}
            </div>
          </div>
        )}
        <div className={title ? 'max-h-[82vh] overflow-y-auto p-6' : 'max-h-[90vh] overflow-y-auto p-6'}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
