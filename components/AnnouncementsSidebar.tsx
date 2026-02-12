"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatRelativeTime } from "@/lib/utils"

type Announcement = {
  id: string
  title: string
  created_at: string
}

type AnnouncementsSidebarProps = {
  announcements?: Announcement[] | null
}

export default function AnnouncementsSidebar({ announcements }: AnnouncementsSidebarProps) {
  const pathname = usePathname()
  const shouldHide =
    pathname === "/dashboard/profile" ||
    pathname?.startsWith("/dashboard/post-creation")

  if (shouldHide) {
    return null
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Announcements</CardTitle>
        <Link href="/dashboard/channels/announcements" className="text-sm text-primary hover:text-primary/80">
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {announcements && announcements.length > 0 ? (
          announcements.map((announcement) => (
            <div key={announcement.id} className="space-y-1">
              <p className="text-sm font-medium text-card-header-text">
                {announcement.title}
              </p>
              <p className="text-xs text-card-subtext">
                {formatRelativeTime(announcement.created_at)}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-card-subtext">No announcements yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
