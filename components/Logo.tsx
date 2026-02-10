"use client"

import Image from "next/image"
import Link from "next/link"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

interface LogoProps {
  href?: string
}

export function Logo({ href }: LogoProps) {
  const { theme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Default to light mode while mounting to prevent flash
  const isDark = mounted ? (theme === "dark" || (theme === "system" && systemTheme === "dark")) : false
  const logoSrc = isDark ? "/images/logos/logo-dark.svg" : "/images/logos/logo-light.svg"

  const image = (
    <Image
      src={logoSrc}
      alt="Aggies Helping Aggies"
      width={3906}
      height={500}
      priority
      className="w-48 sm:w-48 md:w-64 lg:w-80 h-auto"
    />
  )

  if (href) {
    return <Link href={href}>{image}</Link>
  }

  return image
}
