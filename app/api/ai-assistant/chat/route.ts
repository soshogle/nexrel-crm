
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if the request contains a file (FormData) or is JSON
    const contentType = req.headers.get("content-type") || "";
    let message = "";
    let conversationHistory: any[] = [];
    let uploadedFile: File | null = null;

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
      const body = await req.json();
      message = body.message;
      conversationHistory = body.conversationHistory || [];
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

    const systemContext = `You are Soshogle AI, a proactive AI assistant that DOES THINGS for users rather than just explaining how. Your core principle: Always offer to execute tasks for users, not just give instructions.

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

**TYPE 2: JSON WITH NAVIGATION ONLY**
Use when:
- User wants to go somewhere: "take me to settings", "show me contacts"
- User is ready to configure after you've explained: "yes, take me there"

Format: {"message": "friendly text", "navigateTo": "/dashboard/page"}

**TYPE 3: JSON WITH ACTION + NAVIGATION**
Use when:
- User wants you to DO something: "create a lead", "import contacts", "add a deal"
- Executing CRM operations
- **🚨 CRITICAL**: User mentions voice AI issues, debugging, or fixing ("fix my voice ai", "voice agent not working", "debug voice agent")

Format: {"message": "text", "action": "action_type", "parameters": {...}, "navigateTo": "/dashboard/page"}

**🚨 CRITICAL JSON FORMAT RULES:**
1. Your ENTIRE response must be ONLY the JSON object - no extra text before or after
2. Do NOT say "Here's the JSON:" or "I'll execute:" - just output the JSON
3. Example of CORRECT response to "can you help me fix my voice ai":
   {"message": "Let me check your voice agents and run diagnostics! 🔍", "action": "list_voice_agents", "parameters": {}}
4. Example of WRONG response (DO NOT DO THIS):
   "I'll help you fix your voice ai. Let me check your upstream configuration..."

═══════════════════════════════════════════════════════════════════
AVAILABLE ACTIONS (For JSON responses)
═══════════════════════════════════════════════════════════════════

**SETUP & CONFIGURATION ACTIONS:**
- "setup_stripe" - Configure Stripe (params: publishableKey, secretKey)
- "setup_square" - Configure Square (params: applicationId, accessToken)
- "setup_paypal" - Configure PayPal (params: clientId, clientSecret)
- "setup_twilio" - Configure Twilio (params: accountSid, authToken, phoneNumber)
- "purchase_twilio_number" - Buy Twilio phone number (params: none - opens search dialog)
- "setup_gmail" - Guide Gmail OAuth (params: none - OAuth flow)
- "setup_calendar" - Guide calendar connection (params: provider)
- "create_voice_agent" - Create voice agent (params: name, voiceId, prompt)
- "configure_auto_reply" - Set up auto-replies (params: enabled, message, channels)
- "create_workflow" - Create automation workflow (params: description)
- "create_smart_workflow" - Create AI-powered workflow with conditions (params: description, goal)

**VOICE AGENT DEBUGGING & MANAGEMENT:**
- "debug_voice_agent" - Run diagnostics on voice agent (params: name or agentId) - **USE THIS FIRST when troubleshooting**
- "fix_voice_agent" - Automatically fix voice agent issues (params: name or agentId)
- "get_voice_agent" - Get voice agent details (params: name or agentId)
- "list_voice_agents" - List all voice agents (params: none)
- "update_voice_agent" - Update voice agent settings (params: agentId or name, plus fields to update)
- "assign_phone_to_voice_agent" - Assign phone number to existing voice agent (params: agentId or name, phoneNumber)

**CRM OPERATIONS:**
- "create_lead" - Create new lead/contact (params: name, email?, phone?, company?)
- "import_contacts" - Import from CSV (params: file)
- "create_deal" - Create deal (params: title, value?, leadId?)
- "create_campaign" - Create campaign (params: name, type?, content?)
- "search_contacts" - Search contacts (params: query)
- "update_company_profile" - Update company info (params: companyName?, phone?, website?)
- "create_appointment" - Schedule appointment (params: title, date, time, attendees?)

**ANALYTICS:**
- "get_statistics" - Show CRM stats (params: none)
- "list_leads" - Show leads (params: status?, limit?)
- "list_deals" - Show deals (params: limit?)
- "list_campaigns" - Show campaigns (params: limit?)

═══════════════════════════════════════════════════════════════════
NAVIGATION URLS
═══════════════════════════════════════════════════════════════════

- "/dashboard/contacts" - Contacts/leads page
- "/dashboard/pipeline" - Deals/sales pipeline
- "/dashboard/campaigns" - Marketing campaigns
- "/dashboard/calendar" - Appointments/calendar
- "/dashboard/analytics" - Statistics/reports
- "/dashboard/messages" - Conversations/messaging
- "/dashboard/workflows" - Automation/workflows
- "/dashboard/voice-agents" - Voice agents/calls
- "/dashboard/settings" - Settings/configuration
- "/dashboard/team" - Team members/roles
- "/onboarding" - Setup wizard (for complete CRM setup)

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
Response: {"message": "Perfect! ✓ Setting up Stripe now...\n\n✨ All done! Stripe is now configured and ready to accept payments. You can start creating payment links and invoices!\n\nWould you like me to show you how to create your first payment link?", "action": "setup_stripe", "parameters": {"publishableKey": "pk_test_abc123xyz", "secretKey": "sk_test_def456uvw"}, "navigateTo": "/dashboard/settings"}

**Example 3: Voice Agent Creation**
User: "I need a voice agent"
Response: "I can create a voice agent for you! 🤖

What would you like to name it? (e.g., 'Sales Assistant', 'Support Bot')"

User: "Customer Support Bot"
Response: "Perfect! What should the bot say when it answers? Give me a brief greeting/intro."

User: "Hello! Thanks for calling. How can I help you today?"
Response: {"message": "✓ Creating your Customer Support Bot with that greeting!\n\n✨ Done! Your voice agent is ready. You can now schedule outbound calls or handle incoming calls with it.", "action": "create_voice_agent", "parameters": {"name": "Customer Support Bot", "prompt": "Hello! Thanks for calling. How can I help you today?"}, "navigateTo": "/dashboard/voice-agents"}

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
Response: {"message": "✓ Creating your pricing inquiry workflow!\n\n✨ All set! Now whenever someone asks about pricing:\n- They'll get an instant reply\n- A lead will be created automatically\n- A deal will be added to your pipeline\n- You'll be notified\n\nThe workflow is active and monitoring messages now!", "action": "create_smart_workflow", "parameters": {"description": "Auto-respond to pricing inquiries, create lead and deal, notify user", "goal": "Convert pricing inquiries to sales opportunities", "keywords": ["pricing", "price", "cost", "quote", "how much"], "autoReply": "Thanks for asking! Our packages start at $99/month. I'll send you detailed pricing shortly."}, "navigateTo": "/dashboard/workflows"}

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
Response: {"message": "✓ Creating your cold lead nurturing workflow!\n\n✨ Done! Your workflow will now:\n- Automatically identify cold leads\n- Send personalized re-engagement messages\n- Try multiple channels (Email → SMS)\n- Track responses and alert you\n\nThe workflow is active. You'll see results in the next few days!", "action": "create_smart_workflow", "parameters": {"description": "Re-engage cold leads with multi-channel follow-up sequence", "goal": "Revive inactive leads", "trigger": "lead_no_response_14_days", "actions": ["send_email", "wait_3_days", "send_sms_if_no_response", "wait_4_days", "mark_cold_if_no_response"]}, "navigateTo": "/dashboard/workflows"}

**Example 4: Contact Import**
User: "I need to add contacts"
Response: "I can help with that! Would you like to:

1. 📄 Import from a CSV file (upload it here)
2. ✍️ Add individual contacts (tell me their details)
3. 🔗 Set up automatic contact sync from Gmail

Which would you prefer?"

**Example 5: Voice Agent Debugging (PROACTIVE - This is your new superpower!)**
User: "why isn't my voice ai working? can you help me setup and debug?"
Response: {"message": "Let me diagnose your voice agent right now! 🔍\n\nRunning diagnostics on your voice agents...", "action": "list_voice_agents", "parameters": {}}

[After getting the agent list]
User: "bellyfixer is the name, when i call it says it's not setup"
Response: {"message": "Got it! Let me run a full diagnostic on 'bellyfixer' to see exactly what's wrong... 🔍", "action": "debug_voice_agent", "parameters": {"name": "bellyfixer"}}

[After getting diagnostic results showing issues]
Response: {"message": "I found the issues! Let me fix them for you right now... 🔧", "action": "fix_voice_agent", "parameters": {"name": "bellyfixer"}}

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

8. **🚨 MOST IMPORTANT: ACTUALLY EXECUTE ACTIONS** - You have debugging and diagnostic capabilities! When users report issues:
   - Run "debug_voice_agent" to check configuration
   - Run "fix_voice_agent" to automatically fix issues
   - Run "list_voice_agents" to see what they have
   - DO NOT just say "I'll check" and then stop - actually execute the action!
   - Show them the diagnostic reports and fixes applied
   
   Your capabilities are REAL, not hypothetical. Use them!

Remember: You're not just a chatbot - you're an AI assistant with REAL powers to diagnose problems, fix configurations, and execute actions. You have the same capabilities as a senior support engineer. Act like it!`;

    // Prepare conversation for AI
    const conversationMessages = [
      { role: "system", content: systemContext },
      ...(conversationHistory || []).map((msg: any) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    // Call Abacus AI API
    const apiKey = process.env.ABACUSAI_API_KEY;
    if (!apiKey) {
      console.error("ABACUSAI_API_KEY not configured");
      return NextResponse.json(
        { error: "AI service not configured. Please contact support." },
        { status: 500 }
      );
    }

    console.log("Calling Abacus AI API with", conversationMessages.length, "messages");

    let aiResponse;
    try {
      aiResponse = await fetch("https://apps.abacus.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: conversationMessages,
          temperature: 0.7,
          max_tokens: 1200, // Increased for more detailed, helpful responses
        }),
      });
    } catch (fetchError: any) {
      console.error("Fetch error calling AI API:", fetchError);
      return NextResponse.json(
        { error: "Network error connecting to AI service. Please try again." },
        { status: 500 }
      );
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI service error:", aiResponse.status, errorText);
      return NextResponse.json(
        { error: "Failed to get AI response. Please try again." },
        { status: 500 }
      );
    }

    let aiData;
    try {
      aiData = await aiResponse.json();
    } catch (jsonError: any) {
      console.error("Error parsing AI response JSON:", jsonError);
      return NextResponse.json(
        { error: "Invalid response from AI service. Please try again." },
        { status: 500 }
      );
    }

    const reply = aiData.choices?.[0]?.message?.content || "I'm here to help! Could you please rephrase your question?";

    console.log("AI response received successfully");
    console.log("AI reply:", reply);

    // Check if the response contains an action request (JSON format)
    let actionResult = null;
    let finalReply = reply;
    let navigationUrl = null;

    try {
      // Try to parse the response as JSON to detect action requests OR navigation-only responses
      // Match JSON with either "action" OR "navigateTo" fields
      const jsonMatch = reply.match(/\{[\s\S]*(?:"action"|"navigateTo")[\s\S]*\}/);
      console.log("JSON match found:", jsonMatch ? "YES" : "NO");
      if (jsonMatch) {
        console.log("Matched JSON:", jsonMatch[0]);
        const actionData = JSON.parse(jsonMatch[0]);
        console.log("Parsed action data:", JSON.stringify(actionData, null, 2));
        
        // Extract navigation URL if present
        if (actionData.navigateTo) {
          navigationUrl = actionData.navigateTo;
        }
        
        // Handle navigation-only responses (no action, just message + navigateTo)
        if (actionData.message && actionData.navigateTo && !actionData.action) {
          // This is a navigation-only response (e.g., "take me to setup wizard")
          finalReply = actionData.message;
          console.log("Navigation-only response detected:", actionData.message, "->", actionData.navigateTo);
        } else if (actionData.action && actionData.message) {
          // Execute the action
          console.log("Executing action:", actionData.action, "with params:", actionData.parameters);
          
          // Forward all cookies from the original request
          const cookieHeader = req.headers.get("cookie") || "";
          
          const actionResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai-assistant/actions`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Cookie": cookieHeader
            },
            body: JSON.stringify({
              action: actionData.action,
              parameters: actionData.parameters || {},
              userId: user.id,
            }),
          });

          console.log("Action response status:", actionResponse.status);

          if (actionResponse.ok) {
            const actionResponseData = await actionResponse.json();
            console.log("Action result:", JSON.stringify(actionResponseData, null, 2));
            actionResult = actionResponseData;
            
            // Format the final reply with action results
            if (actionData.action === "import_contacts") {
              finalReply = `${actionData.message}\n\n✨ **Two ways to import contacts:**\n\n**Option 1: Upload directly here (Recommended)**\n1. Click the paperclip (📎) button below\n2. Select your CSV file\n3. Click send - I'll handle the rest!\n\n**Option 2: Manual import**\n1. Go to the Contacts page (click "Contacts" in sidebar)\n2. Click the "Import Contacts" button at the top\n3. Upload a CSV file with your contact data\n4. Review and confirm\n\n💡 **CSV Format Tips:**\n- **Required column** (at least one of these): businessName, business name, company, company name, clinic, clinic name, organization, or name\n- **Optional columns**: contactPerson, contact person, email, phone, address, city, state, zipCode, country, website, businessCategory, contactType\n- **Supported formats**: Standard CSV with proper quoting for fields containing commas\n- **Maximum capacity**: Up to 5,000 contacts per file\n- **Example**: "Company Name","John Doe","john@example.com","555-1234"\n- **Note**: Column names are case-insensitive and spaces/underscores are handled automatically\n\nYou can also create contacts individually by telling me: "Create a lead for Jane Smith at jane@example.com"`;
            } else if (actionData.action === "create_lead") {
              finalReply = `${actionData.message}\n\n${actionResponseData.result?.message || 'Lead created successfully!'}\n\n📋 **Lead Details:**\n${actionResponseData.result?.lead ? Object.entries(actionResponseData.result.lead).map(([key, val]) => `- ${key}: ${val || 'Not provided'}`).join('\n') : 'Details not available'}`;
            } else if (actionData.action === "list_leads") {
              const leads = actionResponseData.result?.leads || [];
              if (leads.length > 0) {
                // Don't list all leads in chat - navigate to page instead
                finalReply = `${actionData.message}\n\n✨ Opening your Contacts page where you can see all your leads, filter by status, and manage your contacts!`;
              } else {
                finalReply = `${actionData.message}\n\n📋 You don't have any leads yet. Would you like me to help you create one or import contacts?`;
              }
            } else if (actionData.action === "create_deal") {
              finalReply = `${actionData.message}\n\n${actionResponseData.result?.message || 'Deal created successfully!'}\n\n💼 **Deal Details:**\n${actionResponseData.result?.deal ? Object.entries(actionResponseData.result.deal).map(([key, val]) => `- ${key}: ${val}`).join('\n') : 'Details not available'}`;
            } else if (actionData.action === "list_deals") {
              const deals = actionResponseData.result?.deals || [];
              if (deals.length > 0) {
                // Don't list all deals in chat - navigate to page instead
                finalReply = `${actionData.message}\n\n✨ Opening your Pipeline page where you can see all your deals, track progress, and manage your sales pipeline!`;
              } else {
                finalReply = `${actionData.message}\n\n💼 You don't have any deals yet. Would you like me to help you create one?`;
              }
            } else if (actionData.action === "get_statistics") {
              const stats = actionResponseData.result;
              finalReply = `${actionData.message}\n\n📊 **Your CRM Statistics:**\n\n**Overview:**\n- Total Leads: ${stats.overview.totalLeads}\n- Total Deals: ${stats.overview.totalDeals}\n- Total Campaigns: ${stats.overview.totalCampaigns}\n- Total Appointments: ${stats.overview.totalAppointments}\n- Total Workflows: ${stats.overview.totalWorkflows}\n\n**Leads:**\n- New: ${stats.leads.new}\n- Qualified: ${stats.leads.qualified}\n\n**Deals:**\n- Won: ${stats.deals.won}\n- Total Revenue: $${stats.deals.totalRevenue}`;
            } else if (actionData.action === "search_contacts") {
              const contacts = actionResponseData.result?.contacts || [];
              if (contacts.length > 0) {
                // Navigate to contacts page instead of listing results
                finalReply = `${actionData.message}\n\n✨ Opening your Contacts page where you can see ${contacts.length} matching ${contacts.length === 1 ? 'contact' : 'contacts'} and perform advanced searches!`;
              } else {
                finalReply = `${actionData.message}\n\n🔍 No contacts found matching your search.`;
              }
            } else if (actionData.action === "list_campaigns") {
              const campaigns = actionResponseData.result?.campaigns || [];
              if (campaigns.length > 0) {
                // Navigate to campaigns page instead of listing
                finalReply = `${actionData.message}\n\n✨ Opening your Campaigns page where you can see all your campaigns, track performance, and create new ones!`;
              } else {
                finalReply = `${actionData.message}\n\n📢 You don't have any campaigns yet. Would you like me to help you create one?`;
              }
            } else if (actionData.action === "debug_voice_agent") {
              // Display diagnostic report
              const result = actionResponseData.result;
              if (result.success && result.diagnosticReport) {
                finalReply = `${actionData.message}\n\n${result.diagnosticReport}`;
                
                // If there are fixable issues, suggest auto-fix
                if (!result.isHealthy && result.canAutoFix) {
                  finalReply += `\n\n💡 **Good news!** I can automatically fix most of these issues for you. Would you like me to run the auto-fix now?`;
                }
              } else if (result.error) {
                finalReply = `${actionData.message}\n\n⚠️ ${result.error || result.message}`;
              } else {
                finalReply = `${actionData.message}\n\n✅ Diagnostic check completed.`;
              }
            } else if (actionData.action === "fix_voice_agent") {
              // Display fix results
              const result = actionResponseData.result;
              if (result.success) {
                finalReply = `${actionData.message}\n\n${result.message || '✅ Voice agent fixed!'}`;
              } else {
                finalReply = `${actionData.message}\n\n⚠️ ${result.error || result.message || 'Failed to fix voice agent'}`;
              }
            } else if (actionData.action === "list_voice_agents") {
              // Display voice agents list
              console.log("list_voice_agents action result:", JSON.stringify(actionResponseData, null, 2));
              const result = actionResponseData.result;
              const agents = result?.agents || [];
              console.log("Agents found:", agents.length);
              
              if (agents.length > 0) {
                finalReply = `${actionData.message}\n\n📞 **Your Voice Agents:**\n\n`;
                agents.forEach((agent: any, index: number) => {
                  console.log(`Formatting agent ${index + 1}:`, agent.name);
                  finalReply += `${index + 1}. **${agent.name}**\n`;
                  finalReply += `   - Type: ${agent.type}\n`;
                  finalReply += `   - Status: ${agent.status}\n`;
                  finalReply += `   - Phone: ${agent.phone || 'Not set'}\n`;
                  if (agent.businessName) {
                    finalReply += `   - Business: ${agent.businessName}\n`;
                  }
                  finalReply += `\n`;
                });
                finalReply += `💡 To debug any agent, just ask me: "Debug the ${agents[0].name} agent"`;
                console.log("Final reply length:", finalReply.length);
              } else {
                finalReply = `${actionData.message}\n\n📞 You don't have any voice agents yet. Would you like me to help you create one?`;
              }
            } else if (actionData.action === "get_voice_agent") {
              // Display voice agent details
              const result = actionResponseData.result;
              if (result?.agent) {
                const agent = result.agent;
                finalReply = `${actionData.message}\n\n📞 **Voice Agent Details: ${agent.name}**\n\n`;
                finalReply += `**Configuration:**\n`;
                finalReply += `- Type: ${agent.type}\n`;
                finalReply += `- Status: ${agent.status}\n`;
                finalReply += `- Industry: ${agent.industry || 'Not set'}\n`;
                finalReply += `- Phone: ${agent.phone || 'Not set'}\n`;
                finalReply += `- Voice: ${agent.voiceId || 'Not set'}\n`;
                if (agent.businessName) {
                  finalReply += `- Business: ${agent.businessName}\n`;
                }
                if (agent.greetingMessage) {
                  finalReply += `\n**Greeting Message:**\n"${agent.greetingMessage}"\n`;
                }
                finalReply += `\n💡 Need to debug this agent? Ask me: "Debug ${agent.name}"`;
              } else {
                finalReply = `${actionData.message}\n\n⚠️ Voice agent not found.`;
              }
            } else if (actionData.action === "setup_twilio") {
              // Twilio setup complete - navigate to voice agents page
              const result = actionResponseData.result;
              finalReply = `${actionData.message}\n\n${result?.message || '✅ Twilio configured successfully!'}\n\n💡 **Next Steps:**\n`;
              if (result?.nextSteps && Array.isArray(result.nextSteps)) {
                result.nextSteps.forEach((step: string) => {
                  finalReply += `- ${step}\n`;
                });
              }
              finalReply += `\n✨ Let's go to your Voice Agents page to create your first voice agent!`;
              navigationUrl = "/dashboard/voice-agents";
            } else if (actionData.action === "purchase_twilio_number") {
              // Phone number purchase - show UI to search and buy
              const result = actionResponseData.result;
              finalReply = `${actionData.message}\n\n${result?.message || '📞 Opening phone number search!'}\n\n💡 **How it works:**\n`;
              finalReply += `1. Search for available numbers by area code or location\n`;
              finalReply += `2. Select your preferred number\n`;
              finalReply += `3. Purchase with one click\n`;
              finalReply += `4. It's automatically configured for your voice agents!\n\n`;
              finalReply += `✨ The number will be ready to use immediately for calls and SMS!`;
              // Special flag to trigger UI dialog
              navigationUrl = "/dashboard/voice-agents?action=purchase-number";
            } else if (actionData.action === "setup_stripe") {
              // Stripe setup complete - navigate to settings
              const result = actionResponseData.result;
              finalReply = `${actionData.message}\n\n${result?.message || '✅ Stripe configured successfully!'}\n\n💳 **Payment Provider:** ${result?.provider || 'Stripe'}\n`;
              if (result?.mode) {
                finalReply += `**Mode:** ${result.mode}\n\n`;
              }
              finalReply += `💡 **What you can do now:**\n`;
              if (result?.nextSteps && Array.isArray(result.nextSteps)) {
                result.nextSteps.forEach((step: string) => {
                  finalReply += `- ${step}\n`;
                });
              }
              finalReply += `\n✨ Your payment settings have been saved!`;
              navigationUrl = "/dashboard/settings";
            } else if (actionData.action === "setup_square") {
              // Square setup complete - navigate to settings
              const result = actionResponseData.result;
              finalReply = `${actionData.message}\n\n${result?.message || '✅ Square configured successfully!'}\n\n💳 **Payment Provider:** ${result?.provider || 'Square'}\n\n💡 **What you can do now:**\n`;
              if (result?.nextSteps && Array.isArray(result.nextSteps)) {
                result.nextSteps.forEach((step: string) => {
                  finalReply += `- ${step}\n`;
                });
              }
              finalReply += `\n✨ Your payment settings have been saved!`;
              navigationUrl = "/dashboard/settings";
            } else if (actionData.action === "setup_paypal") {
              // PayPal setup complete - navigate to settings
              const result = actionResponseData.result;
              finalReply = `${actionData.message}\n\n${result?.message || '✅ PayPal configured successfully!'}\n\n💳 **Payment Provider:** ${result?.provider || 'PayPal'}\n\n💡 **What you can do now:**\n`;
              if (result?.nextSteps && Array.isArray(result.nextSteps)) {
                result.nextSteps.forEach((step: string) => {
                  finalReply += `- ${step}\n`;
                });
              }
              finalReply += `\n✨ Your payment settings have been saved!`;
              navigationUrl = "/dashboard/settings";
            } else if (actionData.action === "create_voice_agent") {
              // Voice agent created - navigate to voice agents page
              const result = actionResponseData.result;
              finalReply = `${actionData.message}\n\n${result?.message || '✅ Voice agent created successfully!'}\n\n`;
              if (result?.agent) {
                finalReply += `📞 **Agent Details:**\n`;
                finalReply += `- Name: ${result.agent.name}\n`;
                finalReply += `- Status: ${result.agent.status}\n`;
                finalReply += `\n`;
              }
              finalReply += `💡 **What you can do now:**\n`;
              if (result?.nextSteps && Array.isArray(result.nextSteps)) {
                result.nextSteps.forEach((step: string) => {
                  finalReply += `- ${step}\n`;
                });
              }
              finalReply += `\n✨ Let's go to your Voice Agents page to manage your new agent!`;
              navigationUrl = "/dashboard/voice-agents";
            } else if (actionData.action === "assign_phone_to_voice_agent") {
              // Phone number assigned to voice agent
              const result = actionResponseData.result;
              finalReply = `${actionData.message}\n\n${result?.message || '✅ Phone number assigned successfully!'}\n\n`;
              if (result?.agent) {
                finalReply += `📞 **Updated Agent:**\n`;
                finalReply += `- Name: ${result.agent.name}\n`;
                finalReply += `- Phone Number: ${result.agent.phoneNumber || 'Not set'}\n`;
                finalReply += `- Status: ${result.agent.status}\n`;
                finalReply += `\n`;
              }
              finalReply += `💡 **Next Steps:**\n`;
              finalReply += `- Your voice agent can now receive calls!\n`;
              finalReply += `- Test the agent by calling the number\n`;
              finalReply += `- Schedule outbound calls to reach customers\n`;
              finalReply += `\n✨ Your voice agent is ready to go!`;
              navigationUrl = "/dashboard/voice-agents";
            } else if (actionData.action === "create_workflow" || actionData.action === "create_smart_workflow") {
              // Workflow created - navigate to workflows page
              const result = actionResponseData.result;
              finalReply = `${actionData.message}\n\n${result?.message || '✅ Workflow created successfully!'}\n\n`;
              if (result?.workflow) {
                finalReply += `⚡ **Workflow Details:**\n`;
                finalReply += `- Name: ${result.workflow.name}\n`;
                if (result.workflow.description) {
                  finalReply += `- Description: ${result.workflow.description}\n`;
                }
                finalReply += `- Status: ${result.workflow.status}\n`;
                finalReply += `\n`;
              }
              finalReply += `✨ Let's go to your Workflows page to see your new automation!`;
              navigationUrl = "/dashboard/workflows";
            } else if (actionData.action === "create_appointment") {
              // Appointment created - navigate to calendar
              const result = actionResponseData.result;
              finalReply = `${actionData.message}\n\n${result?.message || '✅ Appointment scheduled successfully!'}\n\n`;
              if (result?.appointment) {
                finalReply += `📅 **Appointment Details:**\n`;
                finalReply += `- Customer: ${result.appointment.customerName}\n`;
                if (result.appointment.date) {
                  finalReply += `- Date: ${result.appointment.date}\n`;
                }
                if (result.appointment.time) {
                  finalReply += `- Time: ${result.appointment.time}\n`;
                }
                finalReply += `\n`;
              }
              finalReply += `✨ Let's go to your Calendar to view the appointment!`;
              navigationUrl = "/dashboard/calendar";
            } else {
              // Generic success message
              finalReply = `${actionData.message}\n\n✅ Action completed successfully!`;
            }
          } else {
            // Action failed - get error details
            let errorDetails = "Unknown error";
            try {
              const errorData = await actionResponse.json();
              errorDetails = errorData.error || errorData.details || errorDetails;
              console.error("Action failed:", errorData);
            } catch (e) {
              const errorText = await actionResponse.text();
              console.error("Action failed with status:", actionResponse.status, errorText);
              errorDetails = errorText || `Status ${actionResponse.status}`;
            }
            
            finalReply = `${actionData.message}\n\n⚠️ I encountered an issue while trying to execute that action: ${errorDetails}\n\nPlease try again or let me know if you need help!`;
          }
        }
      }
    } catch (parseError: any) {
      // Not a JSON action request, just return the regular reply
      console.log("Not an action request, returning normal reply:", parseError.message);
    }

    return NextResponse.json({
      reply: finalReply,
      action: actionResult,
      navigateTo: navigationUrl,
      timestamp: new Date().toISOString(),
    });
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
