import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createPaymentIntent } from "@/lib/payments/stripe-service";
import { createPayment as createSquarePayment } from "@/lib/payments/square-service";
import { createOrder as createPayPalOrder } from "@/lib/payments/paypal-service";
import {
  RateLimiters,
  getClientIdentifier,
  createRateLimitResponse,
} from "@/lib/security/rate-limiter";
import {
  sanitizeEmail,
  sanitizeText,
  sanitizeNumber,
} from "@/lib/security/input-sanitizer";
import { AuditLogger } from "@/lib/security/audit-logger";
import { apiErrors } from "@/lib/api-error";
import { z } from "zod";

// POST - Create a payment intent

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return apiErrors.notFound("User not found");
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return apiErrors.badRequest("Request body must be valid JSON");
    }

    // Zod schema validation
    const paymentBodySchema = z.object({
      provider: z.enum(["STRIPE", "PAYPAL", "SQUARE"]).default("STRIPE"),
      amount: z
        .number()
        .positive("Amount must be a positive number")
        .max(1_000_000),
      currency: z
        .string()
        .length(3, "Currency must be a 3-letter ISO code")
        .default("USD"),
      customerName: z.string().min(1, "Customer name is required").max(255),
      customerEmail: z.string().email("Invalid customer email"),
      customerPhone: z.string().max(30).optional(),
      description: z.string().max(500).optional(),
      paymentType: z
        .enum([
          "APPOINTMENT",
          "INVOICE",
          "SUBSCRIPTION",
          "DEAL",
          "SERVICE",
          "PRODUCT",
          "OTHER",
        ])
        .default("OTHER"),
      appointmentId: z.string().optional(),
      dealId: z.string().optional(),
      leadId: z.string().optional(),
      invoiceId: z.string().optional(),
    });

    const parsed = paymentBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return apiErrors.validationError(
        "Validation failed",
        parsed.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      );
    }
    const body = parsed.data;

    // Sanitize validated inputs
    const provider = body.provider;
    const amount = sanitizeNumber(body.amount, { min: 0.5, max: 1000000 });
    const currency = sanitizeText(body.currency);
    const customerName = sanitizeText(body.customerName);
    const customerEmail = sanitizeEmail(body.customerEmail);
    const customerPhone = body.customerPhone
      ? sanitizeText(body.customerPhone)
      : undefined;
    const description = body.description
      ? sanitizeText(body.description)
      : undefined;
    const paymentType = body.paymentType;
    const appointmentId = body.appointmentId;
    const dealId = body.dealId;
    const leadId = body.leadId;
    const invoiceId = body.invoiceId;

    if (!amount || !customerName || !customerEmail) {
      return apiErrors.badRequest("Missing or invalid required fields");
    }

    let paymentIntent: any;
    let providerPaymentId: string;

    // Get provider settings
    const providerSettings = await prisma.paymentProviderSettings.findUnique({
      where: {
        userId_provider: {
          userId: user.id,
          provider,
        },
      },
    });

    if (!providerSettings || !providerSettings.isActive) {
      return NextResponse.json(
        { error: `${provider} is not configured or inactive` },
        { status: 400 },
      );
    }

    // Create payment based on provider
    if (provider === "STRIPE") {
      paymentIntent = await createPaymentIntent(user.id, {
        amount,
        currency,
        customerEmail,
        customerName,
        description,
        metadata: {
          paymentType,
          appointmentId: appointmentId || "",
          dealId: dealId || "",
          leadId: leadId || "",
        },
      });
      providerPaymentId = paymentIntent.id;
    } else if (provider === "PAYPAL") {
      paymentIntent = await createPayPalOrder(user.id, {
        amount,
        currency,
        description,
        referenceId: appointmentId || dealId || leadId,
      });
      providerPaymentId = paymentIntent.id;
    } else {
      return apiErrors.badRequest("Unsupported payment provider");
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
        status: "PENDING",
        paymentType,
        customerName,
        customerEmail,
        customerPhone,
        description,
        dealId,
        leadId,
        invoiceId,
      },
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
      true,
    );

    return NextResponse.json({
      success: true,
      payment,
      clientSecret: paymentIntent.client_secret || null,
      orderId: provider === "PAYPAL" ? paymentIntent.id : null,
    });
  } catch (error: any) {
    console.error("Error creating payment intent:", error);

    // Log failed payment attempt
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      if (user) {
        await AuditLogger.logPayment(
          user.id,
          "unknown",
          request,
          { error: error.message },
          false,
          error.message,
        );
      }
    }

    return apiErrors.internal(
      error.message || "Failed to create payment intent",
    );
  }
}
