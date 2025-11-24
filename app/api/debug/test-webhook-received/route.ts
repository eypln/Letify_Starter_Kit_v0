import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    console.log("=== TEST WEBHOOK RECEIVED ===");
    console.log("Timestamp:", new Date().toISOString());
    
    // Log request headers
    console.log("Request headers:");
    for (const [key, value] of req.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    
    // Get raw body
    const rawBody = await req.text();
    console.log("Raw body:", rawBody.substring(0, 200) + (rawBody.length > 200 ? "..." : ""));
    console.log("Raw body length:", rawBody.length);
    
    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(rawBody);
      console.log("Parsed JSON data:", jsonData);
    } catch {
      console.log("Body is not valid JSON");
    }
    
    console.log("=== TEST WEBHOOK PROCESSING COMPLETED ===");
    return NextResponse.json({ received: true, timestamp: new Date().toISOString() }, { status: 200 });
  } catch (error) {
    console.error("Test webhook error:", error);
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}