'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile, Post, AdminNote, UserRole, FlairType } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import PostDetailModal from '@/components/PostDetailModal'
import Image from 'next/image'
import { getInitials, getRoleBadgeColor } from '@/lib/utils'

interface UserProfilePanelProps {
  userId: string
  onClose?: () => void
}

type ProfileSection = 'posts' | 'comments' | 'admin-notes' | 'account-details'

type UserCommentItem = {
  id: string
  content: string
  created_at: string
  post?: {
    id: string
    title?: string
  }
}

type RawCommentItem = {
  id: string
  content: string
  created_at: string
  post: { id: string; title?: string }[] | { id: string; title?: string } | null
}

const SECTION_PAGE_SIZE = 5

const ACCOUNT_TYPE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'Personal', label: 'Personal' },
  { value: 'Business', label: 'Commercial' },
  { value: 'Charity', label: 'Charity' },
  { value: 'Admin', label: 'Admin' },
]

const FLAIR_OPTIONS: Array<{ value: FlairType; label: string }> = [
  { value: 'Student', label: 'Student' },
  { value: 'Former Student', label: 'Former Student' },
  { value: 'Parent', label: 'Parent' },
  { value: 'Faculty', label: 'Faculty' },
  { value: 'BCS Local', label: 'BCS Local' },
]

export default function UserProfilePanel({ userId, onClose }: UserProfilePanelProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<UserCommentItem[]>([])
  const [adminNote, setAdminNote] = useState<AdminNote | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole>('Personal')
  const [isUpdatingRole, setIsUpdatingRole] = useState(false)
  const [selectedFlair, setSelectedFlair] = useState<FlairType>('Student')
  const [isUpdatingFlair, setIsUpdatingFlair] = useState(false)
  const [activeSection, setActiveSection] = useState<ProfileSection>('posts')
  const [postsOffset, setPostsOffset] = useState(0)
  const [commentsOffset, setCommentsOffset] = useState(0)
  const [hasMorePosts, setHasMorePosts] = useState(false)
  const [hasMoreComments, setHasMoreComments] = useState(false)
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false)
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false)
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const { showToast, ToastContainer } = useToast()
  const router = useRouter()

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [userId])

  useEffect(() => {
    if (!isAdmin && (activeSection === 'admin-notes' || activeSection === 'account-details')) {
      setActiveSection('posts')
    }
  }, [isAdmin, activeSection])

  const fetchPostsPage = async ({ offset, append }: { offset: number; append: boolean }) => {
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select(`
        *,
        author:author_id(id, full_name, email, avatar_url, role),
        channel:channel_id(id, name, slug, color)
      `)
      .eq('author_id', userId)
      .eq('is_moderated', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + SECTION_PAGE_SIZE - 1)

    if (postsError) throw postsError

    let enrichedPosts = (postsData || []).map((post) => ({
      ...post,
      comment_count: 0,
      like_count: 0,
    }))

    if (enrichedPosts.length > 0) {
      const postIds = enrichedPosts.map((post) => post.id)

      const [{ data: commentCounts }, { data: likeCounts }] = await Promise.all([
        supabase.from('comments').select('post_id').in('post_id', postIds),
        supabase.from('post_likes').select('post_id').in('post_id', postIds),
      ])

      const commentCountMap = new Map<string, number>()
      const likeCountMap = new Map<string, number>()

      commentCounts?.forEach((comment) => {
        commentCountMap.set(comment.post_id, (commentCountMap.get(comment.post_id) || 0) + 1)
      })

      likeCounts?.forEach((like) => {
        likeCountMap.set(like.post_id, (likeCountMap.get(like.post_id) || 0) + 1)
      })

      enrichedPosts = enrichedPosts.map((post) => ({
        ...post,
        comment_count: commentCountMap.get(post.id) || 0,
        like_count: likeCountMap.get(post.id) || 0,
      }))
    }

    setPosts((prev) => (append ? [...prev, ...enrichedPosts] : enrichedPosts))
    setPostsOffset(offset + enrichedPosts.length)
    setHasMorePosts(enrichedPosts.length === SECTION_PAGE_SIZE)
  }

  const fetchCommentsPage = async ({ offset, append }: { offset: number; append: boolean }) => {
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        post:post_id(id, title)
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + SECTION_PAGE_SIZE - 1)

    if (commentsError) throw commentsError

    const nextComments: UserCommentItem[] = (commentsData || []).map((comment) => {
      const rawComment = comment as RawCommentItem
      const relatedPost = Array.isArray(rawComment.post)
        ? rawComment.post[0]
        : rawComment.post

      return {
        id: rawComment.id,
        content: rawComment.content,
        created_at: rawComment.created_at,
        post: relatedPost
          ? {
              id: relatedPost.id,
              title: relatedPost.title,
            }
          : undefined,
      }
    })
    setComments((prev) => (append ? [...prev, ...nextComments] : nextComments))
    setCommentsOffset(offset + nextComments.length)
    setHasMoreComments(nextComments.length === SECTION_PAGE_SIZE)
  }

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setCurrentUserId(currentUser?.id || null)

      let currentProfile = null

      // Check if current user is admin
      if (currentUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUser.id)
          .single()

        currentProfile = profileData

        setIsAdmin(profileData?.role === 'Admin')
      }

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)
      setSelectedRole(profileData.role)
      setSelectedFlair(profileData.flair)

      await Promise.all([
        fetchPostsPage({ offset: 0, append: false }),
        fetchCommentsPage({ offset: 0, append: false }),
      ])

      // Fetch single rolling admin note if user is admin
      if (currentUser && currentProfile?.role === 'Admin') {
        const response = await fetch(`/api/admin-notes/rolling?user_id=${encodeURIComponent(userId)}`)
        if (!response.ok) throw new Error('Failed to load admin note')

        const note = (await response.json()) as AdminNote | null
        setAdminNote(note)
        setNoteContent(note?.content || '')
      } else {
        setAdminNote(null)
        setNoteContent('')
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load user profile')
    } finally {
      setIsLoading(false)
    }
  }

  const loadMorePosts = async () => {
    if (isLoadingMorePosts || !hasMorePosts) return

    try {
      setIsLoadingMorePosts(true)
      await fetchPostsPage({ offset: postsOffset, append: true })
    } catch (err) {
      console.error('Error loading more posts:', err)
      showToast({
        message: err instanceof Error ? err.message : 'Failed to load more posts',
        type: 'error',
      })
    } finally {
      setIsLoadingMorePosts(false)
    }
  }

  const loadMoreComments = async () => {
    if (isLoadingMoreComments || !hasMoreComments) return

    try {
      setIsLoadingMoreComments(true)
      await fetchCommentsPage({ offset: commentsOffset, append: true })
    } catch (err) {
      console.error('Error loading more comments:', err)
      showToast({
        message: err instanceof Error ? err.message : 'Failed to load more comments',
        type: 'error',
      })
    } finally {
      setIsLoadingMoreComments(false)
    }
  }

  const handlePostsScroll = async (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget
    const remaining = element.scrollHeight - element.scrollTop - element.clientHeight

    if (remaining < 80) {
      await loadMorePosts()
    }
  }

  const handleCommentsScroll = async (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget
    const remaining = element.scrollHeight - element.scrollTop - element.clientHeight

    if (remaining < 80) {
      await loadMoreComments()
    }
  }

  const handleSaveNote = async () => {
    if (!noteContent.trim()) {
      showToast({
        message: 'Note cannot be empty',
        type: 'error',
      })
      return
    }

    try {
      setIsSavingNote(true)

      const response = await fetch('/api/admin-notes/rolling', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          content: noteContent.trim(),
        }),
      })

      if (!response.ok) throw new Error('Failed to save note')

      const savedNote = (await response.json()) as AdminNote
      setAdminNote(savedNote)
      setNoteContent(savedNote.content)

      showToast({
        message: 'Admin note saved successfully',
        type: 'success',
      })
    } catch (err) {
      console.error('Error saving note:', err)
      showToast({
        message: err instanceof Error ? err.message : 'Failed to save note',
        type: 'error',
      })
    } finally {
      setIsSavingNote(false)
    }
  }

  const handleRoleUpdate = async () => {
    if (!profile || selectedRole === profile.role) return

    try {
      setIsUpdatingRole(true)

      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole }),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result?.error || 'Failed to update account type')
      }

      setProfile((current) =>
        current ? { ...current, role: selectedRole } : current
      )

      if (currentUserId === userId) {
        router.refresh()
      }

      showToast({
        message: 'Account type updated successfully',
        type: 'success',
      })
    } catch (err) {
      console.error('Error updating account type:', err)
      showToast({
        message: err instanceof Error ? err.message : 'Failed to update account type',
        type: 'error',
      })
    } finally {
      setIsUpdatingRole(false)
    }
  }

  const handleFlairUpdate = async () => {
    if (!profile || selectedFlair === profile.flair) return

    try {
      setIsUpdatingFlair(true)

      const response = await fetch(`/api/admin/users/${userId}/flair`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flair: selectedFlair }),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result?.error || 'Failed to update flair')
      }

      setProfile((current) =>
        current ? { ...current, flair: selectedFlair } : current
      )

      showToast({
        message: 'Flair updated successfully',
        type: 'success',
      })
    } catch (err) {
      console.error('Error updating flair:', err)
      showToast({
        message: err instanceof Error ? err.message : 'Failed to update flair',
        type: 'error',
      })
    } finally {
      setIsUpdatingFlair(false)
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
