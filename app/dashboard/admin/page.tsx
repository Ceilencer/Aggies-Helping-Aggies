"use client"

import { useEffect, useState } from 'react'

type PostItem = {
  id: string
  title: string
  content: string
  created_at: string
  author?: { id: string; full_name?: string; avatar_url?: string }
  channel?: { id: string; name?: string }
}

export default function AdminDashboardPage() {
  const [posts, setPosts] = useState<PostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/posts', { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        if (mounted) setPosts(data || [])
      } catch (e) {
        console.error(e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

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
    } catch (e) {
      console.error(e)
    } finally {
      setActioning(null)
    }
  }

  const deny = async (id: string) => {
    setActioning(id)
    try {
      const res = await fetch(`/api/posts/${id}/admin-delete`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed')
      setPosts((p) => p.filter((x) => x.id !== id))
    } catch (e) {
      console.error(e)
    } finally {
      setActioning(null)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <section>
        <h2 className="text-lg font-semibold">Pending Posts</h2>
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground">No pending posts.</p>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => (
              <li key={post.id} className="rounded-md border p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="text-lg font-medium">{post.title}</h3>
                    <p className="text-sm text-card-subtext line-clamp-3">{post.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {post.author?.full_name || 'Unknown'} · {post.channel?.name || 'Channel'} · {new Date(post.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex gap-2">
                    <button
                      className="rounded bg-green-600 px-3 py-1 text-white disabled:opacity-50"
                      onClick={() => approve(post.id)}
                      disabled={actioning === post.id}
                    >
                      Approve
                    </button>
                    <button
                      className="rounded bg-red-600 px-3 py-1 text-white disabled:opacity-50"
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
        )}
      </section>
    </div>
  )
}
