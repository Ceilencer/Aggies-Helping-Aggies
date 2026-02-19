'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { UserBan, Profile } from '@/lib/types'

interface UserBanManagerProps {
  userId?: string
  onClose?: () => void
}

export default function UserBanManager({ userId, onClose }: UserBanManagerProps) {
  const [bans, setBans] = useState<(UserBan & { user?: Profile })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Form state
  const [targetUserId, setTargetUserId] = useState(userId || '')
  const [banType, setBanType] = useState<'permanent' | 'temporary'>('temporary')
  const [durationDays, setDurationDays] = useState('7')
  const [reason, setReason] = useState('')
  const [creatingBan, setCreatingBan] = useState(false)

  useEffect(() => {
    loadBans()
  }, [userId])

  const loadBans = async () => {
    try {
      setLoading(true)
      setError('')

      let url = '/api/admin/user-bans'
      if (userId) {
        url += `?user_id=${userId}`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load bans')

      const data = await res.json()
      setBans(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading bans')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBan = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!targetUserId) {
      setError('Please enter a user ID')
      return
    }

    if (!reason.trim()) {
      setError('Please enter a reason for the ban')
      return
    }

    if (banType === 'temporary' && (!durationDays || parseInt(durationDays) <= 0)) {
      setError('Please enter a valid number of days for temporary ban')
      return
    }

    try {
      setCreatingBan(true)

      const res = await fetch('/api/admin/user-bans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: targetUserId,
          ban_type: banType,
          duration_days: banType === 'temporary' ? parseInt(durationDays) : undefined,
          reason: reason.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create ban')
      }

      setSuccess(
        banType === 'permanent'
          ? 'User has been permanently banned'
          : `User has been banned for ${durationDays} days`
      )

      // Reset form
      setTargetUserId(userId || '')
      setBanType('temporary')
      setDurationDays('7')
      setReason('')
      setShowCreateForm(false)

      // Reload bans
      await loadBans()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating ban')
    } finally {
      setCreatingBan(false)
    }
  }

  const handleLiftBan = async (banId: string) => {
    try {
      setError('')
      const res = await fetch(`/api/admin/user-bans/${banId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      })

      if (!res.ok) throw new Error('Failed to lift ban')

      setSuccess('Ban has been lifted')
      await loadBans()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error lifting ban')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">User Ban Manager</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Create temporary timeouts or permanent bans for users
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Create Ban Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {showCreateForm ? 'Create Ban' : 'Create New Ban'}
          </CardTitle>
          <CardDescription>
            {showCreateForm
              ? 'Enter user ID and ban details'
              : 'Click to ban or timeout a user'}
          </CardDescription>
        </CardHeader>
        {showCreateForm && (
          <CardContent>
            <form onSubmit={handleCreateBan} className="space-y-4">
              <div>
                <Label htmlFor="user-id">User ID</Label>
                <Input
                  id="user-id"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="Enter user ID"
                  disabled={!!userId || creatingBan}
                />
              </div>

              <div>
                <Label htmlFor="ban-type">Ban Type</Label>
                <select
                  id="ban-type"
                  value={banType}
                  onChange={(e) => setBanType(e.target.value as 'permanent' | 'temporary')}
                  disabled={creatingBan}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="temporary">Temporary (Timeout)</option>
                  <option value="permanent">Permanent Ban</option>
                </select>
              </div>

              {banType === 'temporary' && (
                <div>
                  <Label htmlFor="duration">Duration (Days)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    placeholder="Number of days"
                    disabled={creatingBan}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="reason">Reason for Ban</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for ban (visible to user)"
                  disabled={creatingBan}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={creatingBan}
                  className="flex-1"
                >
                  {creatingBan ? 'Creating ban...' : 'Create Ban'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  disabled={creatingBan}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        )}
        {!showCreateForm && (
          <CardContent>
            <Button onClick={() => setShowCreateForm(true)} className="w-full">
              + Create New Ban
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Active Bans List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {userId ? `Bans for User` : 'Active Bans'}
          </CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `Found ${bans.filter((b) => b.is_active).length} active ban(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground">Loading bans...</p>
          ) : bans.filter((b) => b.is_active).length === 0 ? (
            <p className="text-center text-muted-foreground">No active bans</p>
          ) : (
            <div className="space-y-3">
              {bans
                .filter((b) => b.is_active)
                .map((ban) => (
                  <div key={ban.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold">
                          {ban.user?.full_name || ban.user_id}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {ban.user?.email}
                        </p>
                        <p className="text-sm mt-2">{ban.reason}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                          <span>
                            Type:{' '}
                            <span className="font-medium">
                              {ban.ban_type === 'permanent' ? 'Permanent' : 'Temporary'}
                            </span>
                          </span>
                          {ban.ban_type === 'temporary' && ban.expires_at && (
                            <span>
                              Expires:{' '}
                              <span className="font-medium">
                                {new Date(ban.expires_at).toLocaleDateString()}
                              </span>
                            </span>
                          )}
                          <span>
                            Created:{' '}
                            <span className="font-medium">
                              {new Date(ban.created_at).toLocaleDateString()}
                            </span>
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleLiftBan(ban.id)}
                      >
                        Lift Ban
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {onClose && (
        <Button variant="outline" onClick={onClose} className="w-full">
          Close
        </Button>
      )}
    </div>
  )
}
