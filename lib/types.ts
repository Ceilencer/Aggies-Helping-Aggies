export type UserRole = 'Personal' | 'Business' | 'Charity' | 'Admin'
export type FlairType = 'Student' | 'Former Student' | 'Parent' | 'Faculty' | 'BCS Local'
export type VerificationStatus = 'pending' | 'approved' | 'rejected'
export type ChannelType = 'general' | 'jobs' | 'tickets' | 'promotions' | 'aggie_ring'
export type ApprovalStatus = 'pending' | 'pending_edit' | 'approved' | 'rejected'
/** User account lifecycle status stored on the profiles table. */
export type AccountStatus = 'active' | 'pending_approval' | 'suspended'

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: UserRole
  flair?: FlairType
  is_verified: boolean
  is_alumni: boolean
  mfa_enabled: boolean
  rules_acknowledged_at?: string
  account_status: AccountStatus
  approved_by?: string | null
  approved_at?: string | null
  created_at: string
  updated_at: string
  graduation_year?: number
  major?: string
  last_login?: string
}

export interface RejectedAccount {
  id: string
  user_id: string
  email: string
  full_name: string
  rejected_by?: string | null
  rejected_at: string
  rejection_reason?: string | null
  questionnaire?: Record<string, unknown> | null
  created_at: string
}

export interface AdminNote {
  id: string
  user_id: string
  created_by: string
  content: string
  created_at: string
  updated_at: string
  // Relations
  creator?: Profile
}

export interface VerificationRequest {
  id: string
  user_id: string
  email: string
  full_name: string
  graduation_year: number
  major: string
  memorable_tradition: string
  connection_to_tamu: string
  status: VerificationStatus
  reviewed_by?: string
  reviewed_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
}

export interface Channel {
  id: string
  name: string
  slug: string
  description?: string
  type: ChannelType
  requires_mfa: boolean
  is_read_only: boolean
  icon?: string
  color: string
  created_at: string
  updated_at: string
}

export interface ChannelAnnouncement {
  id: string
  channel_id: string
  title: string
  content: string
  updated_by?: string | null
  created_at: string
  updated_at: string
  updated_by_profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role'> | null
}

export interface Post {
  id: string
  channel_id: string
  author_id: string
  title: string
  content: string
  images?: string[]
  is_pinned: boolean
  is_moderated: boolean
  moderation_reason?: string
  approval_status: ApprovalStatus
  // view_count removed
  created_at: string
  updated_at: string
  // Relations
  author?: Profile
  channel?: Channel
  comment_count?: number
  like_count?: number
  user_has_liked?: boolean
  like_id?: string | null
  pending_edit?: { proposed_title: string; proposed_content: string } | null
}

// Extended Post type for feed displays with like information
export interface FeedPost extends Post {
  like_id?: string | null
}

export interface Comment {
  id: string
  post_id: string
  author_id: string
  parent_comment_id?: string
  content: string
  is_moderated: boolean
  moderation_reason?: string
  created_at: string
  updated_at: string
  // Relations
  author?: Profile
  replies?: Comment[]
  like_count?: number
  user_has_liked?: boolean
}

export interface PostTracking {
  id: string
  user_id: string
  daily_post_count: number
  monthly_post_count: number
  last_daily_reset: string
  last_monthly_reset: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  link?: string
  is_read: boolean
  created_at: string
}

// Form types
export interface SignupFormData {
  email: string
  password: string
  full_name: string
  confirm_password: string
}

export interface AlumniVerificationFormData {
  email: string
  full_name: string
  graduation_year: number
  major: string
  memorable_tradition: string
  connection_to_tamu: string
}

export interface CreatePostFormData {
  channel_id: string
  title: string
  content: string
  images?: FileList
}

// Post limit configuration
export const POST_LIMITS: Record<UserRole, { daily: number; monthly: number }> = {
  Personal: { daily: 2, monthly: 60 },
  Charity: { daily: 1, monthly: 30 },
  Business: { daily: 0, monthly: 1 },
  Admin: { daily: 999, monthly: 9999 },
}
