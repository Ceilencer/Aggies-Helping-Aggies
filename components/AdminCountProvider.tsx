'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useAdminPendingCount, AdminPendingCounts } from '@/lib/hooks/useAdminPendingCount'

const DEFAULT: AdminPendingCounts = {
  total: 0,
  pendingPosts: 0,
  pendingUsers: 0,
  unresolvedReports: 0,
  pendingNameChanges: 0,
  pendingRingApplications: 0,
}

const AdminCountContext = createContext<AdminPendingCounts>(DEFAULT)

export function AdminCountProvider({
  children,
  isAdmin,
}: {
  children: ReactNode
  isAdmin: boolean
}) {
  const counts = useAdminPendingCount(isAdmin)
  return (
    <AdminCountContext.Provider value={counts}>
      {children}
    </AdminCountContext.Provider>
  )
}

export function useAdminCounts(): AdminPendingCounts {
  return useContext(AdminCountContext)
}
