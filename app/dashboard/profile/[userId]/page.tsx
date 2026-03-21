import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PublicProfileView from '@/components/PublicProfileView'

interface Props {
  params: Promise<{ userId: string }>
}

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

  return (
    <div className="container mx-auto py-8 px-4">
      <PublicProfileView profile={profile} />
    </div>
  )
}
