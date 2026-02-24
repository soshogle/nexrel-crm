# Orthodontist Demo Account – Complete Mock Data Plan

**Target:** orthodontist@nexrel.com | **Region:** Quebec, Canada | **Currency:** CAD

---

## Phase 1: Foundation & User Setup ✅
- User: ensure industry ORTHODONTIST, onboarding complete, Quebec timezone, CAD
- **Clinic** (1): Montreal Orthodontics, Quebec address
- **UserClinic** (1): user linked to clinic, OWNER, isPrimary
- **AppointmentType** (5–8): Consultation, Adjustment, Retainer Check, Emergency, etc.
- **BookingWidgetSettings** (1): business name, hours, timezone America/Montreal
- **AutoReplySettings** (1): business hours, tone, language
- **KnowledgeBase** (10–15): services, FAQs, insurance, care instructions
- **EmailTemplate** (5–10): welcome, appointment_reminder, follow_up, invoice
- **SMSTemplate** (5–10): appointment_reminder, welcome, care_instructions
- **IndustryAIEmployeeAgent** (4): APPOINTMENT_SCHEDULER, PATIENT_COORDINATOR, TREATMENT_COORDINATOR, BILLING_SPECIALIST

---

## Phase 2: Core CRM – Leads, Contacts, Notes, Emails ✅
- **Leads** (50): Quebec addresses (Montreal, Quebec City, Laval, etc.), contactType mix (customer/prospect/partner)
- **Notes** (150–400): 3–8 per lead, orthodontist content
- **Message** (100–250): 2–5 per lead, messageType
- Lead fields: address, city, state (QC), zipCode (H1A–J9Z), country CA, dentalHistory, insuranceInfo, tags

---

## Phase 3: Pipeline, Deals, Payments ✅
- **Pipeline** (1) + **PipelineStage** (7)
- **Deal** (50+): all stages, CAD values, orthodontist titles
- **DealActivity** (100–300): 2–6 per deal
- **Payment** (30–50): DEAL, INVOICE, SERVICE, APPOINTMENT
- **Invoice** (15–25): PAID, PENDING, OVERDUE

---

## Phase 4: Inventory & E-Commerce ✅
- **GeneralInventoryItem** (20–30): brackets, wires, retainers, aligners
- **GeneralInventoryCategory**, **GeneralInventorySupplier**, **GeneralInventoryLocation**
- **Product** (10–15): retainers, aligners, care kits
- **Order** (10–15) + **OrderItem**

---

## Phase 5: Clinical & Administrative Dashboards ✅
- **DentalOdontogram**, **DentalPeriodontalChart**: per selected leads
- **DentalTreatmentPlan**, **DentalProcedure**: orthodontist procedures
- **DentalXRay** (metadata), **DentalForm**, **DentalFormResponse**
- **DentalInsuranceClaim**, **DentalLabOrder**
- **BookingAppointment** (30–50): past and future
- **PatientDocument** (10–20): metadata only

---

## Phase 6: Referrals, Reviews, Reports ✅
- **Referral** (10–15): referrer → converted
- **Review** (15–25): GOOGLE, FACEBOOK, WEBSITE
- **AiGeneratedReport** (5–10)
- **FeedbackCollection** (10–15)
- **BrandScan** (1–2), **BrandMention** (5–10)

---

## Phase 7: Campaigns & Drip ✅
- **EmailDripCampaign** (10) + sequences + **EmailDripEnrollment**, **EmailDripMessage**
- **Campaign** (3–5 legacy): REVIEW_REQUEST, REFERRAL, EMAIL, SMS
- **CampaignLead**, **CampaignMessage**
- **EmailCampaign** (2–3), **SmsCampaign** (2–3)
- **ScheduledEmail** (5–15), **ScheduledSms** (5–15)

---

## Phase 8: Workflows (10 Orthodontist) ✅
- **WorkflowTemplate** (10): New Patient Onboarding, Consultation Follow-up, Appointment Reminder, etc.
- **WorkflowTask** per template
- **WorkflowInstance**, **WorkflowTemplateEnrollment**
- **TaskTemplate** (5–8), **TaskAutomation** (2–3)

---

## Phase 9: Messaging & Conversations ✅
- **ChannelConnection** (2–4): SMS, EMAIL, WHATSAPP, GOOGLE_BUSINESS
- **Conversation** (20–30), **ConversationMessage** (60–300)

---

## Phase 10: Call Logs & Voice ✅
- **CallLog** (15–25): INBOUND/OUTBOUND, transcription, sentiment
- **OutboundCall** (5–10)
- **VoiceAgent** (1–2), **VoiceUsage**, **PurchasedPhoneNumber** (1–2)

---

## Phase 11: DocPen (10 Completed Sessions) ✅
- **DocpenSession** (10): status SIGNED, transcriptionComplete, soapNoteGenerated
- **DocpenTranscription**, **DocpenSOAPNote**, **DocpenSessionAuditLog**

---

## Phase 12: AI Jobs & Human Tasks ✅
- **AIEmployee** + **AIJob** (50): various jobTypes, mostly COMPLETED
- **Task** (50): mix TODO, IN_PROGRESS, COMPLETED, aiSuggested
- **IndustryAIEmployeeExecution** (20–30)

---

## Phase 13: Final Integration ✅
- **DataInsight** (5–10)
- **AuditLog** (20–30)
- **TeamMember** (2–4)
- **CalendarConnection** (1) – if applicable
- **DataInsight** (5–10)
