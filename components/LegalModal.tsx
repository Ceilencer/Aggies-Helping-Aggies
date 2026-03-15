'use client'

import * as Dialog from '@radix-ui/react-dialog'
import type { LegalSection } from '@/lib/legal/terms'

interface Props {
  title: string
  effectiveDate: string
  sections: LegalSection[]
}

export default function LegalModal({ title, effectiveDate, sections }: Props) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="underline hover:opacity-80">
        {title}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-4 bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl bg-background border rounded-lg shadow-xl z-50 flex flex-col outline-none">
          <div className="flex items-start justify-between px-6 py-4 border-b shrink-0">
            <div>
              <Dialog.Title className="text-lg font-bold text-foreground">{title}</Dialog.Title>
              <p className="text-xs text-muted-foreground mt-0.5">Effective date: {effectiveDate}</p>
            </div>
            <Dialog.Close className="text-muted-foreground hover:text-foreground transition-colors ml-4 mt-0.5 text-lg leading-none">
              ✕
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
            {sections.map((section) => (
              <div key={section.heading}>
                <h3 className="font-semibold text-foreground mb-1">{section.heading}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{section.content}</p>
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
