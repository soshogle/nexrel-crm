# Integrations Status & Implementation Plan

## Current Status Summary

### ✅ Fully Integrated (5)
1. **ElevenLabs Voice AI** - Complete
2. **Twilio** - Complete  
3. **DICOM/Orthanc** - Complete
4. **AWS S3 / Azure Blob Storage** - Complete
5. **Mango Voice** - Code created, needs setup

### ⚠️ Partially Integrated (2)
6. **Stripe** - Payment intents created, needs full payment flow
7. **QuickBooks** - Service code exists (`lib/integrations/quickbooks-service.ts`), but not connected to UI/settings

### ❌ Planned But Not Implemented (5)
8. **Insurance APIs (RAMQ, Private)** - High Priority
9. **Lab Order Systems** - Medium Priority
10. **Calendar Systems (Google Calendar, Outlook)** - Medium Priority
11. **Email Providers (SendGrid, Mailgun)** - Medium Priority
12. **Xero Accounting** - Low Priority

---

## Priority Implementation Plan

### 🔴 HIGH PRIORITY

#### 1. Insurance APIs (RAMQ & Private Insurance)
**Status**: Code structure exists, needs actual API connections

**What Exists:**
- ✅ `lib/dental/insurance-integration.ts` - Service structure
- ✅ `app/api/dental/insurance/route.ts` - API endpoints
- ✅ `DentalInsuranceClaim` model in database
- ✅ Insurance claim UI components

**What's Missing:**
- ❌ Actual RAMQ API integration
- ❌ Private insurance provider API connections
- ❌ Real-time eligibility checking
- ❌ Automated claim submission
- ❌ Claim status webhooks

**Next Steps:**
1. Research RAMQ API documentation and requirements
2. Identify private insurance providers (Sun Life, Manulife, etc.)
3. Create API client wrappers for each provider
4. Implement eligibility checking endpoints
5. Add webhook handlers for claim status updates
6. Test with sandbox/test environments

**Estimated Effort**: 2-3 weeks

---

### 🟡 MEDIUM PRIORITY

#### 2. Lab Order Systems Integration
**Status**: Database models exist, needs external system integration

**What Exists:**
- ✅ `DentalLabOrder` model in database
- ✅ Lab order types and status enums
- ✅ Basic lab order UI

**What's Missing:**
- ❌ Integration with actual lab systems
- ❌ Electronic lab order submission
- ❌ Lab order tracking/status updates
- ❌ Lab catalog integration

**Next Steps:**
1. Identify which lab systems to integrate (e.g., Glidewell, Ivoclar, etc.)
2. Research lab APIs or EDI standards
3. Create lab service integration layer
4. Implement order submission workflow
5. Add status tracking and notifications

**Estimated Effort**: 1-2 weeks per lab system

---

#### 3. Calendar Systems (Google Calendar, Outlook)
**Status**: Not started

**What's Missing:**
- ❌ Google Calendar API integration
- ❌ Microsoft Outlook/Exchange integration
- ❌ Two-way sync (appointments ↔ calendar)
- ❌ Calendar conflict detection
- ❌ Meeting link generation

**Next Steps:**
1. Set up Google Calendar API credentials
2. Set up Microsoft Graph API credentials
3. Create calendar sync service
4. Implement appointment ↔ calendar sync
5. Add calendar settings UI
6. Handle OAuth flows for user authorization

**Estimated Effort**: 2 weeks

---

#### 4. Email Providers (SendGrid, Mailgun)
**Status**: Not started (though SendGrid is in package.json)

**What Exists:**
- ✅ `@sendgrid/mail` package installed
- ✅ Basic email sending in some places

**What's Missing:**
- ❌ Centralized email service
- ❌ Email templates system
- ❌ Email campaign management
- ❌ Bounce/complaint handling
- ❌ Email analytics

**Next Steps:**
1. Create unified email service (`lib/integrations/email-service.ts`)
2. Set up SendGrid/Mailgun templates
3. Create email template management UI
4. Implement email campaign system
5. Add email analytics tracking

**Estimated Effort**: 1 week

---

### 🟢 LOW PRIORITY

#### 5. Complete QuickBooks Integration
**Status**: Service code exists, needs UI and OAuth flow

**What Exists:**
- ✅ `lib/integrations/quickbooks-service.ts` - Full service implementation
- ✅ Customer creation
- ✅ Invoice creation
- ✅ Invoice status checking
- ✅ Token refresh logic

**What's Missing:**
- ❌ OAuth connection flow UI
- ❌ QuickBooks settings page
- ❌ Integration with invoice/payment workflows
- ❌ Sync status indicators

**Next Steps:**
1. Create QuickBooks OAuth connection page
2. Add QuickBooks settings to admin dashboard
3. Connect to invoice creation workflows
4. Add sync status indicators
5. Test with QuickBooks sandbox

**Estimated Effort**: 3-5 days

---

#### 6. Xero Accounting Integration
**Status**: Not started

**What's Missing:**
- ❌ Xero API integration
- ❌ OAuth flow
- ❌ Invoice sync
- ❌ Payment sync

**Next Steps:**
1. Research Xero API
2. Create Xero service similar to QuickBooks
3. Implement OAuth flow
4. Add to settings UI

**Estimated Effort**: 1 week

---

## Recommended Implementation Order

### Phase 1: Complete Existing Partial Integrations (1 week)
1. ✅ Complete QuickBooks integration (add UI/OAuth)
2. ✅ Complete Stripe payment flow
3. ✅ Set up Mango Voice (if needed)

### Phase 2: High-Value Integrations (3-4 weeks)
1. ✅ Insurance APIs (RAMQ + 2-3 private providers)
2. ✅ Email Providers (SendGrid/Mailgun)

### Phase 3: Workflow Integrations (2-3 weeks)
1. ✅ Calendar Systems (Google + Outlook)
2. ✅ Lab Order Systems (1-2 major labs)

### Phase 4: Additional Integrations (as needed)
1. ✅ Xero Accounting
2. ✅ Additional lab systems
3. ✅ Additional insurance providers

---

## Integration Architecture Pattern

All new integrations should follow this pattern:

```
lib/integrations/
├── [service-name].ts          # Service class
└── [service-name]-types.ts    # TypeScript types

app/api/integrations/
└── [service-name]/
    ├── route.ts               # Main API routes
    ├── webhook/route.ts       # Webhook handler (if needed)
    └── oauth/route.ts         # OAuth callback (if needed)

components/integrations/
└── [service-name]-settings.tsx  # Settings UI component
```

---

## Environment Variables Needed

Add to `.env.example`:

```bash
# Insurance APIs
RAMQ_API_KEY=
RAMQ_API_URL=
SUN_LIFE_API_KEY=
MANULIFE_API_KEY=

# Lab Systems
LAB_SYSTEM_API_KEY=
LAB_SYSTEM_API_URL=

# Calendar Systems
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# Email Providers
SENDGRID_API_KEY=
MAILGUN_API_KEY=
MAILGUN_DOMAIN=

# Accounting
QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=
QUICKBOOKS_ENVIRONMENT=production
XERO_CLIENT_ID=
XERO_CLIENT_SECRET=
```

---

## Next Steps

1. **Decide which integration to tackle first** (recommend Insurance APIs)
2. **Research API documentation** for chosen integration
3. **Create integration service** following the pattern above
4. **Add UI components** for settings/configuration
5. **Test with sandbox/test environments**
6. **Document integration** in `docs/INTEGRATIONS.md`

---

**Ready to start?** Let me know which integration you'd like to implement first! 🚀
