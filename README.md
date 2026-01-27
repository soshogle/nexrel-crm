
# Soshogle CRM - Complete Source Code Documentation

## 🚀 Overview

Soshogle is a full-featured, multi-tenant CRM platform inspired by GoHighLevel, built with Next.js 14, Prisma ORM, PostgreSQL, and integrated with ElevenLabs AI Voice Agents and Twilio for voice/SMS communication.

### Key Features

- ✅ **Multi-tenant Architecture** - Agency and sub-account support
- ✅ **Unified Messaging Hub** - SMS, Email, WhatsApp, Facebook, Instagram
- ✅ **AI Voice Agents** - ElevenLabs conversational AI with phone integration
- ✅ **Lead Management** - Google Places integration for lead scraping
- ✅ **Pipeline/Deals** - Visual Kanban board for sales tracking
- ✅ **Calendar & Appointments** - Google/Microsoft/Apple calendar sync
- ✅ **Campaigns** - Email and SMS campaign builder
- ✅ **Workflows** - Automation engine with triggers and conditions
- ✅ **AI Assistant** - Soshogle Agent for CRM actions and company data queries
- ✅ **Payment Integration** - Stripe, PayPal, Square support
- ✅ **Team Management** - Role-based access control
- ✅ **Analytics Dashboard** - Real-time metrics and reporting

---

## 📁 Project Structure

```
nextjs_space/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (RESTful endpoints)
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── voice-agents/         # Voice agent CRUD + auto-configure
│   │   ├── contacts/             # Contact management
│   │   ├── leads/                # Lead management
│   │   ├── deals/                # Pipeline/deals
│   │   ├── messages/             # Unified messaging
│   │   ├── campaigns/            # Campaign management
│   │   ├── workflows/            # Workflow automation
│   │   ├── appointments/         # Calendar appointments
│   │   ├── twilio/               # Twilio integration (phone, SMS)
│   │   ├── elevenlabs/           # ElevenLabs validation/setup
│   │   ├── integrations/         # Third-party integrations
│   │   ├── payments/             # Payment processing
│   │   ├── admin/                # Admin panel APIs
│   │   └── onboarding/           # Onboarding wizard
│   ├── dashboard/                # Main CRM dashboard pages
│   ├── auth/                     # Sign-in/Sign-up pages
│   ├── onboarding/               # Onboarding wizard page
│   └── page.tsx                  # Landing page
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   ├── dashboard/                # Dashboard-specific components
│   ├── voice-agents/             # Voice agent management UI
│   ├── contacts/                 # Contact management UI
│   ├── leads/                    # Lead management UI
│   ├── pipeline/                 # Pipeline board UI
│   ├── campaigns/                # Campaign builder UI
│   ├── workflows/                # Workflow builder UI
│   ├── messages/                 # Messaging UI
│   └── settings/                 # Settings pages
├── lib/                          # Core business logic
│   ├── db.ts                     # Prisma client singleton
│   ├── auth.ts                   # NextAuth configuration
│   ├── elevenlabs.ts             # ElevenLabs API client
│   ├── elevenlabs-provisioning.ts # Agent provisioning service
│   ├── twilio.ts                 # Twilio client
│   ├── workflow-engine.ts        # Workflow automation engine
│   ├── messaging/                # Messaging service abstraction
│   ├── calendar/                 # Calendar sync services
│   └── payments/                 # Payment gateway integrations
├── prisma/
│   └── schema.prisma             # Database schema (PostgreSQL)
├── public/                       # Static assets
├── types/                        # TypeScript type definitions
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── next.config.js                # Next.js configuration
└── tailwind.config.ts            # Tailwind CSS configuration
```

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** (Radix UI primitives)
- **Framer Motion** (Animations)
- **React Hook Form + Zod** (Form validation)
- **Recharts** (Analytics charts)

### Backend
- **Next.js API Routes**
- **Prisma ORM**
- **PostgreSQL**
- **NextAuth.js** (Authentication)

### Integrations
- **ElevenLabs** - AI Voice Agents
- **Twilio** - Voice/SMS
- **Stripe/PayPal/Square** - Payments
- **Google Calendar/Microsoft/Apple** - Calendar sync
- **SendGrid** - Email delivery
- **OpenAI/Abacus AI** - AI Assistant

---

## 📦 Installation & Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Yarn package manager
- ElevenLabs API key (Starter/Creator plan)
- Twilio account with purchased phone numbers
- Stripe account (optional, for payments)

### Environment Variables

Create `.env` file in `nextjs_space/` directory:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/soshogle_crm"

# NextAuth
NEXTAUTH_SECRET="your-random-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# ElevenLabs
ELEVENLABS_API_KEY="your-elevenlabs-api-key"

# Twilio
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"

# Abacus AI (for AI Assistant)
ABACUSAI_API_KEY="your-abacus-api-key"

# Stripe (optional)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Email (optional)
SENDGRID_API_KEY="your-sendgrid-api-key"
```

### Installation Steps

```bash
# 1. Navigate to project directory
cd nextjs_space

# 2. Install dependencies
yarn install

# 3. Generate Prisma client
yarn prisma generate

# 4. Run database migrations
yarn prisma migrate deploy

# 5. Seed database (optional)
yarn prisma db seed

# 6. Start development server
yarn dev
```

The app will be available at `http://localhost:3000`

---

## 🔐 Authentication System

### Technology: NextAuth.js v4

### Flow:
1. **Credentials Provider** - Email/password authentication
2. **JWT Strategy** - Session stored as JWT tokens
3. **Prisma Adapter** - User data persisted in PostgreSQL

### User Schema:
```typescript
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String    // bcrypt hashed
  name          String?
  role          Role      @default(USER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Relations
  accounts      Account[]
  sessions      Session[]
  contacts      Contact[]
  leads         Lead[]
  deals         Deal[]
  voiceAgents   VoiceAgent[]
  // ... more relations
}

enum Role {
  USER
  ADMIN
  AGENCY
  SUB_ACCOUNT
}
```

### Protected Routes:
- **Middleware** (`middleware.ts`) - Redirects unauthenticated users to `/auth/signin`
- **API Protection** - All `/api/*` routes check session via `getServerSession()`

### Implementation:
```typescript
// lib/auth.ts
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      credentials: {
        email: { type: "email" },
        password: { type: "password" }
      },
      async authorize(credentials) {
        // Validate credentials and return user
      }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    }
  }
};
```

---

## 📊 Database Schema

### Core Tables

#### Users & Authentication
- `User` - User accounts
- `Account` - OAuth accounts (NextAuth)
- `Session` - Active sessions
- `VerificationToken` - Email verification

#### CRM Core
- `Contact` - Customer contacts
- `Lead` - Business leads from Google Places
- `Deal` - Sales pipeline opportunities
- `Note` - Notes attached to contacts/deals
- `Tag` - Tags for categorization

#### Communication
- `VoiceAgent` - ElevenLabs AI voice agents
- `Call` - Call logs (inbound/outbound)
- `Message` - Unified messaging (SMS/Email/WhatsApp)
- `Conversation` - Message threads
- `Campaign` - Email/SMS campaigns

#### Automation
- `Workflow` - Automation workflows
- `WorkflowExecution` - Workflow run history

#### Appointments & Calendar
- `Appointment` - Scheduled appointments
- `CalendarConnection` - Calendar sync settings

#### Payments & Billing
- `Payment` - Payment transactions
- `Invoice` - Invoices

#### Multi-tenancy
- `Agency` - Agency accounts
- `SubAccount` - Client sub-accounts

### Relationships

```
User (1) ─── (M) Contact
User (1) ─── (M) Lead
User (1) ─── (M) VoiceAgent
User (1) ─── (M) Campaign

Contact (1) ─── (M) Message
Contact (1) ─── (M) Note
Contact (1) ─── (M) Appointment

Deal (1) ─── (M) Note
Deal (M) ─── (M) Contact (join: DealContact)

VoiceAgent (1) ─── (M) Call
```

### Example: Contact Schema
```prisma
model Contact {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  firstName       String
  lastName        String?
  email           String?
  phone           String?
  company         String?
  tags            String[]  // Array of tag names
  
  // Metadata
  source          String?   // "manual", "import", "lead_conversion"
  customFields    Json?     // Flexible data storage
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  messages        Message[]
  appointments    Appointment[]
  deals           DealContact[]
  notes           Note[]
  
  @@index([userId])
  @@index([email])
  @@index([phone])
}
```

---

## 🔌 API Endpoints

All API routes are located in `app/api/` directory.

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login (handled by NextAuth)
- `GET /api/auth/session` - Get current session

### Contacts
- `GET /api/contacts` - List contacts (with pagination, search, tags filter)
- `POST /api/contacts` - Create contact
- `GET /api/contacts/[id]` - Get contact details
- `PUT /api/contacts/[id]` - Update contact
- `DELETE /api/contacts/[id]` - Delete contact
- `POST /api/contacts/import` - Bulk import from CSV

### Leads
- `GET /api/leads` - List leads
- `POST /api/leads` - Create lead
- `GET /api/leads/[id]` - Get lead details
- `PUT /api/leads/[id]` - Update lead
- `DELETE /api/leads/[id]` - Delete lead
- `POST /api/leads/[id]/convert` - Convert lead to contact

### Deals (Pipeline)
- `GET /api/deals` - List deals
- `POST /api/deals` - Create deal
- `GET /api/deals/[id]` - Get deal details
- `PUT /api/deals/[id]` - Update deal
- `DELETE /api/deals/[id]` - Delete deal
- `PATCH /api/deals/[id]/stage` - Move deal to different stage

### Voice Agents
- `GET /api/voice-agents` - List voice agents
- `POST /api/voice-agents` - Create voice agent
- `GET /api/voice-agents/[id]` - Get agent details
- `PUT /api/voice-agents/[id]` - Update agent
- `DELETE /api/voice-agents/[id]` - Delete agent
- `POST /api/voice-agents/[id]/auto-configure` - Auto-configure agent with ElevenLabs
- `POST /api/outbound-calls` - Initiate test call

### Twilio Integration
- `GET /api/twilio/phone-numbers/owned` - List owned phone numbers
- `POST /api/twilio/phone-numbers/purchase` - Purchase new number
- `POST /api/twilio/phone-numbers/sync` - Sync numbers with ElevenLabs
- `POST /api/twilio/voice-callback` - Webhook for incoming calls

### ElevenLabs
- `GET /api/elevenlabs/validate` - Validate API key and subscription

### Messages
- `GET /api/messages` - List conversations
- `GET /api/messages/[conversationId]` - Get conversation messages
- `POST /api/messages` - Send message
- `POST /api/messages/generate` - AI-generated message

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `PUT /api/campaigns/[id]` - Update campaign
- `POST /api/campaigns/[id]/send` - Execute campaign

### Workflows
- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow
- `PUT /api/workflows/[id]` - Update workflow
- `POST /api/workflows/[id]/execute` - Manual execution

### Appointments
- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/[id]` - Update appointment
- `DELETE /api/appointments/[id]` - Delete appointment

### Calendar Sync
- `POST /api/calendar-sync` - Trigger sync
- `GET /api/calendar-connections` - List connected calendars

### Payments
- `POST /api/payments/stripe/checkout` - Create Stripe checkout session
- `POST /api/payments/stripe/webhook` - Stripe webhook handler

### Analytics
- `GET /api/analytics/overview` - Dashboard metrics
- `GET /api/analytics/leads` - Lead analytics
- `GET /api/analytics/deals` - Pipeline analytics

### AI Assistant
- `POST /api/ai-assistant` - Chat with Soshogle Agent

### Admin
- `GET /api/admin/users` - List all users (admin only)
- `DELETE /api/admin/users/[id]` - Delete user

---

## 🎨 Customer Data Structure

### Contact Object
```typescript
interface Contact {
  id: string;
  userId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  tags: string[];
  source?: string;
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Lead Object
```typescript
interface Lead {
  id: string;
  userId: string;
  businessName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  website?: string;
  rating?: number;
  category: string;
  status: "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED";
  googlePlaceId?: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Deal Object
```typescript
interface Deal {
  id: string;
  userId: string;
  title: string;
  value: number;
  stage: string; // "LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"
  probability: number;
  expectedCloseDate?: Date;
  contactIds: string[];
  notes: Note[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Voice Agent Object
```typescript
interface VoiceAgent {
  id: string;
  userId: string;
  name: string;
  elevenLabsAgentId?: string;
  phoneNumberId?: string;
  twilioPhoneNumber?: string;
  firstMessage?: string;
  systemPrompt?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🤖 AI Features

### 1. Soshogle Agent (AI Assistant)
- **Model**: Abacus AI `gpt-4.1-mini`
- **Capabilities**:
  - Answer questions about company data
  - Create/update contacts
  - Schedule appointments
  - Generate messages
  - Provide analytics insights
- **Implementation**: `app/api/ai-assistant/route.ts`
- **Context**: Injects company profile from onboarding wizard

### 2. AI Voice Agents (ElevenLabs)
- **Conversational AI** for phone calls
- **Text-to-Speech** with natural voices
- **Real-time responses** via WebSocket streaming
- **Integration**: Twilio ↔ ElevenLabs bridge
- **Implementation**: `lib/elevenlabs-provisioning.ts`

### 3. AI Message Generator
- **Generate personalized messages** for contacts
- **Context-aware** based on conversation history
- **Implementation**: `app/api/messages/generate/route.ts`

---

## 🔧 Key Services

### ElevenLabs Provisioning Service
**File**: `lib/elevenlabs-provisioning.ts`

**Methods**:
- `createAgent(options)` - Create new voice agent
- `importPhoneNumber(phoneNumber)` - Import Twilio number to ElevenLabs
- `assignPhoneToAgent(agentId, phoneNumberId)` - Link phone to agent
- `getAgent(agentId)` - Fetch agent details
- `getPhoneNumbers()` - List registered phone numbers

**Auto-Configure Flow**:
1. Check if agent exists in ElevenLabs
2. If not, create new agent with user's name
3. Check if phone number is imported
4. If not, import phone number from Twilio
5. Assign phone number to agent
6. Verify assignment with PATCH request

### Twilio Service
**File**: `lib/twilio.ts`

**Methods**:
- `initiateCall(to, from, callbackUrl)` - Start outbound call
- `sendSMS(to, from, message)` - Send SMS
- `getCallLogs()` - Fetch call history

### Workflow Engine
**File**: `lib/workflow-engine.ts`

**Features**:
- Trigger-based automation (e.g., "New contact added")
- Condition evaluation (e.g., "If tag contains 'VIP'")
- Multi-channel actions (SMS, Email, Webhook)
- Scheduled execution
- Execution history

---

## 📱 Frontend Components

### Key UI Components

#### Voice Agent Management
- `VoiceAgentsList` - Table of voice agents
- `CreateVoiceAgentDialog` - Agent creation form
- `EditVoiceAgentDialog` - Agent configuration
- `TestVoiceAgentDialog` - Test call interface
- `PurchasePhoneNumberDialog` - Twilio number purchase

#### Contact Management
- `ContactsList` - Paginated contact table with filters
- `ContactDetailDialog` - Contact details modal
- `ImportContactsDialog` - CSV import wizard
- `TagsManagerDialog` - Tag management

#### Pipeline
- `PipelineBoard` - Drag-and-drop Kanban board
- `DealCard` - Individual deal card
- `CreateDealDialog` - Deal creation form
- `DealDetailModal` - Deal details with notes

#### Messaging
- `MessagingPage` - Unified inbox UI
- `ConversationList` - Message thread list
- `MessageThread` - Chat interface
- `MessageGenerator` - AI message composition

#### Dashboard
- `DashboardOverview` - Metrics and charts
- `AIChatAssistant` - Floating AI assistant widget

---

## 🚀 Deployment

### Build & Deploy

```bash
# Build for production
yarn build

# Start production server
yarn start
```

### Environment Setup for Production

1. Set `NEXTAUTH_URL` to your production domain
2. Use production API keys for ElevenLabs, Twilio, Stripe
3. Configure PostgreSQL database with SSL
4. Set up Twilio webhooks:
   - Voice callback: `https://yourdomain.com/api/twilio/voice-callback`
   - SMS webhook: `https://yourdomain.com/api/twilio/sms-webhook`

### Hosted Deployment
Currently deployed at: **go-high-or-show-goog-8dv76n.abacusai.app**

---

## 🐛 Troubleshooting

### Voice Agent Issues

**Problem**: Test calls fail with 404
**Solution**: 
1. Verify phone number is imported to ElevenLabs
2. Check agent has `phoneNumberId` in database
3. Run auto-configure: `POST /api/voice-agents/{id}/auto-configure`

**Problem**: Agent created with name "Agent agent"
**Solution**: Fixed in latest version - name is now passed correctly

**Problem**: Duplicate agents in ElevenLabs
**Solution**: Run cleanup script: `tsx cleanup_duplicate_agents.ts`

### Database Issues

**Problem**: Prisma client outdated
**Solution**: 
```bash
yarn prisma generate
yarn prisma migrate deploy
```

### Authentication Issues

**Problem**: Session not persisting
**Solution**: Check `NEXTAUTH_SECRET` is set and `NEXTAUTH_URL` matches your domain

---

## 📚 Additional Documentation

- `ELEVENLABS_SETUP_GUIDE.md` - ElevenLabs integration guide
- `PHONE_NUMBER_SYNC_FIX.md` - Phone number import troubleshooting
- `VOICE_AGENT_PHONE_ASSIGNMENT_FIX.md` - Agent-phone linkage fixes
- `SAAS_VOICE_AI_ARCHITECTURE.md` - System architecture overview
- `TWILIO_BILLING_GUIDE.md` - Twilio cost management

---

## 📝 Scripts

**Development**:
```bash
yarn dev          # Start dev server
yarn build        # Build for production
yarn start        # Start production server
yarn lint         # Run ESLint
```

**Database**:
```bash
yarn prisma generate      # Generate Prisma client
yarn prisma migrate dev   # Run migrations (dev)
yarn prisma migrate deploy # Deploy migrations (prod)
yarn prisma db seed       # Seed database
yarn prisma studio        # Open Prisma Studio (GUI)
```

**Diagnostics**:
```bash
tsx check_agent.ts        # Check agent status
tsx check_el_agents.ts    # List ElevenLabs agents
tsx check_twilio_numbers.ts # List Twilio numbers
tsx test_call_now.ts      # Test outbound call
```

---

## 🔒 Security

- All API routes protected with session checks
- Passwords hashed with bcrypt (10 rounds)
- SQL injection prevention via Prisma ORM
- XSS protection via React's built-in escaping
- CSRF protection via NextAuth
- Rate limiting on API endpoints (planned)

---

## 🙏 Support

For issues and questions:
- Check documentation files in project root
- Review API endpoint responses for error details
- Use diagnostic scripts for troubleshooting
- Check browser console for frontend errors

---

## 📄 License

Proprietary - All rights reserved

---

**Last Updated**: November 2025
**Version**: 2.0.0
**Built by**: Soshogle Team
