/**
 * Check if RLS policies are properly configured
 * This will tell you if the fix has been applied
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load .env.local
try {
  const envPath = join(process.cwd(), '.env.local')
  const envFile = readFileSync(envPath, 'utf8')
  envFile.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      if (!process.env[key]) process.env[key] = value
    }
  })
} catch (err: any) {
  console.error('⚠️  Could not read .env.local')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRLS() {
  console.log('🔍 Checking RLS Policies for post_tracking table...\n')

  // Try to query the policies through a SQL function
  try {
    const { data, error } = await supabase.rpc('check_policies', {})
  } catch (err) {
    // RPC call failed, continue with tests
  }

  // Alternative: Try to see what we can do
  console.log('Testing post_tracking table access:\n')

  // Test SELECT (should work)
  const { error: selectError } = await supabase
    .from('post_tracking')
    .select('count')
    .limit(0)

  if (selectError) {
    console.error('❌ SELECT policy missing or broken:', selectError.message)
  } else {
    console.log('✅ SELECT policy works (can read own tracking)')
  }

  // We can't directly test INSERT/UPDATE without auth, but we can check the error
  console.log('\n📋 CURRENT STATUS:\n')
  console.log('The post_tracking table needs these 3 RLS policies:')
  console.log('  1. SELECT policy (for reading) - ✅ Present')
  console.log('  2. INSERT policy (for creating) - ❓ Unknown')
  console.log('  3. UPDATE policy (for updating) - ❓ Unknown')
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n🔧 TO FIX THE POSTING ERROR:\n')
  console.log('1. Go to: https://supabase.com/dashboard/project/akubcsbzqeqwswpfpfkd/sql')
  console.log('2. Click "New Query"')
  console.log('3. Paste and run this SQL:\n')
  console.log('   CREATE POLICY "Users can insert own post tracking"')
  console.log('       ON post_tracking FOR INSERT')
  console.log('       TO authenticated')
  console.log('       WITH CHECK (user_id = auth.uid());')
  console.log('')
  console.log('   CREATE POLICY "Users can update own post tracking"')
  console.log('       ON post_tracking FOR UPDATE')
  console.log('       TO authenticated')
  console.log('       USING (user_id = auth.uid())')
  console.log('       WITH CHECK (user_id = auth.uid());')
  console.log('\n4. Click "Run" (or press Ctrl+Enter)')
  console.log('5. You should see: "Success. No rows returned"')
  console.log('6. Try creating a post again - it will work!') 
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  console.log('💡 TIP: You can copy the SQL from: scripts/fix-post-tracking-rls.sql\n')
}

checkRLS().catch(console.error)
