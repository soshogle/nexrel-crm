
/**
 * Twilio Phone Number Management Service
 * Handles searching and purchasing phone numbers
 */

import { prisma } from './db';

interface TwilioCredentials {
  accountSid: string;
  authToken: string;
}

interface AvailablePhoneNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
  postalCode: string;
  isoCountry: string;
  capabilities: {
    voice: boolean;
    SMS: boolean;
    MMS: boolean;
  };
}

/**
 * Get Twilio credentials
 * Uses centralized credentials from environment variables (SaaS model)
 * where the CRM owner has one Twilio account and bills users separately
 */
async function getTwilioCredentials(userId: string): Promise<TwilioCredentials | null> {
  // Use centralized Twilio credentials from environment
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.error('Twilio credentials not found in environment variables');
    return null;
  }

  return {
    accountSid,
    authToken
  };
}

/**
 * Search for available phone numbers
 */
export async function searchAvailableNumbers(
  userId: string,
  options: {
    countryCode?: string;
    areaCode?: string;
    contains?: string;
    smsEnabled?: boolean;
    voiceEnabled?: boolean;
    limit?: number;
  } = {}
): Promise<{ success: boolean; numbers?: AvailablePhoneNumber[]; error?: string }> {
  try {
    const credentials = await getTwilioCredentials(userId);
    
    if (!credentials) {
      return {
        success: false,
        error: 'Twilio credentials not found. Please configure Twilio first.'
      };
    }

    const {
      countryCode = 'US',
      areaCode,
      contains,
      smsEnabled = true,
      voiceEnabled = true,
      limit = 20
    } = options;

    // Build Twilio API URL
    const baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/AvailablePhoneNumbers/${countryCode}/Local.json`;
    
    const params = new URLSearchParams();
    if (areaCode) params.append('AreaCode', areaCode);
    if (contains) params.append('Contains', contains);
    if (smsEnabled) params.append('SmsEnabled', 'true');
    if (voiceEnabled) params.append('VoiceEnabled', 'true');
    params.append('PageSize', limit.toString());

    const url = `${baseUrl}?${params.toString()}`;

    // Call Twilio API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString('base64')
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Twilio API error:', errorData);
      return {
        success: false,
        error: errorData.message || 'Failed to search phone numbers'
      };
    }

    const data = await response.json();
    
    const numbers: AvailablePhoneNumber[] = data.available_phone_numbers?.map((num: any) => ({
      phoneNumber: num.phone_number,
      friendlyName: num.friendly_name,
      locality: num.locality || '',
      region: num.region || '',
      postalCode: num.postal_code || '',
      isoCountry: num.iso_country,
      capabilities: {
        voice: num.capabilities?.voice || false,
        SMS: num.capabilities?.SMS || false,
        MMS: num.capabilities?.MMS || false
      }
    })) || [];

    return {
      success: true,
      numbers
    };

  } catch (error) {
    console.error('Error searching phone numbers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search phone numbers'
    };
  }
}

/**
 * Purchase a phone number
 */
export async function purchasePhoneNumber(
  userId: string,
  phoneNumber: string,
  options: {
    voiceUrl?: string;
    smsUrl?: string;
    friendlyName?: string;
  } = {}
): Promise<{ success: boolean; phoneNumber?: string; error?: string }> {
  try {
    const credentials = await getTwilioCredentials(userId);
    
    if (!credentials) {
      return {
        success: false,
        error: 'Twilio credentials not found. Please configure Twilio first.'
      };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/IncomingPhoneNumbers.json`;

    // Prepare form data
    const formData = new URLSearchParams();
    formData.append('PhoneNumber', phoneNumber);
    
    if (options.friendlyName) {
      formData.append('FriendlyName', options.friendlyName);
    }
    
    // Set voice webhook URL (for incoming calls)
    if (options.voiceUrl) {
      formData.append('VoiceUrl', options.voiceUrl);
      formData.append('VoiceMethod', 'POST');
    }
    
    // Set SMS webhook URL (for incoming messages)
    if (options.smsUrl) {
      formData.append('SmsUrl', options.smsUrl);
      formData.append('SmsMethod', 'POST');
    }

    // Call Twilio API to purchase
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Twilio purchase error:', errorData);
      return {
        success: false,
        error: errorData.message || 'Failed to purchase phone number'
      };
    }

    const data = await response.json();

    // Store purchased phone number in database for user-level tracking
    await prisma.purchasedPhoneNumber.create({
      data: {
        userId: userId,
        phoneNumber: phoneNumber,
        friendlyName: options.friendlyName || phoneNumber,
        country: data.iso_country || 'US',
        capabilities: {
          voice: data.capabilities?.voice || false,
          sms: data.capabilities?.sms || false,
          mms: data.capabilities?.mms || false
        },
        twilioSid: data.sid,
        status: 'active'
      }
    });

    // Update user's Twilio phone number in smsProviderConfig
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { smsProviderConfig: true }
    });

    if (user?.smsProviderConfig) {
      try {
        const config = JSON.parse(user.smsProviderConfig);
        config.phoneNumber = phoneNumber;
        
        await prisma.user.update({
          where: { id: userId },
          data: {
            smsProviderConfig: JSON.stringify(config),
            smsProviderConfigured: true
          }
        });
      } catch (error) {
        console.error('Error updating Twilio config with phone number:', error);
      }
    }

    console.log('Phone number purchased successfully:', phoneNumber);

    return {
      success: true,
      phoneNumber: data.phone_number
    };

  } catch (error) {
    console.error('Error purchasing phone number:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to purchase phone number'
    };
  }
}

/**
 * Get list of owned phone numbers for a specific user
 * Uses PurchasedPhoneNumber table for proper multi-tenancy
 */
export async function getOwnedPhoneNumbers(
  userId: string
): Promise<{ success: boolean; numbers?: any[]; error?: string }> {
  try {
    console.log('📞 Getting owned phone numbers for user:', userId);
    
    // Fetch numbers from PurchasedPhoneNumber table for THIS USER ONLY
    // This ensures proper isolation - users only see their own numbers
    const purchasedNumbers = await prisma.purchasedPhoneNumber.findMany({
      where: {
        userId: userId,
        status: 'active'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`✅ Found ${purchasedNumbers.length} phone numbers owned by user`);
    
    if (purchasedNumbers.length > 0) {
      console.log('📋 User phone numbers:', purchasedNumbers.map((n) => n.phoneNumber).join(', '));
    }

    // Format response to match frontend expectations
    const formattedNumbers = purchasedNumbers.map((number) => ({
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName || number.phoneNumber,
      sid: number.twilioSid,
      capabilities: number.capabilities as any,
      country: number.country || 'US',
      dateCreated: number.createdAt
    }));

    return {
      success: true,
      numbers: formattedNumbers
    };

  } catch (error) {
    console.error('❌ Error fetching owned numbers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch phone numbers'
    };
  }
}
