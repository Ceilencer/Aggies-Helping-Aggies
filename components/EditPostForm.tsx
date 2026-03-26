'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useImageUpload } from '@/lib/hooks/useImageUpload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageUploadInput } from '@/components/ImageUploadInput'
import { validatePost } from '@/lib/profanity-filter'
import type { Post, Channel, ChannelListDTO } from '@/lib/types'

const MAX_TOTAL_IMAGES = 5

type EditablePost = Pick<Post, 'id' | 'title' | 'content' | 'images'>

interface EditPostFormProps {
  post: EditablePost
  channel?: Channel | ChannelListDTO
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
  // Track which existing images the user wants to keep
  const [keptImages, setKeptImages] = useState<string[]>(post.images ?? [])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const totalImageCount = keptImages.length + imageUpload.uploadedImages.length
  const canAddMore = totalImageCount < MAX_TOTAL_IMAGES
  const remainingSlots = MAX_TOTAL_IMAGES - totalImageCount

  const removeExistingImage = (url: string) => {
    setKeptImages((prev) => prev.filter((u) => u !== url))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
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
      if (authError || !user) {
        setError('You must be logged in to edit posts.')
        setLoading(false)
        return
      }

      // Upload any new images first
      let newImageUrls: string[] = []
      if (imageUpload.uploadedImages.length > 0) {
        setUploading(true)
        const uploadResult = await imageUpload.uploadImages(post.id)
        setUploading(false)
        if (!uploadResult.success) {
          setError(uploadResult.error || 'Failed to upload images')
          setLoading(false)
          return
        }
        newImageUrls = uploadResult.urls
      }

      const finalImages = [...keptImages, ...newImageUrls]

      const response = await fetch(`/api/posts/${post.id}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim(),
          images: finalImages,
        }),
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

      router.push('/dashboard')
    } catch (err: any) {
      console.error('Post update error:', err)
      setError(err?.message || 'Failed to update post')
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

            {/* Image editing section */}
            <div className="space-y-4 border-t pt-6">
              <Label className="dark:text-white">Images</Label>

              {/* Existing images */}
              {keptImages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground dark:text-white/70">
                    Current images — click × to remove
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {keptImages.map((url) => (
                      <div key={url} className="relative group">
                        <div className="relative w-full h-24 sm:h-32 bg-muted rounded-lg overflow-hidden border border-border">
                          <Image
                            src={url}
                            alt="Post image"
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 25vw"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExistingImage(url)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 hover:bg-red-500/20 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New image upload */}
              <ImageUploadInput
                onImagesSelected={imageUpload.addImages}
                canAddMore={canAddMore}
                remainingSlots={remainingSlots}
                error={imageUpload.error}
              />

              {imageUpload.uploadedImages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground dark:text-white/70">
                    New images to add ({imageUpload.uploadedImages.length})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {imageUpload.uploadedImages.map((image, index) => (
                      <div key={`${image.file.name}-${index}`} className="relative group">
                        <div className="relative w-full h-24 sm:h-32 bg-muted rounded-lg overflow-hidden border border-border">
                          <Image
                            src={image.preview}
                            alt={image.file.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 25vw"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => imageUpload.removeImage(index)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 hover:bg-red-500/20 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <p className="text-xs text-muted-foreground dark:text-white/70 mt-1 truncate">
                          {image.file.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 dark:bg-blue-900/20 p-4">
              <h4 className="font-semibold text-blue-800 dark:text-white mb-2">Note on Edits</h4>
              <ul className="text-sm text-blue-700 dark:text-white/80 space-y-1">
                <li>• Your edit will be submitted for admin review before being published</li>
                <li>• The original post remains visible to others until your edit is approved</li>
                <li>• Please use this feature responsibly</li>
              </ul>
            </div>

            <div className="flex space-x-4">
              <Button
                type="submit"
                disabled={loading || uploading}
                className="flex-1"
              >
                {uploading ? 'Uploading Images...' : loading ? 'Updating Post...' : 'Update Post'}
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
