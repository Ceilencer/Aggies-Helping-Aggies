"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { getInitials, getRoleBadgeColor } from "@/lib/utils"
import { notifyAdminCountChanged } from "@/lib/hooks/useAdminPendingCount"
import { createClient } from "@/lib/supabase/client"
import { useRealtimeStatus } from "@/lib/realtime/RealtimeStatusContext"
import { cn } from "@/lib/utils"

interface NameChangeRequest {
  id: string
  user_id: string
  current_name: string
  requested_name: string
  reason?: string
  created_at: string
  user: {
    id: string
    full_name: string
    email: string
    role: string
    avatar_url?: string
  }
}

export default function NameChangeRequestsPage() {
  const [requests, setRequests] = useState<NameChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<string | null>(null)
  const [denyingId, setDenyingId] = useState<string | null>(null)
  const [denialReason, setDenialReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [newRequestsAvailable, setNewRequestsAvailable] = useState(false)
  const loadedIdsRef = useRef<Set<string>>(new Set())
  const supabase = createClient()
  const { reportStatus } = useRealtimeStatus()

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError(null)
      const res = await fetch("/api/admin/name-change-requests", { credentials: "include" })
      if (res.status === 401 || res.status === 403) { setError("Access denied."); return }
      if (!res.ok) throw new Error("Failed to load requests")
      const data: NameChangeRequest[] = await res.json()
      setRequests(data)
      loadedIdsRef.current = new Set(data.map((r) => r.id))
      setNewRequestsAvailable(false)
    } catch {
      setError("Unable to load name change requests.")
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Realtime: watch for new pending requests
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let mounted = true

    const setup = async () => {
      await supabase.auth.getSession()
      if (!mounted) return

      const channelName = `admin-name-changes-${Math.random().toString(36).slice(2)}`
      channel = supabase
        .channel(channelName)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "name_change_requests" }, (payload) => {
          const id = (payload.new as { id?: string }).id
          if (id && !loadedIdsRef.current.has(id)) setNewRequestsAvailable(true)
        })
        .subscribe((status) => {
          reportStatus(channelName, status)
        })
    }

    void setup()
    return () => {
      mounted = false
      if (channel) void supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportStatus])

  const resolve = async (id: string, action: "approve" | "deny") => {
    setActioning(id)
    try {
      const body: Record<string, string> = { action }
      if (action === "deny" && denialReason.trim()) body.denial_reason = denialReason.trim()

      const res = await fetch(`/api/admin/name-change-requests/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Failed")
      setRequests((prev) => prev.filter((r) => r.id !== id))
      loadedIdsRef.current.delete(id)
      setDenyingId(null)
      setDenialReason("")
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
        <h2 className="text-lg font-semibold">Name Change Requests</h2>
        <span className="text-sm text-muted-foreground">{requests.length} pending</span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {newRequestsAvailable && (
        <button
          onClick={() => load()}
          className="w-full rounded-md border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors"
        >
          New requests have arrived — click to refresh
        </button>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="text-muted-foreground">No pending name change requests.</p>
      ) : (
        <ul className="space-y-3">
          {requests.map((req) => {
            const busy = actioning === req.id
            const isDenying = denyingId === req.id

            return (
              <li key={req.id} className="flex gap-4 items-start">
                {/* Request card */}
                <div className="flex-1 min-w-0 rounded-lg border bg-card shadow-sm p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                      {getInitials(req.user?.full_name || "U")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{req.user?.full_name}</p>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", getRoleBadgeColor(req.user?.role as any))}>
                          {req.user?.role}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{req.user?.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md bg-muted/50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Current Name</p>
                      <p className="font-medium text-card-header-text">{req.current_name}</p>
                    </div>
                    <div className="rounded-md bg-blue-500/10 border border-blue-400/30 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">Requested Name</p>
                      <p className="font-medium text-card-header-text">{req.requested_name}</p>
                    </div>
                  </div>

                  {req.reason && (
                    <div className="mt-3 rounded-md bg-muted/40 border border-border px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">User's Reason</p>
                      <p className="text-sm text-card-header-text">{req.reason}</p>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-2">
                    Submitted {new Date(req.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>

                {/* Action panel */}
                <div className="w-44 shrink-0 rounded-lg border bg-card shadow-sm p-3 flex flex-col gap-2">
                  <Button
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => resolve(req.id, "approve")}
                    disabled={busy || isDenying}
                  >
                    Approve
                  </Button>

                  {!isDenying ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                      onClick={() => { setDenyingId(req.id); setDenialReason("") }}
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
                        onChange={(e) => setDenialReason(e.target.value)}
                        disabled={busy}
                      />
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs"
                          onClick={() => resolve(req.id, "deny")}
                          disabled={busy}
                        >
                          Deny
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="px-2 text-xs"
                          onClick={() => { setDenyingId(null); setDenialReason("") }}
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
          })}
        </ul>
      )}
    </div>
  )
}
