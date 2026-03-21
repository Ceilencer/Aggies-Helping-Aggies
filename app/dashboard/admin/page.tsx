"use client"

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { PostImageGrid } from '@/components/PostImageGrid'
import { notifyAdminCountChanged } from '@/lib/hooks/useAdminPendingCount'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeStatus } from '@/lib/realtime/RealtimeStatusContext'
import { getInitials } from '@/lib/utils'
import UserProfileModal from '@/components/UserProfileModal'
import type { AdminPendingPostDTO, FeedChannelDTO } from '@/lib/types'

type PostItem = AdminPendingPostDTO

const CANNED_REASONS = [
  'Violates community guidelines',
  'Inappropriate or offensive content',
  'Spam or self-promotion',
  'Misleading or false information',
  'Off-topic for this channel',
  'Duplicate post',
  'Political content',
  'Other',
] as const

interface DenyState {
  open: boolean
  selected: Set<string>
  custom: string
}

interface PostOverrides {
  duration: number
  channelId: string
}

const DURATION_OPTIONS = [1, 3, 7, 14] as const

function getDefaultDuration(post: AdminPendingPostDTO): number {
  if (!post.expires_at) return 7
  const days = Math.round((new Date(post.expires_at).getTime() - new Date(post.created_at).getTime()) / 86400000)
  return DURATION_OPTIONS.reduce((closest, opt) =>
    Math.abs(opt - days) < Math.abs(closest - days) ? opt : closest
  )
}

const POSTS_PER_PAGE = 15

export default function AdminDashboardPage() {
  const [posts, setPosts] = useState<PostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [actioning, setActioning] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [newPostsAvailable, setNewPostsAvailable] = useState(false)
  const [realtimeOk, setRealtimeOk] = useState(true)
  const [denyState, setDenyState] = useState<Record<string, DenyState>>({})
  const [postOverrides, setPostOverrides] = useState<Record<string, PostOverrides>>({})
  const [channels, setChannels] = useState<FeedChannelDTO[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const { reportStatus } = useRealtimeStatus()

  const loadedPostIdsRef = useRef<Set<string>>(new Set())

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      setAccessDenied(false)
      setLoadError(null)
      const supabase = createClient()
      const [res, channelsResult] = await Promise.all([
        fetch(`/api/admin/posts?offset=0&limit=${POSTS_PER_PAGE}`, { credentials: 'include' }),
        supabase.from('channels').select('id, name, slug, description').in('slug', ['general', 'aggie-ring', 'fundraising', 'rings', 'jobs-networking', 'jobs', 'promotions', 'events', 'football-tickets', 'tickets']).order('name'),
      ])

      if (res.status === 401 || res.status === 403) {
        setAccessDenied(true)
        setPosts([])
        setTotalCount(0)
        setHasMore(false)
        return
      }

      if (!res.ok) throw new Error('Failed to load admin posts')

      if (channelsResult.data) setChannels(channelsResult.data as FeedChannelDTO[])

      const { data, total } = await res.json()
      const fetched: PostItem[] = data || []
      setPosts(fetched)
      setTotalCount(total)
      setHasMore(fetched.length >= POSTS_PER_PAGE)
      setPage(0)
      setNewPostsAvailable(false)
      loadedPostIdsRef.current = new Set(fetched.map((p) => p.id))
      const overrides: Record<string, PostOverrides> = {}
      fetched.forEach((p) => { overrides[p.id] = { duration: getDefaultDuration(p), channelId: p.channel?.id ?? '' } })
      setPostOverrides(overrides)
    } catch (e) {
      console.error(e)
      setLoadError('Unable to load admin posts right now.')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    const run = async () => {
      await load()
      if (!mounted) return
    }
    run()
    return () => { mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Realtime: watch for new pending posts
  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let mounted = true

    const setup = async () => {
      await supabase.auth.getSession()
      if (!mounted) return

      const channelName = `admin-new-posts-${Math.random().toString(36).slice(2)}`
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
          const status = (payload.new as { approval_status?: string }).approval_status
          const id = (payload.new as { id?: string }).id
          if ((status === 'pending' || status === 'pending_edit') && id && !loadedPostIdsRef.current.has(id)) {
            setNewPostsAvailable(true)
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
          const status = (payload.new as { approval_status?: string }).approval_status
          const id = (payload.new as { id?: string }).id
          if (status === 'pending_edit' && id && !loadedPostIdsRef.current.has(id)) {
            setNewPostsAvailable(true)
          }
        })
        .subscribe((status) => {
          reportStatus(channelName, status)
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtimeOk(false)
          else if (status === 'SUBSCRIBED') setRealtimeOk(true)
        })
    }

    void setup()
    return () => {
      mounted = false
      if (channel) void supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportStatus])

  // Fallback: silently reload every 30s if realtime failed
  useEffect(() => {
    if (realtimeOk) return
    const id = setInterval(() => void load(true), 30_000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeOk])

  const loadMore = async () => {
    if (accessDenied) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const offset = nextPage * POSTS_PER_PAGE
      const res = await fetch(`/api/admin/posts?offset=${offset}&limit=${POSTS_PER_PAGE}`, { credentials: 'include' })
      if (res.status === 401 || res.status === 403) { setAccessDenied(true); setHasMore(false); return }
      if (!res.ok) throw new Error('Failed to load admin posts')
      const { data } = await res.json()
      const fetched: PostItem[] = data || []
      setPosts((prev) => [...prev, ...fetched])
      setPage(nextPage)
      setHasMore(fetched.length >= POSTS_PER_PAGE)
      fetched.forEach((p) => loadedPostIdsRef.current.add(p.id))
      setPostOverrides((prev) => {
        const next = { ...prev }
        fetched.forEach((p) => { next[p.id] = { duration: getDefaultDuration(p), channelId: p.channel?.id ?? '' } })
        return next
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMore(false)
    }
  }

  const removePost = (id: string) => {
    setPosts((p) => p.filter((x) => x.id !== id))
    loadedPostIdsRef.current.delete(id)
    setTotalCount((c) => Math.max(0, c - 1))
    notifyAdminCountChanged()
  }

  const approve = async (id: string) => {
    setActioning(id)
    try {
      const overrides = postOverrides[id]
      const body: Record<string, unknown> = { approve: true }
      if (overrides?.duration) body.duration_days = overrides.duration
      if (overrides?.channelId) body.channel_id = overrides.channelId
      const res = await fetch(`/api/admin/posts/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed')
      removePost(id)
    } catch (e) {
      console.error(e)
    } finally {
      setActioning(null)
    }
  }

  const deny = async (id: string) => {
    const state = denyState[id]
    const parts: string[] = []
    if (state?.selected) {
      state.selected.forEach((r) => { if (r !== 'Other') parts.push(r) })
    }
    const custom = state?.custom?.trim()
    if (custom) parts.push(custom)
    const reason = parts.length > 0 ? parts.join('; ') : undefined
    setActioning(id)
    try {
      const res = await fetch(`/api/admin/posts/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve: false, reason }),
      })
      if (!res.ok) throw new Error('Failed')
      removePost(id)
    } catch (e) {
      console.error(e)
    } finally {
      setActioning(null)
    }
  }

  const toggleDeny = (id: string) => {
    setDenyState((prev) => ({
      ...prev,
      [id]: { open: !prev[id]?.open, selected: prev[id]?.selected ?? new Set(), custom: prev[id]?.custom ?? '' },
    }))
  }

  const toggleDenyReason = (id: string, reason: string) => {
    setDenyState((prev) => {
      const current = prev[id] ?? { open: true, selected: new Set<string>(), custom: '' }
      const next = new Set(current.selected)
      if (next.has(reason)) next.delete(reason)
      else next.add(reason)
      return { ...prev, [id]: { ...current, selected: next } }
    })
  }

  const setDenyCustom = (id: string, custom: string) => {
    setDenyState((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { open: true, selected: new Set<string>() }), custom },
    }))
  }

  return (
    <div className="space-y-6">
      <UserProfileModal
        isOpen={selectedUserId !== null}
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />

      {accessDenied && (
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">You no longer have admin access.</p>
          <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">
            Return to dashboard
          </Link>
        </div>
      )}

      {loadError && !accessDenied && (
        <p className="text-sm text-red-600">{loadError}</p>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Pending Posts</h2>
          <span className="text-sm text-muted-foreground">
            Showing {posts.length} of {totalCount}
          </span>
        </div>

        {newPostsAvailable && (
          <button
            onClick={() => load()}
            className="w-full mb-4 rounded-md border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors"
          >
            New posts have arrived — click to refresh
          </button>
        )}

        {accessDenied ? null : loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground">No pending posts.</p>
        ) : (
          <>
            <ul className="space-y-4">
              {posts.map((post) => {
                const isEditReview = post.approval_status === 'pending_edit'
                const busy = actioning === post.id
                const deny_ = denyState[post.id]

                return (
                  <li key={post.id} className="flex gap-4 items-start">

                    {/* ── Left: post card ───────────────────────────────── */}
                    <div className="flex-1 min-w-0 rounded-lg border bg-card shadow-sm overflow-hidden">
                      {/* Post header */}
                      <div className="px-4 pt-4 pb-3 flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                          {getInitials(post.author?.full_name || 'U')}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-none truncate">
                            {post.author?.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {post.channel?.name || 'Channel'} · {new Date(post.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Post content */}
                      <div className="px-4 pb-4 space-y-2">
                        {isEditReview && post.pending_edit ? (
                          <div className="space-y-3">
                            <div className="rounded border border-muted bg-muted/30 p-3">
                              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Current</p>
                              <p className="font-semibold text-sm">{post.title}</p>
                              <p className="text-sm text-card-subtext mt-1 line-clamp-4 break-words [overflow-wrap:anywhere]">{post.content}</p>
                            </div>
                            <div className="rounded border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 p-3">
                              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1 uppercase tracking-wide">Proposed</p>
                              <p className="font-semibold text-sm">{post.pending_edit.proposed_title}</p>
                              <p className="text-sm text-card-subtext mt-1 line-clamp-4 break-words [overflow-wrap:anywhere]">{post.pending_edit.proposed_content}</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h3 className="font-semibold text-card-header-text">{post.title}</h3>
                            <p className="text-sm text-card-subtext line-clamp-4 break-words [overflow-wrap:anywhere]">{post.content}</p>
                          </>
                        )}

                        {post.images && post.images.length > 0 && (
                          <div className="-mx-4 mt-2">
                            <PostImageGrid images={post.images} postTitle={post.title} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Right: admin action panel ─────────────────────── */}
                    <div className="w-56 shrink-0 rounded-lg border bg-card shadow-sm p-4 flex flex-col gap-3">
                      {/* Badge */}
                      <div>
                        {isEditReview ? (
                          <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                            ✏️ Edit Review
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                            🆕 New Post
                          </span>
                        )}
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {new Date(post.created_at).toLocaleString()}
                        </p>
                      </div>

                      {/* Author post stats */}
                      <div className="rounded-md bg-muted/40 px-3 py-2 flex justify-between text-xs">
                        <span className="text-green-700 dark:text-green-400 font-medium">
                          ✓ {post.author?.posts_approved ?? 0} approved
                        </span>
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          ✕ {post.author?.posts_denied ?? 0} denied
                        </span>
                      </div>

                      {/* View author profile */}
                      {post.author?.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => setSelectedUserId(post.author!.id)}
                          disabled={busy}
                        >
                          View Profile
                        </Button>
                      )}

                      {/* Duration + channel overrides (new posts only) */}
                      {!isEditReview && (
                        <div className="space-y-2">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Duration</p>
                            <div className="flex flex-wrap gap-1">
                              {DURATION_OPTIONS.map((d) => {
                                const isKeep = d === getDefaultDuration(post)
                                return (
                                  <button
                                    key={d}
                                    type="button"
                                    onClick={() => setPostOverrides((prev) => ({ ...prev, [post.id]: { ...prev[post.id], duration: d } }))}
                                    className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                                      postOverrides[post.id]?.duration === d
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background text-foreground border-border hover:bg-muted'
                                    }`}
                                    disabled={busy}
                                  >
                                    {isKeep ? `${d}d (Keep)` : `${d}d`}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Channel</p>
                            <select
                              value={postOverrides[post.id]?.channelId ?? ''}
                              onChange={(e) => setPostOverrides((prev) => ({ ...prev, [post.id]: { ...prev[post.id], channelId: e.target.value } }))}
                              disabled={busy}
                              className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              {channels.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Approve */}
                      <Button
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => approve(post.id)}
                        disabled={busy}
                      >
                        {isEditReview ? 'Apply Edit' : 'Approve'}
                      </Button>

                      {/* Deny section */}
                      <div className="space-y-2">
                        {!deny_?.open ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                            onClick={() => toggleDeny(post.id)}
                            disabled={busy}
                          >
                            {isEditReview ? 'Discard Edit' : 'Deny'} ↓
                          </Button>
                        ) : (
                          <>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Reason (select all that apply)</p>
                            <div className="space-y-1.5">
                              {CANNED_REASONS.map((reason) => (
                                <label key={reason} className="flex items-start gap-2 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-input accent-red-600"
                                    checked={deny_?.selected?.has(reason) ?? false}
                                    onChange={() => toggleDenyReason(post.id, reason)}
                                    disabled={busy}
                                  />
                                  <span className="text-xs text-muted-foreground group-hover:text-foreground leading-snug">{reason}</span>
                                </label>
                              ))}
                            </div>
                            {deny_?.selected?.has('Other') && (
                              <textarea
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                rows={2}
                                placeholder="Custom reason…"
                                value={deny_?.custom ?? ''}
                                onChange={(e) => setDenyCustom(post.id, e.target.value)}
                                disabled={busy}
                              />
                            )}
                            <div className="flex gap-2 pt-1">
                              <Button
                                size="sm"
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => deny(post.id)}
                                disabled={busy}
                              >
                                {isEditReview ? 'Discard' : 'Deny'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="px-2"
                                onClick={() => toggleDeny(post.id)}
                                disabled={busy}
                              >
                                ✕
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                  </li>
                )
              })}
            </ul>

            {hasMore && (
              <div className="mt-6 text-center">
                <Button onClick={loadMore} disabled={loadingMore} variant="outline">
                  {loadingMore ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
