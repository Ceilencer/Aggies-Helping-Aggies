/**
 * Supabase Setup Verification Script
 * Run this to check if your Supabase database is properly configured
 * 
 * Usage: npx tsx scripts/verify-supabase.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load .env.local file
try {
  const envPath = join(process.cwd(), '.env.local')
  const envFile = readFileSync(envPath, 'utf8')
  const lines = envFile.split(/\r?\n/)
  
  console.log(`Reading ${lines.length} lines from .env.local:`)
  lines.forEach((line, i) => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      console.log(`  Line ${i + 1}: ${key} = ${value.substring(0, 20)}...`)
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
  console.log('Loaded environment variables from .env.local\n')
} catch (err: any) {
  console.error('⚠️  Could not read .env.local file:', err.message, '\n')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local')
  console.error(`\nCurrent values:`)
  console.error(`  NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl || '(not set)'}`)
  console.error(`  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseKey || '(not set)'}`)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifySetup() {
  console.log('🔍 Verifying Supabase Setup...\n')

  // 1. Check connection
  console.log('1. Testing connection...')
  try {
    const { data, error } = await supabase.from('channels').select('count')
    if (error) throw error
    console.log('✅ Connection successful\n')
  } catch (err: any) {
    console.error('❌ Connection failed:', err.message)
    console.error('Please check your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY\n')
    return
  }

  // 2. Check if channels table exists and has data
  console.log('2. Checking channels table...')
  try {
    const { data: channels, error } = await supabase
      .from('channels')
      .select('*')
    
    if (error) {
      console.error('❌ Channels table error:', error.message)
      console.log('💡 You may need to apply the schema. See instructions below.\n')
    } else if (!channels || channels.length === 0) {
      console.log('⚠️  Channels table exists but is empty')
      console.log('💡 You need to run the initial data insert from supabase-schema.sql\n')
    } else {
      console.log(`✅ Found ${channels.length} channels:`)
      channels.forEach(ch => console.log(`   - ${ch.icon} ${ch.name} (${ch.slug})`))
      console.log()
    }
  } catch (err: any) {
    console.error('❌ Error checking channels:', err.message, '\n')
  }

  // 3. Check if profiles table exists
  console.log('3. Checking profiles table...')
  try {
    const { error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Profiles table error:', error.message)
      console.log('💡 You need to apply the schema from supabase-schema.sql\n')
    } else {
      console.log('✅ Profiles table exists\n')
    }
  } catch (err: any) {
    console.error('❌ Error checking profiles:', err.message, '\n')
  }

  // 4. Check if posts table exists
  console.log('4. Checking posts table...')
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Posts table error:', error.message)
      console.log('💡 You need to apply the schema from supabase-schema.sql\n')
    } else {
      console.log('✅ Posts table exists\n')
    }
  } catch (err: any) {
    console.error('❌ Error checking posts:', err.message, '\n')
  }

  // 5. Check authentication
  console.log('5. Checking authentication...')
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    console.log(`✅ Authenticated as: ${session.user.email}`)
    
    // Check if profile exists for this user
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    
    if (error) {
      console.log(`⚠️  No profile found for user ${session.user.email}`)
      console.log('💡 Profile will be created automatically on first login\n')
    } else {
      console.log(`   Role: ${profile.role}`)
      console.log(`   Verified: ${profile.is_verified}`)
      console.log(`   Alumni: ${profile.is_alumni}`)
      console.log(`   MFA Enabled: ${profile.mfa_enabled}\n`)
    }
  } else {
    console.log('ℹ️  Not currently authenticated (this is OK for now)\n')
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n📋 INSTRUCTIONS TO APPLY SCHEMA:\n')
  console.log('1. Go to your Supabase project dashboard')
  console.log('   https://supabase.com/dashboard/project/akubcsbzqeqwswpfpfkd')
  console.log('')
  console.log('2. Click on the "SQL Editor" in the left sidebar')
  console.log('')
  console.log('3. Click "New Query"')
  console.log('')
  console.log('4. Copy the contents of "supabase-schema.sql" and paste it')
  console.log('')
  console.log('5. Click "Run" or press Ctrl+Enter')
  console.log('')
  console.log('6. Wait for the query to complete (this may take a minute)')
  console.log('')
  console.log('7. Run this script again to verify: npx tsx scripts/verify-supabase.ts')
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

verifySetup().catch(console.error)
