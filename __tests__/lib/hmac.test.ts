import { sign, verify } from '@/lib/hmac'

describe('HMAC Utilities', () => {
  const secret = 'test-secret-key'
  const testData = 'test-payload-data'

  describe('sign', () => {
    it('should generate a valid HMAC signature', () => {
      const signature = sign(testData, secret)
      
      expect(signature).toBeDefined()
      expect(typeof signature).toBe('string')
      expect(signature.length).toBeGreaterThan(0)
    })

    it('should generate consistent signatures for the same input', () => {
      const signature1 = sign(testData, secret)
      const signature2 = sign(testData, secret)
      
      expect(signature1).toBe(signature2)
    })

    it('should generate different signatures for different data', () => {
      const signature1 = sign('data1', secret)
      const signature2 = sign('data2', secret)
      
      expect(signature1).not.toBe(signature2)
    })

    it('should generate different signatures for different secrets', () => {
      const signature1 = sign(testData, 'secret1')
      const signature2 = sign(testData, 'secret2')
      
      expect(signature1).not.toBe(signature2)
    })
  })

  describe('verify', () => {
    it('should verify a valid signature', () => {
      const signature = sign(testData, secret)
      const isValid = verify(testData, secret, signature)
      
      expect(isValid).toBe(true)
    })

    it('should reject an invalid signature', () => {
      const isValid = verify(testData, secret, 'invalid-signature')
      
      expect(isValid).toBe(false)
    })

    it('should reject a signature with wrong secret', () => {
      const signature = sign(testData, 'wrong-secret')
      const isValid = verify(testData, secret, signature)
      
      expect(isValid).toBe(false)
    })

    it('should reject a signature for different data', () => {
      const signature = sign('different-data', secret)
      const isValid = verify(testData, secret, signature)
      
      expect(isValid).toBe(false)
    })

    it('should reject signatures of different lengths', () => {
      const isValid = verify(testData, secret, 'short')
      
      expect(isValid).toBe(false)
    })

    it('should handle empty strings', () => {
      const signature = sign('', secret)
      const isValid = verify('', secret, signature)
      
      expect(isValid).toBe(true)
    })
  })
})
