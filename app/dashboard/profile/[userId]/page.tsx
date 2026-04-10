import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PublicProfileView from '@/components/PublicProfileView'
import type { ContactVisibility } from '@/lib/types'

interface Props {
  params: Promise<{ userId: string }>
}

const CONTACT_KEYS = [
  { key: 'contact_email',    visKey: 'contact_email_visibility' },
  { key: 'phone_number',     visKey: 'phone_number_visibility' },
  { key: 'instagram_handle', visKey: 'instagram_visibility' },
  { key: 'discord_username', visKey: 'discord_visibility' },
  { key: 'facebook_url',     visKey: 'facebook_visibility' },
  { key: 'linkedin_url',     visKey: 'linkedin_visibility' },
  { key: 'twitter_handle',   visKey: 'twitter_visibility' },
  { key: 'website_url',      visKey: 'website_visibility' },
] as const

export default async function PublicProfilePage({ params }: Props) {
  const { userId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (userId === user.id) redirect('/dashboard/profile')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !profile) notFound()

  // Strip private contact fields server-side so they never reach the client
  for (const { key, visKey } of CONTACT_KEYS) {
    const vis = ((profile as Record<string, unknown>)[visKey] as ContactVisibility) ?? 'private'
    if (vis !== 'public') {
      ;(profile as Record<string, unknown>)[key] = null
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <PublicProfileView profile={profile} />
    </div>
  )
}
