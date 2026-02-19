'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Post, AdminNote } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import Image from 'next/image'
import Link from 'next/link'
import { getInitials, getRoleBadgeColor } from '@/lib/utils'

interface UserProfilePanelProps {
  userId: string
  onClose?: () => void
}

export default function UserProfilePanel({ userId, onClose }: UserProfilePanelProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [adminNotes, setAdminNotes] = useState<AdminNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [isSubmittingNote, setIsSubmittingNote] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteContent, setEditingNoteContent] = useState('')
  const { showToast, ToastContainer } = useToast()

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [userId])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data: { user: currentUser } } = await supabase.auth.getUser()

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

      // Fetch user posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          author:author_id(id, full_name, email, avatar_url, role),
          channel:channel_id(id, name, slug, color)
        `)
        .eq('author_id', userId)
        .order('created_at', { ascending: false })

      if (postsError) throw postsError
      
      // Fetch likes and comments counts separately for each post
      let enrichedPosts = (postsData || []).map(post => ({
        ...post,
        comment_count: 0,
        like_count: 0,
      }))
      
      // Batch fetch counts for all posts
      if (enrichedPosts.length > 0) {
        const postIds = enrichedPosts.map(p => p.id)
        
        // Get comment counts
        const { data: commentCounts } = await supabase
          .from('comments')
          .select('post_id')
        
        // Get like counts
        const { data: likeCounts } = await supabase
          .from('post_likes')
          .select('post_id')
        
        // Count by post_id
        const commentCountMap = new Map<string, number>()
        const likeCountMap = new Map<string, number>()
        
        commentCounts?.forEach(c => {
          if (postIds.includes(c.post_id)) {
            commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) || 0) + 1)
          }
        })
        
        likeCounts?.forEach(l => {
          if (postIds.includes(l.post_id)) {
            likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) || 0) + 1)
          }
        })
        
        enrichedPosts = enrichedPosts.map(post => ({
          ...post,
          comment_count: commentCountMap.get(post.id) || 0,
          like_count: likeCountMap.get(post.id) || 0,
        }))
      }
      
      setPosts(enrichedPosts)

      // Fetch admin notes if user is admin
      if (currentUser && currentProfile?.role === 'Admin') {
        const { data: notesData, error: notesError } = await supabase
          .from('admin_notes')
          .select(`
            *,
            creator:created_by(id, full_name, avatar_url)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (notesError) throw notesError
        setAdminNotes(notesData || [])
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load user profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!noteContent.trim()) {
      showToast({
        message: 'Note cannot be empty',
        type: 'error',
      })
      return
    }

    try {
      setIsSubmittingNote(true)

      const response = await fetch('/api/admin-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          content: noteContent,
        }),
      })

      if (!response.ok) throw new Error('Failed to create note')

      const newNote = await response.json()
      setAdminNotes([newNote, ...adminNotes])
      setNoteContent('')

      showToast({
        message: 'Note added successfully',
        type: 'success',
      })
    } catch (err) {
      console.error('Error adding note:', err)
      showToast({
        message: err instanceof Error ? err.message : 'Failed to add note',
        type: 'error',
      })
    } finally {
      setIsSubmittingNote(false)
    }
  }

  const handleUpdateNote = async (noteId: string) => {
    if (!editingNoteContent.trim()) {
      showToast({
        message: 'Note cannot be empty',
        type: 'error',
      })
      return
    }

    try {
      const response = await fetch(`/api/admin-notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editingNoteContent,
        }),
      })

      if (!response.ok) throw new Error('Failed to update note')

      const updatedNote = await response.json()
      setAdminNotes(
        adminNotes.map((note) => (note.id === noteId ? updatedNote : note))
      )
      setEditingNoteId(null)
      setEditingNoteContent('')

      showToast({
        message: 'Note updated successfully',
        type: 'success',
      })
    } catch (err) {
      console.error('Error updating note:', err)
      showToast({
        message: err instanceof Error ? err.message : 'Failed to update note',
        type: 'error',
      })
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const response = await fetch(`/api/admin-notes/${noteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete note')

      setAdminNotes(adminNotes.filter((note) => note.id !== noteId))

      showToast({
        message: 'Note deleted successfully',
        type: 'success',
      })
    } catch (err) {
      console.error('Error deleting note:', err)
      showToast({
        message: err instanceof Error ? err.message : 'Failed to delete note',
        type: 'error',
      })
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
        <div className="p-6 border-b">
          <div className="flex items-start gap-6 mb-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
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
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-card-header-text mb-2">
                {profile.full_name}
              </h2>
              <div className="flex items-center gap-2 mb-4">
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

              {/* Contact Info */}
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">{profile.email}</p>
                {profile.major && <p className="text-muted-foreground">{profile.major}</p>}
                {profile.graduation_year && (
                  <p className="text-muted-foreground">Class of {profile.graduation_year}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Admin Notes Section */}
        {isAdmin && (
          <div className="p-6 border-b">
            <h3 className="font-semibold mb-4">Admin Notes</h3>
            <div className="space-y-4">
              {/* Add Note Form */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                <Label htmlFor="note-content" className="text-sm">Add a Note</Label>
                <Textarea
                  id="note-content"
                  placeholder="Enter your note here..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="min-h-[80px] text-sm"
                />
                <Button
                  onClick={handleAddNote}
                  disabled={isSubmittingNote || !noteContent.trim()}
                  size="sm"
                  className="w-full"
                >
                  {isSubmittingNote ? 'Adding...' : 'Add Note'}
                </Button>
              </div>

              {/* Notes List */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {adminNotes.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No notes yet
                  </p>
                ) : (
                  adminNotes.map((note) => (
                    <div key={note.id} className="p-3 border rounded text-sm space-y-2">
                      {editingNoteId === note.id ? (
                        <>
                          <Textarea
                            value={editingNoteContent}
                            onChange={(e) =>
                              setEditingNoteContent(e.target.value)
                            }
                            className="min-h-[80px] text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() =>
                                handleUpdateNote(note.id)
                              }
                              size="xs"
                              className="flex-1"
                            >
                              Save
                            </Button>
                            <Button
                              onClick={() => setEditingNoteId(null)}
                              size="xs"
                              variant="outline"
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-xs">
                              {note.creator?.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(note.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-xs text-card-header-text">
                            {note.content}
                          </p>
                          <div className="flex gap-2 pt-2">
                            <Button
                              onClick={() => {
                                setEditingNoteId(note.id)
                                setEditingNoteContent(note.content)
                              }}
                              size="xs"
                              variant="outline"
                            >
                              Edit
                            </Button>
                            <Button
                              onClick={() => handleDeleteNote(note.id)}
                              size="xs"
                              variant="secondary"
                              className="text-red-600 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* User Posts Section */}
        <div className="p-6">
          <h3 className="font-semibold mb-4">
            Posts by {profile.full_name} ({posts.length})
          </h3>
          <div className="space-y-3">
            {posts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No posts yet
              </p>
            ) : (
              posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/dashboard/posts/${post.id}`}
                  className="block"
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
                      <p className="text-xs text-card-subtext line-clamp-2">
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
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}
