'use client'

import { useCreatePostForm } from '@/lib/hooks/useCreatePostForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { ImageUploadInput } from '@/components/ImageUploadInput'
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
      <div className="space-y-3">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-primary dark:text-white">Create New Post</h2>
          <p className="text-sm text-muted-foreground dark:text-white/70 mt-0.5">
            Share opportunities, resources, or start a discussion with the Aggie community
          </p>
        </div>

        {/* Posting limits — compact pills */}
        {userRole !== 'Admin' && (
          <div className="flex flex-wrap gap-2">
            {userRole !== 'Business' && (
              postCounts.dailyUsed >= postCounts.dailyLimit ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/30 px-2.5 py-1 text-xs text-red-600 dark:text-red-400 font-medium">
                  ✕ Daily limit reached ({postCounts.dailyLimit}/{postCounts.dailyLimit})
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-muted border border-border px-2.5 py-1 text-xs text-muted-foreground dark:text-white/70">
                  Today: {postCounts.dailyLimit - postCounts.dailyUsed}/{postCounts.dailyLimit} remaining
                </span>
              )
            )}
            {postCounts.monthlyUsed >= postCounts.monthlyLimit ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/30 px-2.5 py-1 text-xs text-red-600 dark:text-red-400 font-medium">
                ✕ Monthly limit reached ({postCounts.monthlyLimit}/{postCounts.monthlyLimit})
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-muted border border-border px-2.5 py-1 text-xs text-muted-foreground dark:text-white/70">
                This month: {postCounts.monthlyLimit - postCounts.monthlyUsed}/{postCounts.monthlyLimit} remaining
              </span>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/30 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Two-column main layout */}
          <div className="grid grid-cols-5 gap-6">
            {/* Left column: Channel, Title, Duration, Contact */}
            <div className="col-span-2 space-y-3">
              <div className="space-y-1.5">
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

              <div className="space-y-1.5">
                <Label htmlFor="title" className="dark:text-white">Title *</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Descriptive title (5–200 chars)"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  maxLength={200}
                  required
                />
                <p className="text-xs text-muted-foreground dark:text-white/60">
                  {formData.title.length}/200 characters
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="dark:text-white">Post Duration</Label>
                <div className="flex gap-2 flex-wrap">
                  {([1, 3, 7, 14] as const).map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setFormData({ ...formData, duration_days: days })}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
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
                  Post auto-removes after selected duration.
                </p>
              </div>

              {availableContactFields.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="dark:text-white">
                    Contact Info{' '}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    {availableContactFields.map(({ key, label, value }) => {
                      const checked = formData.selected_contact_keys.includes(key)
                      return (
                        <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none">
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
                    Visible on this post until it expires.
                  </p>
                </div>
              )}
            </div>

            {/* Right column: Content, Images */}
            <div className="col-span-3 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="content" className="dark:text-white">Content *</Label>
                <Textarea
                  id="content"
                  placeholder="Share your message with the community (10–5000 characters)"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="min-h-[220px]"
                  maxLength={5000}
                  required
                />
                <p className="text-xs text-muted-foreground dark:text-white/60">
                  {formData.content.length}/5000 characters
                </p>
              </div>

              <div className="border-t pt-3">
                <ImageUploadInput
                  onImagesSelected={imageUpload.addImages}
                  canAddMore={imageUpload.canAddMore}
                  remainingSlots={imageUpload.remainingSlots}
                  error={imageUpload.error}
                  images={imageUpload.uploadedImages}
                  onRemove={imageUpload.removeImage}
                />
              </div>
            </div>
          </div>

          {/* Community guidelines — collapsible */}
          <details className="rounded-lg border border-blue-500/30 bg-blue-500/10 dark:bg-blue-900/20">
            <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-blue-800 dark:text-white select-none">
              Community Guidelines
            </summary>
            <ul className="px-4 pb-3 mt-1 text-sm text-blue-700 dark:text-white/80 space-y-1">
              <li>• Be respectful and constructive</li>
              <li>• No profanity or inappropriate language</li>
              <li>• Stay on topic for the selected channel</li>
              <li>• No spam or excessive self-promotion</li>
            </ul>
          </details>

          <div className="flex gap-3">
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
      </div>
    </>
  )
}
