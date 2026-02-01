
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createPaymentIntent } from '@/lib/payments/stripe-service';
import { createPayment as createSquarePayment } from '@/lib/payments/square-service';
import { createOrder as createPayPalOrder } from '@/lib/payments/paypal-service';
import { RateLimiters, getClientIdentifier, createRateLimitResponse } from '@/lib/security/rate-limiter';
import { sanitizeEmail, sanitizeText, sanitizeNumber } from '@/lib/security/input-sanitizer';
import { AuditLogger } from '@/lib/security/audit-logger';

// POST - Create a payment intent

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Apply rate limiting (10 payment requests per minute)
  const clientId = getClientIdentifier(request);
  const rateLimitResult = RateLimiters.payment(request, `payment:${clientId}`);
  
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult.resetIn);
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    
    // Sanitize inputs
    const provider = body.provider || 'STRIPE';
    const amount = sanitizeNumber(body.amount, { min: 0.5, max: 1000000 });
    const currency = sanitizeText(body.currency || 'USD');
    const customerName = sanitizeText(body.customerName);
    const customerEmail = sanitizeEmail(body.customerEmail);
    const customerPhone = body.customerPhone ? sanitizeText(body.customerPhone) : undefined;
    const description = body.description ? sanitizeText(body.description) : undefined;
    const paymentType = body.paymentType || 'OTHER';
    const appointmentId = body.appointmentId;
    const dealId = body.dealId;
    const leadId = body.leadId;
    const invoiceId = body.invoiceId;

    if (!amount || !customerName || !customerEmail) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 }
      );
    }

    let paymentIntent: any;
    let providerPaymentId: string;

    // Get provider settings
    const providerSettings = await prisma.paymentProviderSettings.findUnique({
      where: {
        userId_provider: {
          userId: user.id,
          provider
        }
      }
    });

    if (!providerSettings || !providerSettings.isActive) {
      return NextResponse.json(
        { error: `${provider} is not configured or inactive` },
        { status: 400 }
      );
    }

    // Create payment based on provider
    if (provider === 'STRIPE') {
      paymentIntent = await createPaymentIntent(user.id, {
        amount,
        currency,
        customerEmail,
        customerName,
        description,
        metadata: {
          paymentType,
          appointmentId: appointmentId || '',
          dealId: dealId || '',
          leadId: leadId || ''
        }
      });
      providerPaymentId = paymentIntent.id;
    } else if (provider === 'PAYPAL') {
      paymentIntent = await createPayPalOrder(user.id, {
        amount,
        currency,
        description,
        referenceId: appointmentId || dealId || leadId
      });
      providerPaymentId = paymentIntent.id;
    } else {
      return NextResponse.json(
        { error: 'Unsupported payment provider' },
        { status: 400 }
      );
    }

    // Create payment record in database
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        providerId: providerSettings.id,
        provider,
        providerPaymentId,
        amount,
        currency,
        status: 'PENDING',
        paymentType,
        customerName,
        customerEmail,
        customerPhone,
        description,
        dealId,
        leadId,
        invoiceId
      }
    });

    // Log successful payment creation
    await AuditLogger.logPayment(
      user.id,
      payment.id,
      request,
      {
        provider,
        amount,
        currency,
        paymentType,
        customerEmail,
      },
      true
    );

    return NextResponse.json({
      success: true,
      payment,
      clientSecret: paymentIntent.client_secret || null,
      orderId: provider === 'PAYPAL' ? paymentIntent.id : null
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    
    // Log failed payment attempt
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      });
      
      if (user) {
        await AuditLogger.logPayment(
          user.id,
          'unknown',
          request,
          { error: error.message },
          false,
          error.message
        );
      }
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
