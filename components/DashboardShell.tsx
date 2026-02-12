"use client"

import { ReactNode, useMemo } from "react"
import { usePathname } from "next/navigation"
import AnnouncementsSidebar from "@/components/AnnouncementsSidebar"

type DashboardShellProps = {
  children: ReactNode
  announcements?: { id: string; title: string; created_at: string }[] | null
}

export default function DashboardShell({ children, announcements }: DashboardShellProps) {
  const pathname = usePathname()
  const hideSidebar = useMemo(() => {
    return pathname === "/dashboard/profile" || pathname?.startsWith("/dashboard/post-creation")
  }, [pathname])

  if (hideSidebar) {
    return <div>{children}</div>
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>{children}</div>
      <aside className="space-y-4">
        <AnnouncementsSidebar announcements={announcements} />
      </aside>
    </div>
  )
}
