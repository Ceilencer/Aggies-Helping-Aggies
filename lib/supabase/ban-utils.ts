import { SupabaseClient } from '@supabase/supabase-js'

export async function checkUserBan(userId: string, supabase: SupabaseClient) {
  try {
    const { data: activeBan, error } = await supabase
      .from('user_bans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .or(`ban_type.eq.permanent,expires_at.gt.${new Date().toISOString()}`)
      .single()

    // No active ban found is not an error
    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return {
      isBanned: !!activeBan,
      ban: activeBan,
    }
  } catch (err) {
    console.error('Error checking user ban status:', err)
    throw err
  }
}

export function formatBanMessage(ban: any): string {
  if (!ban) return ''

  if (ban.ban_type === 'permanent') {
    return `You are permanently banned from this platform. Reason: ${ban.reason}`
  }

  if (ban.expires_at) {
    const expiresDate = new Date(ban.expires_at)
    const now = new Date()
    const daysRemaining = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return `You are temporarily banned from this platform for ${daysRemaining} more day${daysRemaining !== 1 ? 's' : ''}. Reason: ${ban.reason}`
  }

  return `You are banned from this platform. Reason: ${ban.reason}`
}
