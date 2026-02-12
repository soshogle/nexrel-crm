# Phased Roadmap: Website Builder (Wix-like) & AI Assistant Enhancements

## Implementation Status (Updated)

### Completed
- **WebsiteMedia** model + migration
- **Media library API** `GET/POST /api/websites/[id]/media` (upload, list, image optimization)
- **Layout types** – breakpoints, animations, spacing, SectionLayout in types.ts
- **Form config** – FormField conditional, multi-step; FormConfig
- **Granular tools** – reorder_section, delete_section, update_section_layout in granular-tools.ts
- **AI tools** – reorder_section, delete_section, list_website_media, add_website_image
- **AI tools** – get_follow_up_priority, get_deal_risk_alerts, bulk_update_lead_status, bulk_add_tag, export_pipeline_csv
- **Section types** – PopupSection, BookingWidget, ChatWidget in add_section
- **Voice** – All new tools proxied in crm-voice-agent/functions

### In Progress
- Popup/Booking/Chat widget rendering (frontend)
- Forms builder UI with conditional logic

---

## Overview

This document outlines a phased implementation plan to enhance the website builder toward Wix-like capabilities and empower the AI assistant with deeper CRM integration. **All phases ensure new features integrate seamlessly with existing CRM tools.**

---

## Current State Summary

### Website Builder (Existing)
- **Structure:** Pages, components (Hero, CTASection, TextSection, AboutSection, ContactForm, etc.)
- **AI Modification:** `modify_website`, granular tools (`update_hero`, `add_section`, `update_section_content`, `add_cta`, `get_website_structure`)
- **Create/Clone:** `create_website`, `clone_website`, `list_websites`
- **Integrations:** Stripe Connect, Voice AI (ElevenLabs), image storage (Vercel Blob/S3)
- **Workflow Actions:** CREATE_WEBSITE, UPDATE_WEBSITE_CONTENT, ADD_LEAD_FORM, ADD_BOOKING_WIDGET, ADD_CTA_BUTTON, PUBLISH_WEBSITE
- **Workflow Triggers:** WEBSITE_FORM_SUBMITTED, WEBSITE_VISITOR, WEBSITE_BOOKING_CREATED, WEBSITE_CTA_CLICKED, WEBSITE_PAYMENT_RECEIVED, etc.
- **Webhook:** `/api/webhooks/website` → processWebsiteTriggers → auto-create Lead from form submission

### AI Assistant (Existing)
- **Chat:** Agent loop, context (activeWebsiteId, activeLeadId, activeDealId, currentPath)
- **CRM Tools:** create_lead, update_lead, get_lead_details, create_deal, add_note, create_task, list_tasks, complete_task, update_deal_stage, add_lead_tag, update_lead_status, list_notes, get_pipeline_stages, assign_deal_to_lead, reschedule_task
- **Communication:** draft_sms, send_sms, draft_email, send_email, sms_leads, email_leads, make_outbound_call, call_leads
- **Voice:** CrmVoiceAgentService with proxy to actions API

### Integration Points (Must Preserve)
| System | Integration | How New Features Must Connect |
|--------|-------------|------------------------------|
| **Leads** | Form submissions → Lead | Website forms must create Lead via webhook or same flow |
| **Workflows** | WEBSITE_* triggers | New website events must emit triggers for workflow enrollment |
| **AI Assistant** | Actions API | New tools must be added to AVAILABLE_ACTIONS, ai-assistant-functions, chat/voice prompts |
| **Voice Agent** | proxyToActionsAPI | New tools must be added to functions route switch |
| **Screen Context** | getPageContext() | New pages must be added to screen-context-extractor if context-aware |
| **Appointments** | create_appointment | Booking widget must use same appointment model |

---

## Phase 1: Foundation & Quick Wins (2–3 weeks)

**Goal:** Strengthen core AI assistant and website–CRM handoff.

### 1.1 AI Assistant – Proactive Insights
| Deliverable | Integration | Details |
|-------------|-------------|---------|
| `get_follow_up_priority` | Extends `get_follow_up_suggestions` | Returns ranked list: last contact date, deal stage, task urgency. Uses existing Lead, Deal, Task, Note models. |
| `get_deal_risk_alerts` | Uses `list_deals`, `get_deal_details` | Identifies stale deals (no activity X days), long-in-stage. Returns deal IDs for `update_deal_stage`, `add_note`. |
| Enhance `get_daily_briefing` | Existing briefing | Add "suggested follow-ups" from `get_follow_up_priority`. |

**Integration:** Add to ai-assistant-functions.ts, actions route, chat prompt, voice agent. Uses existing create_lead, add_note, create_task, update_deal_stage.

### 1.2 Website → CRM Lead Capture
| Deliverable | Integration | Details |
|-------------|-------------|---------|
| Form builder (basic) | WEBSITE_FORM_SUBMITTED, webhook | Add `add_lead_form` AI tool: configurable fields (name, email, phone, message). Form submits to `/api/webhooks/website` → processWebsiteTriggers → create Lead. |
| AI tool: `add_lead_form` | add_section (ContactForm) | Extends add_section with form config. Form schema stored in structure. Visitor submits → webhook → Lead. |

**Integration:** Reuse existing webhook, processWebsiteTriggers, Lead creation. No schema changes if form config lives in structure JSON.

### 1.3 AI Tool: Bulk Actions
| Deliverable | Integration | Details |
|-------------|-------------|---------|
| `bulk_update_lead_status` | update_lead_status, list_leads | "Mark all Qualified leads as Contacted" – filter by status, update batch. |
| `bulk_add_tag` | add_lead_tag, list_leads | "Tag all leads from last week as hot" – filter by period, add tag. |

**Integration:** Uses existing lead update, list_leads (status, period). Add to actions, functions, chat, voice.

---

## Phase 2: Website Builder – Layout & Media (2–3 weeks)

**Goal:** Wix-like layout control and media management.

### 2.1 Media Library
| Deliverable | Integration | Details |
|-------------|-------------|---------|
| Media model | Website relation | `WebsiteMedia` or store in `extractedData`/separate table. Per-website image library. |
| Upload API | image-storage.ts | Extend existing Vercel Blob/S3. Upload → store URL in media library. |
| AI tool: `add_website_image` | update_section_content, modify_website | "Add image X to hero" – pick from media library or upload. Updates `props.imageUrl`. |

**Integration:** Website images used in Hero, ImageSection, CTASection. Existing `modify_website` can already update imageUrl via AI path.

### 2.2 Layout Controls
| Deliverable | Integration | Details |
|-------------|-------------|---------|
| `reorder_sections` | granular-tools.ts | AI tool: move section up/down by index. Uses applyStructureChange. |
| `delete_section` | granular-tools.ts | AI tool: remove section by type or index. |
| Responsive breakpoints | structure.globalStyles | Add `breakpoints` to schema. Component visibility per breakpoint. |

**Integration:** Extends applyStructureChange. New tools in ai-assistant-functions, actions, chat. Uses existing get_website_structure, add_section.

### 2.3 AI Integration
| Deliverable | Integration | Details |
|-------------|-------------|---------|
| "Make it look like [URL]" | clone_website, scraper | Enhance clone: analyze reference site layout/style, suggest structure changes. |
| AI tool: `suggest_website_improvements` | get_website_structure, modify_website | Read-only: returns suggestions (e.g. "Add CTA", "Improve hero"). User chooses. |

**Integration:** Uses scraper, builder, modify_website. No new persistence; suggestion only.

---

## Phase 3: Forms, Popups & Booking (2–3 weeks)

**Goal:** Lead capture and conversion (Wix-style).

### 3.1 Form Builder (Advanced)
| Deliverable | Integration | Details |
|-------------|-------------|---------|
| Conditional fields | ContactForm props | Show/hide fields based on other field values. Stored in structure. |
| Multi-step forms | ContactForm props | Steps array. Submit to same webhook. |
| Form → Lead mapping | Webhook | Map form fields to Lead fields (contactPerson, email, phone, etc.). Config in structure. |

**Integration:** Webhook flow unchanged. processWebsiteTriggers receives form data, creates Lead. WEBSITE_FORM_SUBMITTED trigger fires for workflows.

### 3.2 Popup / Lightbox
| Deliverable | Integration | Details |
|-------------|-------------|---------|
| Popup component | structure | New component type: PopupSection. Trigger: on load, time delay, exit intent. |
| Content: form or CTA | Reuse ContactForm, CTASection | Popup contains form or CTA. CTA → navigate. Form → webhook → Lead. |

**Integration:** Same Lead creation, WEBSITE_FORM_SUBMITTED. Optional WEBSITE_POPUP_VIEWED trigger if needed.

### 3.3 Booking Widget
| Deliverable | Integration | Details |
|-------------|-------------|---------|
| Embed booking | Existing appointments | Use create_appointment, BookingAppointment. Widget: pick date/time → create_appointment. |
| AI tool: `add_booking_widget` | add_section | Section type: BookingWidget. Config: service types, duration. Links to user's calendar. |

**Integration:** Workflow action ADD_BOOKING_WIDGET exists. Booking creates WEBSITE_BOOKING_CREATED trigger. Reuse create_appointment flow.

---

## Phase 4: AI Assistant – Communication & Automation (2–3 weeks)

**Goal:** Deeper communication and workflow automation.

### 4.1 Email & SMS Templates
| Deliverable | Integration | Details |
|-------------|-------------|---------|
| `create_email_template` | draft_email, send_email | Save template with placeholders {{contactName}}, {{businessName}}. |
| `create_sms_template` | draft_sms, send_sms | Same as email. |
| AI: "Use template X for John" | Load template, draft_email/sms | Merge template with contact data, call draft_email/sms. |

**Integration:** New templates table or JSON. Existing draft_email, send_email, draft_sms, send_sms consume templates.

### 4.2 Workflow from Natural Language
| Deliverable | Integration | Details |
|-------------|-------------|---------|
| Enhance `create_workflow` | AIWorkflowGenerator | Parse "when lead created, wait 2 days, email them" → create workflow + tasks. |
| `add_workflow_task` enhancements | Existing | Support more task types from AI. |

**Integration:** create_workflow, add_workflow_task. AIWorkflowGenerator maps to CREATE_LEAD_FROM_MESSAGE, SEND_EMAIL, WAIT_DELAY, etc.

### 4.3 Meeting Prep & Post-Call
| Deliverable | Integration | Details |
|-------------|-------------|---------|
| Enhance `get_meeting_prep` | get_lead_details, list_notes | Add "suggested next actions" (e.g. create deal, add note). |
| `post_call_actions` | add_note, create_task, update_deal_stage | "Log call with John: discussed pricing. Add note, schedule follow-up Friday." → Multi-step. |

**Integration:** Uses add_note, create_task, update_deal_stage, get_lead_details. Agent loop already supports multi-step.

---

## Phase 5: E‑commerce & Analytics (3–4 weeks)

**Goal:** Product catalog, payments, and reporting.

### 5.1 Product Catalog (Basic)
| Deliverable | Integration | Details |
|-------------|-------------|---------|
| Product model | Website or global | Products table or Website.products JSON. |
| ProductsGrid enhancement | Existing | Pull from real product data. |
| AI tool: `add_product_section` | add_section | Add ProductsGrid with product IDs. |

**Integration:** WEBSITE_PRODUCT_* triggers exist. ORDER_CREATED, PAYMENT_RECEIVED. Extends add_section.

### 5.2 Payments (Stripe)
| Deliverable | Integration | Details |
|-------------|-------------|---------|
| Checkout flow | Stripe Connect, setup_stripe | Website already has stripeConnectAccountId. Add checkout component. |
| WEBSITE_PAYMENT_RECEIVED | Existing | Webhook fires on payment. Workflow triggers. |

**Integration:** stripe-connect.ts, webhook. create_invoice for post-payment. No new triggers.

### 5.3 Analytics & Reports
| Deliverable | Integration | Details |
|-------------|-------------|---------|
| `get_website_analytics` | visitor-tracking-service | Visitors, page views, form submissions. |
| `get_custom_report` | create_report, get_statistics | "Leads by source for Q1" – dynamic query. |

**Integration:** Reuses existing create_report, get_statistics. Website analytics from visitor-tracking-service.

---

## Phase 6: Polish & Advanced (2–3 weeks)

**Goal:** UX polish and advanced features.

### 6.1 SEO & Performance
| Deliverable | Integration | Details |
|-------------|-------------|---------|
| Per-page SEO | structure.pages[].seo | Already exists. AI tool: `update_page_seo` (title, description). |
| Sitemap | seo-automation.ts | Already exists. Ensure it's generated. |
| Performance | - | Lighthouse-style checks, recommendations. |

**Integration:** seo-automation.ts, structure. New AI tool: update_page_seo.

### 6.2 Accessibility
| Deliverable | Integration | Details |
|-------------|-------------|---------|
| `check_website_accessibility` | get_website_structure | Read-only: contrast, alt text, headings. Returns suggestions. |
| AI tool: `fix_accessibility` | modify_website | Apply suggested fixes. |

**Integration:** Uses modify_website, structure paths.

### 6.3 Voice & Chat Parity
| Deliverable | Integration | Details |
|-------------|-------------|---------|
| Add all new tools to voice | crm-voice-agent.ts | Each new AI tool must be in voice agent's function list and proxy. |
| Voice prompt updates | buildCrmSystemPrompt | Describe new tools for voice. |

**Integration:** app/api/crm-voice-agent/functions/route.ts proxy. CrmVoiceAgentService tools array.

---

## Integration Checklist (Per Phase)

For each new feature, verify:

- [ ] **AI Assistant:** Added to `lib/ai-assistant-functions.ts` (definition + mapFunctionToAction)
- [ ] **Actions:** Added to `AVAILABLE_ACTIONS` and switch in `app/api/ai-assistant/actions/route.ts`
- [ ] **Chat:** Added to system prompt in `app/api/ai-assistant/chat/route.ts`
- [ ] **Chat context:** If context-aware, add to activeWebsiteId/activeLeadId/activeDealId injection
- [ ] **Voice:** Added to `app/api/crm-voice-agent/functions/route.ts` proxy
- [ ] **Voice:** Added to CrmVoiceAgentService tools + prompt (if user-facing)
- [ ] **Navigation:** Added to `getNavigationUrlForAction` in ai-assistant-functions.ts
- [ ] **Workflows:** If website-related, ensure trigger/action exists in workflow-engine, create-workflow-dialog
- [ ] **Webhook:** If form/booking, ensure webhook processes and creates Lead

---

## Implementation Order

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| 1 | 2–3 weeks | None |
| 2 | 2–3 weeks | Phase 1 |
| 3 | 2–3 weeks | Phase 1, 2 |
| 4 | 2–3 weeks | Phase 1 |
| 5 | 3–4 weeks | Phase 1, 2, 3 |
| 6 | 2–3 weeks | All |

**Total estimate:** 14–20 weeks (with overlap)

---

## Quick Reference: Existing Tools to Integrate With

| Domain | Tool | Use for |
|--------|------|---------|
| Leads | create_lead | Form submissions, webhook |
| Leads | add_lead_tag, update_lead_status | Bulk actions, follow-up |
| Leads | get_lead_details, list_notes | Meeting prep, insights |
| Deals | create_deal, update_deal_stage | Post-call, risk alerts |
| Deals | assign_deal_to_lead | Link deals from forms |
| Tasks | create_task, reschedule_task | Follow-ups, reminders |
| Website | modify_website, add_section | All website changes |
| Website | get_website_structure | Before making changes |
| Workflows | create_workflow, add_workflow_task | Automation from natural language |
| Comm | draft_email, send_sms, etc. | Templates, sequences |
| Appointments | create_appointment | Booking widget |
| Voice | proxyToActionsAPI | All new tools |
