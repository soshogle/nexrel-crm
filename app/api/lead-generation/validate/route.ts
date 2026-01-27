import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateLead } from '@/lib/lead-generation/data-validation';

/**
 * POST /api/lead-generation/validate
 * Validate lead data quality
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    const result = await validateLead({
      businessName: body.businessName,
      email: body.email,
      phone: body.phone,
      website: body.website
    });
    
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error validating lead:', error);
    return NextResponse.json(
      { error: 'Failed to validate lead' },
      { status: 500 }
    );
  }
}
