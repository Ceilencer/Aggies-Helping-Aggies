'use client'

import * as React from 'react'
import { UserRole, FlairType, UserBan } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import PostDetailModal from '@/components/PostDetailModal'
import Image from 'next/image'
import { getInitials, getRoleBadgeColor } from '@/lib/utils'
import { useUserProfilePanelState } from '@/lib/hooks/useUserProfilePanelState'

interface UserProfilePanelProps {
  userId: string
  onClose?: () => void
  onDeleted?: () => void
}

const ACCOUNT_TYPE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'Personal', label: 'Personal' },
  { value: 'Business', label: 'Commercial' },
  { value: 'Charity', label: 'Charity' },
  { value: 'Admin', label: 'Admin' },
]

const FLAIR_OPTIONS: Array<{ value: FlairType; label: string }> = [
  { value: 'Student', label: 'Student' },
  { value: 'Former Student', label: 'Former Student' },
  { value: 'Family Member', label: 'Family Member' },
  { value: 'Aggie Mom', label: 'Aggie Mom' },
  { value: 'Faculty', label: 'Faculty' },
  { value: 'BCS Local', label: 'BCS Local' },
]

export default function UserProfilePanel({ userId, onClose, onDeleted }: UserProfilePanelProps) {
  const { showToast, ToastContainer } = useToast()
  const {
    profile,
    posts,
    comments,
    adminNote,
    isLoading,
    isAdmin,
    error,
    noteContent,
    setNoteContent,
    isSavingNote,
    selectedRole,
    setSelectedRole,
    isUpdatingRole,
    selectedFlair,
    setSelectedFlair,
    isUpdatingFlair,
    isResettingLimits,
    activeSection,
    setActiveSection,
    isLoadingMorePosts,
    isLoadingMoreComments,
    activePostId,
    setActivePostId,
    fetchData,
    handlePostsScroll,
    handleCommentsScroll,
    handleSaveNote,
    handleRoleUpdate,
    handleFlairUpdate,
    handleResetPostLimits,
  } = useUserProfilePanelState({ userId, showToast })

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [showSuspensionForm, setShowSuspensionForm] = React.useState(false)
  const [suspensionType, setSuspensionType] = React.useState<'temporary' | 'permanent'>('temporary')
  const [suspensionHours, setSuspensionHours] = React.useState<string>('24')
  const [suspensionReason, setSuspensionReason] = React.useState('')
  const [isSuspending, setIsSuspending] = React.useState(false)
  const [activeBan, setActiveBan] = React.useState<UserBan | null>(null)
  const [isLoadingBan, setIsLoadingBan] = React.useState(false)
  const [isUnbanning, setIsUnbanning] = React.useState(false)

  React.useEffect(() => {
    const fetchActiveBan = async () => {
      setIsLoadingBan(true)
      try {
        const response = await fetch(`/api/admin/users/${userId}/ban`)
        if (response.ok) {
          const { data } = await response.json()
          setActiveBan(data || null)
        }
      } catch (error) {
        console.error('Failed to fetch ban info:', error)
      } finally {
        setIsLoadingBan(false)
      }
    }

    if (userId && isAdmin) {
      void fetchActiveBan()
    }
  }, [userId, isAdmin])

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || 'Failed to delete account')
      }
      onDeleted?.()
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : 'Failed to delete account',
        type: 'error',
      })
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleSuspendUser = async () => {
    if (!suspensionReason.trim()) {
      showToast({
        message: 'Please provide a reason for suspension',
        type: 'error',
      })
      return
    }

    if (suspensionType === 'temporary' && (!suspensionHours || parseInt(suspensionHours) <= 0)) {
      showToast({
        message: 'Please enter a valid number of hours',
        type: 'error',
      })
      return
    }

    setIsSuspending(true)
    try {
      const res = await fetch('/api/admin/users/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          banType: suspensionType,
          durationHours: suspensionType === 'temporary' ? parseInt(suspensionHours) : undefined,
          reason: suspensionReason.trim(),
        }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || 'Failed to suspend user')
      }
      showToast({
        message: `User ${suspensionType === 'temporary' ? `suspended for ${suspensionHours} hours` : 'permanently banned'}`,
        type: 'success',
      })
      setShowSuspensionForm(false)
      setSuspensionReason('')
      setSuspensionHours('24')
      setSuspensionType('temporary')
      fetchData()
      // Refresh ban status
      const banResponse = await fetch(`/api/admin/users/${userId}/ban`)
      if (banResponse.ok) {
        const { data } = await banResponse.json()
        setActiveBan(data || null)
      }
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : 'Failed to suspend user',
        type: 'error',
      })
    } finally {
      setIsSuspending(false)
    }
  }

  const handleUnsuspendUser = async () => {
    if (!activeBan) return
    
    setIsUnbanning(true)
    try {
      const res = await fetch('/api/admin/users/unsuspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, banId: activeBan.id }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || 'Failed to unsuspend user')
      }
      showToast({
        message: 'User unsuspended successfully',
        type: 'success',
      })
      setActiveBan(null)
      fetchData()
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : 'Failed to unsuspend user',
        type: 'error',
      })
    } finally {
      setIsUnbanning(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="p-6">
        <p className="text-red-600 text-sm">{error || 'Profile not found'}</p>
        <Button onClick={fetchData} className="mt-4" size="sm">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <>
      <ToastContainer />
      <div>
        {/* Profile Header */}
        <div className="px-6 pt-3 pb-4">
          <div className={isAdmin ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]' : 'grid gap-6'}>
            <div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 space-y-3">
                  {profile.avatar_url ? (
                    <div className="relative h-20 w-20 overflow-hidden rounded-full">
                      <Image
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-semibold">
                      {getInitials(profile.full_name)}
                    </div>
                  )}

                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground break-all">{profile.email}</p>
                    <p className="text-muted-foreground">{profile.major || 'Major not set'}</p>
                    <p className="text-muted-foreground">
                      {profile.graduation_year ? `Class of ${profile.graduation_year}` : 'Graduation year not set'}
                    </p>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-bold text-card-header-text mb-2">
                    {profile.full_name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-semibold ${getRoleBadgeColor(profile.role)}`}
                    >
                      {profile.role}
                    </span>
                    {profile.is_verified && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-700 dark:text-green-400 dark:bg-green-900/30 flex items-center gap-1">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Admin Note</h3>
                  {adminNote?.updated_at && (
                    <span className="text-xs text-muted-foreground">
                      Updated {new Date(adminNote.updated_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <p className="text-sm text-card-header-text whitespace-pre-wrap break-words">
                  {adminNote?.content || 'No admin note yet.'}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-b mt-6 pt-4 pb-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={activeSection === 'posts' ? 'default' : 'outline'}
                onClick={() => setActiveSection('posts')}
              >
                Posts ({posts.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeSection === 'comments' ? 'default' : 'outline'}
                onClick={() => setActiveSection('comments')}
              >
                Comments ({comments.length})
              </Button>
              {isAdmin && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant={activeSection === 'admin-notes' ? 'default' : 'outline'}
                    onClick={() => setActiveSection('admin-notes')}
                  >
                    Admin Notes
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={activeSection === 'account-details' ? 'default' : 'outline'}
                    onClick={() => setActiveSection('account-details')}
                  >
                    Account Details
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Account Details Section */}
        {isAdmin && activeSection === 'account-details' && (
          <div className="p-6 border-b">
            <h3 className="font-semibold mb-4">Account Details</h3>
            <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
              <div className="rounded-lg border bg-muted/30 p-4">
                <h4 className="text-sm font-semibold">Profile Summary</h4>
                <dl className="mt-3 space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="font-medium text-right">{profile.full_name}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="font-medium text-right break-all">{profile.email}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Verified</dt>
                    <dd className="font-medium text-right">{profile.is_verified ? 'Yes' : 'No'}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Current Account Type</dt>
                    <dd className="font-medium text-right">{profile.role}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Current Flair</dt>
                    <dd className="font-medium text-right">{profile.flair}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Posts Approved</dt>
                    <dd className="font-medium text-right text-green-700 dark:text-green-400">{profile.posts_approved ?? 0}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Posts Denied</dt>
                    <dd className="font-medium text-right text-red-600 dark:text-red-400">{profile.posts_denied ?? 0}</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="account-type-panel" className="text-sm">Account Type</Label>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                      <select
                        id="account-type-panel"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        disabled={isUpdatingRole}
                      >
                        {ACCOUNT_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        size="sm"
                        className="min-w-[72px]"
                        onClick={handleRoleUpdate}
                        disabled={isUpdatingRole || selectedRole === profile.role}
                      >
                        {isUpdatingRole ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="flair-panel" className="text-sm">Flair Tag</Label>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                      <select
                        id="flair-panel"
                        value={selectedFlair}
                        onChange={(e) => setSelectedFlair(e.target.value as FlairType)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        disabled={isUpdatingFlair}
                      >
                        {FLAIR_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        size="sm"
                        className="min-w-[72px]"
                        onClick={handleFlairUpdate}
                        disabled={isUpdatingFlair || selectedFlair === profile.flair}
                      >
                        {isUpdatingFlair ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reset Posting Limits */}
            <div className="mt-6 rounded-lg border bg-muted/30 p-4">
              <h4 className="text-sm font-semibold mb-1">Posting Limits</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Reset this user&apos;s daily and monthly post counters to zero immediately.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void handleResetPostLimits()}
                disabled={isResettingLimits}
              >
                {isResettingLimits ? 'Resetting...' : 'Reset Posting Limits'}
              </Button>
            </div>

            {/* Suspension Status */}
            {!isLoadingBan && activeBan && (
              <div className="mt-6 rounded-lg border border-orange-200 dark:border-orange-900/40 bg-orange-50/50 dark:bg-orange-950/20 p-4">
                <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-2">Suspension Status</h4>
                <dl className="space-y-2 text-sm mb-3">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Type:</dt>
                    <dd className="font-medium capitalize">{activeBan.ban_type}</dd>
                  </div>
                  {activeBan.ban_type === 'temporary' && activeBan.expires_at && (
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-muted-foreground">Expires:</dt>
                      <dd className="font-medium">{new Date(activeBan.expires_at).toLocaleString()}</dd>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Reason:</dt>
                    <dd className="font-medium text-right">{activeBan.reason}</dd>
                  </div>
                </dl>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleUnsuspendUser}
                  disabled={isUnbanning}
                  className="w-full"
                >
                  {isUnbanning ? 'Unsuspending...' : 'Unsuspend User'}
                </Button>
              </div>
            )}

            {/* Danger Zone */}
            <div className="mt-6 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-4">
              <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Danger Zone</h4>

              {/* Suspension/Ban Section */}
              <div className="mb-4 pb-4 border-b border-red-200 dark:border-red-900/40">
                {showSuspensionForm ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Suspend or ban this user. They will be restricted from accessing the dashboard.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="suspension-type" className="text-sm">Action Type</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="suspension-type"
                            value="temporary"
                            checked={suspensionType === 'temporary'}
                            onChange={(e) => setSuspensionType(e.target.value as 'temporary' | 'permanent')}
                            className="rounded"
                          />
                          <span>Temporary Suspension</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="suspension-type"
                            value="permanent"
                            checked={suspensionType === 'permanent'}
                            onChange={(e) => setSuspensionType(e.target.value as 'temporary' | 'permanent')}
                            className="rounded"
                          />
                          <span>Permanent Ban</span>
                        </label>
                      </div>
                    </div>

                    {suspensionType === 'temporary' && (
                      <div className="space-y-2">
                        <Label htmlFor="suspension-hours" className="text-sm">Duration (hours)</Label>
                        <input
                          id="suspension-hours"
                          type="number"
                          min="1"
                          value={suspensionHours}
                          onChange={(e) => setSuspensionHours(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          placeholder="e.g., 24"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="suspension-reason" className="text-sm">Reason</Label>
                      <textarea
                        id="suspension-reason"
                        value={suspensionReason}
                        onChange={(e) => setSuspensionReason(e.target.value)}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="Enter reason for suspension/ban..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={handleSuspendUser}
                        disabled={isSuspending}
                      >
                        {isSuspending ? 'Processing...' : `${suspensionType === 'temporary' ? 'Suspend' : 'Ban'} User`}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowSuspensionForm(false)
                          setSuspensionReason('')
                          setSuspensionHours('24')
                          setSuspensionType('temporary')
                        }}
                        disabled={isSuspending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground mb-3">
                      Temporarily suspend or permanently ban this user from accessing the dashboard.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      variant="outline"
                      onClick={() => setShowSuspensionForm(true)}
                    >
                      Suspend or Ban User
                    </Button>
                  </div>
                )}
              </div>

              {/* Delete Account Section */}
              <p className="text-xs text-muted-foreground mb-3">
                Permanently delete this account and all associated data. This cannot be undone.
              </p>
              {showDeleteConfirm ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    Delete <span className="font-bold">{profile.full_name}</span>&apos;s account permanently?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, delete account'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Account
                </Button>
              )}
            </div>
          </div>
        )}

        {/* User Comments Section */}
        {activeSection === 'comments' && (
          <div className="p-6 border-b">
            <h3 className="font-semibold mb-4">
              Comments by {profile.full_name} ({comments.length})
            </h3>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1" onScroll={handleCommentsScroll}>
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No comments yet
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="p-3 border rounded space-y-2">
                    <p className="text-sm text-card-header-text">{comment.content}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                      {comment.post?.id ? (
                        <button
                          type="button"
                          onClick={() => setActivePostId(comment.post!.id)}
                          className="hover:underline"
                        >
                          {comment.post.title || 'View post'}
                        </button>
                      ) : (
                        <span>Post unavailable</span>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isLoadingMoreComments && (
                <p className="text-xs text-muted-foreground text-center py-2">Loading more comments...</p>
              )}
            </div>
          </div>
        )}

        {/* Admin Notes Section */}
        {isAdmin && activeSection === 'admin-notes' && (
          <div className="p-6 border-b">
            <h3 className="font-semibold mb-4">Admin Notes</h3>
            {!isAdmin ? (
              <p className="text-sm text-muted-foreground">Only admins can edit notes.</p>
            ) : (
              <div className="space-y-3 max-w-2xl">
                <Label htmlFor="rolling-note" className="text-sm">Rolling Note</Label>
                <Textarea
                  id="rolling-note"
                  placeholder="Enter admin note..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="min-h-[140px] text-sm"
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    One note per profile. Any admin can edit this note.
                  </p>
                  <Button
                    onClick={handleSaveNote}
                    disabled={isSavingNote || !noteContent.trim()}
                    size="sm"
                  >
                    {isSavingNote ? 'Saving...' : 'Save Note'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Posts Section */}
        {activeSection === 'posts' && (
        <div className="px-6 pt-1 pb-6">
          <h3 className="font-semibold mb-4">
            Posts by {profile.full_name} ({posts.length})
          </h3>
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1" onScroll={handlePostsScroll}>
            {posts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No posts yet
              </p>
            ) : (
              posts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => setActivePostId(post.id)}
                  className="block w-full text-left"
                >
                  <div className="p-3 border rounded hover:bg-muted transition-colors cursor-pointer">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm text-card-header-text flex-1 line-clamp-1">
                          {post.title}
                        </h4>
                        <span
                          className="text-xs px-2 py-1 rounded text-white flex-shrink-0 whitespace-nowrap"
                          style={{
                            backgroundColor:
                              post.channel?.color || '#500000',
                          }}
                        >
                          {post.channel?.name}
                        </span>
                      </div>
                      <p className="text-xs text-card-subtext line-clamp-2 break-words [overflow-wrap:anywhere]">
                        {post.content}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex gap-3">
                          <span>💬 {post.comment_count || 0}</span>
                          <span>❤️ {post.like_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
            {isLoadingMorePosts && (
              <p className="text-xs text-muted-foreground text-center py-2">Loading more posts...</p>
            )}
          </div>
        </div>
        )}
      </div>

      <PostDetailModal
        isOpen={!!activePostId}
        postId={activePostId}
        onClose={() => setActivePostId(null)}
      />
    </>
  )
}
