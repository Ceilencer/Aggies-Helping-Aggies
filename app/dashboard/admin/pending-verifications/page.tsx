'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Modal from '@/components/Modal'
import { notifyAdminCountChanged } from '@/lib/hooks/useAdminPendingCount'
import { REJECTION_REASONS } from '@/lib/validations'
import type { AdminUserVerificationDTO } from '@/lib/types'

type PendingUser = AdminUserVerificationDTO

export default function PendingVerificationsPage() {
  const supabase = createClient()

  const [users, setUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [actioning, setActioning] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PendingUser | null>(null)
  const [rejectionReasons, setRejectionReasons] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadUsers = async () => {
    setLoading(true)
    try {
      // Check admin role client-side too
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setAccessDenied(true); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'Admin') { setAccessDenied(true); return }

      // Fetch pending verification requests directly (no profile join needed —
      // profiles don't exist until after approval)
      const { data, error: fetchError } = await supabase
        .from('verification_requests')
        .select('id, user_id, email, full_name, graduation_year, major, memorable_tradition, connection_to_tamu, affiliation, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError

      const mapped: PendingUser[] = (data ?? []).map((row: any) => ({
        id: row.user_id,
        email: row.email,
        full_name: row.full_name,
        created_at: row.created_at,
        verification_request: {
          affiliation:         row.affiliation,
          graduation_year:     row.graduation_year,
          major:               row.major,
          memorable_tradition: row.memorable_tradition,
          connection_to_tamu:  row.connection_to_tamu,
          status:              'pending',
        },
      }))

      setUsers(mapped)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    const setup = async () => {
      await supabase.auth.getSession()
      void loadUsers()

      channel = supabase
        .channel('pending-verifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'verification_requests' },
          () => { void loadUsers() }
        )
        .subscribe()
    }

    void setup()

    return () => {
      if (channel) void supabase.removeChannel(channel)
    }
  }, [])

  const handleAction = async (userId: string, action: 'approve' | 'reject') => {
    setActioning(userId)
    setError(null)
    try {
      const res = await fetch('/api/admin/verify-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action,
          rejectionReasons: action === 'reject' ? rejectionReasons : undefined,
        }),
        credentials: 'include',
      })

      if (!res.ok) {
        const errBody = await res.json()
        throw new Error(errBody.error ?? 'Action failed')
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId))
      setRejectTarget(null)
      setRejectionReasons([])
      notifyAdminCountChanged()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setActioning(null)
    }
  }

if (accessDenied) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You do not have permission to view this page.
      </div>
    )
  }

  return (
    <>
      {/* Reject confirmation modal */}
      <Modal
        isOpen={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        title={`Reject ${rejectTarget?.full_name ?? ''}?`}
        size="md"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Select a reason for rejecting this user&apos;s verification request.
            They will be able to see this reason and resubmit once. A second
            rejection is permanent.
          </p>
          <div className="space-y-2">
            {REJECTION_REASONS.map((r) => (
              <label key={r} className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 shrink-0"
                  checked={rejectionReasons.includes(r)}
                  onChange={(e) =>
                    setRejectionReasons((prev) =>
                      e.target.checked ? [...prev, r] : prev.filter((x) => x !== r)
                    )
                  }
                />
                <span className="text-sm">{r}</span>
              </label>
            ))}
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={actioning === rejectTarget?.id || rejectionReasons.length === 0}
              onClick={() => rejectTarget && handleAction(rejectTarget.id, 'reject')}
            >
              {actioning === rejectTarget?.id ? 'Rejecting…' : 'Confirm Reject'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Pending New Users</h2>
          <p className="text-sm text-muted-foreground">
            Users who signed up with non-TAMU email addresses and submitted a
            verification questionnaire.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : users.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No pending verifications. 🎉
          </p>
        ) : (
          <div className="space-y-4">
            {users.map((u) => (
              <Card key={u.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">{u.full_name}</CardTitle>
                      <CardDescription>{u.email}</CardDescription>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted{' '}
                        {new Date(u.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0 justify-end items-center">
                      <Button
                        size="sm"
                        className="bg-green-600 text-white hover:bg-green-700"
                        disabled={actioning === u.id}
                        onClick={() => handleAction(u.id, 'approve')}
                      >
                        {actioning === u.id ? '…' : 'Approve'}
                      </Button>
                      <Button
                        size="sm"
                        className="bg-red-600 text-white hover:bg-red-700"
                        disabled={actioning === u.id}
                        onClick={() => {
                          setRejectionReasons([])
                          setRejectTarget(u)
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {u.verification_request && (
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { label: 'Affiliation', value: u.verification_request.affiliation },
                        { label: 'Graduation Year', value: u.verification_request.graduation_year?.toString() },
                        { label: 'Major', value: u.verification_request.major },
                        { label: 'Traditions / Memories', value: u.verification_request.memorable_tradition },
                        { label: 'Connection to TAMU', value: u.verification_request.connection_to_tamu },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-md border border-border bg-muted/30 p-3 space-y-0.5 last:sm:col-span-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{value || '—'}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
