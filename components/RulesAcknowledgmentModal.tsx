'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'

interface RulesAcknowledgmentModalProps {
  isOpen: boolean
  onAcknowledge: () => Promise<void>
  isLoading?: boolean
}

export default function RulesAcknowledgmentModal({
  isOpen,
  onAcknowledge,
  isLoading = false,
}: RulesAcknowledgmentModalProps) {
  const [isChecked, setIsChecked] = useState(false)

  const handleAcknowledge = async () => {
    if (!isChecked) return
    await onAcknowledge()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-modal-title"
    >
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
        <CardHeader className="bg-gradient-to-r from-[#500000] to-[#7a0000] text-white sticky top-0">
          <CardTitle id="rules-modal-title" className="text-2xl">
            Community Posting Guidelines
          </CardTitle>
          <p className="text-sm text-white/90 mt-2">
            Please review and acknowledge these guidelines before accessing the platform
          </p>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* One Post Per Day */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span className="text-[#500000]">📋</span>
              One Post Per Day
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              Users are permitted to submit one post per day.
            </p>
          </div>

          {/* Content Restrictions */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span className="text-[#500000]">🚫</span>
              Content Restrictions
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              The use of profanity or inappropriate images is strictly prohibited.
            </p>
          </div>

          {/* Political Commentary */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span className="text-[#500000]">🏛️</span>
              No Political Commentary
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              Political commentary is not permitted on this platform.
            </p>
          </div>

          {/* Channel Guidelines */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span className="text-[#500000]">📌</span>
              Appropriate Channel Selection
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              All posts must be submitted under the appropriate channel:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-2">
              <li>General Discussion</li>
              <li>Aggie Ring Fundraising</li>
              <li>Football Tickets</li>
              <li>Job Opportunities</li>
              <li>Promotions & Events</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-3">
              Posts that are not tagged under the correct category may be removed.
            </p>
          </div>

          {/* Respectful Interactions */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span className="text-[#500000]">🤝</span>
              Respectful Community
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              All users are expected to remain respectful and welcoming in their interactions with others.
            </p>
          </div>

          {/* Consequences */}
          <div className="space-y-2 bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-900">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span className="text-[#500000]">⚠️</span>
              Consequences
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              Failure to comply with these guidelines may result in post removal or account restrictions.
            </p>
          </div>

          {/* Checkbox and Button */}
          <div className="space-y-4 border-t pt-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={isChecked}
                onCheckedChange={setIsChecked}
                className="mt-1"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                I have read and understood the Community Posting Guidelines and agree to follow them.
              </span>
            </label>

            <Button
              onClick={handleAcknowledge}
              disabled={!isChecked || isLoading}
              className="w-full bg-[#500000] hover:bg-[#7a0000] text-white py-6 text-base font-semibold"
              size="lg"
            >
              {isLoading ? 'Processing...' : 'I Acknowledge and Accept'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
