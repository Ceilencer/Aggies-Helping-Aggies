'use client'

import { useState } from 'react'
import Modal from './Modal'
import { Button } from './ui/button'

interface UserAgreementModalProps {
  isOpen: boolean
  onAgree: () => Promise<void>
  isLoading?: boolean
}

export default function UserAgreementModal({
  isOpen,
  onAgree,
  isLoading = false,
}: UserAgreementModalProps) {
  const [hasChecked, setHasChecked] = useState(false)

  const handleAgree = async () => {
    await onAgree()
  }

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="Welcome to Howdy Helps!" size="md">
      <div className="flex flex-col gap-4 p-6">
        {/* Header */}
        <div className="mb-2">
          <h2 className="text-2xl font-bold text-foreground">Community Guidelines & Terms</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Please review and accept our community guidelines before proceeding.
          </p>
        </div>

        {/* Scrollable Rules Section */}
        <div className="max-h-96 overflow-y-auto rounded-lg border border-border bg-muted/50 p-4 text-sm">
          <div className="space-y-4 text-foreground">
            <div>
              <h3 className="font-semibold">1. Respectful Communication</h3>
              <p className="mt-1 text-muted-foreground">
                Treat all community members with respect. Harassment, bullying, or discriminatory behavior is not tolerated.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">2. Authentic Identity</h3>
              <p className="mt-1 text-muted-foreground">
                Use your real name and authentic information. Impersonation or creating fake accounts is prohibited.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">3. Appropriate Content</h3>
              <p className="mt-1 text-muted-foreground">
                Do not post offensive, explicit, or inappropriate content. Keep discussions relevant to the channel topics.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">4. No Spam or Self-Promotion</h3>
              <p className="mt-1 text-muted-foreground">
                Avoid spam, excessive self-promotion, or commercial advertising without prior approval.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">5. Privacy and Safety</h3>
              <p className="mt-1 text-muted-foreground">
                Do not share others' personal information without consent. Respect privacy and maintain a safe community environment.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">6. Intellectual Property</h3>
              <p className="mt-1 text-muted-foreground">
                Only post content you own or have permission to share. Respect copyrights and intellectual property rights.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">7. Compliance with Laws</h3>
              <p className="mt-1 text-muted-foreground">
                Follow all applicable laws and regulations. Illegal activities are strictly prohibited.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">8. Moderation and Enforcement</h3>
              <p className="mt-1 text-muted-foreground">
                We reserve the right to remove content and enforce these guidelines. Repeated violations may result in account suspension.
              </p>
            </div>
          </div>
        </div>

        {/* Acknowledgment Checkbox */}
        <label className="flex items-start gap-3 rounded border border-border p-3">
          <input
            type="checkbox"
            checked={hasChecked}
            onChange={(e) => setHasChecked(e.target.checked)}
            className="mt-1 rounded border-primary"
            disabled={isLoading}
          />
          <span className="text-sm text-muted-foreground">
            I have read and agree to the community guidelines and terms of service.
          </span>
        </label>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleAgree}
            disabled={!hasChecked || isLoading}
            className="flex-1"
            size="lg"
          >
            {isLoading ? 'Accepting...' : 'Accept & Continue'}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          You must accept to continue using Howdy Helps
        </p>
      </div>
    </Modal>
  )
}
