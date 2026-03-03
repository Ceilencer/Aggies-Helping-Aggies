'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Modal from '@/components/Modal'
import type { AdminUserVerificationDTO } from '@/lib/types'

type PendingUser = AdminUserVerificationDTO

export default function PendingVerificationsPage() {
  const supabase = createClient()

  const [users, setUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [actioning, setActioning] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PendingUser | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
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

      // Fetch pending profiles with their verification requests (selective DTO columns)
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          created_at,
          verification_requests!verification_requests_user_id_fkey(
            graduation_year,
            major,
            memorable_tradition,
            connection_to_tamu,
            status
          )
        `)
        .eq('account_status', 'pending_approval')
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError

      // Map rows — keep only the most recent pending verification request
      const mapped: PendingUser[] = (data ?? []).map((row: any) => {
        const reqs: any[] = row.verification_requests ?? []
        const pending = reqs.find((r) => r.status === 'pending') ?? reqs[0] ?? null
        return {
          id: row.id,
          email: row.email,
          full_name: row.full_name,
          created_at: row.created_at,
          verification_request: pending,
        }
      })

      setUsers(mapped)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadUsers() }, [])

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
          rejectionReason: action === 'reject' ? rejectionReason : undefined,
        }),
        credentials: 'include',
      })

      if (!res.ok) {
        const errBody = await res.json()
        throw new Error(errBody.error ?? 'Action failed')
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId))
      setRejectTarget(null)
      setRejectionReason('')
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
            Provide a reason for rejecting this user&apos;s verification
            request (optional but recommended).
          </p>
          <Textarea
            placeholder="Reason for rejection…"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
          />
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={actioning === rejectTarget?.id}
              onClick={() => rejectTarget && handleAction(rejectTarget.id, 'reject')}
            >
              {actioning === rejectTarget?.id ? 'Rejecting…' : 'Confirm Reject'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Pending Verifications</h2>
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
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
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
                          setRejectionReason('')
                          setRejectTarget(u)
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {u.verification_request && (
                  <CardContent className="space-y-2 text-sm">
                    {u.verification_request.graduation_year && (
                      <div>
                        <span className="font-medium">Graduation year: </span>
                        {u.verification_request.graduation_year}
                      </div>
                    )}
                    {u.verification_request.major && u.verification_request.major !== 'N/A' && (
                      <div>
                        <span className="font-medium">Major: </span>
                        {u.verification_request.major}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Favourite tradition: </span>
                      {u.verification_request.memorable_tradition}
                    </div>
                    <div>
                      <span className="font-medium">Connection to TAMU: </span>
                      {u.verification_request.connection_to_tamu}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Submitted{' '}
                      {new Date(u.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
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
