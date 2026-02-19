'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useImageUpload } from '@/lib/hooks/useImageUpload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { validatePost } from '@/lib/profanity-filter'
import type { Post, Channel } from '@/lib/types'

interface EditPostFormProps {
  post: Post
  channel?: Channel
  onCancel?: () => void
  onPostUpdated?: (post: Post) => void
}

export default function EditPostForm({
  post,
  channel,
  onCancel,
  onPostUpdated,
}: EditPostFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const imageUpload = useImageUpload()

  const [formData, setFormData] = useState({
    title: post.title,
    content: post.content,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate required fields
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
        setError('Authentication error. Please log in again.')
        setLoading(false)
        return
      }

      if (!user) {
        setError('You must be logged in to edit posts.')
        setLoading(false)
        return
      }

      // Prepare update data
      const updateData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
      }

      // Update post
      const response = await fetch(`/api/posts/${post.id}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update post')
      }

      const updatedPost = await response.json()

      if (onPostUpdated) {
        onPostUpdated(updatedPost)
        return
      }

      // Success - redirect to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Post update error:', err)
      const errorMessage = err?.message || 'Failed to update post'
      setError(errorMessage)
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
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary dark:text-white">
            Edit Post
          </CardTitle>
          <CardDescription className="dark:text-white">
            Update your post. Non-admin edits will require re-approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/30 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

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

            <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 dark:bg-blue-900/20 p-4">
              <h4 className="font-semibold text-blue-800 dark:text-white mb-2">Note on Edits</h4>
              <ul className="text-sm text-blue-700 dark:text-white/80 space-y-1">
                <li>• Your edits will be visible immediately to you</li>
                <li>• Non-admin edits require admin approval before other users can see them</li>
                <li>• Please use this feature responsibly</li>
              </ul>
            </div>

            <div className="flex space-x-4">
              <Button 
                type="submit" 
                disabled={loading || uploading} 
                className="flex-1"
              >
                {loading ? 'Updating Post...' : 'Update Post'}
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
  )
}
