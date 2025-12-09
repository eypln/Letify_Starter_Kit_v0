import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limiting: 10 requests per minute per user
  const rateLimitResult = await rateLimit(request, RateLimitPresets.STRICT);
  if (rateLimitResult) return rateLimitResult;
  try {
    console.log("Logout request received");
    
    const supabase = await createClient()
    
    // Check current session
    const { data: { session } } = await supabase.auth.getSession();
    console.log("Current session before logout:", session ? "Active" : "None");
    
    // Sign out the user
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error("Logout error:", error);
      return NextResponse.json({ error: 'An error occurred while logging out', details: error.message }, { status: 500 })
    }
    
    console.log("Logout successful");
    return NextResponse.json({ message: 'Logged out successfully' })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error("Unexpected logout error:", err);
    return NextResponse.json({ error: 'An unexpected error occurred while logging out', details: errorMessage }, { status: 500 })
  }
}