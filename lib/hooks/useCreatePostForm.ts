import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useImageUpload } from '@/lib/hooks/useImageUpload'
import { validatePost } from '@/lib/profanity-filter'
import { POST_LIMITS } from '@/lib/types'
import type { Channel, Post, UserRole } from '@/lib/types'

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
  })
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
    let query = supabase
      .from('channels')
      .select('*')
      .order('name')

    if (role !== 'Admin') {
      query = query.eq('is_read_only', false)
    }

    const { data, error: channelsError } = await query

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
      const [profileResult, trackingResult] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
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

      return role
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

      const isAdminUser = profile.role === 'Admin'

      const postData = {
        channel_id: formData.channel_id,
        author_id: user.id,
        title: formData.title.trim(),
        content: formData.content.trim(),
        is_moderated: isAdminUser,
        moderation_reason: null,
      }
      const approvalStatus = isAdminUser ? 'approved' : 'pending'

      let newPost: any = null
      let insertError: any = null

      const primaryInsert = await supabase
        .from('posts')
        .insert({ ...postData, approval_status: approvalStatus })
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
          message: finalPost.approval_status === 'approved'
            ? 'Post published successfully.'
            : 'Post submitted. Waiting for admin approval.',
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

  return {
    channels,
    formData,
    setFormData,
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