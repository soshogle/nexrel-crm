import type { Industry } from '@/lib/industry-menu-config';

export interface BookingFieldOption {
  value: string;
  label: string;
}

export interface BookingField {
  id: string;
  label: string;
  type: 'select' | 'text' | 'textarea' | 'number';
  required?: boolean;
  placeholder?: string;
  options?: BookingFieldOption[];
}

export interface IndustryBookingConfig {
  bookingNoun: string;
  bookingVerb: string;
  bookingPluralNoun: string;
  pageTitle: string;
  pageDescription: string;
  confirmationTitle: string;
  confirmationDescription: string;
  confirmationFooter: string;
  extraFields: BookingField[];
  defaultMeetingTypes: string[];
  useReservationSystem?: boolean;
}

const RESTAURANT_CONFIG: IndustryBookingConfig = {
  bookingNoun: 'Reservation',
  bookingVerb: 'Reserve',
  bookingPluralNoun: 'Reservations',
  pageTitle: 'Make a Reservation',
  pageDescription: 'Book your table online',
  confirmationTitle: 'Reservation Confirmed!',
  confirmationDescription: 'Your reservation has been successfully created',
  confirmationFooter: 'We can\'t wait to serve you!',
  defaultMeetingTypes: ['IN_PERSON'],
  useReservationSystem: true,
  extraFields: [
    {
      id: 'partySize',
      label: 'Party Size',
      type: 'select',
      required: true,
      options: Array.from({ length: 10 }, (_, i) => ({
        value: String(i + 1),
        label: `${i + 1} ${i === 0 ? 'guest' : 'guests'}`,
      })),
    },
    {
      id: 'occasion',
      label: 'Occasion',
      type: 'select',
      placeholder: 'Select occasion',
      options: [
        { value: 'none', label: 'None' },
        { value: 'birthday', label: 'Birthday' },
        { value: 'anniversary', label: 'Anniversary' },
        { value: 'business', label: 'Business Meeting' },
        { value: 'date', label: 'Date Night' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'dietaryRestrictions',
      label: 'Dietary Restrictions',
      type: 'text',
      placeholder: 'e.g., Vegetarian, Gluten-free',
    },
    {
      id: 'specialRequests',
      label: 'Special Requests',
      type: 'textarea',
      placeholder: 'Any special requests or seating preferences...',
    },
  ],
};

const MEDICAL_CONFIG: IndustryBookingConfig = {
  bookingNoun: 'Appointment',
  bookingVerb: 'Book',
  bookingPluralNoun: 'Appointments',
  pageTitle: 'Schedule an Appointment',
  pageDescription: 'Book your visit with our medical team',
  confirmationTitle: 'Appointment Confirmed!',
  confirmationDescription: 'Your appointment has been successfully scheduled',
  confirmationFooter: 'Please arrive 15 minutes early with your insurance card.',
  defaultMeetingTypes: ['IN_PERSON', 'VIDEO', 'PHONE'],
  extraFields: [
    {
      id: 'appointmentType',
      label: 'Appointment Type',
      type: 'select',
      required: true,
      options: [
        { value: 'checkup', label: 'General Checkup' },
        { value: 'consultation', label: 'Consultation' },
        { value: 'follow_up', label: 'Follow-up Visit' },
        { value: 'urgent', label: 'Urgent Care' },
        { value: 'specialist', label: 'Specialist Referral' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'insuranceProvider',
      label: 'Insurance Provider',
      type: 'text',
      placeholder: 'e.g., Blue Cross, Aetna',
    },
    {
      id: 'symptoms',
      label: 'Brief Description of Symptoms',
      type: 'textarea',
      placeholder: 'Describe your symptoms or reason for visit...',
    },
  ],
};

const DENTIST_CONFIG: IndustryBookingConfig = {
  bookingNoun: 'Appointment',
  bookingVerb: 'Book',
  bookingPluralNoun: 'Appointments',
  pageTitle: 'Schedule a Dental Appointment',
  pageDescription: 'Book your dental visit online',
  confirmationTitle: 'Appointment Confirmed!',
  confirmationDescription: 'Your dental appointment has been scheduled',
  confirmationFooter: 'Please arrive 10 minutes early. Bring your insurance card and ID.',
  defaultMeetingTypes: ['IN_PERSON'],
  extraFields: [
    {
      id: 'appointmentType',
      label: 'Visit Type',
      type: 'select',
      required: true,
      options: [
        { value: 'cleaning', label: 'Cleaning & Exam' },
        { value: 'checkup', label: 'Regular Checkup' },
        { value: 'filling', label: 'Filling' },
        { value: 'crown', label: 'Crown / Bridge' },
        { value: 'extraction', label: 'Extraction' },
        { value: 'whitening', label: 'Teeth Whitening' },
        { value: 'emergency', label: 'Emergency Visit' },
        { value: 'consultation', label: 'Consultation' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'insuranceProvider',
      label: 'Dental Insurance',
      type: 'text',
      placeholder: 'e.g., Delta Dental, Cigna',
    },
    {
      id: 'concerns',
      label: 'Dental Concerns',
      type: 'textarea',
      placeholder: 'Describe any pain, sensitivity, or concerns...',
    },
  ],
};

const ORTHODONTIST_CONFIG: IndustryBookingConfig = {
  bookingNoun: 'Appointment',
  bookingVerb: 'Book',
  bookingPluralNoun: 'Appointments',
  pageTitle: 'Schedule an Orthodontic Appointment',
  pageDescription: 'Book your orthodontic visit online',
  confirmationTitle: 'Appointment Confirmed!',
  confirmationDescription: 'Your orthodontic appointment has been scheduled',
  confirmationFooter: 'Please arrive 10 minutes early.',
  defaultMeetingTypes: ['IN_PERSON'],
  extraFields: [
    {
      id: 'appointmentType',
      label: 'Visit Type',
      type: 'select',
      required: true,
      options: [
        { value: 'consultation', label: 'Initial Consultation' },
        { value: 'adjustment', label: 'Braces Adjustment' },
        { value: 'retainer_check', label: 'Retainer Check' },
        { value: 'aligner_fitting', label: 'Aligner Fitting' },
        { value: 'emergency', label: 'Emergency Visit' },
        { value: 'follow_up', label: 'Follow-up' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'insuranceProvider',
      label: 'Insurance Provider',
      type: 'text',
      placeholder: 'e.g., Delta Dental, Cigna',
    },
    {
      id: 'concerns',
      label: 'Notes or Concerns',
      type: 'textarea',
      placeholder: 'Describe any issues with braces, aligners, etc...',
    },
  ],
};

const MEDICAL_SPA_CONFIG: IndustryBookingConfig = {
  bookingNoun: 'Appointment',
  bookingVerb: 'Book',
  bookingPluralNoun: 'Appointments',
  pageTitle: 'Book a Treatment',
  pageDescription: 'Schedule your med spa appointment',
  confirmationTitle: 'Appointment Confirmed!',
  confirmationDescription: 'Your treatment appointment has been scheduled',
  confirmationFooter: 'Please arrive makeup-free and 15 minutes early for your consultation.',
  defaultMeetingTypes: ['IN_PERSON'],
  extraFields: [
    {
      id: 'treatmentType',
      label: 'Treatment Type',
      type: 'select',
      required: true,
      options: [
        { value: 'consultation', label: 'Free Consultation' },
        { value: 'botox', label: 'Botox / Fillers' },
        { value: 'laser', label: 'Laser Treatment' },
        { value: 'facial', label: 'Medical Facial' },
        { value: 'body_contouring', label: 'Body Contouring' },
        { value: 'skin_rejuvenation', label: 'Skin Rejuvenation' },
        { value: 'hair_removal', label: 'Hair Removal' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'concerns',
      label: 'Areas of Concern',
      type: 'textarea',
      placeholder: 'Describe the areas or concerns you\'d like to address...',
    },
  ],
};

const OPTOMETRIST_CONFIG: IndustryBookingConfig = {
  bookingNoun: 'Appointment',
  bookingVerb: 'Book',
  bookingPluralNoun: 'Appointments',
  pageTitle: 'Schedule an Eye Exam',
  pageDescription: 'Book your vision care appointment',
  confirmationTitle: 'Appointment Confirmed!',
  confirmationDescription: 'Your eye care appointment has been scheduled',
  confirmationFooter: 'Please bring your current glasses or contacts and insurance card.',
  defaultMeetingTypes: ['IN_PERSON'],
  extraFields: [
    {
      id: 'appointmentType',
      label: 'Visit Type',
      type: 'select',
      required: true,
      options: [
        { value: 'comprehensive_exam', label: 'Comprehensive Eye Exam' },
        { value: 'contact_lens', label: 'Contact Lens Fitting' },
        { value: 'glasses', label: 'Glasses Consultation' },
        { value: 'follow_up', label: 'Follow-up Visit' },
        { value: 'emergency', label: 'Emergency / Urgent' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'insuranceProvider',
      label: 'Vision Insurance',
      type: 'text',
      placeholder: 'e.g., VSP, EyeMed',
    },
    {
      id: 'concerns',
      label: 'Vision Concerns',
      type: 'textarea',
      placeholder: 'Describe any vision changes, eye pain, or concerns...',
    },
  ],
};

const HEALTH_CLINIC_CONFIG: IndustryBookingConfig = {
  ...MEDICAL_CONFIG,
  pageTitle: 'Schedule a Clinic Visit',
  pageDescription: 'Book your appointment at our clinic',
};

const HOSPITAL_CONFIG: IndustryBookingConfig = {
  ...MEDICAL_CONFIG,
  pageTitle: 'Schedule a Hospital Visit',
  pageDescription: 'Book your hospital appointment',
  confirmationFooter: 'Please bring your insurance card and a valid ID. Arrive 20 minutes early.',
};

const REAL_ESTATE_CONFIG: IndustryBookingConfig = {
  bookingNoun: 'Consultation',
  bookingVerb: 'Schedule',
  bookingPluralNoun: 'Consultations',
  pageTitle: 'Schedule a Consultation',
  pageDescription: 'Book a time to discuss your real estate needs',
  confirmationTitle: 'Consultation Scheduled!',
  confirmationDescription: 'Your real estate consultation has been booked',
  confirmationFooter: 'We look forward to helping you with your real estate goals!',
  defaultMeetingTypes: ['PHONE', 'VIDEO', 'IN_PERSON'],
  extraFields: [
    {
      id: 'consultationType',
      label: 'Consultation Type',
      type: 'select',
      required: true,
      options: [
        { value: 'buying', label: 'Buying a Property' },
        { value: 'selling', label: 'Selling a Property' },
        { value: 'viewing', label: 'Property Viewing' },
        { value: 'market_analysis', label: 'Market Analysis' },
        { value: 'investment', label: 'Investment Consultation' },
        { value: 'rental', label: 'Rental Inquiry' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'propertyInterest',
      label: 'Property Interest',
      type: 'text',
      placeholder: 'e.g., 3-bedroom condo in downtown, commercial space',
    },
    {
      id: 'budget',
      label: 'Budget Range',
      type: 'text',
      placeholder: 'e.g., $300K - $500K',
    },
    {
      id: 'additionalInfo',
      label: 'Additional Information',
      type: 'textarea',
      placeholder: 'Any specific requirements or questions...',
    },
  ],
};

const LAW_CONFIG: IndustryBookingConfig = {
  bookingNoun: 'Consultation',
  bookingVerb: 'Schedule',
  bookingPluralNoun: 'Consultations',
  pageTitle: 'Schedule a Legal Consultation',
  pageDescription: 'Book a consultation with our legal team',
  confirmationTitle: 'Consultation Scheduled!',
  confirmationDescription: 'Your legal consultation has been booked',
  confirmationFooter: 'Please bring any relevant documents to your consultation.',
  defaultMeetingTypes: ['PHONE', 'VIDEO', 'IN_PERSON'],
  extraFields: [
    {
      id: 'caseType',
      label: 'Case Type',
      type: 'select',
      required: true,
      options: [
        { value: 'family', label: 'Family Law' },
        { value: 'criminal', label: 'Criminal Defense' },
        { value: 'personal_injury', label: 'Personal Injury' },
        { value: 'business', label: 'Business / Corporate' },
        { value: 'real_estate', label: 'Real Estate Law' },
        { value: 'estate_planning', label: 'Estate Planning' },
        { value: 'immigration', label: 'Immigration' },
        { value: 'employment', label: 'Employment Law' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'caseDescription',
      label: 'Brief Case Description',
      type: 'textarea',
      required: true,
      placeholder: 'Briefly describe your legal matter...',
    },
  ],
};

const ACCOUNTING_CONFIG: IndustryBookingConfig = {
  bookingNoun: 'Consultation',
  bookingVerb: 'Schedule',
  bookingPluralNoun: 'Consultations',
  pageTitle: 'Schedule a Consultation',
  pageDescription: 'Book a meeting with our accounting team',
  confirmationTitle: 'Consultation Scheduled!',
  confirmationDescription: 'Your accounting consultation has been booked',
  confirmationFooter: 'Please bring any relevant financial documents.',
  defaultMeetingTypes: ['PHONE', 'VIDEO', 'IN_PERSON'],
  extraFields: [
    {
      id: 'serviceType',
      label: 'Service Needed',
      type: 'select',
      required: true,
      options: [
        { value: 'tax_prep', label: 'Tax Preparation' },
        { value: 'bookkeeping', label: 'Bookkeeping' },
        { value: 'audit', label: 'Audit & Assurance' },
        { value: 'payroll', label: 'Payroll Services' },
        { value: 'advisory', label: 'Financial Advisory' },
        { value: 'business_formation', label: 'Business Formation' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'businessType',
      label: 'Business Type',
      type: 'select',
      options: [
        { value: 'individual', label: 'Individual / Personal' },
        { value: 'sole_proprietor', label: 'Sole Proprietor' },
        { value: 'llc', label: 'LLC' },
        { value: 'corporation', label: 'Corporation' },
        { value: 'nonprofit', label: 'Non-Profit' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'additionalInfo',
      label: 'Additional Details',
      type: 'textarea',
      placeholder: 'Describe what you need help with...',
    },
  ],
};

const CONSTRUCTION_CONFIG: IndustryBookingConfig = {
  bookingNoun: 'Consultation',
  bookingVerb: 'Schedule',
  bookingPluralNoun: 'Consultations',
  pageTitle: 'Schedule a Project Consultation',
  pageDescription: 'Book a meeting to discuss your project',
  confirmationTitle: 'Consultation Scheduled!',
  confirmationDescription: 'Your project consultation has been booked',
  confirmationFooter: 'We look forward to discussing your project!',
  defaultMeetingTypes: ['PHONE', 'VIDEO', 'IN_PERSON'],
  extraFields: [
    {
      id: 'projectType',
      label: 'Project Type',
      type: 'select',
      required: true,
      options: [
        { value: 'new_construction', label: 'New Construction' },
        { value: 'renovation', label: 'Renovation / Remodel' },
        { value: 'addition', label: 'Addition' },
        { value: 'commercial', label: 'Commercial Build-out' },
        { value: 'repair', label: 'Repair / Maintenance' },
        { value: 'inspection', label: 'Inspection' },
        { value: 'estimate', label: 'Free Estimate' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'projectAddress',
      label: 'Project Address',
      type: 'text',
      placeholder: 'Address of the project site',
    },
    {
      id: 'projectDescription',
      label: 'Project Description',
      type: 'textarea',
      placeholder: 'Describe the scope of work, timeline, and budget...',
    },
  ],
};

const TECHNOLOGY_CONFIG: IndustryBookingConfig = {
  bookingNoun: 'Consultation',
  bookingVerb: 'Schedule',
  bookingPluralNoun: 'Consultations',
  pageTitle: 'Schedule a Consultation',
  pageDescription: 'Book a meeting with our team',
  confirmationTitle: 'Consultation Scheduled!',
  confirmationDescription: 'Your consultation has been booked',
  confirmationFooter: 'We look forward to speaking with you!',
  defaultMeetingTypes: ['PHONE', 'VIDEO'],
  extraFields: [
    {
      id: 'serviceType',
      label: 'Service Interest',
      type: 'select',
      required: true,
      options: [
        { value: 'demo', label: 'Product Demo' },
        { value: 'support', label: 'Technical Support' },
        { value: 'consulting', label: 'IT Consulting' },
        { value: 'development', label: 'Custom Development' },
        { value: 'integration', label: 'Integration Services' },
        { value: 'training', label: 'Training' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'companySize',
      label: 'Company Size',
      type: 'select',
      options: [
        { value: '1-10', label: '1-10 employees' },
        { value: '11-50', label: '11-50 employees' },
        { value: '51-200', label: '51-200 employees' },
        { value: '201-500', label: '201-500 employees' },
        { value: '500+', label: '500+ employees' },
      ],
    },
    {
      id: 'projectDetails',
      label: 'Project Details',
      type: 'textarea',
      placeholder: 'Describe your project requirements or questions...',
    },
  ],
};

const SPORTS_CLUB_CONFIG: IndustryBookingConfig = {
  bookingNoun: 'Booking',
  bookingVerb: 'Book',
  bookingPluralNoun: 'Bookings',
  pageTitle: 'Book a Session',
  pageDescription: 'Schedule your next session or class',
  confirmationTitle: 'Booking Confirmed!',
  confirmationDescription: 'Your session has been booked',
  confirmationFooter: 'Please arrive 10 minutes early in appropriate sportswear.',
  defaultMeetingTypes: ['IN_PERSON'],
  extraFields: [
    {
      id: 'activityType',
      label: 'Activity Type',
      type: 'select',
      required: true,
      options: [
        { value: 'personal_training', label: 'Personal Training' },
        { value: 'group_class', label: 'Group Class' },
        { value: 'trial', label: 'Trial Session' },
        { value: 'assessment', label: 'Fitness Assessment' },
        { value: 'facility_tour', label: 'Facility Tour' },
        { value: 'membership', label: 'Membership Inquiry' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'membershipStatus',
      label: 'Membership Status',
      type: 'select',
      options: [
        { value: 'member', label: 'Current Member' },
        { value: 'former', label: 'Former Member' },
        { value: 'new', label: 'New / Prospective' },
      ],
    },
    {
      id: 'specialNeeds',
      label: 'Special Requirements',
      type: 'textarea',
      placeholder: 'Any injuries, limitations, or special requests...',
    },
  ],
};

const RETAIL_CONFIG: IndustryBookingConfig = {
  bookingNoun: 'Appointment',
  bookingVerb: 'Book',
  bookingPluralNoun: 'Appointments',
  pageTitle: 'Book a Shopping Appointment',
  pageDescription: 'Schedule a personalized shopping experience',
  confirmationTitle: 'Appointment Confirmed!',
  confirmationDescription: 'Your shopping appointment has been scheduled',
  confirmationFooter: 'We look forward to helping you find what you need!',
  defaultMeetingTypes: ['IN_PERSON', 'VIDEO'],
  extraFields: [
    {
      id: 'appointmentType',
      label: 'Visit Type',
      type: 'select',
      required: true,
      options: [
        { value: 'personal_shopping', label: 'Personal Shopping' },
        { value: 'styling', label: 'Styling Session' },
        { value: 'product_demo', label: 'Product Demonstration' },
        { value: 'pickup', label: 'Order Pickup' },
        { value: 'return_exchange', label: 'Return / Exchange' },
        { value: 'consultation', label: 'Consultation' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'productInterest',
      label: 'Product Interest',
      type: 'text',
      placeholder: 'e.g., Clothing, Electronics, Home Decor',
    },
    {
      id: 'specialRequests',
      label: 'Special Requests',
      type: 'textarea',
      placeholder: 'Any specific items or preferences...',
    },
  ],
};

const DEFAULT_CONFIG: IndustryBookingConfig = {
  bookingNoun: 'Appointment',
  bookingVerb: 'Book',
  bookingPluralNoun: 'Appointments',
  pageTitle: 'Book an Appointment',
  pageDescription: 'Schedule a time that works for you',
  confirmationTitle: 'Appointment Confirmed!',
  confirmationDescription: 'Your appointment has been successfully booked',
  confirmationFooter: 'We look forward to meeting with you!',
  defaultMeetingTypes: ['PHONE', 'VIDEO', 'IN_PERSON'],
  extraFields: [
    {
      id: 'serviceType',
      label: 'Service Type',
      type: 'select',
      options: [
        { value: 'consultation', label: 'Consultation' },
        { value: 'follow_up', label: 'Follow-up' },
        { value: 'general', label: 'General Inquiry' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'notes',
      label: 'Additional Notes',
      type: 'textarea',
      placeholder: 'Any additional information or questions...',
    },
  ],
};

const INDUSTRY_BOOKING_CONFIGS: Record<string, IndustryBookingConfig> = {
  RESTAURANT: RESTAURANT_CONFIG,
  MEDICAL: MEDICAL_CONFIG,
  DENTIST: DENTIST_CONFIG,
  ORTHODONTIST: ORTHODONTIST_CONFIG,
  MEDICAL_SPA: MEDICAL_SPA_CONFIG,
  OPTOMETRIST: OPTOMETRIST_CONFIG,
  HEALTH_CLINIC: HEALTH_CLINIC_CONFIG,
  HOSPITAL: HOSPITAL_CONFIG,
  REAL_ESTATE: REAL_ESTATE_CONFIG,
  LAW: LAW_CONFIG,
  ACCOUNTING: ACCOUNTING_CONFIG,
  CONSTRUCTION: CONSTRUCTION_CONFIG,
  TECHNOLOGY: TECHNOLOGY_CONFIG,
  SPORTS_CLUB: SPORTS_CLUB_CONFIG,
  RETAIL: RETAIL_CONFIG,
};

export function getIndustryBookingConfig(industry: string | null | undefined): IndustryBookingConfig {
  if (!industry) return DEFAULT_CONFIG;
  return INDUSTRY_BOOKING_CONFIGS[industry] || DEFAULT_CONFIG;
}

export function isRestaurantIndustry(industry: string | null | undefined): boolean {
  return industry === 'RESTAURANT';
}
