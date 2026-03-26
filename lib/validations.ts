import { z } from 'zod'

// Email validation that requires TAMU domain
export const tamuEmailSchema = z
  .string()
  .email('Invalid email address')
  .refine(
    (email) => email.endsWith('@tamu.edu') || email.endsWith('@aggienetwork.com'),
    'Email must be from tamu.edu or aggienetwork.com domain'
  )

// Signup form schema
export const signupSchema = z.object({
  email: tamuEmailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters'),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
})

// Login form schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Alumni verification form schema
export const alumniVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters'),
  graduation_year: z
    .number()
    .int()
    .min(1876, 'Texas A&M was founded in 1876')
    .max(new Date().getFullYear() + 10, 'Graduation year cannot be too far in the future'),
  major: z
    .string()
    .min(2, 'Major must be at least 2 characters')
    .max(100, 'Major must be less than 100 characters'),
  memorable_tradition: z
    .string()
    .min(20, 'Please provide at least 20 characters describing a tradition')
    .max(500, 'Response must be less than 500 characters'),
  connection_to_tamu: z
    .string()
    .min(20, 'Please provide at least 20 characters describing your connection')
    .max(500, 'Response must be less than 500 characters'),
})

// Create post form schema
export const createPostSchema = z.object({
  channel_id: z.string().uuid('Invalid channel'),
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters'),
  content: z
    .string()
    .min(10, 'Content must be at least 10 characters')
    .max(5000, 'Content must be less than 5000 characters'),
  duration_days: z.union([
    z.literal(1), z.literal(3), z.literal(7), z.literal(14),
  ]).default(7),
  post_contact: z.array(
    z.object({ label: z.string(), value: z.string() })
  ).max(8).default([]),
})

// Edit post form schema
export const editPostSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters'),
  content: z
    .string()
    .min(10, 'Content must be at least 10 characters')
    .max(5000, 'Content must be less than 5000 characters'),
  images: z.array(z.string().url()).max(5).optional(),
})

// Create comment form schema
export const createCommentSchema = z.object({
  post_id: z.string().uuid('Invalid post'),
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment must be less than 1000 characters'),
})

// Edit comment form schema
export const editCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment must be less than 1000 characters'),
})

// Update profile schema
export const updateProfileSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .optional(),
  graduation_year: z
    .number()
    .int()
    .min(1876, 'Texas A&M was founded in 1876')
    .max(new Date().getFullYear() + 10, 'Invalid graduation year')
    .optional(),
  major: z
    .string()
    .min(2, 'Major must be at least 2 characters')
    .max(100, 'Major must be less than 100 characters')
    .optional(),
})

// Admin verification review schema
export const verificationReviewSchema = z.object({
  verification_id: z.string().uuid('Invalid verification request'),
  status: z.enum(['approved', 'rejected']),
  rejection_reason: z.string().optional(),
})

export const postIdRequestSchema = z.object({
  post_id: z.string().uuid('Invalid post ID'),
})

export const commentIdRequestSchema = z.object({
  comment_id: z.string().uuid('Invalid comment ID'),
})

export const channelChangeRequestSchema = z.object({
  channel_id: z.string().uuid('Invalid channel ID'),
})

export const channelPatchRequestSchema = z.object({
  channel_id: z.string().uuid('Invalid channel ID'),
})

export const createCommentRequestSchema = z
  .object({
    post_id: z.string().min(1),
    content: z.string(),
    parent_comment_id: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.post_id || data.content.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Post ID and content are required',
      })
    }
    if (data.content.length > 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Comment must be 1000 characters or less',
      })
    }
  })

export const adminNoteCreateSchema = z.object({
  user_id: z.string().min(1, 'Missing required fields'),
  content: z.string().min(1, 'Missing required fields'),
})

export const adminNoteUpdateSchema = z.object({
  content: z.string().min(1, 'Missing required fields'),
})

export const rollingAdminNoteUpsertSchema = z
  .object({
    user_id: z.string().min(1),
    content: z.string(),
  })
  .superRefine((data, ctx) => {
    if (!data.user_id || !data.content || data.content.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Missing required fields',
      })
    }
  })

export const adminPostReviewSchema = z.object({
  approve: z.boolean(),
  reason: z.string().optional(),
  channel_id: z.string().uuid().optional(),
  duration_days: z.number().int().min(1).max(14).optional(),
})

export const REJECTION_REASONS = [
  'Questionnaire answers were too vague or incomplete',
  'Could not verify connection to Texas A&M University',
  'Answers do not demonstrate sufficient TAMU affiliation',
  'Does not meet community eligibility requirements',
  'Suspected spam or automated account',
  'Duplicate or suspicious account activity',
] as const

export type RejectionReason = typeof REJECTION_REASONS[number]

export const verifyUserSchema = z
  .object({
    userId: z.string().uuid('Invalid user ID'),
    action: z.enum(['approve', 'reject']),
    rejectionReasons: z.array(z.enum(REJECTION_REASONS)).optional(),
  })
  .refine((data) => data.action !== 'reject' || (data.rejectionReasons && data.rejectionReasons.length > 0), {
    message: 'At least one rejection reason is required',
    path: ['rejectionReasons'],
  })

export const adminRoleUpdateSchema = z.object({
  role: z.enum(['Personal', 'Business', 'Charity', 'Admin'], {
    errorMap: () => ({ message: 'Invalid account type' }),
  }),
})

export const adminFlairUpdateSchema = z.object({
  flair: z.enum(['Student', 'Former Student', 'Family Member', 'Aggie Mom', 'Faculty', 'BCS Local'], {
    errorMap: () => ({ message: 'Invalid flair value' }),
  }),
})

// Types inferred from schemas
export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type AlumniVerificationInput = z.infer<typeof alumniVerificationSchema>
export type CreatePostInput = z.infer<typeof createPostSchema>
export type EditPostInput = z.infer<typeof editPostSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type EditCommentInput = z.infer<typeof editCommentSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type VerificationReviewInput = z.infer<typeof verificationReviewSchema>
export type CreateCommentRequestInput = z.infer<typeof createCommentRequestSchema>
export type PostIdRequestInput = z.infer<typeof postIdRequestSchema>
export type CommentIdRequestInput = z.infer<typeof commentIdRequestSchema>
