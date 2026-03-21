'use client'

import { useCreatePostForm } from '@/lib/hooks/useCreatePostForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { ImageUploadInput } from '@/components/ImageUploadInput'
import { ImagePreview } from '@/components/ImagePreview'
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
  const { showToast, ToastContainer } = useToast()
  const {
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
  } = useCreatePostForm({
    initialChannelSlug,
    onCancel,
    onPostCreated,
    showToast,
  })

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
              {userRole === 'Admin' ? (
                <p className="text-sm text-muted-foreground dark:text-white/80">• Unlimited posts</p>
              ) : (
                <ul className="text-sm space-y-1">
                  {userRole !== 'Business' && (
                    postCounts.dailyUsed >= postCounts.dailyLimit ? (
                      <li className="text-red-600 dark:text-red-400 font-semibold">
                        ✕ Daily limit reached — you've used all {postCounts.dailyLimit} post{postCounts.dailyLimit !== 1 ? 's' : ''} for today. Resets the next calendar day.
                      </li>
                    ) : (
                      <li className="text-muted-foreground dark:text-white/80">
                        • Today: {postCounts.dailyLimit - postCounts.dailyUsed} of {postCounts.dailyLimit} post{postCounts.dailyLimit !== 1 ? 's' : ''} remaining
                      </li>
                    )
                  )}
                  {postCounts.monthlyUsed >= postCounts.monthlyLimit ? (
                    <li className="text-red-600 dark:text-red-400 font-semibold">
                      ✕ Monthly limit reached — you've used all {postCounts.monthlyLimit} post{postCounts.monthlyLimit !== 1 ? 's' : ''} for this month.
                    </li>
                  ) : (
                    <li className="text-muted-foreground dark:text-white/80">
                      • This month: {postCounts.monthlyLimit - postCounts.monthlyUsed} of {postCounts.monthlyLimit} post{postCounts.monthlyLimit !== 1 ? 's' : ''} remaining
                    </li>
                  )}
                </ul>
              )}
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
                    {channel.name}
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

            {/* Post Duration */}
            <div className="space-y-2">
              <Label className="dark:text-white">Post Duration</Label>
              <div className="flex gap-2 flex-wrap">
                {([1, 3, 7, 14] as const).map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setFormData({ ...formData, duration_days: days })}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                      formData.duration_days === days
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {days === 1 ? '1 day' : days === 7 ? '1 week' : days === 14 ? '2 weeks' : `${days} days`}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground dark:text-white/60">
                Post will be automatically removed after the selected duration.
              </p>
            </div>

            {/* Contact Info */}
            {availableContactFields.length > 0 && (
              <div className="space-y-2">
                <Label className="dark:text-white">Share Contact Info on This Post <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <div className="rounded-lg border border-border p-3 space-y-2">
                  {availableContactFields.map(({ key, label, value }) => {
                    const checked = formData.selected_contact_keys.includes(key)
                    return (
                      <label key={key} className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setFormData({
                              ...formData,
                              selected_contact_keys: checked
                                ? formData.selected_contact_keys.filter(k => k !== key)
                                : [...formData.selected_contact_keys, key],
                            })
                          }
                          className="h-4 w-4 rounded border-border"
                        />
                        <span className="text-sm">
                          <span className="font-medium text-foreground">{label}:</span>{' '}
                          <span className="text-muted-foreground">{value}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground dark:text-white/60">
                  Selected info will be visible on this post and removed when the post expires.
                </p>
              </div>
            )}

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
