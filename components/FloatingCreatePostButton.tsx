"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"

const DEFAULT_OFFSET = 24

interface FloatingCreatePostButtonProps {
  onClick?: () => void
  href?: string
}

export default function FloatingCreatePostButton({
  onClick,
  href = '/dashboard/post-creation',
}: FloatingCreatePostButtonProps) {
  const [bottomOffset, setBottomOffset] = useState(DEFAULT_OFFSET)

  useEffect(() => {
    let frameId = 0

    const updateOffset = () => {
      const footer = document.querySelector("footer")
      if (!footer) {
        setBottomOffset(DEFAULT_OFFSET)
        return
      }

      const footerRect = footer.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const overlap = viewportHeight - footerRect.top

      if (overlap > 0) {
        setBottomOffset(overlap + DEFAULT_OFFSET)
      } else {
        setBottomOffset(DEFAULT_OFFSET)
      }
    }

    const onScroll = () => {
      if (frameId) return
      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        updateOffset()
      })
    }

    updateOffset()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  const className = "fixed right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-maroon text-white shadow-lg transition-colors hover:bg-brand-maroon-hover"

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={className}
        style={{ bottom: `${bottomOffset}px` }}
        aria-label="Create new post"
      >
        <Plus className="h-6 w-6" />
      </button>
    )
  }

  return (
    <Link
      href={href}
      className={className}
      style={{ bottom: `${bottomOffset}px` }}
      aria-label="Create new post"
    >
      <Plus className="h-6 w-6" />
    </Link>
  )
}
