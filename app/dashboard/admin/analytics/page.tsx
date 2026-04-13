'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyPoint {
  day: string
  new_users: number
  new_posts: number
  new_comments: number
}

interface Snapshot {
  total_users: number
  total_posts: number
  total_comments: number
  users_this_week: number
  users_this_month: number
  posts_this_week: number
  posts_this_month: number
  comments_this_month: number
  pending_posts: number
  pending_users: number
  role_breakdown: { role: string; cnt: number }[]
  channel_breakdown: { name: string; post_count: number }[]
  post_approval_rate: { approved: number; rejected: number }
  verification_rate: { approved: number; rejected: number }
}

interface ActionLogEntry {
  created_at: string
  actor_id: string
  actor_name: string
  action: string
  target: string
  detail: string | null
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Sparkbar({ data, color = 'bg-primary' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-px h-14">
      {data.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${color} opacity-80`}
          style={{ height: `${Math.max((v / max) * 100, v > 0 ? 4 : 1)}%` }}
        />
      ))}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  subLabel,
}: {
  label: string
  value: number | string
  sub?: number
  subLabel?: string
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4 px-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-bold mt-1 text-card-header-text">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        {sub !== undefined && subLabel && (
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-medium text-foreground">{sub.toLocaleString()}</span> {subLabel}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

const ACTION_META: Record<string, { label: string; color: string }> = {
  approved:              { label: 'Approved Post',       color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  rejected:              { label: 'Rejected Post',       color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  edit_approved:         { label: 'Approved Edit',       color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  edit_rejected:         { label: 'Rejected Edit',       color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  user_approved:         { label: 'Approved User',       color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  user_rejected:         { label: 'Rejected User',       color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  temporary_ban:         { label: 'Temp Ban',            color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  permanent_ban:         { label: 'Permanent Ban',       color: 'bg-red-200 text-red-900 dark:bg-red-900/60 dark:text-red-200' },
  name_change_approved:  { label: 'Name Change ✓',      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  name_change_denied:    { label: 'Name Change ✕',      color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
}

function ActionBadge({ action }: { action: string }) {
  const meta = ACTION_META[action] ?? { label: action, color: 'bg-muted text-muted-foreground' }
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${meta.color}`}>
      {meta.label}
    </span>
  )
}

function RatioBar({ a, b, colorA = 'bg-green-500', colorB = 'bg-red-400' }: { a: number; b: number; colorA?: string; colorB?: string }) {
  const total = a + b
  if (total === 0) return <div className="h-2 rounded-full bg-muted" />
  const pct = Math.round((a / total) * 100)
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden flex">
      <div className={`${colorA} rounded-l-full`} style={{ width: `${pct}%` }} />
      <div className={`${colorB} flex-1 rounded-r-full`} />
    </div>
  )
}

const RANGE_OPTIONS = [
  { label: '7 days',  days: 7  },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
] as const

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [days, setDays] = useState<7 | 30 | 90>(30)
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [daily, setDaily] = useState<DailyPoint[]>([])
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [metricsError, setMetricsError] = useState<string | null>(null)

  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([])
  const [logLoading, setLogLoading] = useState(true)
  const [logError, setLogError] = useState<string | null>(null)
  const [logOffset, setLogOffset] = useState(0)
  const [logHasMore, setLogHasMore] = useState(false)
  const [logLoadingMore, setLogLoadingMore] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  const loadMetrics = useCallback(async (d: number) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setMetricsLoading(true)
    setMetricsError(null)
    try {
      const res = await fetch(`/api/admin/analytics?days=${d}`, {
        credentials: 'include',
        signal: abortRef.current.signal,
      })
      if (!res.ok) throw new Error('Failed to load analytics')
      const json = await res.json()
      setSnapshot(json.snapshot)
      setDaily(json.daily ?? [])
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setMetricsError('Could not load analytics.')
    } finally {
      setMetricsLoading(false)
    }
  }, [])

  const loadActionLog = useCallback(async (offset: number, append = false) => {
    if (!append) setLogLoading(true)
    else setLogLoadingMore(true)
    setLogError(null)
    try {
      const res = await fetch(`/api/admin/analytics/action-log?offset=${offset}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load action log')
      const json = await res.json()
      const rows: ActionLogEntry[] = json.data ?? []
      setActionLog((prev) => append ? [...prev, ...rows] : rows)
      setLogHasMore(json.hasMore)
      setLogOffset(offset)
    } catch {
      setLogError('Could not load action log.')
    } finally {
      setLogLoading(false)
      setLogLoadingMore(false)
    }
  }, [])

  useEffect(() => { void loadMetrics(days) }, [days, loadMetrics])
  useEffect(() => { void loadActionLog(0) }, [loadActionLog])

  // ── Derived sparkbar arrays ─────────────────────────────────────
  const userBars    = daily.map((d) => d.new_users)
  const postBars    = daily.map((d) => d.new_posts)
  const commentBars = daily.map((d) => d.new_comments)

  const totalInPeriod = (key: keyof DailyPoint) =>
    daily.reduce((s, d) => s + (d[key] as number), 0)

  return (
    <div className="space-y-8 pb-12">

      {/* ── Header + range selector ────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Analytics</h2>
          <p className="text-sm text-muted-foreground">Growth, engagement, and admin activity</p>
        </div>
        <div className="flex rounded-md border border-border overflow-hidden text-sm">
          {RANGE_OPTIONS.map(({ label, days: d }) => (
            <button
              key={d}
              onClick={() => setDays(d as 7 | 30 | 90)}
              className={`px-3 py-1.5 transition-colors ${
                days === d
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'bg-background text-foreground hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {metricsError && (
        <p className="text-sm text-red-600 dark:text-red-400">{metricsError}</p>
      )}

      {/* ── Snapshot cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Users"
          value={metricsLoading ? '—' : snapshot?.total_users ?? 0}
          sub={snapshot?.users_this_week}
          subLabel="this week"
        />
        <StatCard
          label="Total Posts"
          value={metricsLoading ? '—' : snapshot?.total_posts ?? 0}
          sub={snapshot?.posts_this_week}
          subLabel="this week"
        />
        <StatCard
          label="Total Comments"
          value={metricsLoading ? '—' : snapshot?.total_comments ?? 0}
          sub={snapshot?.comments_this_month}
          subLabel="this month"
        />
        <StatCard
          label="Pending Queue"
          value={metricsLoading ? '—' : (snapshot ? snapshot.pending_posts + snapshot.pending_users : 0)}
          sub={snapshot?.pending_posts}
          subLabel="posts · pending"
        />
      </div>

      {/* ── Trend charts ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">New Users</CardTitle>
            <p className="text-xs text-muted-foreground">
              {metricsLoading ? '—' : totalInPeriod('new_users').toLocaleString()} in last {days}d
            </p>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {metricsLoading ? (
              <div className="h-14 bg-muted/40 animate-pulse rounded" />
            ) : (
              <Sparkbar data={userBars} color="bg-blue-500" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">New Posts</CardTitle>
            <p className="text-xs text-muted-foreground">
              {metricsLoading ? '—' : totalInPeriod('new_posts').toLocaleString()} in last {days}d
            </p>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {metricsLoading ? (
              <div className="h-14 bg-muted/40 animate-pulse rounded" />
            ) : (
              <Sparkbar data={postBars} color="bg-primary" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">New Comments</CardTitle>
            <p className="text-xs text-muted-foreground">
              {metricsLoading ? '—' : totalInPeriod('new_comments').toLocaleString()} in last {days}d
            </p>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {metricsLoading ? (
              <div className="h-14 bg-muted/40 animate-pulse rounded" />
            ) : (
              <Sparkbar data={commentBars} color="bg-purple-500" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Breakdowns ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

        {/* Role distribution */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">User Roles</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-2">
            {metricsLoading ? (
              <div className="space-y-2">
                {[1,2,3].map((i) => <div key={i} className="h-4 bg-muted/40 animate-pulse rounded" />)}
              </div>
            ) : (snapshot?.role_breakdown ?? []).map(({ role, cnt }) => {
              const total = snapshot!.total_users || 1
              return (
                <div key={role} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{role}</span>
                    <span className="font-medium text-foreground">{cnt.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full"
                      style={{ width: `${Math.round((cnt / total) * 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Channel activity */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Posts by Channel</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-2">
            {metricsLoading ? (
              <div className="space-y-2">
                {[1,2,3].map((i) => <div key={i} className="h-4 bg-muted/40 animate-pulse rounded" />)}
              </div>
            ) : (() => {
              const channels = snapshot?.channel_breakdown ?? []
              const max = Math.max(...channels.map((c) => c.post_count), 1)
              return channels.map(({ name, post_count }) => (
                <div key={name} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground truncate max-w-[70%]">{name}</span>
                    <span className="font-medium text-foreground">{post_count.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full"
                      style={{ width: `${Math.round((post_count / max) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            })()}
          </CardContent>
        </Card>

        {/* Approval rates */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Approval Rates</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-4">
            {metricsLoading ? (
              <div className="space-y-3">
                {[1,2].map((i) => <div key={i} className="h-8 bg-muted/40 animate-pulse rounded" />)}
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Posts</p>
                  {(() => {
                    const { approved, rejected } = snapshot?.post_approval_rate ?? { approved: 0, rejected: 0 }
                    const total = approved + rejected
                    const pct = total > 0 ? Math.round((approved / total) * 100) : 0
                    return (
                      <>
                        <RatioBar a={approved} b={rejected} />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span className="text-green-700 dark:text-green-400">{approved.toLocaleString()} approved</span>
                          <span className="font-medium text-foreground">{pct}%</span>
                          <span className="text-red-600 dark:text-red-400">{rejected.toLocaleString()} rejected</span>
                        </div>
                      </>
                    )
                  })()}
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Alumni Verifications</p>
                  {(() => {
                    const { approved, rejected } = snapshot?.verification_rate ?? { approved: 0, rejected: 0 }
                    const total = approved + rejected
                    const pct = total > 0 ? Math.round((approved / total) * 100) : 0
                    return (
                      <>
                        <RatioBar a={approved} b={rejected} />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span className="text-green-700 dark:text-green-400">{approved.toLocaleString()} approved</span>
                          <span className="font-medium text-foreground">{pct}%</span>
                          <span className="text-red-600 dark:text-red-400">{rejected.toLocaleString()} rejected</span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Admin Action Log ──────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold">Admin Action Log</h3>

        {logError && <p className="text-sm text-red-600 dark:text-red-400">{logError}</p>}

        <Card>
          {logLoading ? (
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Loading action log…
            </CardContent>
          ) : actionLog.length === 0 ? (
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No admin actions recorded yet.
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Time</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Admin</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Action</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Target</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {actionLog.map((entry, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString(undefined, {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                        {entry.actor_name ?? 'Unknown'}
                      </td>
                      <td className="px-4 py-2.5">
                        <ActionBadge action={entry.action} />
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground max-w-xs truncate">
                        {entry.target}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground max-w-xs truncate hidden lg:table-cell">
                        {entry.detail ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {logHasMore && (
                <div className="px-4 py-3 border-t border-border">
                  <button
                    onClick={() => void loadActionLog(logOffset + 50, true)}
                    disabled={logLoadingMore}
                    className="text-sm text-primary hover:underline disabled:opacity-50"
                  >
                    {logLoadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

    </div>
  )
}
