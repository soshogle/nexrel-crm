/**
 * API Route: Handle Docpen Voice Agent Function Calls
 * 
 * POST - Process custom function calls from ElevenLabs agent
 * These are called via webhook when the agent uses custom functions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import OpenAI from 'openai';

// Initialize OpenAI client via Abacus AI
const openai = new OpenAI({
  apiKey: process.env.ABACUSAI_API_KEY || '',
  baseURL: 'https://routellm.abacus.ai/v1',
});

/**
 * Lookup patient history from CRM
 */
async function lookupPatientHistory(params: {
  patientName: string;
  historyType?: string;
  userId: string;
}) {
  const { patientName, historyType = 'all', userId } = params;

  // Search leads (patients) in CRM - using contactPerson and businessName fields
  const leads = await prisma.lead.findMany({
    where: {
      userId,
      OR: [
        { contactPerson: { contains: patientName, mode: 'insensitive' } },
        { businessName: { contains: patientName, mode: 'insensitive' } },
        { email: { contains: patientName, mode: 'insensitive' } },
      ],
    },
    include: {
      notes: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      docpenSessions: {
        where: { status: 'SIGNED' },
        orderBy: { sessionDate: 'desc' },
        take: 3,
        include: {
          soapNotes: {
            where: { isCurrentVersion: true },
          },
        },
      },
    },
    take: 3,
  });

  if (leads.length === 0) {
    return {
      found: false,
      message: `No patient found matching "${patientName}" in your CRM.`,
    };
  }

  const patient = leads[0] as any;
  const response: Record<string, any> = {
    found: true,
    patientName: patient.contactPerson || patient.businessName || 'Unknown',
    email: patient.email,
    phone: patient.phone,
  };

  if (historyType === 'all' || historyType === 'visits') {
    response.recentVisits = patient.docpenSessions?.map((s: any) => ({
      date: s.sessionDate,
      chiefComplaint: s.chiefComplaint,
      assessment: s.soapNotes?.[0]?.assessment?.substring(0, 200),
    })) || [];
  }

  if (historyType === 'all' || historyType === 'notes') {
    response.notes = patient.notes?.map((n: any) => ({
      date: n.createdAt,
      content: n.content?.substring(0, 200),
    })) || [];
  }

  // Get upcoming appointments separately
  if (historyType === 'all' || historyType === 'appointments') {
    const appointments = await prisma.bookingAppointment.findMany({
      where: {
        leadId: patient.id,
        appointmentDate: { gt: new Date() },
      },
      orderBy: { appointmentDate: 'asc' },
      take: 5,
    });
    response.upcomingAppointments = appointments.map((a: any) => ({
      date: a.appointmentDate,
      duration: a.duration,
      status: a.status,
      notes: a.notes,
    }));
  }

  return response;
}

/**
 * Check drug interactions using AI
 */
async function checkDrugInteraction(params: {
  drug1: string;
  drug2: string;
  additionalDrugs?: string[];
}) {
  const { drug1, drug2, additionalDrugs = [] } = params;
  const allDrugs = [drug1, drug2, ...additionalDrugs].filter(Boolean);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a pharmacology expert assistant. Provide concise, clinically relevant drug interaction information.

Format your response as:
1. **Interaction Severity**: (None/Mild/Moderate/Severe)
2. **Clinical Significance**: Brief explanation
3. **Recommendation**: What to monitor or avoid

Be brief - this is for real-time clinical use.`,
        },
        {
          role: 'user',
          content: `Check for interactions between these medications: ${allDrugs.join(', ')}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    return {
      drugs: allDrugs,
      interaction: response.choices[0]?.message?.content || 'Unable to determine interaction.',
      disclaimer: 'This is AI-generated information. Always verify with official drug databases.',
    };
  } catch (error) {
    return {
      drugs: allDrugs,
      error: 'Unable to check drug interactions at this time.',
      recommendation: 'Please consult a pharmacist or drug interaction database.',
    };
  }
}

/**
 * Medical reference lookup using AI
 */
async function medicalReferenceLookup(params: {
  query: string;
  referenceType?: string;
}) {
  const { query, referenceType = 'general' } = params;

  try {
    let systemPrompt = 'You are a medical reference assistant. Provide concise, accurate information.';
    
    if (referenceType === 'icd10') {
      systemPrompt = 'You are an ICD-10 coding expert. Provide the most relevant ICD-10 codes for the condition described.';
    } else if (referenceType === 'cpt') {
      systemPrompt = 'You are a CPT coding expert. Provide the most relevant CPT procedure codes.';
    } else if (referenceType === 'dosage') {
      systemPrompt = 'You are a clinical pharmacist. Provide standard dosing guidelines with typical ranges.';
    } else if (referenceType === 'guidelines') {
      systemPrompt = 'You are a clinical guidelines expert. Summarize relevant practice guidelines.';
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `${systemPrompt}\n\nBe brief and direct - this is for real-time clinical use. Include relevant codes when applicable.`,
        },
        {
          role: 'user',
          content: query,
        },
      ],
      temperature: 0.3,
      max_tokens: 400,
    });

    return {
      query,
      referenceType,
      result: response.choices[0]?.message?.content || 'No information found.',
      disclaimer: 'AI-generated reference. Verify with official sources.',
    };
  } catch (error) {
    return {
      query,
      error: 'Unable to lookup reference at this time.',
    };
  }
}

/**
 * Suggest SOAP note content
 */
async function suggestSOAPContent(params: {
  section: string;
  context?: string;
  profession?: string;
}) {
  const { section, context, profession = 'general' } = params;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a medical documentation assistant specializing in ${profession}. 
Generate appropriate SOAP note content for the ${section.toUpperCase()} section.
Be professional, use standard medical terminology, and be concise.`,
        },
        {
          role: 'user',
          content: context
            ? `Based on this context: ${context}\n\nSuggest ${section} section content.`
            : `Provide a template for the ${section} section in a ${profession} consultation.`,
        },
      ],
      temperature: 0.4,
      max_tokens: 300,
    });

    return {
      section,
      suggestion: response.choices[0]?.message?.content || 'Unable to generate suggestion.',
    };
  } catch (error) {
    return {
      section,
      error: 'Unable to generate SOAP content at this time.',
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { function_name, parameters, user_id } = body;

    console.log(`🧰 [Docpen Functions] Received call: ${function_name}`, parameters);

    let result: any;

    switch (function_name) {
      case 'lookup_patient_history':
        result = await lookupPatientHistory({
          ...parameters,
          userId: user_id,
        });
        break;

      case 'check_drug_interaction':
        result = await checkDrugInteraction(parameters);
        break;

      case 'medical_reference_lookup':
        result = await medicalReferenceLookup(parameters);
        break;

      case 'suggest_soap_content':
        result = await suggestSOAPContent(parameters);
        break;

      default:
        result = { error: `Unknown function: ${function_name}` };
    }

    console.log(`✅ [Docpen Functions] ${function_name} result:`, result);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Docpen Functions] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Function execution failed' },
      { status: 500 }
    );
  }
}
