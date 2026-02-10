/**
 * Generic Multi-Industry Workflow Task Executor
 * Executes individual workflow tasks by invoking AI employees or system actions
 */

import { WorkflowTask, WorkflowInstance } from '@prisma/client';
import { prisma } from '@/lib/db';
import { sendSMS } from '@/lib/twilio';
import { EmailService } from '@/lib/email-service';
import { CalendarService } from '@/lib/calendar/calendar-service';
import { Industry } from '@prisma/client';

interface TaskResult {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}

/**
 * Execute a workflow task
 */
export async function executeTask(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const actionConfig = task.actionConfig as any;
  const actions = actionConfig?.actions || [];

  // If no actions specified, try to infer from taskType
  if (actions.length === 0) {
    const inferredAction = inferActionFromTaskType(task.taskType);
    if (inferredAction) {
      actions.push(inferredAction);
    }
  }

  const results: TaskResult[] = [];

  for (const action of actions) {
    try {
      let result: TaskResult;

      // Common actions available to all industries
      switch (action) {
        case 'voice_call':
          result = await executeVoiceCall(task, instance);
          break;
        case 'sms':
          result = await executeSMS(task, instance);
          break;
        case 'email':
          result = await executeEmail(task, instance);
          break;
        case 'task':
          result = await createTask(task, instance);
          break;
        case 'calendar':
          result = await createCalendarEvent(task, instance);
          break;
        case 'lead_research':
          result = await executeLeadResearch(task, instance);
          break;
        case 'send_referral_link':
          result = await executeSendReferralLink(task, instance);
          break;
        case 'create_referral':
          result = await executeCreateReferral(task, instance);
          break;
        case 'notify_referral_converted':
          result = await executeNotifyReferralConverted(task, instance);
          break;
        case 'request_feedback_voice':
          result = await executeRequestFeedbackVoice(task, instance);
          break;
        case 'send_review_link':
          result = await executeSendReviewLink(task, instance);
          break;
        default:
          // Try industry-specific actions
          result = await executeIndustrySpecificAction(action, task, instance);
      }

      results.push(result);
    } catch (error: any) {
      results.push({ success: false, error: error.message });
    }
  }

  // Return combined result
  const allSuccess = results.every(r => r.success);
  return {
    success: allSuccess,
    data: {
      actions: results,
      completedAt: new Date().toISOString(),
    },
    error: allSuccess ? undefined : results.find(r => !r.success)?.error,
  };
}

/**
 * Infer action from task type if not explicitly specified
 */
function inferActionFromTaskType(taskType: string): string | null {
  const typeLower = taskType.toLowerCase();
  
  if (typeLower.includes('call') || typeLower.includes('voice')) {
    return 'voice_call';
  }
  if (typeLower.includes('sms') || typeLower.includes('text')) {
    return 'sms';
  }
  if (typeLower.includes('email') || typeLower.includes('mail')) {
    return 'email';
  }
  if (typeLower.includes('research') || typeLower.includes('enrich')) {
    return 'lead_research';
  }
  if (typeLower.includes('calendar') || typeLower.includes('appointment') || typeLower.includes('schedule')) {
    return 'calendar';
  }
  if (typeLower.includes('referral') && typeLower.includes('link')) {
    return 'send_referral_link';
  }
  if (typeLower.includes('create') && typeLower.includes('referral')) {
    return 'create_referral';
  }
  if (typeLower.includes('notify') && typeLower.includes('referral')) {
    return 'notify_referral_converted';
  }
  if (typeLower.includes('request') && typeLower.includes('feedback') && typeLower.includes('voice')) {
    return 'request_feedback_voice';
  }
  if (typeLower.includes('review') && typeLower.includes('link')) {
    return 'send_review_link';
  }

  return null;
}

/**
 * Execute industry-specific action
 */
async function executeIndustrySpecificAction(
  action: string,
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  // Route to industry-specific executor
  try {
    switch (instance.industry) {
      case 'MEDICAL':
        return await executeMedicalAction(action, task, instance);
      case 'RESTAURANT':
        return await executeRestaurantAction(action, task, instance);
      case 'CONSTRUCTION':
        return await executeConstructionAction(action, task, instance);
      case 'DENTIST':
        return await executeDentistAction(action, task, instance);
      case 'MEDICAL_SPA':
        return await executeMedicalSpaAction(action, task, instance);
      case 'OPTOMETRIST':
        return await executeOptometristAction(action, task, instance);
      case 'HEALTH_CLINIC':
        return await executeHealthClinicAction(action, task, instance);
      case 'HOSPITAL':
        return await executeHospitalAction(action, task, instance);
      case 'TECHNOLOGY':
        return await executeTechnologyAction(action, task, instance);
      case 'SPORTS_CLUB':
        return await executeSportsClubAction(action, task, instance);
      default:
        return { success: false, error: `Unknown action: ${action} for industry: ${instance.industry}` };
    }
  } catch (error: any) {
    return { success: false, error: `Failed to execute ${action}: ${error.message}` };
  }
}

/**
 * Execute voice call via AI employee or ElevenLabs
 */
async function executeVoiceCall(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  // Get contact phone number
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead?.phone) {
    return { success: false, error: 'No phone number available' };
  }

  // For now, use ElevenLabs directly (can be extended to use industry-specific AI employees)
  try {
    const { elevenLabsService } = await import('@/lib/elevenlabs');
    
    // Get default agent ID or from task config
    const actionConfig = task.actionConfig as any;
    const agentId = actionConfig?.elevenLabsAgentId || process.env.ELEVENLABS_DEFAULT_AGENT_ID;
    
    if (!agentId) {
      return { success: false, error: 'No ElevenLabs agent ID configured' };
    }
    
    // Initiate phone call via ElevenLabs
    const callResult = await elevenLabsService.initiatePhoneCall(
      agentId,
      lead.phone
    );

    // Create call log
    const callLog = await prisma.callLog.create({
      data: {
        userId: instance.userId,
        voiceAgentId: null,
        leadId: instance.leadId || undefined,
        direction: 'OUTBOUND',
        status: 'INITIATED',
        fromNumber: process.env.TWILIO_PHONE_NUMBER || '',
        toNumber: lead.phone,
        elevenLabsConversationId: callResult.conversation_id || callResult.call_id || callResult.id || undefined,
      },
    });

    return {
      success: true,
      data: {
        phoneNumber: lead.phone,
        callLogId: callLog.id,
        conversationId: callResult.conversation_id || callResult.call_id,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[Workflow] Failed to initiate voice call:', error);
    return {
      success: false,
      error: `Failed to initiate call: ${error.message}`,
    };
  }
}

/**
 * Execute SMS
 */
async function executeSMS(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead?.phone) {
    return { success: false, error: 'No phone number available' };
  }

  // Get message content from task config
  const actionConfig = task.actionConfig as any;
  const message = actionConfig?.message || task.description || 'Hello from your team';

  // Personalize message with lead data
  const personalizedMessage = message
    .replace(/\{businessName\}/g, lead.businessName || 'there')
    .replace(/\{contactPerson\}/g, lead.contactPerson || 'there')
    .replace(/\{firstName\}/g, lead.contactPerson?.split(' ')[0] || 'there');

  try {
    // Send SMS via Twilio
    const twilioResult = await sendSMS(lead.phone, personalizedMessage);

    return {
      success: true,
      data: {
        phoneNumber: lead.phone,
        messageSid: twilioResult.sid,
        status: twilioResult.status,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[Workflow] Failed to send SMS:', error);
    return {
      success: false,
      error: `Failed to send SMS: ${error.message}`,
    };
  }
}

/**
 * Execute Email
 */
async function executeEmail(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead?.email) {
    return { success: false, error: 'No email available' };
  }

  // Get email content from task config
  const actionConfig = task.actionConfig as any;
  const subject = actionConfig?.subject || task.name || 'Message from your team';
  const emailBody = actionConfig?.body || actionConfig?.html || task.description || 'Hello!';

  // Personalize email content
  const personalizedSubject = subject
    .replace(/\{businessName\}/g, lead.businessName || 'there')
    .replace(/\{contactPerson\}/g, lead.contactPerson || 'there');
  
  const personalizedBody = emailBody
    .replace(/\{businessName\}/g, lead.businessName || 'there')
    .replace(/\{contactPerson\}/g, lead.contactPerson || 'there')
    .replace(/\{firstName\}/g, lead.contactPerson?.split(' ')[0] || 'there');

  // Convert plain text to HTML if needed
  const htmlBody = actionConfig?.html 
    ? personalizedBody 
    : `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
         <p>${personalizedBody.replace(/\n/g, '<br>')}</p>
       </div>`;

  try {
    // Send email via EmailService (uses SendGrid or Gmail)
    const emailService = new EmailService();
    const emailSent = await emailService.sendEmail({
      to: lead.email,
      subject: personalizedSubject,
      html: htmlBody,
      text: personalizedBody,
      userId: instance.userId,
    });

    if (!emailSent) {
      return { success: false, error: 'Failed to send email - service returned false' };
    }

    return {
      success: true,
      data: {
        email: lead.email,
        subject: personalizedSubject,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[Workflow] Failed to send email:', error);
    return {
      success: false,
      error: `Failed to send email: ${error.message}`,
    };
  }
}

/**
 * Create task
 */
async function createTask(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  await prisma.task.create({
    data: {
      userId: instance.userId,
      title: task.name,
      description: task.description || '',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
      leadId: instance.leadId || undefined,
      dealId: instance.dealId || undefined,
    },
  });

  return {
    success: true,
    data: {
      taskName: task.name,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create calendar event
 */
async function createCalendarEvent(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  const actionConfig = task.actionConfig as any;
  const eventTitle = actionConfig?.title || task.name || 'Appointment';
  const eventDescription = actionConfig?.description || task.description || '';
  const eventDuration = actionConfig?.duration || 30; // minutes
  const eventDate = actionConfig?.date 
    ? new Date(actionConfig.date)
    : new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

  try {
    // Create appointment in database
    const appointment = await prisma.bookingAppointment.create({
      data: {
        userId: instance.userId,
        customerName: lead?.contactPerson || lead?.businessName || 'Contact',
        customerEmail: lead?.email || undefined,
        customerPhone: lead?.phone || '',
        appointmentDate: eventDate,
        duration: eventDuration,
        status: 'SCHEDULED',
        notes: eventDescription,
        meetingLocation: 'PHONE_CALL',
        leadId: instance.leadId || undefined,
      },
    });

    return {
      success: true,
      data: {
        eventId: appointment.id,
        title: eventTitle,
        startTime: eventDate.toISOString(),
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[Workflow] Failed to create calendar event:', error);
    return {
      success: false,
      error: `Failed to create calendar event: ${error.message}`,
    };
  }
}

/**
 * Execute Lead Research & Enrichment
 */
async function executeLeadResearch(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead) {
    return { success: false, error: 'No lead found for research' };
  }

  try {
    // Import and use the lead research service
    const { DataEnrichmentService } = await import('@/lib/data-enrichment-service');
    const enrichmentService = new DataEnrichmentService();
    
    // Extract domain from website if available
    let domain: string | undefined;
    if (lead.website) {
      try {
        domain = new URL(lead.website).hostname;
      } catch (e) {
        // Invalid URL, skip domain extraction
      }
    }
    
    const enrichmentResult = await enrichmentService.enrichLead(lead.id, {
      email: lead.email || undefined,
      domain,
      firstName: lead.contactPerson?.split(' ')[0],
      lastName: lead.contactPerson?.split(' ').slice(1).join(' '),
      businessName: lead.businessName || undefined,
    });

    return {
      success: enrichmentResult.success || false,
      data: {
        leadId: lead.id,
        enrichedFields: enrichmentResult.success ? Object.keys(enrichmentResult.data || {}) : [],
        source: enrichmentResult.source,
        cached: enrichmentResult.cached,
        timestamp: new Date().toISOString(),
      },
      error: enrichmentResult.success ? undefined : enrichmentResult.error,
    };
  } catch (error: any) {
    console.error('[Workflow] Failed to execute lead research:', error);
    return {
      success: false,
      error: `Failed to execute lead research: ${error.message}`,
    };
  }
}

/**
 * Send referral link to lead (email or SMS so they can share)
 */
async function executeSendReferralLink(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const lead = instance.leadId
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;
  if (!lead) {
    return { success: false, error: 'No lead for referral link' };
  }

  const actionConfig = task.actionConfig as { baseUrl?: string; channel?: 'email' | 'sms' } | undefined;
  const baseUrl = actionConfig?.baseUrl || process.env.NEXTAUTH_URL || '';
  const channel = actionConfig?.channel || 'email';
  const referralQuery = `ref=${encodeURIComponent(lead.id)}`;
  const referralUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/?${referralQuery}` : `?${referralQuery}`;
  const message = (actionConfig as any)?.message || `Share your referral link: ${referralUrl}`;

  if (channel === 'sms') {
    if (!lead.phone) return { success: false, error: 'No phone for SMS' };
    const personalized = message.replace(/\{referralLink\}/g, referralUrl).replace(/\{contactPerson\}/g, lead.contactPerson || 'there');
    try {
      await sendSMS(lead.phone, personalized);
      return { success: true, data: { channel: 'sms', timestamp: new Date().toISOString() } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  if (!lead.email) return { success: false, error: 'No email for referral link' };
  const emailBody = message.replace(/\{referralLink\}/g, referralUrl).replace(/\{contactPerson\}/g, lead.contactPerson || 'there');
  try {
    const emailService = new EmailService();
    const ok = await emailService.sendEmail({
      to: lead.email,
      subject: (actionConfig as any)?.subject || 'Your referral link',
      html: `<p>${emailBody.replace(/\n/g, '<br>')}</p>`,
      text: emailBody,
      userId: instance.userId,
    });
    return ok
      ? { success: true, data: { channel: 'email', timestamp: new Date().toISOString() } }
      : { success: false, error: 'Failed to send email' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Create a referral record (referrer = current lead; referred info from actionConfig or placeholder)
 */
async function executeCreateReferral(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const lead = instance.leadId
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;
  if (!lead) {
    return { success: false, error: 'No lead for create referral' };
  }

  const actionConfig = task.actionConfig as { referredName?: string; referredEmail?: string; referredPhone?: string } | undefined;
  const referredName = actionConfig?.referredName || 'Referred contact';
  const referredEmail = actionConfig?.referredEmail || null;
  const referredPhone = actionConfig?.referredPhone || null;

  try {
    await prisma.referral.create({
      data: {
        userId: instance.userId,
        referrerId: lead.id,
        referredName,
        referredEmail,
        referredPhone,
        status: 'PENDING',
      },
    });
    return { success: true, data: { referrerId: lead.id, referredName, timestamp: new Date().toISOString() } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Notify (e.g. email/SMS) when a referral is converted – run in context of the new lead; find referrer and notify them.
 */
async function executeNotifyReferralConverted(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  if (!instance.leadId) {
    return { success: false, error: 'No lead in context' };
  }

  const referral = await prisma.referral.findFirst({
    where: { convertedLeadId: instance.leadId, userId: instance.userId },
    include: { referrer: true },
  });
  if (!referral?.referrer) {
    return { success: false, error: 'No referrer found for this lead' };
  }

  const actionConfig = task.actionConfig as { channel?: 'email' | 'sms'; message?: string } | undefined;
  const channel = actionConfig?.channel || 'email';
  const newLead = await prisma.lead.findUnique({ where: { id: instance.leadId } });
  const message = (actionConfig?.message || 'Your referral {{referredName}} has signed up.')
    .replace(/\{\{referredName\}\}/g, newLead?.contactPerson || newLead?.businessName || 'Someone')
    .replace(/\{\{contactPerson\}\}/g, referral.referrer.contactPerson || referral.referrer.businessName || 'there');

  if (channel === 'sms' && referral.referrer.phone) {
    try {
      await sendSMS(referral.referrer.phone, message);
      return { success: true, data: { channel: 'sms', timestamp: new Date().toISOString() } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  if (referral.referrer.email) {
    try {
      const emailService = new EmailService();
      const ok = await emailService.sendEmail({
        to: referral.referrer.email,
        subject: (actionConfig as any)?.subject || 'Your referral signed up',
        html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
        text: message,
        userId: instance.userId,
      });
      return ok
        ? { success: true, data: { channel: 'email', timestamp: new Date().toISOString() } }
        : { success: false, error: 'Failed to send email' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  return { success: false, error: 'Referrer has no email or phone for notification' };
}

/**
 * Request feedback via voice AI (post-service feedback call)
 */
async function executeRequestFeedbackVoice(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const lead = instance.leadId
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;
  if (!lead?.phone) {
    return { success: false, error: 'No lead or phone for feedback call' };
  }

  try {
    const { reviewFeedbackService } = await import('@/lib/review-feedback-service');
    await reviewFeedbackService.triggerFeedbackCollection({
      leadId: lead.id,
      userId: instance.userId,
      appointmentId: (task.actionConfig as any)?.appointmentId,
      preferredMethod: 'VOICE',
    });
    return { success: true, data: { leadId: lead.id, method: 'VOICE', timestamp: new Date().toISOString() } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Send Google and/or Yelp review link to lead (email or SMS)
 */
async function executeSendReviewLink(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const lead = instance.leadId
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;
  if (!lead) {
    return { success: false, error: 'No lead for review link' };
  }

  const config = task.actionConfig as {
    googleUrl?: string;
    yelpUrl?: string;
    channel?: 'email' | 'sms' | 'both';
    message?: string;
    subject?: string;
  } | undefined;

  let googleUrl = config?.googleUrl?.trim();
  let yelpUrl = config?.yelpUrl?.trim();
  const channel = config?.channel || 'email';

  if (!googleUrl && !yelpUrl) {
    const campaign = await prisma.campaign.findFirst({
      where: { userId: instance.userId, type: 'REVIEW_REQUEST', reviewUrl: { not: null } },
      select: { reviewUrl: true },
    });
    const fallbackUrl = campaign?.reviewUrl?.trim();
    if (fallbackUrl) googleUrl = fallbackUrl;
  }

  if (!googleUrl && !yelpUrl) {
    return { success: false, error: 'Configure at least one review URL in the task or in a Review campaign' };
  }

  const links: string[] = [];
  if (googleUrl) links.push(`Google: ${googleUrl}`);
  if (yelpUrl) links.push(`Yelp: ${yelpUrl}`);
  const linkBlock = links.join('\n');

  const defaultMessage = `Thank you for your business! We'd love it if you could share your experience. Leave us a review:\n${linkBlock}`;
  const message = (config?.message || defaultMessage)
    .replace(/\{contactPerson\}/g, lead.contactPerson || 'there')
    .replace(/\{businessName\}/g, lead.businessName || '')
    .replace(/\{googleUrl\}/g, googleUrl || '')
    .replace(/\{yelpUrl\}/g, yelpUrl || '');

  const sendEmail = async () => {
    if (!lead.email) return false;
    const emailService = new EmailService();
    return emailService.sendEmail({
      to: lead.email,
      subject: (config?.subject || 'Share your experience'),
      html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
      text: message,
      userId: instance.userId,
    });
  };

  const sendSmsFn = async () => {
    if (!lead.phone) return false;
    await sendSMS(lead.phone, message);
    return true;
  };

  try {
    if (channel === 'sms') {
      const ok = await sendSmsFn();
      return ok ? { success: true, data: { channel: 'sms', timestamp: new Date().toISOString() } } : { success: false, error: 'No phone' };
    }
    if (channel === 'both') {
      await Promise.all([sendEmail(), sendSmsFn()]);
      return { success: true, data: { channel: 'both', timestamp: new Date().toISOString() } };
    }
    const ok = await sendEmail();
    return ok ? { success: true, data: { channel: 'email', timestamp: new Date().toISOString() } } : { success: false, error: 'No email' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// Industry-specific action executors
async function executeMedicalAction(action: string, task: WorkflowTask, instance: WorkflowInstance): Promise<TaskResult> {
  const { executeMedicalAction: executeMedical } = await import('./industry-executors/medical-executor');
  return executeMedical(action, task, instance);
}

async function executeRestaurantAction(action: string, task: WorkflowTask, instance: WorkflowInstance): Promise<TaskResult> {
  const { executeRestaurantAction: executeRestaurant } = await import('./industry-executors/restaurant-executor');
  return executeRestaurant(action, task, instance);
}

async function executeConstructionAction(action: string, task: WorkflowTask, instance: WorkflowInstance): Promise<TaskResult> {
  const { executeConstructionAction: executeConstruction } = await import('./industry-executors/construction-executor');
  return executeConstruction(action, task, instance);
}

async function executeDentistAction(action: string, task: WorkflowTask, instance: WorkflowInstance): Promise<TaskResult> {
  const { executeDentistAction: executeDentist } = await import('./industry-executors/dentist-executor');
  return executeDentist(action, task, instance);
}

async function executeMedicalSpaAction(action: string, task: WorkflowTask, instance: WorkflowInstance): Promise<TaskResult> {
  const { executeMedicalSpaAction: executeMedicalSpa } = await import('./industry-executors/medical-spa-executor');
  return executeMedicalSpa(action, task, instance);
}

async function executeOptometristAction(action: string, task: WorkflowTask, instance: WorkflowInstance): Promise<TaskResult> {
  const { executeOptometristAction: executeOptometrist } = await import('./industry-executors/remaining-industries-executor');
  return executeOptometrist(action, task, instance);
}

async function executeHealthClinicAction(action: string, task: WorkflowTask, instance: WorkflowInstance): Promise<TaskResult> {
  const { executeHealthClinicAction: executeHealthClinic } = await import('./industry-executors/remaining-industries-executor');
  return executeHealthClinic(action, task, instance);
}

async function executeHospitalAction(action: string, task: WorkflowTask, instance: WorkflowInstance): Promise<TaskResult> {
  const { executeHospitalAction: executeHospital } = await import('./industry-executors/remaining-industries-executor');
  return executeHospital(action, task, instance);
}

async function executeTechnologyAction(action: string, task: WorkflowTask, instance: WorkflowInstance): Promise<TaskResult> {
  const { executeTechnologyAction: executeTechnology } = await import('./industry-executors/remaining-industries-executor');
  return executeTechnology(action, task, instance);
}

async function executeSportsClubAction(action: string, task: WorkflowTask, instance: WorkflowInstance): Promise<TaskResult> {
  const { executeSportsClubAction: executeSportsClub } = await import('./industry-executors/remaining-industries-executor');
  return executeSportsClub(action, task, instance);
}
