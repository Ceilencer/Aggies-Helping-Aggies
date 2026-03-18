'use client'

import dynamic from 'next/dynamic'
import type { LegalSection } from '@/lib/legal/terms'

const LegalModal = dynamic(() => import('@/components/LegalModal'), { ssr: false })

interface Props {
  title: string
  effectiveDate: string
  sections: LegalSection[]
}

export default function LegalModalClient(props: Props) {
  return <LegalModal {...props} />
}
