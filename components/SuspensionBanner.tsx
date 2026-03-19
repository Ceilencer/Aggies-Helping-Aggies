'use client'

import { useSearchParams } from 'next/navigation'

export default function SuspensionBanner() {
  const searchParams = useSearchParams()
  if (searchParams.get('suspended') !== 'true') return null

  return (
    <div className="bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900/50 py-4">
      <div className="container mx-auto px-4">
        <div className="flex items-start gap-3">
          <div className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">⚠️</div>
          <div>
            <h3 className="font-semibold text-red-700 dark:text-red-400">Account Suspended</h3>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
              Your account has been suspended or banned. You are currently unable to access the dashboard.
              If you believe this is a mistake, please contact support.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
