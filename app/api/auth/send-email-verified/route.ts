import { NextResponse } from 'next/server';
import { sendEmail, generateEmailVerifiedEmail } from '@/lib/email';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user details from Supabase using admin client
    const supabase = createAdminClient();
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, user_id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get user email from auth using admin API
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !user || !user.email) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Send email verification success notification
    const emailHtml = generateEmailVerifiedEmail({
      fullName: profile.full_name || 'User',
      email: user.email,
    });

    const result = await sendEmail({
      to: user.email,
      subject: 'Email Verified - Waiting for Admin Approval',
      html: emailHtml,
    });

    if (!result.success) {
      console.error('Failed to send email:', result.error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error in send-email-verified API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
