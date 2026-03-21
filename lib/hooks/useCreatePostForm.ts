import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useImageUpload } from '@/lib/hooks/useImageUpload'
import { validatePost } from '@/lib/profanity-filter'
import { POST_LIMITS } from '@/lib/types'
import { sortChannelsByDisplayOrder } from '@/lib/utils'
import type { Channel, Post, UserRole, PostContactEntry } from '@/lib/types'

const CONTACT_FIELD_DEFS = [
  { key: 'contact_email',    label: 'Email' },
  { key: 'phone_number',     label: 'Phone' },
  { key: 'instagram_handle', label: 'Instagram' },
  { key: 'discord_username', label: 'Discord' },
  { key: 'facebook_url',     label: 'Facebook' },
  { key: 'linkedin_url',     label: 'LinkedIn' },
  { key: 'twitter_handle',   label: 'X / Twitter' },
  { key: 'website_url',      label: 'Website' },
] as const

export type AvailableContactField = { key: string; label: string; value: string }

type PostCounts = {
  dailyUsed: number
  monthlyUsed: number
  dailyLimit: number
  monthlyLimit: number
}

type UseCreatePostFormArgs = {
  initialChannelSlug?: string
  onCancel?: () => void
  onPostCreated?: (post: Post, channel: Channel | null) => void
  showToast: (options: { message: string; type: 'success' | 'error' | 'info'; positionClassName?: string }) => void
}

export function useCreatePostForm({
  initialChannelSlug,
  onCancel,
  onPostCreated,
  showToast,
}: UseCreatePostFormArgs) {
  const router = useRouter()
  const supabase = createClient()
  const imageUpload = useImageUpload()

  const [channels, setChannels] = useState<Channel[]>([])
  const [formData, setFormData] = useState({
    channel_id: '',
    title: '',
    content: '',
    duration_days: 7 as 1 | 3 | 7 | 14,
    selected_contact_keys: [] as string[],
  })
  const [availableContactFields, setAvailableContactFields] = useState<AvailableContactField[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [userRole, setUserRole] = useState<string>('Personal')
  const [postCounts, setPostCounts] = useState<PostCounts>({
    dailyUsed: 0,
    monthlyUsed: 0,
    dailyLimit: POST_LIMITS['Personal'].daily,
    monthlyLimit: POST_LIMITS['Personal'].monthly,
  })

  useEffect(() => {
    const initialize = async () => {
      const role = await loadUserRole()
      await loadChannels(role)
    }
    initialize()
  }, [])

  const loadChannels = async (role: string) => {
    const { data, error: channelsError } = await supabase
      .from('channels')
      .select('*')
      .eq('is_read_only', false)
      .order('name')

    if (channelsError) {
      console.error('Error loading channels:', channelsError)
      setError('Failed to load channels. Please refresh the page.')
      return
    }

    const loadedChannels = data || []

    if (loadedChannels.length === 0) {
      setError('No channels available. Please contact an administrator to set up channels.')
      return
    }

    setChannels(sortChannelsByDisplayOrder(loadedChannels))

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
      const [profileResult, trackingResult] = await Promise.all([
        supabase.from('profiles').select('role, contact_email, phone_number, instagram_handle, discord_username, facebook_url, linkedin_url, twitter_handle, website_url').eq('id', user.id).single(),
        supabase.rpc('get_post_counts'),
      ])

      const role = (profileResult.data?.role as UserRole) ?? 'Personal'
      setUserRole(role)

      const limits = POST_LIMITS[role] ?? POST_LIMITS['Personal']
      const tracking = Array.isArray(trackingResult.data) ? trackingResult.data[0] : trackingResult.data
      setPostCounts({
        dailyUsed: tracking?.daily_post_count ?? 0,
        monthlyUsed: tracking?.monthly_post_count ?? 0,
        dailyLimit: limits.daily,
        monthlyLimit: limits.monthly,
      })

      // Build list of non-empty contact fields the user can attach to the post
      if (profileResult.data) {
        const p = profileResult.data as Record<string, string | null>
        const available = CONTACT_FIELD_DEFS
          .filter(({ key }) => !!p[key])
          .map(({ key, label }) => ({ key, label, value: p[key] as string }))
        setAvailableContactFields(available)
      }

      return role
    }

    setUserRole('Personal')
    return 'Personal'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // --- Client-side quick validation for immediate UX feedback ---
      if (!formData.channel_id) {
        setError('Please select a channel')
        return
      }

      if (!formData.title.trim()) {
        setError('Please enter a title')
        return
      }

      if (!formData.content.trim()) {
        setError('Please enter content')
        return
      }

      // Client-side profanity check — hard block, same validatePost() the server uses,
      // so they can never produce different results. Avoids a round trip for a clear violation.
      const profanityCheck = validatePost(formData.title, formData.content)
      if (!profanityCheck.valid) {
        setError(profanityCheck.error || 'Content contains inappropriate language. Please revise before submitting.')
        return
      }

      // Resolve selected contact keys to { label, value } snapshot
      const post_contact: PostContactEntry[] = formData.selected_contact_keys
        .map(key => availableContactFields.find(f => f.key === key))
        .filter((f): f is AvailableContactField => !!f)
        .map(({ label, value }) => ({ label, value }))

      // --- Create the post via the server-side API route ---
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          channel_id: formData.channel_id,
          title: formData.title.trim(),
          content: formData.content.trim(),
          duration_days: formData.duration_days,
          post_contact,
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        setError(responseData.error || 'Failed to create post')
        return
      }

      const newPost = responseData

      // --- Upload images if any (Storage upload stays client-side for progress feedback) ---
      if (imageUpload.uploadedImages.length > 0) {
        setUploading(true)
        const uploadResult = await imageUpload.uploadImages(newPost.id)
        setUploading(false)

        if (!uploadResult.success) {
          // Storage cleanup is handled inside uploadImages(). Delete the orphaned post.
          const { error: deleteError } = await supabase
            .from('posts')
            .delete()
            .eq('id', newPost.id)
          if (deleteError) {
            console.error('Failed to delete orphaned post after image upload failure:', deleteError)
          }
          setError(uploadResult.error || 'Failed to upload images. Post was not created.')
          return
        }

        if (uploadResult.urls.length > 0) {
          // Patch the post record with image URLs
          const { error: patchError } = await supabase
            .from('posts')
            .update({ images: uploadResult.urls })
            .eq('id', newPost.id)

          if (patchError) {
            // Images are in storage but not linked to the post — clean up both
            console.error('Failed to patch post with image URLs:', patchError)
            try {
              await supabase.storage.from('post-images').remove(uploadResult.paths)
            } catch (cleanupErr) {
              console.error('Failed to clean up storage after patch failure:', cleanupErr)
            }
            await supabase.from('posts').delete().eq('id', newPost.id)
            setError('Failed to attach images to post. Please try again.')
            return
          }

          newPost.images = uploadResult.urls
        }
      }

      const selectedChannel = channels.find(c => c.id === formData.channel_id) || null

      if (!onPostCreated) {
        showToast({
          message: newPost.approval_status === 'approved'
            ? 'Post published successfully.'
            : 'Post submitted. Waiting for admin approval.',
          type: 'info',
          positionClassName: 'top-24',
        })
      }

      // Clear image previews now that the post is fully committed
      imageUpload.clearImages()

      if (onPostCreated) {
        onPostCreated(newPost, selectedChannel)
        return
      }

      router.push('/dashboard')
    } catch (err: any) {
      console.error('Post creation error:', err)
      setError('An unexpected error occurred. Please try again.')
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

  return {
    channels,
    formData,
    setFormData,
    availableContactFields,
    error,
    loading,
    uploading,
    userRole,
    postCounts,
    imageUpload,
    handleSubmit,
    handleCancel,
  }
}
