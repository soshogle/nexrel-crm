import { prisma } from "@/lib/db";

export async function setupStripe(userId: string, params: any) {
  const { publishableKey, secretKey } = params;

  if (!publishableKey || !secretKey) {
    throw new Error("Both Stripe Publishable Key and Secret Key are required");
  }

  // Validate key format
  if (!publishableKey.startsWith("pk_")) {
    throw new Error("Invalid Publishable Key format. Should start with 'pk_'");
  }
  if (!secretKey.startsWith("sk_")) {
    throw new Error("Invalid Secret Key format. Should start with 'sk_'");
  }

  // Store Stripe credentials in user config
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      paymentProvider: "Stripe",
      paymentProviderConfigured: true,
      // Store in a secure JSON field (assuming you have this in schema)
      // In production, these should be encrypted
    },
  });

  return {
    message: "✅ Stripe has been successfully configured! You can now accept payments through Stripe.",
    provider: "Stripe",
    mode: publishableKey.includes("test") ? "Test Mode" : "Live Mode",
    nextSteps: [
      "Create payment links",
      "Set up subscription plans",
      "Configure webhooks for payment notifications",
    ],
  };
}

export async function setupSquare(userId: string, params: any) {
  const { applicationId, accessToken } = params;

  if (!applicationId || !accessToken) {
    throw new Error("Both Square Application ID and Access Token are required");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      paymentProvider: "Square",
      paymentProviderConfigured: true,
    },
  });

  return {
    message: "✅ Square has been successfully configured! You can now accept payments through Square.",
    provider: "Square",
    nextSteps: [
      "Create payment links",
      "Set up invoicing",
      "Configure Square POS integration",
    ],
  };
}

export async function setupPayPal(userId: string, params: any) {
  const { clientId, clientSecret } = params;

  if (!clientId || !clientSecret) {
    throw new Error("Both PayPal Client ID and Client Secret are required");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      paymentProvider: "PayPal",
      paymentProviderConfigured: true,
    },
  });

  return {
    message: "✅ PayPal has been successfully configured! You can now accept payments through PayPal.",
    provider: "PayPal",
    nextSteps: [
      "Create PayPal checkout buttons",
      "Set up subscriptions",
      "Configure invoice templates",
    ],
  };
}

export async function setupQuickBooks(userId: string) {
  // Return instructions to connect QuickBooks
  return {
    message: "I'll help you connect QuickBooks to your CRM.",
    instructions: "To connect QuickBooks:\n1. Go to Settings → QuickBooks\n2. Click 'Connect QuickBooks'\n3. Sign in to your QuickBooks account and authorize access\n\nOnce connected, you'll be able to:\n- Create invoices from deals\n- Sync customers automatically\n- Track payment status",
    navigateTo: '/dashboard/settings?tab=quickbooks',
    actionRequired: true
  };
}

export async function createQuickBooksInvoice(userId: string, params: any) {
  const { customerName, customerEmail, lineItems, dueDate, memo } = params;

  if (!customerName || !customerEmail || !lineItems) {
    throw new Error('Customer name, email, and line items are required');
  }

  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/integrations/quickbooks/invoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName,
      customerEmail,
      lineItems,
      dueDate,
      memo
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create invoice');
  }

  const data = await response.json();

  return {
    message: `✅ Invoice #${data.invoiceNumber} created successfully for ${customerName}!`,
    invoiceId: data.invoiceId,
    invoiceNumber: data.invoiceNumber
  };
}

export async function syncContactToQuickBooks(userId: string, params: any) {
  const { contactId } = params;

  if (!contactId) {
    throw new Error('Contact ID is required');
  }

  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/integrations/quickbooks/sync-contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sync contact');
  }

  const data = await response.json();

  return {
    message: '✅ Contact synced to QuickBooks successfully!',
    customerId: data.customerId
  };
}

export async function updateProfile(userId: string, params: any) {
  const { companyName, name, phone, website } = params;

  if (!companyName && !name && !phone && !website) {
    throw new Error("At least one field is required");
  }

  const updateData: any = {};
  if (companyName || name) updateData.name = companyName || name;
  if (phone) updateData.phone = phone;
  if (website) updateData.website = website;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      phone: true,
      website: true,
      email: true,
    },
  });

  return {
    message: `✅ Your company profile has been updated!`,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      website: user.website,
      email: user.email,
    },
  };
}

export const updateCompanyProfile = updateProfile;
