"use client"

import { ReactNode, useMemo } from "react"
import { usePathname } from "next/navigation"

type DashboardShellProps = {
  children: ReactNode
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname()
  const hideSidebar = useMemo(() => {
    return pathname === "/dashboard/profile" || pathname?.startsWith("/dashboard/post-creation")
  }, [pathname])

  if (hideSidebar) {
    return <div>{children}</div>
  }

  return (
    <div>{children}</div>
  )
}
