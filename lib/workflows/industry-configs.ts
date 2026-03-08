/**
 * Industry Configuration System
 * Defines task types, AI agents, templates, and integrations for each industry
 */

import { Industry } from "@prisma/client";

export interface IndustryTaskType {
  value: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export interface IndustryAIAgent {
  id: string;
  name: string;
  role: string;
  color: string;
  description: string;
}

export interface IndustryWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  workflowType: string;
  tasks: Array<{
    name: string;
    description: string;
    taskType: string;
    agentName?: string;
    delayValue: number;
    delayUnit: "MINUTES" | "HOURS" | "DAYS";
    isHITL: boolean;
    displayOrder: number;
  }>;
}

export interface IndustryConfig {
  industry: Industry;
  taskTypes: IndustryTaskType[];
  aiAgents: IndustryAIAgent[];
  templates: IndustryWorkflowTemplate[];
  fieldLabels: {
    contact: string; // "Patient", "Customer", "Lead", etc.
    deal: string; // "Deal", "Project", "Order", etc.
  };
  integrations: string[]; // ["Docpen", "Calendar", "POS", etc.]
}

// ==========================================
// MEDICAL INDUSTRY CONFIG
// ==========================================

export const MEDICAL_CONFIG: IndustryConfig = {
  industry: "MEDICAL",
  taskTypes: [
    {
      value: "LEAD_RESEARCH",
      label: "Lead Research",
      icon: "🔍",
      color: "#3B82F6",
      description: "Research lead information",
    },
    {
      value: "PATIENT_RESEARCH",
      label: "Patient Research",
      icon: "👤",
      color: "#10B981",
      description: "Research patient history and preferences",
    },
    {
      value: "APPOINTMENT_BOOKING",
      label: "Appointment Booking",
      icon: "📅",
      color: "#8B5CF6",
      description: "Schedule patient appointment",
    },
    {
      value: "APPOINTMENT_REMINDER",
      label: "Appointment Reminder",
      icon: "⏰",
      color: "#F59E0B",
      description: "Send appointment reminder",
    },
    {
      value: "PRESCRIPTION_REMINDER",
      label: "Prescription Reminder",
      icon: "💊",
      color: "#EF4444",
      description: "Remind patient about prescriptions",
    },
    {
      value: "TEST_RESULTS_NOTIFICATION",
      label: "Test Results",
      icon: "📋",
      color: "#06B6D4",
      description: "Notify patient of test results",
    },
    {
      value: "REFERRAL_COORDINATION",
      label: "Referral Coordination",
      icon: "🔄",
      color: "#EC4899",
      description: "Coordinate specialist referral",
    },
    {
      value: "FOLLOW_UP_CALL",
      label: "Follow-up Call",
      icon: "📞",
      color: "#14B8A6",
      description: "Follow-up with patient",
    },
    {
      value: "PATIENT_ONBOARDING",
      label: "Patient Onboarding",
      icon: "🎯",
      color: "#6366F1",
      description: "Onboard new patient",
    },
    {
      value: "POST_VISIT_FOLLOWUP",
      label: "Post-Visit Follow-up",
      icon: "✅",
      color: "#84CC16",
      description: "Follow up after visit",
    },
    {
      value: "INSURANCE_VERIFICATION",
      label: "Insurance Verification",
      icon: "🛡️",
      color: "#F97316",
      description: "Verify insurance coverage",
    },
    {
      value: "CUSTOM",
      label: "Custom Task",
      icon: "⚙️",
      color: "#6B7280",
      description: "Custom workflow task",
    },
  ],
  aiAgents: [
    {
      id: "appointment_scheduler",
      name: "Sarah",
      role: "Appointment Scheduler",
      color: "#FF6B6B",
      description: "Handles appointment booking and scheduling",
    },
    {
      id: "patient_coordinator",
      name: "Michael",
      role: "Patient Coordinator",
      color: "#4ECDC4",
      description: "Manages patient communication and coordination",
    },
    {
      id: "referral_specialist",
      name: "Jessica",
      role: "Referral Specialist",
      color: "#45B7D1",
      description: "Coordinates specialist referrals",
    },
    {
      id: "prescription_manager",
      name: "Alex",
      role: "Prescription Manager",
      color: "#96CEB4",
      description: "Manages prescription reminders and refills",
    },
    {
      id: "insurance_verifier",
      name: "Emma",
      role: "Insurance Verifier",
      color: "#FFEAA7",
      description: "Verifies insurance coverage",
    },
    {
      id: "follow_up_coordinator",
      name: "David",
      role: "Follow-up Coordinator",
      color: "#DDA0DD",
      description: "Coordinates post-visit follow-ups",
    },
  ],
  templates: [
    {
      id: "patient-onboarding",
      name: "Patient Onboarding",
      description: "Complete patient onboarding workflow",
      workflowType: "PATIENT_ONBOARDING",
      tasks: [
        {
          name: "Research Patient",
          taskType: "PATIENT_RESEARCH",
          description: "Research patient history",
          delayValue: 0,
          delayUnit: "MINUTES",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Verify Insurance",
          taskType: "INSURANCE_VERIFICATION",
          description: "Verify insurance coverage",
          delayValue: 30,
          delayUnit: "MINUTES",
          isHITL: true,
          displayOrder: 2,
        },
        {
          name: "Schedule Initial Appointment",
          taskType: "APPOINTMENT_BOOKING",
          description: "Book first appointment",
          delayValue: 1,
          delayUnit: "HOURS",
          isHITL: false,
          displayOrder: 3,
        },
        {
          name: "Send Welcome Email",
          taskType: "CUSTOM",
          description: "Send welcome information",
          delayValue: 2,
          delayUnit: "HOURS",
          isHITL: false,
          displayOrder: 4,
        },
      ],
    },
    {
      id: "appointment-reminder",
      name: "Appointment Reminder Sequence",
      description: "Automated appointment reminders",
      workflowType: "APPOINTMENT_REMINDER_SEQUENCE",
      tasks: [
        {
          name: "Send Reminder (3 days)",
          taskType: "APPOINTMENT_REMINDER",
          description: "First reminder",
          delayValue: 3,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Send Reminder (1 day)",
          taskType: "APPOINTMENT_REMINDER",
          description: "Second reminder",
          delayValue: 1,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 2,
        },
        {
          name: "Confirm Appointment",
          taskType: "FOLLOW_UP_CALL",
          description: "Final confirmation call",
          delayValue: 2,
          delayUnit: "HOURS",
          isHITL: false,
          displayOrder: 3,
        },
      ],
    },
  ],
  fieldLabels: {
    contact: "Patient",
    deal: "Appointment",
  },
  integrations: ["Docpen", "Calendar", "Pharmacy Systems", "Insurance APIs"],
};

// ==========================================
// RESTAURANT INDUSTRY CONFIG
// ==========================================

export const RESTAURANT_CONFIG: IndustryConfig = {
  industry: "RESTAURANT",
  taskTypes: [
    {
      value: "LEAD_RESEARCH",
      label: "Lead Research",
      icon: "🔍",
      color: "#3B82F6",
      description: "Research lead information",
    },
    {
      value: "CUSTOMER_RESEARCH",
      label: "Customer Research",
      icon: "👤",
      color: "#10B981",
      description: "Research customer preferences",
    },
    {
      value: "RESERVATION_CONFIRMATION",
      label: "Reservation Confirmation",
      icon: "📅",
      color: "#8B5CF6",
      description: "Confirm reservation",
    },
    {
      value: "RESERVATION_REMINDER",
      label: "Reservation Reminder",
      icon: "⏰",
      color: "#F59E0B",
      description: "Remind about reservation",
    },
    {
      value: "ORDER_TRACKING",
      label: "Order Tracking",
      icon: "📦",
      color: "#EF4444",
      description: "Track order status",
    },
    {
      value: "MENU_RECOMMENDATION",
      label: "Menu Recommendation",
      icon: "🍽️",
      color: "#06B6D4",
      description: "Recommend menu items",
    },
    {
      value: "LOYALTY_POINTS_UPDATE",
      label: "Loyalty Points",
      icon: "⭐",
      color: "#EC4899",
      description: "Update loyalty points",
    },
    {
      value: "FEEDBACK_REQUEST",
      label: "Feedback Request",
      icon: "💬",
      color: "#14B8A6",
      description: "Request customer feedback",
    },
    {
      value: "SPECIAL_OFFER_NOTIFICATION",
      label: "Special Offer",
      icon: "🎁",
      color: "#6366F1",
      description: "Send special offers",
    },
    {
      value: "BIRTHDAY_GREETING",
      label: "Birthday Greeting",
      icon: "🎂",
      color: "#84CC16",
      description: "Send birthday greeting",
    },
    {
      value: "CUSTOM",
      label: "Custom Task",
      icon: "⚙️",
      color: "#6B7280",
      description: "Custom workflow task",
    },
  ],
  aiAgents: [
    {
      id: "reservation_coordinator",
      name: "Sarah",
      role: "Reservation Coordinator",
      color: "#FF6B6B",
      description: "Manages reservations",
    },
    {
      id: "order_tracker",
      name: "Michael",
      role: "Order Tracker",
      color: "#4ECDC4",
      description: "Tracks and updates orders",
    },
    {
      id: "loyalty_manager",
      name: "Jessica",
      role: "Loyalty Manager",
      color: "#45B7D1",
      description: "Manages loyalty program",
    },
    {
      id: "menu_advisor",
      name: "Alex",
      role: "Menu Advisor",
      color: "#96CEB4",
      description: "Provides menu recommendations",
    },
    {
      id: "customer_service",
      name: "Emma",
      role: "Customer Service Specialist",
      color: "#FFEAA7",
      description: "Handles customer service",
    },
    {
      id: "marketing_coordinator",
      name: "David",
      role: "Marketing Coordinator",
      color: "#DDA0DD",
      description: "Manages marketing campaigns",
    },
  ],
  templates: [
    {
      id: "new-customer-welcome",
      name: "New Customer Welcome",
      description: "Welcome new customers",
      workflowType: "NEW_CUSTOMER_WELCOME",
      tasks: [
        {
          name: "Research Customer",
          taskType: "CUSTOMER_RESEARCH",
          description: "Research preferences",
          delayValue: 0,
          delayUnit: "MINUTES",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Send Welcome Email",
          taskType: "CUSTOM",
          description: "Welcome message",
          delayValue: 1,
          delayUnit: "HOURS",
          isHITL: false,
          displayOrder: 2,
        },
        {
          name: "Enroll in Loyalty",
          taskType: "LOYALTY_POINTS_UPDATE",
          description: "Enroll in program",
          delayValue: 2,
          delayUnit: "HOURS",
          isHITL: false,
          displayOrder: 3,
        },
      ],
    },
  ],
  fieldLabels: {
    contact: "Customer",
    deal: "Order",
  },
  integrations: [
    "POS Systems",
    "Reservation Systems",
    "Delivery Platforms",
    "Loyalty APIs",
  ],
};

// ==========================================
// CONSTRUCTION INDUSTRY CONFIG
// ==========================================

export const CONSTRUCTION_CONFIG: IndustryConfig = {
  industry: "CONSTRUCTION",
  taskTypes: [
    {
      value: "LEAD_RESEARCH",
      label: "Lead Research",
      icon: "🔍",
      color: "#3B82F6",
      description: "Research lead information",
    },
    {
      value: "PROJECT_RESEARCH",
      label: "Project Research",
      icon: "🏗️",
      color: "#10B981",
      description: "Research project requirements",
    },
    {
      value: "QUOTE_GENERATION",
      label: "Quote Generation",
      icon: "💰",
      color: "#8B5CF6",
      description: "Generate project quote",
    },
    {
      value: "QUOTE_FOLLOWUP",
      label: "Quote Follow-up",
      icon: "📞",
      color: "#F59E0B",
      description: "Follow up on quote",
    },
    {
      value: "PERMIT_TRACKING",
      label: "Permit Tracking",
      icon: "📋",
      color: "#EF4444",
      description: "Track permit status",
    },
    {
      value: "INSPECTION_SCHEDULING",
      label: "Inspection Scheduling",
      icon: "🔍",
      color: "#06B6D4",
      description: "Schedule inspections",
    },
    {
      value: "MATERIAL_ORDERING",
      label: "Material Ordering",
      icon: "📦",
      color: "#EC4899",
      description: "Order materials",
    },
    {
      value: "PROGRESS_UPDATE",
      label: "Progress Update",
      icon: "📊",
      color: "#14B8A6",
      description: "Update project progress",
    },
    {
      value: "PAYMENT_REMINDER",
      label: "Payment Reminder",
      icon: "💳",
      color: "#6366F1",
      description: "Remind about payments",
    },
    {
      value: "PROJECT_COMPLETION",
      label: "Project Completion",
      icon: "✅",
      color: "#84CC16",
      description: "Complete project",
    },
    {
      value: "CUSTOM",
      label: "Custom Task",
      icon: "⚙️",
      color: "#6B7280",
      description: "Custom workflow task",
    },
  ],
  aiAgents: [
    {
      id: "quote_specialist",
      name: "Sarah",
      role: "Quote Specialist",
      color: "#FF6B6B",
      description: "Generates project quotes",
    },
    {
      id: "permit_coordinator",
      name: "Michael",
      role: "Permit Coordinator",
      color: "#4ECDC4",
      description: "Tracks permits",
    },
    {
      id: "inspection_scheduler",
      name: "Jessica",
      role: "Inspection Scheduler",
      color: "#45B7D1",
      description: "Schedules inspections",
    },
    {
      id: "material_manager",
      name: "Alex",
      role: "Material Manager",
      color: "#96CEB4",
      description: "Orders materials",
    },
    {
      id: "project_coordinator",
      name: "Emma",
      role: "Project Coordinator",
      color: "#FFEAA7",
      description: "Coordinates projects",
    },
    {
      id: "client_communicator",
      name: "David",
      role: "Client Communicator",
      color: "#DDA0DD",
      description: "Communicates with clients",
    },
  ],
  templates: [
    {
      id: "lead-qualification",
      name: "Lead Qualification",
      description: "Qualify construction leads",
      workflowType: "LEAD_QUALIFICATION",
      tasks: [
        {
          name: "Research Lead",
          taskType: "LEAD_RESEARCH",
          description: "Research lead",
          delayValue: 0,
          delayUnit: "MINUTES",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Generate Quote",
          taskType: "QUOTE_GENERATION",
          description: "Create quote",
          delayValue: 1,
          delayUnit: "HOURS",
          isHITL: true,
          displayOrder: 2,
        },
        {
          name: "Follow-up Call",
          taskType: "QUOTE_FOLLOWUP",
          description: "Follow up",
          delayValue: 2,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 3,
        },
      ],
    },
  ],
  fieldLabels: {
    contact: "Client",
    deal: "Project",
  },
  integrations: [
    "Permit Databases",
    "Material Supplier APIs",
    "Inspection Systems",
    "Project Management Tools",
  ],
};

// ==========================================
// RETAIL INDUSTRY CONFIG
// ==========================================

export const RETAIL_CONFIG: IndustryConfig = {
  industry: "RETAIL",
  taskTypes: [
    {
      value: "LEAD_RESEARCH",
      label: "Lead Research",
      icon: "🔍",
      color: "#3B82F6",
      description: "Research lead information",
    },
    {
      value: "CUSTOMER_RESEARCH",
      label: "Customer Research",
      icon: "👤",
      color: "#10B981",
      description: "Research customer preferences and purchase history",
    },
    {
      value: "ORDER_CONFIRMATION",
      label: "Order Confirmation",
      icon: "📦",
      color: "#8B5CF6",
      description: "Confirm customer order",
    },
    {
      value: "SHIPPING_NOTIFICATION",
      label: "Shipping Notification",
      icon: "🚚",
      color: "#F59E0B",
      description: "Notify customer of shipment",
    },
    {
      value: "INVENTORY_ALERT",
      label: "Inventory Alert",
      icon: "📊",
      color: "#EF4444",
      description: "Alert on low stock or restock",
    },
    {
      value: "RETURN_PROCESSING",
      label: "Return Processing",
      icon: "🔄",
      color: "#06B6D4",
      description: "Process product return or exchange",
    },
    {
      value: "LOYALTY_POINTS_UPDATE",
      label: "Loyalty Points",
      icon: "⭐",
      color: "#EC4899",
      description: "Update loyalty points",
    },
    {
      value: "FEEDBACK_REQUEST",
      label: "Feedback Request",
      icon: "💬",
      color: "#14B8A6",
      description: "Request customer feedback",
    },
    {
      value: "PROMOTION_NOTIFICATION",
      label: "Promotion Notification",
      icon: "🎁",
      color: "#6366F1",
      description: "Send promotional offers",
    },
    {
      value: "ABANDONED_CART_FOLLOWUP",
      label: "Abandoned Cart Follow-up",
      icon: "🛒",
      color: "#84CC16",
      description: "Follow up on abandoned carts",
    },
    {
      value: "CUSTOM",
      label: "Custom Task",
      icon: "⚙️",
      color: "#6B7280",
      description: "Custom workflow task",
    },
  ],
  aiAgents: [
    {
      id: "order_coordinator",
      name: "Sarah",
      role: "Order Coordinator",
      color: "#FF6B6B",
      description: "Manages order processing and confirmations",
    },
    {
      id: "inventory_manager",
      name: "Michael",
      role: "Inventory Manager",
      color: "#4ECDC4",
      description: "Tracks inventory and restock alerts",
    },
    {
      id: "loyalty_manager",
      name: "Jessica",
      role: "Loyalty Manager",
      color: "#45B7D1",
      description: "Manages loyalty and rewards program",
    },
    {
      id: "customer_service",
      name: "Alex",
      role: "Customer Service Specialist",
      color: "#96CEB4",
      description: "Handles customer inquiries and returns",
    },
    {
      id: "marketing_coordinator",
      name: "Emma",
      role: "Marketing Coordinator",
      color: "#FFEAA7",
      description: "Manages promotions and campaigns",
    },
    {
      id: "personal_shopper",
      name: "David",
      role: "Personal Shopper",
      color: "#DDA0DD",
      description: "Provides personalized shopping assistance",
    },
  ],
  templates: [
    {
      id: "new-customer-welcome",
      name: "New Customer Welcome",
      description: "Welcome new retail customers",
      workflowType: "NEW_CUSTOMER_WELCOME",
      tasks: [
        {
          name: "Research Customer",
          taskType: "CUSTOMER_RESEARCH",
          description: "Research preferences",
          delayValue: 0,
          delayUnit: "MINUTES",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Send Welcome Email",
          taskType: "CUSTOM",
          description: "Welcome message with first-time discount",
          delayValue: 1,
          delayUnit: "HOURS",
          isHITL: false,
          displayOrder: 2,
        },
        {
          name: "Enroll in Loyalty",
          taskType: "LOYALTY_POINTS_UPDATE",
          description: "Enroll in rewards program",
          delayValue: 2,
          delayUnit: "HOURS",
          isHITL: false,
          displayOrder: 3,
        },
      ],
    },
    {
      id: "abandoned-cart-recovery",
      name: "Abandoned Cart Recovery",
      description: "Recover abandoned shopping carts",
      workflowType: "ABANDONED_CART_RECOVERY",
      tasks: [
        {
          name: "Send Cart Reminder",
          taskType: "ABANDONED_CART_FOLLOWUP",
          description: "Remind about items in cart",
          delayValue: 2,
          delayUnit: "HOURS",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Offer Discount",
          taskType: "PROMOTION_NOTIFICATION",
          description: "Send discount offer",
          delayValue: 1,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 2,
        },
        {
          name: "Final Follow-up",
          taskType: "FEEDBACK_REQUEST",
          description: "Ask if they need help",
          delayValue: 3,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 3,
        },
      ],
    },
  ],
  fieldLabels: {
    contact: "Customer",
    deal: "Order",
  },
  integrations: [
    "POS Systems",
    "Inventory Management",
    "Shipping APIs",
    "Loyalty Platforms",
  ],
};

// ==========================================
// ORTHODONTIST INDUSTRY CONFIG (Yul Smile)
// ==========================================

import { ORTHODONTIST_WORKFLOW_TEMPLATES } from "@/lib/orthodontist/workflow-templates";

export const ORTHODONTIST_CONFIG: IndustryConfig = {
  industry: "ORTHODONTIST",
  taskTypes: [
    ...MEDICAL_CONFIG.taskTypes,
    {
      value: "CONSENT_LINK",
      label: "Send Consent Link",
      icon: "📋",
      color: "#8B5CF6",
      description: "Send Law 25 consent and forms link",
    },
    {
      value: "ORTHODONTIC_REPORT",
      label: "Orthodontic Report",
      icon: "📄",
      color: "#06B6D4",
      description: "Draft formal orthodontic report letter",
    },
    {
      value: "FINANCIAL_AGREEMENT",
      label: "Financial Agreement",
      icon: "💰",
      color: "#10B981",
      description: "Generate and send financial agreement",
    },
  ],
  aiAgents: [
    {
      id: "admissions_specialist",
      name: "Admissions Specialist",
      role: "Admissions (Law 25)",
      color: "#FF6B6B",
      description: "Handles pre-visit forms and consents",
    },
    {
      id: "referrals_specialist",
      name: "Referrals Specialist",
      role: "Referrals & Clinical Reports",
      color: "#4ECDC4",
      description: "Processes referrals and drafts reports",
    },
    {
      id: "treatment_coordinator",
      name: "Treatment Coordinator",
      role: "Treatment Coordinator",
      color: "#45B7D1",
      description: "Financial agreements and signing",
    },
    {
      id: "conversion_specialist",
      name: "Conversion Specialist",
      role: "Treatment Conversion",
      color: "#96CEB4",
      description: "Converts undecided patients",
    },
    ...MEDICAL_CONFIG.aiAgents,
  ],
  templates: ORTHODONTIST_WORKFLOW_TEMPLATES,
  fieldLabels: {
    contact: "Patient",
    deal: "Treatment Plan",
  },
  integrations: ["Docpen", "Calendar", "Law 25 Forms", "Insurance APIs"],
};

export const DENTIST_CONFIG: IndustryConfig = {
  industry: "DENTIST",
  taskTypes: [
    {
      value: "LEAD_RESEARCH",
      label: "Lead Research",
      icon: "🔍",
      color: "#3B82F6",
      description: "Research patient inquiry and treatment intent",
    },
    {
      value: "PATIENT_INTAKE",
      label: "Patient Intake",
      icon: "🦷",
      color: "#10B981",
      description: "Collect dental history and intake details",
    },
    {
      value: "INSURANCE_VERIFICATION",
      label: "Insurance Verification",
      icon: "🛡️",
      color: "#8B5CF6",
      description: "Verify coverage and eligibility",
    },
    {
      value: "TREATMENT_PLAN_FOLLOWUP",
      label: "Treatment Plan Follow-up",
      icon: "📋",
      color: "#F59E0B",
      description: "Follow up on accepted or pending plans",
    },
    {
      value: "HYGIENE_RECALL",
      label: "Hygiene Recall",
      icon: "🪥",
      color: "#EF4444",
      description: "Schedule and remind periodic hygiene visits",
    },
    {
      value: "APPOINTMENT_CONFIRMATION",
      label: "Appointment Confirmation",
      icon: "📅",
      color: "#06B6D4",
      description: "Confirm upcoming appointments",
    },
    {
      value: "POST_OP_FOLLOWUP",
      label: "Post-Op Follow-up",
      icon: "✅",
      color: "#EC4899",
      description: "Check in after procedures",
    },
    {
      value: "UNSCHEDULED_TREATMENT_RECALL",
      label: "Unscheduled Treatment",
      icon: "⏰",
      color: "#14B8A6",
      description: "Follow up on diagnosed unscheduled treatment",
    },
    {
      value: "BILLING_REMINDER",
      label: "Billing Reminder",
      icon: "💳",
      color: "#6366F1",
      description: "Remind patients about pending balances",
    },
    {
      value: "CUSTOM",
      label: "Custom Task",
      icon: "⚙️",
      color: "#6B7280",
      description: "Custom workflow task",
    },
  ],
  aiAgents: [
    {
      id: "patient_intake_specialist",
      name: "Sophie",
      role: "Patient Intake Specialist",
      color: "#FF6B6B",
      description: "Handles first contact and intake completion",
    },
    {
      id: "insurance_coordinator",
      name: "Daniel",
      role: "Insurance Coordinator",
      color: "#4ECDC4",
      description: "Verifies benefits and treatment eligibility",
    },
    {
      id: "recall_coordinator",
      name: "Nora",
      role: "Recall Coordinator",
      color: "#45B7D1",
      description: "Manages hygiene and unscheduled treatment recalls",
    },
    {
      id: "treatment_followup_specialist",
      name: "Henry",
      role: "Treatment Follow-up Specialist",
      color: "#96CEB4",
      description: "Follows up on treatment plan acceptance",
    },
    {
      id: "post_op_care_coordinator",
      name: "Lily",
      role: "Post-Op Care Coordinator",
      color: "#FFEAA7",
      description: "Runs post-op check-ins and risk triage",
    },
    {
      id: "financial_coordinator",
      name: "Jack",
      role: "Financial Coordinator",
      color: "#DDA0DD",
      description: "Handles billing follow-up and payment reminders",
    },
  ],
  templates: [
    {
      id: "new-patient-intake-and-booking",
      name: "New Patient Intake and Booking",
      description: "Move new inquiries from intake to confirmed appointment",
      workflowType: "NEW_PATIENT_INTAKE_AND_BOOKING",
      tasks: [
        {
          name: "Patient Intake",
          taskType: "PATIENT_INTAKE",
          description: "Collect medical and dental intake details",
          delayValue: 0,
          delayUnit: "MINUTES",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Verify Insurance",
          taskType: "INSURANCE_VERIFICATION",
          description: "Check active benefits before booking",
          delayValue: 30,
          delayUnit: "MINUTES",
          isHITL: true,
          displayOrder: 2,
        },
        {
          name: "Confirm Appointment",
          taskType: "APPOINTMENT_CONFIRMATION",
          description: "Confirm first appointment slot",
          delayValue: 2,
          delayUnit: "HOURS",
          isHITL: false,
          displayOrder: 3,
        },
      ],
    },
    {
      id: "hygiene-and-unscheduled-recall",
      name: "Hygiene and Unscheduled Recall",
      description: "Recover overdue hygiene and unscheduled treatment cases",
      workflowType: "HYGIENE_AND_UNSCHEDULED_RECALL",
      tasks: [
        {
          name: "Hygiene Recall",
          taskType: "HYGIENE_RECALL",
          description: "Send hygiene visit reminder",
          delayValue: 30,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Unscheduled Treatment Follow-up",
          taskType: "UNSCHEDULED_TREATMENT_RECALL",
          description: "Follow up on pending diagnosed treatment",
          delayValue: 14,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 2,
        },
        {
          name: "Treatment Plan Follow-up",
          taskType: "TREATMENT_PLAN_FOLLOWUP",
          description: "Help patient schedule accepted treatment",
          delayValue: 7,
          delayUnit: "DAYS",
          isHITL: true,
          displayOrder: 3,
        },
      ],
    },
  ],
  fieldLabels: {
    contact: "Patient",
    deal: "Treatment",
  },
  integrations: ["Dental PMS", "X-Ray Systems", "Insurance APIs", "Calendar"],
};

export const MEDICAL_SPA_CONFIG: IndustryConfig = {
  industry: "MEDICAL_SPA",
  taskTypes: [
    {
      value: "LEAD_RESEARCH",
      label: "Lead Research",
      icon: "🔍",
      color: "#3B82F6",
      description: "Research client goals and treatment interests",
    },
    {
      value: "CONSULTATION_BOOKING",
      label: "Consultation Booking",
      icon: "📅",
      color: "#10B981",
      description: "Schedule aesthetic consultation",
    },
    {
      value: "PRE_VISIT_INTAKE",
      label: "Pre-Visit Intake",
      icon: "📝",
      color: "#8B5CF6",
      description: "Collect intake forms and contraindication details",
    },
    {
      value: "TREATMENT_PLAN_FOLLOWUP",
      label: "Treatment Plan Follow-up",
      icon: "💆",
      color: "#F59E0B",
      description: "Follow up on proposed treatment plans",
    },
    {
      value: "MEMBERSHIP_ENROLLMENT",
      label: "Membership Enrollment",
      icon: "⭐",
      color: "#EF4444",
      description: "Enroll clients into membership plans",
    },
    {
      value: "POST_TREATMENT_CARE",
      label: "Post-Treatment Care",
      icon: "✅",
      color: "#06B6D4",
      description: "Send post-care instructions and check-ins",
    },
    {
      value: "REBOOKING_REMINDER",
      label: "Rebooking Reminder",
      icon: "🔁",
      color: "#EC4899",
      description: "Prompt clients to schedule next session",
    },
    {
      value: "PROMOTION_NOTIFICATION",
      label: "Promotion Notification",
      icon: "🎁",
      color: "#14B8A6",
      description: "Share packages and seasonal offers",
    },
    {
      value: "PAYMENT_FOLLOWUP",
      label: "Payment Follow-up",
      icon: "💳",
      color: "#6366F1",
      description: "Follow up on pending invoices or deposits",
    },
    {
      value: "CUSTOM",
      label: "Custom Task",
      icon: "⚙️",
      color: "#6B7280",
      description: "Custom workflow task",
    },
  ],
  aiAgents: [
    {
      id: "consultation_coordinator",
      name: "Isabella",
      role: "Consultation Coordinator",
      color: "#FF6B6B",
      description: "Books and confirms new consultations",
    },
    {
      id: "intake_specialist",
      name: "Mason",
      role: "Intake Specialist",
      color: "#4ECDC4",
      description: "Collects forms and treatment readiness details",
    },
    {
      id: "treatment_followup_coordinator",
      name: "Avery",
      role: "Treatment Follow-up Coordinator",
      color: "#45B7D1",
      description: "Drives conversion from consult to booked treatment",
    },
    {
      id: "membership_manager",
      name: "Ethan",
      role: "Membership Manager",
      color: "#96CEB4",
      description: "Manages membership plans and retention",
    },
    {
      id: "aftercare_specialist",
      name: "Chloe",
      role: "Aftercare Specialist",
      color: "#FFEAA7",
      description: "Runs post-treatment care workflows",
    },
    {
      id: "promotions_coordinator",
      name: "Noah",
      role: "Promotions Coordinator",
      color: "#DDA0DD",
      description: "Manages campaigns and rebooking promotions",
    },
  ],
  templates: [
    {
      id: "new-consultation-to-treatment",
      name: "New Consultation to Treatment",
      description: "Convert consultation leads into booked treatment sessions",
      workflowType: "NEW_CONSULTATION_TO_TREATMENT",
      tasks: [
        {
          name: "Consultation Booking",
          taskType: "CONSULTATION_BOOKING",
          description: "Book consultation slot",
          delayValue: 0,
          delayUnit: "MINUTES",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Pre-Visit Intake",
          taskType: "PRE_VISIT_INTAKE",
          description: "Collect intake forms and preferences",
          delayValue: 2,
          delayUnit: "HOURS",
          isHITL: false,
          displayOrder: 2,
        },
        {
          name: "Treatment Plan Follow-up",
          taskType: "TREATMENT_PLAN_FOLLOWUP",
          description: "Follow up after consultation",
          delayValue: 1,
          delayUnit: "DAYS",
          isHITL: true,
          displayOrder: 3,
        },
      ],
    },
    {
      id: "membership-and-rebooking",
      name: "Membership and Rebooking",
      description:
        "Retain clients with membership and repeat booking automation",
      workflowType: "MEMBERSHIP_AND_REBOOKING",
      tasks: [
        {
          name: "Membership Enrollment",
          taskType: "MEMBERSHIP_ENROLLMENT",
          description: "Offer and enroll membership",
          delayValue: 3,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Rebooking Reminder",
          taskType: "REBOOKING_REMINDER",
          description: "Prompt next treatment booking",
          delayValue: 30,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 2,
        },
        {
          name: "Promotion Notification",
          taskType: "PROMOTION_NOTIFICATION",
          description: "Share targeted package offer",
          delayValue: 45,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 3,
        },
      ],
    },
  ],
  fieldLabels: {
    contact: "Client",
    deal: "Service Plan",
  },
  integrations: [
    "Treatment Booking",
    "Membership Systems",
    "Payment APIs",
    "Calendar",
  ],
};

export const OPTOMETRIST_CONFIG: IndustryConfig = {
  industry: "OPTOMETRIST",
  taskTypes: [
    {
      value: "LEAD_RESEARCH",
      label: "Lead Research",
      icon: "🔍",
      color: "#3B82F6",
      description: "Research patient inquiry and visit reason",
    },
    {
      value: "EXAM_BOOKING",
      label: "Exam Booking",
      icon: "👓",
      color: "#10B981",
      description: "Schedule comprehensive eye exams",
    },
    {
      value: "INSURANCE_VERIFICATION",
      label: "Insurance Verification",
      icon: "🛡️",
      color: "#8B5CF6",
      description: "Verify vision plan benefits",
    },
    {
      value: "PRE_VISIT_FORMS",
      label: "Pre-Visit Forms",
      icon: "📋",
      color: "#F59E0B",
      description: "Collect intake and vision history forms",
    },
    {
      value: "LENS_ORDER_UPDATE",
      label: "Lens Order Update",
      icon: "🔬",
      color: "#EF4444",
      description: "Notify patients about lab/lens order status",
    },
    {
      value: "CONTACT_LENS_FOLLOWUP",
      label: "Contact Lens Follow-up",
      icon: "📦",
      color: "#06B6D4",
      description: "Follow up after contact lens fitting",
    },
    {
      value: "RECALL_REMINDER",
      label: "Annual Recall Reminder",
      icon: "⏰",
      color: "#EC4899",
      description: "Remind patients of annual exams",
    },
    {
      value: "FRAME_RECOMMENDATION",
      label: "Frame Recommendation",
      icon: "🕶️",
      color: "#14B8A6",
      description: "Send frame and lens package recommendations",
    },
    {
      value: "BILLING_FOLLOWUP",
      label: "Billing Follow-up",
      icon: "💳",
      color: "#6366F1",
      description: "Follow up on balances and copays",
    },
    {
      value: "CUSTOM",
      label: "Custom Task",
      icon: "⚙️",
      color: "#6B7280",
      description: "Custom workflow task",
    },
  ],
  aiAgents: [
    {
      id: "exam_scheduler",
      name: "Mila",
      role: "Exam Scheduler",
      color: "#FF6B6B",
      description: "Handles exam booking and confirmation",
    },
    {
      id: "vision_benefits_coordinator",
      name: "Liam",
      role: "Vision Benefits Coordinator",
      color: "#4ECDC4",
      description: "Verifies insurance and benefits",
    },
    {
      id: "optical_order_coordinator",
      name: "Aria",
      role: "Optical Order Coordinator",
      color: "#45B7D1",
      description: "Tracks lens and frame order updates",
    },
    {
      id: "contact_lens_specialist",
      name: "Ezra",
      role: "Contact Lens Specialist",
      color: "#96CEB4",
      description: "Runs contact lens follow-up sequences",
    },
    {
      id: "recall_manager",
      name: "Ava",
      role: "Recall Manager",
      color: "#FFEAA7",
      description: "Drives annual exam recall campaigns",
    },
    {
      id: "optical_retail_advisor",
      name: "Noah",
      role: "Optical Retail Advisor",
      color: "#DDA0DD",
      description: "Supports frame/lens recommendations",
    },
  ],
  templates: [
    {
      id: "new-exam-intake-and-confirmation",
      name: "New Exam Intake and Confirmation",
      description: "Move new patients from booking to exam readiness",
      workflowType: "NEW_EXAM_INTAKE_AND_CONFIRMATION",
      tasks: [
        {
          name: "Exam Booking",
          taskType: "EXAM_BOOKING",
          description: "Book appointment",
          delayValue: 0,
          delayUnit: "MINUTES",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Insurance Verification",
          taskType: "INSURANCE_VERIFICATION",
          description: "Validate plan coverage",
          delayValue: 30,
          delayUnit: "MINUTES",
          isHITL: true,
          displayOrder: 2,
        },
        {
          name: "Pre-Visit Forms",
          taskType: "PRE_VISIT_FORMS",
          description: "Collect forms before visit",
          delayValue: 2,
          delayUnit: "HOURS",
          isHITL: false,
          displayOrder: 3,
        },
      ],
    },
    {
      id: "optical-order-and-recall",
      name: "Optical Order and Recall",
      description: "Track optical orders and bring patients back annually",
      workflowType: "OPTICAL_ORDER_AND_RECALL",
      tasks: [
        {
          name: "Lens Order Update",
          taskType: "LENS_ORDER_UPDATE",
          description: "Send lab/order status",
          delayValue: 3,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Contact Lens Follow-up",
          taskType: "CONTACT_LENS_FOLLOWUP",
          description: "Check fitting and comfort",
          delayValue: 7,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 2,
        },
        {
          name: "Annual Recall Reminder",
          taskType: "RECALL_REMINDER",
          description: "Prompt annual exam booking",
          delayValue: 330,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 3,
        },
      ],
    },
  ],
  fieldLabels: {
    contact: "Patient",
    deal: "Exam Appointment",
  },
  integrations: ["Vision EMR", "Lab Orders", "Insurance APIs", "Calendar"],
};

export const HEALTH_CLINIC_CONFIG: IndustryConfig = {
  industry: "HEALTH_CLINIC",
  taskTypes: [
    {
      value: "LEAD_RESEARCH",
      label: "Lead Research",
      icon: "🔍",
      color: "#3B82F6",
      description: "Research patient request and care context",
    },
    {
      value: "INTAKE_TRIAGE",
      label: "Intake Triage",
      icon: "🩺",
      color: "#10B981",
      description: "Collect symptoms and route to appropriate care",
    },
    {
      value: "APPOINTMENT_SCHEDULING",
      label: "Appointment Scheduling",
      icon: "📅",
      color: "#8B5CF6",
      description: "Schedule clinic visits",
    },
    {
      value: "CARE_PLAN_ENROLLMENT",
      label: "Care Plan Enrollment",
      icon: "📋",
      color: "#F59E0B",
      description: "Enroll patients into chronic care plans",
    },
    {
      value: "LAB_FOLLOWUP",
      label: "Lab Follow-up",
      icon: "🧪",
      color: "#EF4444",
      description: "Follow up on pending labs and next steps",
    },
    {
      value: "MEDICATION_ADHERENCE_CHECK",
      label: "Medication Adherence",
      icon: "💊",
      color: "#06B6D4",
      description: "Check medication adherence and refills",
    },
    {
      value: "REFERRAL_COORDINATION",
      label: "Referral Coordination",
      icon: "🔄",
      color: "#EC4899",
      description: "Coordinate specialist referrals",
    },
    {
      value: "NO_SHOW_RECOVERY",
      label: "No-Show Recovery",
      icon: "⏰",
      color: "#14B8A6",
      description: "Recover missed appointments",
    },
    {
      value: "PREVENTIVE_RECALL",
      label: "Preventive Recall",
      icon: "✅",
      color: "#6366F1",
      description: "Remind preventive care follow-up",
    },
    {
      value: "CUSTOM",
      label: "Custom Task",
      icon: "⚙️",
      color: "#6B7280",
      description: "Custom workflow task",
    },
  ],
  aiAgents: [
    {
      id: "triage_coordinator",
      name: "Olivia",
      role: "Triage Coordinator",
      color: "#FF6B6B",
      description: "Manages first contact and triage routing",
    },
    {
      id: "care_navigator",
      name: "Elias",
      role: "Care Navigator",
      color: "#4ECDC4",
      description: "Coordinates appointments and care pathways",
    },
    {
      id: "lab_results_coordinator",
      name: "Emma",
      role: "Lab Results Coordinator",
      color: "#45B7D1",
      description: "Follows up on labs and patient notifications",
    },
    {
      id: "medication_followup_specialist",
      name: "Mason",
      role: "Medication Follow-up Specialist",
      color: "#96CEB4",
      description: "Tracks medication adherence and refill reminders",
    },
    {
      id: "referral_manager",
      name: "Avery",
      role: "Referral Manager",
      color: "#FFEAA7",
      description: "Handles specialist referral coordination",
    },
    {
      id: "preventive_care_coordinator",
      name: "Luna",
      role: "Preventive Care Coordinator",
      color: "#DDA0DD",
      description: "Runs preventive recall and no-show recovery",
    },
  ],
  templates: [
    {
      id: "patient-intake-to-care-plan",
      name: "Patient Intake to Care Plan",
      description: "Triage incoming patients and move them into active care",
      workflowType: "PATIENT_INTAKE_TO_CARE_PLAN",
      tasks: [
        {
          name: "Intake Triage",
          taskType: "INTAKE_TRIAGE",
          description: "Assess request and urgency",
          delayValue: 0,
          delayUnit: "MINUTES",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Appointment Scheduling",
          taskType: "APPOINTMENT_SCHEDULING",
          description: "Book next appropriate visit",
          delayValue: 30,
          delayUnit: "MINUTES",
          isHITL: false,
          displayOrder: 2,
        },
        {
          name: "Care Plan Enrollment",
          taskType: "CARE_PLAN_ENROLLMENT",
          description: "Enroll into relevant care pathway",
          delayValue: 1,
          delayUnit: "DAYS",
          isHITL: true,
          displayOrder: 3,
        },
      ],
    },
    {
      id: "followup-and-preventive-care",
      name: "Follow-up and Preventive Care",
      description: "Close the loop on labs, meds, and preventive visits",
      workflowType: "FOLLOWUP_AND_PREVENTIVE_CARE",
      tasks: [
        {
          name: "Lab Follow-up",
          taskType: "LAB_FOLLOWUP",
          description: "Follow up on outstanding lab work",
          delayValue: 3,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Medication Adherence Check",
          taskType: "MEDICATION_ADHERENCE_CHECK",
          description: "Check medication adherence",
          delayValue: 7,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 2,
        },
        {
          name: "Preventive Recall",
          taskType: "PREVENTIVE_RECALL",
          description: "Prompt preventive follow-up appointment",
          delayValue: 60,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 3,
        },
      ],
    },
  ],
  fieldLabels: {
    contact: "Patient",
    deal: "Care Plan",
  },
  integrations: [
    "Clinic EMR",
    "Referral Systems",
    "Insurance APIs",
    "Calendar",
  ],
};

export const HOSPITAL_CONFIG: IndustryConfig = {
  industry: "HOSPITAL",
  taskTypes: [
    {
      value: "LEAD_RESEARCH",
      label: "Case Research",
      icon: "🔍",
      color: "#3B82F6",
      description: "Research patient admission and case context",
    },
    {
      value: "ADMISSION_COORDINATION",
      label: "Admission Coordination",
      icon: "🏥",
      color: "#10B981",
      description: "Coordinate patient admission steps",
    },
    {
      value: "DISCHARGE_PLANNING",
      label: "Discharge Planning",
      icon: "🧾",
      color: "#8B5CF6",
      description: "Coordinate discharge tasks and instructions",
    },
    {
      value: "FOLLOWUP_APPOINTMENT",
      label: "Follow-up Appointment",
      icon: "📅",
      color: "#F59E0B",
      description: "Schedule post-discharge follow-up",
    },
    {
      value: "CARE_TRANSITION_OUTREACH",
      label: "Care Transition Outreach",
      icon: "🔄",
      color: "#EF4444",
      description: "Support transition between care settings",
    },
    {
      value: "TEST_RESULTS_NOTIFICATION",
      label: "Test Results Notification",
      icon: "🧪",
      color: "#06B6D4",
      description: "Notify patients on test result updates",
    },
    {
      value: "MEDICATION_RECONCILIATION",
      label: "Medication Reconciliation",
      icon: "💊",
      color: "#EC4899",
      description: "Reconcile medications at transitions of care",
    },
    {
      value: "BED_FLOW_ALERT",
      label: "Bed Flow Alert",
      icon: "🚨",
      color: "#14B8A6",
      description: "Alert stakeholders for bed flow coordination",
    },
    {
      value: "BILLING_AND_AUTH_FOLLOWUP",
      label: "Billing and Auth Follow-up",
      icon: "💼",
      color: "#6366F1",
      description: "Follow up on authorization and billing items",
    },
    {
      value: "CUSTOM",
      label: "Custom Task",
      icon: "⚙️",
      color: "#6B7280",
      description: "Custom workflow task",
    },
  ],
  aiAgents: [
    {
      id: "admissions_coordinator",
      name: "Grace",
      role: "Admissions Coordinator",
      color: "#FF6B6B",
      description: "Coordinates admission readiness and communication",
    },
    {
      id: "discharge_coordinator",
      name: "Caleb",
      role: "Discharge Coordinator",
      color: "#4ECDC4",
      description: "Runs discharge planning and follow-up",
    },
    {
      id: "care_transition_specialist",
      name: "Hannah",
      role: "Care Transition Specialist",
      color: "#45B7D1",
      description: "Handles transition-of-care outreach",
    },
    {
      id: "results_and_labs_coordinator",
      name: "Wyatt",
      role: "Results and Labs Coordinator",
      color: "#96CEB4",
      description: "Communicates test result status",
    },
    {
      id: "medication_reconciliation_specialist",
      name: "Ella",
      role: "Medication Reconciliation Specialist",
      color: "#FFEAA7",
      description: "Coordinates medication reconciliation workflows",
    },
    {
      id: "patient_financial_coordinator",
      name: "Levi",
      role: "Patient Financial Coordinator",
      color: "#DDA0DD",
      description: "Manages auth, billing, and payment follow-up",
    },
  ],
  templates: [
    {
      id: "admission-to-discharge",
      name: "Admission to Discharge",
      description: "Coordinate patient journey from admission to discharge",
      workflowType: "ADMISSION_TO_DISCHARGE",
      tasks: [
        {
          name: "Admission Coordination",
          taskType: "ADMISSION_COORDINATION",
          description: "Complete admission workflow",
          delayValue: 0,
          delayUnit: "MINUTES",
          isHITL: true,
          displayOrder: 1,
        },
        {
          name: "Discharge Planning",
          taskType: "DISCHARGE_PLANNING",
          description: "Prepare discharge checklist",
          delayValue: 1,
          delayUnit: "DAYS",
          isHITL: true,
          displayOrder: 2,
        },
        {
          name: "Follow-up Appointment",
          taskType: "FOLLOWUP_APPOINTMENT",
          description: "Schedule post-discharge follow-up",
          delayValue: 2,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 3,
        },
      ],
    },
    {
      id: "care-transition-and-billing",
      name: "Care Transition and Billing",
      description: "Support care continuity and close financial/admin loop",
      workflowType: "CARE_TRANSITION_AND_BILLING",
      tasks: [
        {
          name: "Care Transition Outreach",
          taskType: "CARE_TRANSITION_OUTREACH",
          description: "Confirm transition support",
          delayValue: 1,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Medication Reconciliation",
          taskType: "MEDICATION_RECONCILIATION",
          description: "Reconcile medications and instructions",
          delayValue: 2,
          delayUnit: "DAYS",
          isHITL: true,
          displayOrder: 2,
        },
        {
          name: "Billing and Auth Follow-up",
          taskType: "BILLING_AND_AUTH_FOLLOWUP",
          description: "Resolve auth/billing actions",
          delayValue: 5,
          delayUnit: "DAYS",
          isHITL: true,
          displayOrder: 3,
        },
      ],
    },
  ],
  fieldLabels: {
    contact: "Patient",
    deal: "Care Episode",
  },
  integrations: [
    "Hospital EHR",
    "Department Scheduling",
    "Referral Systems",
    "Calendar",
  ],
};

export const ACCOUNTING_CONFIG: IndustryConfig = {
  industry: "ACCOUNTING",
  taskTypes: [
    {
      value: "LEAD_RESEARCH",
      label: "Lead Research",
      icon: "🔍",
      color: "#3B82F6",
      description: "Research prospect profile and business context",
    },
    {
      value: "CLIENT_INTAKE",
      label: "Client Intake",
      icon: "🧾",
      color: "#10B981",
      description: "Collect onboarding and entity details",
    },
    {
      value: "BOOKKEEPING_REVIEW",
      label: "Bookkeeping Review",
      icon: "📚",
      color: "#8B5CF6",
      description: "Review books and reconcile transactions",
    },
    {
      value: "INVOICE_FOLLOWUP",
      label: "Invoice Follow-up",
      icon: "📩",
      color: "#F59E0B",
      description: "Follow up on unpaid invoices",
    },
    {
      value: "PAYROLL_REMINDER",
      label: "Payroll Reminder",
      icon: "💵",
      color: "#EF4444",
      description: "Remind clients about payroll deadlines",
    },
    {
      value: "TAX_DEADLINE_ALERT",
      label: "Tax Deadline Alert",
      icon: "📅",
      color: "#06B6D4",
      description: "Notify of filing deadlines",
    },
    {
      value: "DOCUMENT_REQUEST",
      label: "Document Request",
      icon: "📂",
      color: "#EC4899",
      description: "Request missing tax or bookkeeping documents",
    },
    {
      value: "FINANCIAL_REPORT_DELIVERY",
      label: "Report Delivery",
      icon: "📊",
      color: "#14B8A6",
      description: "Deliver monthly or quarterly reports",
    },
    {
      value: "YEAR_END_PREP",
      label: "Year-End Prep",
      icon: "✅",
      color: "#6366F1",
      description: "Coordinate year-end close and checklist",
    },
    {
      value: "CUSTOM",
      label: "Custom Task",
      icon: "⚙️",
      color: "#6B7280",
      description: "Custom workflow task",
    },
  ],
  aiAgents: [
    {
      id: "client_intake_coordinator",
      name: "Ava",
      role: "Client Intake Coordinator",
      color: "#FF6B6B",
      description: "Handles onboarding and missing information follow-up",
    },
    {
      id: "bookkeeping_specialist",
      name: "Noah",
      role: "Bookkeeping Specialist",
      color: "#4ECDC4",
      description: "Runs reconciliation and ledger review workflows",
    },
    {
      id: "payroll_coordinator",
      name: "Mia",
      role: "Payroll Coordinator",
      color: "#45B7D1",
      description: "Manages payroll reminders and payroll data collection",
    },
    {
      id: "tax_scheduler",
      name: "Liam",
      role: "Tax Scheduler",
      color: "#96CEB4",
      description: "Tracks filing deadlines and escalations",
    },
    {
      id: "ar_followup_specialist",
      name: "Emma",
      role: "A/R Follow-up Specialist",
      color: "#FFEAA7",
      description: "Coordinates invoice and receivables follow-up",
    },
    {
      id: "reporting_analyst",
      name: "Ethan",
      role: "Reporting Analyst",
      color: "#DDA0DD",
      description: "Prepares and delivers financial reporting updates",
    },
  ],
  templates: [
    {
      id: "new-client-bookkeeping-onboarding",
      name: "New Client Bookkeeping Onboarding",
      description: "Onboard bookkeeping clients and collect required records",
      workflowType: "NEW_CLIENT_BOOKKEEPING_ONBOARDING",
      tasks: [
        {
          name: "Client Intake",
          taskType: "CLIENT_INTAKE",
          description: "Collect entity and accounting stack details",
          delayValue: 0,
          delayUnit: "MINUTES",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Request Source Documents",
          taskType: "DOCUMENT_REQUEST",
          description: "Request statements, payroll, and prior reports",
          delayValue: 30,
          delayUnit: "MINUTES",
          isHITL: false,
          displayOrder: 2,
        },
        {
          name: "Initial Bookkeeping Review",
          taskType: "BOOKKEEPING_REVIEW",
          description: "Run first-pass reconciliation review",
          delayValue: 1,
          delayUnit: "DAYS",
          isHITL: true,
          displayOrder: 3,
        },
      ],
    },
    {
      id: "monthly-close-reminders",
      name: "Monthly Close Reminders",
      description: "Collect missing items and close books on schedule",
      workflowType: "MONTHLY_CLOSE_REMINDERS",
      tasks: [
        {
          name: "Tax Deadline Alert",
          taskType: "TAX_DEADLINE_ALERT",
          description: "Remind client of current filing obligations",
          delayValue: 10,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Payroll Reminder",
          taskType: "PAYROLL_REMINDER",
          description: "Confirm payroll cutoff data is ready",
          delayValue: 5,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 2,
        },
        {
          name: "Deliver Financial Report",
          taskType: "FINANCIAL_REPORT_DELIVERY",
          description: "Send monthly reporting package",
          delayValue: 2,
          delayUnit: "DAYS",
          isHITL: true,
          displayOrder: 3,
        },
      ],
    },
  ],
  fieldLabels: {
    contact: "Client",
    deal: "Engagement",
  },
  integrations: [
    "Bookkeeping Systems",
    "Tax Prep Platforms",
    "E-signature",
    "Calendar",
  ],
};

export const LAW_CONFIG: IndustryConfig = {
  industry: "LAW",
  taskTypes: [
    {
      value: "LEAD_RESEARCH",
      label: "Lead Research",
      icon: "🔍",
      color: "#3B82F6",
      description: "Research prospective client and case context",
    },
    {
      value: "CLIENT_INTAKE",
      label: "Client Intake",
      icon: "📋",
      color: "#10B981",
      description: "Collect intake facts and matter details",
    },
    {
      value: "CONFLICT_CHECK",
      label: "Conflict Check",
      icon: "⚖️",
      color: "#8B5CF6",
      description: "Run conflict checks before engagement",
    },
    {
      value: "ENGAGEMENT_LETTER",
      label: "Engagement Letter",
      icon: "✍️",
      color: "#F59E0B",
      description: "Send engagement letter and collect signature",
    },
    {
      value: "DOCUMENT_COLLECTION",
      label: "Document Collection",
      icon: "📂",
      color: "#EF4444",
      description: "Request and organize supporting documents",
    },
    {
      value: "COURT_DEADLINE_ALERT",
      label: "Court Deadline Alert",
      icon: "⏰",
      color: "#06B6D4",
      description: "Track hearings, filings, and deadlines",
    },
    {
      value: "CLIENT_STATUS_UPDATE",
      label: "Client Status Update",
      icon: "💬",
      color: "#EC4899",
      description: "Provide case and matter progress updates",
    },
    {
      value: "BILLING_FOLLOWUP",
      label: "Billing Follow-up",
      icon: "💼",
      color: "#14B8A6",
      description: "Follow up on invoices and trust balance alerts",
    },
    {
      value: "CONSULTATION_SCHEDULING",
      label: "Consultation Scheduling",
      icon: "📅",
      color: "#6366F1",
      description: "Schedule consultations and review meetings",
    },
    {
      value: "CUSTOM",
      label: "Custom Task",
      icon: "⚙️",
      color: "#6B7280",
      description: "Custom workflow task",
    },
  ],
  aiAgents: [
    {
      id: "intake_paralegal",
      name: "Harper",
      role: "Intake Paralegal",
      color: "#FF6B6B",
      description: "Collects client intake details and supporting facts",
    },
    {
      id: "conflicts_coordinator",
      name: "Mason",
      role: "Conflicts Coordinator",
      color: "#4ECDC4",
      description: "Runs and tracks conflict checks",
    },
    {
      id: "docket_specialist",
      name: "Chloe",
      role: "Docket Specialist",
      color: "#45B7D1",
      description: "Monitors court and filing deadlines",
    },
    {
      id: "client_communications",
      name: "Lucas",
      role: "Client Communications",
      color: "#96CEB4",
      description: "Sends status updates and appointment reminders",
    },
    {
      id: "engagement_manager",
      name: "Sophia",
      role: "Engagement Manager",
      color: "#FFEAA7",
      description: "Handles engagement letters and document packet follow-up",
    },
    {
      id: "billing_coordinator",
      name: "Benjamin",
      role: "Billing Coordinator",
      color: "#DDA0DD",
      description: "Follows up on invoices and payment plans",
    },
  ],
  templates: [
    {
      id: "new-matter-intake",
      name: "New Matter Intake",
      description: "Onboard a new legal matter from lead to engagement",
      workflowType: "NEW_MATTER_INTAKE",
      tasks: [
        {
          name: "Client Intake",
          taskType: "CLIENT_INTAKE",
          description: "Collect matter details and priorities",
          delayValue: 0,
          delayUnit: "MINUTES",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Run Conflict Check",
          taskType: "CONFLICT_CHECK",
          description: "Verify no conflicts exist",
          delayValue: 30,
          delayUnit: "MINUTES",
          isHITL: true,
          displayOrder: 2,
        },
        {
          name: "Send Engagement Letter",
          taskType: "ENGAGEMENT_LETTER",
          description: "Issue engagement terms for signature",
          delayValue: 2,
          delayUnit: "HOURS",
          isHITL: false,
          displayOrder: 3,
        },
      ],
    },
    {
      id: "active-matter-deadline-management",
      name: "Active Matter Deadline Management",
      description: "Keep clients informed while deadlines stay on track",
      workflowType: "ACTIVE_MATTER_DEADLINE_MANAGEMENT",
      tasks: [
        {
          name: "Court Deadline Alert",
          taskType: "COURT_DEADLINE_ALERT",
          description: "Notify team about filing or hearing deadline",
          delayValue: 7,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Request Missing Documents",
          taskType: "DOCUMENT_COLLECTION",
          description: "Collect required supporting materials",
          delayValue: 5,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 2,
        },
        {
          name: "Send Client Status Update",
          taskType: "CLIENT_STATUS_UPDATE",
          description: "Summarize progress and next actions",
          delayValue: 1,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 3,
        },
      ],
    },
  ],
  fieldLabels: {
    contact: "Client",
    deal: "Matter",
  },
  integrations: [
    "Case Management",
    "Document Automation",
    "E-signature",
    "Calendar",
  ],
};

export const SPORTS_CLUB_CONFIG: IndustryConfig = {
  industry: "SPORTS_CLUB",
  taskTypes: [
    {
      value: "LEAD_RESEARCH",
      label: "Lead Research",
      icon: "🔍",
      color: "#3B82F6",
      description: "Research prospective member or parent profile",
    },
    {
      value: "REGISTRATION_FOLLOWUP",
      label: "Registration Follow-up",
      icon: "📝",
      color: "#10B981",
      description: "Follow up on incomplete registrations",
    },
    {
      value: "TRYOUT_SCHEDULING",
      label: "Tryout Scheduling",
      icon: "🏃",
      color: "#8B5CF6",
      description: "Coordinate tryout or assessment sessions",
    },
    {
      value: "PAYMENT_REMINDER",
      label: "Payment Reminder",
      icon: "💳",
      color: "#F59E0B",
      description: "Remind members about tuition and fees",
    },
    {
      value: "SCHEDULE_UPDATE",
      label: "Schedule Update",
      icon: "📅",
      color: "#EF4444",
      description: "Notify families of schedule changes",
    },
    {
      value: "ATTENDANCE_CHECKIN",
      label: "Attendance Check-in",
      icon: "✅",
      color: "#06B6D4",
      description: "Follow up on attendance gaps",
    },
    {
      value: "EQUIPMENT_REMINDER",
      label: "Equipment Reminder",
      icon: "🎒",
      color: "#EC4899",
      description: "Remind members of required equipment",
    },
    {
      value: "EVENT_PROMOTION",
      label: "Event Promotion",
      icon: "📣",
      color: "#14B8A6",
      description: "Promote camps, clinics, and tournaments",
    },
    {
      value: "RENEWAL_FOLLOWUP",
      label: "Renewal Follow-up",
      icon: "🔁",
      color: "#6366F1",
      description: "Run membership renewal follow-up",
    },
    {
      value: "CUSTOM",
      label: "Custom Task",
      icon: "⚙️",
      color: "#6B7280",
      description: "Custom workflow task",
    },
  ],
  aiAgents: [
    {
      id: "registration_coordinator",
      name: "Avery",
      role: "Registration Coordinator",
      color: "#FF6B6B",
      description: "Handles registration and onboarding follow-up",
    },
    {
      id: "program_scheduler",
      name: "Logan",
      role: "Program Scheduler",
      color: "#4ECDC4",
      description: "Coordinates tryouts, sessions, and schedule updates",
    },
    {
      id: "member_success",
      name: "Riley",
      role: "Member Success",
      color: "#45B7D1",
      description: "Tracks attendance and parent/member communication",
    },
    {
      id: "payments_coordinator",
      name: "Mila",
      role: "Payments Coordinator",
      color: "#96CEB4",
      description: "Follows up on dues and payment plans",
    },
    {
      id: "equipment_manager",
      name: "Leo",
      role: "Equipment Manager",
      color: "#FFEAA7",
      description: "Coordinates equipment reminders and requirements",
    },
    {
      id: "events_promoter",
      name: "Aria",
      role: "Events Promoter",
      color: "#DDA0DD",
      description: "Promotes camps, clinics, and special events",
    },
  ],
  templates: [
    {
      id: "new-member-registration",
      name: "New Member Registration",
      description: "Convert inquiry to completed registration and schedule",
      workflowType: "NEW_MEMBER_REGISTRATION",
      tasks: [
        {
          name: "Research Lead",
          taskType: "LEAD_RESEARCH",
          description: "Review player/family profile",
          delayValue: 0,
          delayUnit: "MINUTES",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Registration Follow-up",
          taskType: "REGISTRATION_FOLLOWUP",
          description: "Complete registration packet",
          delayValue: 2,
          delayUnit: "HOURS",
          isHITL: false,
          displayOrder: 2,
        },
        {
          name: "Tryout Scheduling",
          taskType: "TRYOUT_SCHEDULING",
          description: "Book assessment session",
          delayValue: 1,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 3,
        },
      ],
    },
    {
      id: "season-renewal-and-attendance",
      name: "Season Renewal and Attendance",
      description: "Improve retention with attendance and renewal automation",
      workflowType: "SEASON_RENEWAL_AND_ATTENDANCE",
      tasks: [
        {
          name: "Attendance Check-in",
          taskType: "ATTENDANCE_CHECKIN",
          description: "Follow up after attendance drop",
          delayValue: 3,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Payment Reminder",
          taskType: "PAYMENT_REMINDER",
          description: "Send dues reminder",
          delayValue: 7,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 2,
        },
        {
          name: "Renewal Follow-up",
          taskType: "RENEWAL_FOLLOWUP",
          description: "Prompt renewal confirmation",
          delayValue: 14,
          delayUnit: "DAYS",
          isHITL: true,
          displayOrder: 3,
        },
      ],
    },
  ],
  fieldLabels: {
    contact: "Member",
    deal: "Registration",
  },
  integrations: [
    "Club Management",
    "League Scheduling",
    "Payment APIs",
    "Calendar",
  ],
};

export const TECHNOLOGY_CONFIG: IndustryConfig = {
  industry: "TECHNOLOGY",
  taskTypes: [
    {
      value: "LEAD_RESEARCH",
      label: "Lead Research",
      icon: "🔍",
      color: "#3B82F6",
      description: "Research lead company and buying signals",
    },
    {
      value: "DEMO_SCHEDULING",
      label: "Demo Scheduling",
      icon: "📅",
      color: "#10B981",
      description: "Schedule product demo or discovery call",
    },
    {
      value: "TRIAL_ONBOARDING",
      label: "Trial Onboarding",
      icon: "🚀",
      color: "#8B5CF6",
      description: "Guide users through trial setup",
    },
    {
      value: "IMPLEMENTATION_CHECKIN",
      label: "Implementation Check-in",
      icon: "🛠️",
      color: "#F59E0B",
      description: "Track implementation milestones",
    },
    {
      value: "PRODUCT_ADOPTION_NUDGE",
      label: "Product Adoption Nudge",
      icon: "📈",
      color: "#EF4444",
      description: "Prompt key feature adoption",
    },
    {
      value: "SUPPORT_ESCALATION",
      label: "Support Escalation",
      icon: "🧯",
      color: "#06B6D4",
      description: "Escalate unresolved support issues",
    },
    {
      value: "RENEWAL_REMINDER",
      label: "Renewal Reminder",
      icon: "🔁",
      color: "#EC4899",
      description: "Remind customers about renewals",
    },
    {
      value: "UPSELL_RECOMMENDATION",
      label: "Upsell Recommendation",
      icon: "💡",
      color: "#14B8A6",
      description: "Recommend upgrades based on usage",
    },
    {
      value: "QBR_FOLLOWUP",
      label: "QBR Follow-up",
      icon: "📊",
      color: "#6366F1",
      description: "Follow up after quarterly business reviews",
    },
    {
      value: "CUSTOM",
      label: "Custom Task",
      icon: "⚙️",
      color: "#6B7280",
      description: "Custom workflow task",
    },
  ],
  aiAgents: [
    {
      id: "sdr_coordinator",
      name: "Aiden",
      role: "SDR Coordinator",
      color: "#FF6B6B",
      description: "Handles lead qualification and meeting booking",
    },
    {
      id: "onboarding_specialist",
      name: "Zoe",
      role: "Onboarding Specialist",
      color: "#4ECDC4",
      description: "Guides trial and implementation onboarding",
    },
    {
      id: "customer_success_manager",
      name: "Oliver",
      role: "Customer Success Manager",
      color: "#45B7D1",
      description: "Monitors adoption and customer outcomes",
    },
    {
      id: "support_liaison",
      name: "Amelia",
      role: "Support Liaison",
      color: "#96CEB4",
      description: "Coordinates support escalations",
    },
    {
      id: "renewals_manager",
      name: "Elijah",
      role: "Renewals Manager",
      color: "#FFEAA7",
      description: "Runs renewal and retention workflows",
    },
    {
      id: "growth_specialist",
      name: "Isla",
      role: "Growth Specialist",
      color: "#DDA0DD",
      description: "Identifies expansion and upsell opportunities",
    },
  ],
  templates: [
    {
      id: "new-trial-conversion",
      name: "New Trial Conversion",
      description: "Convert trial signups to paying customers",
      workflowType: "NEW_TRIAL_CONVERSION",
      tasks: [
        {
          name: "Research Lead",
          taskType: "LEAD_RESEARCH",
          description: "Understand account and use case",
          delayValue: 0,
          delayUnit: "MINUTES",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "Schedule Demo",
          taskType: "DEMO_SCHEDULING",
          description: "Book onboarding demo",
          delayValue: 1,
          delayUnit: "HOURS",
          isHITL: false,
          displayOrder: 2,
        },
        {
          name: "Send Trial Onboarding",
          taskType: "TRIAL_ONBOARDING",
          description: "Deliver setup guidance",
          delayValue: 3,
          delayUnit: "HOURS",
          isHITL: false,
          displayOrder: 3,
        },
      ],
    },
    {
      id: "renewal-and-expansion",
      name: "Renewal and Expansion",
      description: "Protect renewals and uncover expansion opportunities",
      workflowType: "RENEWAL_AND_EXPANSION",
      tasks: [
        {
          name: "Renewal Reminder",
          taskType: "RENEWAL_REMINDER",
          description: "Notify customer before contract renewal",
          delayValue: 30,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 1,
        },
        {
          name: "QBR Follow-up",
          taskType: "QBR_FOLLOWUP",
          description: "Share outcomes and recommendations",
          delayValue: 14,
          delayUnit: "DAYS",
          isHITL: false,
          displayOrder: 2,
        },
        {
          name: "Upsell Recommendation",
          taskType: "UPSELL_RECOMMENDATION",
          description: "Present upgrade aligned with usage",
          delayValue: 7,
          delayUnit: "DAYS",
          isHITL: true,
          displayOrder: 3,
        },
      ],
    },
  ],
  fieldLabels: {
    contact: "Lead",
    deal: "Opportunity",
  },
  integrations: ["CRM", "Product Analytics", "Support Desk", "Calendar"],
};

// ==========================================
// INDUSTRY CONFIG MAP
// ==========================================

export const INDUSTRY_CONFIGS: Record<Industry, IndustryConfig> = {
  ACCOUNTING: ACCOUNTING_CONFIG,
  RESTAURANT: RESTAURANT_CONFIG,
  SPORTS_CLUB: SPORTS_CLUB_CONFIG,
  CONSTRUCTION: CONSTRUCTION_CONFIG,
  LAW: LAW_CONFIG,
  MEDICAL: MEDICAL_CONFIG,
  DENTIST: DENTIST_CONFIG,
  MEDICAL_SPA: MEDICAL_SPA_CONFIG,
  OPTOMETRIST: OPTOMETRIST_CONFIG,
  HEALTH_CLINIC: HEALTH_CLINIC_CONFIG,
  REAL_ESTATE: MEDICAL_CONFIG, // Placeholder - Real Estate has its own system
  HOSPITAL: HOSPITAL_CONFIG,
  TECHNOLOGY: TECHNOLOGY_CONFIG,
  ORTHODONTIST: ORTHODONTIST_CONFIG,
  RETAIL: RETAIL_CONFIG,
};

/**
 * Get industry configuration
 */
export function getIndustryConfig(
  industry: Industry | null | undefined,
): IndustryConfig | null {
  if (!industry || industry === "REAL_ESTATE") {
    return null; // Real Estate uses its own system
  }
  return INDUSTRY_CONFIGS[industry] || null;
}

/**
 * Get task type icon
 */
export function getTaskTypeIcon(
  industry: Industry | null | undefined,
  taskType: string,
): string {
  const config = getIndustryConfig(industry);
  if (!config) return "⚙️";
  const taskTypeConfig = config.taskTypes.find((t) => t.value === taskType);
  return taskTypeConfig?.icon || "⚙️";
}

/**
 * Get task type color
 */
export function getTaskTypeColor(
  industry: Industry | null | undefined,
  taskType: string,
): string {
  const config = getIndustryConfig(industry);
  if (!config) return "#6B7280";
  const taskTypeConfig = config.taskTypes.find((t) => t.value === taskType);
  return taskTypeConfig?.color || "#6B7280";
}

/**
 * Get AI agent by ID
 */
export function getAIAgent(
  industry: Industry | null | undefined,
  agentId: string,
): IndustryAIAgent | null {
  const config = getIndustryConfig(industry);
  if (!config) return null;
  return config.aiAgents.find((a) => a.id === agentId) || null;
}
