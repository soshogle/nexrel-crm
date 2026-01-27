/**
 * Onboarding Conversational AI
 * Manages structured Q&A flow for CRM setup
 */

export interface ConversationStep {
  id: string;
  question: string;
  field: string;
  type: 'text' | 'select' | 'multiselect' | 'yesno' | 'url';
  options?: string[];
  validation?: (value: any) => boolean;
  required: boolean;
  description?: string;
  subSteps?: ConversationStep[];
  condition?: (data: any) => boolean;
}

export const onboardingSteps: ConversationStep[] = [
  // Step 1: Website scraping (handled by UI)
  {
    id: 'website_scrape',
    question: "Hi! I'm Soshogle Agent, your intelligent CRM assistant. Let's get your CRM set up quickly. Do you have a website I can learn from?",
    field: 'hasWebsite',
    type: 'yesno',
    required: false,
    description: "If you have a website, I can automatically extract your business information."
  },
  
  // Step 2: Company profile confirmation
  {
    id: 'company_profile',
    question: "Perfect! I've extracted your company information. Please review and edit any details that need updating, then click Continue.",
    field: 'companyProfile',
    type: 'text',
    required: true,
    description: "Review your company name, email, phone, address, and other details."
  },
  
  // Step 3: SMS/Phone setup
  {
    id: 'sms_setup',
    question: "Great! Now let's set up SMS communications. Do you want to send SMS messages to your customers?",
    field: 'wantsSMS',
    type: 'yesno',
    required: true,
    description: "SMS helps you reach customers instantly."
  },
  
  // Step 3a: SMS phone number choice
  {
    id: 'sms_phone_choice',
    question: "Perfect! How would you like to handle your SMS number?",
    field: 'smsPhoneChoice',
    type: 'select',
    options: [
      'Purchase new number through Twilio',
      'Use my existing Twilio number',
      'Use my company phone number'
    ],
    required: true,
    description: "Choose your SMS sending method.",
    condition: (data) => data.wantsSMS === 'yes'
  },
  
  // Step 3b: Twilio credentials
  {
    id: 'twilio_credentials',
    question: "Great choice! Please provide your Twilio Account SID and Auth Token. (You can skip this for now and add it later in Settings)",
    field: 'twilioCredentials',
    type: 'text',
    required: false,
    description: "Find these in your Twilio dashboard at twilio.com/console",
    condition: (data) => data.wantsSMS === 'yes' && data.smsPhoneChoice && data.smsPhoneChoice.includes('Twilio')
  },
  
  // Step 4: Email provider setup
  {
    id: 'email_provider',
    question: "Now let's configure email communications. Which email provider do you use?",
    field: 'emailProvider',
    type: 'select',
    options: [
      'Gmail',
      'Outlook',
      'Mailchimp',
      'SendGrid',
      'Other',
      'Skip for now'
    ],
    required: true,
    description: "We'll help you connect your email to send messages and campaigns."
  },
  
  // Step 5: Social media platforms
  {
    id: 'social_media',
    question: "Would you like to connect social media messaging platforms?",
    field: 'wantsSocialMedia',
    type: 'yesno',
    required: true,
    description: "Connect Facebook Messenger, Instagram DM, or WhatsApp."
  },
  
  // Step 5a: Select social platforms
  {
    id: 'social_platforms',
    question: "Which platforms would you like to connect?",
    field: 'socialPlatforms',
    type: 'multiselect',
    options: [
      'Facebook Messenger',
      'Instagram DM',
      'WhatsApp'
    ],
    required: false,
    description: "Select all that apply. You can connect them later in Settings.",
    condition: (data) => data.wantsSocialMedia === 'yes'
  },
  
  // Step 6: Payment processing
  {
    id: 'payment_setup',
    question: "Do you want to accept payments through your CRM?",
    field: 'wantsPayments',
    type: 'yesno',
    required: true,
    description: "Accept credit cards, Apple Pay, and more."
  },
  
  // Step 6a: Payment providers
  {
    id: 'payment_providers',
    question: "Which payment providers would you like to use?",
    field: 'paymentProviders',
    type: 'multiselect',
    options: [
      'Stripe',
      'Square',
      'PayPal',
      'Apple Pay'
    ],
    required: false,
    description: "Select all that apply. You can configure them later in Settings.",
    condition: (data) => data.wantsPayments === 'yes'
  },
  
  // Step 7: Calendar integration
  {
    id: 'calendar_integration',
    question: "Do you want to sync appointments with your calendar?",
    field: 'wantsCalendar',
    type: 'yesno',
    required: true,
    description: "Keep your schedule in sync automatically."
  },
  
  // Step 7a: Calendar provider
  {
    id: 'calendar_provider',
    question: "Which calendar do you use?",
    field: 'calendarProvider',
    type: 'select',
    options: [
      'Google Calendar',
      'Outlook Calendar',
      'Apple Calendar',
      'Other'
    ],
    required: false,
    description: "We'll sync your CRM appointments with your calendar.",
    condition: (data) => data.wantsCalendar === 'yes'
  },
];

class OnboardingConversationService {
  /**
   * Get the next question based on current progress
   */
  getNextStep(currentStepId?: string, progress: any = {}): ConversationStep | null {
    if (!currentStepId) {
      return onboardingSteps[0];
    }

    const currentIndex = onboardingSteps.findIndex((s) => s.id === currentStepId);
    if (currentIndex === -1) {
      return onboardingSteps[0];
    }
    
    // Find next step, skipping conditional steps that don't apply
    for (let i = currentIndex + 1; i < onboardingSteps.length; i++) {
      const step = onboardingSteps[i];
      
      // Check if step has a condition
      if (step.condition && !step.condition(progress)) {
        continue; // Skip this step
      }
      
      return step;
    }
    
    return null; // No more steps
  }
  
  /**
   * Get the previous step for editing
   */
  getPreviousStep(currentStepId: string, progress: any = {}): ConversationStep | null {
    const currentIndex = onboardingSteps.findIndex((s) => s.id === currentStepId);
    if (currentIndex <= 0) {
      return null;
    }
    
    // Find previous step, skipping conditional steps that don't apply
    for (let i = currentIndex - 1; i >= 0; i--) {
      const step = onboardingSteps[i];
      
      // Check if step has a condition
      if (step.condition && !step.condition(progress)) {
        continue; // Skip this step
      }
      
      return step;
    }
    
    return null;
  }

  /**
   * Get a specific step by ID
   */
  getStep(stepId: string): ConversationStep | null {
    return onboardingSteps.find((s) => s.id === stepId) || null;
  }

  /**
   * Format question with collected data
   */
  formatQuestion(question: string, data: any): string {
    let formatted = question;
    Object.keys(data).forEach((key) => {
      formatted = formatted.replace(`{${key}}`, data[key] || '');
    });
    return formatted;
  }

  /**
   * Parse user response based on step type
   */
  parseResponse(step: ConversationStep, response: string): any {
    const lowerResponse = response.toLowerCase().trim();
    
    switch (step.type) {
      case 'yesno':
        if (lowerResponse.includes('yes') || lowerResponse.includes('sure') || 
            lowerResponse.includes('ok') || lowerResponse.includes('yeah')) {
          return 'yes';
        }
        if (lowerResponse.includes('no') || lowerResponse.includes('skip') || 
            lowerResponse.includes('not') || lowerResponse.includes('nope')) {
          return 'no';
        }
        return response.trim();
      
      case 'select':
        // Try to match one of the options
        if (step.options) {
          for (const option of step.options) {
            if (lowerResponse.includes(option.toLowerCase())) {
              return option;
            }
          }
        }
        return response.trim();
      
      case 'multiselect':
        // Split by commas or "and"
        const items = response.split(/,|and/i).map((s) => s.trim());
        return items.filter(item => item.length > 0);
      
      case 'url':
        return response.trim();
      
      case 'text':
      default:
        return response.trim();
    }
  }

  /**
   * Validate step response
   */
  validateResponse(step: ConversationStep, value: any): { valid: boolean; error?: string } {
    if (step.required && !value) {
      return { valid: false, error: 'This field is required' };
    }

    if (step.validation && !step.validation(value)) {
      return { valid: false, error: 'Invalid value' };
    }

    return { valid: true };
  }

  /**
   * Check if onboarding is complete
   */
  isComplete(data: any): boolean {
    // Check all required steps, considering conditional logic
    for (const step of onboardingSteps) {
      if (step.required) {
        // Skip if condition doesn't match
        if (step.condition && !step.condition(data)) {
          continue;
        }
        
        // Check if field has value
        if (!data[step.field]) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Calculate completion percentage
   */
  getCompletionPercentage(data: any): number {
    let totalRequired = 0;
    let completed = 0;
    
    for (const step of onboardingSteps) {
      // Skip conditional steps that don't apply
      if (step.condition && !step.condition(data)) {
        continue;
      }
      
      if (step.required) {
        totalRequired++;
        if (data[step.field]) {
          completed++;
        }
      }
    }
    
    if (totalRequired === 0) return 100;
    return Math.min(Math.round((completed / totalRequired) * 100), 100);
  }
}

export const onboardingConversation = new OnboardingConversationService();
