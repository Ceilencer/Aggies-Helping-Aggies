'use client'

import { usePathname } from 'next/navigation'

export default function ContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/dashboard/admin')

  return (
    <div className={`w-full px-4 lg:px-0 py-8 ${isAdmin ? 'lg:max-w-5xl' : 'lg:max-w-2xl'}`}>
      {children}
    </div>
  )
}
