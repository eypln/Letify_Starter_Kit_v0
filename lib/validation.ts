import { z } from 'zod'

// System Constants
export const ADMIN_EMAIL = 'admin@letify.cloud'

// Facebook Integration Form Schema
export const IntegrationFormSchema = z.object({
  fb_page_id: z
    .string()
    .min(1, 'Facebook Page ID is required')
    .regex(/^\d+$/, 'Facebook Page ID must contain only numbers'),
  fb_access_token: z
    .string()
    .min(1, 'Facebook Access Token is required')
    .min(10, 'Please enter a valid Facebook Access Token'),
})

export type IntegrationFormData = z.infer<typeof IntegrationFormSchema>

// Auth schemas
export const SignInSchema = z.object({
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
})

export type SignInFormData = z.infer<typeof SignInSchema>

export const SignUpSchema = z.object({
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: z
    .string()
    .min(1, 'Password confirmation is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export type SignUpFormData = z.infer<typeof SignUpSchema>

// Profile Update Schema
export const ProfileUpdateSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .max(100, 'Full name cannot exceed 100 characters'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === '' || /^[+]?[0-9\s\-\(\)]{7,}$/.test(val),
      'Please enter a valid phone number (minimum 7 digits)'
    ),
})

export type ProfileUpdateFormData = z.infer<typeof ProfileUpdateSchema>

// n8n Webhook Schemas
export const ContentSchema = z.object({
  listing: z.object({
    sourceUrl: z.string().url('Please enter a valid URL'),
  }),
  options: z.object({
    promptProfile: z.string().optional(),
    language: z.string().optional(),
    sheetRowId: z.number().int().optional(),
  }).optional(),
})

export const FbPostSchema = z.object({
  listingId: z.string().min(1, 'Listing ID is required'),
  caption: z.string().min(1, 'Caption is required'),
  images: z.array(z.object({
    url: z.string().url('Please enter a valid image URL'),
  })).min(1, 'At least 1 image is required').max(15, 'Maximum 15 images allowed'),
})

export const VideoCreateSchema = z.object({
  listingId: z.string().min(1, 'Listing ID is required'),
  favoriteImages: z.array(z.string().url()).min(5, 'You must select exactly 5 favorite images').max(5, 'You must select exactly 5 favorite images'),
  template: z.object({
    style: z.string().optional(),
    music: z.string().optional(),
    branding: z.object({
      color: z.string().optional(),
    }).optional(),
  }).optional(),
  caption: z.string().optional(),
})

export const FbReelsSchema = z.object({
  listingId: z.string().min(1, 'Listing ID is required'),
  videoUrl: z.string().url('Please enter a valid video URL'),
  caption: z.string().optional(),
})

export const StatusCallbackSchema = z.object({
  jobId: z.string().uuid('Please enter a valid job ID'),
  status: z.enum(['queued', 'running', 'done', 'error']),
  progress_int: z.number().int().min(0).max(100).optional(),
  result: z.unknown().optional(),
  error_msg: z.string().optional(),
})

// n8n Webhook Types
export type ContentInput = z.infer<typeof ContentSchema>
export type FbPostInput = z.infer<typeof FbPostSchema>
export type VideoCreateInput = z.infer<typeof VideoCreateSchema>
export type FbReelsInput = z.infer<typeof FbReelsSchema>
export type StatusCallbackInput = z.infer<typeof StatusCallbackSchema>

// User Roles
export const UserRole = {
  AGENT: 'agent',
  TEAMLEADER: 'teamleader',
  MANAGER: 'manager',
  BOSS: 'boss',
  ADMIN: 'admin',
} as const

export type UserRoleType = typeof UserRole[keyof typeof UserRole]

export const getRoleLabel = (role: UserRoleType): string => {
  switch (role) {
    case UserRole.AGENT:
      return 'Agent'
    case UserRole.TEAMLEADER:
      return 'Team Leader'
    case UserRole.MANAGER:
      return 'Manager'
    case UserRole.BOSS:
      return 'Boss'
    case UserRole.ADMIN:
      return 'Admin'
    default:
      return 'Unknown'
  }
}

// Profile Status Types
export const ProfileStatus = {
  PENDING_ADMIN: 'pending_admin',
  APPROVED: 'approved',
  DENIED: 'denied',
} as const

export type ProfileStatusType = typeof ProfileStatus[keyof typeof ProfileStatus]

export const getStatusLabel = (status: ProfileStatusType) => {
  switch (status) {
    case ProfileStatus.PENDING_ADMIN:
      return 'Pending Admin Approval'
    case ProfileStatus.APPROVED:
      return 'Approved'
    case ProfileStatus.DENIED:
      return 'Denied'
    default:
      return 'Unknown'
  }
}

export const getStatusBadgeVariant = (status: ProfileStatusType) => {
  switch (status) {
    case ProfileStatus.PENDING_ADMIN:
      return 'secondary'
    case ProfileStatus.APPROVED:
      return 'default'
    case ProfileStatus.DENIED:
      return 'destructive'
    default:
      return 'secondary'
  }
}