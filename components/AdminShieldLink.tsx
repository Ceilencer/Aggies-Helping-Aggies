'use client'

import Link from 'next/link'
import { Shield } from 'lucide-react'
import { useAdminCounts } from '@/components/AdminCountProvider'

export function AdminShieldLink() {
  const { total } = useAdminCounts()

  return (
    <Link
      href="/dashboard/admin"
      className="relative flex h-10 w-10 items-center justify-center rounded-full bg-header-bg text-white transition-colors hover:bg-white/10"
      aria-label={total > 0 ? `Admin — ${total} pending` : 'Admin'}
    >
      <Shield className="h-5 w-5" />
      {total > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white leading-none">
          {total > 99 ? '99+' : total}
        </span>
      )}
    </Link>
  )
}
