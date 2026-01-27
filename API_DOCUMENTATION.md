
# Soshogle CRM - Complete API Documentation

## 📡 Base URL

**Development**: `http://localhost:3000`  
**Production**: `https://go-high-or-show-goog-8dv76n.abacusai.app`

## 🔐 Authentication

All API endpoints (except `/api/auth/*` and `/api/signup`) require authentication via NextAuth session cookies.

**Headers**:
- Cookie: `next-auth.session-token=<token>`

**Unauthenticated Response**:
```json
{
  "error": "Unauthorized",
  "status": 401
}
```

---

## 👤 Authentication Endpoints

### Sign Up
```http
POST /api/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "businessName": "Acme Corp",
  "industry": "Technology"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "userId": "clx1234567890",
  "message": "Account created successfully"
}
```

**Error** (400 Bad Request):
```json
{
  "error": "Email already exists"
}
```

---

### Sign In
```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```
(Handled by NextAuth - redirects to `/dashboard` on success)

---

### Get Session
```http
GET /api/auth/session
```

**Response** (200 OK):
```json
{
  "user": {
    "id": "clx1234567890",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "USER"
  },
  "expires": "2025-12-31T23:59:59.999Z"
}
```

---

## 👥 Contacts API

### List Contacts
```http
GET /api/contacts?page=1&limit=20&search=john&tags=VIP,Customer
```

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20)
- `search` (optional): Search by name, email, or phone
- `tags` (optional): Comma-separated tag names

**Response** (200 OK):
```json
{
  "contacts": [
    {
      "id": "clx9876543210",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com",
      "phone": "+15551234567",
      "company": "Tech Inc",
      "tags": ["VIP", "Customer"],
      "source": "import",
      "createdAt": "2025-10-15T10:30:00.000Z",
      "updatedAt": "2025-11-13T14:20:00.000Z"
    }
  ],
  "total": 147,
  "page": 1,
  "totalPages": 8
}
```

---

### Create Contact
```http
POST /api/contacts
Content-Type: application/json

{
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice@example.com",
  "phone": "+15559876543",
  "company": "Design Studio",
  "tags": ["Prospect"],
  "customFields": {
    "birthday": "1990-05-20",
    "preferredContact": "email"
  }
}
```

**Response** (201 Created):
```json
{
  "id": "clx1111111111",
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice@example.com",
  "phone": "+15559876543",
  "company": "Design Studio",
  "tags": ["Prospect"],
  "customFields": {
    "birthday": "1990-05-20",
    "preferredContact": "email"
  },
  "userId": "clx1234567890",
  "createdAt": "2025-11-13T15:00:00.000Z",
  "updatedAt": "2025-11-13T15:00:00.000Z"
}
```

---

### Get Contact
```http
GET /api/contacts/clx1111111111
```

**Response** (200 OK):
```json
{
  "id": "clx1111111111",
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice@example.com",
  "phone": "+15559876543",
  "company": "Design Studio",
  "tags": ["Prospect"],
  "messages": [
    {
      "id": "msg123",
      "content": "Hello Alice!",
      "direction": "OUTBOUND",
      "createdAt": "2025-11-13T14:00:00.000Z"
    }
  ],
  "appointments": [],
  "notes": []
}
```

---

### Update Contact
```http
PUT /api/contacts/clx1111111111
Content-Type: application/json

{
  "tags": ["Prospect", "Hot Lead"],
  "customFields": {
    "birthday": "1990-05-20",
    "preferredContact": "phone"
  }
}
```

**Response** (200 OK):
```json
{
  "id": "clx1111111111",
  "firstName": "Alice",
  "tags": ["Prospect", "Hot Lead"],
  "updatedAt": "2025-11-13T16:00:00.000Z"
}
```

---

### Delete Contact
```http
DELETE /api/contacts/clx1111111111
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Contact deleted"
}
```

---

### Import Contacts (CSV)
```http
POST /api/contacts/import
Content-Type: multipart/form-data

file: contacts.csv
tagAll: VIP
```

**CSV Format**:
```csv
firstName,lastName,email,phone,company
John,Doe,john@example.com,+15551234567,Acme Corp
Jane,Smith,jane@example.com,+15559876543,Tech Inc
```

**Response** (200 OK):
```json
{
  "success": true,
  "imported": 150,
  "failed": 3,
  "errors": [
    {
      "row": 25,
      "error": "Invalid email format"
    }
  ]
}
```

---

## 🎯 Leads API

### List Leads
```http
GET /api/leads?status=NEW&category=dentist&city=Miami
```

**Query Parameters**:
- `status` (optional): NEW | CONTACTED | QUALIFIED | CONVERTED
- `category` (optional): Business category
- `city` (optional): City filter

**Response** (200 OK):
```json
{
  "leads": [
    {
      "id": "lead123",
      "businessName": "Sunshine Dental",
      "address": "123 Ocean Dr",
      "city": "Miami",
      "state": "FL",
      "zipCode": "33139",
      "phone": "+13055551234",
      "website": "https://sunshinedental.com",
      "rating": 4.5,
      "category": "dentist",
      "status": "NEW",
      "googlePlaceId": "ChIJ...",
      "source": "google_places",
      "createdAt": "2025-11-13T10:00:00.000Z"
    }
  ],
  "total": 42
}
```

---

### Create Lead
```http
POST /api/leads
Content-Type: application/json

{
  "businessName": "Ocean View Restaurant",
  "address": "456 Beach Blvd",
  "city": "San Diego",
  "state": "CA",
  "zipCode": "92101",
  "phone": "+16195551234",
  "website": "https://oceanviewsd.com",
  "category": "restaurant",
  "status": "NEW",
  "source": "manual"
}
```

**Response** (201 Created):
```json
{
  "id": "lead456",
  "businessName": "Ocean View Restaurant",
  "status": "NEW",
  "createdAt": "2025-11-13T16:30:00.000Z"
}
```

---

### Convert Lead to Contact
```http
POST /api/leads/lead123/convert
Content-Type: application/json

{
  "contactData": {
    "firstName": "Maria",
    "lastName": "Garcia",
    "email": "maria@sunshinedental.com",
    "phone": "+13055551234"
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "contactId": "clx2222222222",
  "message": "Lead converted to contact"
}
```

---

## 💼 Deals API (Pipeline)

### List Deals
```http
GET /api/deals?stage=QUALIFIED
```

**Query Parameters**:
- `stage` (optional): LEAD | QUALIFIED | PROPOSAL | NEGOTIATION | CLOSED_WON | CLOSED_LOST

**Response** (200 OK):
```json
{
  "deals": [
    {
      "id": "deal123",
      "title": "Website Redesign",
      "value": 15000,
      "stage": "PROPOSAL",
      "probability": 60,
      "expectedCloseDate": "2025-12-15T00:00:00.000Z",
      "contacts": [
        {
          "id": "clx1111111111",
          "firstName": "Alice",
          "lastName": "Johnson"
        }
      ],
      "createdAt": "2025-10-20T09:00:00.000Z",
      "updatedAt": "2025-11-13T11:00:00.000Z"
    }
  ],
  "total": 23
}
```

---

### Create Deal
```http
POST /api/deals
Content-Type: application/json

{
  "title": "Mobile App Development",
  "value": 50000,
  "stage": "QUALIFIED",
  "probability": 40,
  "expectedCloseDate": "2026-02-01",
  "contactIds": ["clx1111111111"]
}
```

**Response** (201 Created):
```json
{
  "id": "deal789",
  "title": "Mobile App Development",
  "value": 50000,
  "stage": "QUALIFIED",
  "createdAt": "2025-11-13T17:00:00.000Z"
}
```

---

### Move Deal Stage
```http
PATCH /api/deals/deal123/stage
Content-Type: application/json

{
  "stage": "NEGOTIATION",
  "probability": 80
}
```

**Response** (200 OK):
```json
{
  "id": "deal123",
  "stage": "NEGOTIATION",
  "probability": 80,
  "updatedAt": "2025-11-13T18:00:00.000Z"
}
```

---

## 🤖 Voice Agents API

### List Voice Agents
```http
GET /api/voice-agents
```

**Response** (200 OK):
```json
{
  "agents": [
    {
      "id": "va123",
      "name": "Florida Dentist Receptionist",
      "elevenLabsAgentId": "VrXPNbWYnVdyJLBrcuGp",
      "phoneNumberId": "phnum_6401k9z292a7fbs9bae8k5qs6jce",
      "twilioPhoneNumber": "+19048170321",
      "firstMessage": "Hi! Thanks for calling Sunshine Dental. How can I help you today?",
      "status": "ACTIVE",
      "createdAt": "2025-11-10T10:00:00.000Z"
    }
  ]
}
```

---

### Create Voice Agent
```http
POST /api/voice-agents
Content-Type: application/json

{
  "name": "Sales Assistant",
  "twilioPhoneNumber": "+15551234567",
  "firstMessage": "Hello! Thanks for calling Acme Corp. How may I assist you?",
  "systemPrompt": "You are a helpful sales assistant for Acme Corp, a technology company."
}
```

**Response** (201 Created):
```json
{
  "id": "va456",
  "name": "Sales Assistant",
  "elevenLabsAgentId": "abc123xyz456",
  "phoneNumberId": "phnum_789xyz",
  "twilioPhoneNumber": "+15551234567",
  "status": "ACTIVE",
  "createdAt": "2025-11-13T19:00:00.000Z"
}
```

---

### Auto-Configure Voice Agent
```http
POST /api/voice-agents/va456/auto-configure
```

**Response** (200 OK):
```json
{
  "success": true,
  "agentId": "abc123xyz456",
  "phoneNumberId": "phnum_789xyz",
  "message": "Agent configured successfully. Phone number assigned."
}
```

**Error** (400 Bad Request):
```json
{
  "error": "Phone number not imported to ElevenLabs",
  "details": "Run sync to import Twilio numbers first"
}
```

---

### Initiate Test Call
```http
POST /api/outbound-calls
Content-Type: application/json

{
  "agentId": "va123",
  "toPhoneNumber": "+15149928774"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "callSid": "CA1234567890abcdef",
  "status": "queued",
  "message": "Call initiated successfully"
}
```

**Error** (404 Not Found):
```json
{
  "error": "Agent not found or not properly configured",
  "details": "Phone number may not be assigned. Run auto-configure."
}
```

---

## 📞 Twilio Integration API

### List Owned Phone Numbers
```http
GET /api/twilio/phone-numbers/owned
```

**Response** (200 OK):
```json
{
  "success": true,
  "numbers": [
    {
      "phoneNumber": "+19048170321",
      "friendlyName": "US (Florida)",
      "sid": "PN1234567890abcdef"
    },
    {
      "phoneNumber": "+15551234567",
      "friendlyName": "US (New York)",
      "sid": "PN9876543210zyxwvu"
    }
  ]
}
```

---

### Purchase Phone Number
```http
POST /api/twilio/phone-numbers/purchase
Content-Type: application/json

{
  "areaCode": "305",
  "country": "US"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "phoneNumber": "+13055559999",
  "sid": "PNabcdef123456",
  "monthlyCost": "$1.00"
}
```

---

### Sync Phone Numbers
```http
POST /api/twilio/phone-numbers/sync
```

**Response** (200 OK):
```json
{
  "success": true,
  "importedToElevenLabs": 2,
  "message": "Phone numbers synced successfully"
}
```

**Error** (402 Payment Required):
```json
{
  "error": "ElevenLabs plan does not support phone numbers",
  "upgradeRequired": true,
  "upgradeUrl": "https://elevenlabs.io/app/subscription"
}
```

---

### Twilio Voice Callback (Webhook)
```http
POST /api/twilio/voice-callback
Content-Type: application/x-www-form-urlencoded

CallSid=CA1234567890abcdef
From=+15149928774
To=+19048170321
CallStatus=ringing
```

**Response** (200 OK - TwiML):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Connect>
    <Stream url="wss://api.elevenlabs.io/v1/convai/conversation?agent_id=VrXPNbWYnVdyJLBrcuGp"/>
  </Connect>
</Response>
```

---

## 🔧 ElevenLabs Validation API

### Validate Setup
```http
GET /api/elevenlabs/validate
```

**Response** (200 OK):
```json
{
  "success": true,
  "checks": [
    {
      "name": "ElevenLabs API Key",
      "status": "✅ Valid",
      "pass": true
    },
    {
      "name": "Subscription Plan",
      "status": "✅ Creator Plan",
      "pass": true
    },
    {
      "name": "Twilio Credentials",
      "status": "✅ Valid",
      "pass": true
    },
    {
      "name": "Twilio Phone Numbers",
      "status": "✅ 2 numbers available",
      "pass": true
    },
    {
      "name": "ElevenLabs Phone Numbers",
      "status": "⚠️ 0 imported",
      "pass": false
    }
  ],
  "errors": [],
  "warnings": [
    "No phone numbers imported to ElevenLabs. Run sync to import."
  ]
}
```

---

## 💬 Messages API

### List Conversations
```http
GET /api/messages?channel=SMS
```

**Query Parameters**:
- `channel` (optional): SMS | EMAIL | WHATSAPP

**Response** (200 OK):
```json
{
  "conversations": [
    {
      "id": "conv123",
      "contactId": "clx1111111111",
      "contact": {
        "firstName": "Alice",
        "lastName": "Johnson",
        "phone": "+15559876543"
      },
      "lastMessage": {
        "content": "Thanks for your help!",
        "direction": "INBOUND",
        "createdAt": "2025-11-13T14:30:00.000Z"
      },
      "unreadCount": 0,
      "channel": "SMS"
    }
  ]
}
```

---

### Get Conversation Messages
```http
GET /api/messages/conv123
```

**Response** (200 OK):
```json
{
  "messages": [
    {
      "id": "msg456",
      "content": "Hello! How can I help you?",
      "direction": "OUTBOUND",
      "channel": "SMS",
      "status": "DELIVERED",
      "createdAt": "2025-11-13T14:00:00.000Z"
    },
    {
      "id": "msg789",
      "content": "I need info about your services",
      "direction": "INBOUND",
      "channel": "SMS",
      "createdAt": "2025-11-13T14:15:00.000Z"
    }
  ]
}
```

---

### Send Message
```http
POST /api/messages
Content-Type: application/json

{
  "contactId": "clx1111111111",
  "content": "Thanks for reaching out! Our team will contact you soon.",
  "channel": "SMS"
}
```

**Response** (200 OK):
```json
{
  "id": "msg999",
  "content": "Thanks for reaching out! Our team will contact you soon.",
  "direction": "OUTBOUND",
  "channel": "SMS",
  "status": "SENT",
  "createdAt": "2025-11-13T20:00:00.000Z"
}
```

---

### Generate AI Message
```http
POST /api/messages/generate
Content-Type: application/json

{
  "contactId": "clx1111111111",
  "context": "Follow up after initial consultation",
  "tone": "professional"
}
```

**Response** (200 OK):
```json
{
  "generatedMessage": "Hi Alice, I wanted to follow up on our consultation last week. Do you have any questions about the services we discussed? I'm here to help!",
  "model": "gpt-4.1-mini"
}
```

---

## 📅 Appointments API

### List Appointments
```http
GET /api/appointments?startDate=2025-11-15&endDate=2025-11-30
```

**Response** (200 OK):
```json
{
  "appointments": [
    {
      "id": "apt123",
      "title": "Consultation Call",
      "startTime": "2025-11-18T14:00:00.000Z",
      "endTime": "2025-11-18T15:00:00.000Z",
      "contactId": "clx1111111111",
      "contact": {
        "firstName": "Alice",
        "lastName": "Johnson"
      },
      "location": "Zoom",
      "notes": "Discuss project requirements",
      "status": "SCHEDULED",
      "createdAt": "2025-11-13T09:00:00.000Z"
    }
  ]
}
```

---

### Create Appointment
```http
POST /api/appointments
Content-Type: application/json

{
  "title": "Discovery Meeting",
  "startTime": "2025-11-20T10:00:00.000Z",
  "endTime": "2025-11-20T11:00:00.000Z",
  "contactId": "clx1111111111",
  "location": "Office - Room 3",
  "notes": "Bring project brief"
}
```

**Response** (201 Created):
```json
{
  "id": "apt456",
  "title": "Discovery Meeting",
  "startTime": "2025-11-20T10:00:00.000Z",
  "status": "SCHEDULED",
  "createdAt": "2025-11-13T21:00:00.000Z"
}
```

---

## 🚀 Campaigns API

### List Campaigns
```http
GET /api/campaigns?type=SMS&status=ACTIVE
```

**Response** (200 OK):
```json
{
  "campaigns": [
    {
      "id": "camp123",
      "name": "Holiday Promotion",
      "type": "SMS",
      "status": "ACTIVE",
      "targetTags": ["Customer", "VIP"],
      "message": "🎉 Special holiday offer! Get 20% off. Reply YES to claim.",
      "scheduledAt": "2025-12-01T09:00:00.000Z",
      "sentCount": 0,
      "openRate": 0,
      "clickRate": 0,
      "createdAt": "2025-11-13T10:00:00.000Z"
    }
  ]
}
```

---

### Create Campaign
```http
POST /api/campaigns
Content-Type: application/json

{
  "name": "New Product Launch",
  "type": "EMAIL",
  "targetTags": ["Prospect"],
  "subject": "Introducing Our New Service",
  "message": "<p>We're excited to announce...</p>",
  "scheduledAt": "2025-11-20T10:00:00.000Z"
}
```

**Response** (201 Created):
```json
{
  "id": "camp456",
  "name": "New Product Launch",
  "type": "EMAIL",
  "status": "SCHEDULED",
  "createdAt": "2025-11-13T22:00:00.000Z"
}
```

---

### Send Campaign
```http
POST /api/campaigns/camp456/send
```

**Response** (200 OK):
```json
{
  "success": true,
  "sentCount": 147,
  "failedCount": 3,
  "message": "Campaign executed successfully"
}
```

---

## ⚙️ Workflows API

### List Workflows
```http
GET /api/workflows?status=ACTIVE
```

**Response** (200 OK):
```json
{
  "workflows": [
    {
      "id": "wf123",
      "name": "Welcome New Contacts",
      "trigger": "CONTACT_CREATED",
      "conditions": [],
      "actions": [
        {
          "type": "SEND_SMS",
          "config": {
            "message": "Welcome! Thanks for joining us."
          }
        },
        {
          "type": "ADD_TAG",
          "config": {
            "tag": "New Contact"
          }
        }
      ],
      "status": "ACTIVE",
      "executionCount": 245,
      "createdAt": "2025-10-01T09:00:00.000Z"
    }
  ]
}
```

---

### Create Workflow
```http
POST /api/workflows
Content-Type: application/json

{
  "name": "VIP Contact Notification",
  "trigger": "TAG_ADDED",
  "conditions": [
    {
      "field": "tags",
      "operator": "contains",
      "value": "VIP"
    }
  ],
  "actions": [
    {
      "type": "SEND_EMAIL",
      "config": {
        "to": "admin@acmecorp.com",
        "subject": "New VIP Contact",
        "body": "A new VIP contact was added: {{contact.name}}"
      }
    }
  ],
  "status": "ACTIVE"
}
```

**Response** (201 Created):
```json
{
  "id": "wf456",
  "name": "VIP Contact Notification",
  "status": "ACTIVE",
  "createdAt": "2025-11-13T23:00:00.000Z"
}
```

---

## 📊 Analytics API

### Dashboard Overview
```http
GET /api/analytics/overview?startDate=2025-11-01&endDate=2025-11-13
```

**Response** (200 OK):
```json
{
  "metrics": {
    "totalContacts": 1247,
    "newContactsThisMonth": 89,
    "totalLeads": 342,
    "newLeadsThisMonth": 45,
    "activeDeals": 67,
    "dealsValue": 1250000,
    "appointmentsScheduled": 34,
    "messagesExchanged": 1890,
    "campaignsSent": 12,
    "callsMade": 156
  },
  "charts": {
    "contactsGrowth": [
      { "date": "2025-11-01", "count": 1158 },
      { "date": "2025-11-13", "count": 1247 }
    ],
    "dealsByStage": [
      { "stage": "QUALIFIED", "count": 23, "value": 450000 },
      { "stage": "PROPOSAL", "count": 18, "value": 380000 },
      { "stage": "NEGOTIATION", "count": 15, "value": 320000 },
      { "stage": "CLOSED_WON", "count": 11, "value": 100000 }
    ]
  }
}
```

---

## 🤖 AI Assistant API

### Chat with Soshogle Agent
```http
POST /api/ai-assistant
Content-Type: application/json

{
  "message": "How many contacts do I have tagged as VIP?",
  "conversationHistory": []
}
```

**Response** (200 OK):
```json
{
  "reply": "You currently have 23 contacts tagged as VIP. Would you like me to show you their details or help you with anything else?",
  "model": "gpt-4.1-mini",
  "timestamp": "2025-11-13T23:30:00.000Z"
}
```

---

## 🔒 Admin API

### List All Users (Admin Only)
```http
GET /api/admin/users
```

**Response** (200 OK):
```json
{
  "users": [
    {
      "id": "clx1234567890",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "USER",
      "createdAt": "2025-09-01T10:00:00.000Z",
      "stats": {
        "contacts": 147,
        "leads": 42,
        "deals": 23
      }
    }
  ],
  "total": 8
}
```

---

## 🛠️ Error Responses

### Standard Error Format
```json
{
  "error": "Resource not found",
  "code": "NOT_FOUND",
  "details": "Voice agent with ID 'va999' does not exist",
  "timestamp": "2025-11-13T23:45:00.000Z"
}
```

### HTTP Status Codes
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication required
- `402 Payment Required` - Subscription upgrade needed
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

---

## 🔗 Webhook Endpoints

### Twilio Voice Callback
**URL**: `https://yourdomain.com/api/twilio/voice-callback`  
**Method**: POST  
**Content-Type**: application/x-www-form-urlencoded

### Twilio SMS Webhook
**URL**: `https://yourdomain.com/api/twilio/sms-webhook`  
**Method**: POST  
**Content-Type**: application/x-www-form-urlencoded

### Stripe Payment Webhook
**URL**: `https://yourdomain.com/api/payments/stripe/webhook`  
**Method**: POST  
**Content-Type**: application/json

---

**Last Updated**: November 2025  
**API Version**: 2.0
