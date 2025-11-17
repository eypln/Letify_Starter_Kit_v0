import { checkBotId } from 'botid/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Example protected endpoint with BotID verification
 * 
 * Important configuration requirements:
 * - The protected route MUST be added to the protect array in instrumentation-client.ts
 * - The client side component dictates which requests to attach special headers to for classification
 * - Local development always returns isBot: false unless you configure the developmentOptions option
 */
export async function POST(request: NextRequest) {
  try {
    // Perform BotID verification
    const verification = await checkBotId();

    // Reject if bot detected
    if (verification.isBot) {
      return NextResponse.json(
        { error: 'Bot detected. Access denied.' },
        { status: 403 },
      );
    }

    // Process the legitimate request
    const body = await request.json();
    const data = await processUserRequest(body);

    return NextResponse.json({ 
      success: true,
      data,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * Process the user request with your business logic
 */
async function processUserRequest(body: any) {
  // Your business logic here
  console.log('Processing request:', body);
  
  // Example response
  return {
    message: 'Request processed successfully',
    timestamp: new Date().toISOString(),
  };
}
