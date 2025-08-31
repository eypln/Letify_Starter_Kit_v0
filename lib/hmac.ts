import crypto from 'crypto'

/**
 * Create HMAC SHA256 signature for payload verification
 */
export function sign(body: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')
}

/**
 * Verify HMAC SHA256 signature
 */
export function verify(body: string, secret: string, signature: string): boolean {
  const expectedSignature = sign(body, secret)
  
  // Use crypto.timingSafeEqual to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false
  }
  
  const sigBuffer = Buffer.from(signature, 'hex')
  const expectedBuffer = Buffer.from(expectedSignature, 'hex')
  
  try {
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  } catch {
    return false
  }
}