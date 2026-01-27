
/**
 * Pre-designed Workflow Templates Library
 * Provides ready-to-use workflow templates that can be customized by AI
 */

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sales' | 'marketing' | 'support' | 'seasonal' | 'nurture';
  tags: string[];
  icon: string;
  estimatedDuration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  triggers: Array<{
    type: string;
    config: Record<string, any>;
  }>;
  actions: Array<{
    type: string;
    channel: string;
    config: Record<string, any>;
    delayMinutes?: number;
  }>;
  conditions?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  variables: string[]; // Fields that can be customized
}

export const workflowTemplates: WorkflowTemplate[] = [
  // SEASONAL CAMPAIGNS
  {
    id: 'black-friday-campaign',
    name: 'Black Friday Flash Sale',
    description: 'Automated campaign for Black Friday promotions with multi-channel outreach, countdown reminders, and urgency messaging',
    category: 'seasonal',
    tags: ['black-friday', 'sales', 'email', 'sms', 'urgent'],
    icon: '🛍️',
    estimatedDuration: '5 days',
    difficulty: 'intermediate',
    triggers: [
      {
        type: 'scheduled',
        config: {
          date: '2025-11-28',
          time: '00:00',
          timezone: 'America/New_York'
        }
      }
    ],
    actions: [
      {
        type: 'send_email',
        channel: 'email',
        config: {
          subject: '🔥 BLACK FRIDAY: {{discount}}% OFF - Exclusive Early Access!',
          body: 'Hi {{firstName}},\n\nGet ready for our BIGGEST sale of the year!\n\nBlack Friday is here with {{discount}}% OFF everything in store.\n\n🎁 Exclusive offers for valued customers like you\n⏰ Limited time: {{hours_remaining}} hours remaining\n🚀 Free shipping on orders over ${{free_shipping_threshold}}\n\nShop now: {{shop_url}}\n\nBest regards,\n{{company_name}}',
          template: 'promotional'
        }
      },
      {
        type: 'send_sms',
        channel: 'sms',
        delayMinutes: 180, // 3 hours later
        config: {
          message: '🔥 BLACK FRIDAY ALERT! {{discount}}% OFF ends in {{hours_remaining}}hrs! Shop now: {{short_url}}'
        }
      },
      {
        type: 'send_email',
        channel: 'email',
        delayMinutes: 1440, // Next day
        config: {
          subject: '⏰ Last Chance: {{discount}}% OFF Ends Tonight!',
          body: `{{firstName}}, only {{hours_remaining}} hours left!

Don't miss out on {{discount}}% OFF our entire collection.

Final hours to save big: {{shop_url}}

- {{company_name}}`,
          template: 'urgent'
        }
      },
      {
        type: 'create_deal',
        channel: 'crm',
        delayMinutes: 10,
        config: {
          stage: 'black-friday-engaged',
          value: 0,
          tags: ['black-friday-2025', 'email-opened']
        }
      }
    ],
    conditions: [
      {
        field: 'contact_type',
        operator: 'in',
        value: ['customer', 'lead', 'subscriber']
      },
      {
        field: 'email_verified',
        operator: 'equals',
        value: true
      }
    ],
    variables: ['discount', 'hours_remaining', 'free_shipping_threshold', 'shop_url', 'short_url', 'company_name']
  },

  {
    id: 'holiday-season-campaign',
    name: 'Holiday Season Marketing',
    description: 'Multi-week holiday campaign with gift guides, special offers, and countdown messaging',
    category: 'seasonal',
    tags: ['holidays', 'christmas', 'email', 'gifts'],
    icon: '🎄',
    estimatedDuration: '4 weeks',
    difficulty: 'advanced',
    triggers: [
      {
        type: 'scheduled',
        config: {
          date: '2025-12-01',
          time: '09:00',
          timezone: 'America/New_York'
        }
      }
    ],
    actions: [
      {
        type: 'send_email',
        channel: 'email',
        config: {
          subject: '🎁 Holiday Gift Guide: Perfect Presents for Everyone',
          body: 'Dear {{firstName}},\n\nThe holiday season is here! 🎄\n\nWe\'ve curated the perfect gift guide just for you:\n✨ Top picks for {{recipient_type}}\n🎁 Gift bundles starting at ${{min_price}}\n📦 Free gift wrapping on all orders\n\nBrowse our holiday collection: {{gift_guide_url}}\n\nHappy Holidays,\n{{company_name}}',
          template: 'seasonal'
        }
      },
      {
        type: 'send_email',
        channel: 'email',
        delayMinutes: 10080, // 1 week later
        config: {
          subject: '❄️ Week 2: Holiday Deals + Last-Minute Gifts',
          body: `Hi {{firstName}},

Still searching for the perfect gift?

🎁 New arrivals just added
⚡ Flash deals on bestsellers
🚚 Guaranteed delivery before Christmas (order by {{cutoff_date}})

Shop now: {{shop_url}}

- {{company_name}}`,
          template: 'promotional'
        }
      }
    ],
    conditions: [
      {
        field: 'last_purchase_date',
        operator: 'less_than_days_ago',
        value: 365
      }
    ],
    variables: ['recipient_type', 'min_price', 'gift_guide_url', 'cutoff_date', 'shop_url', 'company_name']
  },

  // LEAD NURTURING
  {
    id: 'new-lead-nurture',
    name: 'New Lead Nurture Sequence',
    description: 'Automated 7-day welcome sequence for new leads with educational content and soft conversion',
    category: 'nurture',
    tags: ['nurture', 'email', 'education', 'conversion'],
    icon: '🌱',
    estimatedDuration: '7 days',
    difficulty: 'beginner',
    triggers: [
      {
        type: 'contact_created',
        config: {
          source: 'any'
        }
      }
    ],
    actions: [
      {
        type: 'send_email',
        channel: 'email',
        config: {
          subject: 'Welcome to {{company_name}} - Here\'s what to expect',
          body: `Hi {{firstName}},

Welcome! We're thrilled to have you here.

Over the next week, we'll share:
📚 Day 1: Getting started guide (today!)
💡 Day 3: Top tips from our experts
🎯 Day 5: Success stories from customers like you
✨ Day 7: Exclusive offer just for you

Let's get started: {{onboarding_url}}

Cheers,
{{sender_name}} from {{company_name}}`,
          template: 'welcome'
        }
      },
      {
        type: 'send_email',
        channel: 'email',
        delayMinutes: 4320, // Day 3
        config: {
          subject: '💡 3 Quick Tips to Get More from {{product_name}}',
          body: `Hey {{firstName}},

Here are 3 game-changing tips:

1️⃣ {{tip_1}}
2️⃣ {{tip_2}}
3️⃣ {{tip_3}}

Want to learn more? {{resources_url}}

Best,
{{sender_name}}`,
          template: 'educational'
        }
      },
      {
        type: 'send_email',
        channel: 'email',
        delayMinutes: 7200, // Day 5
        config: {
          subject: '🎯 How {{customer_name}} Achieved {{result}}',
          body: `{{firstName}}, you'll love this story...

{{customer_name}} was just like you - {{customer_challenge}}.

After using {{product_name}}, they achieved:
✅ {{result_1}}
✅ {{result_2}}
✅ {{result_3}}

Read the full case study: {{case_study_url}}

- {{sender_name}}`,
          template: 'social-proof'
        }
      },
      {
        type: 'send_email',
        channel: 'email',
        delayMinutes: 10080, // Day 7
        config: {
          subject: '🎁 Special offer: {{discount}}% OFF for new members',
          body: `Hi {{firstName}},

As a thank you for joining us, here's an exclusive offer:

🎁 {{discount}}% OFF your first {{product_type}}
⏰ Valid for the next {{validity_hours}} hours
🚀 No minimum purchase required

Claim your discount: {{offer_url}}

This offer expires soon!

{{sender_name}}
{{company_name}}`,
          template: 'conversion'
        }
      },
      {
        type: 'create_task',
        channel: 'crm',
        delayMinutes: 10100,
        config: {
          title: 'Follow up with {{firstName}} on nurture campaign',
          description: 'Check if lead needs personal outreach',
          assignTo: 'sales',
          dueInHours: 24
        }
      }
    ],
    conditions: [
      {
        field: 'contact_type',
        operator: 'equals',
        value: 'lead'
      }
    ],
    variables: ['company_name', 'sender_name', 'product_name', 'onboarding_url', 'resources_url', 
                'customer_name', 'customer_challenge', 'result', 'case_study_url', 
                'discount', 'product_type', 'validity_hours', 'offer_url']
  },

  // SALES SEQUENCES
  {
    id: 'abandoned-cart-recovery',
    name: 'Abandoned Cart Recovery',
    description: 'Recover lost sales with strategic follow-up emails and SMS reminders',
    category: 'sales',
    tags: ['cart', 'conversion', 'email', 'sms'],
    icon: '🛒',
    estimatedDuration: '3 days',
    difficulty: 'intermediate',
    triggers: [
      {
        type: 'cart_abandoned',
        config: {
          minutesInactive: 60
        }
      }
    ],
    actions: [
      {
        type: 'send_email',
        channel: 'email',
        delayMinutes: 60,
        config: {
          subject: 'You left something behind... 👀',
          body: 'Hi {{firstName}},\n\nWe noticed you left {{item_count}} item(s) in your cart.\n\nYour cart contains:\n{{cart_items}}\n\nTotal: ${{cart_total}}\n\nComplete your purchase: {{cart_url}}\n\nNeed help? Just reply to this email.\n\n{{company_name}}',
          template: 'transactional'
        }
      },
      {
        type: 'send_email',
        channel: 'email',
        delayMinutes: 1440, // 24 hours
        config: {
          subject: '💰 Still interested? Here\'s {{discount}}% OFF!',
          body: '{{firstName}}, we really want you to have this!\n\nYour items are waiting, and we\'re adding a special discount:\n\n🎁 {{discount}}% OFF your cart\n⏰ Expires in {{hours_remaining}} hours\n\nYour new total: ${{discounted_total}} (was ${{cart_total}})\n\nClaim discount: {{cart_url}}?discount={{discount_code}}\n\n{{company_name}}',
          template: 'promotional'
        }
      },
      {
        type: 'send_sms',
        channel: 'sms',
        delayMinutes: 2880, // 48 hours
        config: {
          message: '⏰ Last chance! Your cart expires in 4hrs. {{discount}}% OFF waiting: {{short_url}}'
        }
      }
    ],
    conditions: [
      {
        field: 'cart_total',
        operator: 'greater_than',
        value: 50
      },
      {
        field: 'phone_verified',
        operator: 'equals',
        value: true
      }
    ],
    variables: ['item_count', 'cart_items', 'cart_total', 'cart_url', 'discount', 
                'hours_remaining', 'discounted_total', 'discount_code', 'short_url', 'company_name']
  },

  {
    id: 'win-back-campaign',
    name: 'Win-Back Inactive Customers',
    description: 'Re-engage customers who haven\'t purchased in 90+ days with special incentives',
    category: 'sales',
    tags: ['retention', 'email', 'discount'],
    icon: '💝',
    estimatedDuration: '14 days',
    difficulty: 'intermediate',
    triggers: [
      {
        type: 'customer_inactive',
        config: {
          daysSinceLastPurchase: 90
        }
      }
    ],
    actions: [
      {
        type: 'send_email',
        channel: 'email',
        config: {
          subject: 'We miss you, {{firstName}}! 💙',
          body: `Hi {{firstName}},

It's been a while since we've seen you...

We'd love to have you back! Here's what's new:
✨ {{new_feature_1}}
🎯 {{new_feature_2}}
🚀 {{new_feature_3}}

Come back and see: {{website_url}}

Best,
{{company_name}}`,
          template: 're-engagement'
        }
      },
      {
        type: 'send_email',
        channel: 'email',
        delayMinutes: 10080, // 1 week
        config: {
          subject: '🎁 We want you back: {{discount}}% OFF + Free Shipping',
          body: `{{firstName}}, we really miss you!

Here's an exclusive welcome back offer:

🎁 {{discount}}% OFF everything
📦 FREE shipping (no minimum)
⏰ Valid for {{validity_days}} days

Your personal code: {{promo_code}}

Shop now: {{shop_url}}?code={{promo_code}}

We hope to see you soon!
{{company_name}}`,
          template: 'win-back'
        }
      },
      {
        type: 'create_deal',
        channel: 'crm',
        delayMinutes: 10090,
        config: {
          stage: 'win-back-engaged',
          value: 0,
          tags: ['win-back-campaign', 'discount-sent']
        }
      }
    ],
    conditions: [
      {
        field: 'total_purchases',
        operator: 'greater_than',
        value: 0
      },
      {
        field: 'days_since_last_purchase',
        operator: 'greater_than',
        value: 90
      }
    ],
    variables: ['new_feature_1', 'new_feature_2', 'new_feature_3', 'website_url',
                'discount', 'validity_days', 'promo_code', 'shop_url', 'company_name']
  },

  // CUSTOMER SUPPORT
  {
    id: 'post-purchase-followup',
    name: 'Post-Purchase Follow-Up',
    description: 'Automated thank you, product tips, and review request sequence',
    category: 'support',
    tags: ['support', 'review', 'education'],
    icon: '✉️',
    estimatedDuration: '14 days',
    difficulty: 'beginner',
    triggers: [
      {
        type: 'purchase_completed',
        config: {}
      }
    ],
    actions: [
      {
        type: 'send_email',
        channel: 'email',
        delayMinutes: 60,
        config: {
          subject: 'Thank you for your order! 🎉',
          body: `Hi {{firstName}},

Thank you for your purchase!

Order #{{order_number}} is confirmed and will ship within {{shipping_days}} business days.

Track your order: {{tracking_url}}

Questions? We're here to help: {{support_email}}

{{company_name}}`,
          template: 'transactional'
        }
      },
      {
        type: 'send_email',
        channel: 'email',
        delayMinutes: 4320, // 3 days
        config: {
          subject: '💡 Getting the most from your {{product_name}}',
          body: `Hey {{firstName}},

Hope you're enjoying your new {{product_name}}!

Here are some pro tips:
1️⃣ {{tip_1}}
2️⃣ {{tip_2}}
3️⃣ {{tip_3}}

Watch tutorial: {{tutorial_url}}

Need help? Just reply!

{{company_name}}`,
          template: 'educational'
        }
      },
      {
        type: 'send_email',
        channel: 'email',
        delayMinutes: 10080, // 7 days
        config: {
          subject: 'How\'s everything going with your {{product_name}}? ⭐',
          body: `Hi {{firstName}},

We'd love to hear about your experience!

Your feedback helps us improve and helps other customers make informed decisions.

Leave a review (takes 2 minutes): {{review_url}}

As a thank you, you'll get {{reward}} for your honest review.

Thanks for being awesome!
{{company_name}}`,
          template: 'feedback'
        }
      }
    ],
    conditions: [
      {
        field: 'order_total',
        operator: 'greater_than',
        value: 0
      }
    ],
    variables: ['order_number', 'shipping_days', 'tracking_url', 'support_email',
                'product_name', 'tip_1', 'tip_2', 'tip_3', 'tutorial_url',
                'review_url', 'reward', 'company_name']
  },

  // MARKETING AUTOMATION
  {
    id: 'birthday-campaign',
    name: 'Birthday Celebration Campaign',
    description: 'Automated birthday wishes with special offers to delight customers',
    category: 'marketing',
    tags: ['birthday', 'email', 'sms', 'loyalty'],
    icon: '🎂',
    estimatedDuration: '1 day',
    difficulty: 'beginner',
    triggers: [
      {
        type: 'birthday',
        config: {
          daysBefore: 0
        }
      }
    ],
    actions: [
      {
        type: 'send_email',
        channel: 'email',
        config: {
          subject: '🎂 Happy Birthday, {{firstName}}! Here\'s a gift for you 🎁',
          body: `Happy Birthday, {{firstName}}! 🎉

Wishing you an amazing day filled with joy and celebration!

To make your day even better, here's a special birthday gift:

🎁 {{discount}}% OFF your next purchase
🎂 Valid for {{validity_days}} days
💝 Use code: BDAY{{year}}

Treat yourself: {{shop_url}}

Have a wonderful birthday!

With love,
{{company_name}}`,
          template: 'celebration'
        }
      },
      {
        type: 'send_sms',
        channel: 'sms',
        delayMinutes: 30,
        config: {
          message: '🎂 Happy Birthday {{firstName}}! Enjoy {{discount}}% OFF with code BDAY{{year}}. Celebrate: {{short_url}} 🎁'
        }
      }
    ],
    conditions: [
      {
        field: 'birthday',
        operator: 'is_today',
        value: true
      },
      {
        field: 'email_verified',
        operator: 'equals',
        value: true
      }
    ],
    variables: ['discount', 'validity_days', 'year', 'shop_url', 'short_url', 'company_name']
  },

  {
    id: 'webinar-funnel',
    name: 'Webinar Registration & Follow-Up',
    description: 'Complete webinar funnel from registration to post-event nurture',
    category: 'marketing',
    tags: ['webinar', 'email', 'education', 'conversion'],
    icon: '🎥',
    estimatedDuration: '10 days',
    difficulty: 'advanced',
    triggers: [
      {
        type: 'webinar_registered',
        config: {}
      }
    ],
    actions: [
      {
        type: 'send_email',
        channel: 'email',
        config: {
          subject: '✅ You\'re registered for {{webinar_title}}!',
          body: `Hi {{firstName}},

You're all set for our webinar!

📅 Date: {{webinar_date}}
🕐 Time: {{webinar_time}} {{timezone}}
🎯 Topic: {{webinar_title}}

What you'll learn:
• {{learning_point_1}}
• {{learning_point_2}}
• {{learning_point_3}}

Add to calendar: {{calendar_url}}
Join live: {{webinar_url}}

Can't wait to see you there!
{{host_name}}`,
          template: 'event'
        }
      },
      {
        type: 'send_email',
        channel: 'email',
        delayMinutes: 1440, // 1 day before
        config: {
          subject: '⏰ Tomorrow: {{webinar_title}} - Last minute prep!',
          body: `Hey {{firstName}},

Just 24 hours until our webinar!

Quick reminders:
✅ Join early for the best experience
✅ Bring your questions
✅ Share with a colleague!

Tomorrow at {{webinar_time}}: {{webinar_url}}

See you soon!
{{host_name}}`,
          template: 'reminder'
        }
      },
      {
        type: 'send_sms',
        channel: 'sms',
        delayMinutes: 2880, // 1 hour before
        config: {
          message: '⏰ Starting in 1 hour! Join {{webinar_title}}: {{webinar_url}} See you soon! - {{host_name}}'
        }
      },
      {
        type: 'send_email',
        channel: 'email',
        delayMinutes: 3000, // 2 hours after
        config: {
          subject: '🎁 Thank you for attending! Here\'s your exclusive offer',
          body: `Hi {{firstName}},

Thank you for joining us today!

As promised, here are your resources:
📹 Webinar recording: {{recording_url}}
📊 Slides: {{slides_url}}
🎁 Special attendee offer: {{discount}}% OFF

Your exclusive code: {{promo_code}}

This offer expires in {{expiry_hours}} hours!

Claim now: {{offer_url}}?code={{promo_code}}

Questions? Just reply!
{{host_name}}`,
          template: 'follow-up'
        }
      }
    ],
    conditions: [
      {
        field: 'webinar_registered',
        operator: 'equals',
        value: true
      }
    ],
    variables: ['webinar_title', 'webinar_date', 'webinar_time', 'timezone',
                'learning_point_1', 'learning_point_2', 'learning_point_3',
                'calendar_url', 'webinar_url', 'host_name',
                'recording_url', 'slides_url', 'discount', 'promo_code',
                'expiry_hours', 'offer_url']
  }
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
  return workflowTemplates.filter(t => t.category === category);
}

/**
 * Search templates by keyword
 */
export function searchTemplates(query: string): WorkflowTemplate[] {
  const lowerQuery = query.toLowerCase();
  return workflowTemplates.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get all template categories
 */
export function getTemplateCategories(): Array<{value: string; label: string}> {
  return [
    { value: 'sales', label: 'Sales' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'support', label: 'Support' },
    { value: 'seasonal', label: 'Seasonal' },
    { value: 'nurture', label: 'Nurture' }
  ];
}
