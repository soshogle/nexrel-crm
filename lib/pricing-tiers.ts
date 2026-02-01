export interface PricingTier {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  idealFor?: string;
  voiceMinutes?: string;
  smsMessages?: string;
  emails?: string;
  teamMembers?: string;
  contacts?: string;
  nexrelHub?: string[];
  apiAccess?: string[];
  aiWorkforce?: string[];
  growthMarketing?: string[];
  advancedOps?: string[];
  analyticsReporting?: string;
  onboardingSupport?: string;
  features: string[];
  popular?: boolean;
  ctaText: string;
  ctaAction: "demo" | "contact" | "checkout";
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for small businesses getting started with AI automation",
    priceMonthly: 497,
    ctaText: "Get Started →",
    ctaAction: "checkout",
    idealFor: "Solo / Small Business",
    voiceMinutes: "1,500 / month",
    smsMessages: "7,500 / month",
    emails: "30,000 / month",
    teamMembers: "5 Users",
    contacts: "Up to 10,000",
    nexrelHub: [
      "Smart CRM & Tagging",
      "Visual Sales Pipeline",
      "Unified Messaging (All comms in one thread)",
      "Customer Journey Workflows",
      "Lead Capture & Management",
      "Accounting Integrations",
    ],
    apiAccess: ["Inbound AI Receptionist"],
    aiWorkforce: ["Smart Appointment Booking"],
    growthMarketing: ["Basic Lead Nurture"],
    advancedOps: [],
    analyticsReporting: "Basic Reporting",
    onboardingSupport: "Self-Guided Wizard, Standard Email Support",
    features: [
      "AI Business Ecosystem",
      "AI-powered lead capture",
      "Automated CRM functionality",
      "Email automation",
      "Up to 10,000 contacts",
      "5 team members",
      "Email support",
      "Analytics dashboard",
      "Social media AI responder",
      "Voice AI assistant",
      "Sales campaigns",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    description: "For growing businesses ready to scale with advanced AI tools",
    priceMonthly: 1497,
    popular: true,
    ctaText: "Book a Demo →",
    ctaAction: "demo",
    idealFor: "Growing Clinics ($50k+)",
    voiceMinutes: "4,000 / month",
    smsMessages: "20,000 / month",
    emails: "75,000 emails",
    teamMembers: "15 Users",
    contacts: "Up to 50,000",
    nexrelHub: ["Everything in Starter", "API Access Included"],
    apiAccess: ["INCLUDED", "API Access Included", "Inbound + Outbound AI"],
    aiWorkforce: [
      "AI Personal Assistant",
      "Campaign Manager",
      "Social Reputation Mgmt",
      "Referral Management",
    ],
    growthMarketing: ["A/B Testing"],
    advancedOps: [],
    analyticsReporting: "Advanced Analytics",
    onboardingSupport: "Priority Support",
    features: [
      "Everything in Starter",
      "AI Business Ecosystem",
      "AI voice assistant (100 calls/month)",
      "Advanced CRM with AI scoring",
      "Up to 50,000 contacts",
      "15 team members",
      "SMS & WhatsApp automation",
      "A/B testing & optimization",
      "Priority support",
      "Custom integrations",
      "Social media AI responder",
      "Sales campaigns",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Complete AI infrastructure for established organizations",
    priceMonthly: 4997,
    ctaText: "Book a Demo →",
    ctaAction: "demo",
    idealFor: "Multi-Location / Franchise",
    voiceMinutes: "10,000 / month",
    smsMessages: "50,000 / month",
    emails: "150,000 / month",
    teamMembers: "Unlimited",
    contacts: "Unlimited",
    nexrelHub: ["Everything in Professional", "Optimized & tailored Nexrel core"],
    apiAccess: ["INCLUDED", "Inbound + Outbound AI"],
    aiWorkforce: ["AI Personal Assistant"],
    growthMarketing: [
      "Included",
      "Multi-Location Inventory Pooling",
      "Global Rewards & Loyalty Program",
      "Payment POS / Paperless Kiosk",
    ],
    advancedOps: [
      "Comprehensive Franchise Support",
      "Predictive Reporting",
      "Dedicated Account Manager",
    ],
    analyticsReporting: "Predictive Reporting",
    onboardingSupport: "Custom Onboarding, Dedicated Account Manager",
    features: [
      "Everything in Professional",
      "AI Business Ecosystem",
      "Unlimited AI voice calls",
      "AI content creation suite",
      "AI ads simulator (250K users)",
      "Unlimited contacts",
      "Unlimited team members",
      "Dedicated account manager",
      "24/7 priority support",
      "Custom AI model training",
      "SLA guarantee",
      "Social media AI responder",
      "Sales campaigns",
    ],
  },
  {
    id: "custom",
    name: "Custom",
    description: "Fully customizable, done-for-you AI company-wide implementation",
    priceMonthly: 0,
    ctaText: "Contact Sales →",
    ctaAction: "contact",
    idealFor: "Complex Organizations",
    voiceMinutes: "Unlimited / Custom",
    smsMessages: "Unlimited / Custom",
    emails: "Unlimited / Custom",
    teamMembers: "Unlimited",
    contacts: "Unlimited",
    nexrelHub: ["Everything in Enterprise", "Optimized & tailored Nexrel core included"],
    apiAccess: ["INCLUDED", "Custom Integrations"],
    aiWorkforce: ["Custom AI Models", "Company-Wide Integration"],
    growthMarketing: [
      "Included",
      "Fully Customized AI Ecosystem",
      "Personalized Business Modules",
    ],
    advancedOps: [
      "Strategic AI Consulting",
      "On-Site White Glove Training",
    ],
    analyticsReporting: "Included",
    onboardingSupport: "ROI Guarantee Program, Custom SLA",
    features: [
      "Everything in Enterprise",
      "AI Business Ecosystem",
      "Fully customized AI ecosystem",
      "Done-for-you implementation",
      "Company-wide AI integration",
      "Custom workflow automation",
      "Dedicated implementation team",
      "On-site training & onboarding",
      "Ongoing optimization & support",
      "Custom SLA agreements",
      "Strategic AI consulting",
      "ROI guarantee program",
      "Social media AI responder",
      "Sales campaigns",
    ],
  },
];
