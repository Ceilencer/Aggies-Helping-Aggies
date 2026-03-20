export type UserRole = 'Personal' | 'Business' | 'Charity' | 'Admin'
export type FlairType = 'Student' | 'Former Student' | 'Family Member' | 'Aggie Mom' | 'Faculty' | 'BCS Local'
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
  rules_acknowledged_at?: string
  account_status: AccountStatus
  approved_by?: string | null
  approved_at?: string | null
  posts_approved?: number
  posts_denied?: number
  created_at: string
  updated_at: string
  graduation_year?: number
  major?: string
  last_login?: string
}

export interface RejectedAccount {
  id: string
  user_id: string | null
  email: string
  full_name: string
  rejected_by?: string | null
  rejected_at: string
  rejection_reason?: string | null
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

export interface UserBan {
  id: string
  user_id: string
  banned_by: string | null
  ban_type: 'temporary' | 'permanent'
  reason: string
  is_active: boolean
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface VerificationRequest {
  id: string
  user_id: string
  email: string
  full_name: string
  affiliation?: string | null
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
  expires_at?: string | null
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
  /** Signals to the client that the update created a pending edit awaiting admin review */
  _pendingEdit?: boolean
}

export type FeedAuthorDTO = Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role'>
export type FeedChannelDTO = Pick<Channel, 'id' | 'name' | 'slug' | 'description'>
export type ChannelListDTO = Pick<Channel, 'id' | 'name' | 'slug' | 'description' | 'is_read_only'>

export interface FeedPendingEditDTO {
  proposed_title: string
  proposed_content: string
}

// Admin-specific DTOs for admin dashboard
export interface AdminPendingPostDTO {
  id: string
  title: string
  content: string
  images: string[] | null
  created_at: string
  approval_status: ApprovalStatus
  author: (FeedAuthorDTO & { posts_approved?: number; posts_denied?: number }) | null
  channel: FeedChannelDTO | null
  pending_edit: FeedPendingEditDTO | null
}

export interface AdminPendingPostQueryRowDTO {
  id: string
  title: string
  content: string
  images: string[] | null
  created_at: string
  approval_status: ApprovalStatus
  author?: FeedAuthorDTO[] | FeedAuthorDTO | null
  channel?: FeedChannelDTO[] | FeedChannelDTO | null
  pending_edit?: FeedPendingEditDTO[] | FeedPendingEditDTO | null
}

export interface AdminUserVerificationDTO {
  id: string
  email: string
  full_name: string
  created_at: string
  verification_request?: {
    affiliation?: string | null
    graduation_year: number | null
    major: string | null
    memorable_tradition: string
    connection_to_tamu: string
    status?: string
  } | null
}

export interface AdminReportedItemDTO {
  id: string
  report_type: 'post' | 'comment'
  reason: string
  description?: string
  is_resolved: boolean
  resolution_action?: string
  created_at: string
  reported_by: string
  post_id?: string | null
  comment_id?: string | null
  profiles?: { id: string; full_name?: string } | null
  posts?: { id: string; title?: string; content?: string; author_id: string; channel_id: string; profiles?: { id: string; full_name?: string } | null } | null
  comments?: { id: string; content?: string; post_id: string; author_id: string; profiles?: { id: string; full_name?: string } | null } | null
}

export interface AdminReportSummaryDTO {
  id: string
  reason: string
  description?: string | null
  created_at: string
  reporter: { id: string; full_name?: string } | null
}

export interface AdminReportedGroupDTO {
  content_type: 'post' | 'comment'
  content_id: string
  report_count: number
  latest_report_at: string
  is_resolved: boolean
  resolution_action?: string | null
  post: { id: string; title?: string; content?: string; profiles?: { id: string; full_name?: string } | null } | null
  comment: { id: string; content?: string; profiles?: { id: string; full_name?: string } | null } | null
  reports: AdminReportSummaryDTO[]
}

export interface FeedPostQueryRowDTO {
  id: string
  channel_id: string
  author_id: string
  title: string
  content: string
  images?: string[]
  is_pinned?: boolean
  is_moderated: boolean
  moderation_reason?: string | null
  approval_status: ApprovalStatus
  created_at: string
  updated_at?: string
  likes_count?: number | null
  author?: FeedAuthorDTO[] | FeedAuthorDTO | null
  channel?: FeedChannelDTO[] | FeedChannelDTO | null
  pending_edit?: FeedPendingEditDTO[] | FeedPendingEditDTO | null
  comments?: { count: number }[]
}

// Lightweight DTO used by feed/list UIs
export interface FeedPost {
  id: string
  channel_id: string
  author_id: string
  title: string
  content: string
  images?: string[]
  is_pinned?: boolean
  is_moderated: boolean
  moderation_reason?: string | null
  approval_status: ApprovalStatus
  created_at: string
  updated_at?: string
  author?: FeedAuthorDTO | null
  channel?: FeedChannelDTO | null
  comment_count?: number
  like_count?: number
  user_has_liked?: boolean
  like_id?: string | null
  pending_edit?: FeedPendingEditDTO | null
  /** Signals to the client that the update created a pending edit awaiting admin review */
  _pendingEdit?: boolean
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
