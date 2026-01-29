'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { validatePost } from '@/lib/profanity-filter'
import type { Channel, POST_LIMITS } from '@/lib/types'

export default function CreatePostPage() {
  const router = useRouter()
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
    loadChannels()
    loadUserRole()
  }, [])

  const loadChannels = async () => {
    const { data } = await supabase
      .from('channels')
      .select('*')
      .eq('is_read_only', false)
      .order('name')
    
    if (data) setChannels(data)
  }

  const loadUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, mfa_enabled')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        setUserRole(profile.role)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate content for profanity
      const validation = validatePost(formData.title, formData.content)
      if (!validation.valid) {
        setError(validation.error || 'Validation failed')
        setLoading(false)
        return
      }

      // Check if channel requires MFA
      const selectedChannel = channels.find(c => c.id === formData.channel_id)
      if (selectedChannel?.requires_mfa) {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profile } = await supabase
          .from('profiles')
          .select('mfa_enabled')
          .eq('id', user!.id)
          .single()
        
        if (!profile?.mfa_enabled) {
          setError('This channel requires Two-Factor Authentication to be enabled. Please enable MFA in your security settings.')
          setLoading(false)
          return
        }
      }

      // Create post
      const { data: { user } } = await supabase.auth.getUser()
      const { error: insertError } = await supabase
        .from('posts')
        .insert({
          channel_id: formData.channel_id,
          author_id: user!.id,
          title: formData.title,
          content: formData.content,
        })

      if (insertError) throw insertError

      router.push('/dashboard')
    } catch (err: any) {
      console.error('Post creation error:', err)
      
      // Check for specific error messages from database triggers
      if (err.message?.includes('post limit')) {
        setError(err.message)
      } else if (err.message?.includes('MFA')) {
        setError(err.message)
      } else {
        setError('Failed to create post. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-maroon">
            Create New Post
          </CardTitle>
          <CardDescription>
            Share opportunities, resources, or start a discussion with the Aggie community
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Post Limits Info */}
            <div className="rounded-lg bg-maroon-50 border border-maroon-200 p-4">
              <h4 className="font-semibold text-maroon mb-2">Posting Limits for {userRole} Accounts</h4>
              <ul className="text-sm text-gray-700 space-y-1">
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
                <p className="text-xs text-maroon">
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
              <p className="text-xs text-gray-500">
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
              <p className="text-xs text-gray-500">
                {formData.content.length}/5000 characters
              </p>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Community Guidelines</h4>
              <ul className="text-sm text-blue-800 space-y-1">
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
