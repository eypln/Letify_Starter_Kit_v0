import { z } from 'zod'

// Facebook Integration Form Schema
export const IntegrationFormSchema = z.object({
  fb_page_id: z
    .string()
    .min(1, 'Facebook Page ID gereklidir')
    .regex(/^\d+$/, 'Facebook Page ID sadece sayı içermelidir'),
  fb_access_token: z
    .string()
    .min(1, 'Facebook Access Token gereklidir')
    .min(10, 'Geçerli bir Facebook Access Token giriniz'),
  fb_app_secret: z
    .string()
    .min(1, 'Facebook App Secret gereklidir')
    .min(10, 'Geçerli bir Facebook App Secret giriniz'),
})

export type IntegrationFormData = z.infer<typeof IntegrationFormSchema>

// Auth schemas
export const SignInSchema = z.object({
  email: z
    .string()
    .min(1, 'E-posta adresi gereklidir')
    .email('Geçerli bir e-posta adresi giriniz'),
  password: z
    .string()
    .min(1, 'Şifre gereklidir')
    .min(6, 'Şifre en az 6 karakter olmalıdır'),
})

export type SignInFormData = z.infer<typeof SignInSchema>

export const SignUpSchema = z.object({
  email: z
    .string()
    .min(1, 'E-posta adresi gereklidir')
    .email('Geçerli bir e-posta adresi giriniz'),
  password: z
    .string()
    .min(1, 'Şifre gereklidir')
    .min(6, 'Şifre en az 6 karakter olmalıdır'),
  confirmPassword: z
    .string()
    .min(1, 'Şifre tekrarı gereklidir'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword'],
})

export type SignUpFormData = z.infer<typeof SignUpSchema>

// Profile Update Schema
export const ProfileUpdateSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Ad Soyad gereklidir')
    .max(100, 'Ad Soyad 100 karakterden uzun olamaz'),
  phone: z
    .string()
    .min(1, 'Telefon numarası gereklidir')
    .regex(/^[+]?[0-9\s\-\(\)]{10,}$/, 'Geçerli bir telefon numarası giriniz'),
})

export type ProfileUpdateFormData = z.infer<typeof ProfileUpdateSchema>

// n8n Webhook Schemas
export const ContentSchema = z.object({
  listing: z.object({
    sourceUrl: z.string().url('Geçerli bir URL giriniz'),
  }),
  options: z.object({
    promptProfile: z.string().optional(),
    language: z.string().optional(),
    sheetRowId: z.number().int().optional(),
  }).optional(),
})

export const FbPostSchema = z.object({
  listingId: z.string().min(1, 'Listing ID gereklidir'),
  caption: z.string().min(1, 'Caption gereklidir'),
  images: z.array(z.object({
    url: z.string().url('Geçerli bir görsel URL giriniz'),
  })).min(1, 'En az 1 görsel gereklidir').max(15, 'En fazla 15 görsel yükleyebilirsiniz'),
})

export const VideoCreateSchema = z.object({
  listingId: z.string().min(1, 'Listing ID gereklidir'),
  favoriteImages: z.array(z.string().url()).min(5, 'Tam 5 favori görsel seçmelisiniz').max(5, 'Tam 5 favori görsel seçmelisiniz'),
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
  listingId: z.string().min(1, 'Listing ID gereklidir'),
  videoUrl: z.string().url('Geçerli bir video URL giriniz'),
  caption: z.string().optional(),
})

export const StatusCallbackSchema = z.object({
  jobId: z.string().uuid('Geçerli bir job ID giriniz'),
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
      return 'Admin Onayı Bekliyor'
    case ProfileStatus.APPROVED:
      return 'Onaylandı'
    case ProfileStatus.DENIED:
      return 'Reddedildi'
    default:
      return 'Bilinmiyor'
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