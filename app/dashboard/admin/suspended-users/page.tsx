'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import UserProfileModal from '@/components/UserProfileModal'
import type { UserBan } from '@/lib/types'

interface SuspendedUserWithProfile extends UserBan {
  profile?: {
    id: string
    full_name: string
    email: string
    role: string
  }
}

export default function SuspendedUsersPage() {
  const supabase = createClient()
  const [suspendedUsers, setSuspendedUsers] = useState<SuspendedUserWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'temporary' | 'permanent'>('all')

  useEffect(() => {
    fetchSuspendedUsers()
  }, [])

  const fetchSuspendedUsers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('user_bans')
        .select(`
          *,
          profile:user_id(id, full_name, email, role)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      setSuspendedUsers(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suspended users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserDeleted = (deletedId: string) => {
    setSuspendedUsers(prev => prev.filter(u => u.user_id !== deletedId))
    setSelectedUserId(null)
  }

  const filteredUsers = suspendedUsers.filter(ban => {
    if (filterType === 'all') return true
    return ban.ban_type === filterType
  })

  const isExpired = (ban: UserBan) => {
    if (ban.ban_type === 'permanent') return false
    if (!ban.expires_at) return false
    return new Date(ban.expires_at) <= new Date()
  }

  const formatExpiration = (expiresAt: string | null) => {
    if (!expiresAt) return 'N/A'
    const expireDate = new Date(expiresAt)
    const now = new Date()
    const diffMs = expireDate.getTime() - now.getTime()
    
    if (diffMs <= 0) return 'Expired'
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`
    }
    return `${minutes}m remaining`
  }

  return (
    <>
      <UserProfileModal
        isOpen={selectedUserId !== null}
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onDeleted={() => handleUserDeleted(selectedUserId!)}
      />

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Suspended & Banned Users</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View all users currently suspended or permanently banned
          </p>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <Button onClick={fetchSuspendedUsers} className="mt-3" size="sm">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Filter Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={filterType === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterType('all')}
              >
                All ({suspendedUsers.length})
              </Button>
              <Button
                size="sm"
                variant={filterType === 'temporary' ? 'default' : 'outline'}
                onClick={() => setFilterType('temporary')}
              >
                Temporary ({suspendedUsers.filter(b => b.ban_type === 'temporary').length})
              </Button>
              <Button
                size="sm"
                variant={filterType === 'permanent' ? 'default' : 'outline'}
                onClick={() => setFilterType('permanent')}
              >
                Permanent ({suspendedUsers.filter(b => b.ban_type === 'permanent').length})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Suspended Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {filterType === 'all' ? 'All Suspensions' : `${filterType.charAt(0).toUpperCase() + filterType.slice(1)} Suspensions`}
            </CardTitle>
            <CardDescription>
              {isLoading ? 'Loading...' : `${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-muted-foreground">Loading suspended users...</p>
                </div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No {filterType === 'all' ? 'suspended users' : `${filterType} suspensions`} found.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((ban) => {
                  const profile = ban.profile?.[0] || ban.profile
                  const expired = isExpired(ban)
                  return (
                    <div
                      key={ban.id}
                      className={`rounded-lg border p-4 ${
                        expired ? 'bg-gray-50 dark:bg-gray-900/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">
                              {profile?.full_name || 'Unknown User'}
                            </p>
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap ${
                                ban.ban_type === 'temporary'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              }`}
                            >
                              {ban.ban_type === 'temporary' ? 'Temporary' : 'Permanent'}
                            </span>
                            {expired && (
                              <span className="text-xs px-2 py-1 rounded-full font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 whitespace-nowrap">
                                Expired
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {profile?.email || 'No email'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            <span className="font-medium">Reason:</span> {ban.reason}
                          </p>
                          {ban.ban_type === 'temporary' && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">Expires:</span> {formatExpiration(ban.expires_at)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium">Banned:</span> {new Date(ban.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUserId(ban.user_id)}
                          className="flex-shrink-0"
                        >
                          View Profile
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
