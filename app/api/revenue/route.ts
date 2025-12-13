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

  const { data, error } = await supabase
    .from('revenue')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, data });
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
    deal_type,
    date_rented,
    date_signed,
    date_move_in,
    landlord_paid_date,
    client_paid_date,
    collaboration_with,
    inform_boss_after_both_sides_paid
  } = body;

  // Authenticated user id
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

  // Agent income calculation (always start from 40%)
  let agent_income = rentAmountNum * 0.40;
  
  // Reduce agent income based on discounts
  // If landlord has 15% discount, reduce agent income by 7.5%
  // If client has 15% discount, reduce agent income by 7.5%
  let agent_income_reduction = 0;
  if (landlord_discount) {
    agent_income_reduction += 0.075; // 7.5%
  }
  if (client_discount) {
    agent_income_reduction += 0.075; // 7.5%
  }
  
  if (agent_income_reduction > 0) {
    agent_income = agent_income * (1 - agent_income_reduction);
  }

  // Agent TAX calculation
  let agent_tax = 0;
  if (!vatable) {
    // Non-vatable: Agent pays 20% tax on their income
    agent_tax = agent_income * 0.20;
    // Reduce agent income by the tax amount (net income)
    agent_income = agent_income - agent_tax;
  }
  // If vatable, no tax deduction needed (already handled by company)

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
    vatable: vatable ?? true,
    deal_type: deal_type ?? 'longlet',
    date_rented: date_rented ?? null,
    date_signed: date_signed ?? null,
    date_move_in: date_move_in ?? null,
    landlord_paid_date: landlord_paid_date ?? null,
    client_paid_date: client_paid_date ?? null,
    collaboration_with: collaboration_with ?? null,
    inform_boss_after_both_sides_paid: inform_boss_after_both_sides_paid ?? false,
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
    inform_boss_after_both_sides_paid
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

  // Get user role to check permissions
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user_id)
    .single();

  const userRole = userProfile?.role;
  const isElevatedUser = ['teamleader', 'manager', 'boss', 'admin'].includes(userRole || '');

  // Get previous record to check if boss notification is needed
  // Elevated users can update any revenue, normal users can only update their own
  let prevRecordQuery = supabase
    .from('revenue')
    .select('*')
    .eq('id', id);
  
  if (!isElevatedUser) {
    prevRecordQuery = prevRecordQuery.eq('user_id', user_id);
  }
  
  const { data: prevRecord } = await prevRecordQuery.single();

  if (!prevRecord) {
    return NextResponse.json({ 
      success: false, 
      error: 'Revenue record not found or you do not have permission to update it' 
    }, { status: 404 });
  }

  const updateData = {
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
  };

  // Update query - elevated users can update any revenue
  let updateQuery = supabase
    .from('revenue')
    .update(updateData)
    .eq('id', id);
  
  if (!isElevatedUser) {
    updateQuery = updateQuery.eq('user_id', user_id);
  }

  const { data, error } = await updateQuery
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
  }

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, data });
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
