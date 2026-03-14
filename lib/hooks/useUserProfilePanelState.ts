import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AdminNote, FlairType, Post, Profile, UserRole } from '@/lib/types'

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

type UseUserProfilePanelStateArgs = {
  userId: string
  showToast: (options: { message: string; type: 'success' | 'error' | 'info' }) => void
}

export function useUserProfilePanelState({ userId, showToast }: UseUserProfilePanelStateArgs) {
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
  const [isResettingLimits, setIsResettingLimits] = useState(false)
  const [activeSection, setActiveSection] = useState<ProfileSection>('posts')
  const [postsOffset, setPostsOffset] = useState(0)
  const [commentsOffset, setCommentsOffset] = useState(0)
  const [hasMorePosts, setHasMorePosts] = useState(false)
  const [hasMoreComments, setHasMoreComments] = useState(false)
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false)
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false)
  const [activePostId, setActivePostId] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    void fetchData()
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

      if (currentUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUser.id)
          .single()

        currentProfile = profileData

        setIsAdmin(profileData?.role === 'Admin')
      }

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

  const handleResetPostLimits = async () => {
    try {
      setIsResettingLimits(true)

      const response = await fetch(`/api/admin/users/${userId}/reset-post-limits`, {
        method: 'POST',
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result?.error || 'Failed to reset posting limits')
      }

      showToast({
        message: 'Posting limits reset successfully',
        type: 'success',
      })
    } catch (err) {
      console.error('Error resetting posting limits:', err)
      showToast({
        message: err instanceof Error ? err.message : 'Failed to reset posting limits',
        type: 'error',
      })
    } finally {
      setIsResettingLimits(false)
    }
  }

  return {
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
  }
}