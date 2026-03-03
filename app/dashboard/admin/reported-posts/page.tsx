'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { AdminReportedItemDTO } from '@/lib/types'

type ReportItem = AdminReportedItemDTO

const REPORTS_PER_PAGE = 15

export default function ReportedPostsPage() {
  const [reports, setReports] = useState<ReportItem[]>([])
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

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        setAccessDenied(false)
        setLoadError(null)
        const offset = 0
        const limit = REPORTS_PER_PAGE
        let url = `/api/admin/reported-posts?offset=${offset}&limit=${limit}&filter=${filter}`
        if (typeFilter) {
          url += `&type=${typeFilter}`
        }
        const res = await fetch(url, { credentials: 'include' })

        if (res.status === 401 || res.status === 403) {
          if (mounted) {
            setAccessDenied(true)
            setReports([])
            setTotalCount(0)
            setHasMore(false)
          }
          return
        }

        if (!res.ok) {
          throw new Error('Failed to load reported posts')
        }

        const { data, total } = await res.json()
        if (mounted) {
          setReports(data || [])
          setTotalCount(total)
          setHasMore((data?.length || 0) >= limit)
          setPage(0)
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
      const offset = nextPage * REPORTS_PER_PAGE
      const limit = REPORTS_PER_PAGE
      let url = `/api/admin/reported-posts?offset=${offset}&limit=${limit}&filter=${filter}`
      if (typeFilter) {
        url += `&type=${typeFilter}`
      }
      const res = await fetch(url, { credentials: 'include' })

      if (res.status === 401 || res.status === 403) {
        setAccessDenied(true)
        setHasMore(false)
        return
      }

      if (!res.ok) throw new Error('Failed to load reported posts')

      const { data } = await res.json()
      setReports((prev) => [...prev, ...(data || [])])
      setPage(nextPage)
      setHasMore((data?.length || 0) >= limit)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMore(false)
    }
  }

  const resolveReport = async (reportId: string, action: 'delete' | 'dismiss') => {
    setActioning(reportId)
    try {
      const res = await fetch(`/api/admin/reported-posts`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, action }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to resolve report')
      }
      setReports((p) => p.filter((x) => x.id !== reportId))
      setTotalCount((count) => Math.max(0, count - 1))
    } catch (e) {
      console.error(e)
      if (e instanceof Error && !e.message.includes('Failed to resolve')) {
        alert(e.message)
      }
    } finally {
      setActioning(null)
    }
  }

  const getItemPreview = (report: ReportItem) => {
    if (report.report_type === 'post' && report.posts) {
      return {
        type: 'Post',
        title: report.posts.title,
        content: report.posts.content,
        author: report.posts.profiles?.full_name,
      }
    } else if (report.report_type === 'comment' && report.comments) {
      return {
        type: 'Comment',
        title: undefined,
        content: report.comments.content,
        author: report.comments.profiles?.full_name,
      }
    }
    return { type: 'Unknown', title: undefined, content: '', author: 'Unknown' }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reported Posts & Comments</h1>
        <Link href="/dashboard/admin" className="text-sm text-primary hover:underline">
          ← Back to Admin
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

      {/* Filters */}
      {!accessDenied && (
        <div className="flex gap-4 flex-wrap">
          <div className="flex gap-2">
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
          <div className="flex gap-2">
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
            Showing {reports.length} of {totalCount}
          </span>
        </div>
        {accessDenied ? null : loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : reports.length === 0 ? (
          <p className="text-muted-foreground">No {filter === 'unresolved' ? 'unresolved ' : filter === 'resolved' ? 'resolved ' : ''}reports.</p>
        ) : (
          <>
            <ul className="space-y-4">
              {reports.map((report) => {
                const item = getItemPreview(report)
                return (
                  <li key={report.id} className="rounded-md border p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                            {item.type}
                          </span>
                          {report.is_resolved && (
                            <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                              ✓ {report.resolution_action
                                ? report.resolution_action.charAt(0).toUpperCase() + report.resolution_action.slice(1)
                                : 'Resolved'}
                            </span>
                          )}
                        </div>
                        <div className="mb-2">
                          {item.title && (
                            <h3 className="text-lg font-medium mb-1">{item.title}</h3>
                          )}
                          <p className="text-sm text-card-subtext line-clamp-3 break-words [overflow-wrap:anywhere]">
                            {item.content}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p><strong>Author:</strong> {item.author}</p>
                          <p><strong>Reason:</strong> {report.reason}</p>
                          {report.description && (
                            <p><strong>Details:</strong> {report.description}</p>
                          )}
                          <p><strong>Reported:</strong> {new Date(report.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      {!report.is_resolved && (
                        <div className="ml-4 flex-shrink-0 flex gap-2">
                          <button
                            className="rounded bg-red-600 px-3 py-1 text-white disabled:opacity-50 hover:bg-red-700"
                            onClick={() => resolveReport(report.id, 'delete')}
                            disabled={actioning === report.id}
                            title="Delete the reported item"
                          >
                            Delete
                          </button>
                          <button
                            className="rounded bg-gray-600 px-3 py-1 text-white disabled:opacity-50 hover:bg-gray-700"
                            onClick={() => resolveReport(report.id, 'dismiss')}
                            disabled={actioning === report.id}
                            title="Dismiss the report"
                          >
                            Dismiss
                          </button>
                        </div>
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
