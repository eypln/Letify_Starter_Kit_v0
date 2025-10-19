import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    console.log("=== Insert Billing Data Endpoint Called ===");
    const body = await req.json();
    console.log("Request body:", body);
    
    const { userId, table, data } = body;
    
    if (!userId || !table || !data) {
      return NextResponse.json({ error: "Missing required parameters: userId, table, and data" }, { status: 400 });
    }
    
    // Validate table name
    const allowedTables = [
      'billing_payments',
      'billing_credit_ledger',
      'credit_transactions',
      'billing_customers',
      'billing_subscriptions'
    ];
    
    if (!allowedTables.includes(table)) {
      return NextResponse.json({ error: `Invalid table name. Allowed tables: ${allowedTables.join(', ')}` }, { status: 400 });
    }
    
    // Add user_id to data
    const insertData = { ...data, user_id: userId };
    
    // Create Supabase client with service role key
    console.log("Creating Supabase client...");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );
    
    // Insert data into specified table
    console.log(`Inserting data into ${table}:`, insertData);
    const { data: result, error } = await supabase
      .from(table)
      .insert(insertData);
    
    if (error) {
      console.error(`Error inserting into ${table}:`, error);
      return NextResponse.json({ error: `Error inserting into ${table}`, details: error.message }, { status: 500 });
    }
    
    console.log(`Successfully inserted into ${table}:`, result);
    
    console.log("=== Insert Billing Data Completed Successfully ===");
    return NextResponse.json({ 
      success: true,
      table,
      insertedData: insertData,
      result
    }, { status: 200 });
  } catch (error) {
    console.error("Insert billing data error:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}