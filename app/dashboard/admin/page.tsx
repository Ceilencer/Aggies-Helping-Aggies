"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'

type PostItem = {
  id: string
  title: string
  content: string
  created_at: string
  approval_status?: string
  is_moderated?: boolean
  author?: { id: string; full_name?: string; avatar_url?: string }
  channel?: { id: string; name?: string }
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

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        setAccessDenied(false)
        setLoadError(null)
        const offset = 0
        const limit = POSTS_PER_PAGE
        const res = await fetch(`/api/admin/posts?offset=${offset}&limit=${limit}`, { credentials: 'include' })

        if (res.status === 401 || res.status === 403) {
          if (mounted) {
            setAccessDenied(true)
            setPosts([])
            setTotalCount(0)
            setHasMore(false)
          }
          return
        }

        if (!res.ok) {
          throw new Error('Failed to load admin posts')
        }

        const { data, total } = await res.json()
        if (mounted) {
          setPosts(data || [])
          setTotalCount(total)
          setHasMore((data?.length || 0) >= limit)
          setPage(0)
        }
      } catch (e) {
        console.error(e)
        if (mounted) setLoadError('Unable to load admin posts right now.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const loadMore = async () => {
    if (accessDenied) return

    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const offset = nextPage * POSTS_PER_PAGE
      const limit = POSTS_PER_PAGE
      const res = await fetch(`/api/admin/posts?offset=${offset}&limit=${limit}`, { credentials: 'include' })

      if (res.status === 401 || res.status === 403) {
        setAccessDenied(true)
        setHasMore(false)
        return
      }

      if (!res.ok) throw new Error('Failed to load admin posts')

      const { data } = await res.json()
      setPosts((prev) => [...prev, ...(data || [])])
      setPage(nextPage)
      setHasMore((data?.length || 0) >= limit)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMore(false)
    }
  }

  const approve = async (id: string) => {
    setActioning(id)
    try {
      const res = await fetch(`/api/admin/posts/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve: true }),
      })
      if (!res.ok) throw new Error('Failed')
      setPosts((p) => p.filter((x) => x.id !== id))
      setTotalCount((count) => Math.max(0, count - 1))
    } catch (e) {
      console.error(e)
    } finally {
      setActioning(null)
    }
  }

  const deny = async (id: string) => {
    setActioning(id)
    try {
      const res = await fetch(`/api/admin/posts/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve: false }),
      })
      if (!res.ok) throw new Error('Failed')
      setPosts((p) => p.filter((x) => x.id !== id))
      setTotalCount((count) => Math.max(0, count - 1))
    } catch (e) {
      console.error(e)
    } finally {
      setActioning(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Link href="/dashboard/admin/reported-posts" className="text-sm text-primary hover:underline font-medium">
          View Reported Posts & Comments →
        </Link>
      </div>

      {accessDenied && (
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">
            You no longer have admin access.
          </p>
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
        {accessDenied ? null : loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground">No pending posts.</p>
        ) : (
          <>
            <ul className="space-y-4">
              {posts.map((post) => (
                <li key={post.id} className="rounded-md border p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-medium">{post.title}</h3>
                        {post.approval_status === 'pending' && (
                          <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                            ⏳ Pending Approval
                          </span>
                        )}
                        {!post.is_moderated && (
                          <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                            ⚠️ Needs Review
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-card-subtext line-clamp-3 break-words [overflow-wrap:anywhere]">{post.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {post.author?.full_name || 'Unknown'} · {post.channel?.name || 'Channel'} · {new Date(post.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex gap-2">
                      <button
                        className="rounded bg-green-600 px-3 py-1 text-white disabled:opacity-50 hover:bg-green-700"
                        onClick={() => approve(post.id)}
                        disabled={actioning === post.id}
                      >
                        Approve
                      </button>
                      <button
                        className="rounded bg-red-600 px-3 py-1 text-white disabled:opacity-50 hover:bg-red-700"
                        onClick={() => deny(post.id)}
                        disabled={actioning === post.id}
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded bg-blue-600 px-6 py-2 text-white disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
