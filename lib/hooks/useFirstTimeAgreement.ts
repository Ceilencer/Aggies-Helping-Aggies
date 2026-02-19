import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'

export function useFirstTimeAgreement(user: Profile | null) {
  const [isOpen, setIsOpen] = useState(!user?.rules_acknowledged_at)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAgree = useCallback(async () => {
    if (!user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          rules_acknowledged_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      setIsOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save agreement'
      setError(message)
      console.error('Error accepting terms:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  return {
    isOpen,
    isLoading,
    error,
    setIsOpen,
    handleAgree,
  }
}
