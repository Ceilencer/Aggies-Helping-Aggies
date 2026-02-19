"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"

const DEFAULT_OFFSET = 24

export default function FloatingCreatePostButton() {
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

  return (
    <Link
      href="/dashboard/post-creation"
      className="fixed right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-maroon text-white shadow-lg transition-colors hover:bg-brand-maroon-hover"
      style={{ bottom: `${bottomOffset}px` }}
      aria-label="Create new post"
    >
      <Plus className="h-6 w-6" />
    </Link>
  )
}
