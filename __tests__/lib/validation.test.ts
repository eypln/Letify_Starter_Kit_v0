import { z } from 'zod'
import {
  IntegrationFormSchema,
  SignInSchema,
  SignUpSchema,
} from '@/lib/validation'

describe('Validation Schemas', () => {
  describe('IntegrationFormSchema', () => {
    it('should validate correct Facebook integration data', () => {
      const validData = {
        fb_page_id: '123456789',
        fb_access_token: 'valid-token-string',
      }

      const result = IntegrationFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty Facebook Page ID', () => {
      const invalidData = {
        fb_page_id: '',
        fb_access_token: 'valid-token',
      }

      const result = IntegrationFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('required')
      }
    })

    it('should reject non-numeric Facebook Page ID', () => {
      const invalidData = {
        fb_page_id: 'abc123',
        fb_access_token: 'valid-token',
      }

      const result = IntegrationFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('numbers')
      }
    })

    it('should reject short access token', () => {
      const invalidData = {
        fb_page_id: '123456',
        fb_access_token: 'short',
      }

      const result = IntegrationFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('SignInSchema', () => {
    it('should validate correct sign-in data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      }

      const result = SignInSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      }

      const result = SignInSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('valid email')
      }
    })

    it('should reject empty email', () => {
      const invalidData = {
        email: '',
        password: 'password123',
      }

      const result = SignInSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '12345',
      }

      const result = SignInSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 6 characters')
      }
    })

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
      }

      const result = SignInSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('SignUpSchema', () => {
    it('should validate correct sign-up data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      }

      const result = SignUpSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject mismatched passwords', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'different123',
      }

      const result = SignUpSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('do not match')
      }
    })

    it('should reject invalid email in sign-up', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'password123',
        confirmPassword: 'password123',
      }

      const result = SignUpSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject short password in sign-up', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '12345',
        confirmPassword: '12345',
      }

      const result = SignUpSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject empty confirmPassword', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: '',
      }

      const result = SignUpSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should handle multiple validation errors', () => {
      const invalidData = {
        email: 'bad-email',
        password: 'short',
        confirmPassword: 'different',
      }

      const result = SignUpSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(1)
      }
    })
  })
})
