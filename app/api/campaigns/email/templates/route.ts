
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const EMAIL_TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    category: 'Onboarding',
    subject: 'Welcome to {{companyName}}!',
    previewText: 'We\'re excited to have you on board',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome to {{companyName}}!</h1>
        <p>Hi {{recipientName}},</p>
        <p>We're thrilled to have you join us. Here's what you can expect:</p>
        <ul>
          <li>Personalized support from our team</li>
          <li>Regular updates on our latest offerings</li>
          <li>Exclusive deals and promotions</li>
        </ul>
        <p>If you have any questions, feel free to reach out anytime.</p>
        <p>Best regards,<br>The {{companyName}} Team</p>
      </div>
    `,
  },
  {
    id: 'follow-up',
    name: 'Follow-Up Email',
    category: 'Engagement',
    subject: 'Following up on our conversation',
    previewText: 'Just checking in with you',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Hi {{recipientName}},</h2>
        <p>I wanted to follow up on our recent conversation about {{topic}}.</p>
        <p>Do you have any questions or concerns I can address? I'm here to help!</p>
        <p>Looking forward to hearing from you.</p>
        <p>Best regards,<br>{{senderName}}<br>{{companyName}}</p>
      </div>
    `,
  },
  {
    id: 'promotion',
    name: 'Promotional Email',
    category: 'Marketing',
    subject: '🎉 Special Offer Just for You!',
    previewText: 'Don\'t miss out on this exclusive deal',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
        <h1 style="color: #4F46E5;">Special Offer!</h1>
        <p style="font-size: 18px;">Hi {{recipientName}},</p>
        <p>We have an exclusive offer just for you!</p>
        <div style="background-color: #EEF2FF; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h2 style="color: #4F46E5; margin: 0;">{{offerTitle}}</h2>
          <p style="font-size: 16px;">{{offerDescription}}</p>
        </div>
        <a href="{{ctaLink}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          {{ctaText}}
        </a>
        <p style="color: #666; font-size: 14px;">Offer expires: {{expirationDate}}</p>
      </div>
    `,
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    category: 'Content',
    subject: '📰 Your Monthly Update from {{companyName}}',
    previewText: 'What\'s new this month',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; border-bottom: 3px solid #4F46E5; padding-bottom: 10px;">
          Monthly Newsletter
        </h1>
        <p>Hi {{recipientName}},</p>
        <p>Here's what's new this month:</p>
        
        <div style="margin: 20px 0;">
          <h3 style="color: #4F46E5;">{{headline1}}</h3>
          <p>{{content1}}</p>
        </div>
        
        <div style="margin: 20px 0;">
          <h3 style="color: #4F46E5;">{{headline2}}</h3>
          <p>{{content2}}</p>
        </div>
        
        <div style="margin: 20px 0;">
          <h3 style="color: #4F46E5;">{{headline3}}</h3>
          <p>{{content3}}</p>
        </div>
        
        <p>Stay tuned for more updates!</p>
        <p>Best,<br>The {{companyName}} Team</p>
      </div>
    `,
  },
  {
    id: 'appointment-reminder',
    name: 'Appointment Reminder',
    category: 'Transactional',
    subject: 'Reminder: Your appointment on {{appointmentDate}}',
    previewText: 'Don\'t forget your upcoming appointment',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Appointment Reminder</h2>
        <p>Hi {{recipientName}},</p>
        <p>This is a friendly reminder about your upcoming appointment:</p>
        <div style="background-color: #F3F4F6; padding: 15px; border-left: 4px solid #4F46E5; margin: 20px 0;">
          <p><strong>Date:</strong> {{appointmentDate}}</p>
          <p><strong>Time:</strong> {{appointmentTime}}</p>
          <p><strong>Location:</strong> {{location}}</p>
        </div>
        <p>If you need to reschedule, please let us know as soon as possible.</p>
        <p>See you soon!<br>{{companyName}}</p>
      </div>
    `,
  },
];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(EMAIL_TEMPLATES);
  } catch (error: unknown) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
