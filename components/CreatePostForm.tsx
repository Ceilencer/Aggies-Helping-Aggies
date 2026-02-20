'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useImageUpload } from '@/lib/hooks/useImageUpload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { ImageUploadInput } from '@/components/ImageUploadInput'
import { ImagePreview } from '@/components/ImagePreview'
import { validatePost } from '@/lib/profanity-filter'
import type { Channel, Post } from '@/lib/types'

interface CreatePostFormProps {
  initialChannelSlug?: string
  onCancel?: () => void
  onPostCreated?: (post: Post, channel: Channel | null) => void
}

export default function CreatePostForm({
  initialChannelSlug,
  onCancel,
  onPostCreated,
}: CreatePostFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const imageUpload = useImageUpload()

  const [channels, setChannels] = useState<Channel[]>([])
  const [formData, setFormData] = useState({
    channel_id: '',
    title: '',
    content: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [userRole, setUserRole] = useState<string>('Personal')
  const { showToast, ToastContainer } = useToast()

  useEffect(() => {
    const initialize = async () => {
      const role = await loadUserRole()
      await loadChannels(role)
    }
    initialize()
  }, [])

  const loadChannels = async (role: string) => {
    let query = supabase
      .from('channels')
      .select('*')
      .order('name')

    if (role !== 'Admin') {
      query = query.eq('is_read_only', false)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading channels:', error)
      setError('Failed to load channels. Please refresh the page.')
      return
    }

    const loadedChannels = data || []

    if (loadedChannels.length === 0) {
      setError('No channels available. Please contact an administrator to set up channels.')
      return
    }

    setChannels(loadedChannels)

    if (initialChannelSlug) {
      const channel = loadedChannels.find(c => c.slug === initialChannelSlug)
      if (channel) {
        setFormData(prev => ({ ...prev, channel_id: channel.id }))
      }
    }
  }

  const loadUserRole = async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserRole(profile.role)
        return profile.role
      }
    }

    setUserRole('Personal')
    return 'Personal'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    let uploadedImageUrls: string[] = []

    try {
      if (!formData.channel_id) {
        setError('Please select a channel')
        setLoading(false)
        return
      }

      if (!formData.title.trim()) {
        setError('Please enter a title')
        setLoading(false)
        return
      }

      if (!formData.content.trim()) {
        setError('Please enter content')
        setLoading(false)
        return
      }

      const validation = validatePost(formData.title, formData.content)
      if (!validation.valid) {
        setError(validation.error || 'Validation failed')
        setLoading(false)
        return
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError) {
        console.error('Auth error:', authError)
        setError('Authentication error. Please log in again.')
        setLoading(false)
        return
      }

      if (!user) {
        setError('You must be logged in to create a post.')
        setLoading(false)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_verified')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profile error:', profileError)
        setError(`Profile error: ${profileError.message}`)
        setLoading(false)
        return
      }

      if (!profile) {
        setError('User profile not found. Please complete your profile setup.')
        setLoading(false)
        return
      }

      if (!profile.is_verified) {
        setError('Your account must be verified before you can create posts. Please contact an administrator or complete the alumni verification process.')
        setLoading(false)
        return
      }

      // Check if user is banned
      // If the endpoint is unavailable or returns non-JSON, do not block post creation.
      try {
        const banCheckRes = await fetch(`/api/admin/user-bans/check/${user.id}`)
        const contentType = banCheckRes.headers.get('content-type') || ''

        if (banCheckRes.ok && contentType.includes('application/json')) {
          const banStatus = await banCheckRes.json()

          if (banStatus.is_banned) {
            const banMessage = banStatus.ban_type === 'permanent'
              ? `You are permanently banned from this platform. Reason: ${banStatus.reason}`
              : `You are temporarily banned from this platform. Reason: ${banStatus.reason}`

            setError(banMessage)
            setLoading(false)
            return
          }
        }
      } catch (banCheckError) {
        console.warn('Ban check endpoint unavailable, skipping ban check:', banCheckError)
      }

      const postData = {
        channel_id: formData.channel_id,
        author_id: user.id,
        title: formData.title.trim(),
        content: formData.content.trim(),
        is_moderated: false,
        moderation_reason: null,
      }

      let newPost: any = null
      let insertError: any = null

      const primaryInsert = await supabase
        .from('posts')
        .insert({ ...postData, approval_status: 'pending' })
        .select()
        .single()

      newPost = primaryInsert.data
      insertError = primaryInsert.error

      const isMissingApprovalStatus =
        !!insertError && (insertError.code === 'PGRST204' || insertError.code === '42703' || insertError.message?.includes('approval_status'))

      if (isMissingApprovalStatus) {
        const fallbackInsert = await supabase
          .from('posts')
          .insert(postData)
          .select()
          .single()

        newPost = fallbackInsert.data
        insertError = fallbackInsert.error
      }

      if (insertError) {
        if (insertError.message?.includes('post limit')) {
          setError(insertError.message)
        } else if (insertError.message?.includes('post_tracking')) {
          setError('Database configuration issue with post tracking. Please contact an administrator to fix RLS policies on the post_tracking table.')
        } else if (insertError.code === 'PGRST116' || insertError.message?.includes('JWT')) {
          setError('Permission denied. Your account may not have the required permissions to create posts.')
        } else if (insertError.code === '23505') {
          setError('A post with this title already exists.')
        } else if (insertError.code === '42501') {
          setError(`Permission denied by database policy: ${insertError.message}. Please ensure all database policies are properly configured.`)
        } else if (!insertError.message && !insertError.code) {
          setError('Failed to create post. This is likely due to a database security policy. Please ensure your account is verified and you have the necessary permissions.')
        } else {
          setError(`Failed to create post: ${insertError.message || insertError.code || 'Unknown error'}`)
        }
        setLoading(false)
        return
      }

      if (imageUpload.uploadedImages.length > 0) {
        setUploading(true)
        const uploadResult = await imageUpload.uploadImages(newPost.id)
        setUploading(false)

        if (!uploadResult.success) {
          await supabase
            .from('posts')
            .delete()
            .eq('id', newPost.id)

          setError(uploadResult.error || 'Failed to upload images. Post was not created.')
          setLoading(false)
          return
        }

        if (uploadResult.urls.length > 0) {
          uploadedImageUrls = uploadResult.urls
          await supabase
            .from('posts')
            .update({ images: uploadResult.urls })
            .eq('id', newPost.id)
        }
      }

      const selectedChannel = channels.find(c => c.id === formData.channel_id) || null
      const finalPost = uploadedImageUrls.length > 0
        ? { ...newPost, images: uploadedImageUrls }
        : newPost

      if (!onPostCreated) {
        showToast({
          message: 'Post submitted. Waiting for admin approval.',
          type: 'info',
          positionClassName: 'top-24',
        })
      }

      if (onPostCreated) {
        onPostCreated(finalPost, selectedChannel)
        return
      }

      router.push('/dashboard')
    } catch (err: any) {
      console.error('Post creation error:', err)
      const errorMessage = err?.message || err?.error_description || err?.error || 'Unknown error'
      setError(`Failed to create post: ${errorMessage}`)
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
      return
    }
    router.back()
  }

  return (
    <>
      <ToastContainer />
      <div className="max-w-3xl mx-auto">
        <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary dark:text-white">
            Create New Post
          </CardTitle>
          <CardDescription className="dark:text-white">
            Share opportunities, resources, or start a discussion with the Aggie community
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/30 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="rounded-lg bg-muted/50 border border-border p-4">
              <h4 className="font-semibold text-primary dark:text-white mb-2">Posting Limits for {userRole} Accounts</h4>
              <ul className="text-sm text-muted-foreground dark:text-white/80 space-y-1">
                {userRole === 'Personal' && (
                  <>
                    <li>• Up to 2 posts per day</li>
                    <li>• Up to 60 posts per month</li>
                  </>
                )}
                {userRole === 'Charity' && (
                  <>
                    <li>• Up to 1 post per day</li>
                    <li>• Up to 30 posts per month</li>
                  </>
                )}
                {userRole === 'Business' && (
                  <li>• Up to 1 post per month</li>
                )}
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel_id" className="dark:text-white">Channel *</Label>
              <select
                id="channel_id"
                value={formData.channel_id}
                onChange={(e) => setFormData({ ...formData, channel_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              >
                <option value="">Select a channel...</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.icon} {channel.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="dark:text-white">Title *</Label>
              <Input
                id="title"
                type="text"
                placeholder="Enter a descriptive title (5-200 characters)"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                maxLength={200}
                required
              />
              <p className="text-xs text-muted-foreground dark:text-white/80">
                {formData.title.length}/200 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" className="dark:text-white">Content *</Label>
              <Textarea
                id="content"
                placeholder="Share your message with the community (10-5000 characters)"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="min-h-[200px]"
                maxLength={5000}
                required
              />
              <p className="text-xs text-muted-foreground dark:text-white/80">
                {formData.content.length}/5000 characters
              </p>
            </div>

            <div className="space-y-4 border-t pt-6">
              <ImageUploadInput
                onImagesSelected={imageUpload.addImages}
                canAddMore={imageUpload.canAddMore}
                remainingSlots={imageUpload.remainingSlots}
                error={imageUpload.error}
              />
              {imageUpload.uploadedImages.length > 0 && (
                <ImagePreview
                  images={imageUpload.uploadedImages}
                  onRemove={imageUpload.removeImage}
                />
              )}
            </div>

            <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 dark:bg-blue-900/20 p-4">
              <h4 className="font-semibold text-blue-800 dark:text-white mb-2">Community Guidelines</h4>
              <ul className="text-sm text-blue-700 dark:text-white/80 space-y-1">
                <li>• Be respectful and constructive</li>
                <li>• No profanity or inappropriate language</li>
                <li>• Stay on topic for the selected channel</li>
                <li>• No spam or excessive self-promotion</li>
              </ul>
            </div>

            <div className="flex space-x-4">
              <Button
                type="submit"
                disabled={loading || uploading}
                className="flex-1"
              >
                {uploading ? 'Uploading Images...' : loading ? 'Creating Post...' : 'Create Post'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading || uploading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
        </Card>
      </div>
    </>
  )
}
