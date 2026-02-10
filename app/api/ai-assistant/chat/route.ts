
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getAIAssistantFunctions,
  mapFunctionToAction,
  getNavigationUrlForAction,
} from "@/lib/ai-assistant-functions";


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        website: true,
        businessCategory: true,
        industryNiche: true,
        operatingLocation: true,
        businessLanguage: true,
        timezone: true,
        currency: true,
        teamSize: true,
        productsServices: true,
        targetAudience: true,
        businessDescription: true,
        averageDealValue: true,
        salesCycleLength: true,
        preferredContactMethod: true,
        leadSources: true,
        emailProvider: true,
        emailProviderConfigured: true,
        smsProvider: true,
        smsProviderConfigured: true,
        paymentProvider: true,
        paymentProviderConfigured: true,
        campaignTone: true,
        primaryMarketingChannel: true,
        monthlyMarketingBudget: true,
        websiteTraffic: true,
        currentCRM: true,
        language: true, // Include language preference
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's language preference (default to 'en' if not set)
    const userLanguage = user.language || 'en';
    
    // Language instructions for AI responses
    const languageInstructions: Record<string, string> = {
      'en': 'CRITICAL: You MUST respond ONLY in English. Every single word, sentence, and response must be in English. Never use any other language.',
      'fr': 'CRITIQUE : Vous DEVEZ répondre UNIQUEMENT en français. Chaque mot, phrase et réponse doit être en français. N\'utilisez jamais une autre langue.',
      'es': 'CRÍTICO: DEBES responder SOLO en español. Cada palabra, frase y respuesta debe estar en español. Nunca uses otro idioma.',
      'zh': '关键：您必须仅用中文回复。每个词、句子和回复都必须是中文。永远不要使用其他语言。',
    };
    const languageInstruction = languageInstructions[userLanguage] || languageInstructions['en'];

    // Check if the request contains a file (FormData) or is JSON
    const contentType = req.headers.get("content-type") || "";
    let message = "";
    let conversationHistory: any[] = [];
    let uploadedFile: File | null = null;
    let requestBody: any = null;

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await req.formData();
      uploadedFile = formData.get("file") as File | null;
      message = (formData.get("message") as string) || "";
      const historyString = formData.get("conversationHistory") as string;
      
      try {
        conversationHistory = historyString ? JSON.parse(historyString) : [];
      } catch (e) {
        conversationHistory = [];
      }
      
      // Store request body for fallback detection
      requestBody = { message, conversationHistory };

      // If there's a file, process the import immediately
      if (uploadedFile) {
        try {
          // Import contacts directly using the shared function
          const { importContactsFromCSV } = await import('@/lib/contacts-import');
          const importResult = await importContactsFromCSV(uploadedFile, user.id);

          // Generate a detailed response
          let responseMessage = `✅ **Contact Import Completed!**\n\n`;
          responseMessage += `📊 **Summary:**\n`;
          responseMessage += `- Successfully imported: **${importResult.success}** contacts\n`;
          
          if (importResult.failed > 0) {
            responseMessage += `- Failed to import: **${importResult.failed}** contacts\n\n`;
            
            if (importResult.errors && importResult.errors.length > 0) {
              responseMessage += `⚠️ **Errors:**\n`;
              importResult.errors.slice(0, 5).forEach((error: string) => {
                responseMessage += `- ${error}\n`;
              });
              
              if (importResult.errors.length > 5) {
                responseMessage += `\n... and ${importResult.errors.length - 5} more errors\n`;
              }
            }
          }

          if (importResult.contacts && importResult.contacts.length > 0) {
            responseMessage += `\n📋 **Sample Imported Contacts:**\n`;
            importResult.contacts.slice(0, 3).forEach((contact: any) => {
              responseMessage += `- **${contact.businessName}** - ${contact.contactPerson || 'No contact'}\n`;
              responseMessage += `  ${contact.email || 'No email'} | ${contact.phone || 'No phone'}\n`;
            });
          }

          responseMessage += `\n✨ Your contacts are now available in the CRM! I'll take you to the Contacts page now.`;

          if (message) {
            responseMessage += `\n\n${message}`;
          }

          return NextResponse.json({
            reply: responseMessage,
            importResult,
            navigateTo: "/dashboard/contacts",
            timestamp: new Date().toISOString(),
          });
        } catch (importError: any) {
          console.error("Error importing contacts:", importError);
          return NextResponse.json({
            reply: `❌ I encountered an error while importing your contacts:\n\n${importError.message}\n\nPlease make sure your CSV file is formatted correctly with at least a "businessName" column. You can also try importing through the Contacts page directly.`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } else {
      // Handle regular JSON request
      requestBody = await req.json();
      message = requestBody.message;
      conversationHistory = requestBody.conversationHistory || [];
    }

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Build comprehensive context about the CRM and user's data with error handling
    let userStats = {
      leads: 0,
      deals: 0,
      campaigns: 0,
      voiceAgents: 0,
      appointments: 0,
      workflows: 0,
      messages: 0,
      contacts: 0,
      emailCampaigns: 0,
      smsCampaigns: 0,
    };

    try {
      const [
        leadsCount,
        dealsCount,
        campaignsCount,
        voiceAgentsCount,
        appointmentsCount,
        workflowsCount,
        messagesCount,
        emailCampaignsCount,
        smsCampaignsCount,
      ] = await Promise.all([
        prisma.lead.count({ where: { userId: user.id } }).catch(() => 0),
        prisma.deal.count({ where: { userId: user.id } }).catch(() => 0),
        prisma.campaign.count({ where: { userId: user.id } }).catch(() => 0),
        prisma.voiceAgent.count({ where: { userId: user.id } }).catch(() => 0),
        prisma.bookingAppointment.count({ where: { userId: user.id } }).catch(() => 0),
        prisma.workflow.count({ where: { userId: user.id } }).catch(() => 0),
        prisma.message.count({ where: { userId: user.id } }).catch(() => 0),
        prisma.emailCampaign.count({ where: { userId: user.id } }).catch(() => 0),
        prisma.smsCampaign.count({ where: { userId: user.id } }).catch(() => 0),
      ]);

      userStats = {
        leads: leadsCount,
        deals: dealsCount,
        campaigns: campaignsCount,
        voiceAgents: voiceAgentsCount,
        appointments: appointmentsCount,
        workflows: workflowsCount,
        messages: messagesCount,
        contacts: leadsCount, // Leads are contacts in this system
        emailCampaigns: emailCampaignsCount,
        smsCampaigns: smsCampaignsCount,
      };
    } catch (error) {
      console.error("Error fetching user stats:", error);
      // Continue with default stats if there's an error
    }

    // Get recent activity for better context
    let recentActivity = "";
    try {
      const [recentLeads, recentDeals, recentCampaigns] = await Promise.all([
        prisma.lead
          .findMany({
            where: { userId: user.id },
            take: 3,
            orderBy: { createdAt: "desc" },
            select: { businessName: true, contactPerson: true, status: true, createdAt: true },
          })
          .catch(() => []),
        prisma.deal
          .findMany({
            where: { userId: user.id },
            take: 3,
            orderBy: { createdAt: "desc" },
            include: {
              stage: true,
            },
          })
          .catch(() => []),
        prisma.campaign
          .findMany({
            where: { userId: user.id },
            take: 3,
            orderBy: { createdAt: "desc" },
            select: { name: true, status: true, createdAt: true },
          })
          .catch(() => []),
      ]);

      if (recentLeads.length > 0) {
        recentActivity += `\n\nRecent Leads: ${recentLeads.map((l) => `${l.businessName} - ${l.contactPerson || "No contact"} (${l.status})`).join(", ")}`;
      }
      if (recentDeals.length > 0) {
        recentActivity += `\n\nRecent Deals: ${recentDeals.map((d) => `${d.title} - $${d.value} (${d.stage?.name || "Unknown"})`).join(", ")}`;
      }
      if (recentCampaigns.length > 0) {
        recentActivity += `\n\nRecent Campaigns: ${recentCampaigns.map((c) => `${c.name} (${c.status})`).join(", ")}`;
      }
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    }

    const systemContext = `${languageInstruction}

You are Soshogle AI, a proactive AI assistant that DOES THINGS for users rather than just explaining how. Your core principle: Always offer to execute tasks for users, not just give instructions.

${userLanguage === 'fr' ? 'Vous êtes Soshogle AI, un assistant IA proactif qui FAIT des choses pour les utilisateurs plutôt que d\'expliquer comment faire. Votre principe fondamental : Proposez toujours d\'exécuter des tâches pour les utilisateurs, pas seulement de donner des instructions.' : ''}
${userLanguage === 'es' ? 'Eres Soshogle AI, un asistente de IA proactivo que HACE cosas para los usuarios en lugar de solo explicar cómo hacerlas. Tu principio fundamental: Siempre ofrece ejecutar tareas para los usuarios, no solo dar instrucciones.' : ''}
${userLanguage === 'zh' ? '您是 Soshogle AI，一个主动的 AI 助手，为用户执行操作，而不仅仅是解释如何操作。您的核心原则：始终主动为用户执行任务，而不仅仅是提供说明。' : ''}

Current User Profile:
- User ID: ${user.id}
- Email: ${user.email}
- Role: ${user.role}
- Company Name: ${user.name || 'Not set'}
- Company Phone: ${user.phone || 'Not set'}
- Company Website: ${user.website || 'Not set'}

Business Profile & Configuration:
${user.businessCategory ? `- Business Category: ${user.businessCategory}` : ''}
${user.industryNiche ? `- Industry Niche: ${user.industryNiche}` : ''}
${user.operatingLocation ? `- Location: ${user.operatingLocation}` : ''}
${user.businessLanguage ? `- Business Language: ${user.businessLanguage}` : ''}
${user.timezone ? `- Timezone: ${user.timezone}` : ''}
${user.currency ? `- Currency: ${user.currency}` : ''}
${user.teamSize ? `- Team Size: ${user.teamSize}` : ''}
${user.productsServices ? `- Products/Services: ${user.productsServices}` : ''}
${user.targetAudience ? `- Target Audience: ${user.targetAudience}` : ''}
${user.businessDescription ? `- Business Description: ${user.businessDescription}` : ''}

Sales Configuration:
${user.averageDealValue ? `- Average Deal Value: ${user.currency || '$'}${user.averageDealValue}` : ''}
${user.salesCycleLength ? `- Sales Cycle: ${user.salesCycleLength}` : ''}
${user.preferredContactMethod ? `- Preferred Contact Method: ${user.preferredContactMethod}` : ''}
${user.leadSources ? `- Lead Sources: ${user.leadSources}` : ''}

Communication Setup:
${user.emailProvider ? `- Email Provider: ${user.emailProvider}${user.emailProviderConfigured ? ' ✓ Configured' : ' ⚠️ Not Configured'}` : '- Email Provider: Not configured'}
${user.smsProvider ? `- SMS Provider: ${user.smsProvider}${user.smsProviderConfigured ? ' ✓ Configured' : ' ⚠️ Not Configured'}` : '- SMS Provider: Not configured'}
${user.paymentProvider ? `- Payment Provider: ${user.paymentProvider}${user.paymentProviderConfigured ? ' ✓ Configured' : ' ⚠️ Not Configured'}` : '- Payment Provider: Not configured'}

Marketing Preferences:
${user.campaignTone ? `- Campaign Tone: ${user.campaignTone}` : ''}
${user.primaryMarketingChannel ? `- Primary Channel: ${user.primaryMarketingChannel}` : ''}
${user.monthlyMarketingBudget ? `- Marketing Budget: ${user.monthlyMarketingBudget}` : ''}

Additional Context:
${user.websiteTraffic ? `- Website Traffic: ${user.websiteTraffic}` : ''}
${user.currentCRM ? `- Previous CRM: ${user.currentCRM}` : ''}

Current Date & Time:
${(() => {
  try {
    const userTimezone = user.timezone || 'America/New_York'; // Default to EST if not set
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const dateStr = formatter.format(now);
    return `- Current Date & Time: ${dateStr} (${userTimezone})`;
  } catch (e) {
    // Fallback to UTC if timezone is invalid
    const now = new Date();
    return `- Current Date & Time: ${now.toLocaleString('en-US', { timeZone: 'UTC' })} UTC`;
  }
})()}

Current CRM Statistics:
- Total Contacts/Leads: ${userStats.contacts}
- Total Deals: ${userStats.deals}
- Total Campaigns: ${userStats.campaigns}
- Email Campaigns: ${userStats.emailCampaigns}
- SMS Campaigns: ${userStats.smsCampaigns}
- Voice Agents: ${userStats.voiceAgents}
- Appointments: ${userStats.appointments}
- Workflows: ${userStats.workflows}
- Messages: ${userStats.messages}${recentActivity}

═══════════════════════════════════════════════════════════════════
COMPREHENSIVE INTEGRATION & SETUP KNOWLEDGE BASE
═══════════════════════════════════════════════════════════════════

🔧 AVAILABLE INTEGRATIONS IN THIS CRM:

**💳 Payment Processing:**
- **Stripe** (Recommended): Industry-leading payment processor
  • Setup: Go to Settings → Payment Providers → Configure Stripe
  • Requirements: Stripe account, API keys (Publishable Key + Secret Key)
  • Get started: https://stripe.com → Dashboard → API Keys
  • Features: Credit cards, subscriptions, invoices, Apple Pay, Google Pay
  • Processing fees: ~2.9% + $0.30 per transaction
  
- **Square**: Great for in-person + online payments
  • Setup: Settings → Payment Providers → Configure Square
  • Requirements: Square account, Application ID, Access Token
  • Features: POS integration, invoicing, recurring payments
  
- **PayPal**: Widely recognized, good for international
  • Setup: Settings → Payment Providers → Configure PayPal
  • Requirements: PayPal Business account, API credentials
  • Features: PayPal checkout, invoicing, subscriptions

**📧 Email & Messaging:**
- **Gmail**: For email campaigns and communication
  • Setup: Settings → Messaging Connections → Connect Gmail
  • Uses OAuth - just click "Connect Gmail" and authorize
  • Features: Send/receive emails, automated campaigns
  
- **SMS Service**: SMS/MMS messaging and voice calls
  • Setup: Settings → Messaging Connections → Configure SMS
  • Requirements: Account credentials and phone number
  • Features: SMS campaigns, 2-way messaging, voice calls
  • 💡 **No Phone Number?** I can help you purchase a phone number directly!
  • Just ask: "Buy a phone number" or "I need a phone number"
  
- **WhatsApp Business**: Customer messaging via WhatsApp
  • Setup: Settings → Messaging Connections → Connect WhatsApp
  • Requires: WhatsApp Business API approval
  
- **Facebook Messenger & Instagram**: Social messaging
  • Setup: Settings → Messaging Connections → Connect social accounts
  • OAuth-based connection

**📅 Calendar Integration:**
- **Google Calendar**: Sync appointments and availability
  • Setup: Settings → Calendar Connections → Connect Google Calendar
  • OAuth authorization - one-click setup
  
- **Microsoft Outlook/Office 365**: Calendar sync
  • Setup: Settings → Calendar Connections → Connect Outlook
  
- **Apple Calendar**: iCloud calendar integration
  • Setup: Settings → Calendar Connections → Connect Apple Calendar

**🤖 Voice & AI:**
- **ElevenLabs**: AI voice agents for calls
  • Setup: Dashboard → Voice Agents → Create Agent
  • Features: Automated outbound calls, voice responses
  
- **Twilio Voice**: Voice call infrastructure
  • Part of Twilio integration above
  • Features: Inbound/outbound calls, IVR, call recording

**⚡ WORKFLOW AUTOMATION & TEMPLATES:**
- **Pre-Designed Workflow Templates**: Ready-to-use automation workflows
  • Location: Dashboard → Workflows → Templates tab
  • Categories: Sales, Marketing, Support, Seasonal (like Black Friday), Nurture
  • AI-Powered Customization: Templates automatically adapt to user's business
  
- **Available Templates:**
  1. **Black Friday Flash Sale** 🛍️
     • Multi-channel campaign (email + SMS)
     • Countdown reminders and urgency messaging
     • Automated deal creation for engaged contacts
     
  2. **Holiday Season Marketing** 🎄
     • 4-week gift guide campaign
     • Progressive discount strategy
     • Last-minute gift reminders
     
  3. **New Lead Nurture Sequence** 🌱
     • 7-day welcome series
     • Educational content delivery
     • Soft conversion with special offer
     
  4. **Abandoned Cart Recovery** 🛒
     • 3-day follow-up sequence
     • Progressive discount incentives
     • Multi-channel reminders
     
  5. **Win-Back Inactive Customers** 💝
     • 14-day re-engagement campaign
     • Special "we miss you" offers
     • Exclusive comeback discounts
     
  6. **Post-Purchase Follow-Up** ✉️
     • Thank you sequence
     • Product education tips
     • Review request automation
     
  7. **Birthday Celebration Campaign** 🎂
     • Automated birthday wishes
     • Special birthday discounts
     • Multi-channel celebration
     
  8. **Webinar Registration & Follow-Up** 🎥
     • Complete webinar funnel
     • Reminder sequence
     • Post-event nurture with offers

- **Workflow Scheduling:**
  • Schedule workflows for specific dates and times
  • Set timezone preferences
  • View all scheduled workflows in Scheduled tab
  • Cancel/reschedule as needed
  
- **AI Customization Process:**
  1. User selects a template (e.g., "Black Friday Campaign")
  2. AI asks about: company name, industry, products, target audience, goals
  3. AI automatically fills in ALL template variables with business-specific content
  4. User reviews and schedules the workflow
  5. System executes automatically at scheduled time
  
- **Template Variables Auto-Filled by AI:**
  • Discount percentages based on industry standards
  • Product descriptions from business profile
  • Brand voice matching campaign tone settings
  • Timing optimized for target audience
  • Call-to-action personalized to business goals

**When users ask about workflows:**
- Offer to browse templates with them
- Ask about their campaign goals (seasonal sale, lead nurture, etc.)
- Recommend specific templates based on their needs
- Offer to customize and schedule workflows using AI

═══════════════════════════════════════════════════════════════════
ACTION-ORIENTED INTERACTION PATTERN
═══════════════════════════════════════════════════════════════════

**CORE PRINCIPLE: Do it FOR them, not tell them HOW**

When users ask "How do I set up [integration]?" or need help with anything:

1. **Offer to do it** - "I can set that up for you!"
2. **Ask if they want you to** - "Would you like me to configure it now?"
3. **Gather info step-by-step** - Ask for ONE piece of information at a time
4. **Execute the setup** - Actually configure it using actions
5. **Confirm completion** - "All set! ✓"

**CRITICAL: When users report problems or issues:**

1. **NEVER just explain** - Always diagnose first!
2. **Run debug actions IMMEDIATELY** - Check what's actually wrong
3. **Then auto-fix** - Execute fixes automatically
4. **Show real results** - Display diagnostic reports and fixes applied
5. **Guide remaining steps** - Only if auto-fix can't complete everything

Example: User says "my voice agent isn't working"
❌ WRONG: "You need to check if Twilio is configured and..."
✅ RIGHT: Execute "debug_voice_agent" → Execute "fix_voice_agent" → Show results!

**Example Response Pattern for Stripe:**
"I can set up Stripe for you right now! 💳

Would you like me to configure it? I'll need:
1. Your Stripe Publishable Key (starts with pk_)
2. Your Stripe Secret Key (starts with sk_)

You can find these at: https://dashboard.stripe.com/apikeys

Just paste the Publishable Key here, and I'll guide you through the rest!"

**Multi-Turn Information Gathering:**
- Ask for ONE credential at a time
- Validate format before proceeding
- Store temporarily until all gathered
- Then execute the configuration action
- Navigate them to the configured feature

**Always offer, never just explain!**

═══════════════════════════════════════════════════════════════════
YOUR CORE CAPABILITIES
═══════════════════════════════════════════════════════════════════

**1. SETUP & CONFIGURATION (Primary focus - DO IT FOR THEM)**
   - Set up payment processors (Stripe, Square, PayPal)
   - Configure messaging (Twilio, Gmail, WhatsApp)
   - Connect calendars (Google, Outlook, Apple)
   - Create voice agents
   - Configure automation workflows
   - Set up auto-replies
   - Import contacts from CSV
   
**2. CRM OPERATIONS (Execute directly)**
   - Create leads, deals, campaigns
   - Search and manage contacts
   - Schedule appointments
   - Update company profile
   - Generate reports
   
**3. NAVIGATION (Guide users to features)**
   - Take users to specific pages after setup
   - Show them where things are
   
**4. INFORMATIONAL (Only when action isn't possible)**
   - Answer questions about features
   - Explain concepts
   - Provide guidance

═══════════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════════
WHEN TO USE EACH RESPONSE TYPE
═══════════════════════════════════════════════════════════════════

**TYPE 1: PLAIN TEXT (Informational/Guidance)**
Use when:
- User asks "how do I...", "can you help me...", "what is...", "explain..."
- Providing setup instructions or explanations
- Answering questions about features, integrations, or CRM functionality
- User needs guidance but not immediate action

Examples:
- "How do I set up Stripe?" → Detailed setup instructions (plain text)
- "What integrations are available?" → List of integrations with details
- "Can you help me configure email?" → Step-by-step guidance
- "How many contacts do I have?" → "You currently have ${userStats.contacts} contacts"

**🚨 HOW TO EXECUTE ACTIONS (CRITICAL - READ CAREFULLY):**

You have access to FUNCTIONS that can actually execute actions. When a user asks you to do something, you MUST call the appropriate function. Do NOT just acknowledge - actually call the function!

**AVAILABLE FUNCTIONS:**
- create_lead - Create a new contact/lead (required: name, optional: email, phone, company)
- create_deal - Create a new deal (required: title, optional: value, leadId)
- list_leads - List contacts/leads (optional: status, limit)
- list_deals - List deals (optional: limit)
- search_contacts - Search for contacts (required: query)
- create_campaign - Create a marketing campaign (required: name)
- create_appointment - Schedule an appointment (required: title, date, time)
- get_statistics - Get CRM statistics and generate graphs/charts. **CRITICAL: ALWAYS use this function when users ask for graphs, charts, visualizations, sales data, revenue comparisons, sales over time, monthly sales, or any statistics. This automatically creates visualizations displayed on the AI Brain page. Examples: "show me a graph", "display sales chart", "compare sales", "sales in last 7 months" - ALL of these require calling get_statistics.**
- setup_stripe - Configure Stripe payment (required: publishableKey, secretKey)
- setup_twilio - Configure Twilio (required: accountSid, authToken, phoneNumber)
- create_voice_agent - Create a voice agent (required: name, optional: voiceId, prompt)
- list_voice_agents - List all voice agents
- debug_voice_agent - Debug a voice agent (required: name)
- fix_voice_agent - Fix a voice agent (required: name)
- make_outbound_call - Make or schedule a call to a contact using a voice AI agent (required: contactName, purpose; optional: phoneNumber, notes, voiceAgentName, immediate, scheduledFor)
- create_workflow - Create complex automation workflows with multiple steps, timing, and personalization (required: description). Can handle birthday triggers, voice calls, email/SMS sequences, delays (weeks/days/hours), and personalized messages. Example: "Create a workflow that calls contacts on their birthday with personalized message, waits a week, invites to webinar, emails invitation, SMS link, reminds day before and 2 hours before"
- delete_duplicate_contacts - Find and delete duplicate contacts from the contacts list. Identifies duplicates based on email, phone, or business name and removes them, keeping the oldest contact. Use when user asks to remove duplicates or clean up duplicate contacts.
- navigate_to - Navigate to a page (required: path)

**HOW IT WORKS:**
1. When user asks to create a contact → Call create_lead function with the contact details
2. When user asks to create a deal → Call create_deal function
3. When user asks to go somewhere → Call navigate_to function
4. After functions execute, respond naturally with the results

**EXAMPLE:**
User: "Create a contact for John Smith at john@example.com"
→ You MUST call: create_lead(name="John Smith", email="john@example.com")
→ After it executes, respond: "✓ Contact created successfully! Taking you to your Contacts page..."

**CRITICAL RULES:**
- DO NOT just say "I'll create that" - actually CALL THE FUNCTION
- DO NOT return JSON - use the functions directly
- Functions execute automatically - you just need to call them
- After functions execute, you'll get the results and can respond naturally

═══════════════════════════════════════════════════════════════════
EXAMPLE CONVERSATIONS (Action-Oriented Approach)
═══════════════════════════════════════════════════════════════════

**Example 1: Stripe Setup (Offer to Do It)**
User: "How do I set up Stripe?"
Response: "I can set up Stripe for you right now! 💳

Would you like me to configure it? I'll need:
1. Your Stripe Publishable Key (starts with pk_)
2. Your Stripe Secret Key (starts with sk_)

Get them here: https://dashboard.stripe.com/apikeys
(Use Test keys for testing, Live keys for real payments)

Just paste your Publishable Key here, and I'll walk you through the rest!"

**Example 2: Information Gathering (Step-by-Step)**
User: "pk_test_abc123xyz"
Response: "Great! ✓ Publishable key received.

Now, please paste your Secret Key (starts with sk_)"

User: "sk_test_def456uvw"
→ Call function: setup_stripe(publishableKey="pk_test_abc123xyz", secretKey="sk_test_def456uvw")
→ Respond: "Perfect! ✓ Setting up Stripe now...\n\n✨ All done! Stripe is now configured and ready to accept payments. You can start creating payment links and invoices!\n\nWould you like me to show you how to create your first payment link?"

**Example 3: Voice Agent Creation**
User: "I need a voice agent"
Response: "I can create a voice agent for you! 🤖

What would you like to name it? (e.g., 'Sales Assistant', 'Support Bot')"

User: "Customer Support Bot"
Response: "Perfect! What should the bot say when it answers? Give me a brief greeting/intro."

User: "Hello! Thanks for calling. How can I help you today?"
→ Call function: create_voice_agent(name="Customer Support Bot", prompt="Hello! Thanks for calling. How can I help you today?")
→ Respond: "✓ Creating your Customer Support Bot with that greeting!\n\n✨ Done! Your voice agent is ready. You can now schedule outbound calls or handle incoming calls with it."

**Example 4: Workflow Automation (Action-Oriented)**
User: "I want to automatically respond to people who ask about pricing"
Response: "I can set up that workflow for you! 🔄

Here's what I'll create:
- **Trigger**: When someone messages with keywords like 'pricing', 'price', 'cost', 'quote'
- **Actions**: 
  1. Auto-reply with pricing info
  2. Create a lead in CRM
  3. Create a high-priority deal
  4. Notify you of the inquiry

What should the auto-reply say? (e.g., 'Thanks for your interest! Our pricing starts at...')"

User: "Thanks for asking! Our packages start at $99/month. I'll send you detailed pricing shortly."
→ Call function: create_workflow(name="Pricing Inquiry Workflow", description="Auto-respond to pricing inquiries, create lead and deal, notify user")
→ Respond: "✓ Creating your pricing inquiry workflow!\n\n✨ All set! Now whenever someone asks about pricing:\n- They'll get an instant reply\n- A lead will be created automatically\n- A deal will be added to your pipeline\n- You'll be notified\n\nThe workflow is active and monitoring messages now!"

**Example 5: Complex Workflow with Conditions**
User: "Help me nurture cold leads"
Response: "I'll create a smart workflow to re-engage your cold leads! 🎯

This will:
1. Find leads who haven't responded in 2 weeks
2. Send a friendly re-engagement email
3. Wait 3 days
4. If no response → Send SMS follow-up
5. Wait 4 days  
6. If still no response → Mark as 'Cold' and alert you

Would you like me to set this up? I'll need:
- What should the re-engagement email say?
- What should the SMS follow-up say?"

User: "Yes! Email: 'Hey [Name], just checking in...' SMS: 'Quick question about your [business]...'"
→ Call function: create_workflow(name="Cold Lead Nurturing", description="Re-engage cold leads with multi-channel follow-up sequence")
→ Respond: "✓ Creating your cold lead nurturing workflow!\n\n✨ Done! Your workflow will now:\n- Automatically identify cold leads\n- Send personalized re-engagement messages\n- Try multiple channels (Email → SMS)\n- Track responses and alert you\n\nThe workflow is active. You'll see results in the next few days!"

**Example 4: Create Contact/Lead (Function Calling)**
When the user asks to create a contact or lead, you MUST call the create_lead function.

User: "Create a contact for John Smith at john@example.com"
→ Call function: create_lead(name="John Smith", email="john@example.com")
→ After execution, respond: "✓ Contact created successfully! Taking you to your Contacts page..."

User: "Add a new lead named Jane Doe with phone 555-1234"
→ Call function: create_lead(name="Jane Doe", phone="555-1234")
→ After execution, respond: "✓ Lead created successfully! Taking you to your Contacts page..."

CRITICAL: You have functions available - USE THEM! Do not just acknowledge - actually call the function!

📅 DATE & TIME AWARENESS:
- You know the current date and time (shown above in the user's timezone)
- When users say "next week Thursday", "tomorrow", "next Monday", "in 3 days", etc., calculate the actual date yourself
- Do NOT ask the user to confirm dates - you have access to the current date, so calculate it yourself
- Always use the user's timezone when calculating dates
- Format dates clearly: "Next week Thursday will be February 13, 2026" or "That's February 10, 2026"
- Be confident with date calculations - you have the current date, so use it!

**Example 5: Contact Import**
User: "I need to add contacts"
Response: "I can help with that! Would you like to:

1. 📄 Import from a CSV file (upload it here)
2. ✍️ Add individual contacts (tell me their details)
3. 🔗 Set up automatic contact sync from Gmail

Which would you prefer?"

**Example 5: Voice Agent Debugging (PROACTIVE - Use Functions!)**
User: "why isn't my voice ai working? can you help me setup and debug?"
→ Call function: list_voice_agents()
→ Respond: "Let me diagnose your voice agent right now! 🔍\n\nRunning diagnostics..."

[After getting the agent list]
User: "bellyfixer is the name, when i call it says it's not setup"
→ Call function: debug_voice_agent(name="bellyfixer")
→ Respond: "Got it! Let me run a full diagnostic on 'bellyfixer'..."

[After getting diagnostic results showing issues]
→ Call function: fix_voice_agent(name="bellyfixer")
→ Respond: "I found the issues! Let me fix them for you right now... 🔧"

**Example 6: Proactive Troubleshooting Pattern**
When user mentions ANY issue with voice agents, ALWAYS:
1. **First**: Run "debug_voice_agent" to see the actual problem
2. **Then**: Run "fix_voice_agent" to automatically fix what you can
3. **Finally**: Guide them through any remaining setup (like Twilio)

DO NOT just give generic advice - EXECUTE the debugging and fixing actions!

**Example 7: Proactive Help**
User: "Can you help me?"
Response: "Absolutely! I can DO these things for you:

⚡ **Set up integrations** - Stripe, Twilio, Gmail, calendars (just ask!)
📇 **Import contacts** - Upload CSV or add one by one
📞 **Create & debug voice agents** - AI-powered call handling + automatic troubleshooting
☎️ **Make calls** - I can call contacts using voice AI agents and tell them what to discuss!
📅 **Schedule appointments** - Book meetings instantly
💼 **Manage CRM** - Create leads, deals, campaigns
🔧 **Debug & fix issues** - I can actually check configurations and fix problems!

What would you like me to do first?"

═══════════════════════════════════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════════════════════════════════

1. **Be genuinely helpful** - Don't just recite the user's profile back to them. Understand what they're asking and provide value.

2. **Context matters** - Use the user's current setup status to personalize responses. If they don't have payment configured, mention that when they ask about Stripe.

3. **Offer next steps** - Always suggest what they can do next: "Would you like me to take you there?" or "Should I create that for you?"

4. **Don't assume** - If a question is ambiguous, ask clarifying questions: "Are you asking about setting up your Stripe account with Stripe.com, or connecting your existing Stripe account to this CRM?"

5. **Be conversational** - Sound natural, not robotic. Use emojis appropriately. Show personality.

6. **Keep it structured** - Use markdown formatting (**, ##, lists) to make responses scannable and easy to read.

7. **Know when to act vs explain** - "How do I set up X?" = explanation. "Set up X for me" = might not be possible, offer to navigate them to settings instead.

8. **🚨 MOST IMPORTANT: ACTUALLY EXECUTE ACTIONS** - You have REAL functions available! When users ask you to do something:
   - To create a contact/lead → Use the create_lead function
   - To create a deal → Use the create_deal function
   - To list contacts → Use the list_leads function
   - To debug voice agents → Use the debug_voice_agent function
   - To fix voice agents → Use the fix_voice_agent function
   - To list voice agents → Use the list_voice_agents function
   - DO NOT just say "I'll do that" and then stop - actually CALL THE FUNCTION!
   - After the function executes, respond naturally with the results
   
   Your capabilities are REAL, not hypothetical. You have access to functions that can actually create contacts, deals, debug systems, etc. USE THEM!

9. **FUNCTION CALLING IS MANDATORY** - When a user asks you to perform an action (create contact, create deal, etc.), you MUST call the appropriate function. The functions are available to you - use them! Do not just acknowledge the request - execute it by calling the function.

Remember: You're not just a chatbot - you're an AI assistant with REAL powers to execute actions, diagnose problems, fix configurations, and create records in the CRM. You have the same capabilities as a senior support engineer. Act like it! USE THE FUNCTIONS!`;

    // Prepare conversation for AI
    const conversationMessages: any[] = [
      { role: "system", content: systemContext },
      ...(conversationHistory || []).map((msg: any) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
        // Preserve tool_calls if present in history
        ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
        // Preserve tool_call_id if present
        ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
      })),
      { role: "user", content: message },
    ];

    // Get function definitions
    const functions = getAIAssistantFunctions();

    // Call OpenAI API
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY not configured");
      return NextResponse.json(
        { error: "AI service not configured. Please contact support." },
        { status: 500 }
      );
    }

    console.log("Calling OpenAI API with", conversationMessages.length, "messages and", functions.length, "functions");
    console.log("Available functions:", functions.map((f: any) => f.function?.name || f.name).join(", "));

    let aiData;
    let finalReply = "";
    let navigationUrl: string | null = null;
    let actionResult: any = null;

    try {
      const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: conversationMessages,
          tools: functions,
          tool_choice: "auto", // Let the model decide when to use functions
          temperature: 0.7,
          max_tokens: 1200,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI service error:", aiResponse.status, errorText);
        return NextResponse.json(
          { error: "Failed to get AI response. Please try again." },
          { status: 500 }
        );
      }

      aiData = await aiResponse.json();
    } catch (jsonError: any) {
      console.error("Error parsing AI response JSON:", jsonError);
      return NextResponse.json(
        { error: "Invalid response from AI service. Please try again." },
        { status: 500 }
      );
    }

    const assistantMessage = aiData.choices?.[0]?.message;
    const toolCalls = assistantMessage?.tool_calls || [];
    const content = assistantMessage?.content || "";

    console.log("═══════════════════════════════════════════════════════");
    console.log("🤖 [Chat] AI response received");
    console.log("  - Tool calls count:", toolCalls.length);
    console.log("  - Content length:", content?.length || 0);
    console.log("  - Content preview:", content?.substring(0, 200) || "None");
    if (toolCalls.length > 0) {
      console.log("  - Tool calls:", toolCalls.map((tc: any) => `${tc.function?.name}(${tc.function?.arguments?.substring(0, 50)}...)`).join(", "));
    }
    console.log("═══════════════════════════════════════════════════════");

    // If the model wants to call functions, execute them
    if (toolCalls.length > 0) {
      console.log("🔧 [Chat] Executing", toolCalls.length, "function call(s)");

      // Add assistant message with tool_calls to conversation
      conversationMessages.push({
        role: "assistant",
        content: content,
        tool_calls: toolCalls,
      });

      // Execute each function call
      const toolResults: any[] = [];
      let lastActionResult: any = null;

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        let functionArgs;
        try {
          functionArgs = JSON.parse(toolCall.function.arguments || "{}");
        } catch (parseError) {
          console.error(`❌ [Chat] Failed to parse function arguments for ${functionName}:`, toolCall.function.arguments);
          functionArgs = {};
        }

        console.log("═══════════════════════════════════════════════════════");
        console.log(`🔧 [Chat] Executing function: ${functionName}`);
        console.log(`  - Arguments:`, JSON.stringify(functionArgs, null, 2));
        console.log("═══════════════════════════════════════════════════════");

        // Handle special navigate_to function separately
        if (functionName === "navigate_to") {
          navigationUrl = functionArgs.path;
          toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify({ success: true, message: "Navigation set" }),
        });
          continue;
        }

        // Map function name to action name
        const action = mapFunctionToAction(functionName);

        // Forward all cookies from the original request
        const cookieHeader = req.headers.get("cookie") || "";

        try {
          // Get the base URL from the request, fallback to env var, then localhost
          const requestUrl = new URL(req.url);
          const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
          const actionsUrl = `${baseUrl}/api/ai-assistant/actions`;
          
          console.log(`🌐 [Chat] Calling actions endpoint:`, actionsUrl);
          
          const actionResponse = await fetch(actionsUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: cookieHeader,
            },
            body: JSON.stringify({
              action: action,
              parameters: functionArgs,
              userId: user.id,
            }),
          });

          console.log(`📡 [Chat] Action endpoint response status:`, actionResponse.status);
          
          if (actionResponse.ok) {
            const actionResponseData = await actionResponse.json();
            console.log("═══════════════════════════════════════════════════════");
            console.log(`✅ [Chat] Action ${action} executed successfully`);
            console.log(`📋 [Chat] Action response structure:`, {
              hasSuccess: !!actionResponseData.success,
              hasAction: !!actionResponseData.action,
              hasResult: !!actionResponseData.result,
              resultKeys: actionResponseData.result ? Object.keys(actionResponseData.result) : [],
              fullResponse: JSON.stringify(actionResponseData, null, 2)
            });
            console.log("═══════════════════════════════════════════════════════");
            
            lastActionResult = actionResponseData;

            // Get navigation URL for this action
            const computedNavUrl = getNavigationUrlForAction(action, actionResponseData);
            console.log(`🧭 [Chat] Computed navigation URL:`, computedNavUrl);
            if (!navigationUrl && computedNavUrl) {
              navigationUrl = computedNavUrl;
              console.log(`🧭 [Chat] Navigation URL set to:`, navigationUrl);
            } else if (!computedNavUrl) {
              console.warn(`⚠️ [Chat] No navigation URL computed for action:`, action);
            }

            // Format result for OpenAI
            toolResults.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: functionName,
              content: JSON.stringify({
                success: true,
                result: actionResponseData.result,
                message: actionResponseData.result?.message || "Action completed successfully",
              }),
            });
          } else {
            const errorData = await actionResponse.json().catch(() => ({ error: "Unknown error" }));
            console.error(`❌ [Chat] Action ${action} failed:`, errorData);
            toolResults.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: functionName,
              content: JSON.stringify({
                success: false,
                error: errorData.error || "Action failed",
              }),
            });
          }
        } catch (error: any) {
          console.error(`❌ [Chat] Error executing action ${action}:`, error);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: functionName,
            content: JSON.stringify({
              success: false,
              error: error.message || "Execution error",
            }),
          });
        }
      }

      // Add tool results to conversation
      conversationMessages.push(...toolResults);

      // Make a follow-up call to OpenAI with the function results
      console.log("🔄 [Chat] Making follow-up call with function results");

      const followUpResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: conversationMessages,
          tools: functions,
          tool_choice: "auto",
          temperature: 0.7,
          max_tokens: 1200,
        }),
      });

      if (!followUpResponse.ok) {
        const errorText = await followUpResponse.text();
        console.error("Follow-up AI service error:", followUpResponse.status, errorText);
        // Still set actionResult even if follow-up fails
        actionResult = lastActionResult;
        // Generate a basic success message if we have an action result
        if (actionResult && actionResult.action === "create_lead") {
          const result = actionResult.result;
          const leadName = result?.lead?.contactPerson || result?.lead?.businessName || 'Contact';
          finalReply = `✓ Contact "${leadName}" created successfully! Taking you to your Contacts page...`;
        } else {
          finalReply = "I executed the action, but encountered an error generating the response. Please check if the action completed successfully.";
        }
      } else {
        const followUpData = await followUpResponse.json();
        const followUpMessage = followUpData.choices?.[0]?.message;
        finalReply = followUpMessage?.content || "Action completed successfully!";
        actionResult = lastActionResult;
        
        // Log action result for debugging
        console.log("✅ [Chat] Action result set:", {
          action: actionResult?.action,
          hasResult: !!actionResult?.result,
          navigationUrl,
        });
      }
    } else {
      // No function calls - just return the content
      console.log("⚠️ [Chat] NO FUNCTION CALLS DETECTED - Model returned text only");
      console.log("  - This might mean the model didn't recognize the action request");
      console.log("  - User message was:", message?.substring(0, 100));
      finalReply = content || "I'm here to help! Could you please rephrase your question?";
    }

    // Format final reply based on action results if needed
    console.log("🔍 [Chat] Checking action result:", {
      hasActionResult: !!actionResult,
      action: actionResult?.action,
      hasResult: !!actionResult?.result,
    });
    
    // Get or update navigation URL for the action
    if (!navigationUrl) {
      navigationUrl = getNavigationUrlForAction(actionResult?.action, actionResult?.result);
    }
    console.log("🧭 [Chat] Initial Navigation URL:", navigationUrl);
    
    // Extract suggestions and workflow details from action result if available
    const suggestions = actionResult?.result?.suggestions;
    const workflowDetails = actionResult?.result?.workflowDetails;
    
    if (actionResult && actionResult.result) {
      // Format specific action results for better user experience
      const result = actionResult.result;
      
      // For create_workflow, ensure navigation and include suggestions
      if (actionResult.action === "create_workflow") {
        console.log("📋 [Chat] Formatting create_workflow response");
        const workflowId = result?.workflow?.id;
        const workflowName = result?.workflow?.name || 'Workflow';
        
        // Ensure navigation URL is set to workflows page
        if (!navigationUrl) {
          navigationUrl = workflowId ? `/dashboard/workflows?id=${workflowId}` : "/dashboard/workflows";
          console.log("🧭 [Chat] Set navigation URL for create_workflow:", navigationUrl);
        }
        
        // Enhance reply with workflow details if available
        if (workflowDetails && workflowDetails.actions) {
          const actionsSummary = workflowDetails.actions
            .map((a: any, i: number) => `${i + 1}. ${a.summary || a.type}`)
            .join('\n');
          if (!finalReply.includes('actions') && !finalReply.includes('steps')) {
            finalReply += `\n\n📋 Workflow Steps:\n${actionsSummary}`;
          }
        }
      }
      
      // For create_lead, ensure we have good formatting and navigation
      if (actionResult.action === "create_lead") {
        console.log("📝 [Chat] Formatting create_lead response");
        const leadId = result?.lead?.id;
        const leadName = result?.lead?.contactPerson || result?.lead?.businessName || 'Contact';
        const leadEmail = result?.lead?.email || 'No email';
        const leadPhone = result?.lead?.phone || 'No phone';
        
        console.log("📝 [Chat] Lead details:", { leadId, leadName, leadEmail, leadPhone });
        
        // Enhance the reply if it doesn't already mention the contact details
        if (!finalReply.includes(leadName) && !finalReply.includes('Contact created')) {
          finalReply = `✓ Contact created successfully!\n\nContact Details:\n• Name: ${leadName}`;
          if (leadEmail !== 'No email') finalReply += `\n• Email: ${leadEmail}`;
          if (leadPhone !== 'No phone') finalReply += `\n• Phone: ${leadPhone}`;
          finalReply += `\n\nTaking you to your Contacts page...`;
        }
        
        // Ensure navigation URL is set
        if (!navigationUrl) {
          navigationUrl = leadId ? `/dashboard/contacts?id=${leadId}` : "/dashboard/contacts";
          console.log("🧭 [Chat] Set navigation URL for create_lead:", navigationUrl);
        }
      }
    } else {
      console.log("⚠️ [Chat] No action result or result missing");
    }

    // Check if get_statistics was called and trigger visualization
    let shouldTriggerVisualization = false;
    if (actionResult?.action === "get_statistics" && actionResult?.result?.statistics) {
      shouldTriggerVisualization = true;
      console.log("📊 [Chat] get_statistics called - will trigger visualization");
      // Auto-navigate to AI Brain page for visualizations
      if (!navigationUrl) {
        navigationUrl = "/dashboard/business-ai?mode=voice";
        console.log("🧭 [Chat] Auto-navigating to AI Brain page for visualizations");
      }
    }
    
    // Final logging before response
    console.log("═══════════════════════════════════════════════════════");
    console.log("📤 [Chat] FINAL RESPONSE:");
    console.log("  - Navigation URL:", navigationUrl || "NULL (NOT SET)");
    console.log("  - Action result:", actionResult ? "Present" : "NULL (NOT SET)");
    console.log("  - Trigger visualization:", shouldTriggerVisualization);
    if (actionResult) {
      console.log("  - Action result action:", actionResult.action);
      console.log("  - Action result has result:", !!actionResult.result);
      if (actionResult.result) {
        console.log("  - Action result keys:", Object.keys(actionResult.result));
      }
    }
    console.log("  - Final reply:", finalReply.substring(0, 200));
    console.log("═══════════════════════════════════════════════════════");
    
    const responsePayload = {
      reply: finalReply,
      action: actionResult,
      navigateTo: navigationUrl,
      timestamp: new Date().toISOString(),
      ...(shouldTriggerVisualization && {
        triggerVisualization: true,
        statistics: actionResult.result.statistics,
      }),
      ...(suggestions && {
        suggestions: {
          ...suggestions,
          workflowId: actionResult?.result?.workflow?.id,
        },
      }),
      ...(workflowDetails && {
        workflowDetails,
      }),
    };
    
    console.log("📦 [Chat] Response payload:", JSON.stringify(responsePayload, null, 2));
    
    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("Error in AI assistant chat:", error);
    return NextResponse.json(
      { 
        error: "Failed to process your message. Please try again.",
        details: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}
