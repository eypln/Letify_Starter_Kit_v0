import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/listings/next-reference
 * 
 * Atomically gets the next available listing reference number (L1, L2, L3, etc.)
 * This ensures all users share the same global sequence and prevents duplicates.
 * 
 * Returns: { referenceNumber: "L123" }
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Call the database function to atomically get and increment the sequence
    // Using 'as any' because the function is not yet in the generated types
    const { data, error } = await supabase.rpc('get_next_listing_reference' as any) as { data: string | null; error: any };

    if (error) {
      console.error('Error getting next reference number:', error);
      return NextResponse.json(
        { error: 'Failed to generate reference number' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      referenceNumber: data
    });

  } catch (error) {
    console.error('Unexpected error in next-reference API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
