"use client"

import * as React from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Profile, UserRole, ContactVisibility } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import { getInitials, getRoleBadgeColor } from "@/lib/utils"
import { cn } from "@/lib/utils"

type Tab = "profile" | "contact" | "account"

interface NameChangeRequest {
  id: string
  requested_name: string
  status: string
  created_at: string
}

const CONTACT_FIELDS = [
  { key: "contact_email", visKey: "contact_email_visibility", label: "Contact Email", placeholder: "you@example.com", maxLength: 100 },
  { key: "phone_number", visKey: "phone_number_visibility", label: "Phone Number", placeholder: "+1 (555) 000-0000", maxLength: 20 },
  { key: "instagram_handle", visKey: "instagram_visibility", label: "Instagram", placeholder: "@username", maxLength: 30 },
  { key: "discord_username", visKey: "discord_visibility", label: "Discord", placeholder: "username", maxLength: 32 },
  { key: "facebook_url", visKey: "facebook_visibility", label: "Facebook", placeholder: "facebook.com/yourprofile", maxLength: 200 },
  { key: "linkedin_url", visKey: "linkedin_visibility", label: "LinkedIn", placeholder: "linkedin.com/in/yourprofile", maxLength: 200 },
  { key: "twitter_handle", visKey: "twitter_visibility", label: "X / Twitter", placeholder: "@username", maxLength: 50 },
  { key: "website_url", visKey: "website_visibility", label: "Website", placeholder: "https://yoursite.com", maxLength: 200 },
] as const

type ContactKey = typeof CONTACT_FIELDS[number]["key"]
type ContactVisKey = typeof CONTACT_FIELDS[number]["visKey"]

interface ProfileFormData {
  full_name: string
  is_alumni: boolean
  graduation_year: number | undefined
  major: string
}

interface ContactFormData {
  contact_email: string
  contact_email_visibility: ContactVisibility
  phone_number: string
  phone_number_visibility: ContactVisibility
  instagram_handle: string
  instagram_visibility: ContactVisibility
  discord_username: string
  discord_visibility: ContactVisibility
  facebook_url: string
  facebook_visibility: ContactVisibility
  linkedin_url: string
  linkedin_visibility: ContactVisibility
  twitter_handle: string
  twitter_visibility: ContactVisibility
  website_url: string
  website_visibility: ContactVisibility
}

function profileFormFromProfile(p: Profile): ProfileFormData {
  return {
    full_name: p.full_name || "",
    is_alumni: p.is_alumni || false,
    graduation_year: p.graduation_year,
    major: p.major || "",
  }
}

function contactFormFromProfile(p: Profile): ContactFormData {
  return {
    contact_email: p.contact_email || "",
    contact_email_visibility: p.contact_email_visibility || "private",
    phone_number: p.phone_number || "",
    phone_number_visibility: p.phone_number_visibility || "private",
    instagram_handle: p.instagram_handle || "",
    instagram_visibility: p.instagram_visibility || "private",
    discord_username: p.discord_username || "",
    discord_visibility: p.discord_visibility || "private",
    facebook_url: p.facebook_url || "",
    facebook_visibility: p.facebook_visibility || "private",
    linkedin_url: p.linkedin_url || "",
    linkedin_visibility: p.linkedin_visibility || "private",
    twitter_handle: p.twitter_handle || "",
    twitter_visibility: p.twitter_visibility || "private",
    website_url: p.website_url || "",
    website_visibility: p.website_visibility || "private",
  }
}

export function UserProfile() {
  const [profile, setProfile] = React.useState<Profile | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<Tab>("profile")

  const [editingProfile, setEditingProfile] = React.useState(false)
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [profileForm, setProfileForm] = React.useState<ProfileFormData>({
    full_name: "", is_alumni: false, graduation_year: undefined, major: ""
  })

  // Name change request state
  const [pendingNameRequest, setPendingNameRequest] = React.useState<NameChangeRequest | null>(null)
  const [showNameRequestForm, setShowNameRequestForm] = React.useState(false)
  const [nameRequestValue, setNameRequestValue] = React.useState("")
  const [nameRequestReason, setNameRequestReason] = React.useState("")
  const [submittingNameRequest, setSubmittingNameRequest] = React.useState(false)
  const [cancellingNameRequest, setCancellingNameRequest] = React.useState(false)

  const [editingContact, setEditingContact] = React.useState(false)
  const [savingContact, setSavingContact] = React.useState(false)
  const [contactForm, setContactForm] = React.useState<ContactFormData>(contactFormFromProfile({} as Profile))

  const { showToast, ToastContainer } = useToast()
  const supabase = createClient()

  React.useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError("No authenticated user found"); return }
      const { data, error: fetchError } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (fetchError) throw fetchError
      setProfile(data)
      setProfileForm(profileFormFromProfile(data))
      setContactForm(contactFormFromProfile(data))

      // Fetch any pending name change request
      const { data: ncr } = await supabase
        .from('name_change_requests')
        .select('id, requested_name, status, created_at')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle()
      setPendingNameRequest(ncr ?? null)
    } catch (err) {
      console.error("Error fetching profile:", err)
      setError(err instanceof Error ? err.message : "Failed to load profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitNameRequest = async () => {
    const name = nameRequestValue.trim()
    if (!name) return
    try {
      setSubmittingNameRequest(true)
      const res = await fetch('/api/name-change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requested_name: name, reason: nameRequestReason.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit request')
      setPendingNameRequest(data)
      setShowNameRequestForm(false)
      setNameRequestValue("")
      setNameRequestReason("")
      showToast({ message: "Name change request submitted. An admin will review it shortly.", type: "success" })
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : "Failed to submit request", type: "error" })
    } finally {
      setSubmittingNameRequest(false)
    }
  }

  const handleCancelNameRequest = async () => {
    try {
      setCancellingNameRequest(true)
      const res = await fetch('/api/name-change-requests', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to cancel request')
      setPendingNameRequest(null)
      showToast({ message: "Name change request cancelled.", type: "success" })
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : "Failed to cancel request", type: "error" })
    } finally {
      setCancellingNameRequest(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    try {
      setSavingProfile(true)
      const { error: updateError } = await supabase.from("profiles").update({
        is_alumni: profileForm.is_alumni,
        graduation_year: profileForm.graduation_year || null,
        major: profileForm.major,
        updated_at: new Date().toISOString(),
      }).eq("id", profile.id)
      if (updateError) throw updateError
      setProfile({ ...profile, ...profileForm })
      setEditingProfile(false)
      showToast({ message: "Profile updated successfully!", type: "success" })
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : "Failed to update profile", type: "error" })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleCancelProfile = () => {
    if (profile) setProfileForm(profileFormFromProfile(profile))
    setEditingProfile(false)
  }

  const handleSaveContact = async () => {
    if (!profile) return
    try {
      setSavingContact(true)
      const { error: updateError } = await supabase.from("profiles").update({
        ...contactForm,
        contact_email: contactForm.contact_email || null,
        phone_number: contactForm.phone_number || null,
        instagram_handle: contactForm.instagram_handle || null,
        discord_username: contactForm.discord_username || null,
        facebook_url: contactForm.facebook_url || null,
        linkedin_url: contactForm.linkedin_url || null,
        twitter_handle: contactForm.twitter_handle || null,
        website_url: contactForm.website_url || null,
        updated_at: new Date().toISOString(),
      }).eq("id", profile.id)
      if (updateError) throw updateError
      setProfile({ ...profile, ...contactForm })
      setEditingContact(false)
      showToast({ message: "Contact info updated successfully!", type: "success" })
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : "Failed to update contact info", type: "error" })
    } finally {
      setSavingContact(false)
    }
  }

  const handleCancelContact = () => {
    if (profile) setContactForm(contactFormFromProfile(profile))
    setEditingContact(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardContent className="pt-6">
          <p className="text-muted-foreground">{error || "Profile not found"}</p>
          <Button onClick={fetchProfile} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <ToastContainer />
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Profile Header Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              {profile.avatar_url ? (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full">
                  <Image src={profile.avatar_url} alt={profile.full_name} fill className="object-cover" />
                </div>
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-semibold">
                  {getInitials(profile.full_name)}
                </div>
              )}

              {/* Name + badges */}
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-card-header-text truncate">{profile.full_name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-semibold", getRoleBadgeColor(profile.role))}>
                    {profile.role}
                  </span>
                  {profile.is_verified && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-green-500/20 text-green-700 dark:text-green-400 dark:bg-green-900/30 flex items-center gap-1">
                      ✓ Verified
                    </span>
                  )}
                  {profile.is_alumni && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-green-500/20 text-green-700 dark:text-green-400 dark:bg-green-900/30">
                      Former Student
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Member since {new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </p>
              </div>
            </div>

            {!profile.is_verified && (
              <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 dark:bg-yellow-900/20 rounded-lg p-3 flex items-start gap-2.5">
                <span className="text-yellow-700 dark:text-yellow-400 text-base shrink-0">⚠️</span>
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">Account pending verification</p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-0.5">Some features may be limited until your account is verified.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {(["profile", "contact", "account"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-sm font-medium capitalize transition-colors -mb-px border-b-2",
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "contact" ? "Contact Info" : tab === "account" ? "Account" : "Profile"}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-card-header-text">Personal Information</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Your name and academic details</p>
                </div>
                {!editingProfile && (
                  <Button size="sm" variant="outline" onClick={() => setEditingProfile(true)}>
                    Edit
                  </Button>
                )}
              </div>

              {/* Full Name — read-only, request flow */}
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <div className="flex items-center gap-3">
                  <p className="flex-1 text-sm text-card-header-text py-1.5">{profile.full_name || "—"}</p>
                  {!pendingNameRequest && !showNameRequestForm && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 text-xs"
                      onClick={() => { setShowNameRequestForm(true); setNameRequestValue("") }}
                    >
                      Request Change
                    </Button>
                  )}
                </div>

                {/* Pending request banner */}
                {pendingNameRequest && (
                  <div className="flex items-center justify-between rounded-md border border-yellow-400/40 bg-yellow-500/10 px-3 py-2 gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">Name change pending review</p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 truncate">"{pendingNameRequest.requested_name}"</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 h-7 px-2"
                      onClick={handleCancelNameRequest}
                      disabled={cancellingNameRequest}
                    >
                      {cancellingNameRequest ? "Cancelling…" : "Cancel"}
                    </Button>
                  </div>
                )}

                {/* Inline request form */}
                {showNameRequestForm && (
                  <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Your request will be reviewed by an admin before the change takes effect.
                    </p>
                    <Input
                      value={nameRequestValue}
                      onChange={(e) => setNameRequestValue(e.target.value)}
                      placeholder="Enter your requested name"
                      maxLength={100}
                      autoFocus
                    />
                    <Textarea
                      value={nameRequestReason}
                      onChange={(e) => setNameRequestReason(e.target.value)}
                      placeholder="Reason for name change (optional)"
                      className="min-h-[70px] resize-none text-sm"
                      maxLength={500}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={handleSubmitNameRequest}
                        disabled={submittingNameRequest || !nameRequestValue.trim()}
                      >
                        {submittingNameRequest ? "Submitting…" : "Submit Request"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setShowNameRequestForm(false); setNameRequestValue(""); setNameRequestReason("") }}
                        disabled={submittingNameRequest}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Major */}
              <div className="space-y-1.5">
                <Label htmlFor="major">Major</Label>
                {editingProfile ? (
                  <Input
                    id="major"
                    value={profileForm.major}
                    onChange={(e) => setProfileForm({ ...profileForm, major: e.target.value })}
                    placeholder="e.g. Computer Science"
                    maxLength={100}
                  />
                ) : (
                  <p className="text-sm text-card-header-text py-2">{profile.major || "Not specified"}</p>
                )}
              </div>

              {/* Graduation Year */}
              <div className="space-y-1.5">
                <Label htmlFor="graduation_year">Graduation Year</Label>
                {editingProfile ? (
                  <Input
                    id="graduation_year"
                    type="number"
                    value={profileForm.graduation_year || ""}
                    onChange={(e) => setProfileForm({ ...profileForm, graduation_year: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="e.g. 2025"
                    min="1900"
                    max="2100"
                  />
                ) : (
                  <p className="text-sm text-card-header-text py-2">{profile.graduation_year?.toString() || "Not specified"}</p>
                )}
              </div>

              {/* Former Student Toggle */}
              <div className="flex items-center justify-between py-2 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-card-header-text">Former Student</p>
                  <p className="text-xs text-muted-foreground">Are you a Texas A&M former student?</p>
                </div>
                {editingProfile ? (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={profileForm.is_alumni}
                    onClick={() => setProfileForm({ ...profileForm, is_alumni: !profileForm.is_alumni })}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      profileForm.is_alumni ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
                    )}
                  >
                    <span className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      profileForm.is_alumni ? "translate-x-6" : "translate-x-1"
                    )} />
                  </button>
                ) : (
                  <span className={cn(
                    "text-xs px-2.5 py-0.5 rounded-full font-semibold",
                    profile.is_alumni
                      ? "bg-green-500/20 text-green-700 dark:text-green-400 dark:bg-green-900/30"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  )}>
                    {profile.is_alumni ? "Yes" : "No"}
                  </span>
                )}
              </div>

              {/* Save / Cancel */}
              {editingProfile && (
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSaveProfile} disabled={savingProfile} className="flex-1">
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button onClick={handleCancelProfile} variant="outline" disabled={savingProfile} className="flex-1">
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contact Tab */}
        {activeTab === "contact" && (
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-card-header-text">Contact Information</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Control which details are visible to other members. Set a field to <span className="font-medium">Public</span> to show it on your profile.
                  </p>
                </div>
                {!editingContact && (
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => setEditingContact(true)}>
                    Edit
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {CONTACT_FIELDS.map(({ key, visKey, label, placeholder, maxLength }) => {
                  const value = profile[key as keyof Profile] as string | undefined
                  const vis = (profile[visKey as keyof Profile] as ContactVisibility) ?? "private"
                  return (
                    <div key={key} className="space-y-1.5">
                      <Label htmlFor={key}>{label}</Label>
                      {editingContact ? (
                        <div className="flex gap-2">
                          <Input
                            id={key}
                            value={contactForm[key as ContactKey]}
                            onChange={(e) => setContactForm({ ...contactForm, [key]: e.target.value })}
                            placeholder={placeholder}
                            maxLength={maxLength}
                            className="flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => setContactForm({
                              ...contactForm,
                              [visKey]: contactForm[visKey as ContactVisKey] === "public" ? "private" : "public"
                            })}
                            className={cn(
                              "shrink-0 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                              contactForm[visKey as ContactVisKey] === "public"
                                ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
                                : "bg-muted text-muted-foreground border-border"
                            )}
                          >
                            {contactForm[visKey as ContactVisKey] === "public" ? "Public" : "Private"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="flex-1 text-sm text-card-header-text py-1.5 min-w-0 truncate">
                            {value || <span className="text-muted-foreground italic">Not set</span>}
                          </p>
                          {value && (
                            <span className={cn(
                              "shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                              vis === "public"
                                ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
                                : "bg-muted text-muted-foreground border-border"
                            )}>
                              {vis === "public" ? "Public" : "Private"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {editingContact && (
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSaveContact} disabled={savingContact} className="flex-1">
                    {savingContact ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button onClick={handleCancelContact} variant="outline" disabled={savingContact} className="flex-1">
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Account Tab */}
        {activeTab === "account" && (
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div>
                <p className="font-semibold text-card-header-text">Account Details</p>
                <p className="text-xs text-muted-foreground mt-0.5">Read-only information about your account</p>
              </div>

              <div className="divide-y divide-border">
                <div className="py-3 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-sm text-card-header-text font-medium">{profile.email}</p>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Account Type</p>
                  <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-semibold", getRoleBadgeColor(profile.role))}>
                    {profile.role}
                  </span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Verification Status</p>
                  <span className={cn(
                    "text-xs px-2.5 py-0.5 rounded-full font-semibold",
                    profile.is_verified
                      ? "bg-green-500/20 text-green-700 dark:text-green-400 dark:bg-green-900/30"
                      : "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 dark:bg-yellow-900/30"
                  )}>
                    {profile.is_verified ? "✓ Verified" : "Pending"}
                  </span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="text-sm text-card-header-text">
                    {new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                {profile.last_login && (
                  <div className="py-3 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Last Login</p>
                    <p className="text-sm text-card-header-text">
                      {new Date(profile.last_login).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                )}
                {profile.updated_at && (
                  <div className="py-3 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Profile Last Updated</p>
                    <p className="text-sm text-card-header-text">
                      {new Date(profile.updated_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2 rounded-lg bg-muted/40 border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  Your email address is linked to your sign-in provider (Google or Facebook) and cannot be changed here. Your profile picture is also managed by your sign-in provider.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </>
  )
}
