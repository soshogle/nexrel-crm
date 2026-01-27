
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('TEST ENDPOINT CALLED');
  return NextResponse.json({ 
    success: true, 
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  console.log('TEST POST ENDPOINT CALLED');
  
  try {
    const body = await request.json();
    console.log('Request body:', body);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test POST working',
      receivedData: body
    });
  } catch (error: any) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
