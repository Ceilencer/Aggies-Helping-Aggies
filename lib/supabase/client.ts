import { createBrowserClient } from '@supabase/ssr'

// Module-level singleton — one client for the entire browser session.
// Server-side code must use lib/supabase/server.ts (per-request, cookie-aware).
let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}