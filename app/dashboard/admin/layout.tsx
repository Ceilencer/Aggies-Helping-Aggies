'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  const navItems = [
    { href: '/dashboard/admin', label: 'Posts Moderation' },
    { href: '/dashboard/admin/users', label: 'User Management' },
    { href: '/dashboard/admin/pending-verifications', label: 'Pending Verifications' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex border-b">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              pathname === item.href
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  )
}
