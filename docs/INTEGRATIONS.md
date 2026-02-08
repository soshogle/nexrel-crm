# Integrations List

## Current Integrations

### 1. ElevenLabs Voice AI ✅
- **Status**: Fully Integrated
- **Purpose**: Voice AI agents and phone calls
- **Files**: 
  - `lib/elevenlabs.ts`
  - `lib/elevenlabs-provisioning.ts`
  - `app/api/voice-agents/`
- **Features**:
  - Voice agent creation
  - Phone call automation
  - Text-to-speech
  - Conversation management

### 2. Twilio ✅
- **Status**: Integrated
- **Purpose**: SMS and phone services
- **Files**: 
  - `app/api/twilio/`
- **Features**:
  - SMS sending/receiving
  - Voice callbacks
  - Phone number management

### 3. DICOM/Orthanc ✅
- **Status**: Integrated
- **Purpose**: Medical imaging (X-rays)
- **Files**: 
  - `lib/dental/dicom-server.ts`
  - `app/api/dental/dicom/`
- **Features**:
  - DICOM image storage
  - VNA integration
  - Image compression
  - Multi-resolution support

### 4. AWS S3 / Azure Blob Storage ✅
- **Status**: Integrated
- **Purpose**: File storage
- **Files**: 
  - `lib/storage/`
- **Features**:
  - Document storage
  - Image storage
  - Canadian data residency compliance

### 5. Stripe (Partial) ⚠️
- **Status**: Partially Integrated
- **Purpose**: Payment processing
- **Files**: 
  - `app/api/dental/payments/`
- **Features**:
  - Payment intent creation
  - Needs full integration

## New Integrations

### 6. Mango Voice ✅
- **Status**: Integration Created
- **Purpose**: PBX system integration for call management
- **Files**: 
  - `lib/integrations/mango-voice.ts`
  - `app/api/integrations/mango-voice/webhook/route.ts`
- **Features**:
  - Webhook handling for call events
  - SMS/MMS relay
  - Call history
  - Patient matching
- **Setup Required**:
  - Environment variables:
    - `MANGO_VOICE_API_KEY`
    - `MANGO_VOICE_PARTNER_ID`
    - `MANGO_VOICE_CALLBACK_URL`
    - `MANGO_VOICE_REMOTE_ID`
  - Partner account setup (contact Mango Voice Partner Team)

## Planned Integrations

### 7. Insurance APIs (RAMQ, Private)
- **Status**: Planned
- **Purpose**: Insurance claim processing
- **Priority**: High

### 8. Lab Order Systems
- **Status**: Planned
- **Purpose**: Lab order management and tracking
- **Priority**: Medium

### 9. Calendar Systems (Google Calendar, Outlook)
- **Status**: Planned
- **Purpose**: Appointment synchronization
- **Priority**: Medium

### 10. Accounting Software (QuickBooks, Xero)
- **Status**: Planned
- **Purpose**: Financial data sync
- **Priority**: Low

### 11. Email Providers (SendGrid, Mailgun)
- **Status**: Planned
- **Purpose**: Email campaigns and notifications
- **Priority**: Medium

## Integration Architecture

All integrations follow a consistent pattern:
1. Service class in `lib/integrations/`
2. API routes in `app/api/integrations/[service]/`
3. Environment variable configuration
4. Error handling and logging
5. Webhook support where applicable

## Adding New Integrations

1. Create service class in `lib/integrations/[service-name].ts`
2. Create API routes in `app/api/integrations/[service-name]/`
3. Add environment variables to `.env.example`
4. Update this documentation
5. Add integration to settings UI (if needed)
