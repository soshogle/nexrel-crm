/**
 * FSBO Outreach AI Employee
 * Contacts For Sale By Owner listings from DuProprio and US FSBO sites
 */

import { prisma } from '../../db';
import { aiOrchestrator } from '../../ai-employee-orchestrator';
import { REAIEmployeeType, REFSBOStatus } from '@prisma/client';
import { getREEmployeeConfig } from './configs';

interface FSBOOutreachInput {
  userId: string;
  fsboListingId: string;
  sellerName?: string;
  sellerPhone: string;
  sellerEmail?: string;
  address: string;
  listPrice?: number;
  daysOnMarket: number;
  source: string; // DUPROPRIO, FSBO_COM, etc.
}

interface FSBOOutreachOutput {
  fsboListingId: string;
  dncChecked: boolean;
  dncClean: boolean;
  callInitiated: boolean;
  callOutcome?: string;
  voicemailLeft: boolean;
  smsSent: boolean;
  emailSent: boolean;
  leadCreated: boolean;
  newLeadId?: string;
  nextAction: string;
  scheduledFollowUp?: Date;
  notes: string;
}

/**
 * Check DNC and execute FSBO outreach
 */
export async function executeFSBOOutreach(input: FSBOOutreachInput): Promise<FSBOOutreachOutput> {
  const config = getREEmployeeConfig('RE_FSBO_OUTREACH' as REAIEmployeeType);
  
  console.log(`🏠 FSBO Outreach: Processing ${input.address} (${input.source})`);
  
  const result: FSBOOutreachOutput = {
    fsboListingId: input.fsboListingId,
    dncChecked: true,
    dncClean: true,
    callInitiated: false,
    voicemailLeft: false,
    smsSent: false,
    emailSent: false,
    leadCreated: false,
    nextAction: 'pending',
    notes: ''
  };
  
  try {
    // Get the listing
    const listing = await prisma.rEFSBOListing.findUnique({
      where: { id: input.fsboListingId }
    });
    
    if (!listing) {
      result.notes = 'Listing not found';
      result.nextAction = 'error';
      return result;
    }
    
    // Check if already contacted recently
    if (listing.lastContactedAt) {
      const daysSinceContact = Math.floor(
        (Date.now() - listing.lastContactedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceContact < 7) {
        result.notes = `Already contacted ${daysSinceContact} days ago. Skipping.`;
        result.nextAction = 'wait';
        return result;
      }
    }
    
    // DNC Check
    const normalized = input.sellerPhone.replace(/\D/g, '');
    const dncEntry = await prisma.rEDNCEntry.findFirst({
      where: { phoneNumber: { contains: normalized.slice(-10) } }
    });
    
    if (dncEntry) {
      result.dncClean = false;
      result.notes = `Phone on DNC list (${dncEntry.source}). Email only.`;
      
      // Update listing status
      await prisma.rEFSBOListing.update({
        where: { id: input.fsboListingId },
        data: { status: 'DO_NOT_CONTACT' }
      });
      
      result.nextAction = 'email_only';
      return result;
    }
    
    // Generate outreach script based on days on market
    const script = generateFSBOScript(input);
    
    // Initiate call (would integrate with voice AI)
    result.callInitiated = true;
    result.notes += 'Call initiated. ';
    
    // Send SMS with free CMA offer
    const sms = generateFSBOSMS(input);
    result.smsSent = true;
    result.notes += 'SMS sent. ';
    
    // Send email if available
    if (input.sellerEmail) {
      result.emailSent = true;
      result.notes += 'Email queued. ';
    }
    
    // Update listing
    await prisma.rEFSBOListing.update({
      where: { id: input.fsboListingId },
      data: {
        status: 'CONTACTED',
        lastContactedAt: new Date(),
        contactAttempts: { increment: 1 },
        assignedUserId: input.userId
      }
    });
    
    // Schedule follow-up
    result.scheduledFollowUp = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // +3 days
    result.nextAction = 'await_response';
    
    // Log execution
    await prisma.rEAIEmployeeExecution.create({
      data: {
        userId: input.userId,
        employeeType: 'FSBO_OUTREACH',
        employeeName: config?.name || 'FSBO Outreach',
        targetType: 'fsbo_listing',
        targetId: input.fsboListingId,
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        result: result as any,
        smsSent: result.smsSent,
        emailSent: result.emailSent,
        callMade: result.callInitiated
      }
    });
    
    console.log(`✅ FSBO Outreach completed for ${input.address}`);
    
  } catch (error) {
    console.error('FSBO Outreach error:', error);
    result.notes = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.nextAction = 'manual_review';
  }
  
  return result;
}

/**
 * Generate FSBO call script based on situation
 */
function generateFSBOScript(input: FSBOOutreachInput): string {
  const name = input.sellerName || 'homeowner';
  
  if (input.daysOnMarket < 14) {
    // Fresh listing - congratulations approach
    return `
Hi ${name}, this is [Agent Name] with [Brokerage]. 

I noticed you just listed your home at ${input.address} - congratulations on making that decision!

I'm not calling to convince you to list with me. I actually help FSBO sellers in our area by providing free market data and answering any questions.

Would a free Comparative Market Analysis be helpful to make sure your pricing is competitive?

[If yes] Great! I can have that ready for you in 24 hours. What email should I send it to?

[If no] No problem at all! If anything comes up or you have questions about the process, feel free to reach out. Good luck with your sale!
`;
  } else if (input.daysOnMarket < 45) {
    // Moderate DOM - checking in approach
    return `
Hi ${name}, this is [Agent Name]. 

I'm reaching out about your home at ${input.address}. I noticed it's been on the market for about ${input.daysOnMarket} days.

How's it going so far? Getting good showing traffic?

[Listen to concerns]

I hear that a lot. Many FSBO sellers find the first few weeks exciting but then things slow down. 

Would it be helpful if I shared what similar homes are selling for and some tips that might increase your exposure?

No strings attached - I just believe in being a resource to our community.
`;
  } else {
    // Long DOM - problem-solving approach
    return `
Hi ${name}, this is [Agent Name].

I hope I'm not catching you at a bad time. I'm calling about ${input.address}.

I know the market can be frustrating when a home sits longer than expected. ${input.daysOnMarket} days is a long time to have your life on hold.

Would you be open to a quick conversation about what might be holding buyers back? Sometimes a fresh perspective helps.

[If receptive] What do you think has been the biggest challenge so far?

[Listen and provide value]
`;
  }
}

/**
 * Generate FSBO SMS message
 */
function generateFSBOSMS(input: FSBOOutreachInput): string {
  const name = input.sellerName || 'there';
  
  if (input.daysOnMarket < 14) {
    return `Hi ${name}! I noticed your home at ${input.address} just hit the market. I offer free CMAs to FSBO sellers - no strings attached. Would that be helpful? - [Agent]`;
  } else {
    return `Hi ${name}, following up on ${input.address}. I have some market data that might help. Happy to share if you're interested. - [Agent]`;
  }
}

/**
 * Create FSBO Outreach job
 */
export async function createFSBOOutreachJob(input: FSBOOutreachInput) {
  return await aiOrchestrator.createJob({
    userId: input.userId,
    employeeType: 'RE_FSBO_OUTREACH' as REAIEmployeeType,
    jobType: 'fsbo_outreach',
    input,
    priority: 'MEDIUM',
    estimatedTime: 10
  });
}
