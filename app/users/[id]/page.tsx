'use client'

import { use } from 'react'
import UserProfilePanel from '@/components/UserProfilePanel'

interface UserProfilePageProps {
  params: Promise<{ id: string }>
}

export default function UserProfilePage({ params }: UserProfilePageProps) {
  const { id } = use(params)

  return <UserProfilePanel userId={id} />
}
