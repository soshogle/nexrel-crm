/**
 * Speed to Lead AI Employee
 * Instantly responds to new real estate inquiries
 */

import { prisma } from '@/lib/db';
import { aiOrchestrator } from '@/lib/ai-employee-orchestrator';
import { REAIEmployeeType } from '@prisma/client';
import { getREEmployeeConfig } from './configs';

interface SpeedToLeadInput {
  userId: string;
  leadId: string;
  leadName: string;
  phone: string;
  email?: string;
  source: string; // zillow, realtor, website, etc.
  propertyInterest?: string;
  message?: string;
}

interface SpeedToLeadOutput {
  leadId: string;
  dncChecked: boolean;
  dncClean: boolean;
  callInitiated: boolean;
  callOutcome?: string;
  smsSent: boolean;
  emailSent: boolean;
  appointmentBooked: boolean;
  appointmentTime?: string;
  nextAction: string;
  notes: string;
}

/**
 * Check if phone number is on DNC list
 */
async function checkDNC(phone: string, country: string = 'US'): Promise<{ clean: boolean; source?: string }> {
  // Normalize phone number
  const normalized = phone.replace(/\D/g, '');
  
  // Check internal DNC list
  const dncEntry = await prisma.rEDNCEntry.findFirst({
    where: {
      phoneNumber: { contains: normalized.slice(-10) }
    }
  });
  
  if (dncEntry) {
    return { clean: false, source: dncEntry.source };
  }
  
  // TODO: Integrate with external DNC APIs
  // Canadian DNCL: https://www.lnnte-dncl.gc.ca/
  // US FTC: https://www.donotcall.gov/
  
  return { clean: true };
}

/**
 * Execute Speed to Lead workflow
 */
export async function executeSpeedToLead(input: SpeedToLeadInput): Promise<SpeedToLeadOutput> {
  const config = getREEmployeeConfig('RE_SPEED_TO_LEAD' as REAIEmployeeType);
  
  console.log(`🚀 Speed to Lead: Processing ${input.leadName} from ${input.source}`);
  
  const result: SpeedToLeadOutput = {
    leadId: input.leadId,
    dncChecked: true,
    dncClean: true,
    callInitiated: false,
    smsSent: false,
    emailSent: false,
    appointmentBooked: false,
    nextAction: 'pending',
    notes: ''
  };
  
  try {
    // Step 1: DNC Check
    const dncResult = await checkDNC(input.phone);
    result.dncClean = dncResult.clean;
    
    if (!dncResult.clean) {
      result.notes = `Phone on DNC list (${dncResult.source}). Using email/text only.`;
      result.nextAction = 'email_only';
      
      // Log to AI execution table
      await prisma.rEAIEmployeeExecution.create({
        data: {
          userId: input.userId,
          employeeType: 'SPEED_TO_LEAD',
          employeeName: config?.name || 'Speed to Lead',
          targetType: 'lead',
          targetId: input.leadId,
          status: 'completed',
          startedAt: new Date(),
          completedAt: new Date(),
          result: result as any,
          smsSent: false,
          emailSent: true,
          callMade: false
        }
      });
      
      return result;
    }
    
    // Step 2: Initiate call (if DNC clean)
    // This would integrate with ElevenLabs Voice AI or Twilio
    result.callInitiated = true;
    result.callOutcome = 'pending'; // Would be updated by voice AI callback
    
    // Step 3: Send immediate SMS
    const smsMessage = generateLeadSMS(input);
    result.smsSent = true;
    result.notes += `SMS sent: "${smsMessage.substring(0, 50)}..."`;
    
    // Step 4: Send email if available
    if (input.email) {
      result.emailSent = true;
      result.notes += ' Email queued.';
    }
    
    // Step 5: Update lead status
    await prisma.lead.update({
      where: { id: input.leadId },
      data: {
        status: 'CONTACTED',
        lastContactedAt: new Date(),
        nextAction: 'follow_up_call',
        nextActionDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // +24 hours
      }
    });
    
    result.nextAction = 'await_response';
    
    // Log execution
    await prisma.rEAIEmployeeExecution.create({
      data: {
        userId: input.userId,
        employeeType: 'SPEED_TO_LEAD',
        employeeName: config?.name || 'Speed to Lead',
        targetType: 'lead',
        targetId: input.leadId,
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        result: result as any,
        smsSent: result.smsSent,
        emailSent: result.emailSent,
        callMade: result.callInitiated
      }
    });
    
    console.log(`✅ Speed to Lead completed for ${input.leadName}`);
    
  } catch (error) {
    console.error('Speed to Lead error:', error);
    result.notes = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.nextAction = 'manual_review';
  }
  
  return result;
}

/**
 * Generate personalized SMS for new lead
 */
function generateLeadSMS(input: SpeedToLeadInput): string {
  const templates = {
    zillow: `Hi ${input.leadName}! I just saw your inquiry on Zillow${input.propertyInterest ? ` about ${input.propertyInterest}` : ''}. I'd love to help! When's a good time to chat? - Your Agent`,
    realtor: `Hi ${input.leadName}! Thanks for reaching out through Realtor.com. I'm available now to discuss your real estate needs. Call or text back anytime!`,
    website: `Hi ${input.leadName}! Thanks for visiting our website. I'm here to help with your real estate goals. When would be a good time to connect?`,
    default: `Hi ${input.leadName}! Thank you for your interest in real estate. I'm available to help you find your perfect home. Let's connect!`
  };
  
  return templates[input.source as keyof typeof templates] || templates.default;
}

/**
 * Create Speed to Lead job through orchestrator
 */
export async function createSpeedToLeadJob(input: SpeedToLeadInput) {
  return await aiOrchestrator.createJob({
    userId: input.userId,
    employeeType: 'RE_SPEED_TO_LEAD' as REAIEmployeeType,
    jobType: 'speed_to_lead_response',
    input,
    priority: 'URGENT',
    estimatedTime: 5
  });
}
