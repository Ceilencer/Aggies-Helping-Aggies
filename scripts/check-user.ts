/**
 * Supabase User Diagnostics Script
 * Tests your user account and permissions for posting
 * 
 * Usage: npm run check-user YOUR_EMAIL
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load .env.local file
try {
  const envPath = join(process.cwd(), '.env.local')
  const envFile = readFileSync(envPath, 'utf8')
  const lines = envFile.split(/\r?\n/)
  
  lines.forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
} catch (err: any) {
  console.error('⚠️  Could not read .env.local file:', err.message, '\n')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUser(email?: string) {
  console.log('🔍 Checking User Permissions for Posting...\n')

  // Get current user
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session && !email) {
    console.error('❌ Not authenticated and no email provided')
    console.error('Usage: npm run check-user YOUR_EMAIL')
    console.error('Or log in first and run: npm run check-user')
    process.exit(1)
  }

  let userId: string
  let userEmail: string

  if (session) {
    userId = session.user.id
    userEmail = session.user.email!
    console.log('✅ Found authenticated session')
    console.log(`   User ID: ${userId}`)
    console.log(`   Email: ${userEmail}\n`)
  } else {
    // Look up user by email
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .limit(1)

    if (error || !profiles || profiles.length === 0) {
      console.error(`❌ No user found with email: ${email}`)
      process.exit(1)
    }

    userId = profiles[0].id
    userEmail = profiles[0].email
    console.log('ℹ️  Found user by email (not authenticated)')
    console.log(`   User ID: ${userId}`)
    console.log(`   Email: ${userEmail}\n`)
  }

  // Check profile
  console.log('1. Checking profile...')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    console.error('❌ Profile not found or error:', profileError?.message)
    process.exit(1)
  }

  console.log('✅ Profile found:')
  console.log(`   Role: ${profile.role}`)
  console.log(`   Verified: ${profile.is_verified ? '✅ YES' : '❌ NO'}`)
  console.log(`   Alumni: ${profile.is_alumni ? 'YES' : 'NO'}`)
  console.log(`   MFA Enabled: ${profile.mfa_enabled ? 'YES' : 'NO'}`)
  console.log()

  if (!profile.is_verified) {
    console.log('⚠️  WARNING: Account is NOT VERIFIED')
    console.log('   You cannot create posts until verified.\n')
    console.log('📋 TO FIX: Run this SQL in Supabase SQL Editor:')
    console.log(`   UPDATE profiles SET is_verified = TRUE WHERE id = '${userId}';`)
    console.log()
  }

  // Check channels
  console.log('2. Checking channels...')
  const { data: channels, error: channelsError } = await supabase
    .from('channels')
    .select('*')

  if (channelsError || !channels || channels.length === 0) {
    console.error('❌ No channels found')
    console.log('   Run scripts/insert-channels.sql in Supabase SQL Editor')
    process.exit(1)
  }

  console.log(`✅ Found ${channels.length} channels:`)
  channels.forEach(ch => {
    const access = ch.requires_mfa && !profile.mfa_enabled ? '🔒 MFA Required' : '✅ Can post'
    console.log(`   ${ch.icon} ${ch.name} - ${access}`)
  })
  console.log()

  // Check post limits
  console.log('3. Checking post limits...')
  const { data: tracking } = await supabase
    .from('post_tracking')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (tracking) {
    console.log(`✅ Post tracking record found:`)
    console.log(`   Daily posts: ${tracking.daily_post_count}`)
    console.log(`   Monthly posts: ${tracking.monthly_post_count}`)
    console.log(`   Last daily reset: ${new Date(tracking.last_daily_reset).toLocaleDateString()}`)
    console.log(`   Last monthly reset: ${new Date(tracking.last_monthly_reset).toLocaleDateString()}`)
  } else {
    console.log('ℹ️  No post tracking record yet (will be created on first post)')
  }
  console.log()

  // Test RLS policies
  console.log('4. Testing RLS policies (read access)...')
  
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('count')
    .limit(1)

  if (postsError) {
    console.error('❌ Cannot read posts table:', postsError.message)
    console.log('   This suggests an RLS policy issue')
  } else {
    console.log('✅ Can read posts table')
  }
  console.log()

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n📊 SUMMARY\n')

  const canPost = profile.is_verified
  
  if (canPost) {
    console.log('✅ This user CAN create posts!')
    console.log(`   Limits: ${getLimits(profile.role)}`)
  } else {
    console.log('❌ This user CANNOT create posts yet')
    console.log('\n🔧 TO FIX:')
    console.log('   1. Verify the account:')
    console.log(`      UPDATE profiles SET is_verified = TRUE WHERE id = '${userId}';`)
    console.log()
    console.log('   2. Or use the alumni verification process')
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

function getLimits(role: string): string {
  switch (role) {
    case 'Personal':
      return '2 posts/day, 60 posts/month'
    case 'Charity':
      return '1 post/day, 30 posts/month'
    case 'Business':
      return '1 post/month'
    case 'Admin':
      return 'Unlimited'
    default:
      return 'Unknown'
  }
}

const email = process.argv[2]
checkUser(email).catch(console.error)
