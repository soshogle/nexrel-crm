
// Business Categories
export const BUSINESS_CATEGORIES = [
  'Marketing Agency',
  'Digital Marketing',
  'Real Estate',
  'Healthcare',
  'Legal Services',
  'Financial Services',
  'Insurance',
  'Consulting',
  'E-commerce',
  'SaaS',
  'Education',
  'Fitness & Wellness',
  'Restaurant & Food',
  'Sports Club',
  'Retail',
  'Construction',
  'Home Services',
  'Automotive',
  'Travel & Hospitality',
  'Non-Profit',
  'Other'
];

// Industry Niches (organized by category)
export const INDUSTRY_NICHES = [
  'B2B Services',
  'B2C Services',
  'Lead Generation',
  'Appointment Setting',
  'E-commerce Sales',
  'Local Services',
  'Professional Services',
  'Creative Services',
  'Technical Services',
  'Medical & Dental',
  'Legal & Compliance',
  'Financial Planning',
  'Real Estate Sales',
  'Property Management',
  'Insurance Brokerage',
  'Educational Services',
  'Online Courses',
  'Coaching & Training',
  'Fitness Training',
  'Nutrition & Wellness',
  'Restaurant Operations',
  'Food Delivery',
  'Catering Services',
  'Soccer Leagues',
  'Basketball Leagues',
  'Baseball/Softball Leagues',
  'Multi-Sport Clubs',
  'Youth Sports Programs',
  'Adult Sports Leagues',
  'Sports Camps & Clinics',
  'Retail Stores',
  'Online Retail',
  'Wholesale',
  'General Contracting',
  'Specialized Trades',
  'Home Repairs',
  'Auto Sales',
  'Auto Repair',
  'Hotels & Lodging',
  'Tours & Activities',
  'Event Planning',
  'Non-Profit Fundraising',
  'Community Services',
  'Custom/Other'
];

// Email Providers
export const EMAIL_PROVIDERS = [
  { value: 'gmail', label: 'Gmail (Google Workspace)', requiresOAuth: true, popular: true },
  { value: 'outlook', label: 'Microsoft Outlook / Office 365', requiresOAuth: true, popular: true },
  { value: 'sendgrid', label: 'SendGrid', requiresAPIKey: true },
  { value: 'mailgun', label: 'Mailgun', requiresAPIKey: true },
  { value: 'amazon-ses', label: 'Amazon SES', requiresAPIKey: true },
  { value: 'smtp', label: 'Custom SMTP Server', requiresCredentials: true },
  { value: 'skip', label: 'Skip for now', requiresNothing: true }
];

// SMS Providers
export const SMS_PROVIDERS = [
  { value: 'twilio', label: 'Twilio', popular: true, recommended: true },
  { value: 'bandwidth', label: 'Bandwidth' },
  { value: 'plivo', label: 'Plivo' },
  { value: 'messagebird', label: 'MessageBird' },
  { value: 'vonage', label: 'Vonage (Nexmo)' },
  { value: 'skip', label: 'Skip for now' }
];

// Payment Providers
export const PAYMENT_PROVIDERS = [
  { value: 'stripe', label: 'Stripe', popular: true, recommended: true },
  { value: 'square', label: 'Square', popular: true },
  { value: 'paypal', label: 'PayPal' },
  { value: 'authorize-net', label: 'Authorize.net' },
  { value: 'braintree', label: 'Braintree' },
  { value: 'skip', label: 'Skip for now' }
];

// Team Sizes
export const TEAM_SIZES = [
  'Just me (1)',
  '2-5 people',
  '6-10 people',
  '11-25 people',
  '26-50 people',
  '51-100 people',
  '100+ people'
];

// Sales Cycle Lengths
export const SALES_CYCLE_LENGTHS = [
  '1-7 days',
  '1-2 weeks',
  '2-4 weeks',
  '1-3 months',
  '3-6 months',
  '6-12 months',
  '12+ months'
];

// Lead Sources
export const LEAD_SOURCES = [
  'Website / Organic Search',
  'Social Media',
  'Paid Advertising',
  'Referrals',
  'Email Marketing',
  'Cold Outreach',
  'Events / Trade Shows',
  'Partnerships',
  'Other'
];

// Contact Methods
export const CONTACT_METHODS = [
  'Email',
  'Phone Call',
  'SMS / Text',
  'WhatsApp',
  'Social Media DM'
];

// Campaign Tones
export const CAMPAIGN_TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual & Friendly' },
  { value: 'authoritative', label: 'Authoritative & Expert' },
  { value: 'playful', label: 'Playful & Creative' },
  { value: 'empathetic', label: 'Empathetic & Caring' }
];

// Marketing Channels
export const MARKETING_CHANNELS = [
  'Email Marketing',
  'SMS Marketing',
  'Social Media',
  'Paid Advertising',
  'Content Marketing',
  'SEO',
  'Mix of All'
];

// Marketing Budgets
export const MARKETING_BUDGETS = [
  'Under $500/month',
  '$500 - $1,000/month',
  '$1,000 - $2,500/month',
  '$2,500 - $5,000/month',
  '$5,000 - $10,000/month',
  '$10,000+/month'
];

// Website Traffic
export const WEBSITE_TRAFFIC = [
  'No website yet',
  'Under 500 visitors/month',
  '500-1,000 visitors/month',
  '1,000-5,000 visitors/month',
  '5,000-10,000 visitors/month',
  '10,000-50,000 visitors/month',
  '50,000+ visitors/month'
];

// Current CRMs
export const CURRENT_CRMS = [
  'None - This is my first CRM',
  'Salesforce',
  'HubSpot',
  'Zoho CRM',
  'Pipedrive',
  'Monday.com',
  'ClickFunnels',
  'ActiveCampaign',
  'Keap (Infusionsoft)',
  'GoHighLevel',
  'Other'
];

// Currencies
export const CURRENCIES = [
  { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
  { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
  { value: 'CAD', label: 'Canadian Dollar ($)', symbol: 'CA$' },
  { value: 'AUD', label: 'Australian Dollar ($)', symbol: 'A$' },
  { value: 'INR', label: 'Indian Rupee (₹)', symbol: '₹' },
  { value: 'JPY', label: 'Japanese Yen (¥)', symbol: '¥' },
  { value: 'CNY', label: 'Chinese Yuan (¥)', symbol: '¥' },
  { value: 'BRL', label: 'Brazilian Real (R$)', symbol: 'R$' },
  { value: 'MXN', label: 'Mexican Peso ($)', symbol: 'MX$' }
];

// Languages
export const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Chinese (Mandarin)',
  'Japanese',
  'Korean',
  'Arabic',
  'Hindi',
  'Russian',
  'Dutch',
  'Polish',
  'Turkish',
  'Other'
];

// Timezones (Common ones)
export const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Anchorage', label: 'Alaska' },
  { value: 'Pacific/Honolulu', label: 'Hawaii' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Europe/Rome', label: 'Rome' },
  { value: 'Europe/Madrid', label: 'Madrid' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Shanghai', label: 'China' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'Pacific/Auckland', label: 'New Zealand' }
];
