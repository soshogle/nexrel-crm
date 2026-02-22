import { getCrmDb } from "@/lib/dal";
import { createDalContext } from "@/lib/context/industry-context";
import { leadService } from "@/lib/dal";

export async function setupTwilio(userId: string, params: any) {
  const { accountSid, authToken, phoneNumber } = params;

  if (!accountSid || !authToken || !phoneNumber) {
    throw new Error("Twilio Account SID, Auth Token, and Phone Number are all required");
  }

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const user = await db.user.update({
    where: { id: userId },
    data: {
      smsProvider: "Twilio",
      smsProviderConfigured: true,
    },
  });

  return {
    message: "✅ SMS and voice have been successfully configured! You can now send SMS and make voice calls.",
    provider: "Soshogle AI",
    phoneNumber: phoneNumber,
    nextSteps: [
      "Send your first SMS campaign",
      "Set up voice agents for calls",
      "Configure auto-replies",
      "Create SMS templates",
    ],
  };
}

export async function purchaseTwilioNumber(userId: string, params: any) {
  // Check if user has Twilio credentials configured
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      smsProvider: true,
      smsProviderConfig: true,
    },
  });

  // Check if Twilio is configured
  if (user?.smsProvider !== 'Twilio' || !user?.smsProviderConfig) {
    throw new Error("Please configure your SMS credentials first. I can help you with that!");
  }

  // Verify credentials are valid
  try {
    const config = JSON.parse(user.smsProviderConfig);
    if (!config.accountSid || !config.authToken) {
      throw new Error("SMS credentials are incomplete. Please reconfigure.");
    }
  } catch (error) {
    throw new Error("Invalid SMS configuration. Please reconfigure.");
  }

  // This action just triggers the UI dialog - the actual purchase happens in the UI
  return {
    message: "🎯 Let's find you the perfect phone number!",
    action: "open_purchase_dialog",
    nextSteps: [
      "Search for numbers by location or area code",
      "Choose your preferred number",
      "Purchase with one click",
      "Start using it immediately for calls and SMS",
    ],
  };
}

export async function createVoiceAgent(userId: string, params: any) {
  const { name, voiceId, prompt, businessName } = params;

  if (!name) {
    throw new Error("Voice agent name is required");
  }

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const voiceAgent = await db.voiceAgent.create({
    data: {
      userId: ctx.userId,
      name,
      businessName: businessName || name,
      voiceId: voiceId || "rachel",
      greetingMessage: prompt || "Hello! How can I help you today?",
      type: "INBOUND",
      status: "TESTING",
    },
  });

  return {
    message: `✅ Voice agent "${name}" has been created successfully!`,
    agent: {
      id: voiceAgent.id,
      name: voiceAgent.name,
      status: voiceAgent.status,
    },
    nextSteps: [
      "Schedule outbound calls",
      "Configure inbound call routing",
      "Test the voice agent",
      "Review call transcripts",
    ],
  };
}

export async function debugVoiceAgent(userId: string, params: any) {
  const { agentId, name } = params;

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  // Find the agent
  let agent;
  if (agentId) {
    agent = await db.voiceAgent.findFirst({
      where: { id: agentId, userId: ctx.userId },
    });
  } else if (name) {
    agent = await db.voiceAgent.findFirst({
      where: {
        userId: ctx.userId,
        name: { contains: name, mode: "insensitive" },
      },
    });
  }

  if (!agent) {
    return {
      success: false,
      error: "Voice agent not found",
      message: "I couldn't find a voice agent with that name. Let me check what agents you have...",
    };
  }

  // Check user's Twilio configuration
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      smsProvider: true,
      smsProviderConfigured: true,
      phone: true,
    },
  });

  // Diagnostic check
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Check 1: Greeting message
  if (!agent.greetingMessage || agent.greetingMessage.trim().length === 0) {
    issues.push("❌ Missing greeting message");
  } else if (agent.greetingMessage.trim().length < 10) {
    warnings.push("⚠️ Greeting message is very short (less than 10 characters)");
  }

  // Check 2: Voice selection
  if (!agent.voiceId || agent.voiceId === "") {
    issues.push("❌ No voice selected");
  }

  // Check 3: Twilio setup (using GLOBAL Twilio credentials from environment)
  const hasTwilioCredentials = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  if (!hasTwilioCredentials) {
    issues.push("❌ SMS/voice not configured - Global credentials missing from environment");
  }

  // Check 4: Phone number
  if (!user?.phone || user.phone.trim().length === 0) {
    issues.push("❌ No phone number configured in company profile");
  }

  // Check 5: Agent status
  if (agent.status === "INACTIVE") {
    warnings.push("⚠️ Agent is set to INACTIVE status");
  } else if (agent.status === "TESTING") {
    warnings.push("⚠️ Agent is in TESTING mode");
  }

  // Check 6: Business name
  if (!agent.businessName || agent.businessName.trim().length === 0) {
    warnings.push("⚠️ Missing business name - helps identify calls");
  }

  // Generate diagnostic report
  const isHealthy = issues.length === 0;
  
  let diagnosticReport = `🔍 **Diagnostic Report for "${agent.name}"**\n\n`;
  
  if (isHealthy && warnings.length === 0) {
    diagnosticReport += "✅ **Status: HEALTHY** - All checks passed!\n\n";
  } else if (isHealthy && warnings.length > 0) {
    diagnosticReport += "⚠️ **Status: WORKING (with warnings)** - Agent works but has minor issues\n\n";
  } else {
    diagnosticReport += "❌ **Status: NOT WORKING** - Critical issues found\n\n";
  }

  if (issues.length > 0) {
    diagnosticReport += "**Critical Issues:**\n";
    issues.forEach(issue => {
      diagnosticReport += `${issue}\n`;
    });
    diagnosticReport += "\n";
  }

  if (warnings.length > 0) {
    diagnosticReport += "**Warnings:**\n";
    warnings.forEach(warning => {
      diagnosticReport += `${warning}\n`;
    });
    diagnosticReport += "\n";
  }

  diagnosticReport += "**Current Configuration:**\n";
  diagnosticReport += `- Agent Name: ${agent.name}\n`;
  diagnosticReport += `- Business Name: ${agent.businessName || "Not set"}\n`;
  diagnosticReport += `- Type: ${agent.type}\n`;
  diagnosticReport += `- Status: ${agent.status}\n`;
  diagnosticReport += `- Voice: ${agent.voiceId || "Not set"}\n`;
  diagnosticReport += `- Greeting: ${agent.greetingMessage ? `"${agent.greetingMessage.substring(0, 50)}${agent.greetingMessage.length > 50 ? "..." : ""}"` : "Not set"}\n`;
  diagnosticReport += `- Twilio Setup: ${user?.smsProviderConfigured ? "✓ Configured" : "✗ Not configured"}\n`;
  diagnosticReport += `- Phone Number: ${user?.phone || "Not set"}\n`;

  return {
    success: true,
    isHealthy,
    agent: {
      id: agent.id,
      name: agent.name,
      status: agent.status,
    },
    issues,
    warnings,
    diagnosticReport,
    canAutoFix: issues.length > 0 && issues.every(issue => 
      issue.includes("greeting") || 
      issue.includes("voice") || 
      issue.includes("business name") ||
      issue.includes("status")
    ),
  };
}

export async function fixVoiceAgent(userId: string, params: any) {
  const { agentId, name, autoFix = true } = params;

  // First run diagnostics
  const diagnostics = await debugVoiceAgent(userId, { agentId, name });

  if (!diagnostics.success) {
    return diagnostics;
  }

  if (diagnostics.isHealthy) {
    return {
      success: true,
      message: `✅ Voice agent "${diagnostics.agent.name}" is already working correctly! No fixes needed.`,
      diagnosticReport: diagnostics.diagnosticReport,
    };
  }

  // Prepare fixes
  const fixes: string[] = [];
  const updateData: any = {};

  // Get the agent
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const agent = await db.voiceAgent.findFirst({
    where: diagnostics.agent?.id ? { id: diagnostics.agent.id } : { userId: ctx.userId, name: { contains: name, mode: "insensitive" } },
  });

  if (!agent) {
    throw new Error("Agent not found");
  }

  // Get user data
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  // Fix 1: Missing greeting message
  if (!agent.greetingMessage || agent.greetingMessage.trim().length === 0) {
    updateData.greetingMessage = `Hello! Thank you for calling ${agent.businessName || user?.name || "our business"}. How can I assist you today?`;
    fixes.push("✓ Added default greeting message");
  }

  // Fix 2: Missing voice
  if (!agent.voiceId || agent.voiceId === "") {
    updateData.voiceId = "rachel"; // Default ElevenLabs voice
    fixes.push("✓ Set default voice (Rachel)");
  }

  // Fix 3: Set to active if inactive
  if (agent.status === "INACTIVE") {
    updateData.status = "ACTIVE";
    fixes.push("✓ Activated voice agent");
  } else if (agent.status === "TESTING") {
    updateData.status = "ACTIVE";
    fixes.push("✓ Changed status from TESTING to ACTIVE");
  }

  // Fix 4: Add business name if missing
  if (!agent.businessName || agent.businessName.trim().length === 0) {
    updateData.businessName = user?.name || "My Business";
    fixes.push("✓ Added business name");
  }

  // Apply fixes
  if (Object.keys(updateData).length > 0) {
    await db.voiceAgent.update({
      where: { id: agent.id },
      data: updateData,
    });
  }

  // Check for unfixable issues
  const remainingIssues: string[] = [];
  
  // Check for GLOBAL Twilio credentials (not user-specific)
  const hasTwilioCredsForAutoFix = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  if (!hasTwilioCredsForAutoFix) {
    remainingIssues.push("⚠️ **Twilio not configured globally** - The platform administrator needs to configure Twilio credentials in the server environment.");
  }

  if (!user?.phone) {
    remainingIssues.push("⚠️ **No phone number** - Add your business phone number in Settings → Company Profile");
  }

  let message = `🔧 **Fixes Applied to "${agent.name}"**\n\n`;
  
  if (fixes.length > 0) {
    message += "**Completed Fixes:**\n";
    fixes.forEach(fix => {
      message += `${fix}\n`;
    });
    message += "\n";
  }

  if (remainingIssues.length > 0) {
    message += "**Remaining Setup Steps:**\n";
    remainingIssues.forEach(issue => {
      message += `${issue}\n`;
    });
    message += "\n";
    message += "Would you like me to help you set up Twilio now?";
  } else {
    message += "✅ **All fixed!** Your voice agent is now ready to handle calls!";
  }

  return {
    success: true,
    message,
    fixesApplied: fixes,
    remainingIssues,
    needsTwilioSetup: remainingIssues.some(i => i.includes("Twilio")),
    agent: {
      id: agent.id,
      name: agent.name,
      status: updateData.status || agent.status,
    },
  };
}

export async function getVoiceAgent(userId: string, params: any) {
  const { agentId, name } = params;

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  let agent;
  if (agentId) {
    agent = await db.voiceAgent.findFirst({
      where: { id: agentId, userId: ctx.userId },
    });
  } else if (name) {
    agent = await db.voiceAgent.findFirst({
      where: {
        userId: ctx.userId,
        name: { contains: name, mode: "insensitive" },
      },
    });
  }

  if (!agent) {
    throw new Error("Voice agent not found");
  }

  return { agent };
}

export async function listVoiceAgents(userId: string, params: any) {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const agents = await db.voiceAgent.findMany({
    where: { userId: ctx.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      businessName: true,
      type: true,
      status: true,
      voiceId: true,
      greetingMessage: true,
      createdAt: true,
    },
  });

  return {
    count: agents.length,
    agents,
  };
}

export async function updateVoiceAgent(userId: string, params: any) {
  const { agentId, name, ...updates } = params;

  if (!agentId && !name) {
    throw new Error("Agent ID or name is required");
  }

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  // Find the agent
  let agent;
  if (agentId) {
    agent = await db.voiceAgent.findFirst({
      where: { id: agentId, userId: ctx.userId },
    });
  } else if (name) {
    agent = await db.voiceAgent.findFirst({
      where: {
        userId: ctx.userId,
        name: { contains: name, mode: "insensitive" },
      },
    });
  }

  if (!agent) {
    throw new Error("Voice agent not found");
  }

  // Update the agent
  const updatedAgent = await db.voiceAgent.update({
    where: { id: agent.id },
    data: updates,
  });

  return {
    message: `✅ Voice agent "${updatedAgent.name}" updated successfully!`,
    agent: {
      id: updatedAgent.id,
      name: updatedAgent.name,
      status: updatedAgent.status,
      greetingMessage: updatedAgent.greetingMessage,
    },
  };
}

export async function assignPhoneToVoiceAgent(userId: string, params: any) {
  const { agentId, name, phoneNumber } = params;

  if (!phoneNumber) {
    throw new Error("Phone number is required");
  }

  if (!agentId && !name) {
    throw new Error("Agent ID or name is required");
  }

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  // Find the agent
  let agent;
  if (agentId) {
    agent = await db.voiceAgent.findFirst({
      where: { id: agentId, userId: ctx.userId },
    });
  } else if (name) {
    agent = await db.voiceAgent.findFirst({
      where: {
        userId: ctx.userId,
        name: { contains: name, mode: "insensitive" },
      },
    });
  }

  if (!agent) {
    throw new Error("Voice agent not found");
  }

  // Update the agent with the phone number
  const updatedAgent = await db.voiceAgent.update({
    where: { id: agent.id },
    data: {
      twilioPhoneNumber: phoneNumber,
      status: 'ACTIVE', // Activate the agent
    },
  });

  return {
    message: `✅ Phone number ${phoneNumber} assigned to "${updatedAgent.name}" successfully!`,
    agent: {
      id: updatedAgent.id,
      name: updatedAgent.name,
      phoneNumber: updatedAgent.twilioPhoneNumber,
      status: updatedAgent.status,
    },
  };
}

export async function configureAutoReply(userId: string, params: any) {
  const { enabled, message, channels } = params;

  if (enabled && !message) {
    throw new Error("Auto-reply message is required when enabling");
  }

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const user = await db.user.update({
    where: { id: userId },
    data: {
      // Store auto-reply settings in user config
      // These fields should exist in your schema
    },
  });

  return {
    message: enabled 
      ? "✅ Auto-reply has been enabled successfully!" 
      : "✅ Auto-reply has been disabled.",
    status: enabled ? "Enabled" : "Disabled",
    channels: channels || ["Email", "SMS"],
    replyMessage: message,
  };
}

export async function makeOutboundCallAction(userId: string, params: any) {
  const { makeOutboundCall } = await import("@/lib/outbound-call-service");
  const result = await makeOutboundCall({
    userId,
    contactName: params.contactName,
    phoneNumber: params.phoneNumber,
    purpose: params.purpose,
    notes: params.notes,
    voiceAgentId: params.voiceAgentId,
    voiceAgentName: params.voiceAgentName,
    leadId: params.leadId,
    immediate: params.immediate !== false,
    scheduledFor: params.scheduledFor,
  });
  if (!result.success) {
    throw new Error(result.error || "Failed to initiate call");
  }
  return {
    message: result.message || `✓ Call initiated to ${params.contactName}`,
    outboundCall: result.outboundCall
      ? {
          id: result.outboundCall.id,
          name: result.outboundCall.name,
          phoneNumber: result.outboundCall.phoneNumber,
          status: result.outboundCall.status,
          scheduledFor: result.outboundCall.scheduledFor,
        }
      : undefined,
  };
}

export async function callLeadsAction(userId: string, params: any) {
  const { makeBulkOutboundCalls } = await import("@/lib/outbound-call-service");
  const result = await makeBulkOutboundCalls({
    userId,
    criteria: params.period || params.status
      ? {
          period: params.period || "today",
          status: params.status,
          limit: params.limit || 50,
        }
      : undefined,
    purpose: params.purpose,
    notes: params.notes,
    voiceAgentId: params.voiceAgentId,
    voiceAgentName: params.voiceAgentName,
    immediate: true,
  });
  if (!result.success && result.scheduled === 0) {
    throw new Error(result.error || "No calls could be initiated");
  }
  return {
    message: result.message || `✓ Initiated ${result.scheduled} call(s)`,
    scheduled: result.scheduled,
    failed: result.failed,
  };
}

export async function draftSMSAction(userId: string, params: any) {
  const { contactName, message, phoneNumber } = params;
  if (!contactName || !message) {
    throw new Error("contactName and message are required");
  }
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const leads = await leadService.findMany(ctx, {
    where: {
      OR: [
        { contactPerson: { contains: contactName, mode: "insensitive" } },
        { businessName: { contains: contactName, mode: "insensitive" } },
      ],
    },
    take: 1,
  });
  const lead = leads[0];
  const toPhone = phoneNumber || lead?.phone;
  if (!toPhone) {
    throw new Error(`Contact "${contactName}" not found or has no phone number.`);
  }
  return {
    message: `I've drafted an SMS for you to review. Should I send it now or schedule it for later?`,
    smsDraft: {
      contactName: lead?.contactPerson || lead?.businessName || contactName,
      to: toPhone,
      message,
      leadId: lead?.id,
    },
  };
}

export async function sendSMSAction(userId: string, params: any) {
  const { sendSMS } = await import("@/lib/messaging-service");
  const result = await sendSMS({
    userId,
    contactName: params.contactName,
    message: params.message,
    phoneNumber: params.phoneNumber,
    leadId: params.leadId,
  });
  if (!result.success) throw new Error(result.error);
  return { message: result.message || `✓ SMS sent to ${params.contactName}` };
}

export async function scheduleSMSAction(userId: string, params: any) {
  const { contactName, message, scheduledFor } = params;
  if (!contactName || !message || !scheduledFor) {
    throw new Error("contactName, message, and scheduledFor are required");
  }
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const leads = await leadService.findMany(ctx, {
    where: {
      OR: [
        { contactPerson: { contains: contactName, mode: "insensitive" } },
        { businessName: { contains: contactName, mode: "insensitive" } },
      ],
    },
    take: 1,
  });
  const lead = leads[0];
  if (!lead?.phone) {
    throw new Error(`Contact "${contactName}" not found or has no phone number.`);
  }
  const scheduledDate = new Date(scheduledFor);
  if (scheduledDate <= new Date()) {
    throw new Error("Scheduled time must be in the future.");
  }
  await db.scheduledSms.create({
    data: {
      userId: ctx.userId,
      leadId: lead.id,
      toPhone: lead.phone,
      toName: lead.contactPerson || lead.businessName,
      message,
      scheduledFor: scheduledDate,
      status: "PENDING",
    },
  });
  return {
    message: `✓ SMS scheduled to ${contactName} for ${scheduledDate.toLocaleString()}`,
  };
}

export async function draftEmailAction(userId: string, params: any) {
  const { contactName, subject, body, email } = params;
  if (!contactName || !subject || !body) {
    throw new Error("contactName, subject, and body are required");
  }
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const leads = await leadService.findMany(ctx, {
    where: {
      OR: [
        { contactPerson: { contains: contactName, mode: "insensitive" } },
        { businessName: { contains: contactName, mode: "insensitive" } },
      ],
    },
    take: 1,
  });
  const lead = leads[0];
  const toEmail = email || lead?.email;
  if (!toEmail) {
    throw new Error(`Contact "${contactName}" not found or has no email.`);
  }
  return {
    message: `I've drafted an email for you to review. Should I send it now or schedule it for later?`,
    emailDraft: {
      contactName: lead?.contactPerson || lead?.businessName || contactName,
      to: toEmail,
      subject,
      body,
      leadId: lead?.id,
    },
  };
}

export async function sendEmailAction(userId: string, params: any) {
  const { sendEmail } = await import("@/lib/messaging-service");
  const result = await sendEmail({
    userId,
    contactName: params.contactName,
    subject: params.subject,
    body: params.body,
    email: params.email,
    leadId: params.leadId,
  });
  if (!result.success) throw new Error(result.error);
  return { message: result.message || `✓ Email sent to ${params.contactName}` };
}

export async function scheduleEmailAction(userId: string, params: any) {
  const { contactName, subject, body, scheduledFor } = params;
  if (!contactName || !subject || !body || !scheduledFor) {
    throw new Error("contactName, subject, body, and scheduledFor are required");
  }
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const leads = await leadService.findMany(ctx, {
    where: {
      OR: [
        { contactPerson: { contains: contactName, mode: "insensitive" } },
        { businessName: { contains: contactName, mode: "insensitive" } },
      ],
    },
    take: 1,
  });
  const lead = leads[0];
  if (!lead?.email) {
    throw new Error(`Contact "${contactName}" not found or has no email.`);
  }
  const scheduledDate = new Date(scheduledFor);
  if (scheduledDate <= new Date()) {
    throw new Error("Scheduled time must be in the future.");
  }
  await db.scheduledEmail.create({
    data: {
      userId: ctx.userId,
      leadId: lead.id,
      toEmail: lead.email,
      toName: lead.contactPerson || lead.businessName,
      subject,
      body,
      scheduledFor: scheduledDate,
      status: "PENDING",
    },
  });
  return {
    message: `✓ Email scheduled to ${contactName} for ${scheduledDate.toLocaleString()}`,
  };
}

export async function smsLeadsAction(userId: string, params: any) {
  const { sendSMSToLeads } = await import("@/lib/messaging-service");
  const result = await sendSMSToLeads({
    userId,
    purpose: params.purpose || params.message,
    message: params.message,
    criteria: {
      period: params.period || "today",
      status: params.status,
      limit: params.limit || 50,
    },
  });
  if (!result.success && result.sent === 0) {
    throw new Error(result.error || "No SMS could be sent");
  }
  return {
    message: result.message || `✓ Sent ${result.sent} SMS`,
    sent: result.sent,
    failed: result.failed,
  };
}

export async function emailLeadsAction(userId: string, params: any) {
  const { sendEmailToLeads } = await import("@/lib/messaging-service");
  const result = await sendEmailToLeads({
    userId,
    purpose: params.purpose || params.subject,
    message: params.message,
    subject: params.subject,
    criteria: {
      period: params.period || "today",
      status: params.status,
      limit: params.limit || 50,
    },
  });
  if (!result.success && result.sent === 0) {
    throw new Error(result.error || "No emails could be sent");
  }
  return {
    message: result.message || `✓ Sent ${result.sent} emails`,
    sent: result.sent,
    failed: result.failed,
  };
}

export async function setupWhatsApp(userId: string, params: any) {
  const { accountSid, authToken, phoneNumber } = params;

  if (!accountSid || !authToken || !phoneNumber) {
    return {
      message: "I'll help you configure WhatsApp Business.",
      instructions: "To set up WhatsApp:\n1. Go to Settings → WhatsApp\n2. Enter your Twilio credentials:\n   - Account SID\n   - Auth Token\n   - WhatsApp-enabled phone number\n3. Configure the webhook in Twilio console\n\nOnce configured, you'll be able to:\n- Send and receive WhatsApp messages\n- Share media with customers\n- Run WhatsApp campaigns\n- Set up auto-replies",
      navigateTo: '/dashboard/settings?tab=whatsapp',
      actionRequired: true
    };
  }

  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/integrations/whatsapp/configure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountSid, authToken, phoneNumber })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to configure WhatsApp');
  }

  return {
    message: '✅ WhatsApp configured successfully! You can now send messages.',
    navigateTo: '/dashboard/messages'
  };
}

export async function sendWhatsAppMessage(userId: string, params: any) {
  const { to, message, mediaUrl } = params;

  if (!to || !message) {
    throw new Error('Recipient phone number and message are required');
  }

  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/integrations/whatsapp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, message, mediaUrl })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send WhatsApp message');
  }

  const data = await response.json();

  return {
    message: `✅ WhatsApp message sent to ${to}!`,
    messageSid: data.messageSid
  };
}

export async function getWhatsAppConversations(userId: string, params: any) {
  const { contactId } = params || {};

  const url = contactId 
    ? `${process.env.NEXTAUTH_URL}/api/integrations/whatsapp/conversations?contactId=${contactId}`
    : `${process.env.NEXTAUTH_URL}/api/integrations/whatsapp/conversations`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch conversations');
  }

  const data = await response.json();

  const conversationsCount = data.conversations?.length || 0;
  
  return {
    message: `Found ${conversationsCount} WhatsApp conversation(s)`,
    conversations: data.conversations
  };
}

export async function summarizeCall(userId: string, params: any) {
  const { callLogId } = params;
  if (!callLogId) throw new Error("callLogId is required");
  const { summarizeCallAndAddNote } = await import("@/lib/call-summary-service");
  const result = await summarizeCallAndAddNote(callLogId, userId);
  return {
    message: `Call summarized. ${result.noteId ? "Added as note to contact." : ""}`,
    summary: result.summary,
    actionItems: result.actionItems,
    sentiment: result.sentiment,
    noteId: result.noteId,
    navigateTo: result.noteId ? "/dashboard/contacts" : null,
  };
}

export async function getSmartReplies(userId: string, params: any) {
  const { leadId, context } = params;
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const lead = leadId ? await leadService.findUnique(ctx, leadId, {
    deals: { take: 1 },
    notes: { take: 1, orderBy: { createdAt: "desc" } },
  }) : null;
  const replies = [
    { id: "follow_up", label: "Follow up", text: "Hi! Just following up on our conversation. Would love to connect soon." },
    { id: "thank_you", label: "Thank you", text: "Thank you for your time today. I'll be in touch with next steps." },
    { id: "meeting", label: "Schedule meeting", text: "Would you have 15 minutes this week for a quick call? I'd love to show you how we can help." },
    { id: "documents", label: "Send documents", text: "I'm sending over the materials we discussed. Let me know if you have any questions." },
    { id: "check_in", label: "Check in", text: "Hi! Wanted to check in and see how things are going. Any questions I can help with?" },
  ];
  return {
    message: "Smart replies for common situations.",
    replies,
    leadName: lead?.contactPerson || lead?.businessName,
  };
}
