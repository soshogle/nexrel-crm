
import { prisma } from '@/lib/db';

export async function getPayPalConfig(userId: string) {
  const settings = await prisma.paymentProviderSettings.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: 'PAYPAL'
      }
    }
  });

  if (!settings || !settings.clientId || !settings.secretKey || !settings.isActive) {
    return null;
  }

  return {
    clientId: settings.clientId,
    secretKey: settings.secretKey,
    testMode: settings.testMode
  };
}

export async function getPayPalAccessToken(userId: string) {
  const config = await getPayPalConfig(userId);
  if (!config) {
    throw new Error('PayPal not configured');
  }

  const baseUrl = config.testMode 
    ? 'https://api-m.sandbox.paypal.com' 
    : 'https://api-m.paypal.com';

  const auth = Buffer.from(`${config.clientId}:${config.secretKey}`).toString('base64');

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  return data.access_token;
}

export interface CreatePayPalOrderParams {
  amount: number;
  currency: string;
  description?: string;
  referenceId?: string;
}

export async function createOrder(
  userId: string,
  params: CreatePayPalOrderParams
) {
  const config = await getPayPalConfig(userId);
  if (!config) {
    throw new Error('PayPal not configured');
  }

  const accessToken = await getPayPalAccessToken(userId);
  const baseUrl = config.testMode 
    ? 'https://api-m.sandbox.paypal.com' 
    : 'https://api-m.paypal.com';

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: params.referenceId,
        description: params.description,
        amount: {
          currency_code: params.currency,
          value: params.amount.toFixed(2)
        }
      }]
    })
  });

  return await response.json();
}

export async function captureOrder(
  userId: string,
  orderId: string
) {
  const config = await getPayPalConfig(userId);
  if (!config) {
    throw new Error('PayPal not configured');
  }

  const accessToken = await getPayPalAccessToken(userId);
  const baseUrl = config.testMode 
    ? 'https://api-m.sandbox.paypal.com' 
    : 'https://api-m.paypal.com';

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  return await response.json();
}

export async function retrieveOrder(
  userId: string,
  orderId: string
) {
  const config = await getPayPalConfig(userId);
  if (!config) {
    throw new Error('PayPal not configured');
  }

  const accessToken = await getPayPalAccessToken(userId);
  const baseUrl = config.testMode 
    ? 'https://api-m.sandbox.paypal.com' 
    : 'https://api-m.paypal.com';

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  return await response.json();
}

export async function refundCapture(
  userId: string,
  captureId: string,
  amount?: number,
  currency: string = 'USD'
) {
  const config = await getPayPalConfig(userId);
  if (!config) {
    throw new Error('PayPal not configured');
  }

  const accessToken = await getPayPalAccessToken(userId);
  const baseUrl = config.testMode 
    ? 'https://api-m.sandbox.paypal.com' 
    : 'https://api-m.paypal.com';

  const body: any = {};
  if (amount) {
    body.amount = {
      value: amount.toFixed(2),
      currency_code: currency
    };
  }

  const response = await fetch(`${baseUrl}/v2/payments/captures/${captureId}/refund`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  return await response.json();
}
