import { type SupabaseClient, type User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

type GuardFailure = {
  error: NextResponse
}

type UserGuardSuccess = {
  user: User
}

type AdminGuardSuccess = {
  user: User
  role: string
}

type RequireAdminOptions = {
  unauthorizedMessage?: string
  profileNotFoundMessage?: string
  profileNotFoundStatus?: 403 | 404
  forbiddenMessage?: string
}

export async function requireAuthenticatedUser(
  supabase: SupabaseClient,
  unauthorizedMessage: string = 'Unauthorized'
): Promise<UserGuardSuccess | GuardFailure> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: NextResponse.json({ error: unauthorizedMessage }, { status: 401 }),
    }
  }

  return { user }
}

export async function requireAdminUser(
  supabase: SupabaseClient,
  options: RequireAdminOptions = {}
): Promise<AdminGuardSuccess | GuardFailure> {
  const {
    unauthorizedMessage = 'Unauthorized',
    profileNotFoundMessage = 'Profile not found',
    profileNotFoundStatus = 404,
    forbiddenMessage = 'Forbidden',
  } = options

  const auth = await requireAuthenticatedUser(supabase, unauthorizedMessage)
  if ('error' in auth) {
    return auth
  }

  const { user } = auth
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return {
      error: NextResponse.json({ error: profileNotFoundMessage }, { status: profileNotFoundStatus }),
    }
  }

  if (profile.role !== 'Admin') {
    return {
      error: NextResponse.json({ error: forbiddenMessage }, { status: 403 }),
    }
  }

  return {
    user,
    role: profile.role,
  }
}