'use client'

import { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
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
  size = 'lg',
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
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
          className="absolute right-4 top-4 rounded-full bg-background/80 px-3 py-1 text-xl leading-none text-foreground shadow hover:bg-background"
          aria-label="Close dialog"
        >
          x
        </button>
        {title && (
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-card-header-text">
              {title}
            </h2>
          </div>
        )}
        <div className={title ? 'max-h-[82vh] overflow-y-auto p-6' : 'max-h-[90vh] overflow-y-auto p-6'}>
          {children}
        </div>
      </div>
    </div>
  )
}
