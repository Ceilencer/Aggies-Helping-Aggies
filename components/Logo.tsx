"use client"

import Image from "next/image"
import Link from "next/link"

interface LogoProps {
  href?: string
}

export function Logo({ href }: LogoProps) {
  const logoSrc = "/images/logos/logo-dark.svg"

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
