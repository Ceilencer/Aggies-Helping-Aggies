'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAdminCounts } from '@/components/AdminCountProvider'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { pendingPosts, pendingUsers, unresolvedReports, pendingNameChanges } = useAdminCounts()

  const navItems = [
    { href: '/dashboard/admin', label: 'Pending Posts', count: pendingPosts },
    { href: '/dashboard/admin/users', label: 'User Management', count: null },
    { href: '/dashboard/admin/suspended-users', label: 'Suspended Users', count: null },
    { href: '/dashboard/admin/pending-verifications', label: 'Pending New Users', count: pendingUsers },
    { href: '/dashboard/admin/reported-posts', label: 'Reported Posts & Comments', count: unresolvedReports },
    { href: '/dashboard/admin/name-change-requests', label: 'Name Changes', count: pendingNameChanges },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <div className="flex overflow-x-auto border-b">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 ${
              pathname === item.href
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.label}
            {item.count != null && item.count > 0 && (
              <span className="grid place-items-center h-4 min-w-4 rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                {item.count > 99 ? '99+' : item.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {children}
    </div>
  )
}
