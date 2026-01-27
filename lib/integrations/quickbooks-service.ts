
/**
 * QuickBooks Online Integration Service
 * Handles invoicing, customer sync, and payment tracking
 */

import { prisma } from '@/lib/db';

interface QuickBooksCredentials {
  realmId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

interface QuickBooksCustomer {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
}

interface QuickBooksInvoice {
  id: string;
  docNumber: string;
  totalAmt: number;
  balance: number;
  dueDate: string;
  status: 'PAID' | 'UNPAID' | 'PARTIALLY_PAID';
}

/**
 * Get QuickBooks credentials for a user
 */
async function getQuickBooksCredentials(userId: string): Promise<QuickBooksCredentials | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { quickbooksConfig: true }
  });

  if (!user?.quickbooksConfig) {
    return null;
  }

  try {
    const config = JSON.parse(user.quickbooksConfig);
    
    // Check if token is expired
    const expiresAt = new Date(config.expiresAt);
    if (expiresAt < new Date()) {
      // Token expired, need to refresh
      const refreshed = await refreshAccessToken(userId, config.refreshToken, config.realmId);
      return refreshed;
    }

    return {
      realmId: config.realmId,
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
      expiresAt: expiresAt
    };
  } catch (error) {
    console.error('Error parsing QuickBooks config:', error);
    return null;
  }
}

/**
 * Refresh QuickBooks access token
 */
async function refreshAccessToken(
  userId: string,
  refreshToken: string,
  realmId: string
): Promise<QuickBooksCredentials | null> {
  try {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID;
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('QuickBooks credentials not configured');
      return null;
    }

    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);
    
    // Save new tokens
    await prisma.user.update({
      where: { id: userId },
      data: {
        quickbooksConfig: JSON.stringify({
          realmId,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: expiresAt.toISOString()
        })
      }
    });

    return {
      realmId,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt
    };
  } catch (error) {
    console.error('Error refreshing QuickBooks token:', error);
    return null;
  }
}

/**
 * Create a customer in QuickBooks
 */
export async function createQuickBooksCustomer(
  userId: string,
  contactData: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  }
): Promise<{ success: boolean; customerId?: string; error?: string }> {
  try {
    const credentials = await getQuickBooksCredentials(userId);
    
    if (!credentials) {
      return {
        success: false,
        error: 'QuickBooks not connected. Please connect in Settings.'
      };
    }

    const baseUrl = process.env.QUICKBOOKS_ENVIRONMENT === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com';

    const response = await fetch(
      `${baseUrl}/v3/company/${credentials.realmId}/customer`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          DisplayName: contactData.name,
          PrimaryEmailAddr: { Address: contactData.email },
          PrimaryPhone: contactData.phone ? { FreeFormNumber: contactData.phone } : undefined,
          BillAddr: contactData.address ? { Line1: contactData.address } : undefined
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('QuickBooks API error:', error);
      return {
        success: false,
        error: error.Fault?.Error?.[0]?.Message || 'Failed to create customer'
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      customerId: data.Customer.Id
    };

  } catch (error) {
    console.error('Error creating QuickBooks customer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create customer'
    };
  }
}

/**
 * Create an invoice in QuickBooks
 */
export async function createQuickBooksInvoice(
  userId: string,
  invoiceData: {
    customerId: string;
    customerName: string;
    customerEmail: string;
    lineItems: Array<{
      description: string;
      amount: number;
      quantity?: number;
    }>;
    dueDate?: string;
    memo?: string;
  }
): Promise<{ success: boolean; invoiceId?: string; invoiceNumber?: string; error?: string }> {
  try {
    const credentials = await getQuickBooksCredentials(userId);
    
    if (!credentials) {
      return {
        success: false,
        error: 'QuickBooks not connected. Please connect in Settings.'
      };
    }

    // First, ensure customer exists or create them
    let customerId = invoiceData.customerId;
    if (!customerId) {
      const customerResult = await createQuickBooksCustomer(userId, {
        name: invoiceData.customerName,
        email: invoiceData.customerEmail
      });
      
      if (!customerResult.success || !customerResult.customerId) {
        return {
          success: false,
          error: 'Failed to create customer: ' + (customerResult.error || 'Unknown error')
        };
      }
      
      customerId = customerResult.customerId;
    }

    const baseUrl = process.env.QUICKBOOKS_ENVIRONMENT === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com';

    // Build line items
    const lines = invoiceData.lineItems.map((item, index) => ({
      DetailType: 'SalesItemLineDetail',
      Amount: item.amount * (item.quantity || 1),
      SalesItemLineDetail: {
        Qty: item.quantity || 1,
        UnitPrice: item.amount,
        ItemRef: {
          value: '1', // Default service item - should be configurable
          name: 'Services'
        }
      },
      Description: item.description,
      LineNum: index + 1
    }));

    const response = await fetch(
      `${baseUrl}/v3/company/${credentials.realmId}/invoice`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          CustomerRef: {
            value: customerId
          },
          Line: lines,
          DueDate: invoiceData.dueDate || undefined,
          CustomerMemo: invoiceData.memo ? { value: invoiceData.memo } : undefined
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('QuickBooks invoice error:', error);
      return {
        success: false,
        error: error.Fault?.Error?.[0]?.Message || 'Failed to create invoice'
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      invoiceId: data.Invoice.Id,
      invoiceNumber: data.Invoice.DocNumber
    };

  } catch (error) {
    console.error('Error creating QuickBooks invoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create invoice'
    };
  }
}

/**
 * Get invoice status
 */
export async function getQuickBooksInvoice(
  userId: string,
  invoiceId: string
): Promise<{ success: boolean; invoice?: QuickBooksInvoice; error?: string }> {
  try {
    const credentials = await getQuickBooksCredentials(userId);
    
    if (!credentials) {
      return {
        success: false,
        error: 'QuickBooks not connected'
      };
    }

    const baseUrl = process.env.QUICKBOOKS_ENVIRONMENT === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com';

    const response = await fetch(
      `${baseUrl}/v3/company/${credentials.realmId}/invoice/${invoiceId}`,
      {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to fetch invoice'
      };
    }

    const data = await response.json();
    const invoice = data.Invoice;
    
    return {
      success: true,
      invoice: {
        id: invoice.Id,
        docNumber: invoice.DocNumber,
        totalAmt: invoice.TotalAmt,
        balance: invoice.Balance,
        dueDate: invoice.DueDate,
        status: invoice.Balance === 0 ? 'PAID' : invoice.Balance < invoice.TotalAmt ? 'PARTIALLY_PAID' : 'UNPAID'
      }
    };

  } catch (error) {
    console.error('Error fetching QuickBooks invoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invoice'
    };
  }
}

/**
 * Sync lead/contact to QuickBooks
 */
export async function syncContactToQuickBooks(
  userId: string,
  contactId: string
): Promise<{ success: boolean; customerId?: string; error?: string }> {
  try {
    // Get lead from database
    const lead = await prisma.lead.findUnique({
      where: { id: contactId }
    });

    if (!lead) {
      return {
        success: false,
        error: 'Lead/Contact not found'
      };
    }

    // Create customer in QuickBooks
    const result = await createQuickBooksCustomer(userId, {
      name: lead.contactPerson || lead.businessName,
      email: lead.email || '',
      phone: lead.phone || undefined,
      address: lead.address || undefined
    });

    if (result.success && result.customerId) {
      // Create a note with QuickBooks customer ID
      await prisma.note.create({
        data: {
          userId,
          leadId: contactId,
          content: `QuickBooks Customer ID: ${result.customerId}`
        }
      });
    }

    return result;

  } catch (error) {
    console.error('Error syncing lead to QuickBooks:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync lead'
    };
  }
}

/**
 * Check if QuickBooks is connected
 */
export async function isQuickBooksConnected(userId: string): Promise<boolean> {
  const credentials = await getQuickBooksCredentials(userId);
  return credentials !== null;
}
