

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Fallback endpoint when WebSocket stream connection fails
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    
    console.log('⚠️ [Voice Callback Fallback] Stream connection failed for agent:', agentId);
    
    const formData = await request.formData();
    const streamStatus = formData.get('StreamStatus');
    const callSid = formData.get('CallSid');
    
    console.log('  - Stream Status:', streamStatus);
    console.log('  - Call SID:', callSid);
    
    // Return apologetic TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    We're sorry, but we're experiencing technical difficulties connecting to our voice assistant. 
    Please try again later or contact us through our website. Thank you for your patience.
  </Say>
  <Hangup/>
</Response>`;
    
    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error: any) {
    console.error('❌ [Voice Callback Fallback] Error:', error.message);
    
    // Return generic error message
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    We're sorry, but an error occurred. Please try again later.
  </Say>
  <Hangup/>
</Response>`;
    
    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
