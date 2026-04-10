'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
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
    profileLoaded,
    draftRestored,
    discardDraft,
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

  const contactDetailsRef = useRef<HTMLDetailsElement>(null)
  const imagesDetailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const apply = (matches: boolean) => {
      if (matches) {
        contactDetailsRef.current?.setAttribute('open', '')
        imagesDetailsRef.current?.setAttribute('open', '')
      } else {
        contactDetailsRef.current?.removeAttribute('open')
        imagesDetailsRef.current?.removeAttribute('open')
      }
    }
    apply(mq.matches)
    const handler = (e: MediaQueryListEvent) => apply(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <>
      <ToastContainer />
      <div className="space-y-3">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-primary dark:text-white">Create New Post</h2>
          <p className="hidden sm:block text-sm text-muted-foreground dark:text-white/70 mt-0.5">
            Share opportunities, resources, or start a discussion with the Aggie community
          </p>
        </div>

        {/* Draft restored banner */}
        {draftRestored && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2 text-sm">
            <span className="text-amber-800 dark:text-amber-300">Draft restored from your last session.</span>
            <button
              type="button"
              onClick={discardDraft}
              className="text-xs text-amber-700 dark:text-amber-400 underline underline-offset-4 hover:text-amber-900 dark:hover:text-amber-200 shrink-0"
            >
              Discard
            </button>
          </div>
        )}

        {/* Posting limits */}
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

          {/* ── DESKTOP: independent two-column layout / MOBILE: stacked ── */}
          {/* Each column is its own flex container so heights are fully decoupled. */}
          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-5 sm:items-start sm:gap-x-6 sm:gap-y-3">

            {/* Title — first on mobile; positioned in left-col area on desktop */}
            <div className="sm:col-start-1 sm:col-span-2 sm:row-start-1 space-y-1.5">
              <Label htmlFor="title" className="dark:text-white">Title *</Label>
              <Input
                id="title"
                type="text"
                placeholder="5–200 chars"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                maxLength={200}
                required
              />
              <p className="text-xs text-muted-foreground dark:text-white/60">
                {formData.title.length}/200
              </p>
            </div>

            {/* RIGHT column (Content + Images) */}
            <div className="sm:col-start-3 sm:col-span-3 sm:row-start-1 sm:row-span-2 flex flex-col gap-3">

              {/* Content */}
              <div className="space-y-1.5">
                <Label htmlFor="content" className="dark:text-white">Content *</Label>
                <Textarea
                  id="content"
                  placeholder="Share your message with the community (10–5000 characters)"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="min-h-[120px] sm:min-h-[220px]"
                  maxLength={5000}
                  required
                />
                <p className="text-xs text-muted-foreground dark:text-white/60">
                  {formData.content.length}/5000 characters
                </p>
              </div>

              {/* Images */}
              <details ref={imagesDetailsRef} open className="group border-t pt-3">
                <summary className="cursor-pointer text-sm font-medium dark:text-white list-none flex items-center justify-between mb-1.5">
                  <span>Upload Images <span className="font-normal text-muted-foreground">(optional)</span></span>
                  <span className="sm:hidden text-xs text-muted-foreground group-open:hidden">Show</span>
                  <span className="sm:hidden text-xs text-muted-foreground hidden group-open:inline">Hide</span>
                </summary>
                <ImageUploadInput
                  onImagesSelected={imageUpload.addImages}
                  canAddMore={imageUpload.canAddMore}
                  remainingSlots={imageUpload.remainingSlots}
                  error={imageUpload.error}
                  images={imageUpload.uploadedImages}
                  onRemove={imageUpload.removeImage}
                />
              </details>

            </div>

            {/* LEFT column (Channel + Contact + Duration) */}
            <div className="sm:col-start-1 sm:col-span-2 sm:row-start-2 flex flex-col gap-3">

              {/* Channel */}
              <div className="space-y-1.5">
                <Label htmlFor="channel_id" className="dark:text-white">Channel *</Label>
                <select
                  id="channel_id"
                  value={formData.channel_id}
                  onChange={(e) => setFormData({ ...formData, channel_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="">Select...</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contact */}
              {profileLoaded && (
                <details ref={contactDetailsRef} open className="group">
                  <summary className="cursor-pointer text-sm font-medium dark:text-white list-none flex items-center justify-between">
                    <span>
                      Contact Info{' '}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                    </span>
                    <span className="sm:hidden text-xs text-muted-foreground group-open:hidden">Show</span>
                    <span className="sm:hidden text-xs text-muted-foreground hidden group-open:inline">Hide</span>
                  </summary>
                  <div className="mt-1.5">
                    {availableContactFields.length > 0 ? (
                      <>
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
                                  <span className="text-muted-foreground truncate">{value}</span>
                                </span>
                              </label>
                            )
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground dark:text-white/60 mt-1">
                          Visible on this post until it expires.
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground dark:text-white/60">
                        No contact info saved.{' '}
                        <Link
                          href="/dashboard/profile"
                          className="underline underline-offset-4 hover:text-foreground"
                        >
                          Add it in your profile
                        </Link>
                        {' '}to share it on posts.
                      </p>
                    )}
                  </div>
                </details>
              )}

              {/* Duration */}
              <div className="space-y-1.5">
                <Label className="dark:text-white">Duration</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {([1, 3, 7, 14] as const).map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setFormData({ ...formData, duration_days: days })}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
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
                  Auto-removes after selected duration.
                </p>
              </div>

            </div>

          </div>

          {/* Community guidelines */}
          <details className="rounded-lg border border-blue-500/30 bg-blue-500/10 dark:bg-blue-900/20">
            <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-blue-800 dark:text-white select-none">
              Community Guidelines
            </summary>
            <ul className="px-4 pb-3 mt-1 text-sm text-blue-700 dark:text-white/80 space-y-1">
              <li>• Be respectful and constructive</li>
              <li>• No profanity or inappropriate language</li>
              <li>• Stay on topic for the selected channel</li>
              <li>• No spam or excessive self-promotion</li>
              <li>• No political content or discussion</li>
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
