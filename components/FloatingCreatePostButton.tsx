"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"

const DEFAULT_OFFSET = 24
// h-16 = 64px bottom nav on mobile (lg:hidden); add gap so FAB clears it
const MOBILE_NAV_HEIGHT = 64
// h-14 = 56px FAB height
const FAB_HEIGHT = 56

interface FloatingCreatePostButtonProps {
  onClick?: () => void
  href?: string
}

export default function FloatingCreatePostButton({
  onClick,
  href = '/dashboard/post-creation',
}: FloatingCreatePostButtonProps) {
  const [bottomOffset, setBottomOffset] = useState(DEFAULT_OFFSET)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let frameId = 0
    const scrollEl = document.getElementById("main-scroll-container")

    const updateOffset = () => {
      const isMobile = window.innerWidth < 1024
      const baseOffset = isMobile ? MOBILE_NAV_HEIGHT + DEFAULT_OFFSET : DEFAULT_OFFSET

      setBottomOffset(baseOffset)

      const footer = document.querySelector("footer")
      if (!footer || !scrollEl) {
        setHidden(false)
        return
      }

      // Hide the FAB when the footer would overlap it rather than pushing it
      // way up — a tall footer would otherwise send the button off-screen.
      const footerRect = footer.getBoundingClientRect()
      const navHeight = isMobile ? MOBILE_NAV_HEIGHT : 0
      // Top edge of the FAB in viewport coordinates
      const fabTop = window.innerHeight - navHeight - baseOffset - FAB_HEIGHT
      setHidden(footerRect.top < fabTop + DEFAULT_OFFSET)
    }

    const onScroll = () => {
      if (frameId) return
      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        updateOffset()
      })
    }

    updateOffset()
    scrollEl?.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
      scrollEl?.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  const className = `fixed right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-maroon text-white shadow-lg transition-[colors,opacity] hover:bg-brand-maroon-hover ${hidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`

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
