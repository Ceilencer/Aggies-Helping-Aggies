"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { Profile, UserRole } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

export function UserProfile() {
  const [profile, setProfile] = React.useState<Profile | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isEditing, setIsEditing] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const { showToast, ToastContainer } = useToast()

  // Form state for editable fields
  const [formData, setFormData] = React.useState({
    full_name: "",
    is_alumni: false,
    graduation_year: undefined as number | undefined,
    major: "",
    mfa_enabled: false,
  })

  const supabase = createClient()

  // Fetch profile data on mount
  React.useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError("No authenticated user found")
        return
      }

      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (fetchError) throw fetchError

      setProfile(data)
      setFormData({
        full_name: data.full_name || "",
        is_alumni: data.is_alumni || false,
        graduation_year: data.graduation_year,
        major: data.major || "",
        mfa_enabled: data.mfa_enabled || false,
      })
    } catch (err) {
      console.error("Error fetching profile:", err)
      setError(err instanceof Error ? err.message : "Failed to load profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        is_alumni: profile.is_alumni || false,
        graduation_year: profile.graduation_year,
        major: profile.major || "",
        mfa_enabled: profile.mfa_enabled || false,
      })
    }
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!profile) return

    try {
      setIsSaving(true)

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          is_alumni: formData.is_alumni,
          graduation_year: formData.graduation_year || null,
          major: formData.major,
          mfa_enabled: formData.mfa_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      if (updateError) throw updateError

      // Update local state
      setProfile({
        ...profile,
        ...formData,
      })

      setIsEditing(false)
      showToast({
        message: "Profile updated successfully!",
        type: "success",
      })
    } catch (err) {
      console.error("Error updating profile:", err)
      showToast({
        message: err instanceof Error ? err.message : "Failed to update profile",
        type: "error",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getRoleBadgeColor = (role: UserRole) => {
    const colors = {
      Personal: "bg-blue-100 text-blue-800",
      Business: "bg-purple-100 text-purple-800",
      Charity: "bg-green-100 text-green-800",
      Admin: "bg-red-100 text-red-800",
    }
    return colors[role] || "bg-gray-100 text-gray-800"
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-maroon border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !profile) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-red-600">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error || "Profile not found"}</p>
          <Button onClick={fetchProfile} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <ToastContainer />
      <Card className="max-w-2xl mx-auto mt-8">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>User Profile</CardTitle>
              <CardDescription>View and manage your profile information</CardDescription>
            </div>
            <div className="flex gap-2">
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold",
                getRoleBadgeColor(profile.role)
              )}>
                {profile.role}
              </span>
              {profile.is_verified && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 flex items-center gap-1">
                  ✓ Verified
                </span>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Verification warning banner */}
          {!profile.is_verified && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <span className="text-yellow-600 text-xl">⚠️</span>
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Your account is pending verification.
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Some features may be limited until your account is verified.
                </p>
              </div>
            </div>
          )}

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed here for security reasons.
            </p>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            {isEditing ? (
              <Input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Enter your full name"
              />
            ) : (
              <Input
                id="full_name"
                type="text"
                value={profile.full_name}
                disabled
                className="bg-gray-50"
              />
            )}
          </div>

          {/* Major */}
          <div className="space-y-2">
            <Label htmlFor="major">Major</Label>
            {isEditing ? (
              <Input
                id="major"
                type="text"
                value={formData.major}
                onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                placeholder="Enter your major"
              />
            ) : (
              <Input
                id="major"
                type="text"
                value={profile.major || "Not specified"}
                disabled
                className="bg-gray-50"
              />
            )}
          </div>

          {/* Graduation Year */}
          <div className="space-y-2">
            <Label htmlFor="graduation_year">Graduation Year</Label>
            {isEditing ? (
              <Input
                id="graduation_year"
                type="number"
                value={formData.graduation_year || ""}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  graduation_year: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                placeholder="Enter graduation year"
                min="1900"
                max="2100"
              />
            ) : (
              <Input
                id="graduation_year"
                type="text"
                value={profile.graduation_year?.toString() || "Not specified"}
                disabled
                className="bg-gray-50"
              />
            )}
          </div>

          {/* Alumni Status (toggle) */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="is_alumni" className="text-base">Alumni Status</Label>
              <p className="text-xs text-muted-foreground">
                Are you a Texas A&M alumnus?
              </p>
            </div>
            {isEditing ? (
              <button
                id="is_alumni"
                type="button"
                role="switch"
                aria-checked={formData.is_alumni}
                onClick={() => setFormData({ ...formData, is_alumni: !formData.is_alumni })}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  formData.is_alumni ? "bg-maroon" : "bg-gray-200"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    formData.is_alumni ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            ) : (
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold",
                profile.is_alumni 
                  ? "bg-green-100 text-green-800" 
                  : "bg-gray-100 text-gray-800"
              )}>
                {profile.is_alumni ? "Yes" : "No"}
              </span>
            )}
          </div>

          {/* MFA Enabled (toggle) */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="mfa_enabled" className="text-base">
                Multi-Factor Authentication
              </Label>
              <p className="text-xs text-muted-foreground">
                Enable MFA for enhanced security (UI only for now)
              </p>
            </div>
            {isEditing ? (
              <button
                id="mfa_enabled"
                type="button"
                role="switch"
                aria-checked={formData.mfa_enabled}
                onClick={() => setFormData({ ...formData, mfa_enabled: !formData.mfa_enabled })}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  formData.mfa_enabled ? "bg-maroon" : "bg-gray-200"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    formData.mfa_enabled ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            ) : (
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold",
                profile.mfa_enabled 
                  ? "bg-green-100 text-green-800" 
                  : "bg-gray-100 text-gray-800"
              )}>
                {profile.mfa_enabled ? "Enabled" : "Disabled"}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            {!isEditing ? (
              <Button onClick={handleEdit} className="w-full">
                Edit Profile
              </Button>
            ) : (
              <>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <Button 
                  onClick={handleCancel} 
                  variant="outline"
                  disabled={isSaving}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>

          {/* Additional info */}
          <div className="pt-4 border-t space-y-1">
            <p className="text-xs text-muted-foreground">
              Account created: {new Date(profile.created_at).toLocaleDateString()}
            </p>
            {profile.updated_at && (
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(profile.updated_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
