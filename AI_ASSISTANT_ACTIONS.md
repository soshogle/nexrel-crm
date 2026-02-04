# AI Assistant - LLM and Available Actions

## LLM Configuration

**Model:** `gpt-4o-mini` (OpenAI)
- **Provider:** OpenAI API
- **Temperature:** 0.7
- **Max Tokens:** 1200
- **API Endpoint:** `https://api.openai.com/v1/chat/completions`
- **API Key:** `OPENAI_API_KEY` environment variable

## Available Actions

The AI assistant can perform the following actions in real-time:

### 🔧 Setup & Configuration Actions

#### 1. `setup_stripe`
**Purpose:** Configure Stripe payment processing
**Parameters:**
- `publishableKey` (string, required) - Stripe publishable key (starts with pk_)
- `secretKey` (string, required) - Stripe secret key (starts with sk_)

**What it does:** Saves Stripe API keys to user's account for payment processing

---

#### 2. `setup_square`
**Purpose:** Configure Square payment processing
**Parameters:**
- `applicationId` (string, required) - Square application ID
- `accessToken` (string, required) - Square access token

**What it does:** Configures Square integration for payments

---

#### 3. `setup_paypal`
**Purpose:** Configure PayPal payment processing
**Parameters:**
- `clientId` (string, required) - PayPal client ID
- `clientSecret` (string, required) - PayPal client secret

**What it does:** Sets up PayPal integration

---

#### 4. `setup_twilio`
**Purpose:** Configure Twilio for SMS/Voice
**Parameters:**
- `accountSid` (string, required) - Twilio account SID
- `authToken` (string, required) - Twilio auth token
- `phoneNumber` (string, optional) - Twilio phone number

**What it does:** Configures Twilio for SMS and voice calls

---

#### 5. `purchase_twilio_number`
**Purpose:** Purchase a Twilio phone number
**Parameters:** None (opens search dialog)

**What it does:** Opens phone number purchase interface

---

#### 6. `setup_quickbooks`
**Purpose:** Set up QuickBooks integration
**Parameters:** None (OAuth flow)

**What it does:** Initiates QuickBooks OAuth connection

---

#### 7. `setup_whatsapp`
**Purpose:** Configure WhatsApp Business integration
**Parameters:**
- `phoneNumber` (string, optional)
- `apiKey` (string, optional)

**What it does:** Configures WhatsApp Business API

---

#### 8. `create_voice_agent`
**Purpose:** Create a new voice AI agent
**Parameters:**
- `name` (string, required) - Agent name
- `voiceId` (string, optional) - ElevenLabs voice ID
- `prompt` (string, optional) - Agent greeting/prompt

**What it does:** Creates a new ElevenLabs voice agent for AI-powered calls

---

#### 9. `configure_auto_reply`
**Purpose:** Set up automated message replies
**Parameters:**
- `enabled` (boolean, required)
- `message` (string, required) - Auto-reply message
- `channels` (array, optional) - Channels to enable (SMS, Email, etc.)

**What it does:** Configures automatic replies for incoming messages

---

#### 10. `create_workflow`
**Purpose:** Create a basic automation workflow
**Parameters:**
- `description` (string, required) - Workflow description

**What it does:** Creates a workflow automation

---

#### 11. `create_smart_workflow`
**Purpose:** Create an AI-powered workflow with conditions
**Parameters:**
- `description` (string, required)
- `goal` (string, required) - Workflow goal
- `trigger` (string, optional) - Trigger condition
- `keywords` (array, optional) - Keywords to trigger workflow
- `actions` (array, optional) - List of actions to execute

**What it does:** Creates an intelligent workflow that responds to conditions

---

#### 12. `create_appointment`
**Purpose:** Schedule a calendar appointment
**Parameters:**
- `title` (string, required) - Appointment title
- `date` (string, required) - Date (ISO format)
- `time` (string, required) - Time
- `attendees` (array, optional) - List of attendee emails

**What it does:** Creates a calendar appointment/event

---

### 🤖 Voice Agent Management Actions

#### 13. `debug_voice_agent`
**Purpose:** Run diagnostics on a voice agent
**Parameters:**
- `name` (string, optional) - Agent name
- `agentId` (string, optional) - Agent ID

**What it does:** Checks agent configuration, API keys, and health status

---

#### 14. `fix_voice_agent`
**Purpose:** Automatically fix voice agent issues
**Parameters:**
- `name` (string, optional) - Agent name
- `agentId` (string, optional) - Agent ID

**What it does:** Attempts to automatically fix common voice agent problems

---

#### 15. `get_voice_agent`
**Purpose:** Get details about a specific voice agent
**Parameters:**
- `name` (string, optional) - Agent name
- `agentId` (string, optional) - Agent ID

**What it does:** Returns agent configuration and status

---

#### 16. `list_voice_agents`
**Purpose:** List all voice agents
**Parameters:** None

**What it does:** Returns list of all user's voice agents

---

#### 17. `update_voice_agent`
**Purpose:** Update voice agent settings
**Parameters:**
- `agentId` or `name` (required) - Agent identifier
- `prompt` (string, optional) - New prompt
- `voiceId` (string, optional) - New voice ID
- Other agent settings...

**What it does:** Updates agent configuration

---

#### 18. `assign_phone_to_voice_agent`
**Purpose:** Assign a phone number to a voice agent
**Parameters:**
- `agentId` or `name` (required) - Agent identifier
- `phoneNumber` (string, required) - Phone number to assign

**What it does:** Links a Twilio phone number to a voice agent

---

### 📇 CRM Operations - Contacts/Leads

#### 19. `create_lead`
**Purpose:** Create a new contact/lead
**Parameters:**
- `name` (string, required) - Contact name
- `email` (string, optional) - Email address
- `phone` (string, optional) - Phone number
- `company` (string, optional) - Company name
- `status` (string, optional) - Lead status (default: "NEW")

**What it does:** 
- Creates a new lead in the database
- Sets source as "AI Assistant"
- Returns created lead details
- **Navigation:** `/dashboard/contacts` (with optional `?id=leadId`)

---

#### 20. `update_lead`
**Purpose:** Update an existing lead
**Parameters:**
- `leadId` (string, required) - Lead ID
- `name` (string, optional) - New name
- `email` (string, optional) - New email
- `phone` (string, optional) - New phone
- `status` (string, optional) - New status
- Other lead fields...

**What it does:** Updates lead information in database

---

#### 21. `get_lead_details`
**Purpose:** Get detailed information about a lead
**Parameters:**
- `leadId` (string, optional) - Lead ID
- `name` (string, optional) - Lead name (alternative to leadId)

**What it does:** Returns lead details including recent notes

---

#### 22. `list_leads`
**Purpose:** List leads with filters
**Parameters:**
- `status` (string, optional) - Filter by status
- `limit` (number, optional) - Max results (default: 10, max: 50)
- `search` (string, optional) - Search query

**What it does:** Returns filtered list of leads
- **Navigation:** `/dashboard/contacts` (if leads found)

---

#### 23. `search_contacts`
**Purpose:** Search for contacts
**Parameters:**
- `query` (string, required) - Search term
- `limit` (number, optional) - Max results (default: 10, max: 20)

**What it does:** Searches leads by name, email, or company
- **Navigation:** `/dashboard/contacts` (if contacts found)

---

#### 24. `import_contacts`
**Purpose:** Import contacts from CSV
**Parameters:**
- `file` (File, required) - CSV file

**What it does:** 
- Parses CSV file
- Creates leads from CSV data
- Returns import results (success/failed counts)
- **Navigation:** `/dashboard/contacts`

---

### 💼 CRM Operations - Deals

#### 25. `create_deal`
**Purpose:** Create a new sales deal
**Parameters:**
- `title` (string, required) - Deal title
- `value` (number, optional) - Deal value
- `leadId` (string, optional) - Associated lead ID
- `stage` (string, optional) - Deal stage

**What it does:**
- Creates deal in default pipeline
- Creates default pipeline if none exists
- Sets initial stage to "Prospecting"
- **Navigation:** `/dashboard/pipeline` (with optional `?id=dealId`)

---

#### 26. `update_deal`
**Purpose:** Update an existing deal
**Parameters:**
- `dealId` (string, required) - Deal ID
- `title` (string, optional) - New title
- `value` (number, optional) - New value
- `stage` (string, optional) - New stage
- Other deal fields...

**What it does:** Updates deal information

---

#### 27. `get_deal_details`
**Purpose:** Get detailed deal information
**Parameters:**
- `dealId` (string, required) - Deal ID

**What it does:** Returns deal details including associated lead and stage

---

#### 28. `list_deals`
**Purpose:** List deals
**Parameters:**
- `limit` (number, optional) - Max results (default: 10, max: 50)

**What it does:** Returns list of deals
- **Navigation:** `/dashboard/pipeline` (if deals found)

---

### 📢 Campaign Actions

#### 29. `create_campaign`
**Purpose:** Create a marketing campaign
**Parameters:**
- `name` (string, required) - Campaign name
- `type` (string, optional) - Campaign type (default: "SMS")
- `status` (string, optional) - Status (default: "DRAFT")

**What it does:** Creates a new campaign

---

#### 30. `get_campaign_details`
**Purpose:** Get campaign details
**Parameters:**
- `campaignId` (string, required) - Campaign ID

**What it does:** Returns campaign information

---

#### 31. `list_campaigns`
**Purpose:** List all campaigns
**Parameters:**
- `status` (string, optional) - Filter by status
- `limit` (number, optional) - Max results (default: 10, max: 50)

**What it does:** Returns list of campaigns
- **Navigation:** `/dashboard/campaigns` (if campaigns found)

---

### 📊 Analytics & Reporting

#### 32. `get_statistics`
**Purpose:** Get CRM statistics
**Parameters:** None

**What it does:** Returns comprehensive CRM stats:
- Total leads, deals, campaigns, appointments, workflows
- Lead breakdown (new, qualified)
- Deal breakdown (won, total revenue)

---

#### 33. `get_recent_activity`
**Purpose:** Get recent CRM activity
**Parameters:**
- `limit` (number, optional) - Number of activities

**What it does:** Returns recent leads, deals, and campaigns

---

### 👤 Profile Management

#### 34. `update_profile`
**Purpose:** Update user profile
**Parameters:**
- `name` (string, optional)
- `email` (string, optional)
- `phone` (string, optional)
- Other profile fields...

**What it does:** Updates user profile information

---

#### 35. `update_company_profile`
**Purpose:** Update company information
**Parameters:**
- `companyName` (string, optional)
- `phone` (string, optional)
- `website` (string, optional)
- Other company fields...

**What it does:** Updates company profile

---

### 💰 QuickBooks Operations

#### 36. `create_quickbooks_invoice`
**Purpose:** Create a QuickBooks invoice
**Parameters:**
- `contactId` (string, required) - Contact/lead ID
- `amount` (number, required) - Invoice amount
- `description` (string, optional) - Invoice description
- `dueDate` (string, optional) - Due date

**What it does:** Creates invoice in QuickBooks

---

#### 37. `sync_contact_to_quickbooks`
**Purpose:** Sync a contact to QuickBooks
**Parameters:**
- `leadId` (string, required) - Lead ID

**What it does:** Creates or updates contact in QuickBooks

---

### 📱 WhatsApp Operations

#### 38. `send_whatsapp_message`
**Purpose:** Send a WhatsApp message
**Parameters:**
- `phoneNumber` (string, required) - Recipient phone number
- `message` (string, required) - Message content

**What it does:** Sends WhatsApp message via WhatsApp Business API

---

#### 39. `get_whatsapp_conversations`
**Purpose:** Get WhatsApp conversations
**Parameters:**
- `limit` (number, optional) - Max results

**What it does:** Returns list of WhatsApp conversations

---

## Action Execution Flow

1. **User sends message** → Chat API receives request
2. **LLM processes** → GPT-4o-mini generates response (may include JSON action)
3. **JSON parsing** → System extracts action from LLM response
4. **Fallback detection** → If JSON parsing fails, natural language detection attempts to identify action intent
5. **Action execution** → `/api/ai-assistant/actions` endpoint executes the action
6. **Result handling** → Action result is formatted into user-friendly message
7. **Navigation** → User is navigated to relevant page (if applicable)

## Navigation URLs

Actions automatically navigate users to:
- `/dashboard/contacts` - After creating/listing leads
- `/dashboard/pipeline` - After creating/listing deals
- `/dashboard/campaigns` - After listing campaigns
- `/dashboard/calendar` - After creating appointments
- `/dashboard/voice-agents` - After voice agent operations
- `/dashboard/workflows` - After creating workflows
- `/dashboard/settings` - After configuration actions

## Notes

- All actions require user authentication
- Actions are user-scoped (users can only access their own data)
- Actions return structured results with success/error status
- Navigation only occurs after successful action execution
- Failed actions show error messages and do not navigate
