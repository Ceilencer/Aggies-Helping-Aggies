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
