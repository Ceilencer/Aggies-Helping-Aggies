'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface BanInfo {
  is_banned: boolean
  ban_type?: string
  reason?: string
  expires_at?: string
}

export default function BannedPage() {
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchBanInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          // Not authenticated, redirect to home
          window.location.href = '/'
          return
        }

        const res = await fetch(`/api/admin/user-bans/check/${user.id}`)
        if (res.ok) {
          const data = await res.json()
          setBanInfo(data)
          
          // If not banned, redirect to dashboard
          if (!data.is_banned) {
            window.location.href = '/dashboard'
            return
          }
        }
      } catch (error) {
        console.error('Error fetching ban info:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBanInfo()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-destructive border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const expiresAt = banInfo?.expires_at ? new Date(banInfo.expires_at) : null
  const isTemporary = banInfo?.ban_type === 'temporary'
  const isPermanent = banInfo?.ban_type === 'permanent'

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md px-4">
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-4xl">🚫</div>
              <div>
                <CardTitle className="text-destructive">Account Suspended</CardTitle>
              </div>
            </div>
            <CardDescription>
              {isPermanent
                ? 'Your account has been permanently banned'
                : isTemporary
                  ? 'Your account has been temporarily suspended'
                  : 'Your account has been suspended'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {banInfo?.reason && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Reason for Suspension:</p>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  {banInfo.reason}
                </p>
              </div>
            )}

            {isTemporary && expiresAt && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Suspension Expires:</p>
                <p className="text-sm text-muted-foreground">
                  {expiresAt.toLocaleDateString()} at {expiresAt.toLocaleTimeString()}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Once the suspension expires, you'll be able to use the platform again.
                </p>
              </div>
            )}

            {isPermanent && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  This ban is permanent and cannot be appealed.
                </p>
              </div>
            )}

            <div className="space-y-2 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                If you believe this is a mistake or would like to appeal, please contact the Howdy Helps support team.
              </p>
            </div>

            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
