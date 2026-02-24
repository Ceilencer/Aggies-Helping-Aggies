'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import Modal from '@/components/Modal'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  itemType: 'post' | 'comment'
  itemId: string
  onReportSubmitted?: () => void
}

const REPORT_REASONS = [
  'Spam or misleading',
  'Harassment or bullying',
  'Inappropriate content',
  'Misinformation',
  'Copyright violation',
  'Other',
]

export default function ReportModal({
  isOpen,
  onClose,
  itemType,
  itemId,
  onReportSubmitted,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedReason) {
      setError('Please select a reason')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const endpoint =
        itemType === 'post'
          ? `/api/posts/${itemId}/report`
          : `/api/comments/${itemId}/report`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: selectedReason,
          description: description || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit report')
      }

      setSuccess(true)
      setSelectedReason('')
      setDescription('')

      setTimeout(() => {
        setSuccess(false)
        onReportSubmitted?.()
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Report ${itemType}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-950 p-3">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 dark:bg-green-950 p-3">
            <p className="text-sm text-green-700 dark:text-green-200">
              Thank you! Your report has been submitted.
            </p>
          </div>
        )}

        {!success && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">
                Reason for reporting
              </label>
              <div className="space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <label key={reason} className="flex items-center">
                    <input
                      type="radio"
                      name="reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      disabled={isSubmitting}
                      className="mr-2"
                    />
                    <span className="text-sm">{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Additional details (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide more context..."
                maxLength={500}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {description.length}/500
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedReason}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  )
}
