import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/tools/marketplace/seed - Seed marketplace with pre-built templates (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (you may want to add role check)
    // For now, let's allow any authenticated user to seed

    const templates: any[] = [
      {
        name: 'Shopify API',
        slug: 'shopify',
        description:
          'Connect to Shopify to manage products, orders, and customers. Sync inventory and automate order fulfillment.',
        category: 'INTEGRATION',
        baseUrl: 'https://[YOUR-STORE].myshopify.com/admin/api/2024-01',
        authType: 'API_KEY',
        authConfig: {
          instructions:
            'Get your API key from Shopify Admin > Apps > Develop apps',
          keyFormat: 'shpat_xxxxx',
        },
        capabilities: [
          { name: 'Get Products', endpoint: '/products.json', method: 'GET' },
          { name: 'Create Product', endpoint: '/products.json', method: 'POST' },
          { name: 'Get Orders', endpoint: '/orders.json', method: 'GET' },
          { name: 'Get Customers', endpoint: '/customers.json', method: 'GET' },
        ],
        requiredScopes: ['read_products', 'write_products', 'read_orders'],
        webhookSupport: true,
        isPublic: true,
        isOfficial: true,
        logoUrl: '/integrations/shopify-logo.png',
        documentationUrl: 'https://shopify.dev/docs/api',
      },
      {
        name: 'Stripe Payments',
        slug: 'stripe',
        description:
          'Accept payments, manage subscriptions, and handle refunds with Stripe integration.',
        category: 'PAYMENT',
        baseUrl: 'https://api.stripe.com/v1',
        authType: 'BEARER_TOKEN',
        authConfig: {
          instructions:
            'Get your secret key from Stripe Dashboard > Developers > API keys',
          keyFormat: 'sk_test_xxxxx or sk_live_xxxxx',
        },
        capabilities: [
          { name: 'Create Customer', endpoint: '/customers', method: 'POST' },
          {
            name: 'Create Payment Intent',
            endpoint: '/payment_intents',
            method: 'POST',
          },
          { name: 'List Charges', endpoint: '/charges', method: 'GET' },
          { name: 'Create Refund', endpoint: '/refunds', method: 'POST' },
        ],
        requiredScopes: [],
        webhookSupport: true,
        isPublic: true,
        isOfficial: true,
        logoUrl: '/integrations/stripe-logo.png',
        documentationUrl: 'https://stripe.com/docs/api',
      },
      {
        name: 'SendGrid Email',
        slug: 'sendgrid',
        description:
          'Send transactional and marketing emails at scale with SendGrid.',
        category: 'COMMUNICATION',
        baseUrl: 'https://api.sendgrid.com/v3',
        authType: 'BEARER_TOKEN',
        authConfig: {
          instructions:
            'Create an API key from SendGrid Dashboard > Settings > API Keys',
          keyFormat: 'SG.xxxxx',
        },
        capabilities: [
          { name: 'Send Email', endpoint: '/mail/send', method: 'POST' },
          { name: 'Get Email Stats', endpoint: '/stats', method: 'GET' },
          { name: 'Manage Templates', endpoint: '/templates', method: 'GET' },
        ],
        requiredScopes: ['mail.send'],
        webhookSupport: true,
        isPublic: true,
        isOfficial: true,
        logoUrl: '/integrations/sendgrid-logo.png',
        documentationUrl: 'https://docs.sendgrid.com/api-reference',
      },
      {
        name: 'Mailchimp Marketing',
        slug: 'mailchimp',
        description:
          'Manage email lists, campaigns, and marketing automation with Mailchimp.',
        category: 'COMMUNICATION',
        baseUrl: 'https://[DC].api.mailchimp.com/3.0',
        authType: 'API_KEY',
        authConfig: {
          instructions:
            'Get your API key from Mailchimp > Account > Extras > API keys',
          keyFormat: 'xxxxxxxxxxxxxxxxxxxxxx-usXX',
        },
        capabilities: [
          { name: 'Get Lists', endpoint: '/lists', method: 'GET' },
          { name: 'Add Member', endpoint: '/lists/{list_id}/members', method: 'POST' },
          { name: 'Create Campaign', endpoint: '/campaigns', method: 'POST' },
          { name: 'Get Reports', endpoint: '/reports', method: 'GET' },
        ],
        requiredScopes: [],
        webhookSupport: true,
        isPublic: true,
        isOfficial: true,
        logoUrl: '/integrations/mailchimp-logo.png',
        documentationUrl: 'https://mailchimp.com/developer/',
      },
      {
        name: 'Twilio Communications',
        slug: 'twilio',
        description:
          'Send SMS, make calls, and manage communication channels with Twilio.',
        category: 'COMMUNICATION',
        baseUrl: 'https://api.twilio.com/2010-04-01',
        authType: 'BASIC_AUTH',
        authConfig: {
          instructions:
            'Get your Account SID and Auth Token from Twilio Console',
          usernameField: 'Account SID',
          passwordField: 'Auth Token',
        },
        capabilities: [
          {
            name: 'Send SMS',
            endpoint: '/Accounts/{AccountSid}/Messages.json',
            method: 'POST',
          },
          {
            name: 'Make Call',
            endpoint: '/Accounts/{AccountSid}/Calls.json',
            method: 'POST',
          },
          {
            name: 'List Messages',
            endpoint: '/Accounts/{AccountSid}/Messages.json',
            method: 'GET',
          },
        ],
        requiredScopes: [],
        webhookSupport: true,
        isPublic: true,
        isOfficial: true,
        logoUrl: '/integrations/twilio-logo.png',
        documentationUrl: 'https://www.twilio.com/docs/usage/api',
      },
      {
        name: 'Slack Workspace',
        slug: 'slack',
        description:
          'Send messages, create channels, and integrate with Slack workspace.',
        category: 'COMMUNICATION',
        baseUrl: 'https://slack.com/api',
        authType: 'BEARER_TOKEN',
        authConfig: {
          instructions:
            'Create a Slack App and get Bot User OAuth Token from OAuth & Permissions',
          keyFormat: 'xoxb-xxxxx',
        },
        capabilities: [
          { name: 'Post Message', endpoint: '/chat.postMessage', method: 'POST' },
          { name: 'List Channels', endpoint: '/conversations.list', method: 'GET' },
          {
            name: 'Upload File',
            endpoint: '/files.upload',
            method: 'POST',
          },
        ],
        requiredScopes: ['chat:write', 'channels:read', 'files:write'],
        webhookSupport: true,
        isPublic: true,
        isOfficial: true,
        logoUrl: '/integrations/slack-logo.png',
        documentationUrl: 'https://api.slack.com/web',
      },
    ];

    const created = [];
    for (const template of templates) {
      // Check if already exists
      const existing = await prisma.toolDefinition.findUnique({
        where: { slug: template.slug },
      });

      if (!existing) {
        const definition = await prisma.toolDefinition.create({
          data: template,
        });
        created.push(definition);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${created.length} tool definitions`,
      created,
    });
  } catch (error: any) {
    console.error('Error seeding marketplace:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to seed marketplace' },
      { status: 500 }
    );
  }
}
