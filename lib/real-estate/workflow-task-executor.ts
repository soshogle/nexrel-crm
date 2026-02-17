/**
 * Real Estate Workflow Task Executor
 * Executes individual workflow tasks by invoking AI employees or system actions
 */

import { REWorkflowTask, REWorkflowInstance, REAIEmployeeType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { sendSMS } from '@/lib/twilio';
import { EmailService } from '@/lib/email-service';
import { CalendarService } from '@/lib/calendar/calendar-service';

interface TaskResult {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}

/**
 * Execute a workflow task
 */
export async function executeTask(
  task: REWorkflowTask,
  instance: REWorkflowInstance
): Promise<TaskResult> {
  const actionConfig = task.actionConfig as any;
  const actions = actionConfig?.actions || [];

  const results: TaskResult[] = [];

  for (const action of actions) {
    try {
      let result: TaskResult;

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
        case 'cma_generation':
          result = await generateCMA(task, instance);
          break;
        case 'presentation_generation':
          result = await generatePresentation(task, instance);
          break;
        case 'market_research':
          result = await generateMarketResearch(task, instance);
          break;
        case 'document':
          result = await generateDocument(task, instance);
          break;
        default:
          result = { success: false, error: `Unknown action: ${action}` };
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
 * Execute voice call via AI employee
 */
async function executeVoiceCall(
  task: REWorkflowTask,
  instance: REWorkflowInstance
): Promise<TaskResult> {
  const actionConfig = task.actionConfig as any;

  // Resolve ElevenLabs agent and voice override: AI Team > RE industry agent
  let elevenLabsAgentId: string | null = null;
  let voiceOverride: {
    agent?: {
      language?: string;
      first_message?: string;
      prompt?: { prompt?: string; llm?: string };
    };
    tts?: { voice_id?: string; stability?: number; speed?: number; similarity_boost?: number };
  } | undefined;

    if (actionConfig?.assignedAIEmployeeId) {
      const aiEmployee = await prisma.userAIEmployee.findFirst({
        where: {
          id: actionConfig.assignedAIEmployeeId,
          userId: instance.userId,
          isActive: true,
        },
      });
      if (aiEmployee?.voiceAgentId) {
        const voiceAgent = await prisma.voiceAgent.findFirst({
          where: {
            id: aiEmployee.voiceAgentId,
            userId: instance.userId,
            elevenLabsAgentId: { not: null },
          },
        });
        if (voiceAgent?.elevenLabsAgentId) {
          elevenLabsAgentId = voiceAgent.elevenLabsAgentId;
          // Build per-call override: task voiceLanguage > AI employee voiceConfig
          const vc = aiEmployee.voiceConfig as { voiceId?: string; language?: string; stability?: number; speed?: number; similarityBoost?: number } | null;
          const taskLang = actionConfig?.voiceLanguage;
          const employeeLang = vc?.language;
          const lang = taskLang || employeeLang;
          if (lang || (vc && Object.keys(vc).length > 0)) {
            voiceOverride = {};
            if (lang) voiceOverride.agent = { language: lang };
            if (vc && (vc.voiceId || vc.stability != null || vc.speed != null || vc.similarityBoost != null)) {
              voiceOverride.tts = voiceOverride.tts || {};
              if (vc.voiceId) voiceOverride.tts.voice_id = vc.voiceId;
              if (vc.stability != null) voiceOverride.tts.stability = vc.stability;
              if (vc.speed != null) voiceOverride.tts.speed = vc.speed;
              if (vc.similarityBoost != null) voiceOverride.tts.similarity_boost = vc.similarityBoost;
            }
          }
        }
      }
    }

    // Per-task language override when no AI employee (RE industry agent)
    if (!voiceOverride?.agent?.language && actionConfig?.voiceLanguage) {
      voiceOverride = voiceOverride || {};
      voiceOverride.agent = { ...voiceOverride.agent, language: actionConfig.voiceLanguage };
    }

    // Fallback to user language when no override yet
    if (!voiceOverride?.agent?.language) {
      const user = await prisma.user.findUnique({
        where: { id: instance.userId },
        select: { language: true },
      });
      const userLang = user?.language || 'en';
      if (userLang !== 'en') {
        voiceOverride = voiceOverride || {};
        voiceOverride.agent = { ...voiceOverride.agent, language: userLang };
      }
    }

  // Per-task prompt overrides: firstMessage and systemPrompt from actionConfig
  if (actionConfig?.firstMessage || actionConfig?.systemPrompt) {
    voiceOverride = voiceOverride || {};
    voiceOverride.agent = voiceOverride.agent || {};
    if (actionConfig.firstMessage) {
      voiceOverride.agent.first_message = actionConfig.firstMessage;
    }
    if (actionConfig.systemPrompt) {
      const { getConfidentialityGuard } = await import('@/lib/ai-confidentiality-guard');
      const promptWithGuard = actionConfig.systemPrompt + getConfidentialityGuard();
      voiceOverride.agent.prompt = {
        ...voiceOverride.agent.prompt,
        prompt: promptWithGuard,
      };
    }
  }

  if (!elevenLabsAgentId && task.assignedAgentType) {
    // Lazy provision: create agent on first use if not yet provisioned
    const { ensureREAgentProvisioned } = await import('@/lib/ai-employee-lazy-provision');
    const agent = await ensureREAgentProvisioned(instance.userId, task.assignedAgentType as any);
    if (agent?.elevenLabsAgentId) {
      elevenLabsAgentId = agent.elevenLabsAgentId;
    }
  }

  if (!elevenLabsAgentId) {
    return { success: false, error: 'No agent assigned for voice call. Assign an AI Team member with a voice agent or set a RE industry agent.' };
  }

  // Get contact phone number
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead?.phone) {
    return { success: false, error: 'No phone number available' };
  }

  // Personalize firstMessage and systemPrompt with lead data before call
  if (voiceOverride?.agent && lead) {
    const personalize = (s: string) =>
      s
        .replace(/\{contactPerson\}/g, lead.contactPerson || 'there')
        .replace(/\{firstName\}/g, lead.contactPerson?.split(' ')[0] || 'there')
        .replace(/\{businessName\}/g, lead.businessName || '');
    if (voiceOverride.agent.first_message) {
      voiceOverride.agent.first_message = personalize(voiceOverride.agent.first_message);
    }
    if (voiceOverride.agent.prompt?.prompt) {
      voiceOverride.agent.prompt.prompt = personalize(voiceOverride.agent.prompt.prompt);
    }
  }

  try {
    const { elevenLabsService } = await import('@/lib/elevenlabs');
    const callResult = await elevenLabsService.initiatePhoneCall(
      elevenLabsAgentId,
      lead.phone,
      voiceOverride
    );

    // Create call log
    const callLog = await prisma.callLog.create({
      data: {
        userId: instance.userId,
        voiceAgentId: null, // REAIEmployeeAgent doesn't have voiceAgentId, using ElevenLabs directly
        leadId: instance.leadId || undefined,
        direction: 'OUTBOUND',
        status: 'INITIATED',
        fromNumber: process.env.TWILIO_PHONE_NUMBER || '', // Use Twilio phone number as fromNumber
        toNumber: lead.phone,
        elevenLabsConversationId: callResult.conversation_id || callResult.call_id || callResult.id || undefined,
      },
    });

    return {
      success: true,
      data: {
        agentType: task.assignedAgentType || (actionConfig?.assignedAIEmployeeId ? 'AI_TEAM' : null),
        phoneNumber: lead.phone,
        callLogId: callLog.id,
        conversationId: callResult.conversation_id || callResult.call_id,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[RE Workflow] Failed to initiate voice call:', error);
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
  task: REWorkflowTask,
  instance: REWorkflowInstance
): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead?.phone) {
    return { success: false, error: 'No phone number available' };
  }

  // Get message content from task config
  const actionConfig = task.actionConfig as any;
  const message = actionConfig?.message || task.description || 'Hello from your real estate agent';

  // Personalize message with lead data
  const personalizedMessage = message
    .replace(/\{businessName\}/g, lead.businessName || 'there')
    .replace(/\{contactPerson\}/g, lead.contactPerson || 'there')
    .replace(/\{firstName\}/g, lead.contactPerson?.split(' ')[0] || 'there');

  try {
    // Send SMS via Twilio
    const twilioResult = await sendSMS(lead.phone, personalizedMessage);

    // Note: Message model is for AI-generated templates, not tracking sent messages
    // SMS tracking is handled by Twilio webhooks and CallLog/ConversationMessage models

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
    console.error('[RE Workflow] Failed to send SMS:', error);
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
  task: REWorkflowTask,
  instance: REWorkflowInstance
): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead?.email) {
    return { success: false, error: 'No email available' };
  }

  // Get email content from task config
  const actionConfig = task.actionConfig as any;
  const subject = actionConfig?.subject || task.name || 'Message from your real estate agent';
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

    // Log email in database
    // Note: Message model is for AI-generated templates, not tracking sent messages
    // Email tracking is handled by SendGrid webhooks and ConversationMessage models

    return {
      success: true,
      data: {
        email: lead.email,
        subject: personalizedSubject,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[RE Workflow] Failed to send email:', error);
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
  task: REWorkflowTask,
  instance: REWorkflowInstance
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
      leadId: instance.leadId,
      dealId: instance.dealId,
    },
  });

  return { success: true };
}

/**
 * Create calendar event
 */
async function createCalendarEvent(
  task: REWorkflowTask,
  instance: REWorkflowInstance
): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead) {
    return { success: false, error: 'No lead associated with workflow instance' };
  }

  // Get event details from task config
  const actionConfig = task.actionConfig as any;
  const eventTitle = actionConfig?.title || task.name || 'Appointment';
  const eventDescription = actionConfig?.description || task.description || '';
  const eventDate = actionConfig?.date ? new Date(actionConfig.date) : new Date();
  const duration = actionConfig?.duration || 30; // minutes
  const location = actionConfig?.location || lead.address || '';

  // Calculate end time
  const endTime = new Date(eventDate.getTime() + duration * 60000);

  try {
    // Create appointment in database first
    const appointment = await prisma.bookingAppointment.create({
      data: {
        userId: instance.userId,
        customerName: lead.businessName || lead.contactPerson || 'Contact',
        customerEmail: lead.email || undefined,
        customerPhone: lead.phone || '', // customerPhone is required, use empty string as fallback
        appointmentDate: eventDate,
        duration,
        status: 'SCHEDULED',
        notes: eventDescription,
        meetingLocation: location || 'PHONE_CALL',
        leadId: instance.leadId || undefined,
      },
    });

    // Sync to calendar if connection exists
    const calendarConnection = await prisma.calendarConnection.findFirst({
      where: {
        userId: instance.userId,
        syncEnabled: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (calendarConnection) {
      // Update appointment with calendar connection
      await prisma.bookingAppointment.update({
        where: { id: appointment.id },
        data: {
          calendarConnectionId: calendarConnection.id,
          syncStatus: 'PENDING',
        },
      });

      // Sync to calendar
      const syncResult = await CalendarService.syncAppointmentToCalendar(appointment.id);
      
      if (!syncResult.success) {
        console.warn('[RE Workflow] Calendar sync failed:', syncResult.error);
        // Don't fail the task if calendar sync fails
      }
    }

    return {
      success: true,
      data: {
        appointmentId: appointment.id,
        title: eventTitle,
        date: eventDate.toISOString(),
        duration,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[RE Workflow] Failed to create calendar event:', error);
    return {
      success: false,
      error: `Failed to create calendar event: ${error.message}`,
    };
  }
}

/**
 * Generate CMA (Comparative Market Analysis)
 */
async function generateCMA(
  task: REWorkflowTask,
  instance: REWorkflowInstance
): Promise<TaskResult> {
  try {
    // Get property data from task config or lead/deal
    const actionConfig = task.actionConfig as any;
    const lead = instance.leadId 
      ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
      : null;

    // Extract property address from lead or task config
    const address = actionConfig?.address || lead?.address || actionConfig?.propertyAddress;
    
    if (!address) {
      return { success: false, error: 'Property address is required for CMA generation' };
    }

    // Get property details from config or use defaults
    const propertyData = {
      address,
      beds: actionConfig?.beds || actionConfig?.bedrooms || 3,
      baths: actionConfig?.baths || actionConfig?.bathrooms || 2,
      sqft: actionConfig?.sqft || actionConfig?.squareFeet || 1500,
      yearBuilt: actionConfig?.yearBuilt || actionConfig?.year_built || new Date().getFullYear() - 10,
      city: actionConfig?.city || lead?.city || '',
      state: actionConfig?.state || lead?.state || '',
      zip: actionConfig?.zip || lead?.zipCode || '',
      propertyType: actionConfig?.propertyType || 'Single Family',
    };

    // Use the CMA library function directly
    const { generateCMA: generateCMALib } = await import('@/lib/real-estate/cma');
    
    const cmaResult = await generateCMALib(
      {
        address: propertyData.address,
        city: propertyData.city,
        state: propertyData.state,
        zip: propertyData.zip,
        propertyType: propertyData.propertyType,
        beds: propertyData.beds,
        baths: propertyData.baths,
        sqft: propertyData.sqft,
        yearBuilt: propertyData.yearBuilt,
      },
      instance.userId
    );

    // Store CMA report ID in workflow instance metadata for reference
    const instanceMetadata = (instance.metadata as any) || {};
    instanceMetadata.cmaReportId = cmaResult.id;
    
    await prisma.rEWorkflowInstance.update({
      where: { id: instance.id },
      data: { metadata: instanceMetadata },
    });

    return {
      success: true,
      data: {
        cmaReportId: cmaResult.id,
        suggestedPrice: cmaResult.suggestedPrice,
        priceRange: cmaResult.priceRange,
        comparablesCount: cmaResult.comparables.length,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[RE Workflow] Failed to generate CMA:', error);
    return {
      success: false,
      error: `Failed to generate CMA: ${error.message}`,
    };
  }
}

/**
 * Generate Presentation
 */
async function generatePresentation(
  task: REWorkflowTask,
  instance: REWorkflowInstance
): Promise<TaskResult> {
  try {
    const actionConfig = task.actionConfig as any;
    const lead = instance.leadId 
      ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
      : null;

    // Get property data
    const propertyData = {
      address: actionConfig?.address || lead?.address || '',
      city: actionConfig?.city || lead?.city || '',
      state: actionConfig?.state || lead?.state || '',
      zipCode: actionConfig?.zipCode || lead?.zipCode || '',
      price: actionConfig?.price || actionConfig?.listPrice || '',
      beds: actionConfig?.beds || actionConfig?.bedrooms || '',
      baths: actionConfig?.baths || actionConfig?.bathrooms || '',
      sqft: actionConfig?.sqft || actionConfig?.squareFeet || '',
      lotSize: actionConfig?.lotSize || '',
      yearBuilt: actionConfig?.yearBuilt || '',
      propertyType: actionConfig?.propertyType || 'Single Family',
      description: actionConfig?.description || task.description || '',
      features: actionConfig?.features || [],
    };

    if (!propertyData.address || !propertyData.city) {
      return { success: false, error: 'Property address and city are required for presentation generation' };
    }

    // Get agent info from user
    const user = await prisma.user.findUnique({
      where: { id: instance.userId },
      select: { name: true, email: true, phone: true },
    });

    const agentInfo = {
      name: user?.name || actionConfig?.agentName || '',
      title: actionConfig?.agentTitle || 'Real Estate Professional',
      phone: user?.phone || actionConfig?.agentPhone || '',
      email: user?.email || actionConfig?.agentEmail || '',
      company: actionConfig?.company || '',
    };

    // Create a presentation record using REListingPresentation model
    const presentationRecord = await prisma.rEListingPresentation.create({
      data: {
        userId: instance.userId,
        address: propertyData.address,
        propertyId: null, // Can be linked later if property exists
        status: 'draft',
        pricingStrategy: {
          propertyData,
          agentInfo,
          presentationType: actionConfig?.presentationType || 'listing',
          generatedFromWorkflow: true,
          workflowInstanceId: instance.id,
        } as any,
      },
    });
    
    // Store presentation ID in workflow instance metadata
    const instanceMetadata = (instance.metadata as any) || {};
    instanceMetadata.presentationId = presentationRecord.id;
    
    await prisma.rEWorkflowInstance.update({
      where: { id: instance.id },
      data: { metadata: instanceMetadata },
    });
    
    const result = {
      presentation: {
        id: presentationRecord.id,
        title: `Presentation for ${propertyData.address}`,
        slides: [],
      },
    };

    return {
      success: true,
      data: {
        presentationId: result.presentation?.id,
        title: result.presentation?.title,
        slidesCount: result.presentation?.slides?.length || 0,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[RE Workflow] Failed to generate presentation:', error);
    return {
      success: false,
      error: `Failed to generate presentation: ${error.message}`,
    };
  }
}

/**
 * Generate Market Research (Buyer/Seller Reports)
 */
async function generateMarketResearch(
  task: REWorkflowTask,
  instance: REWorkflowInstance
): Promise<TaskResult> {
  try {
    const actionConfig = task.actionConfig as any;
    const lead = instance.leadId 
      ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
      : null;

    // Determine report type (buyer or seller)
    const reportType = actionConfig?.reportType || actionConfig?.type || 'buyer';
    
    // Get location data
    const region = actionConfig?.region || actionConfig?.location || 
                   (lead ? `${lead.city || ''} ${lead.state || ''}`.trim() : '') ||
                   actionConfig?.address || '';

    if (!region) {
      return { success: false, error: 'Region/location is required for market research' };
    }

    const placeData = {
      city: actionConfig?.city || lead?.city || '',
      state: actionConfig?.state || lead?.state || '',
      country: actionConfig?.country || 'USA',
    };

    // Build request based on report type
    const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000';
    let apiEndpoint = '';
    let requestBody: any = {
      region,
      placeData,
    };

    if (reportType === 'buyer') {
      apiEndpoint = `${baseUrl}/api/real-estate/attraction/buyer-report`;
      requestBody = {
        ...requestBody,
        priceRange: actionConfig?.priceRange || '',
        propertyType: actionConfig?.propertyType || 'single-family',
        bedrooms: actionConfig?.bedrooms || actionConfig?.beds || '',
        bathrooms: actionConfig?.bathrooms || actionConfig?.baths || '',
        sqftMin: actionConfig?.sqftMin || '',
        sqftMax: actionConfig?.sqftMax || '',
        yearBuiltMin: actionConfig?.yearBuiltMin || '',
        buyerTimeline: actionConfig?.buyerTimeline || '3-6months',
        buyerMotivation: actionConfig?.buyerMotivation || 'moderate',
        firstTimeBuyer: actionConfig?.firstTimeBuyer || false,
        investorBuyer: actionConfig?.investorBuyer || false,
        selectedFeatures: actionConfig?.selectedFeatures || [],
      };
    } else {
      // Seller report - check if endpoint exists
      apiEndpoint = `${baseUrl}/api/real-estate/attraction/seller-report`;
      requestBody = {
        ...requestBody,
        yearsOwned: actionConfig?.yearsOwned || '',
        homeCondition: actionConfig?.homeCondition || 'good',
        sellerTimeline: actionConfig?.sellerTimeline || 'flexible',
        sellerMotivation: actionConfig?.sellerMotivation || 'exploring',
        priceRange: actionConfig?.priceRange || '',
        propertyType: actionConfig?.propertyType || 'single-family',
      };
    }

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Market research generation failed');
    }

    const result = await response.json();
    
    // Store report ID in workflow instance metadata
    const instanceMetadata = (instance.metadata as any) || {};
    instanceMetadata.marketResearchReportId = result.report?.id || result.id;
    instanceMetadata.marketResearchType = reportType;
    
    await prisma.rEWorkflowInstance.update({
      where: { id: instance.id },
      data: { metadata: instanceMetadata },
    });

    return {
      success: true,
      data: {
        reportId: result.report?.id || result.id,
        reportType,
        title: result.report?.title || result.title,
        opportunitiesCount: result.report?.opportunities?.length || result.opportunities?.length || 0,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[RE Workflow] Failed to generate market research:', error);
    return {
      success: false,
      error: `Failed to generate market research: ${error.message}`,
    };
  }
}

/**
 * Generate document
 */
async function generateDocument(
  task: REWorkflowTask,
  instance: REWorkflowInstance
): Promise<TaskResult> {
  // Generic document generation - can be extended for other document types
  try {
    const actionConfig = task.actionConfig as any;
    const documentType = actionConfig?.documentType || 'generic';
    
    // For now, return success - can be extended for PDF generation, contracts, etc.
    return {
      success: true,
      data: {
        documentType,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to generate document: ${error.message}`,
    };
  }
}
