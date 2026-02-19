export type UserRole = 'Personal' | 'Business' | 'Charity' | 'Admin'
export type VerificationStatus = 'pending' | 'approved' | 'rejected'
export type ChannelType = 'general' | 'jobs' | 'tickets' | 'promotions' | 'announcements' | 'aggie_ring'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: UserRole
  is_verified: boolean
  is_alumni: boolean
  mfa_enabled: boolean
  rules_acknowledged_at?: string
  created_at: string
  updated_at: string
  graduation_year?: number
  major?: string
  last_login?: string
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
  view_count: number
  created_at: string
  updated_at: string
  // Relations
  author?: Profile
  channel?: Channel
  comment_count?: number
  like_count?: number
  user_has_liked?: boolean
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
