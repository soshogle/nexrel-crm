import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { validateLead } from '@/lib/lead-generation/data-validation';
import { scoreAndSaveLead } from '@/lib/lead-generation/lead-scoring-db';

const prisma = new PrismaClient();

/**
 * POST /api/lead-generation/capture/voice
 * Capture lead from Voice AI widget
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      fullName,
      email,
      phone,
      transcript,
      userId
    } = body;
    
    // Validate required fields
    if (!fullName || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate user ID
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing user ID' },
        { status: 400 }
      );
    }
    
    // Validate lead data
    const validation = await validateLead({
      businessName: fullName,
      email,
      phone
    });
    
    // Create lead
    const lead = await prisma.lead.create({
      data: {
        userId,
        businessName: fullName,
        contactPerson: fullName,
        email,
        phone,
        source: 'voice_ai',
        status: 'NEW',
        validationScore: validation.validationScore,
        validationErrors: validation.validationErrors,
        qualityFlag: validation.qualityFlag,
        engagementHistory: {
          voiceAIInteraction: true,
          voiceAITranscript: transcript,
          voiceAIInteractedAt: new Date().toISOString()
        }
      }
    });
    
    // Score the lead
    try {
      await scoreAndSaveLead(lead.id);
    } catch (error) {
      console.error('Error scoring lead:', error);
      // Continue even if scoring fails
    }
    
    return NextResponse.json({
      success: true,
      leadId: lead.id,
      message: 'Lead captured successfully'
    });
  } catch (error) {
    console.error('Error capturing lead from voice AI:', error);
    return NextResponse.json(
      { error: 'Failed to capture lead' },
      { status: 500 }
    );
  }
}
