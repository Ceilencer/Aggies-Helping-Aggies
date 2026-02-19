'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useImageUpload } from '@/lib/hooks/useImageUpload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageUploadInput } from '@/components/ImageUploadInput'
import { ImagePreview } from '@/components/ImagePreview'
import { validatePost } from '@/lib/profanity-filter'
import type { Channel, POST_LIMITS } from '@/lib/types'

function CreatePostForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
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

    // For non-admins, only show non-read-only channels
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

    // Check if channels are empty
    if (loadedChannels.length === 0) {
      setError('No channels available. Please contact an administrator to set up channels.')
      return
    }

    console.log('Loaded channels from database:', loadedChannels)

    setChannels(loadedChannels)

    // Pre-select channel from URL params
    const channelParam = searchParams.get('channel')
    if (channelParam) {
      const channel = loadedChannels.find(c => c.slug === channelParam)
      if (channel) {
        console.log('Pre-selecting channel from URL:', channel)
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

    try {
      // Validate required fields
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

      // Validate content for profanity
      const validation = validatePost(formData.title, formData.content)
      if (!validation.valid) {
        setError(validation.error || 'Validation failed')
        setLoading(false)
        return
      }

      // Verify authentication
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

      // Check if user profile exists and is verified
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

      console.log('User verified, proceeding with post creation...')
      console.log('User ID:', user.id)
      console.log('Profile:', { role: profile.role, is_verified: profile.is_verified })

      // Get selected channel info for debugging
      const selectedChannel = channels.find(c => c.id === formData.channel_id)

      // Get selected channel info for debugging
      console.log('Selected channel:', selectedChannel)
      console.log('Selected channel ID:', formData.channel_id)

      // Prepare post data
      const postData = {
        channel_id: formData.channel_id,
        author_id: user.id,
        title: formData.title.trim(),
        content: formData.content.trim(),
      }

      console.log('Inserting post with data:', postData)
      console.log('Available channels:', channels.map(c => ({ id: c.id, name: c.name, slug: c.slug })))

      // Create post in database
      const { data: newPost, error: insertError } = await supabase
        .from('posts')
        .insert(postData)
        .select()
        .single()

      console.log('Insert result:', { data: newPost, error: insertError })

      if (insertError) {
        console.error('Insert error:', insertError)
        console.error('Insert error code:', insertError.code)
        console.error('Insert error message:', insertError.message)
        console.error('Insert error details:', insertError.details)
        console.error('Insert error hint:', insertError.hint)
        console.error('Full error object:', JSON.stringify(insertError, null, 2))

        // Handle specific database errors
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
          // Empty error object - likely RLS policy blocking
          setError('Failed to create post. This is likely due to a database security policy. Please ensure your account is verified and you have the necessary permissions.')
        } else {
          setError(`Failed to create post: ${insertError.message || insertError.code || 'Unknown error'}`)
        }
        setLoading(false)
        return
      }

      console.log('Post created successfully:', newPost)

      // Upload images if any
      if (imageUpload.uploadedImages.length > 0) {
        setUploading(true)
        const uploadResult = await imageUpload.uploadImages(newPost.id)
        setUploading(false)

        if (!uploadResult.success) {
          // Image upload failed - delete the post
          await supabase
            .from('posts')
            .delete()
            .eq('id', newPost.id)

          setError(uploadResult.error || 'Failed to upload images. Post was not created.')
          setLoading(false)
          return
        }

        // Update post with image URLs
        if (uploadResult.urls.length > 0) {
          console.log('Updating post with image URLs:', uploadResult.urls)
          const { data: updateData, error: updateError } = await supabase
            .from('posts')
            .update({ images: uploadResult.urls })
            .eq('id', newPost.id)
            .select()

          console.log('Update result:', { data: updateData, error: updateError })

          if (updateError) {
            console.error('Error updating post with images:', updateError)
            console.error('Error code:', updateError.code)
            console.error('Error message:', updateError.message)
            // Don't fail completely - the post exists, just without images
            // User can still see the post, just without images
            console.warn('Warning: Post created but image URLs were not saved. Images are in storage but not linked.')
          }
        }
      }

      // Success - redirect to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Post creation error:', err)
      console.error('Error details:', JSON.stringify(err, null, 2))

      // Enhanced error logging
      const errorMessage = err?.message || err?.error_description || err?.error || 'Unknown error'
      setError(`Failed to create post: ${errorMessage}`)
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  return (
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

            {/* Post Limits Info */}
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

            {/* Image Upload Section */}
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
                onClick={() => router.back()}
                disabled={loading || uploading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CreatePostPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-primary">
              Loading...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <CreatePostForm />
    </Suspense>
  )
}
