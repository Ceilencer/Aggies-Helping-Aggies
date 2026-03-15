'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { notifyAdminCountChanged } from '@/lib/hooks/useAdminPendingCount'
import type { AdminReportedGroupDTO } from '@/lib/types'

const GROUPS_PER_PAGE = 15

export default function ReportedPostsPage() {
  const [groups, setGroups] = useState<AdminReportedGroupDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [actioning, setActioning] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState('unresolved')
  const [typeFilter, setTypeFilter] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        setAccessDenied(false)
        setLoadError(null)
        let url = `/api/admin/reported-posts?offset=0&limit=${GROUPS_PER_PAGE}&filter=${filter}`
        if (typeFilter) url += `&type=${typeFilter}`
        const res = await fetch(url, { credentials: 'include' })

        if (res.status === 401 || res.status === 403) {
          if (mounted) {
            setAccessDenied(true)
            setGroups([])
            setTotalCount(0)
            setHasMore(false)
          }
          return
        }

        if (!res.ok) throw new Error('Failed to load reported posts')

        const { data, total } = await res.json()
        if (mounted) {
          setGroups(data || [])
          setTotalCount(total)
          setHasMore((data?.length || 0) >= GROUPS_PER_PAGE)
          setPage(0)
          setExpanded(new Set())
        }
      } catch (e) {
        console.error(e)
        if (mounted) setLoadError('Unable to load reported posts right now.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [filter, typeFilter])

  const loadMore = async () => {
    if (accessDenied) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      let url = `/api/admin/reported-posts?offset=${nextPage * GROUPS_PER_PAGE}&limit=${GROUPS_PER_PAGE}&filter=${filter}`
      if (typeFilter) url += `&type=${typeFilter}`
      const res = await fetch(url, { credentials: 'include' })

      if (res.status === 401 || res.status === 403) {
        setAccessDenied(true)
        setHasMore(false)
        return
      }

      if (!res.ok) throw new Error('Failed to load')

      const { data } = await res.json()
      setGroups((prev) => [...prev, ...(data || [])])
      setPage(nextPage)
      setHasMore((data?.length || 0) >= GROUPS_PER_PAGE)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMore(false)
    }
  }

  const resolveGroup = async (group: AdminReportedGroupDTO, action: 'delete' | 'dismiss') => {
    const key = `${group.content_type}:${group.content_id}`
    setActioning(key)
    try {
      const res = await fetch(`/api/admin/reported-posts`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: group.content_type,
          contentId: group.content_id,
          action,
        }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to resolve')
      }
      setGroups((prev) => prev.filter(
        (g) => !(g.content_type === group.content_type && g.content_id === group.content_id)
      ))
      setTotalCount((c) => Math.max(0, c - 1))
      notifyAdminCountChanged()
    } catch (e) {
      console.error(e)
      if (e instanceof Error) alert(e.message)
    } finally {
      setActioning(null)
    }
  }

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-6">

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

      {!accessDenied && (
        <div className="flex gap-4 flex-wrap">
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium">Status:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded border border-input px-2 py-1 text-sm bg-background"
            >
              <option value="unresolved">Unresolved</option>
              <option value="resolved">Resolved</option>
              <option value="all">All</option>
            </select>
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium">Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded border border-input px-2 py-1 text-sm bg-background"
            >
              <option value="">All Types</option>
              <option value="post">Posts Only</option>
              <option value="comment">Comments Only</option>
            </select>
          </div>
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {filter === 'unresolved' ? 'Unresolved' : filter === 'resolved' ? 'Resolved' : 'All'} Reports
          </h2>
          <span className="text-sm text-muted-foreground">
            Showing {groups.length} of {totalCount}
          </span>
        </div>

        {accessDenied ? null : loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="text-muted-foreground">
            No {filter === 'unresolved' ? 'unresolved ' : filter === 'resolved' ? 'resolved ' : ''}reports.
          </p>
        ) : (
          <>
            <ul className="space-y-4">
              {groups.map((group) => {
                const key = `${group.content_type}:${group.content_id}`
                const isExpanded = expanded.has(key)
                const actioning_key = actioning === key

                const contentLabel = group.content_type === 'post' ? 'Post' : 'Comment'
                const title = group.post?.title
                const content = group.post?.content ?? group.comment?.content ?? ''
                const author = group.post?.profiles?.full_name ?? group.comment?.profiles?.full_name ?? 'Unknown'

                return (
                  <li key={key} className="rounded-md border p-4 space-y-3">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                            {contentLabel}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200">
                            {group.report_count} {group.report_count === 1 ? 'report' : 'reports'}
                          </span>
                          {group.is_resolved && (
                            <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                              ✓ {group.resolution_action
                                ? group.resolution_action.charAt(0).toUpperCase() + group.resolution_action.slice(1)
                                : 'Resolved'}
                            </span>
                          )}
                        </div>

                        {title && <p className="text-sm font-medium">{title}</p>}
                        <p className="text-sm text-card-subtext line-clamp-3 break-words [overflow-wrap:anywhere]">
                          {content}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <strong>Author:</strong> {author} &nbsp;·&nbsp;
                          <strong>Last reported:</strong> {new Date(group.latest_report_at).toLocaleString()}
                        </p>
                      </div>

                      {!group.is_resolved && (
                        <div className="flex-shrink-0 flex flex-col gap-2">
                          <button
                            className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-50 hover:bg-red-700"
                            onClick={() => resolveGroup(group, 'delete')}
                            disabled={actioning_key}
                            title="Delete the reported content"
                          >
                            Delete
                          </button>
                          <button
                            className="rounded bg-gray-600 px-3 py-1 text-sm text-white disabled:opacity-50 hover:bg-gray-700"
                            onClick={() => resolveGroup(group, 'dismiss')}
                            disabled={actioning_key}
                            title="Dismiss all reports"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Collapsible report list */}
                    <div>
                      <button
                        onClick={() => toggleExpanded(key)}
                        className="text-xs text-primary hover:underline"
                      >
                        {isExpanded ? 'Hide' : 'Show'} {group.report_count === 1 ? 'report detail' : `all ${group.report_count} reports`}
                      </button>

                      {isExpanded && (
                        <ul className="mt-2 space-y-2">
                          {group.reports.map((r) => (
                            <li key={r.id} className="rounded border border-border bg-muted/30 px-3 py-2 text-xs space-y-0.5">
                              <p><strong>Reason:</strong> {r.reason}</p>
                              {r.description && <p><strong>Details:</strong> {r.description}</p>}
                              <p className="text-muted-foreground">
                                Reported by {r.reporter?.full_name ?? 'Unknown'} · {new Date(r.created_at).toLocaleString()}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                )
              })}
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
