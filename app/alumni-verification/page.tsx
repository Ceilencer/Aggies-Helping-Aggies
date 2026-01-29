'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AlumniVerificationPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    graduation_year: new Date().getFullYear(),
    major: '',
    memorable_tradition: '',
    connection_to_tamu: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      // Create temporary user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: Math.random().toString(36).slice(-16), // Temporary password
        options: {
          data: {
            full_name: formData.full_name,
          },
        },
      })

      if (authError) throw authError

      if (authData.user) {
        // Create profile (unverified)
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: formData.email,
            full_name: formData.full_name,
            role: 'Personal',
            is_verified: false,
            is_alumni: true,
            graduation_year: formData.graduation_year,
            major: formData.major,
          })

        if (profileError) throw profileError

        // Submit verification request
        const { error: verificationError } = await supabase
          .from('verification_requests')
          .insert({
            user_id: authData.user.id,
            email: formData.email,
            full_name: formData.full_name,
            graduation_year: formData.graduation_year,
            major: formData.major,
            memorable_tradition: formData.memorable_tradition,
            connection_to_tamu: formData.connection_to_tamu,
            status: 'pending',
          })

        if (verificationError) throw verificationError

        setSubmitted(true)
      }
    } catch (err: any) {
      console.error('Verification submission error:', err)
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
              ✅
            </div>
            <CardTitle className="text-2xl font-bold text-maroon">
              Verification Request Submitted
            </CardTitle>
            <CardDescription>
              Thank you for your submission!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-gray-600">
              Your alumni verification request has been submitted and is pending review by our administrators. 
              You'll receive an email once your account has been approved.
            </p>
            <p className="text-center text-sm text-gray-500">
              This typically takes 1-3 business days.
            </p>
            <Link href="/">
              <Button className="w-full">Return to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-maroon">
                Former Student Verification
              </CardTitle>
              <CardDescription>
                Complete this questionnaire to verify your Aggie status
              </CardDescription>
            </div>
            <div className="text-4xl">🎓</div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="yourname@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="graduation_year">Graduation Year *</Label>
                <Input
                  id="graduation_year"
                  type="number"
                  min="1876"
                  max={new Date().getFullYear() + 10}
                  placeholder="2020"
                  value={formData.graduation_year}
                  onChange={(e) => setFormData({ ...formData, graduation_year: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="major">Major/Field of Study *</Label>
                <Input
                  id="major"
                  type="text"
                  placeholder="Computer Science"
                  value={formData.major}
                  onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="memorable_tradition">
                Describe a memorable Texas A&M tradition you participated in or witnessed *
              </Label>
              <Textarea
                id="memorable_tradition"
                placeholder="Example: Midnight Yell, Silver Taps, Muster, etc. Please provide specific details about your experience."
                value={formData.memorable_tradition}
                onChange={(e) => setFormData({ ...formData, memorable_tradition: e.target.value })}
                className="min-h-[100px]"
                required
              />
              <p className="text-xs text-gray-500">
                Minimum 20 characters. This helps us verify your connection to Texas A&M.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="connection_to_tamu">
                How would you describe your connection to the Aggie community? *
              </Label>
              <Textarea
                id="connection_to_tamu"
                placeholder="Share your Aggie story and what Texas A&M means to you..."
                value={formData.connection_to_tamu}
                onChange={(e) => setFormData({ ...formData, connection_to_tamu: e.target.value })}
                className="min-h-[100px]"
                required
              />
              <p className="text-xs text-gray-500">
                Minimum 20 characters
              </p>
            </div>

            <div className="rounded-lg bg-maroon-50 border border-maroon-200 p-4">
              <h4 className="font-semibold text-maroon mb-2">What happens next?</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Your responses will be reviewed by our administrators</li>
                <li>• You'll receive an email notification once approved (typically 1-3 business days)</li>
                <li>• After approval, you'll be able to reset your password and access the platform</li>
              </ul>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Verification Request'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Have a TAMU email?{' '}
            <Link href="/signup" className="font-medium text-maroon hover:underline">
              Sign up directly
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
