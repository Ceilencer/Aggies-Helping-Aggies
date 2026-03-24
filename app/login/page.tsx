'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [facebookLoading, setFacebookLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'auth_failed') {
      setError('Authentication failed. Please try again.')
    } else if (errorParam === 'banned') {
      setError('This account has been permanently banned after two failed verification attempts.')
    }
  }, [searchParams])

  const handleFacebookSignIn = async () => {
    setError('')
    setFacebookLoading(true)

    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback?next=/dashboard`
          : undefined

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo,
          scopes: 'email,public_profile',
          queryParams: {
            // Forces Facebook to re-request any scopes not yet granted,
            // e.g. users who first authorized without an email on their account.
            auth_type: 'rerequest',
          },
        },
      })

      if (signInError) throw signInError
    } catch (err: any) {
      console.error('Facebook sign-in error:', err)
      setError(err.message || 'Failed to sign in with Facebook')
      setFacebookLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)

    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback?next=/dashboard`
          : undefined

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            // Note: `hd` is intentionally omitted so non-TAMU Google accounts
            // can also sign in and go through the manual verification flow.
          },
        },
      })

      if (signInError) throw signInError
    } catch (err: any) {
      console.error('Google sign-in error:', err)
      setError(err.message || 'Failed to sign in with Google')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--background-login))]">
      <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 w-16">
            <Image
              src="/images/logos/logo-no-text.svg"
              alt="Howdy Helps logo"
              width={693}
              height={500}
              className="w-full h-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-page-heading">
            Howdy Ags!
          </CardTitle>
          <CardDescription>
            Sign in to join the community. TAMU accounts (@tamu.edu)
            get instant access; all other accounts will be reviewed
            by our team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/30 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <Button
              type="button"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={loading || facebookLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="var(--google-blue)"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="var(--google-green)"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="var(--google-yellow)"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="var(--google-red)"
                />
              </svg>
              {loading ? 'Signing in...' : 'Sign in with Google'}
            </Button>

            <Button
              type="button"
              className="w-full"
              style={{ backgroundColor: '#1877F2', color: '#fff' }}
              onClick={handleFacebookSignIn}
              disabled={facebookLoading || loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.885v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
              </svg>
              {facebookLoading ? 'Signing in...' : 'Sign in with Facebook'}
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground pt-2">
            By signing in you agree to our{' '}
            <Link href="/terms" className="underline hover:text-foreground">
              Terms and Conditions
            </Link>{' '}
            and{' '}
            <Link href="/privacy-policy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </p>
        </CardContent>
      </Card>
      </div>
      <footer className="py-4 text-center">
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/privacy-policy" className="underline hover:opacity-80">Privacy Policy</Link>
          <span aria-hidden="true">&middot;</span>
          <Link href="/terms" className="underline hover:opacity-80">Terms and Conditions</Link>
        </div>
      </footer>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background-login))] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 w-16">
              <Image
                src="/images/logos/logo-no-text.svg"
                alt="Howdy Helps logo"
                width={693}
                height={500}
                className="w-full h-auto"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">
              Loading...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
