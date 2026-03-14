'use client'

import { useState } from 'react'
import Link from 'next/link'
import Modal from './Modal'
import { Button } from './ui/button'
import { TERMS_SECTIONS, TERMS_EFFECTIVE_DATE } from '@/lib/legal/terms'
import { PRIVACY_SECTIONS, PRIVACY_EFFECTIVE_DATE } from '@/lib/legal/privacy'

interface UserAgreementModalProps {
  isOpen: boolean
  onAgree: () => Promise<void>
  isLoading?: boolean
}

type Tab = 'terms' | 'privacy'

export default function UserAgreementModal({
  isOpen,
  onAgree,
  isLoading = false,
}: UserAgreementModalProps) {
  const [hasChecked, setHasChecked] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('terms')

  const sections = activeTab === 'terms' ? TERMS_SECTIONS : PRIVACY_SECTIONS
  const effectiveDate = activeTab === 'terms' ? TERMS_EFFECTIVE_DATE : PRIVACY_EFFECTIVE_DATE

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="Welcome to Aggies Helping Aggies!" size="lg">
      <div className="flex flex-col gap-4 p-6">
        {/* Header */}
        <div className="mb-2">
          <h2 className="text-2xl font-bold text-foreground">Terms & Privacy Policy</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Please read and accept our Terms and Conditions and Privacy Policy before continuing.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'terms'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Terms & Conditions
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'privacy'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Privacy Policy
          </button>
        </div>

        {/* Scrollable Legal Text */}
        <div className="max-h-96 overflow-y-auto rounded-lg border border-border bg-muted/50 p-4 text-sm">
          <p className="mb-4 text-xs text-muted-foreground">Effective date: {effectiveDate}</p>
          <div className="space-y-5 text-foreground">
            {sections.map((section) => (
              <div key={section.heading}>
                <h3 className="font-semibold">{section.heading}</h3>
                <div className="mt-1 space-y-2 text-muted-foreground">
                  {section.content.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Acknowledgment Checkbox */}
        <label className="flex items-start gap-3 rounded border border-border p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasChecked}
            onChange={(e) => setHasChecked(e.target.checked)}
            className="mt-1 rounded border-primary"
            disabled={isLoading}
          />
          <span className="text-sm text-muted-foreground">
            I have read and agree to the Terms and Conditions and Privacy Policy of Aggies Helping Aggies, Inc.
          </span>
        </label>

        {/* Action Button */}
        <Button
          onClick={onAgree}
          disabled={!hasChecked || isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'Accepting...' : 'Accept & Continue'}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          You must accept to continue using Aggies Helping Aggies.{' '}
          <Link href="/terms" target="_blank" className="underline hover:text-foreground">
            Full Terms
          </Link>{' '}
          &amp;{' '}
          <Link href="/privacy-policy" target="_blank" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
        </p>
      </div>
    </Modal>
  )
}
