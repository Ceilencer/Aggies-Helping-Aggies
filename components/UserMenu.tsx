"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { getInitials } from "@/lib/utils"

type UserMenuProps = {
  displayName: string
  avatarUrl?: string | null
  isAdmin?: boolean
  signOutAction: (formData: FormData) => void | Promise<void>
}

export function UserMenu({
  displayName,
  avatarUrl,
  isAdmin = false,
  signOutAction,
}: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current) {
        return
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  const menuItemClassName =
    "block w-full rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-accent"

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="relative inline-flex h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`${displayName} avatar`}
            fill
            sizes="(min-width: 768px) 48px, (min-width: 640px) 44px, 40px"
            className="object-cover rounded-full"
          />
        ) : (
          <span className="text-xs sm:text-sm font-semibold">{getInitials(displayName)}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-48 rounded-md border bg-card p-2 shadow-lg">
          <Link
            href="/dashboard/profile"
            className={menuItemClassName}
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          {isAdmin && (
            <Link
              href="/dashboard/admin"
              className={menuItemClassName}
              onClick={() => setOpen(false)}
            >
              Admin Dashboard
            </Link>
          )}
          <div className="my-1 h-px bg-border" />
          <form action={signOutAction} onSubmit={() => setOpen(false)}>
            <button
              type="submit"
              className={menuItemClassName}
            >
              Sign Out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
