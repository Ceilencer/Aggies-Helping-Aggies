"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { Profile, UserRole, ContactVisibility } from "@/lib/types"
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
    // Contact info
    contact_email: "",
    contact_email_visibility: "private" as ContactVisibility,
    phone_number: "",
    phone_number_visibility: "private" as ContactVisibility,
    instagram_handle: "",
    instagram_visibility: "private" as ContactVisibility,
    discord_username: "",
    discord_visibility: "private" as ContactVisibility,
    facebook_url: "",
    facebook_visibility: "private" as ContactVisibility,
    linkedin_url: "",
    linkedin_visibility: "private" as ContactVisibility,
    twitter_handle: "",
    twitter_visibility: "private" as ContactVisibility,
    website_url: "",
    website_visibility: "private" as ContactVisibility,
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
        contact_email: data.contact_email || "",
        contact_email_visibility: data.contact_email_visibility || "private",
        phone_number: data.phone_number || "",
        phone_number_visibility: data.phone_number_visibility || "private",
        instagram_handle: data.instagram_handle || "",
        instagram_visibility: data.instagram_visibility || "private",
        discord_username: data.discord_username || "",
        discord_visibility: data.discord_visibility || "private",
        facebook_url: data.facebook_url || "",
        facebook_visibility: data.facebook_visibility || "private",
        linkedin_url: data.linkedin_url || "",
        linkedin_visibility: data.linkedin_visibility || "private",
        twitter_handle: data.twitter_handle || "",
        twitter_visibility: data.twitter_visibility || "private",
        website_url: data.website_url || "",
        website_visibility: data.website_visibility || "private",
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
        contact_email: profile.contact_email || "",
        contact_email_visibility: profile.contact_email_visibility || "private",
        phone_number: profile.phone_number || "",
        phone_number_visibility: profile.phone_number_visibility || "private",
        instagram_handle: profile.instagram_handle || "",
        instagram_visibility: profile.instagram_visibility || "public",
        discord_username: profile.discord_username || "",
        discord_visibility: profile.discord_visibility || "public",
        facebook_url: profile.facebook_url || "",
        facebook_visibility: profile.facebook_visibility || "public",
        linkedin_url: profile.linkedin_url || "",
        linkedin_visibility: profile.linkedin_visibility || "public",
        twitter_handle: profile.twitter_handle || "",
        twitter_visibility: profile.twitter_visibility || "public",
        website_url: profile.website_url || "",
        website_visibility: profile.website_visibility || "public",
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
          contact_email: formData.contact_email || null,
          contact_email_visibility: formData.contact_email_visibility,
          phone_number: formData.phone_number || null,
          phone_number_visibility: formData.phone_number_visibility,
          instagram_handle: formData.instagram_handle || null,
          instagram_visibility: formData.instagram_visibility,
          discord_username: formData.discord_username || null,
          discord_visibility: formData.discord_visibility,
          facebook_url: formData.facebook_url || null,
          facebook_visibility: formData.facebook_visibility,
          linkedin_url: formData.linkedin_url || null,
          linkedin_visibility: formData.linkedin_visibility,
          twitter_handle: formData.twitter_handle || null,
          twitter_visibility: formData.twitter_visibility,
          website_url: formData.website_url || null,
          website_visibility: formData.website_visibility,
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
      Personal: "bg-blue-500/20 text-blue-700 dark:text-blue-400 dark:bg-blue-900/30",
      Business: "bg-purple-500/20 text-purple-700 dark:text-purple-400 dark:bg-purple-900/30",
      Charity: "bg-green-500/20 text-green-700 dark:text-green-400 dark:bg-green-900/30",
      Admin: "bg-red-500/20 text-red-700 dark:text-red-400 dark:bg-red-900/30",
    }
    return colors[role] || "bg-gray-500/20 text-gray-700 dark:text-gray-400 dark:bg-gray-800/30"
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-700 dark:text-green-400 dark:bg-green-900/30 flex items-center gap-1">
                  ✓ Verified
                </span>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Verification warning banner */}
          {!profile.is_verified && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 dark:bg-yellow-900/20 rounded-lg p-4 flex items-start gap-3">
              <span className="text-yellow-700 dark:text-yellow-400 text-xl">⚠️</span>
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                  Your account is pending verification.
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-1">
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
              className="bg-muted"
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
                className="bg-muted"
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
                className="bg-muted"
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
                className="bg-muted"
              />
            )}
          </div>

          {/* Alumni Status (toggle) */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="is_alumni" className="text-base">Former Student Status</Label>
              <p className="text-xs text-muted-foreground">
                Are you a Texas A&M former student?
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
                  formData.is_alumni ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
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
                  ? "bg-green-500/20 text-green-700 dark:text-green-400 dark:bg-green-900/30" 
                  : "bg-gray-500/20 text-gray-700 dark:text-gray-400 dark:bg-gray-800/30"
              )}>
                {profile.is_alumni ? "Yes" : "No"}
              </span>
            )}
          </div>

          {/* Contact Information */}
          <div className="border-t border-border pt-6 space-y-4">
            <div>
              <p className="text-sm font-semibold">Contact Information</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Choose what others can see on your profile. Set a field to <span className="font-medium">Public</span> to make it visible to other members, or <span className="font-medium">Private</span> to hide it.
              </p>
            </div>
            {([
              { key: 'contact_email', visKey: 'contact_email_visibility', label: 'Contact Email', placeholder: 'you@example.com', defaultVis: 'private' },
              { key: 'phone_number', visKey: 'phone_number_visibility', label: 'Phone Number', placeholder: '+1 (555) 000-0000', defaultVis: 'private' },
              { key: 'instagram_handle', visKey: 'instagram_visibility', label: 'Instagram', placeholder: '@username', defaultVis: 'private' },
              { key: 'discord_username', visKey: 'discord_visibility', label: 'Discord', placeholder: 'username', defaultVis: 'private' },
              { key: 'facebook_url', visKey: 'facebook_visibility', label: 'Facebook', placeholder: 'facebook.com/yourprofile', defaultVis: 'private' },
              { key: 'linkedin_url', visKey: 'linkedin_visibility', label: 'LinkedIn', placeholder: 'linkedin.com/in/yourprofile', defaultVis: 'private' },
              { key: 'twitter_handle', visKey: 'twitter_visibility', label: 'X / Twitter', placeholder: '@username', defaultVis: 'private' },
              { key: 'website_url', visKey: 'website_visibility', label: 'Website', placeholder: 'https://yoursite.com', defaultVis: 'private' },
            ] as const).map(({ key, visKey, label, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key}>{label}</Label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Input
                      id={key}
                      type="text"
                      value={formData[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      placeholder={placeholder}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, [visKey]: formData[visKey] === 'public' ? 'private' : 'public' })}
                      className={cn(
                        "shrink-0 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                        formData[visKey] === 'public'
                          ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
                          : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
                      )}
                    >
                      {formData[visKey] === 'public' ? 'Public' : 'Private'}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <Input
                      id={key}
                      type="text"
                      value={profile[key] || "Not set"}
                      disabled
                      className="flex-1 bg-muted"
                    />
                    {profile[key] && (
                      <span className={cn(
                        "shrink-0 px-3 py-1.5 rounded-md text-xs font-medium border",
                        (profile[visKey] ?? 'private') === 'public'
                          ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
                          : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
                      )}>
                        {(profile[visKey] ?? 'private') === 'public' ? 'Public' : 'Private'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
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
