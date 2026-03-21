import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Profile, ContactVisibility } from '@/lib/types'

interface PublicProfileViewProps {
  profile: Profile
}

const CONTACT_FIELDS = [
  { key: 'contact_email',    visKey: 'contact_email_visibility',  label: 'Email' },
  { key: 'phone_number',     visKey: 'phone_number_visibility',   label: 'Phone' },
  { key: 'instagram_handle', visKey: 'instagram_visibility',      label: 'Instagram' },
  { key: 'discord_username', visKey: 'discord_visibility',        label: 'Discord' },
  { key: 'facebook_url',     visKey: 'facebook_visibility',       label: 'Facebook' },
  { key: 'linkedin_url',     visKey: 'linkedin_visibility',       label: 'LinkedIn' },
  { key: 'twitter_handle',   visKey: 'twitter_visibility',        label: 'X / Twitter' },
  { key: 'website_url',      visKey: 'website_visibility',        label: 'Website' },
] as const

function getRoleBadgeColor(role: string) {
  const colors: Record<string, string> = {
    Personal: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 dark:bg-blue-900/30',
    Business:  'bg-purple-500/20 text-purple-700 dark:text-purple-400 dark:bg-purple-900/30',
    Charity:   'bg-green-500/20 text-green-700 dark:text-green-400 dark:bg-green-900/30',
    Admin:     'bg-red-500/20 text-red-700 dark:text-red-400 dark:bg-red-900/30',
  }
  return colors[role] ?? 'bg-gray-500/20 text-gray-700 dark:text-gray-400 dark:bg-gray-800/30'
}

export default function PublicProfileView({ profile }: PublicProfileViewProps) {
  const visibleFields = CONTACT_FIELDS.filter(({ key, visKey }) => {
    if (!profile[key]) return false
    const vis: ContactVisibility = (profile[visKey] as ContactVisibility) ?? 'on_request'
    return vis === 'public'
  })

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{profile.full_name}</CardTitle>
            {(profile.major || profile.graduation_year) && (
              <p className="text-sm text-muted-foreground mt-1">
                {[profile.major, profile.graduation_year].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <span className={cn('px-3 py-1 rounded-full text-xs font-semibold', getRoleBadgeColor(profile.role))}>
              {profile.role}
            </span>
            {profile.flair && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                {profile.flair}
              </span>
            )}
            {profile.is_verified && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-700 dark:text-green-400 flex items-center gap-1">
                ✓ Verified
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {visibleFields.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Contact Information</p>
            <div className="space-y-2">
              {visibleFields.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
                  <span className="font-medium break-all">{String(profile[key])}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Member since {new Date(profile.created_at).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
