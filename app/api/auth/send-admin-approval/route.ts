import { NextResponse, NextRequest } from 'next/server'
import { sendEmail, generateAdminApprovalEmail } from '@/lib/email'
import { ADMIN_EMAIL } from '@/lib/validation'
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit'

/**
 * POST /api/auth/send-admin-approval
 * Sends an admin approval notification email when a new user registers
 * Called from the sign-up process via a trigger or webhook
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 5 requests per minute per IP (prevent spam)
  const rateLimitResult = await rateLimit(request, RateLimitPresets.AUTH);
  if (rateLimitResult) return rateLimitResult;
  try {
    const { fullName, email, phone } = await request.json()

    // Validate input
    if (!fullName || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: fullName, email, phone' },
        { status: 400 }
      )
    }

    // Generate admin approval email
    const emailHtml = generateAdminApprovalEmail({
      fullName,
      email,
      phone,
      registrationTime: new Date().toISOString(),
    })

    // Send email to admin
    const result = await sendEmail({
      to: ADMIN_EMAIL,
      subject: `New User Registration: ${fullName} (${email})`,
      html: emailHtml,
    })

    if (!result.success) {
      console.error('Failed to send admin approval email:', result.error)
      return NextResponse.json(
        { error: 'Failed to send admin notification' },
        { status: 500 }
      )
    }

    console.log(`Admin approval email sent to ${ADMIN_EMAIL} for user ${email}`)

    return NextResponse.json(
      { success: true, message: 'Admin notification sent' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in send-admin-approval:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
