import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity';
import { sendEmail } from '@/lib/email';
import webpush from 'web-push';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';

// Configure VAPID keys
if (
  process.env.VAPID_SUBJECT &&
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY
) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// GET - Fetch all revenue records for authenticated user
export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute per user
  const rateLimitResult = await rateLimit(request, RateLimitPresets.MEDIUM);
  if (rateLimitResult) return rateLimitResult;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch user's own deals
  const { data: ownDeals, error } = await supabase
    .from('revenue')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  // Get user's full_name to find collaboration partner deals
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('user_id', user.id)
    .single();

  let collabDeals: any[] = [];
  if (userProfile?.full_name) {
    const { data: partnerDeals } = await supabase
      .from('revenue')
      .select('*')
      .neq('user_id', user.id)
      .eq('collaboration_with', userProfile.full_name)
      .order('created_at', { ascending: false });

    if (partnerDeals) {
      collabDeals = partnerDeals.map(deal => ({
        ...deal,
        is_collab_partner: true,
      }));
    }
  }

  // Mark own deals explicitly
  const ownData = (ownDeals || []).map(deal => ({
    ...deal,
    is_collab_partner: false,
  }));

  return NextResponse.json({ success: true, data: [...ownData, ...collabDeals] });
}

// POST - Create new revenue record
export async function POST(req: NextRequest) {
  // Rate limiting: 60 requests per minute per user
  const rateLimitResult = await rateLimit(req, RateLimitPresets.MEDIUM);
  if (rateLimitResult) return rateLimitResult;
  const supabase = await createClient();
  const body = await req.json();

  const {
    ref_no,
    client_name,
    rent_amount,
    landlord_discount,
    client_discount,
    has_listing_fee,
    vatable,
    vat_type,
    deal_type,
    date_rented,
    date_signed,
    date_move_in,
    landlord_paid_date,
    client_paid_date,
    collaboration_with,
    inform_boss_after_both_sides_paid,
    only_listing_fee,
    target_user_id
  } = body;

  // Authenticated user id
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Check if caller is an elevated user (teamleader/manager/boss/admin)
  // If so, they can assign deals to other agents via target_user_id
  let user_id = user.id;
  
  if (target_user_id && target_user_id !== user.id) {
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    const callerRole = callerProfile?.role;
    const isElevatedUser = ['teamleader', 'manager', 'boss', 'admin'].includes(callerRole || '');
    
    if (isElevatedUser) {
      user_id = target_user_id;
    }
  }

  // Calculate fees
  const rentAmountNum = parseFloat(rent_amount) || 0;
  
  let landlord_fee = 0;
  let client_fee = 0;
  let listing_fee = 0;
  
  if (deal_type === 'shortlet') {
    // Shortlet: Total Owner Rent Income calculation
    // Base landlord fee: 10% of total owner rent income
    landlord_fee = rentAmountNum * 0.10;
    if (landlord_discount) {
      landlord_fee = landlord_fee * 0.85; // 15% discount
    }

    // Base client fee: 10% of total owner rent income
    client_fee = rentAmountNum * 0.10;
    if (client_discount) {
      client_fee = client_fee * 0.85; // 15% discount
    }
    
    // No listing fee for shortlet
    listing_fee = 0;
  } else {
    // Longlet: Rent Amount calculation (original logic)
    // Landlord fee: half of rent amount, with optional 15% discount
    landlord_fee = rentAmountNum / 2;
    if (landlord_discount) {
      landlord_fee = landlord_fee * 0.85; // 15% discount
    }

    // Client fee: half of rent amount, with optional 15% discount
    client_fee = rentAmountNum / 2;
    if (client_discount) {
      client_fee = client_fee * 0.85; // 15% discount
    }
    
    // Listing fee is 5% of rent amount if has_listing_fee is true
    listing_fee = has_listing_fee ? rentAmountNum * 0.05 : 0;
  }
  
  // Add 18% VAT
  const landlord_fee_vat = landlord_fee * 0.18;
  const landlord_fee_total = landlord_fee + landlord_fee_vat;

  const client_fee_vat = client_fee * 0.18;
  const client_fee_total = client_fee + client_fee_vat;

  // Calculate total revenue (with discounts applied)
  const totalRevenue = landlord_fee + client_fee;
  
  // Agent income calculation: Always 40% of total revenue (gross)
  const agent_income_gross = totalRevenue * 0.40;
  
  // Agent TAX calculation based on VAT type
  let agent_tax = 0;
  let agent_income = agent_income_gross;
  
  // Determine vat_type (use new vat_type if provided, otherwise convert old vatable boolean)
  let finalVatType = vat_type;
  if (!vat_type && vatable !== undefined) {
    finalVatType = vatable ? 'vatable' : 'non-vatable';
  }
  if (!finalVatType) {
    finalVatType = 'non-vatable'; // default for new records
  }
  
  if (finalVatType === 'vatable') {
    // Vatable (40%): No tax deduction - agent keeps full 40%
    agent_tax = 0;
    agent_income = agent_income_gross;
  } else if (finalVatType === 'part-time') {
    // Part Time (36%): 10% tax on gross income
    agent_tax = agent_income_gross * 0.10;
    agent_income = agent_income_gross - agent_tax; // Net = 36% of total revenue
  } else if (finalVatType === 'non-vatable') {
    // Full Time / Non-Vatable (32%): 20% tax on gross income
    agent_tax = agent_income_gross * 0.20;
    agent_income = agent_income_gross - agent_tax; // Net = 32% of total revenue
  }

  const insertData = {
    user_id,
    ref_no: ref_no ?? null,
    client_name: client_name ?? null,
    rent_amount: rentAmountNum,
    landlord_fee: landlord_fee_total,
    landlord_discount: landlord_discount ?? false,
    client_fee: client_fee_total,
    client_discount: client_discount ?? false,
    listing_fee,
    has_listing_fee: has_listing_fee ?? false,
    agent_income,
    agent_tax,
    vat_type: finalVatType,
    vatable: vatable ?? true, // Keep for backward compatibility
    deal_type: deal_type ?? 'longlet',
    date_rented: date_rented ?? null,
    date_signed: date_signed ?? null,
    date_move_in: date_move_in ?? null,
    landlord_paid_date: landlord_paid_date ?? null,
    client_paid_date: client_paid_date ?? null,
    collaboration_with: collaboration_with ?? null,
    inform_boss_after_both_sides_paid: inform_boss_after_both_sides_paid ?? false,
    only_listing_fee: only_listing_fee ?? false,
    boss_notified: false,
  };

  const { data, error } = await supabase
    .from('revenue')
    .insert([insertData])
    .select()
    .single();

  if (!error) {
    // Check if deal is finalized (both sides paid and inform_boss checked)
    const isDealFinalized = inform_boss_after_both_sides_paid && landlord_paid_date && client_paid_date;

    // Log activity - use deal_finalized if both sides paid and inform_boss checked
    await logActivity(supabase, {
      user_id,
      type: isDealFinalized ? 'deal_finalized' : 'new_revenue_added',
      data: { ref_no, client_name, rent_amount: rentAmountNum }
    });

    // Send email and push notification to boss if deal is finalized
    if (isDealFinalized) {
      await sendBossNotification(supabase, user_id, data);
    }

    // Check if agent just qualified for a bonus (both dates paid = completed deal)
    if (landlord_paid_date && client_paid_date) {
      await checkAndNotifyAgentBonus(supabase, user_id, landlord_paid_date, client_paid_date);
    }
  }

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, data });
}

// PUT - Update existing revenue record
export async function PUT(req: NextRequest) {
  // Rate limiting: 60 requests per minute per user
  const rateLimitResult = await rateLimit(req, RateLimitPresets.MEDIUM);
  if (rateLimitResult) return rateLimitResult;
  const supabase = await createClient();
  const body = await req.json();

  const {
    id,
    ref_no,
    client_name,
    rent_amount,
    landlord_discount,
    client_discount,
    has_listing_fee,
    vatable,
    vat_type,
    deal_type,
    date_rented,
    date_signed,
    date_move_in,
    landlord_paid_date,
    client_paid_date,
    collaboration_with,
    inform_boss_after_both_sides_paid,
    only_listing_fee,
    target_user_id
  } = body;

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const user_id = user.id;

  // Calculate fees
  const rentAmountNum = parseFloat(rent_amount) || 0;
  
  let landlord_fee = 0;
  let client_fee = 0;
  let listing_fee = 0;
  
  if (deal_type === 'shortlet') {
    // Shortlet: Total Owner Rent Income calculation
    // Base landlord fee: 10% of total owner rent income
    landlord_fee = rentAmountNum * 0.10;
    if (landlord_discount) {
      landlord_fee = landlord_fee * 0.85; // 15% discount
    }

    // Base client fee: 10% of total owner rent income
    client_fee = rentAmountNum * 0.10;
    if (client_discount) {
      client_fee = client_fee * 0.85; // 15% discount
    }
    
    // No listing fee for shortlet
    listing_fee = 0;
  } else {
    // Longlet: Rent Amount calculation (original logic)
    // Landlord fee: half of rent amount, with optional 15% discount
    landlord_fee = rentAmountNum / 2;
    if (landlord_discount) {
      landlord_fee = landlord_fee * 0.85; // 15% discount
    }

    // Client fee: half of rent amount, with optional 15% discount
    client_fee = rentAmountNum / 2;
    if (client_discount) {
      client_fee = client_fee * 0.85; // 15% discount
    }
    
    // Listing fee is 5% of rent amount if has_listing_fee is true
    listing_fee = has_listing_fee ? rentAmountNum * 0.05 : 0;
  }
  
  // Add 18% VAT
  const landlord_fee_vat = landlord_fee * 0.18;
  const landlord_fee_total = landlord_fee + landlord_fee_vat;

  const client_fee_vat = client_fee * 0.18;
  const client_fee_total = client_fee + client_fee_vat;

  // Calculate total revenue (with discounts applied)
  const totalRevenue = landlord_fee + client_fee;
  
  // Agent income calculation: Always 40% of total revenue (gross)
  const agent_income_gross = totalRevenue * 0.40;
  
  // Agent TAX calculation based on VAT type
  let agent_tax = 0;
  let agent_income = agent_income_gross;
  
  // Determine vat_type (use new vat_type if provided, otherwise convert old vatable boolean)
  let finalVatType = vat_type;
  if (!vat_type && vatable !== undefined) {
    finalVatType = vatable ? 'vatable' : 'non-vatable';
  }
  if (!finalVatType) {
    finalVatType = 'vatable'; // default
  }
  
  if (finalVatType === 'vatable') {
    // Vatable (40%): No tax deduction - agent keeps full 40%
    agent_tax = 0;
    agent_income = agent_income_gross;
  } else if (finalVatType === 'part-time') {
    // Part Time (36%): 10% tax on gross income
    agent_tax = agent_income_gross * 0.10;
    agent_income = agent_income_gross - agent_tax; // Net = 36% of total revenue
  } else if (finalVatType === 'non-vatable') {
    // Full Time / Non-Vatable (32%): 20% tax on gross income
    agent_tax = agent_income_gross * 0.20;
    agent_income = agent_income_gross - agent_tax; // Net = 32% of total revenue
  }

  // Get user role and full_name to check permissions
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('user_id', user_id)
    .single();

  const userRole = userProfile?.role;
  const isElevatedUser = ['teamleader', 'manager', 'boss', 'admin'].includes(userRole || '');

  // Get previous record to check permissions and boss notification
  const { data: prevRecord } = await supabase
    .from('revenue')
    .select('*')
    .eq('id', id)
    .single();

  if (!prevRecord) {
    return NextResponse.json({ 
      success: false, 
      error: 'Revenue record not found' 
    }, { status: 404 });
  }

  // Permission check: owner, elevated user, or collaboration partner
  const isOwner = prevRecord.user_id === user_id;
  const isCollabPartner = !!(userProfile?.full_name && 
    prevRecord.collaboration_with === userProfile.full_name &&
    prevRecord.user_id !== user_id);

  if (!isOwner && !isElevatedUser && !isCollabPartner) {
    return NextResponse.json({ 
      success: false, 
      error: 'You do not have permission to update this record' 
    }, { status: 403 });
  }

  const updateData: Record<string, any> = {
    ref_no: ref_no ?? null,
    client_name: client_name ?? null,
    rent_amount: rentAmountNum,
    landlord_fee: landlord_fee_total,
    landlord_discount: landlord_discount ?? false,
    client_fee: client_fee_total,
    client_discount: client_discount ?? false,
    listing_fee,
    has_listing_fee: has_listing_fee ?? false,
    agent_income,
    agent_tax,
    vat_type: finalVatType,
    vatable: vatable ?? true, // Keep for backward compatibility
    deal_type: deal_type ?? 'longlet',
    date_rented: date_rented ?? null,
    date_signed: date_signed ?? null,
    date_move_in: date_move_in ?? null,
    landlord_paid_date: landlord_paid_date ?? null,
    client_paid_date: client_paid_date ?? null,
    collaboration_with: collaboration_with ?? null,
    inform_boss_after_both_sides_paid: inform_boss_after_both_sides_paid ?? false,
    only_listing_fee: only_listing_fee ?? false,
  };

  // Collab partners must not change the collaboration_with field (RLS depends on it)
  if (isCollabPartner && !isOwner) {
    updateData.collaboration_with = prevRecord.collaboration_with;
  }

  // If elevated user wants to reassign the deal to another agent
  if (target_user_id && isElevatedUser) {
    updateData.user_id = target_user_id;
  }

  // Update query - permissions already verified above
  const { data, error } = await supabase
    .from('revenue')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (!error) {
    // Check if boss notification is needed
    const bothDatesPaid = landlord_paid_date && client_paid_date;
    const shouldNotify = inform_boss_after_both_sides_paid && bothDatesPaid && !prevRecord?.boss_notified;

    // Log activity - use deal_finalized if shouldNotify is true
    await logActivity(supabase, {
      user_id,
      type: shouldNotify ? 'deal_finalized' : 'revenue_updated',
      data: { ref_no, client_name, rent_amount: rentAmountNum }
    });

    if (shouldNotify) {
      await sendBossNotification(supabase, user_id, data);
    }

    // Check if agent just qualified for a bonus (both dates paid = completed deal)
    if (landlord_paid_date && client_paid_date) {
      const dealOwnerId = (target_user_id && isElevatedUser) ? (updateData.user_id || prevRecord.user_id) : user_id;
      await checkAndNotifyAgentBonus(supabase, dealOwnerId, landlord_paid_date, client_paid_date);
    }
  }

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, data });
}

// DELETE - Delete a revenue record
export async function DELETE(req: NextRequest) {
  const rateLimitResult = await rateLimit(req, RateLimitPresets.MEDIUM);
  if (rateLimitResult) return rateLimitResult;
  const supabase = await createClient();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing revenue id' }, { status: 400 });
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Get user profile for permission check
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('user_id', user.id)
    .single();

  const userRole = userProfile?.role;
  const isElevatedUser = ['teamleader', 'manager', 'boss', 'admin'].includes(userRole || '');

  // Get the record to check permissions
  const { data: record } = await supabase
    .from('revenue')
    .select('*')
    .eq('id', id)
    .single();

  if (!record) {
    return NextResponse.json({ success: false, error: 'Revenue record not found' }, { status: 404 });
  }

  // Permission check: owner, elevated user, or collaboration partner
  const isOwner = record.user_id === user.id;
  const isCollabPartner = !!(userProfile?.full_name &&
    record.collaboration_with === userProfile.full_name &&
    record.user_id !== user.id);

  if (!isOwner && !isElevatedUser && !isCollabPartner) {
    return NextResponse.json({
      success: false,
      error: 'You do not have permission to delete this record'
    }, { status: 403 });
  }

  const { error } = await supabase
    .from('revenue')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  // Log activity
  await logActivity(supabase, {
    user_id: user.id,
    type: 'revenue_deleted',
    data: { ref_no: record.ref_no, client_name: record.client_name, rent_amount: record.rent_amount }
  });

  return NextResponse.json({ success: true });
}

import type { SupabaseClient } from '@supabase/supabase-js'

interface RevenueData {
  id?: string;
  ref_no?: string | null;
  client_name?: string | null;
  rent_amount?: number | null;
  landlord_fee?: number | null;
  client_fee?: number | null;
  agent_income?: number | null;
  [key: string]: unknown;
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

// Helper function to send boss notification
async function sendBossNotification(supabase: SupabaseClient, user_id: string, revenueData: RevenueData) {
  try {
    // Get user profile for agent name
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user_id)
      .single();

    // Get boss users
    const { data: bossUsers } = await supabase
      .from('profiles')
      .select('email, full_name, user_id')
      .eq('role', 'boss');

    // Get manager users
    const { data: managerUsers } = await supabase
      .from('profiles')
      .select('email, full_name, user_id')
      .eq('role', 'manager');

    // Get team leader users
    const { data: teamLeaderUsers } = await supabase
      .from('profiles')
      .select('email, full_name, user_id')
      .eq('role', 'teamleader');

    // Combine Boss, Manager, and Team Leader users
    const allRecipients = [
      ...(bossUsers || []),
      ...(managerUsers || []),
      ...(teamLeaderUsers || [])
    ];

    if (allRecipients && allRecipients.length > 0) {
      const agentName = userProfile?.full_name || 'Agent';

      // Send email and push notification to each recipient (Boss + Team Leaders)
      for (const recipient of allRecipients) {
        // Send email
        if (recipient.email) {
          const emailHtml = generateRevenueNotificationEmail({
            ref_no: revenueData.ref_no || '',
            client_name: revenueData.client_name || '',
            rent_amount: revenueData.rent_amount || 0,
            landlord_fee: revenueData.landlord_fee || 0,
            client_fee: revenueData.client_fee || 0,
            agent_income: revenueData.agent_income || 0,
            agentName,
            bossName: recipient.full_name || 'Manager',
          });

          await sendEmail({
            to: recipient.email,
            subject: `Revenue Completed: ${revenueData.ref_no} - ${revenueData.client_name}`,
            html: emailHtml,
          });

          // Send push notification (user_id already available from select query)
          if (recipient.user_id) {
            await sendBossNotificationPush(recipient.user_id, {
              title: '💰 Deal Finalized',
              body: `${agentName} finalized the deal for ${revenueData.ref_no} - €${revenueData.rent_amount || 0}`,
              icon: '/icons/Logo/192.png',
              badge: '/icons/Logo/96.png',
              tag: 'deal-finalized-notification',
              data: {
                type: 'deal_finalized',
                ref_no: revenueData.ref_no,
                agent_name: agentName,
                rent_amount: revenueData.rent_amount,
                url: '/dashboard/revenue',
              },
            });
          }
        }
      }

      // Mark as notified
      await supabase
        .from('revenue')
        .update({ boss_notified: true })
        .eq('id', revenueData.id);
    }
  } catch (emailError) {
    console.error('Error sending boss notification:', emailError);
  }
}

// Generate email HTML for revenue notification
function generateRevenueNotificationEmail(data: {
  ref_no: string;
  client_name: string;
  rent_amount: number;
  landlord_fee: number;
  client_fee: number;
  agent_income: number;
  agentName: string;
  bossName: string;
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .detail-row { margin: 10px 0; padding: 10px; background-color: white; border-radius: 3px; }
        .label { font-weight: bold; color: #6B7280; }
        .value { color: #111827; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6B7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Revenue Payment Completed</h2>
        </div>
        <div class="content">
          <p>Dear ${data.bossName},</p>
          <p>Both landlord and client payments have been completed for the following deal:</p>
          
          <div class="detail-row">
            <span class="label">Ref No:</span>
            <span class="value">${data.ref_no}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Client Name:</span>
            <span class="value">${data.client_name}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Rent Amount:</span>
            <span class="value">€${data.rent_amount.toFixed(2)}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Landlord Fee:</span>
            <span class="value">€${data.landlord_fee.toFixed(2)}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Client Fee:</span>
            <span class="value">€${data.client_fee.toFixed(2)}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Agent Income:</span>
            <span class="value">€${data.agent_income.toFixed(2)}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Agent:</span>
            <span class="value">${data.agentName}</span>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from the Letify system.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ─── Agent Bonus Notification Logic ──────────────────────────────────────────

function calculateAgentBonusServer(
  dealCount: number,
  totalRent: number
): { scheme: 'contract' | 'agency_fee' | 'none'; bonus: number; label: string } {
  if (dealCount >= 6) {
    let rate = 0.50;
    let label = '6 contracts → 50%';
    if (dealCount >= 10) { rate = 0.70; label = '10+ contracts → 70%'; }
    else if (dealCount >= 9) { rate = 0.65; label = '9 contracts → 65%'; }
    else if (dealCount >= 8) { rate = 0.60; label = '8 contracts → 60%'; }
    else if (dealCount >= 7) { rate = 0.55; label = '7 contracts → 55%'; }
    const averageRent = dealCount > 0 ? totalRent / dealCount : 0;
    return { scheme: 'contract', bonus: Math.round(rate * averageRent * 100) / 100, label };
  }
  if (totalRent >= 5000) return { scheme: 'agency_fee', bonus: 300, label: 'Agency Fee Bonus (€5K+ rent → €300)' };
  if (totalRent >= 3000) return { scheme: 'agency_fee', bonus: 150, label: 'Agency Fee Bonus (€3K+ rent → €150)' };
  return { scheme: 'none', bonus: 0, label: '' };
}

async function checkAndNotifyAgentBonus(
  supabase: SupabaseClient,
  agentUserId: string,
  landlordPaidDate: string,
  clientPaidDate: string
) {
  try {
    // First check if this user is actually an agent
    const { data: agentProfile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('user_id', agentUserId)
      .single();

    if (!agentProfile || agentProfile.role !== 'agent') return;

    // Determine the completion month (later of the two dates)
    const landlordDate = new Date(landlordPaidDate);
    const clientDate = new Date(clientPaidDate);
    const completionDate = landlordDate > clientDate ? landlordDate : clientDate;
    const completionMonth = `${completionDate.getFullYear()}-${String(completionDate.getMonth() + 1).padStart(2, '0')}`;
    const monthStart = `${completionMonth}-01`;
    const [yearStr, monthStr] = completionMonth.split('-');
    const nextMonth = parseInt(monthStr) === 12
      ? `${parseInt(yearStr) + 1}-01-01`
      : `${yearStr}-${String(parseInt(monthStr) + 1).padStart(2, '0')}-01`;

    // Get all completed deals for this agent in the completion month
    // A completed deal = both landlord_paid_date AND client_paid_date exist,
    // and the LATER of the two falls within the completion month
    const { data: allDeals } = await supabase
      .from('revenue')
      .select('rent_amount, landlord_paid_date, client_paid_date, collaboration_with')
      .eq('user_id', agentUserId)
      .not('landlord_paid_date', 'is', null)
      .not('client_paid_date', 'is', null);

    if (!allDeals || allDeals.length === 0) return;

    // Filter deals whose completion month matches
    const monthDeals = allDeals.filter((d) => {
      const ld = new Date(d.landlord_paid_date!);
      const cd = new Date(d.client_paid_date!);
      const later = ld > cd ? ld : cd;
      const dm = `${later.getFullYear()}-${String(later.getMonth() + 1).padStart(2, '0')}`;
      return dm === completionMonth;
    });

    const dealCount = monthDeals.length;
    const totalRent = monthDeals.reduce((sum, d) => {
      const rent = d.rent_amount || 0;
      const hasCollab = (d.collaboration_with?.trim() || '') !== '';
      return sum + (hasCollab ? rent / 2 : rent);
    }, 0);

    // Calculate current bonus
    const currentBonus = calculateAgentBonusServer(dealCount, totalRent);
    if (currentBonus.scheme === 'none') return;

    // Calculate previous bonus (without this deal) to check if threshold was just crossed
    const prevDealCount = dealCount - 1;
    const prevTotalRent = totalRent - (() => {
      // Find the "latest" deal to subtract (approximate - just use current deal's contribution)
      const lastDeal = monthDeals[monthDeals.length - 1];
      const rent = lastDeal?.rent_amount || 0;
      const hasCollab = (lastDeal?.collaboration_with?.trim() || '') !== '';
      return hasCollab ? rent / 2 : rent;
    })();
    const prevBonus = calculateAgentBonusServer(prevDealCount, Math.max(0, prevTotalRent));

    // Only notify if bonus status changed (new qualification or tier upgrade)
    const bonusChanged = currentBonus.scheme !== prevBonus.scheme ||
      currentBonus.bonus !== prevBonus.bonus;
    if (!bonusChanged) return;

    const agentName = agentProfile.full_name || 'Agent';
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthLabel = `${monthNames[parseInt(monthStr) - 1]} ${yearStr}`;

    // Get teamleader, manager, and boss users
    const { data: recipients } = await supabase
      .from('profiles')
      .select('email, full_name, user_id, role')
      .in('role', ['teamleader', 'manager', 'boss']);

    if (!recipients || recipients.length === 0) return;

    const bonusText = currentBonus.scheme === 'contract'
      ? `Contract Bonus: ${currentBonus.label} = €${currentBonus.bonus.toFixed(2)}`
      : `${currentBonus.label}`;

    // Send notifications to each recipient
    for (const recipient of recipients) {
      // Send email
      if (recipient.email) {
        const emailHtml = generateBonusNotificationEmail({
          recipientName: recipient.full_name || 'Manager',
          agentName,
          monthLabel,
          dealCount,
          totalRent,
          bonusText,
          bonusAmount: currentBonus.bonus,
        });

        await sendEmail({
          to: recipient.email,
          subject: `🏆 Agent Bonus Earned: ${agentName} - ${monthLabel}`,
          html: emailHtml,
        });
      }

      // Send push notification
      if (recipient.user_id) {
        await sendBossNotificationPush(recipient.user_id, {
          title: '🏆 Agent Bonus Earned!',
          body: `${agentName} earned a bonus in ${monthLabel}: ${dealCount} deals, €${currentBonus.bonus.toFixed(2)}`,
          icon: '/icons/Logo/192.png',
          badge: '/icons/Logo/96.png',
          tag: `agent-bonus-${agentUserId}-${completionMonth}`,
          data: {
            type: 'agent_bonus_earned',
            agent_name: agentName,
            month: completionMonth,
            bonus_amount: currentBonus.bonus,
            url: '/dashboard/revenue',
          },
        });
      }
    }

    console.log(`Agent bonus notification sent for ${agentName}: ${currentBonus.label}`);
  } catch (error) {
    console.error('Error checking agent bonus:', error);
  }
}

// Generate email HTML for agent bonus notification
function generateBonusNotificationEmail(data: {
  recipientName: string;
  agentName: string;
  monthLabel: string;
  dealCount: number;
  totalRent: number;
  bonusText: string;
  bonusAmount: number;
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b5cf6, #f59e0b); color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center; }
        .header h2 { margin: 0; }
        .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .detail-row { margin: 10px 0; padding: 10px; background-color: white; border-radius: 3px; display: flex; justify-content: space-between; }
        .label { font-weight: bold; color: #6B7280; }
        .value { color: #111827; font-weight: 600; }
        .bonus-highlight { background-color: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 5px; text-align: center; margin: 15px 0; }
        .bonus-amount { font-size: 24px; font-weight: bold; color: #b45309; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6B7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🏆 Agent Bonus Earned!</h2>
        </div>
        <div class="content">
          <p>Dear ${data.recipientName},</p>
          <p><strong>${data.agentName}</strong> has earned a bonus for <strong>${data.monthLabel}</strong>!</p>
          
          <div class="detail-row">
            <span class="label">Agent:</span>
            <span class="value">${data.agentName}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Month:</span>
            <span class="value">${data.monthLabel}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Completed Deals:</span>
            <span class="value">${data.dealCount}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Total Rent:</span>
            <span class="value">€${data.totalRent.toFixed(2)}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Bonus Type:</span>
            <span class="value">${data.bonusText}</span>
          </div>
          
          <div class="bonus-highlight">
            <div>Bonus Amount</div>
            <div class="bonus-amount">€${data.bonusAmount.toFixed(2)}</div>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from the Letify system.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Helper function to send push notification to boss
async function sendBossNotificationPush(userId: string, payload: NotificationPayload) {
  try {
    const supabase = await createClient();
    
    // Get user's push subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, keys')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return;
    }

    // Send notification to all user's devices
    const notificationPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload)
        );
      } catch (err) {
        const error = err as { statusCode?: number }
        // If subscription is invalid/expired, remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .eq('endpoint', sub.endpoint);
        }
        console.error('Error sending notification:', err);
      }
    });

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error in sendBossNotificationPush:', error);
  }
}
