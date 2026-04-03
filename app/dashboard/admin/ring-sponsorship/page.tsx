'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { notifyAdminCountChanged } from '@/lib/hooks/useAdminPendingCount'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeStatus } from '@/lib/realtime/RealtimeStatusContext'
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

interface Application {
  id: string
  full_name: string
  email: string
  phone: string
  address_street: string
  address_city: string
  address_state: string
  address_zip: string
  uin: string
  invoice_number: string | null
  ring_type: string
  credit_hours: number
  ring_day_cycle: string
  graduation_date: string
  degree: string
  major: string
  family_name: string
  family_address: string
  family_email: string
  family_phone: string
  monthly_income: number
  dependents_count: number
  household_income: number | null
  court_ordered_payments: string | null
  monthly_obligations: string | null
  community_involvement: string | null
  university_involvement: string | null
  employment_history: string
  story: string
  social_media_consent: boolean
  created_at: string
}

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  )
}

function ApplicationCard({
  app,
  busy,
  isDenying,
  denialReason,
  onApprove,
  onStartDeny,
  onConfirmDeny,
  onCancelDeny,
  onDenialReasonChange,
}: {
  app: Application
  busy: boolean
  isDenying: boolean
  denialReason: string
  onApprove: () => void
  onStartDeny: () => void
  onConfirmDeny: () => void
  onCancelDeny: () => void
  onDenialReasonChange: (v: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const lastName = app.full_name.split(' ').pop() ?? app.full_name
  const directoryUrl = `https://directory.tamu.edu/?branch=people&cn=${encodeURIComponent(lastName)}`
  const ringLabel = app.ring_type === 'large' ? 'Large Ring' : app.ring_type === 'small' ? 'Small Ring' : app.ring_type

  return (
    <li className="flex gap-4 items-start">
      {/* Application card */}
      <div className="flex-1 min-w-0 rounded-lg border bg-card shadow-sm p-4 space-y-3">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-sm">{app.full_name}</p>
            <p className="text-xs text-muted-foreground">{app.email}</p>
          </div>
          <a
            href={directoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 hover:bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors"
          >
            <ExternalLink size={12} />
            TAMU Directory
          </a>
        </div>

        {/* Academic summary — always visible */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Credit Hours</p>
            <p className="text-sm font-medium">{app.credit_hours}</p>
          </div>
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Ring Type</p>
            <p className="text-sm font-medium">{ringLabel}</p>
          </div>
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Ring Day Cycle</p>
            <p className="text-sm font-medium">{app.ring_day_cycle}</p>
          </div>
        </div>

        {/* Story — always visible */}
        <div className="rounded-md bg-muted/40 border border-border px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Story</p>
          <p className="text-sm whitespace-pre-wrap">{app.story}</p>
        </div>

        {/* Expand/collapse full application */}
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Hide full application' : 'View full application'}
        </button>

        {expanded && (
          <div className="space-y-4 border-t border-border pt-3">

            {/* Personal Info */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Personal Information</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <DetailRow label="Phone" value={app.phone} />
                <DetailRow label="UIN" value={app.uin} />
                <DetailRow label="Address" value={`${app.address_street}, ${app.address_city}, ${app.address_state} ${app.address_zip}`} />
                <DetailRow label="Invoice Number" value={app.invoice_number} />
              </div>
            </div>

            {/* Academic Info */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Academic Information</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <DetailRow label="Degree" value={app.degree} />
                <DetailRow label="Major" value={app.major} />
                <DetailRow label="Graduation Date" value={app.graduation_date} />
              </div>
            </div>

            {/* Family Contact */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Family Contact</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <DetailRow label="Name" value={app.family_name} />
                <DetailRow label="Phone" value={app.family_phone} />
                <DetailRow label="Email" value={app.family_email} />
                <DetailRow label="Address" value={app.family_address} />
              </div>
            </div>

            {/* Financial Info */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Financial Information</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <DetailRow label="Monthly Income" value={`$${app.monthly_income.toLocaleString()}`} />
                <DetailRow label="Dependents" value={app.dependents_count} />
                <DetailRow label="Household Income" value={app.household_income != null ? `$${app.household_income.toLocaleString()}` : null} />
                <DetailRow label="Court-Ordered Payments" value={app.court_ordered_payments} />
                <DetailRow label="Monthly Obligations" value={app.monthly_obligations} />
              </div>
            </div>

            {/* Involvement */}
            {(app.community_involvement || app.university_involvement || app.employment_history) && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Involvement & Employment</p>
                <div className="space-y-2">
                  <DetailRow label="Community Involvement" value={app.community_involvement} />
                  <DetailRow label="University Involvement" value={app.university_involvement} />
                  <DetailRow label="Employment History" value={app.employment_history} />
                </div>
              </div>
            )}

            {/* Consent */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Social Media Consent</p>
              <p className="text-sm">{app.social_media_consent ? 'Granted' : 'Not granted'}</p>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Submitted {new Date(app.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Action panel */}
      <div className="w-44 shrink-0 rounded-lg border bg-card shadow-sm p-3 flex flex-col gap-2">
        <Button
          size="sm"
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          onClick={onApprove}
          disabled={busy || isDenying}
        >
          Approve
        </Button>

        {!isDenying ? (
          <Button
            size="sm"
            variant="outline"
            className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
            onClick={onStartDeny}
            disabled={busy}
          >
            Deny ↓
          </Button>
        ) : (
          <div className="space-y-2">
            <textarea
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={2}
              placeholder="Reason (optional)"
              value={denialReason}
              onChange={e => onDenialReasonChange(e.target.value)}
              disabled={busy}
            />
            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs"
                onClick={onConfirmDeny}
                disabled={busy}
              >
                Deny
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="px-2 text-xs"
                onClick={onCancelDeny}
                disabled={busy}
              >
                ✕
              </Button>
            </div>
          </div>
        )}
      </div>
    </li>
  )
}

export default function RingSponsorshipPage() {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<string | null>(null)
  const [denyingId, setDenyingId] = useState<string | null>(null)
  const [denialReason, setDenialReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [newAvailable, setNewAvailable] = useState(false)
  const [realtimeOk, setRealtimeOk] = useState(true)
  const loadedIdsRef = useRef<Set<string>>(new Set())
  const supabase = createClient()
  const { reportStatus } = useRealtimeStatus()

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/ring-sponsorship', { credentials: 'include' })
      if (res.status === 401 || res.status === 403) { setError('Access denied.'); return }
      if (!res.ok) throw new Error()
      const data: Application[] = await res.json()
      setApps(data)
      loadedIdsRef.current = new Set(data.map((a) => a.id))
      setNewAvailable(false)
    } catch {
      setError('Unable to load applications.')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Fallback: poll every 30s if realtime failed
  useEffect(() => {
    if (realtimeOk) return
    const id = setInterval(() => void load(true), 30_000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeOk])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let mounted = true

    const setup = async () => {
      await supabase.auth.getSession()
      if (!mounted) return

      const channelName = `admin-ring-sponsorship-${Math.random().toString(36).slice(2)}`
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ring_sponsorship_applications' }, (payload) => {
          const id = (payload.new as { id?: string }).id
          if (id && !loadedIdsRef.current.has(id)) setNewAvailable(true)
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

  const resolve = async (id: string, action: 'approve' | 'deny') => {
    setActioning(id)
    try {
      const body: Record<string, string> = { action }
      if (action === 'deny' && denialReason.trim()) body.denial_reason = denialReason.trim()

      const res = await fetch(`/api/admin/ring-sponsorship/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      setApps((prev) => prev.filter((a) => a.id !== id))
      loadedIdsRef.current.delete(id)
      setDenyingId(null)
      setDenialReason('')
      notifyAdminCountChanged()
    } catch {
      // leave item in list so admin can retry
    } finally {
      setActioning(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ring Sponsorship Applications</h2>
        <span className="text-sm text-muted-foreground">{apps.length} pending</span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {newAvailable && (
        <button
          onClick={() => load()}
          className="w-full rounded-md border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors"
        >
          New applications have arrived — click to refresh
        </button>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : apps.length === 0 ? (
        <p className="text-muted-foreground">No pending ring sponsorship applications.</p>
      ) : (
        <ul className="space-y-3">
          {apps.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              busy={actioning === app.id}
              isDenying={denyingId === app.id}
              denialReason={denyingId === app.id ? denialReason : ''}
              onApprove={() => resolve(app.id, 'approve')}
              onStartDeny={() => { setDenyingId(app.id); setDenialReason('') }}
              onConfirmDeny={() => resolve(app.id, 'deny')}
              onCancelDeny={() => { setDenyingId(null); setDenialReason('') }}
              onDenialReasonChange={setDenialReason}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
