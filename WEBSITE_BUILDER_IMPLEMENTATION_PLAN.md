# Website Builder Implementation Plan

## 🎯 Overview

This document outlines the complete implementation plan for the website builder feature, ensuring no existing functionality is broken.

---

## ✅ Safety Guarantees

### Database Safety
- All new models are **additive only** - no modifications to existing models
- New tables use separate namespaces
- No foreign keys to existing tables (only references from existing tables to new ones)
- All migrations are reversible

### Code Safety
- New features in separate directories
- No modifications to existing workflow system
- Integration points are clearly defined
- Backward compatible

---

## 📊 Database Schema (New Models)

### 1. Website Model
```prisma
model Website {
  id                    String   @id @default(cuid())
  userId                String
  name                  String
  type                  WebsiteType // REBUILT, SERVICE_TEMPLATE, PRODUCT_TEMPLATE
  sourceUrl             String? // If rebuilt from existing site
  templateType          WebsiteTemplateType? // SERVICE, PRODUCT
  status                WebsiteStatus @default(BUILDING)
  buildProgress         Int @default(0) // 0-100
  
  // Structure & Content
  structure             Json // Complete website structure (pages, components, etc.)
  seoData               Json // SEO metadata
  extractedData         Json // All scraped/extracted data
  questionnaireAnswers  Json? // Answers from questionnaire (if new site)
  
  // Integrations
  stripeConnectAccountId String?
  elevenLabsAgentId      String?
  integrations           Json // Active integrations config
  
  // Resources (separate per website)
  githubRepoUrl          String?
  neonDatabaseUrl        String?
  vercelProjectId        String?
  vercelDeploymentUrl    String?
  
  // Voice AI
  voiceAIEnabled         Boolean @default(false)
  voiceAIConfig          Json? // Voice AI settings
  
  // Approval Queue
  pendingChanges         Json? // Changes awaiting approval
  
  // Metadata
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  publishedAt           DateTime?
  
  // Relations
  user                  User @relation(fields: [userId], references: [id], onDelete: Cascade)
  builds                WebsiteBuild[]
  integrations          WebsiteIntegration[]
  visitors              WebsiteVisitor[]
  changeApprovals       WebsiteChangeApproval[]
  
  @@index([userId])
  @@index([status])
  @@index([type])
}
```

### 2. WebsiteBuild Model
```prisma
model WebsiteBuild {
  id            String   @id @default(cuid())
  websiteId     String
  buildType     WebsiteBuildType // INITIAL, REBUILD, UPDATE
  status        WebsiteBuildStatus @default(PENDING)
  progress      Int @default(0)
  sourceUrl     String? // If cloning
  buildData     Json? // Build configuration
  error         String?
  startedAt     DateTime @default(now())
  completedAt   DateTime?
  
  website       Website @relation(fields: [websiteId], references: [id], onDelete: Cascade)
  
  @@index([websiteId])
  @@index([status])
}
```

### 3. WebsiteIntegration Model
```prisma
model WebsiteIntegration {
  id            String   @id @default(cuid())
  websiteId     String
  type          WebsiteIntegrationType // STRIPE, BOOKING, FORM, CTA, CHAT
  config        Json // Integration-specific configuration
  status        IntegrationStatus @default(ACTIVE)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  website       Website @relation(fields: [websiteId], references: [id], onDelete: Cascade)
  
  @@index([websiteId])
  @@index([type])
}
```

### 4. WebsiteVisitor Model
```prisma
model WebsiteVisitor {
  id            String   @id @default(cuid())
  websiteId     String
  sessionId     String
  ipAddress     String?
  userAgent     String?
  referrer      String?
  pagesVisited  Json // Array of page visits
  interactions  Json // CTA clicks, form submissions, etc.
  formData      Json? // Submitted form data
  createdAt     DateTime @default(now())
  
  website       Website @relation(fields: [websiteId], references: [id], onDelete: Cascade)
  
  @@index([websiteId])
  @@index([sessionId])
  @@index([createdAt])
}
```

### 5. WebsiteChangeApproval Model
```prisma
model WebsiteChangeApproval {
  id            String   @id @default(cuid())
  websiteId     String
  changeType    ChangeType // AI_MODIFICATION, MANUAL_EDIT
  changes       Json // Proposed changes
  preview       Json // Preview data
  status        ApprovalStatus @default(PENDING)
  requestedBy   String? // User ID
  approvedBy    String?
  approvedAt    DateTime?
  createdAt     DateTime @default(now())
  
  website       Website @relation(fields: [websiteId], references: [id], onDelete: Cascade)
  
  @@index([websiteId])
  @@index([status])
}
```

### 6. WebsiteTemplate Model
```prisma
model WebsiteTemplate {
  id            String   @id @default(cuid())
  name          String
  type          WebsiteTemplateType // SERVICE, PRODUCT
  category      String?
  previewImage  String?
  structure     Json // Template structure
  description   String?
  isDefault     Boolean @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([type])
  @@index([category])
}
```

### Enums
```prisma
enum WebsiteType {
  REBUILT
  SERVICE_TEMPLATE
  PRODUCT_TEMPLATE
}

enum WebsiteStatus {
  BUILDING
  READY
  PUBLISHED
  FAILED
}

enum WebsiteBuildType {
  INITIAL
  REBUILD
  UPDATE
}

enum WebsiteBuildStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
}

enum WebsiteIntegrationType {
  STRIPE
  BOOKING
  FORM
  CTA
  CHAT
  ANALYTICS
}

enum IntegrationStatus {
  ACTIVE
  INACTIVE
  ERROR
}

enum ChangeType {
  AI_MODIFICATION
  MANUAL_EDIT
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  MODIFIED
}
```

---

## 🔗 Integration with Existing System

### 1. User Model Addition (Safe - Additive Only)
```prisma
model User {
  // ... existing fields ...
  websites Website[] // NEW - Add this relation only
}
```

### 2. Workflow Integration

#### New Workflow Task Types
Add to existing `WorkflowTask.actionConfig`:
- `CREATE_WEBSITE` - Create website from template/clone
- `UPDATE_WEBSITE_CONTENT` - Update website content
- `ADD_PAYMENT_SECTION` - Add Stripe payment
- `ADD_BOOKING_WIDGET` - Add booking widget
- `ADD_LEAD_FORM` - Add lead capture form
- `PUBLISH_WEBSITE` - Publish website

#### New Workflow Triggers
Add to existing workflow trigger system:
- `WEBSITE_VISITOR` - Visitor lands on website
- `FORM_SUBMITTED` - Form submission
- `PAYMENT_RECEIVED` - Payment processed
- `BOOKING_CREATED` - Booking made
- `CTA_CLICKED` - CTA button clicked

---

## 🏗️ Architecture Components

### 1. Website Scraping Service
**File:** `lib/website-builder/scraper.ts`

**Responsibilities:**
- Fetch website HTML
- Parse HTML structure
- Extract SEO data
- Extract images/videos
- Extract forms/widgets
- Extract design patterns
- Download assets
- Convert to website builder format

**Dependencies:**
- Puppeteer/Playwright (for JavaScript rendering)
- Cheerio (for HTML parsing)
- Image download utilities

### 2. Website Building Service
**File:** `lib/website-builder/builder.ts`

**Responsibilities:**
- Analyze questionnaire answers
- Generate website structure
- Create content from answers
- Apply design patterns
- Optimize SEO
- Build complete website JSON

**Dependencies:**
- AI service (OpenAI/Claude for content generation)
- Template engine

### 3. Resource Provisioning Service
**File:** `lib/website-builder/provisioning.ts`

**Responsibilities:**
- Create GitHub repository
- Create Neon database
- Create Vercel project
- Link resources together
- Store connection info

**Dependencies:**
- GitHub API
- Neon API
- Vercel API

### 4. ElevenLabs Voice AI Service
**File:** `lib/website-builder/voice-ai.ts`

**Responsibilities:**
- Create ElevenLabs agent for website
- Configure agent with business info
- Generate prompts for website context
- Store agent ID

**Dependencies:**
- Existing `lib/elevenlabs-provisioning.ts`
- ElevenLabs API

### 5. Change Approval Service
**File:** `lib/website-builder/approval.ts`

**Responsibilities:**
- Generate preview of changes
- Store pending changes
- Handle approval/rejection
- Apply approved changes
- Version history

---

## 📁 File Structure

```
lib/
  website-builder/
    scraper.ts              # Website scraping
    builder.ts              # AI website building
    provisioning.ts         # Resource provisioning
    voice-ai.ts            # Voice AI integration
    approval.ts            # Change approval
    types.ts               # TypeScript types
    utils.ts               # Utilities

app/
  api/
    website-builder/
      create/route.ts      # Create website
      scrape/route.ts      # Scrape website
      build/route.ts       # Build website
      approve/route.ts     # Approve changes
      provision/route.ts   # Provision resources
      voice-ai/route.ts    # Voice AI setup
    websites/
      [id]/
        route.ts           # Website CRUD
        deploy/route.ts    # Deploy website
        preview/route.ts   # Preview changes

app/
  dashboard/
    websites/
      page.tsx             # Website list
      new/
        page.tsx           # Create website flow
      [id]/
        page.tsx           # Website editor
        preview/
          page.tsx         # Preview changes

components/
  website-builder/
    website-list.tsx
    creation-flow.tsx
    editor.tsx
    preview-dialog.tsx
    voice-ai-widget.tsx
    integration-panel.tsx
```

---

## 🔄 Implementation Phases

### Phase 1: Database & Core Models
1. Add database models (migration)
2. Create TypeScript types
3. Create basic CRUD APIs
4. Test database operations

### Phase 2: Scraping & Building
1. Implement website scraper
2. Implement AI website builder
3. Create build queue system
4. Test scraping/building

### Phase 3: Resource Provisioning
1. Implement GitHub repo creation
2. Implement Neon database creation
3. Implement Vercel project creation
4. Test provisioning flow

### Phase 4: Voice AI Integration
1. Integrate ElevenLabs agent creation
2. Create voice AI widget component
3. Configure agent prompts
4. Test voice AI

### Phase 5: UI Components
1. Create website list page
2. Create creation flow UI
3. Create editor interface
4. Create preview/approval UI

### Phase 6: Workflow Integration
1. Add website actions to workflow builder
2. Add website triggers
3. Test workflow integration

### Phase 7: Integrations
1. Stripe Connect integration
2. Booking widget integration
3. Form integration
4. CTA integration

### Phase 8: Testing & Polish
1. End-to-end testing
2. Error handling
3. Performance optimization
4. Documentation

---

## 🔐 Security Considerations

1. **API Keys:** Store securely, never expose to frontend
2. **Database URLs:** Encrypt in database, use environment variables
3. **GitHub Tokens:** Use fine-grained tokens with minimal permissions
4. **Vercel Tokens:** Use team tokens with project-specific access
5. **Neon Credentials:** Store encrypted, rotate regularly

---

## 📝 Next Steps

1. Create database migration
2. Implement core services
3. Build UI components
4. Integrate with workflows
5. Add integrations
6. Test thoroughly

---

## ✅ Safety Checklist

- [ ] All new models are additive (no existing model modifications)
- [ ] All migrations are reversible
- [ ] No breaking changes to existing APIs
- [ ] Workflow integration is backward compatible
- [ ] Error handling for all external APIs
- [ ] Rate limiting for provisioning APIs
- [ ] Proper cleanup on failures
- [ ] Comprehensive logging

---

This plan ensures safe, incremental implementation without breaking existing functionality.
