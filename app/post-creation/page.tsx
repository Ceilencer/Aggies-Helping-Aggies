'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { validatePost } from '@/lib/profanity-filter'
import type { Channel, POST_LIMITS } from '@/lib/types'

function CreatePostForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [channels, setChannels] = useState<Channel[]>([])
  const [formData, setFormData] = useState({
    channel_id: '',
    title: '',
    content: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [userRole, setUserRole] = useState<string>('Personal')

  useEffect(() => {
    const initialize = async () => {
      const role = await loadUserRole()
      await loadChannels(role)
    }
    initialize()
  }, [])

  const loadChannels = async (role: string) => {
    // Check for temporary admin session (for local testing)
    const hasAdminSession = document.cookie.includes('admin_session=true')

    let loadedChannels: Channel[] = []

    if (hasAdminSession) {
      // Mock data for local testing - include announcements for admin
      const mockChannels: Channel[] = [
        { id: '1', name: 'General', slug: 'general', description: 'General community discussions', type: 'general', requires_mfa: false, is_read_only: false, icon: '💬', color: '#500000', created_at: '', updated_at: '' },
        { id: '2', name: 'Promotions', slug: 'promotions', description: 'Business promotions and events', type: 'promotions', requires_mfa: false, is_read_only: false, icon: '📢', color: '#500000', created_at: '', updated_at: '' },
        { id: '3', name: 'Job/Internship/Networking', slug: 'jobs-networking', description: 'Job opportunities, internships, and networking', type: 'jobs', requires_mfa: false, is_read_only: false, icon: '💼', color: '#500000', created_at: '', updated_at: '' },
        { id: '4', name: 'Fundraising', slug: 'fundraising', description: 'Support Aggie causes and fundraising efforts', type: 'aggie_ring', requires_mfa: false, is_read_only: false, icon: '💍', color: '#500000', created_at: '', updated_at: '' },
        { id: '5', name: 'Football Tickets', slug: 'football-tickets', description: 'Buy, sell, or trade football game tickets', type: 'tickets', requires_mfa: true, is_read_only: false, icon: '🎟️', color: '#500000', created_at: '', updated_at: '' },
        { id: '6', name: 'Announcements', slug: 'announcements', description: 'Official platform announcements', type: 'announcements', requires_mfa: false, is_read_only: true, icon: '📌', color: '#500000', created_at: '', updated_at: '' }
      ]
      // Show announcements only for admins
      loadedChannels = role === 'Admin' ? mockChannels : mockChannels.filter(c => !c.is_read_only)
    } else {
      // Real Supabase data
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

      loadedChannels = data || []

      // Check if channels are empty
      if (loadedChannels.length === 0) {
        setError('No channels available. Please contact an administrator to set up channels.')
        return
      }

      console.log('Loaded channels from database:', loadedChannels)
    }

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
    const hasAdminSession = document.cookie.includes('admin_session=true')

    if (hasAdminSession) {
      // Mock admin user
      setUserRole('Admin')
      return 'Admin'
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, mfa_enabled')
          .eq('id', user.id)
          .single()

        if (profile) {
          setUserRole(profile.role)
          return profile.role
        }
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

      // Check if using mock admin session
      const hasAdminSession = document.cookie.includes('admin_session=true')
      
      if (hasAdminSession) {
        // Mock mode: save to localStorage
        const selectedChannel = channels.find(c => c.id === formData.channel_id)
        const newPost = {
          id: Date.now(),
          channel_id: formData.channel_id,
          title: formData.title,
          content: formData.content,
          created_at: new Date().toISOString(),
          author: { full_name: 'Admin User', role: 'Admin' },
          channel: selectedChannel ? { name: selectedChannel.name, icon: selectedChannel.icon } : { name: 'Unknown', icon: '❓' },
          is_pinned: false
        }

        const existingPosts = localStorage.getItem('mockPosts')
        const posts = existingPosts ? JSON.parse(existingPosts) : []
        posts.unshift(newPost)
        localStorage.setItem('mockPosts', JSON.stringify(posts))
        
        router.push('/dashboard')
        return
      }

      // Real Supabase mode - verify authentication
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
        .select('role, is_verified, mfa_enabled')
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
      console.log('Profile:', { role: profile.role, is_verified: profile.is_verified, mfa_enabled: profile.mfa_enabled })

      // Check if channel requires MFA
      const selectedChannel = channels.find(c => c.id === formData.channel_id)
      if (selectedChannel?.requires_mfa && !profile.mfa_enabled) {
        setError('This channel requires Two-Factor Authentication to be enabled. Please enable MFA in your security settings.')
        setLoading(false)
        return
      }

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
        } else if (insertError.message?.includes('MFA')) {
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
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">
            Create New Post
          </CardTitle>
          <CardDescription>
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
              <h4 className="font-semibold text-primary mb-2">Posting Limits for {userRole} Accounts</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
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
              <Label htmlFor="channel_id">Channel *</Label>
              <select
                id="channel_id"
                value={formData.channel_id}
                onChange={(e) => setFormData({ ...formData, channel_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2"
                required
              >
                <option value="">Select a channel...</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.icon} {channel.name} {channel.requires_mfa ? '🔒' : ''}
                  </option>
                ))}
              </select>
              {channels.find(c => c.id === formData.channel_id)?.requires_mfa && (
                <p className="text-xs text-primary">
                  🔒 This channel requires Two-Factor Authentication
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                type="text"
                placeholder="Enter a descriptive title (5-200 characters)"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                maxLength={200}
                required
              />
              <p className="text-xs text-muted-foreground">
                {formData.title.length}/200 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                placeholder="Share your message with the community (10-5000 characters)"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="min-h-[200px]"
                maxLength={5000}
                required
              />
              <p className="text-xs text-muted-foreground">
                {formData.content.length}/5000 characters
              </p>
            </div>

            <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 dark:bg-blue-900/20 p-4">
              <h4 className="font-semibold text-blue-800 dark:text-blue-400 mb-2">Community Guidelines</h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Be respectful and constructive</li>
                <li>• No profanity or inappropriate language</li>
                <li>• Stay on topic for the selected channel</li>
                <li>• No spam or excessive self-promotion</li>
              </ul>
            </div>

            <div className="flex space-x-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creating Post...' : 'Create Post'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()}
                disabled={loading}
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
