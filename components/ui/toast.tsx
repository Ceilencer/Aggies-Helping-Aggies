"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface ToastProps {
  message: string
  type?: "success" | "error" | "info"
  duration?: number
  onClose?: () => void
  positionClassName?: string
  action?: { label: string; onClick: () => void }
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "info",
  duration = 3000,
  onClose,
  positionClassName,
  action,
}) => {
  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose?.()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const bgColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500"
  }[type]

  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 p-4 rounded-lg text-white shadow-lg animate-in fade-in slide-in-from-top-2",
      positionClassName,
      bgColor
    )}>
      <div className="flex items-center gap-2">
        <span>{message}</span>
        {action && (
          <button
            onClick={() => { action.onClick(); onClose?.() }}
            className="ml-1 underline font-semibold hover:opacity-80 text-sm"
          >
            {action.label}
          </button>
        )}
        <button
          onClick={onClose}
          className="ml-2 hover:opacity-80"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// Simple toast hook
export function useToast() {
  const [toasts, setToasts] = React.useState<Array<ToastProps & { id: number }>>([])
  const nextId = React.useRef(0)

  const showToast = React.useCallback((props: ToastProps) => {
    const id = ++nextId.current
    setToasts(prev => [...prev, { ...props, id }])
  }, [])

  const removeToast = React.useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const ToastContainer = React.useMemo(() => {
    return () => (
      <>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            positionClassName={toast.positionClassName}
            action={toast.action}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </>
    )
  }, [toasts, removeToast])

  return { showToast, ToastContainer }
}
